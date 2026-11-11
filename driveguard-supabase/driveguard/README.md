# 🚗 DriveGuard – Smart Driver Drowsiness Detection (Supabase Edition)

Full-stack IoT safety system: ESP32 hardware + Node.js backend + React dashboard + Supabase database.

---

## 📁 Project Structure

```
driveguard/
├── backend/
│   ├── config/
│   │   ├── supabase.js        ← Supabase client
│   │   └── schema.sql         ← Run this in Supabase SQL editor FIRST
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── drivers.js
│   │   ├── sensors.js         ← ESP32 HTTP POST endpoint
│   │   ├── alerts.js
│   │   ├── dashboard.js
│   │   └── admin.js
│   ├── server.js
│   ├── seed.js                ← Creates demo data
│   ├── .env                   ← Add your Supabase keys here
│   └── package.json
├── frontend/
│   ├── public/index.html
│   ├── src/
│   │   ├── components/Dashboard/{Sidebar,Topbar}.js
│   │   ├── components/Drivers/DriverModal.js
│   │   ├── context/{AuthContext,SocketContext}.js
│   │   ├── pages/
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── DriversPage.js
│   │   │   ├── AlertsPage.js
│   │   │   ├── LiveMonitorPage.js
│   │   │   ├── MapPage.js
│   │   │   ├── AdminPage.js
│   │   │   └── SettingsPage.js
│   │   ├── utils/api.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── .env
│   └── package.json
└── esp32/
    └── drowsiness_firmware.ino
```

---

## 🚀 Setup – Step by Step

### Step 1: Create Supabase Project

1. Go to **https://supabase.com** → New Project
2. Note your **Project URL** and **Service Role Key** (Settings → API)
3. Go to **SQL Editor** → paste the entire contents of `backend/config/schema.sql` → **Run**
4. This creates all tables + inserts the default superadmin

### Step 2: Backend Setup

```bash
cd driveguard/backend
npm install
```

Edit `.env`:
```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY
JWT_SECRET=any_random_string_here
PORT=5000
FRONTEND_URL=http://localhost:3000
```

```bash
# Seed demo drivers + sensor data + alerts
node seed.js

# Start the backend
npm run dev
```
✅ Backend running at http://localhost:5000

### Step 3: Frontend Setup

```bash
cd driveguard/frontend
npm install
npm start
```
✅ Dashboard at http://localhost:3000

### Step 4: Login

```
URL:      http://localhost:3000
Email:    admin@fleet.com
Password: Admin@123
```

---

## 📡 ESP32 Setup

1. Install **Arduino IDE** → add ESP32 boards
2. Install libraries: `ArduinoJson`, `TinyGPS++`, `Adafruit MPU6050`
3. Open `esp32/drowsiness_firmware.ino`
4. Edit these 4 lines:
   ```cpp
   const char* WIFI_SSID  = "YOUR_WIFI";
   const char* WIFI_PASS  = "YOUR_PASSWORD";
   const char* SERVER_URL = "http://YOUR_PC_IP:5000/api/sensors/data";
   const char* DRIVER_ID  = "PASTE_UUID_FROM_SUPABASE_DRIVERS_TABLE";
   ```
5. Select board: **AI Thinker ESP32-CAM**
6. Upload (disconnect GPS during upload, reconnect after)

> Find your PC IP: run `ipconfig` → IPv4 Address

---

## 🔌 Hardware Wiring

| Component    | ESP32 Pin |
|--------------|-----------|
| MPU6050 SDA  | GPIO 14   |
| MPU6050 SCL  | GPIO 15   |
| MPU6050 VCC  | 3.3V      |
| GPS TX       | GPIO 16   |
| GPS RX       | GPIO 17   |
| GPS VCC      | 5V        |
| Buzzer +     | GPIO 12   |
| LED +        | GPIO 13   |
| Motor (Base) | GPIO 2    |

---

## 🧪 Test Without ESP32

```bash
# Get a driver ID first from Supabase table or API
curl http://localhost:5000/api/drivers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send test sensor data
curl -X POST http://localhost:5000/api/sensors/data \
  -H "Content-Type: application/json" \
  -d '{
    "driverId": "PASTE_DRIVER_UUID",
    "deviceId": "ESP32_001",
    "eyeClosurePercent": 75,
    "isDrowsy": true,
    "drowsinessLevel": "high",
    "drowsinessScore": 78,
    "accelerationX": 0.1,
    "accelerationY": 0.2,
    "accelerationZ": 9.8,
    "latitude": 17.385044,
    "longitude": 78.486671,
    "speed": 65,
    "batteryLevel": 85
  }'
```

---

## 🔑 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | ❌ | Login |
| POST | `/api/auth/register` | ❌ | Register admin |
| GET  | `/api/drivers` | ✅ | List drivers |
| POST | `/api/drivers` | ✅ | Add driver |
| POST | `/api/sensors/data` | ❌ | ESP32 data ingestion |
| GET  | `/api/sensors/live` | ✅ | Latest per driver |
| GET  | `/api/alerts` | ✅ | List alerts |
| GET  | `/api/dashboard/summary` | ✅ | Dashboard stats |

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Supabase connection error | Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env |
| Schema error on seed | Re-run schema.sql in Supabase SQL editor |
| CORS error | Check FRONTEND_URL in backend .env |
| ESP32 not posting | Ensure same WiFi network; check SERVER_URL has correct IP |
| GPS not working | Disconnect GPS pins during upload; reconnect after |

---

Built with ❤️ — Node.js · Supabase · React · Socket.IO · ESP32
