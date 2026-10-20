import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, GraduationCap, LockKeyhole, Mail, Eye, HelpCircle, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';

export type LoginRole = 'Management' | 'Faculty' | 'Parent' | 'Student';

type LoginResponse = {
  success?: boolean;
  token?: string;
  user?: { id?: string; tenantId?: string; name?: string; email?: string; role?: string };
  message?: string;
};

export default function LoginPage({ role, title, color }: { role: LoginRole; title: string; color: string }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [remember, setRemember] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('tenant_token');
    const userRaw = sessionStorage.getItem('tenant_user');
    if (!token || !userRaw) return;
    try {
      const user = JSON.parse(userRaw) as LoginResponse['user'];
      if (user?.role === role.toUpperCase()) nav('/workspace', { replace: true });
    } catch {
      sessionStorage.removeItem('tenant_token');
      sessionStorage.removeItem('tenant_user');
    }
  }, [nav, role]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const configuredBase = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim();
      const base = configuredBase.replace(/\/$/, '');
      const response = await fetch(base + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, tenantId: tenantId.trim(), role: role.toUpperCase() }),
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
      setMessage('Sign-in successful. Opening your workspace…');
      nav('/workspace', { replace: true });
    } catch (err) {
      const fallback = err instanceof TypeError
        ? 'Cannot reach the Tenant API. Start Tenant_backend and verify VITE_API_BASE_URL and CORS_ORIGIN.'
        : 'Unable to sign in. Please try again.';
      setMessage(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  return <div className="layout">
    <aside className="brand-side">
      <div className="side-top"><Link className="brand" to="/"><span className="brand-icon"><GraduationCap size={19}/></span><span><b>EduSphere Enterprise</b><small>UNIFIED ACADEMIC OS</small></span></Link><span className="status">Tenant sign-in</span></div>
      <div className="side-copy"><div className="eyebrow">SMARTER EDUCATION. BETTER TOMORROW.</div><h1>One Platform.<br/><span>Every Possibility.</span></h1><p>Secure access to the right workspace for every member of your school community.</p></div>
      <div className="login-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core"><span><ShieldCheck size={25}/></span><b>{role.toUpperCase()} WORKSPACE</b></div></div>
      <div className="side-bottom">Secure tenant-scoped access · EduSphere</div>
    </aside>
    <main className="login-side">
      <div className="login-top"><button type="button" onClick={() => nav('/')}><ArrowLeft size={14}/> Back to role selection</button><span><HelpCircle size={13}/> Need help? Contact your school administrator</span></div>
      <section className="login-card">
        <div className={'login-role ' + color}>{role} portal</div>
        <h2>{title}</h2>
        <p className="login-intro">Sign in with the credentials issued by your school. Your account and school must match the selected role.</p>
        <div className="or">SCHOOL CREDENTIALS</div>
        <form onSubmit={submit}>
          <label htmlFor="tenant">School / Tenant ID</label>
          <input id="tenant" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="School tenant UUID" autoComplete="organization" required pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}" title="Enter the UUID provided by your school administrator."/>
          <label htmlFor="email">School Email</label>
          <div className="field"><Mail size={14}/><input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@school.edu" maxLength={254} required/></div>
          <div className="password-label"><label htmlFor="password">Password</label><button type="button" onClick={() => setMessage('For a password reset, contact your school administrator. Self-service reset is not configured yet.')}>Forgot password?</button></div>
          <div className="field"><LockKeyhole size={14}/><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required/><button className="eye" type="button" aria-label={visible ? 'Hide password' : 'Show password'} onClick={() => setVisible(!visible)}><Eye size={14}/></button></div>
          <label className="remember"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}/> Keep me logged in on this personal device</label>
          <button className="launch" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in to ' + role} <ArrowRight size={14}/></button>
          {message && <p className="message" role="status" aria-live="polite">{message}</p>}
        </form>
        <div className="exam"><b>Secure access:</b> Never share your password or use “keep me logged in” on a shared device.</div>
      </section>
      <footer className="login-footer"><Link to="/">Back to EduSphere home</Link><span>English</span></footer>
    </main>
  </div>;
}
