import { useEffect, useState } from "react";
import {
  ArrowRight, GraduationCap, LockKeyhole, Mail, ShieldCheck, Building2,
  Users, ChartNoAxesCombined, Settings, LogOut, Menu, X, Search, Bell,
  ChevronRight, Globe2
} from "lucide-react";
import { Link, NavLink, Route, Routes, useNavigate, Outlet } from "react-router-dom";
import type { FormEvent } from "react";
import Tenant from "./Tenant";
import SetPassword from "./SetPassword";

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

type TenantSummary = {
  id: string;
  name: string;
  code?: string | null;
  tenantType?: string | null;
  officialEmail?: string | null;
  workspaceUrl?: string | null;
  status?: string | null;
  planName?: string | null;
  createdAt?: string;
};

function OverviewPage() {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [tenantCount, setTenantCount] = useState(0);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [tenantError, setTenantError] = useState("");
  async function editTenant(tenant: TenantSummary) {
    const name = window.prompt("Tenant name:", tenant.name);
    if (name === null) return;
    const officialEmail = window.prompt("Official email:", tenant.officialEmail || "");
    if (officialEmail === null) return;
    const workspaceUrl = window.prompt("Workspace URL:", tenant.workspaceUrl || "");
    if (workspaceUrl === null) return;
    const status = window.prompt("Status (active, inactive, suspended):", tenant.status || "inactive");
    if (status === null) return;
    const planName = window.prompt("Plan:", tenant.planName || "");
    if (planName === null) return;
    try {
      const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\\/$/, "");
      const token = sessionStorage.getItem("platform_token");
      const response = await fetch(base + "/schools/" + encodeURIComponent(tenant.id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
        body: JSON.stringify({ name, officialEmail, workspaceUrl, status, planName })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update tenant.");
      setTenants(old => old.map(item => item.id === tenant.id ? result.data : item));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to update tenant.");
    }
  }

  async function deleteTenant(tenant: TenantSummary) {
    if (!window.confirm('Delete "' + tenant.name + '"? This permanently removes the tenant record.')) return;
    try {
      const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\\/$/, "");
      const token = sessionStorage.getItem("platform_token");
      const response = await fetch(base + "/schools/" + encodeURIComponent(tenant.id), {
        method: "DELETE",
        headers: token ? { Authorization: "Bearer " + token } : {}
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete tenant.");
      setTenants(old => old.filter(item => item.id !== tenant.id));
      setTenantCount(count => Math.max(0, count - 1));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to delete tenant.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadTenants() {
      try {
        const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
        const token = sessionStorage.getItem("platform_token");
        const response = await fetch(base + "/schools?limit=5&page=1", {
          headers: token ? { Authorization: "Bearer " + token } : {}
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load tenants.");
        if (!cancelled) {
          const items: TenantSummary[] = Array.isArray(result.data) ? result.data : [];
          setTenants(items);
          setTenantCount(Number(result.pagination?.total ?? items.length));
        }
      } catch (error) {
        if (!cancelled) setTenantError(error instanceof Error ? error.message : "Unable to load tenants.");
      } finally {
        if (!cancelled) setLoadingTenants(false);
      }
    }
    void loadTenants();
    return () => { cancelled = true; };
  }, []);

  return <>
    <div className="welcome-row"><div><p className="eyebrow">PLATFORM CONTROL CENTER</p><h1>Dashboard</h1><p className="muted">Your EduSphere tenant overview and platform activity.</p></div><span className="platform-status"><i /> Platform admin area</span></div>
    <div className="metric-grid">
      <article className="metric"><span className="metric-icon violet"><Building2 size={20} /></span><p>Registered Tenants</p><h2>{loadingTenants ? "…" : tenantCount}</h2><small>Schools, colleges and institutions</small></article>
      <article className="metric"><span className="metric-icon teal"><Users size={20} /></span><p>Tenant Types</p><h2>{loadingTenants ? "…" : new Set(tenants.map(t => t.tenantType).filter(Boolean)).size || (tenantCount ? "3" : "0")}</h2><small>School, college and institution workspaces</small></article>
      <article className="metric"><span className="metric-icon blue"><ChartNoAxesCombined size={20} /></span><p>Active Tenants</p><h2>{loadingTenants ? "…" : tenants.filter(t => t.status === "active").length}{!loadingTenants && tenantCount > tenants.length ? "+" : ""}</h2><small>Active among the latest tenants shown</small></article>
    </div>
    <section className="section-card" style={{marginTop:24}}>
      <div className="welcome-row"><div><p className="eyebrow">TENANT MANAGEMENT</p><h2>Recently created tenants</h2><p className="muted">Schools, colleges and institutions registered on your platform.</p></div><NavLink className="text-link" to="/dashboard/tenant">Manage tenants <ArrowRight size={14}/></NavLink></div>
      {tenantError ? <div className="empty-state"><h3>Unable to load tenants</h3><p>{tenantError}</p><button className="primary" type="button" onClick={() => window.location.reload()}>Reload dashboard</button></div>
      : loadingTenants ? <div className="empty-state"><p>Loading tenants…</p></div>
      : tenants.length === 0 ? <div className="empty-state"><span><Building2 size={24}/></span><h3>No tenants yet</h3><p>Create your first school, college or institution to see it here.</p><NavLink className="text-link" to="/dashboard/tenant">Create a tenant <ArrowRight size={14}/></NavLink></div>
      : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left",minWidth:780}}><thead><tr>{["Tenant","Code","Type","Official Email","Status","Actions"].map(label=><th key={label} style={{padding:"12px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}>{label}</th>)}</tr></thead><tbody>{tenants.map(tenant=><tr key={tenant.id}><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}><strong>{tenant.name}</strong><div className="muted" style={{fontSize:12}}>{tenant.workspaceUrl || ""}</div><div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}><button className="school-action secondary" type="button" onClick={()=>void editTenant(tenant)}>Edit</button><button className="school-action secondary" type="button" onClick={()=>void deleteTenant(tenant)} style={{color:"#b91c1c",borderColor:"#fecaca"}}>Delete</button></div></td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}>{tenant.code || "—"}</td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)",textTransform:"capitalize"}}>{tenant.tenantType || "school"}</td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}>{tenant.officialEmail || "—"}</td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}><span className="coming">{tenant.status || "pending"}</span></td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)",whiteSpace:"nowrap"}}><button className="school-action secondary" type="button" onClick={()=>void editTenant(tenant)} style={{marginRight:8}}>Edit</button><button className="school-action secondary" type="button" onClick={()=>void deleteTenant(tenant)} style={{color:"#b91c1c"}}>Delete</button></td></tr>)}</tbody></table></div>}
    </section>
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
      <NavLink end className={({ isActive }) => "nav-item " + (isActive ? "active" : "")} style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: "14px", width: "100%", alignSelf: "stretch", boxSizing: "border-box", paddingLeft: "16px", paddingRight: "16px", textAlign: "left" }} to="/dashboard" onClick={() => setMenu(false)}><ChartNoAxesCombined size={17} /> <span style={{ textAlign: "left", flex: 1 }}>Dashboard</span></NavLink>
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
  return <Routes><Route path="/" element={<Login />} /><Route path="/set-password" element={<SetPassword />} /><Route path="/dashboard/*" element={sessionStorage.getItem("platform_token") ? <Dashboard /> : <Login />} /><Route path="*" element={<Login />} /></Routes>;
}
