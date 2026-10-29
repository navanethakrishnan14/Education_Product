import { ArrowRight, BookOpen, GraduationCap, HeartHandshake, ShieldCheck, Landmark, Settings, Globe2, Network, PanelsTopLeft, HelpCircle, CheckSquare, Microscope, Award, PencilRuler, Brain, Building2 } from 'lucide-react';
import { Link, Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManagementLogin from './ManagementLogin';
import SchoolFlow from './flows/school/SchoolFlow';
import CollegeFlow from './flows/college/CollegeFlow';
import InstitutionFlow from './flows/institution/InstitutionFlow';
import FacultyLogin from './FacultyLogin';
import ParentLogin from './ParentLogin';
import StudentLogin from './StudentLogin';
import SetPasswordPage from './SetPasswordPage';

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
  const cards = [
    { name: 'Management', desc: 'Manage school operations, users, and overall academic activities.', color: 'management', icon: <Building2 size={76} strokeWidth={1.7} /> },
    { name: 'Faculty', desc: 'Take attendance, manage classes, enter marks and track student performance.', color: 'faculty', icon: <GraduationCap size={76} strokeWidth={1.7} /> },
    { name: 'Parent', desc: "Track your child’s progress, attendance, exams and stay updated.", color: 'parent', icon: <HeartHandshake size={76} strokeWidth={1.7} /> },
    { name: 'Student', desc: 'Access your timetable, homework, exams and learning materials in one place.', color: 'student', icon: <BookOpen size={76} strokeWidth={1.7} /> },
  ];
  return <main className="role-reference-page">
    <div className="role-reference-glass">
      <aside className="role-reference-brand">
        <div className="edupro-brand"><span className="edupro-mark"><GraduationCap size={40}/><BookOpen size={35}/></span><span><b>EduPro</b><small>School Management System</small></span></div>
        <div className="school-pill"><Building2 size={17}/> School Management Simplified</div>
        <h1>One Platform<br/>for a <span>Brighter<br/>Tomorrow</span></h1>
        <p className="role-reference-intro">Empowering Schools, Teachers, Students and Parents to Learn, Manage and Grow Together.</p>
        <div className="role-benefits">
          <div><span className="benefit-icon"><Network size={25}/></span><span><b>Manage Academics</b><small>Classes, Exams, Timetable</small></span></div>
          <div><span className="benefit-icon"><CheckSquare size={25}/></span><span><b>Track Progress</b><small>Attendance, Marks, Reports</small></span></div>
          <div><span className="benefit-icon"><HeartHandshake size={25}/></span><span><b>Stay Connected</b><small>Parents, Students, Teachers</small></span></div>
        </div>
        <div className="role-wave"><span>Better Education<br/>Brighter Tomorrow</span><i/></div>
      </aside>
      <section className="role-reference-main">
        <button className="role-language" type="button"><Globe2 size={18}/> English <span>⌄</span></button>
        <div className="role-reference-heading"><h2>Choose Your Role</h2><p>Login to your account to continue</p></div>
        <div className="role-reference-grid">
          {cards.map(card => <button type="button" key={card.name} className={'reference-role-card '+card.color} onClick={() => nav('/login/'+card.name.toLowerCase())}>
            <span className="reference-art">{card.icon}</span><span className="reference-arrow"><ArrowRight size={23}/></span>
            <b>{card.name}</b><p>{card.desc}</p><span className="reference-login">Login as {card.name} <ArrowRight size={19}/></span>
          </button>)}
        </div>
      </section>
    </div>
  </main>;
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
  if (role.toLowerCase() === 'management') {
    const tenantType = (user.tenantType || 'school').toLowerCase();
    if (tenantType === 'college') return <CollegeFlow user={user} onLogout={logout}/>;
    if (tenantType === 'institution') return <InstitutionFlow user={user} onLogout={logout}/>;
    return <SchoolFlow user={user} onLogout={logout}/>;
  }
  return <main className="workspace-page"><header className="workspace-header"><Brand/><button className="logout" onClick={logout}>Sign out</button></header><section className="workspace-content"><div className="workspace-symbol"><ShieldCheck size={24}/></div><div className="eyebrow">AUTHENTICATED TENANT WORKSPACE</div><h1>Welcome{user.name ? ', ' + user.name : ''}</h1><p>Your identity has been verified for the selected school portal.</p><div className="workspace-summary"><span>Role</span><strong>{role}</strong>{user.tenantCode && <><span>Organization Code</span><code>{user.tenantCode}</code></>}<span>Organization / Tenant ID</span><code>{user.tenantId || 'Not provided'}</code><span>Account</span><strong>{user.email || 'Signed-in user'}</strong></div><p className="workspace-note">Your sign-in is complete. Feature dashboards can be connected here as the Management, Faculty, Parent, and Student modules are implemented.</p><button className="launch" onClick={logout}>Sign out securely <ArrowRight size={14}/></button></section></main>;
}
function GuardedWorkspace() {
  const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
  return token ? <Workspace/> : <Navigate to="/" replace/>;
}
export default function App() {
  return <Routes><Route path="/" element={<Landing/>}/><Route path="/set-password" element={<SetPasswordPage/>}/><Route path="/login/management" element={<ManagementLogin/>}/><Route path="/login/faculty" element={<FacultyLogin/>}/><Route path="/login/parent" element={<ParentLogin/>}/><Route path="/login/student" element={<StudentLogin/>}/><Route path="/workspace/*" element={<GuardedWorkspace/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;
}
