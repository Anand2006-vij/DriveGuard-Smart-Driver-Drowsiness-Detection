/**
 * SUPABASE SEED SCRIPT
 * Run: cd backend && node seed.js
 * Creates 8 demo drivers + sensor readings + alerts
 * (superadmin is inserted via schema.sql — admin@fleet.com / Admin@123)
 */
require('dotenv').config();
const supabase = require('./config/supabase');
const bcrypt   = require('bcryptjs');

const DRIVERS_DATA = [
  { first_name:'Ravi',    last_name:'Kumar',   email:'ravi.kumar@fleet.com',    phone:'9876543210', license_number:'TN0120190012345', vehicle_number:'TN09AB1234', vehicle_type:'truck', department:'Logistics', employee_id:'EMP001', shift_timing:'morning',   blood_group:'O+',  emergency_name:'Priya Kumar', emergency_phone:'9876543211', emergency_relation:'Wife' },
  { first_name:'Suresh',  last_name:'Babu',    email:'suresh.babu@fleet.com',   phone:'9876543220', license_number:'AP0220180023456', vehicle_number:'AP28CD5678', vehicle_type:'bus',   department:'Transport', employee_id:'EMP002', shift_timing:'afternoon', blood_group:'A+' },
  { first_name:'Anitha',  last_name:'Reddy',   email:'anitha.reddy@fleet.com',  phone:'9876543230', license_number:'KA0320200034567', vehicle_number:'KA05EF9012', vehicle_type:'van',   department:'Delivery',  employee_id:'EMP003', shift_timing:'morning',   blood_group:'B+',  gender:'female' },
  { first_name:'Mohan',   last_name:'Raj',     email:'mohan.raj@fleet.com',     phone:'9876543240', license_number:'MH0420170045678', vehicle_number:'MH02GH3456', vehicle_type:'car',   department:'Executive', employee_id:'EMP004', shift_timing:'flexible',  blood_group:'AB+' },
  { first_name:'Lakshmi', last_name:'Devi',    email:'lakshmi.devi@fleet.com',  phone:'9876543250', license_number:'TS0520190056789', vehicle_number:'TS08IJ7890', vehicle_type:'car',   department:'Sales',     employee_id:'EMP005', shift_timing:'morning',   blood_group:'O-',  gender:'female' },
  { first_name:'Venkat',  last_name:'Rao',     email:'venkat.rao@fleet.com',    phone:'9876543260', license_number:'TN0620200067890', vehicle_number:'TN22KL1234', vehicle_type:'truck', department:'Logistics', employee_id:'EMP006', shift_timing:'night',     blood_group:'A-' },
  { first_name:'Priya',   last_name:'Sharma',  email:'priya.sharma@fleet.com',  phone:'9876543270', license_number:'DL0720180078901', vehicle_number:'DL01MN5678', vehicle_type:'car',   department:'HR',        employee_id:'EMP007', shift_timing:'morning',   blood_group:'B-',  gender:'female' },
  { first_name:'Karthik', last_name:'Nair',    email:'karthik.nair@fleet.com',  phone:'9876543280', license_number:'KL0820190089012', vehicle_number:'KL07OP9012', vehicle_type:'van',   department:'Delivery',  employee_id:'EMP008', shift_timing:'afternoon', blood_group:'AB-' },
];

const STATUSES  = ['active','active','active','drowsy','active','offline','accident','active'];
const LOCATIONS = [
  [16.5062,80.6480],[17.3850,78.4867],[12.9716,77.5946],[19.0760,72.8777],
  [13.0827,80.2707],[16.5062,80.6480],[17.6868,83.2185],[10.8505,76.2711],
];

async function seed() {
  console.log('🌱 Starting Supabase seed...');

  // Ensure superadmin exists
  const hash = await bcrypt.hash('Admin@123', 12);
  const { error: adminErr } = await supabase.from('admins').upsert([{
    first_name:'Super', last_name:'Admin', email:'admin@fleet.com',
    password: hash, role:'superadmin',
    permissions:{ manageDrivers:true, viewAlerts:true, manageAlerts:true, viewReports:true, manageSystem:true },
  }], { onConflict: 'email' });
  if (adminErr) console.warn('Admin upsert warning:', adminErr.message);
  else console.log('👤 Superadmin ready: admin@fleet.com / Admin@123');

  // Clear existing demo data
  await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('sensor_readings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('🗑️  Cleared existing drivers/sensors/alerts');

  // Insert drivers
  const driverRows = DRIVERS_DATA.map((d, i) => ({
    ...d,
    device_id:      `ESP32_${String(i+1).padStart(3,'0')}`,
    device_status:  'assigned',
    current_status: STATUSES[i],
    last_latitude:  LOCATIONS[i][0],
    last_longitude: LOCATIONS[i][1],
    last_seen:      new Date(Date.now() - Math.random()*3600000).toISOString(),
    total_driving_hours:     Math.floor(Math.random()*500+100),
    total_alerts:            Math.floor(Math.random()*30),
    total_drowsiness_events: Math.floor(Math.random()*20),
  }));
  const { data: drivers, error: dErr } = await supabase.from('drivers').insert(driverRows).select();
  if (dErr) { console.error('❌ Drivers error:', dErr.message); process.exit(1); }
  console.log(`👥 Created ${drivers.length} drivers`);

  // Insert sensor readings
  const readings = [];
  const now = Date.now();
  for (let di = 0; di < Math.min(5, drivers.length); di++) {
    const driver = drivers[di];
    for (let j = 0; j < 40; j++) {
      const isDrowsy   = Math.random() < 0.15;
      const isAccident = !isDrowsy && Math.random() < 0.02;
      readings.push({
        driver_id:           driver.id,
        device_id:           driver.device_id,
        eye_closure_percent: isDrowsy ? Math.random()*40+60 : Math.random()*30,
        blink_rate:          Math.floor(Math.random()*25+5),
        face_detected:       true,
        acceleration_x:      isAccident ? (Math.random()*4-2) : Math.random()*0.5,
        acceleration_y:      isAccident ? (Math.random()*4-2) : Math.random()*0.5,
        acceleration_z:      9.8 + (isAccident ? Math.random()*2 : 0),
        tilt_angle:          Math.random()*10,
        latitude:            LOCATIONS[di][0] + (Math.random()-0.5)*0.05,
        longitude:           LOCATIONS[di][1] + (Math.random()-0.5)*0.05,
        speed:               Math.random()*80+20,
        drowsiness_level:    isDrowsy ? ['medium','high','critical'][Math.floor(Math.random()*3)] : 'normal',
        is_drowsy:           isDrowsy,
        is_accident:         isAccident,
        drowsiness_score:    isDrowsy ? Math.random()*40+60 : Math.random()*30,
        battery_level:       Math.random()*40+60,
        signal_strength:     Math.random()*40+60,
        timestamp:           new Date(now - j*30*60000).toISOString(),
      });
    }
  }
  const { error: sErr } = await supabase.from('sensor_readings').insert(readings);
  if (sErr) console.warn('Sensor readings warning:', sErr.message);
  else console.log(`📊 Created ${readings.length} sensor readings`);

  // Insert alerts
  const alertData = [
    { driver_id:drivers[3].id, device_id:drivers[3].device_id, type:'drowsiness', severity:'high',     message:'High drowsiness - Eye closure 78%',          status:'active',       latitude:LOCATIONS[3][0], longitude:LOCATIONS[3][1] },
    { driver_id:drivers[6].id, device_id:drivers[6].device_id, type:'accident',   severity:'critical', message:'Accident detected! Sudden acceleration spike', status:'active',       latitude:LOCATIONS[6][0], longitude:LOCATIONS[6][1] },
    { driver_id:drivers[0].id, device_id:drivers[0].device_id, type:'drowsiness', severity:'medium',   message:'Drowsiness detected - Level: medium',          status:'acknowledged', latitude:LOCATIONS[0][0], longitude:LOCATIONS[0][1], acknowledged_at: new Date().toISOString() },
    { driver_id:drivers[1].id, device_id:drivers[1].device_id, type:'drowsiness', severity:'low',      message:'Low drowsiness signal detected',               status:'resolved',     latitude:LOCATIONS[1][0], longitude:LOCATIONS[1][1], resolved_at: new Date().toISOString() },
    { driver_id:drivers[4].id, device_id:drivers[4].device_id, type:'drowsiness', severity:'medium',   message:'Drowsiness - Blink rate abnormal',             status:'active',       latitude:LOCATIONS[4][0], longitude:LOCATIONS[4][1] },
  ];
  const { error: aErr } = await supabase.from('alerts').insert(alertData);
  if (aErr) console.warn('Alerts warning:', aErr.message);
  else console.log(`🚨 Created ${alertData.length} alerts`);

  console.log('\n✅ Seed complete!');
  console.log('🔑 Login: admin@fleet.com / Admin@123');
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
