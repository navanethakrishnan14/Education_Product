import { useState } from "react";
import { Building2, Users, ChartNoAxesCombined, Settings, LogOut, Menu, X, Search, Bell, ChevronRight, Globe2 } from "lucide-react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import Brand from "./Brand";
import Tenant from "../Tenant";
import OverviewPage from "../pages/OverviewPage";
import PlatformUsersPage from "../pages/PlatformUsersPage";
import SettingsPage from "../pages/SettingsPage";
export default function Dashboard() {
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
          <Route path="overview" element={<OverviewPage />} />
          <Route path="tenant/*" element={<Tenant />} />
          <Route path="users" element={<PlatformUsersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<OverviewPage />} />
        </Routes>
      </section>
    </main>
  </div>;
}
