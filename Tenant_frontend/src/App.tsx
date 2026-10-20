import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, ShieldCheck, Landmark, Settings, Globe2, Network, PanelsTopLeft } from 'lucide-react';
import { Link, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManagementLogin from './ManagementLogin';
import FacultyLogin from './FacultyLogin';
import ParentLogin from './ParentLogin';
import StudentLogin from './StudentLogin';

type Role = 'Management' | 'Faculty' | 'Parent' | 'Student';
const roles: { name: Role; desc: string; icon: typeof ShieldCheck; color: string }[] = [
  { name: 'Management', desc: 'Manage administration, operations, people, and school-wide performance.', icon: Landmark, color: 'violet' },
  { name: 'Faculty', desc: 'Manage classes, attendance, grading, and student progress.', icon: BookOpen, color: 'blue' },
  { name: 'Parent', desc: 'Stay updated on your child’s attendance, progress, and school news.', icon: HeartHandshake, color: 'teal' },
  { name: 'Student', desc: 'Access your schedule, assignments, grades, and course materials.', icon: GraduationCap, color: 'purple' },
];

function Brand() {
  return <Link className="brand" to="/"><span className="brand-icon"><GraduationCap size={19}/></span><span><b>EduSphere Enterprise</b><small>UNIFIED ACADEMIC OS</small></span></Link>;
}
function Landing() {
  const nav = useNavigate();
  return <div className="layout"><aside className="brand-side"><div className="side-top"><Brand/><span className="status"><i/> Tenant portal</span></div><div className="side-copy"><div className="eyebrow">SMARTER EDUCATION. BETTER TOMORROW.</div><h1>One Platform.<br/><span>Every Possibility.</span></h1><p>One clear sign-in path for school management, faculty, parents, and students—with role-specific access to the right workspace.</p></div><div className="network-art"><div className="feature f1"><Network size={16}/><span><b>Connected school</b><small>One secure tenant</small></span></div><div className="feature f2"><Globe2 size={16}/><span><b>Unified portal</b><small>Role-based access</small></span></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="core"><span><PanelsTopLeft size={25}/></span><b>KNOWLEDGE CORE</b></div><div className="feature f3"><BookOpen size={16}/><span><b>Teaching tools</b><small>Learning resources</small></span></div><div className="feature f4"><ShieldCheck size={16}/><span><b>Secure access</b><small>Tenant-scoped accounts</small></span></div><div className="chips"><span>Management</span><span>Faculty</span><span>Parent</span><span>Student</span></div></div><div className="side-bottom"><div className="proof"><span>Role-based permissions</span><span>Tenant-scoped sign-in</span></div><small>© 2026 EduSphere. All rights reserved.</small></div></aside><main className="portal-side"><nav className="top-nav"><span>Tenant Portal</span><span>Help</span><i/><span className="status light">Secure sign-in</span><Settings size={14}/></nav><section className="portal-content"><div className="eyebrow">YOUR SCHOOL PORTAL</div><h2>Welcome to EduSphere</h2><p className="intro">Choose your role to continue to the correct login page.</p><div className="role-grid">{roles.map(r=>{const Icon=r.icon;return <button className="role-card" key={r.name} onClick={()=>nav('/login/'+r.name.toLowerCase())}><span className={'role-icon '+r.color}><Icon size={20}/></span><b>{r.name}{r.name==='Faculty'?' & Staff':''}</b><p>{r.desc}</p><span className="continue">Open {r.name} login <ArrowRight size={13}/></span></button>})}</div><div className="portal-foot">Secure sign-in is provided by your school administrator.<br/>Choose the role assigned to your account.</div></section></main></div>;
}
function Workspace() {
  const nav = useNavigate();
  const [user, setUser] = useState<{name?: string; email?: string; role?: string; tenantId?: string} | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
    const raw = localStorage.getItem('tenant_user') || sessionStorage.getItem('tenant_user');
    if (!token || !raw) { nav('/', { replace: true }); return; }
    try { setUser(JSON.parse(raw)); } catch { localStorage.removeItem('tenant_token'); localStorage.removeItem('tenant_user'); sessionStorage.removeItem('tenant_token'); sessionStorage.removeItem('tenant_user'); nav('/', { replace: true }); }
  }, [nav]);
  function logout() { localStorage.removeItem('tenant_token'); localStorage.removeItem('tenant_user'); sessionStorage.removeItem('tenant_token'); sessionStorage.removeItem('tenant_user'); nav('/', { replace: true }); }
  if (!user) return <div className="workspace-loading">Checking your secure session…</div>;
  const role = user.role || 'USER';
  return <main className="workspace-page"><header className="workspace-header"><Brand/><button className="logout" onClick={logout}>Sign out</button></header><section className="workspace-content"><div className="workspace-symbol"><ShieldCheck size={24}/></div><div className="eyebrow">AUTHENTICATED TENANT WORKSPACE</div><h1>Welcome{user.name ? ', ' + user.name : ''}</h1><p>Your identity has been verified for the selected school portal.</p><div className="workspace-summary"><span>Role</span><strong>{role}</strong><span>School / Tenant ID</span><code>{user.tenantId || 'Not provided'}</code><span>Account</span><strong>{user.email || 'Signed-in user'}</strong></div><p className="workspace-note">Your sign-in is complete. Feature dashboards can be connected here as the Management, Faculty, Parent, and Student modules are implemented.</p><button className="launch" onClick={logout}>Sign out securely <ArrowRight size={14}/></button></section></main>;
}
function GuardedWorkspace() {
  const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
  return token ? <Workspace/> : <Navigate to="/" replace/>;
}
export default function App() {
  return <Routes><Route path="/" element={<Landing/>}/><Route path="/login/management" element={<ManagementLogin/>}/><Route path="/login/faculty" element={<FacultyLogin/>}/><Route path="/login/parent" element={<ParentLogin/>}/><Route path="/login/student" element={<StudentLogin/>}/><Route path="/workspace" element={<GuardedWorkspace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
