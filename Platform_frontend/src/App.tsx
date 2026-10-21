import { useState } from "react";
import {
  ArrowRight, GraduationCap, LockKeyhole, Mail, ShieldCheck, Building2,
  Users, ChartNoAxesCombined, Settings, LogOut, Menu, X, Search, Bell,
  ChevronRight, Globe2
} from "lucide-react";
import { Link, NavLink, Route, Routes, useNavigate, Outlet } from "react-router-dom";
import type { FormEvent } from "react";
import Tenant from "./Tenant";

function Brand() {
  return <Link to="/" className="brand"><span className="brand-icon"><GraduationCap size={21} /></span><span><b>EduSphere</b><small>PLATFORM ADMINISTRATION</small></span></Link>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
      const res = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to sign in.");
      if (!data.token) throw new Error("The platform API did not return a session token.");
      sessionStorage.setItem("platform_token", data.token);
      sessionStorage.setItem("platform_user", JSON.stringify(data.user || {}));
      nav("/dashboard");
    } catch (e) {
      setMessage(e instanceof Error && e.message === "Failed to fetch"
        ? "Cannot reach Platform_Backend. Check that it is running and VITE_PLATFORM_API_BASE_URL is correct."
        : e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <div className="login-brand"><Brand /><span className="secure"><ShieldCheck size={14} /> Secure administrator access</span></div>
    <section className="login-card">
      <div className="login-symbol"><LockKeyhole size={23} /></div>
      <p className="eyebrow">PLATFORM CONTROL CENTER</p>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to manage schools and platform operations.</p>
      <form onSubmit={submit}>
        <label htmlFor="email">Administrator email</label>
        <div className="field"><Mail size={16} /><input id="email" type="email" autoComplete="username" placeholder="admin@edusphere.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <label htmlFor="password">Password</label>
        <div className="field"><LockKeyhole size={16} /><input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></div>
        <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in to Platform"} <ArrowRight size={16} /></button>
        {message && <p className="notice" role="status">{message}</p>}
      </form>
      <div className="login-note"><ShieldCheck size={15} /> Access is restricted to authorized platform administrators.</div>
    </section>
    <footer>© {new Date().getFullYear()} EduSphere · Platform Administration</footer>
  </main>;
}

const metrics = [
  { label: "Registered Tenants", value: "—", detail: "Schools, colleges and institutions", icon: Building2, tone: "violet" },
  { label: "Tenant Users", value: "—", detail: "Across all tenant organizations", icon: Users, tone: "teal" },
  { label: "Platform Health", value: "—", detail: "API and database status", icon: ChartNoAxesCombined, tone: "blue" }
];

function OverviewPage() {
  return <>
    <div className="welcome-row"><div><p className="eyebrow">PLATFORM CONTROL CENTER</p><h1>Good to see you.</h1><p className="muted">Here’s an overview of your EduSphere platform.</p></div><span className="platform-status"><i /> Platform admin area</span></div>
    <div className="metric-grid">{metrics.map(m => { const Icon = m.icon; return <article className="metric" key={m.label}><span className={"metric-icon " + m.tone}><Icon size={20} /></span><p>{m.label}</p><h2>{m.value}</h2><small>{m.detail}</small></article>; })}</div>
    <section className="quick-grid">
      <article className="quick-card"><span className="quick-icon teal"><Users size={20} /></span><h3>Platform users</h3><p>Review authorized platform accounts.</p><NavLink className="text-link" to="/dashboard/users">Open platform users <ArrowRight size={14} /></NavLink></article>
      <article className="quick-card"><span className="quick-icon violet"><Globe2 size={20} /></span><h3>Tenant operations</h3><p>Manage schools, colleges and institutions.</p><NavLink className="text-link" to="/dashboard/tenant">Open tenants <ArrowRight size={14} /></NavLink></article>
    </section>
    <footer className="dash-footer">EduSphere Platform Administration <span>Secure · Multi-tenant ready</span></footer>
  </>;
}

function PlatformUsersPage() {
  return <section className="section-card standalone-page">
    <p className="eyebrow">ACCESS CONTROL</p><h1>Platform users</h1>
    <p className="muted">Review and manage authorized platform administrator accounts.</p>
    <div className="empty-state"><span><Users size={24} /></span><h3>Platform user directory</h3><p>User listing and management will appear here after API integration.</p></div>
    <span className="coming">API integration required</span>
  </section>;
}

function SettingsPage() {
  return <section className="section-card standalone-page">
    <p className="eyebrow">CONFIGURATION</p><h1>Settings</h1>
    <p className="muted">Configure your platform workspace and administration preferences.</p>
    <div className="settings-row"><span className="quick-icon violet"><Settings size={20} /></span><div><strong>Platform settings</strong><p className="muted">Authentication, workspace and platform preferences.</p></div><span className="coming">Coming with API integration</span></div>
  </section>;
}

function Dashboard() {
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  function logout() {
    sessionStorage.removeItem("platform_token");
    sessionStorage.removeItem("platform_user");
    nav("/");
  }

  return <div className="dashboard">
    <aside className={"sidebar " + (menu ? "show" : "")} style={{ alignItems: "stretch", textAlign: "left", width: "100%", boxSizing: "border-box" }}>
      <Brand />
      <div className="nav-caption" style={{ width: "100%", textAlign: "left", alignSelf: "stretch" }}>PLATFORM</div>
      <NavLink end className={({ isActive }) => "nav-item " + (isActive ? "active" : "")} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: "14px", width: "100%", alignSelf: "stretch", boxSizing: "border-box", paddingLeft: "16px", paddingRight: "16px", textAlign: "left" }} to="/dashboard" onClick={() => setMenu(false)}><ChartNoAxesCombined size={17} /> <span style={{ textAlign: "left", flex: 1 }}>Overview</span></NavLink>
      <NavLink className={({ isActive }) => "nav-item " + (isActive ? "active" : "")} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: "14px", width: "100%", alignSelf: "stretch", boxSizing: "border-box", paddingLeft: "16px", paddingRight: "16px", textAlign: "left" }} to="/dashboard/tenant" onClick={() => setMenu(false)}><Building2 size={17} /> <span style={{ textAlign: "left", flex: 1 }}>Tenant</span><ChevronRight size={14} /></NavLink>
      <NavLink className={({ isActive }) => "nav-item " + (isActive ? "active" : "")} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: "14px", width: "100%", alignSelf: "stretch", boxSizing: "border-box", paddingLeft: "16px", paddingRight: "16px", textAlign: "left" }} to="/dashboard/users" onClick={() => setMenu(false)}><Users size={17} /> <span style={{ textAlign: "left", flex: 1 }}>Platform users</span><ChevronRight size={14} /></NavLink>
      <NavLink className={({ isActive }) => "nav-item " + (isActive ? "active" : "")} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: "14px", width: "100%", alignSelf: "stretch", boxSizing: "border-box", paddingLeft: "16px", paddingRight: "16px", textAlign: "left" }} to="/dashboard/settings" onClick={() => setMenu(false)}><Settings size={17} /> <span style={{ textAlign: "left", flex: 1 }}>Settings</span></NavLink>
      <div className="sidebar-bottom" style={{ width: "100%", textAlign: "left", alignSelf: "stretch", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "10px", width: "100%", textAlign: "left" }}><span className="status-dot" /> Platform workspace</div>
        <button style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", justifyContent: "flex-start", textAlign: "left", paddingLeft: "16px", boxSizing: "border-box" }} onClick={logout}><LogOut size={15} /> <span>Sign out</span></button>
      </div>
    </aside>
    <main className="dash-main">
      <header className="dash-header">
        <button className="menu-toggle" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">{menu ? <X size={20} /> : <Menu size={20} />}</button>
        <div><b>EduSphere Platform</b><small>Manage your education ecosystem</small></div>
        <div className="header-actions"><button aria-label="Search"><Search size={17} /></button><button aria-label="Notifications"><Bell size={17} /></button><span className="avatar">TA</span></div>
      </header>
      <section className="dash-content">
        <Routes>
          <Route index element={<OverviewPage />} />
          <Route path="tenant/*" element={<Tenant />} />
          <Route path="users" element={<PlatformUsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<OverviewPage />} />
        </Routes>
      </section>
    </main>
  </div>;
}

export default function App() {
  return <Routes><Route path="/" element={<Login />} /><Route path="/dashboard/*" element={sessionStorage.getItem("platform_token") ? <Dashboard /> : <Login />} /><Route path="*" element={<Login />} /></Routes>;
}
