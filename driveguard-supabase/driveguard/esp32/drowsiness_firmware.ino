/**
 * ============================================================
 *  DriveGuard – ESP32 Firmware (Supabase Backend Edition)
 *  Smart Driver Drowsiness Detection System
 * ============================================================
 *  Wiring:
 *    MPU6050  → SDA:GPIO14  SCL:GPIO15  VCC:3.3V  GND:GND
 *    GPS      → TX:GPIO16   RX:GPIO17   VCC:5V    GND:GND
 *    Buzzer   → GPIO12 (+ → GPIO12, – → GND)
 *    LED      → GPIO13 (via 220Ω resistor)
 *    Vib Motor→ GPIO2  (via BC547 transistor + 1N4007 diode)
 *    Capacitor→ 100µF across 5V rail
 * ============================================================
 *  Libraries (install via Arduino Library Manager):
 *    - ArduinoJson  by Benoit Blanchon
 *    - TinyGPS++    by Mikal Hart       (optional, for real GPS)
 *    - Adafruit MPU6050                 (optional, for easier MPU API)
 * ============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <ArduinoJson.h>
#include <math.h>

// ── CONFIG – change these ─────────────────────────────────────
const char* WIFI_SSID   = "YOUR_WIFI_SSID";
const char* WIFI_PASS   = "YOUR_WIFI_PASSWORD";
const char* SERVER_URL  = "http://YOUR_PC_IP:5000/api/sensors/data";
const char* DRIVER_ID   = "PASTE_DRIVER_UUID_FROM_SUPABASE_HERE";
const char* DEVICE_ID   = "ESP32_001";

// ── GPIO PINS ─────────────────────────────────────────────────
#define PIN_BUZZER    12
#define PIN_LED       13
#define PIN_MOTOR      2
#define MPU_SDA       14
#define MPU_SCL       15

// ── THRESHOLDS ────────────────────────────────────────────────
#define EYE_DROWSY_THRESHOLD  60.0f   // % eye closure → drowsy
#define BLINK_RATE_MIN         5      // blinks/min below this → alert
#define ACCIDENT_DELTA         2.5f   // m/s² accel change → accident
#define SEND_INTERVAL_MS    3000      // POST interval

// ── MPU6050 I2C REGISTERS ─────────────────────────────────────
#define MPU_ADDR      0x68
#define REG_PWR       0x6B
#define REG_ACCEL_X   0x3B

// ── GPS serial ────────────────────────────────────────────────
HardwareSerial GPSSerial(2); // UART2: RX=GPIO16, TX=GPIO17

// ── State ─────────────────────────────────────────────────────
struct SensorData {
  float eyeClosurePercent = 0;
  int   blinkRate         = 0;
  float accelX = 0, accelY = 0, accelZ = 9.8f;
  float tiltAngle  = 0;
  float latitude   = 17.385044f;
  float longitude  = 78.486671f;
  float speed      = 0;
  float drowsinessScore = 0;
  String drowsinessLevel = "normal";
  bool  isDrowsy   = false;
  bool  isAccident = false;
  int   batteryLevel = 100;
} data;

float      prevAccelMag  = 9.8f;
unsigned long lastSendMs = 0;
unsigned long lastBlinkMs = 0;
int        blinkCount    = 0;
bool       prevEyeClosed = false;

// ── MPU6050 ───────────────────────────────────────────────────
void initMPU() {
  Wire.begin(MPU_SDA, MPU_SCL);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_PWR); Wire.write(0);  // wake up
  Wire.endTransmission(true);
  Serial.println("MPU6050 OK");
}

void readMPU() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(REG_ACCEL_X);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  int16_t ax = Wire.read()<<8 | Wire.read();
  int16_t ay = Wire.read()<<8 | Wire.read();
  int16_t az = Wire.read()<<8 | Wire.read();

  data.accelX = ax / 16384.0f;
  data.accelY = ay / 16384.0f;
  data.accelZ = az / 16384.0f;
  data.tiltAngle = atan2(data.accelX, sqrt(data.accelY*data.accelY + data.accelZ*data.accelZ)) * 180.0f / PI;

  float mag   = sqrt(data.accelX*data.accelX + data.accelY*data.accelY + data.accelZ*data.accelZ);
  float delta = fabs(mag - prevAccelMag);
  data.isAccident = delta > ACCIDENT_DELTA;
  prevAccelMag = mag;
}

// ── GPS (basic NMEA, replace with TinyGPS++ for production) ──
void readGPS() {
  // With TinyGPS++:
  // while (GPSSerial.available()) { if (gps.encode(GPSSerial.read())) { data.latitude = gps.location.lat(); data.longitude = gps.location.lng(); data.speed = gps.speed.kmph(); } }
  // For testing, data.latitude / longitude are preset above.
}

// ── Eye simulation (replace with real OpenCV / camera AI) ─────
void simulateEyeData() {
  static unsigned long lastEyeMs = 0;
  if (millis() - lastEyeMs < 1000) return;
  lastEyeMs = millis();

  // Gradual drift to simulate drowsiness over time
  float drift = (millis() / 120000.0f) * 10.0f; // increases every 2 min
  data.eyeClosurePercent = constrain(random(20, 40) + drift, 0, 100);

  bool closed = data.eyeClosurePercent > 50;
  if (closed && !prevEyeClosed) { blinkCount++; lastBlinkMs = millis(); }
  prevEyeClosed = closed;

  if (millis() - lastBlinkMs < 60000) data.blinkRate = blinkCount;
  else { blinkCount = 0; data.blinkRate = 0; }
}

// ── Drowsiness score ─────────────────────────────────────────
void analyseDrowsiness() {
  if (data.isAccident) return;  // accident takes priority
  float score = 0;
  if (data.eyeClosurePercent > EYE_DROWSY_THRESHOLD)
    score += ((data.eyeClosurePercent - 60.0f) / 40.0f) * 70.0f;
  if (data.blinkRate < BLINK_RATE_MIN) score += 30.0f;
  score = constrain(score, 0, 100);
  data.drowsinessScore = score;

  if      (score >= 80) { data.isDrowsy = true;  data.drowsinessLevel = "critical"; }
  else if (score >= 60) { data.isDrowsy = true;  data.drowsinessLevel = "high"; }
  else if (score >= 40) { data.isDrowsy = true;  data.drowsinessLevel = "medium"; }
  else if (score >= 20) { data.isDrowsy = false; data.drowsinessLevel = "low"; }
  else                  { data.isDrowsy = false; data.drowsinessLevel = "normal"; }
}

// ── Local alerts (buzzer / LED / motor) ─────────────────────
void triggerAlerts() {
  if (data.isAccident) {
    for (int i = 0; i < 5; i++) {
      digitalWrite(PIN_BUZZER, HIGH); digitalWrite(PIN_LED, HIGH); delay(100);
      digitalWrite(PIN_BUZZER, LOW);  digitalWrite(PIN_LED, LOW);  delay(100);
    }
    digitalWrite(PIN_MOTOR, HIGH); delay(800); digitalWrite(PIN_MOTOR, LOW);
  } else if (data.isDrowsy) {
    digitalWrite(PIN_BUZZER, HIGH); digitalWrite(PIN_MOTOR, HIGH); digitalWrite(PIN_LED, HIGH);
    delay(400);
    digitalWrite(PIN_BUZZER, LOW);  delay(150);
    digitalWrite(PIN_BUZZER, HIGH); delay(150);
    digitalWrite(PIN_BUZZER, LOW);  digitalWrite(PIN_MOTOR, LOW);  digitalWrite(PIN_LED, LOW);
  } else {
    digitalWrite(PIN_BUZZER, LOW); digitalWrite(PIN_LED, LOW); digitalWrite(PIN_MOTOR, LOW);
  }
}

// ── POST to DriveGuard backend ────────────────────────────────
void postToServer() {
  if (WiFi.status() != WL_CONNECTED) { WiFi.reconnect(); return; }

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);

  StaticJsonDocument<512> doc;
  doc["driverId"]          = DRIVER_ID;
  doc["deviceId"]          = DEVICE_ID;
  doc["eyeClosurePercent"] = data.eyeClosurePercent;
  doc["blinkRate"]         = data.blinkRate;
  doc["accelerationX"]     = data.accelX;
  doc["accelerationY"]     = data.accelY;
  doc["accelerationZ"]     = data.accelZ;
  doc["tiltAngle"]         = data.tiltAngle;
  doc["latitude"]          = data.latitude;
  doc["longitude"]         = data.longitude;
  doc["speed"]             = data.speed;
  doc["drowsinessScore"]   = data.drowsinessScore;
  doc["drowsinessLevel"]   = data.drowsinessLevel;
  doc["isDrowsy"]          = data.isDrowsy;
  doc["isAccident"]        = data.isAccident;
  doc["batteryLevel"]      = data.batteryLevel;
  doc["faceDetected"]      = true;

  String body;
  serializeJson(doc, body);
  int code = http.POST(body);
  Serial.printf("[HTTP] %d | Eye:%.0f%% Drowsy:%s Accident:%s\n",
    code, data.eyeClosurePercent,
    data.isDrowsy ? "YES" : "NO",
    data.isAccident ? "YES" : "NO");
  http.end();
}

// ── Setup ─────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED,    OUTPUT);
  pinMode(PIN_MOTOR,  OUTPUT);

  // Startup blink
  for (int i=0; i<3; i++) { digitalWrite(PIN_LED,HIGH); delay(120); digitalWrite(PIN_LED,LOW); delay(120); }

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting to WiFi");
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries++ < 30) { delay(500); Serial.print('.'); }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi: " + WiFi.localIP().toString());
    digitalWrite(PIN_LED, HIGH); delay(400); digitalWrite(PIN_LED, LOW);
  } else {
    Serial.println("\n❌ WiFi failed – running offline");
  }

  initMPU();
  GPSSerial.begin(9600, SERIAL_8N1, 16, 17);  // GPS RX=16, TX=17
  Serial.println("🚗 DriveGuard ESP32 Ready");
}

// ── Loop ─────────────────────────────────────────────────────
void loop() {
  readMPU();
  readGPS();
  simulateEyeData();   // ← Replace with real camera AI output
  analyseDrowsiness();
  triggerAlerts();

  if (millis() - lastSendMs >= SEND_INTERVAL_MS) {
    postToServer();
    lastSendMs = millis();
  }
  delay(100);
}
