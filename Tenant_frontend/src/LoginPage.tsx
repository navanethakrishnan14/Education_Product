import { useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, BookOpen, LockKeyhole, Mail, Eye, HelpCircle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';

export type LoginRole = 'Management' | 'Faculty' | 'Parent' | 'Student';

type LoginResponse = {
  success?: boolean;
  token?: string;
  user?: { id?: string; tenantId?: string; tenantCode?: string | null; name?: string; email?: string; role?: string };
  message?: string;
};

export default function LoginPage({ role, title, color }: { role: LoginRole; title: string; color: string }) {
  const nav = useNavigate();
  const [email, setEmail] = useState(() => {
    if (role !== 'Management') return '';
    const params = new URLSearchParams(window.location.search);
    return params.get('email')?.trim() || '';
  });
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const isManagement = role === 'Management';
      const configuredBase = isManagement
        ? String(import.meta.env.VITE_PLATFORM_API_BASE_URL || 'http://localhost:4000/api/v1').trim()
        : String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim();
      const base = configuredBase.replace(/\/$/, '');
      const endpoint = isManagement ? '/organization-auth/login' : '/auth/login';
      const loginBody = isManagement
        ? { email: email.trim(), password }
        : { email: email.trim(), password, tenantId: tenantId.trim(), role: role.toUpperCase() };
      const response = await fetch(base + endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(loginBody),
      });
      const raw = await response.text();
      let data: LoginResponse;
      try {
        data = raw ? JSON.parse(raw) as LoginResponse : {};
      } catch {
        throw new Error('The sign-in server returned an unreadable response. Check the API URL and backend logs.');
      }
      if (!response.ok) throw new Error(data.message || `Sign-in failed (HTTP ${response.status}).`);
      if (!data.token || !data.user) throw new Error(data.message || 'The server did not return a login token and user profile.');
      if ((data.user.role || '').toUpperCase() !== role.toUpperCase()) {
        throw new Error('This account does not have the selected role. Return to role selection and choose the correct portal.');
      }

      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('tenant_token', data.token);
      storage.setItem('tenant_user', JSON.stringify(data.user));
      // Keep the legacy session keys working for existing screens.
      if (storage === localStorage) {
        sessionStorage.removeItem('tenant_token');
        sessionStorage.removeItem('tenant_user');
      }
      nav('/workspace', { replace: true });
    } catch (err) {
      const fallback = err instanceof TypeError
        ? (role === 'Management'
          ? 'Cannot reach the Platform API. Start Platform_Backend and verify VITE_PLATFORM_API_BASE_URL and CORS_ORIGIN.'
          : 'Cannot reach the Tenant API. Start Tenant_backend and verify VITE_API_BASE_URL and CORS_ORIGIN.')
        : 'Unable to sign in. Please try again.';
      setMessage(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  const roleItems = [
    { name: 'Management', detail: 'Manage school operations', icon: '🏫', path: '/login/management' },
    { name: 'Faculty', detail: 'Teach · Attend · Assess', icon: '👩‍🏫', path: '/login/faculty' },
    { name: 'Parent', detail: "Track your child’s progress", icon: '👨‍👩‍👧', path: '/login/parent' },
    { name: 'Student', detail: 'Learn · Grow · Succeed', icon: '🎓', path: '/login/student' },
  ];
  return <div className={`edu-login-shell theme-${color} ${role === "Management" ? "management-login" : role === "Faculty" ? "faculty-login" : ""}`}>
    <section className="edu-login-visual">
      <div className="edu-login-visual-inner">
        <Link className="edu-login-logo" to="/"><span className="edu-logo-symbol"><GraduationCap size={31}/><span>▱</span></span><span><b>EduPro</b><small>School Management System</small></span></Link>
        <div className="edu-login-title"><h1>{role === 'Management' ? <>Empower<br/>Your School<br/><span>Management</span></> : role === 'Faculty' ? <>Inspire<br/>Educate<br/><span>Make an Impact</span></> : <>Choose Your <span>Role</span></>}</h1><p>{role === 'Management' ? 'Manage academics, users, attendance, reports and overall school operations in one place.' : role === 'Faculty' ? 'Manage your classes, take attendance, enter marks and track student performance effortlessly.' : 'Login to your account to continue'}</p></div>
        {role === 'Management' ? <div className="edu-management-benefits"><div><span>♟</span><p><b>Complete Control</b><small>Users, Academics, Reports</small></p></div><div><span>✓</span><p><b>Better Efficiency</b><small>Streamlined Operations</small></p></div><div><span>▥</span><p><b>Data Driven Insights</b><small>Smarter Decisions</small></p></div></div> : role === 'Faculty' ? <div className="edu-management-benefits faculty-benefits"><div><span>⚑</span><p><b>Manage Classes</b><small>Timetable &amp; Attendance</small></p></div><div><span>▰</span><p><b>Track Performance</b><small>Marks &amp; Assessments</small></p></div><div><span>▣</span><p><b>Stay Connected</b><small>Communicate with Students</small></p></div></div> : <nav className="edu-role-list" aria-label="Choose login role">
          {roleItems.map(item => <button key={item.name} type="button" className={`edu-role-option ${role === item.name ? 'active' : ''}`} onClick={() => nav(item.path)} aria-current={role === item.name ? 'page' : undefined}>
            <span className={`edu-role-icon icon-${item.name.toLowerCase()}`}>{item.icon}</span><span className="edu-role-copy"><b>{item.name}</b><small>{item.detail}</small></span><span className="edu-role-arrow"><ArrowRight size={17}/></span>
          </button>)}
        </nav>}
        <div className="edu-login-slogan"><span></span><p>Better Education<br/>Brighter Tomorrow</p></div>
      </div>
    </section>
    <main className="edu-login-form-panel">
      <div className="edu-language"><span>◎</span> English <span>⌄</span></div>
      <section className="edu-login-card">
        {role !== 'Management' && <Link className="edu-form-brand" to="/"><span className="edu-form-brand-icon"><GraduationCap size={32}/><BookOpen size={25}/></span><span><b>EduPro</b><small>School Management System</small></span></Link>}
        {role === 'Management' && <div className="edu-management-emblem"><GraduationCap size={54}/></div>}{role === 'Faculty' && <div className="edu-management-emblem faculty-emblem"><span>👨‍🏫</span></div>}
        <h2>{role} Login</h2>
        <p className="edu-form-subtitle">{role === 'Management' ? 'Access and manage your school with ease.' : role === 'Faculty' ? 'Access your classes, attendance and manage student performance.' : role === 'Parent' ? "Track your child’s progress, attendance, exams and stay updated." : 'Access your timetable, homework, exams and learning materials.'}</p>
        <form className="edu-login-fields" onSubmit={submit}>
          {role !== 'Management' && <><label htmlFor="tenant">School / Tenant ID</label><input className="edu-plain-input" id="tenant" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="Enter your school tenant ID" autoComplete="organization" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}" title="Enter the UUID provided by your school administrator."/></>}
          <label htmlFor="email">{role === 'Management' ? 'Email Address' : 'Email Address'}</label>
          <div className="edu-input-wrap"><Mail size={16}/><input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email address" maxLength={254} required/></div>
          <label htmlFor="password">Password</label>
          <div className="edu-input-wrap"><LockKeyhole size={16}/><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required/><button className="edu-password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}><Eye size={16}/></button></div>
          <div className="edu-form-options"><label><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/> Remember me</label><button type="button" onClick={() => setMessage('Please contact your school administrator to reset your password.')}>Forgot password?</button></div>
          {message && <p className="edu-login-message" role="status" aria-live="polite">{message}</p>}
          <button className="edu-submit" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Login'} <ArrowRight size={22}/></button>
        </form>
        <div className="edu-divider"><span>or continue with</span></div>
        <div className="edu-social-row"><button type="button" onClick={() => setMessage('Google sign-in is not configured yet. Please use your school credentials.') }><b className="google-g">G</b> Continue with Google</button><button type="button" onClick={() => setMessage('Microsoft sign-in is not configured yet. Please use your school credentials.') }><b className="microsoft-mark">▦</b> Continue with Microsoft</button></div>
        <p className="edu-admin-help">Need help? Contact your administrator.</p>
      </section>
      <footer className="edu-login-footer"><Link to="/">Back to role selection</Link><span>Secure school access</span></footer>
    </main>
  </div>;
}
