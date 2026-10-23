import { useEffect, useState } from "react";
import { Building2, Users, ChartNoAxesCombined, ArrowRight, Globe2 } from "lucide-react";
import { NavLink } from "react-router-dom";
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
export default function OverviewPage() {
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
      const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
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
      const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
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
      : <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",textAlign:"left",minWidth:780}}><thead><tr>{["Tenant","Code","Type","Official Email","Status","Actions"].map(label=><th key={label} style={{padding:"12px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}>{label}</th>)}</tr></thead><tbody>{tenants.map(tenant=><tr key={tenant.id}><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}><strong>{tenant.name}</strong><div className="muted" style={{fontSize:12}}>{tenant.workspaceUrl || ""}</div></td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}>{tenant.code || "—"}</td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)",textTransform:"capitalize"}}>{tenant.tenantType || "school"}</td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}>{tenant.officialEmail || "—"}</td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)"}}><span className="coming">{tenant.status || "pending"}</span></td><td style={{padding:"13px 10px",borderBottom:"1px solid var(--border, #e5e7eb)",whiteSpace:"nowrap"}}><button className="school-action secondary" type="button" onClick={()=>void editTenant(tenant)} style={{marginRight:8}}>Edit</button><button className="school-action secondary" type="button" onClick={()=>void deleteTenant(tenant)} style={{color:"#b91c1c"}}>Delete</button></td></tr>)}</tbody></table></div>}
    </section>
    <section className="quick-grid">
      <article className="quick-card"><span className="quick-icon teal"><Users size={20} /></span><h3>Platform users</h3><p>Review authorized platform accounts.</p><NavLink className="text-link" to="/dashboard/users">Open platform users <ArrowRight size={14} /></NavLink></article>
      <article className="quick-card"><span className="quick-icon violet"><Globe2 size={20} /></span><h3>Tenant operations</h3><p>Manage schools, colleges and institutions.</p><NavLink className="text-link" to="/dashboard/tenant">Open tenants <ArrowRight size={14} /></NavLink></article>
    </section>
    <footer className="dash-footer">EduSphere Platform Administration <span>Secure · Multi-tenant ready</span></footer>
  </>;
}
