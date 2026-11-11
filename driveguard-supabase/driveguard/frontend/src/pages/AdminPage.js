import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Trash2, UserCheck, UserX } from 'lucide-react';
import { format } from 'date-fns';
import { getAdminUsers, updateAdminUser, deleteAdminUser, register } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Dashboard/Topbar';
import toast from 'react-hot-toast';

const ROLE_COLORS = { superadmin:'var(--danger)', admin:'var(--accent)', viewer:'var(--purple)' };
const EMPTY_FORM  = { firstName:'', lastName:'', email:'', password:'', phone:'', role:'admin' };

export default function AdminPage() {
  const [admins,  setAdmins]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const { admin: me } = useAuth();

  const fetch = async () => {
    setLoading(true);
    try { const r = await getAdminUsers(); setAdmins(r.data.admins); }
    catch (err) { toast.error(err.response?.data?.error || 'Access denied'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetch(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await register(form);
      toast.success('Admin created');
      setShowAdd(false); setForm(EMPTY_FORM); fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const toggleActive = async (id, isActive) => {
    try { await updateAdminUser(id, { isActive: !isActive }); toast.success(isActive ? 'Deactivated' : 'Activated'); fetch(); }
    catch { toast.error('Failed'); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this admin?')) return;
    try { await deleteAdminUser(id); toast.success('Deleted'); fetch(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const adminName = a => `${a.first_name||a.firstName||''} ${a.last_name||a.lastName||''}`.trim();
  const adminId   = a => a.id || a._id;
  const meId      = me?.id || me?._id;

  return (
    <div>
      <Topbar title="Admin Management" subtitle="Manage admin users and permissions" onRefresh={fetch} loading={loading} />
      <div className="page-content">

        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:20 }}>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={15} /> {showAdd ? 'Cancel' : 'Add Admin'}
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom:24, borderColor:'var(--border-light)' }}>
            <div className="section-title"><ShieldCheck size={16} color="var(--accent)" /> New Admin User</div>
            <form onSubmit={handleAdd}>
              <div className="form-grid">
                {[['firstName','First Name'],['lastName','Last Name'],['email','Email'],['password','Password'],['phone','Phone']].map(([key,label]) => (
                  <div key={key} className="form-group">
                    <label className="form-label">{label}</label>
                    <input className="form-input" type={key==='password' ? 'password' : key==='email' ? 'email' : 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]:e.target.value }))} required />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm(f => ({ ...f, role:e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
                <button type="submit" className="btn btn-primary">Create Admin</button>
              </div>
            </form>
          </div>
        )}

        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Admin</th><th>Role</th><th>Phone</th><th>Last Login</th><th>Status</th><th>Created</th><th style={{ textAlign:'right' }}>Actions</th></tr></thead>
              <tbody>
                {admins.map(adm => (
                  <tr key={adminId(adm)}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="driver-avatar" style={{ background:`linear-gradient(135deg,${ROLE_COLORS[adm.role]},#8b5cf6)` }}>
                          {(adm.first_name||adm.firstName||'?')[0]}{(adm.last_name||adm.lastName||'')[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>
                            {adminName(adm)}
                            {adminId(adm) === meId && <span style={{ fontSize:10, color:'var(--accent)', marginLeft:6 }}>(you)</span>}
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-muted)' }}>{adm.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{ fontSize:12, fontWeight:600, color:ROLE_COLORS[adm.role], textTransform:'capitalize' }}>{adm.role}</span></td>
                    <td style={{ fontSize:13 }}>{adm.phone || '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-secondary)' }}>
                      {(adm.last_login || adm.lastLogin) ? format(new Date(adm.last_login || adm.lastLogin), 'MMM d, HH:mm') : 'Never'}
                    </td>
                    <td><span className={`badge ${adm.is_active ?? adm.isActive ? 'badge-active' : 'badge-offline'}`}>{(adm.is_active ?? adm.isActive) ? 'Active' : 'Inactive'}</span></td>
                    <td style={{ fontSize:12, color:'var(--text-muted)' }}>{format(new Date(adm.created_at || adm.createdAt), 'MMM d, yyyy')}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                        {adminId(adm) !== meId && (
                          <>
                            <button className="btn btn-icon btn-ghost btn-sm" onClick={() => toggleActive(adminId(adm), adm.is_active ?? adm.isActive)} title={adm.is_active ?? adm.isActive ? 'Deactivate' : 'Activate'}>
                              {(adm.is_active ?? adm.isActive) ? <UserX size={13} color="var(--warning)" /> : <UserCheck size={13} color="var(--success)" />}
                            </button>
                            <button className="btn btn-icon btn-sm" style={{ background:'rgba(239,68,68,0.1)', color:'var(--danger)' }} onClick={() => remove(adminId(adm))}><Trash2 size={13} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card" style={{ marginTop:20 }}>
          <div className="section-title"><ShieldCheck size={15} color="var(--accent)" /> Role Permissions</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:16 }}>
            {[
              { role:'superadmin', color:'var(--danger)',  perms:['All permissions','Manage admins','System settings'] },
              { role:'admin',      color:'var(--accent)',  perms:['Manage drivers','View/manage alerts','View reports'] },
              { role:'viewer',     color:'var(--purple)',  perms:['View drivers','View alerts','Read-only access'] },
            ].map(r => (
              <div key={r.role} style={{ padding:14, background:'var(--bg-primary)', borderRadius:8, border:'1px solid var(--border)' }}>
                <div style={{ fontWeight:700, textTransform:'capitalize', color:r.color, marginBottom:8 }}>{r.role}</div>
                {r.perms.map(p => <div key={p} style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:3 }}>• {p}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
