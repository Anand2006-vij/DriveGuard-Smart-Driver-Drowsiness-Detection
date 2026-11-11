import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cpu, Eye, EyeOff } from 'lucide-react';
import { login } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form,     setForm]     = useState({ email:'admin@fleet.com', password:'Admin@123' });
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { loginUser } = useAuth();
  const navigate      = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.admin);
      const name = res.data.admin.first_name || res.data.admin.firstName || '';
      toast.success(`Welcome back, ${name}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-primary)', backgroundImage:'radial-gradient(ellipse at 20% 20%, rgba(59,130,246,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.08) 0%, transparent 60%)', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:40 }}>
          <div style={{ width:56, height:56, background:'linear-gradient(135deg,#3b82f6,#8b5cf6)', borderRadius:16, margin:'0 auto 16px', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(59,130,246,0.3)' }}>
            <Cpu size={26} color="white" />
          </div>
          <h1 style={{ fontSize:26, fontWeight:800, letterSpacing:'-0.5px' }}>DriveGuard</h1>
          <p style={{ fontSize:14, color:'var(--text-secondary)', marginTop:6 }}>Smart Driver Safety Platform</p>
        </div>

        {/* Card */}
        <div className="card" style={{ boxShadow:'0 20px 60px rgba(0,0,0,0.5)', border:'1px solid var(--border-light)' }}>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:6 }}>Sign In</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:24 }}>Access the admin dashboard</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@fleet.com" required />
            </div>
            <div className="form-group" style={{ marginBottom:24 }}>
              <label className="form-label">Password</label>
              <div style={{ position:'relative' }}>
                <input className="form-input" type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required style={{ paddingRight:44 }} />
                <button type="button" onClick={() => setShowPass(s => !s)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', display:'flex', alignItems:'center' }}>
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center', padding:11 }} disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop:20, padding:12, background:'rgba(59,130,246,0.08)', borderRadius:8, border:'1px solid rgba(59,130,246,0.2)' }}>
            <div style={{ fontSize:11, color:'var(--text-secondary)', fontWeight:600, marginBottom:4 }}>DEMO CREDENTIALS</div>
            <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--cyan)' }}>admin@fleet.com / Admin@123</div>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Run: <code>cd backend && node seed.js</code> first</div>
          </div>
        </div>

        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:'var(--text-muted)' }}>
          ESP32-CAM · MPU6050 · GPS NEO-6M · Supabase · Socket.IO
        </div>
      </div>
    </div>
  );
}
