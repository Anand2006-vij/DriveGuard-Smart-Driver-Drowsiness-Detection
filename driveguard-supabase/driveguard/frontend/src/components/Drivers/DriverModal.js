import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createDriver, updateDriver } from '../../utils/api';
import toast from 'react-hot-toast';

const EMPTY = {
  firstName:'', lastName:'', email:'', phone:'',
  dateOfBirth:'', gender:'',
  address:{ street:'', city:'', state:'', zipCode:'', country:'India' },
  licenseNumber:'', licenseExpiry:'', licenseType:'LMV',
  employeeId:'', department:'', shiftTiming:'morning',
  vehicleNumber:'', vehicleType:'car', vehicleModel:'',
  deviceId:'', bloodGroup:'',
  emergencyContact:{ name:'', phone:'', relation:'' },
  notes:'',
};

// Supabase rows use snake_case; map to camelCase for the form
function rowToForm(d) {
  return {
    firstName:    d.first_name    || '',
    lastName:     d.last_name     || '',
    email:        d.email         || '',
    phone:        d.phone         || '',
    dateOfBirth:  d.date_of_birth ? d.date_of_birth.split('T')[0] : '',
    gender:       d.gender        || '',
    address:{
      street:  d.street   || '',
      city:    d.city     || '',
      state:   d.state    || '',
      zipCode: d.zip_code || '',
      country: d.country  || 'India',
    },
    licenseNumber: d.license_number || '',
    licenseExpiry: d.license_expiry ? d.license_expiry.split('T')[0] : '',
    licenseType:   d.license_type  || 'LMV',
    employeeId:    d.employee_id   || '',
    department:    d.department    || '',
    shiftTiming:   d.shift_timing  || 'morning',
    vehicleNumber: d.vehicle_number || '',
    vehicleType:   d.vehicle_type   || 'car',
    vehicleModel:  d.vehicle_model  || '',
    deviceId:      d.device_id     || '',
    bloodGroup:    d.blood_group   || '',
    emergencyContact:{
      name:     d.emergency_name     || '',
      phone:    d.emergency_phone    || '',
      relation: d.emergency_relation || '',
    },
    notes: d.notes || '',
  };
}

export default function DriverModal({ driver, onClose, onSaved }) {
  const [form, setForm]     = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]       = useState('personal');
  const isEdit = !!driver;

  useEffect(() => {
    if (driver) setForm(rowToForm(driver));
  }, [driver]);

  const set       = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setNested = (k, sk, v) => setForm(f => ({ ...f, [k]: { ...f[k], [sk]: v } }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEdit) { await updateDriver(driver.id, form); toast.success('Driver updated'); }
      else        { await createDriver(form);             toast.success('Driver added'); }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save driver');
    } finally { setLoading(false); }
  };

  const inp = (label, key, type='text', required=false) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color:'var(--danger)' }}> *</span>}</label>
      <input className="form-input" type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)} required={required} />
    </div>
  );

  const sel = (label, key, options, required=false) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color:'var(--danger)' }}> *</span>}</label>
      <select className="form-select" value={form[key] || ''} onChange={e => set(key, e.target.value)}>
        <option value="">Select...</option>
        {options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  const TABS = [
    { id:'personal', label:'Personal' },
    { id:'license',  label:'License & Work' },
    { id:'vehicle',  label:'Vehicle & Device' },
    { id:'emergency',label:'Emergency' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Driver' : 'Add New Driver'}</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding:'0 28px' }}>
          <div className="tabs">
            {TABS.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">

            {/* Personal */}
            {tab === 'personal' && (
              <>
                <div className="form-grid">
                  {inp('First Name','firstName','text',true)}
                  {inp('Last Name','lastName','text',true)}
                  {inp('Email','email','email',true)}
                  {inp('Phone','phone','tel',true)}
                  {inp('Date of Birth','dateOfBirth','date')}
                  {sel('Gender','gender',[['male','Male'],['female','Female'],['other','Other']])}
                  {sel('Blood Group','bloodGroup',[['A+','A+'],['A-','A-'],['B+','B+'],['B-','B-'],['AB+','AB+'],['AB-','AB-'],['O+','O+'],['O-','O-']])}
                </div>
                <div style={{ marginTop:4 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)', marginBottom:12 }}>Address</div>
                  <div className="form-grid">
                    {[['street','Street'],['city','City'],['state','State'],['zipCode','Zip Code']].map(([sk,label]) => (
                      <div key={sk} className="form-group">
                        <label className="form-label">{label}</label>
                        <input className="form-input" value={form.address[sk]} onChange={e => setNested('address', sk, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* License */}
            {tab === 'license' && (
              <div className="form-grid">
                {inp('License Number','licenseNumber','text',true)}
                {inp('License Expiry','licenseExpiry','date')}
                {sel('License Type','licenseType',[['LMV','LMV - Light Motor Vehicle'],['HMV','HMV - Heavy Motor Vehicle'],['HGMV','HGMV - Heavy Goods'],['PSV','PSV - Passenger'],['Transport','Transport']])}
                {inp('Employee ID','employeeId')}
                {inp('Department','department')}
                {sel('Shift Timing','shiftTiming',[['morning','Morning'],['afternoon','Afternoon'],['night','Night'],['flexible','Flexible']])}
              </div>
            )}

            {/* Vehicle */}
            {tab === 'vehicle' && (
              <div className="form-grid">
                {inp('Vehicle Number','vehicleNumber')}
                {sel('Vehicle Type','vehicleType',[['car','Car'],['truck','Truck'],['bus','Bus'],['bike','Bike'],['van','Van']])}
                {inp('Vehicle Model','vehicleModel')}
                {inp('Device ID (ESP32)','deviceId')}
                <div className="form-group" style={{ gridColumn:'span 2' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" value={form.notes||''} onChange={e => set('notes',e.target.value)} />
                </div>
              </div>
            )}

            {/* Emergency */}
            {tab === 'emergency' && (
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Contact Name</label>
                  <input className="form-input" value={form.emergencyContact.name} onChange={e => setNested('emergencyContact','name',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Phone</label>
                  <input className="form-input" value={form.emergencyContact.phone} onChange={e => setNested('emergencyContact','phone',e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Relation</label>
                  <input className="form-input" value={form.emergencyContact.relation} placeholder="e.g. Spouse, Parent" onChange={e => setNested('emergencyContact','relation',e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Driver' : 'Add Driver'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
