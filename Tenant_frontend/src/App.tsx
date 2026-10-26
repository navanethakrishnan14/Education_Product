import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, ShieldCheck, Landmark, Settings, Globe2, Network, PanelsTopLeft, HelpCircle, CheckSquare, Microscope, Award, PencilRuler, Brain, Building2 } from 'lucide-react';
import { Link, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManagementLogin from './ManagementLogin';
import ManagementDashboard from './ManagementDashboard';
import FacultyLogin from './FacultyLogin';
import ParentLogin from './ParentLogin';
import StudentLogin from './StudentLogin';

type Role = 'Management' | 'Faculty' | 'Parent' | 'Student';
const roles: { name: Role; desc: string; icon: typeof ShieldCheck; color: string }[] = [
  { name: 'Management', desc: 'Manage institutional operations, governance, finances, and high-level performance.', icon: Landmark, color: 'violet' },
  { name: 'Faculty', desc: 'Manage classes, attendance, grading schedules, and student records.', icon: GraduationCap, color: 'blue' },
  { name: 'Parent', desc: "Stay updated on your child's attendance, progress reports, and teacher updates.", icon: HeartHandshake, color: 'teal' },
  { name: 'Student', desc: 'Access your schedule, submissions, grades, and collaborative course materials.', icon: GraduationCap, color: 'purple' },
];

function Brand() {
  return <Link className="brand" to="/"><span className="brand-icon"><GraduationCap size={21}/></span><span><b>EduSphere Enterprise</b></span></Link>;
}
function SiteHeader() {
  return <header className="site-header"><Brand/><nav className="global-links"><a href="#platform-status">Platform Status</a><a href="#documentation">Documentation</a><a href="#support">Support</a></nav><div className="header-actions"><span className="system-status"><i/>System Status: Operational</span><button aria-label="Help" title="Help"><HelpCircle size={18}/></button><button aria-label="Security" title="Security"><ShieldCheck size={18}/></button><button aria-label="Language" title="Language"><Globe2 size={18}/></button></div></header>;
}
function SiteFooter() {
  return <footer className="site-footer"><span>© 2025 EduSphere Enterprise Cloud Identity Services. All rights reserved. SOC-2 Type II &amp; FERPA Certified.</span><nav><a href="#security">Security Compliance</a><a href="#privacy">Privacy Policy</a><a href="#sla">Institutional SLA</a><a href="#governance">Terms of Governance</a></nav></footer>;
}
function Landing() {
  const nav = useNavigate();
  return <div className="landing-shell"><SiteHeader/><div className="layout"><aside className="brand-side"><div className="side-copy"><div className="hero-pills"><span className="eyebrow"><i/> SMARTER EDUCATION. BETTER TOMORROW.</span><span className="release-pill">v4.2 Enterprise Release</span></div><h1>One Platform.<br/><span>Every Possibility.</span></h1><p>Bringing administrators, educators, parents, and students together in one unified, real-time learning ecosystem.</p></div><div className="network-art"><div className="feature f1"><span className="feature-icon cyan"><Microscope size={20}/></span><span><b>Virtual Lab Simulation</b><small><i className="tiny-check"/> Interactive Learning</small></span></div><div className="feature f2"><span className="feature-icon violet"><Globe2 size={20}/></span><span><b>Global Campus Network</b><small><Network size={12}/> Multi-Institution Mesh</small></span></div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><span className="orbit-dot dot-a"/><span className="orbit-dot dot-b"/><span className="orbit-dot dot-c"/><span className="orbit-dot dot-d"/><div className="core"><span><BookOpen size={29}/></span><b>KNOWLEDGE CORE</b><small><i/> Synced Campus</small></div><div className="feature f3"><span className="feature-icon lilac"><PencilRuler size={20}/></span><span><b>Collaborative Canvas</b><small><HeartHandshake size={12}/> Real-Time Studio</small></span></div><div className="feature f4"><span className="feature-icon teal"><Award size={20}/></span><span><b>Scholar Identity &amp; Honors</b><small><Award size={12}/> Academic Accreditation</small></span></div><div className="chips"><span><Network size={12}/> Unified Campus Architecture</span><span><Brain size={12}/> Intelligent Learning Experience</span><span><BookOpen size={12}/> Comprehensive Digital Curricula</span></div></div><div className="side-bottom"><p>Empowering global universities &amp; K-12 school districts worldwide.</p><div className="proof"><span><ShieldCheck size={11}/> SOC-2 Type II</span><span><ShieldCheck size={11}/> FERPA Compliant</span><span><ShieldCheck size={11}/> ISO 27001</span></div><small>© 2025 EduSphere Inc. All rights reserved.</small></div></aside><main className="portal-side"><section className="portal-content"><div className="eyebrow">YOUR EDUCATION PORTAL</div><h2>Welcome back</h2><p className="intro">Select your role to access your personalized workspace.</p><div className="role-grid">{roles.map(r=>{const Icon=r.icon;return <button className={'role-card '+r.color+'-card'} key={r.name} onClick={()=>nav('/login/'+r.name.toLowerCase())}><span className={'role-icon '+r.color}><Icon size={21}/></span><b>{r.name}{r.name==='Faculty'?' & Staff':''}</b><p>{r.desc}</p><span className="continue">Continue <ArrowRight size={16}/></span></button>})}</div><button className="directory" onClick={()=>nav('/login/management')}><CheckSquare size={16}/><span>Universal SSO Federated Directory</span><b>Fast-track <ArrowRight size={14}/></b></button></section></main></div><SiteFooter/></div>;
}
function Workspace() {
  const nav = useNavigate();
  const [user, setUser] = useState<{name?: string; email?: string; role?: string; tenantId?: string; tenantCode?: string | null; tenantType?: string; tenantName?: string; institutionName?: string} | null>(null);
  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
    const raw = localStorage.getItem('tenant_user') || sessionStorage.getItem('tenant_user');
    const clearSession = () => {
      localStorage.removeItem('tenant_token');
      localStorage.removeItem('tenant_user');
      sessionStorage.removeItem('tenant_token');
      sessionStorage.removeItem('tenant_user');
    };

    if (!token || !raw) {
      clearSession();
      nav('/', { replace: true });
      return;
    }

    async function restoreSession() {
      try {
        const cached = JSON.parse(raw!) as NonNullable<typeof user>;
        if ((cached.role || '').toLowerCase() === 'management') {
          // Management uses the Platform API's token contract. Do not send that
          // token to the separate Tenant API; a Platform /me endpoint is needed
          // to revalidate this role server-side.
          if (!cancelled) setUser(cached);
          return;
        }

        const configuredBase = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim();
        const response = await fetch(configuredBase.replace(/\/$/, '') + '/auth/me', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
        });
        const payload = await response.json().catch(() => ({})) as {
          success?: boolean;
          user?: NonNullable<typeof user>;
          message?: string;
        };
        if (!response.ok || !payload.success || !payload.user) {
          throw new Error(payload.message || 'Your session is no longer valid.');
        }
        if (!cancelled) {
          const storage = localStorage.getItem('tenant_token') ? localStorage : sessionStorage;
          storage.setItem('tenant_user', JSON.stringify(payload.user));
          setUser(payload.user);
        }
      } catch {
        clearSession();
        if (!cancelled) nav('/', { replace: true });
      }
    }

    void restoreSession();
    return () => { cancelled = true; };
  }, [nav]);
  function logout() { localStorage.removeItem('tenant_token'); localStorage.removeItem('tenant_user'); sessionStorage.removeItem('tenant_token'); sessionStorage.removeItem('tenant_user'); nav('/', { replace: true }); }
  if (!user) return <div className="workspace-loading">Checking your secure session…</div>;
  const role = user.role || 'USER';
  if (role.toLowerCase() === 'management') return <ManagementDashboard user={user} onLogout={logout}/>;
  return <main className="workspace-page"><header className="workspace-header"><Brand/><button className="logout" onClick={logout}>Sign out</button></header><section className="workspace-content"><div className="workspace-symbol"><ShieldCheck size={24}/></div><div className="eyebrow">AUTHENTICATED TENANT WORKSPACE</div><h1>Welcome{user.name ? ', ' + user.name : ''}</h1><p>Your identity has been verified for the selected school portal.</p><div className="workspace-summary"><span>Role</span><strong>{role}</strong>{user.tenantCode && <><span>Organization Code</span><code>{user.tenantCode}</code></>}<span>Organization / Tenant ID</span><code>{user.tenantId || 'Not provided'}</code><span>Account</span><strong>{user.email || 'Signed-in user'}</strong></div><p className="workspace-note">Your sign-in is complete. Feature dashboards can be connected here as the Management, Faculty, Parent, and Student modules are implemented.</p><button className="launch" onClick={logout}>Sign out securely <ArrowRight size={14}/></button></section></main>;
}
function GuardedWorkspace() {
  const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
  return token ? <Workspace/> : <Navigate to="/" replace/>;
}
export default function App() {
  return <Routes><Route path="/" element={<Landing/>}/><Route path="/login/management" element={<ManagementLogin/>}/><Route path="/login/faculty" element={<FacultyLogin/>}/><Route path="/login/parent" element={<ParentLogin/>}/><Route path="/login/student" element={<StudentLogin/>}/><Route path="/workspace/*" element={<GuardedWorkspace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
