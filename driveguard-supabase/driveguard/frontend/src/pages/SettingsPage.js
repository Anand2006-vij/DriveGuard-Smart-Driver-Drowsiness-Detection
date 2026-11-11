import React, { useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import { updateProfile, changePassword } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Dashboard/Topbar';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { admin, updateAdmin } = useAuth();
  const [tab,      setTab]      = useState('profile');
  const [profile,  setProfile]  = useState({
    firstName: admin?.first_name  || admin?.firstName  || '',
    lastName:  admin?.last_name   || admin?.lastName   || '',
    phone:     admin?.phone       || '',
  });
  const [passwords, setPasswords] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [saving,    setSaving]    = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await updateProfile(profile);
      updateAdmin(r.data.admin);
      toast.success('Profile updated');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) { toast.error('Passwords do not match'); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed');
      setPasswords({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  const firstName = admin?.first_name  || admin?.firstName  || '';
  const lastName  = admin?.last_name   || admin?.lastName   || '';

  return (
    <div>
      <Topbar title="Settings" subtitle="Manage your account and preferences" />
      <div className="page-content">
        <div style={{ maxWidth:700 }}>
          <div className="tabs">
            {[['profile','Profile',User],['security','Security',Lock]].map(([id,label,Icon]) => (
              <button key={id} className={`tab ${tab===id ? 'active' : ''}`} onClick={() => setTab(id)}>
                <Icon size={13} style={{ display:'inline', marginRight:6 }} />{label}
              </button>
            ))}
          </div>

          {tab === 'profile' && (
            <div className="card">
              <div className="section-title"><User size={16} color="var(--accent)" /> Profile Information</div>
              <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:24, padding:16, background:'var(--bg-primary)', borderRadius:10, border:'1px solid var(--border)' }}>
                <div className="driver-avatar driver-avatar-lg">{firstName[0]}{lastName[0]}</div>
                <div>
                  <div style={{ fontWeight:700, fontSize:16 }}>{firstName} {lastName}</div>
                  <div style={{ fontSize:13, color:'var(--text-secondary)' }}>{admin?.email}</div>
                  <div style={{ fontSize:12, color:'var(--text-muted)', textTransform:'capitalize', marginTop:2 }}>Role: <span style={{ color:'var(--accent)' }}>{admin?.role}</span></div>
                </div>
              </div>
              <form onSubmit={handleProfileSave}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input className="form-input" value={profile.firstName} onChange={e => setProfile(p => ({ ...p, firstName:e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input className="form-input" value={profile.lastName}  onChange={e => setProfile(p => ({ ...p, lastName:e.target.value }))}  required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone:e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email (read-only)</label>
                    <input className="form-input" value={admin?.email||''} disabled style={{ opacity:0.5 }} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}><Save size={14} /> {saving ? 'Saving...' : 'Save Profile'}</button>
              </form>
            </div>
          )}

          {tab === 'security' && (
            <div className="card">
              <div className="section-title"><Lock size={16} color="var(--accent)" /> Change Password</div>
              <form onSubmit={handlePasswordChange}>
                {[['currentPassword','Current Password'],['newPassword','New Password'],['confirmPassword','Confirm New Password']].map(([key,label]) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input className="form-input" type="password" value={passwords[key]} onChange={e => setPasswords(p => ({ ...p, [key]:e.target.value }))} required minLength={key!=='currentPassword' ? 6 : undefined} />
                  </div>
                ))}
                <div style={{ padding:'12px 16px', background:'rgba(59,130,246,0.1)', borderRadius:8, marginBottom:16, fontSize:13, color:'var(--text-secondary)' }}>
                  Password must be at least 6 characters.
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}><Lock size={14} /> {saving ? 'Updating...' : 'Change Password'}</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
