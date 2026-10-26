import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import {
  LayoutDashboard, Building2, GraduationCap, Users, UserRound, CalendarDays,
  BookOpen, ClipboardCheck, Wallet, Megaphone, BarChart3, Settings, Bell,
  Search, Menu, X, LogOut, ChevronRight, Plus, ShieldCheck,
  FileText, MoreHorizontal, ArrowUpRight, CheckCircle2, TrendingUp, School,
  CreditCard, Activity, CalendarCheck, Sparkles, Globe2, UploadCloud
} from 'lucide-react';
import ModuleWorkspace from './ModuleWorkspace';

type TenantUser = { name?: string; email?: string; role?: string; tenantId?: string; tenantCode?: string | null; tenantType?: string; tenantName?: string; institutionName?: string };
const commonMenu = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Organization Profile', icon: Building2 },
  { label: 'Management Users', icon: ShieldCheck },
  { label: 'Communication', icon: Megaphone },
  { label: 'Reports & Analytics', icon: BarChart3 },
  { label: 'Settings', icon: Settings }
];
const typeMenus = {
  school: [
    ...commonMenu,
    { label: 'Academic Setup', icon: BookOpen },
    { label: 'Classes & Sections', icon: School },
    { label: 'Faculty & Staff', icon: Users },
    { label: 'Students', icon: GraduationCap },
    { label: 'Parents & Guardians', icon: UserRound },
    { label: 'Attendance', icon: ClipboardCheck },
    { label: 'Timetable', icon: CalendarDays },
    { label: 'Examinations & Results', icon: BookOpen },
    { label: 'School Fees', icon: Wallet },
    { label: 'Transport', icon: Building2 }
  ],
  college: [
    ...commonMenu,
    { label: 'Academic Structure', icon: BookOpen },
    { label: 'Departments', icon: Building2 },
    { label: 'Courses & Programs', icon: GraduationCap },
    { label: 'Faculty', icon: Users },
    { label: 'Students & Admissions', icon: UserRound },
    { label: 'Semester & Credits', icon: CalendarDays },
    { label: 'Examinations & Results', icon: ClipboardCheck },
    { label: 'Fees & Scholarships', icon: Wallet },
    { label: 'Research & Projects', icon: FileText },
    { label: 'Placement & Alumni', icon: TrendingUp }
  ],
  institution: [
    ...commonMenu,
    { label: 'Organization Units', icon: Building2 },
    { label: 'Programs & Services', icon: BookOpen },
    { label: 'Members & Staff', icon: Users },
    { label: 'Learners / Beneficiaries', icon: GraduationCap },
    { label: 'Schedules & Activities', icon: CalendarDays },
    { label: 'Participation & Records', icon: ClipboardCheck },
    { label: 'Finance & Funding', icon: Wallet },
    { label: 'Compliance & Documents', icon: FileText }
  ]
};
const taskSets = {
  school: [
    { title: 'Complete school profile', detail: 'Add school address, contact details and branding', page: 'Organization Profile' },
    { title: 'Configure academic year', detail: 'Set school year, terms, classes and sections', page: 'Academic Setup' },
    { title: 'Add teachers and staff', detail: 'Invite school staff and assign responsibilities', page: 'Faculty & Staff' },
    { title: 'Set up student records', detail: 'Prepare enrollment and class assignments', page: 'Students' }
  ],
  college: [
    { title: 'Complete college profile', detail: 'Add campus, affiliation and official contact details', page: 'Organization Profile' },
    { title: 'Configure departments', detail: 'Create departments, programs and academic structure', page: 'Departments' },
    { title: 'Add faculty members', detail: 'Set up faculty accounts and department assignments', page: 'Faculty' },
    { title: 'Configure semesters', detail: 'Prepare semester, credit and examination settings', page: 'Semester & Credits' }
  ],
  institution: [
    { title: 'Complete organization profile', detail: 'Add organization details, contacts and branding', page: 'Organization Profile' },
    { title: 'Configure organization units', detail: 'Set up teams, units and service areas', page: 'Organization Units' },
    { title: 'Add staff and members', detail: 'Invite staff and assign access permissions', page: 'Members & Staff' },
    { title: 'Set up programs and services', detail: 'Prepare programs, activities and records', page: 'Programs & Services' }
  ]
};
const subjectSets = {
  school: [
    { name: 'Academic setup', detail: 'School year, terms, classes and sections', icon: BookOpen, color: 'violet', page: 'Academic Setup' },
    { name: 'Faculty & staff', detail: 'Teacher accounts and assignments', icon: Users, color: 'blue', page: 'Faculty & Staff' },
    { name: 'Student records', detail: 'Enrollment and class information', icon: GraduationCap, color: 'teal', page: 'Students' },
    { name: 'School fees', detail: 'Fee structure and collection tracking', icon: Wallet, color: 'amber', page: 'School Fees' }
  ],
  college: [
    { name: 'Academic structure', detail: 'Programs, departments and semesters', icon: BookOpen, color: 'violet', page: 'Academic Structure' },
    { name: 'Faculty directory', detail: 'Faculty accounts and departments', icon: Users, color: 'blue', page: 'Faculty' },
    { name: 'Admissions & students', detail: 'Student intake and enrollment records', icon: GraduationCap, color: 'teal', page: 'Students & Admissions' },
    { name: 'Fees & scholarships', detail: 'Tuition, fees and scholarship tracking', icon: Wallet, color: 'amber', page: 'Fees & Scholarships' }
  ],
  institution: [
    { name: 'Organization units', detail: 'Teams, divisions and service units', icon: Building2, color: 'violet', page: 'Organization Units' },
    { name: 'Members & staff', detail: 'People, roles and assignments', icon: Users, color: 'blue', page: 'Members & Staff' },
    { name: 'Programs & services', detail: 'Programs, services and activities', icon: BookOpen, color: 'teal', page: 'Programs & Services' },
    { name: 'Finance & funding', detail: 'Funding sources and financial records', icon: Wallet, color: 'amber', page: 'Finance & Funding' }
  ]
};
export default function ManagementDashboard({ user, onLogout, tenantTypeOverride }: { user: TenantUser; onLogout: () => void; tenantTypeOverride?: 'school' | 'college' | 'institution' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const routePage = decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1) || 'dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const tenantType = (tenantTypeOverride || user.tenantType || 'school').toLowerCase() as keyof typeof typeMenus;
  const menu = typeMenus[tenantType] || typeMenus.school;
  const organizationLabel = tenantType === 'college' ? 'College' : tenantType === 'institution' ? 'Institution' : 'School';
  const [profileDraft, setProfileDraft] = useState(() => {
    const fallback = { name: user.institutionName || user.tenantName || '', code: user.tenantCode || '', type: user.tenantType || organizationLabel.toLowerCase(), email: user.email || '' };
    try {
      const saved = localStorage.getItem('edusphere_profile:' + (user.tenantId || 'tenant'));
      return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
    } catch {
      return fallback;
    }
  });
  const institution = profileDraft.name.trim() || user.institutionName || user.tenantName || 'Your ' + organizationLabel.toLowerCase();
  const [profileNotice, setProfileNotice] = useState('');
  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      localStorage.setItem('edusphere_profile:' + (user.tenantId || 'tenant'), JSON.stringify(profileDraft));
      setProfileNotice('Profile details saved in this browser.');
    } catch {
      setProfileNotice('Unable to save profile details in this browser.');
    }
  }
  const tasks = taskSets[tenantType] || taskSets.school;
  const subjects = subjectSets[tenantType] || subjectSets.school;
  const dashboardMetrics = tenantType === 'college'
    ? [
        { label: 'Enrolled students', value: '—', hint: 'Student enrollment overview', icon: GraduationCap, tone: 'violet' },
        { label: 'Faculty members', value: '—', hint: 'Faculty and department directory', icon: Users, tone: 'blue' },
        { label: 'Departments', value: '—', hint: 'Academic departments and programs', icon: Building2, tone: 'teal' },
        { label: 'Setup progress', value: '—', hint: 'Onboarding progress is not connected to the backend yet', icon: Activity, tone: 'amber' }
      ]
    : tenantType === 'institution'
    ? [
        { label: 'Members & learners', value: '—', hint: 'People registered with your organization', icon: Users, tone: 'violet' },
        { label: 'Staff members', value: '—', hint: 'Staff and team directory', icon: UserRound, tone: 'blue' },
        { label: 'Programs & services', value: '—', hint: 'Organization service overview', icon: BookOpen, tone: 'teal' },
        { label: 'Setup progress', value: '—', hint: 'Onboarding progress is not connected to the backend yet', icon: Activity, tone: 'amber' }
      ]
    : [
        { label: 'Students', value: '—', hint: 'School enrollment overview', icon: GraduationCap, tone: 'violet' },
        { label: 'Faculty & staff', value: '—', hint: 'Teachers and staff directory', icon: Users, tone: 'blue' },
        { label: 'Attendance today', value: '—', hint: 'Daily school attendance', icon: CalendarCheck, tone: 'teal' },
        { label: 'Setup progress', value: '—', hint: 'Onboarding progress is not connected to the backend yet', icon: Activity, tone: 'amber' }
      ];
  const filtered = useMemo(() => menu.filter(item => item.label.toLowerCase().includes(search.toLowerCase())), [menu, search]);
  const slugify = (page: string) => page.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pageFromRoute = menu.find(item => slugify(item.label) === routePage)?.label || (routePage === 'management' || routePage === 'workspace' ? 'Dashboard' : 'Dashboard');
  const currentPage = location.pathname === '/workspace' || location.pathname === '/workspace/' ? 'Dashboard' : pageFromRoute;
  const select = (page: string) => {
    setMobileOpen(false);
    navigate(page === 'Dashboard' ? '/workspace/management/dashboard' : '/workspace/management/' + slugify(page));
  };
  const firstName = user.name?.trim().split(/\s+/)[0];
  const activeIcon = menu.find(item => item.label === currentPage)?.icon || LayoutDashboard;
  const ActiveIcon = activeIcon;
  const initials = (user.name || 'Management').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className="min-h-screen bg-[#e8e2ff] text-[#17143a]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
    {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-[#170c36]/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-[275px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#321653] via-[#3b1b5d] to-[#4b2165] text-white shadow-xl shadow-violet-950/20 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-4 pt-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white shadow-lg shadow-black/10"><GraduationCap size={15} /></div>
        <div className="min-w-0"><p className="truncate text-[16px] font-extrabold tracking-tight">{tenantType === 'college' ? 'EduManage College' : tenantType === 'institution' ? 'EduManage Institution' : 'EduManage School'}</p><p className="mt-1 text-[10px] font-bold tracking-wide text-violet-200">{organizationLabel.toUpperCase()} MANAGEMENT SUITE</p></div>
        <button className="ml-auto rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19}/></button>
      </div>
      <div className="px-5 pb-3 pt-5"><p className="px-3 text-[11px] font-bold uppercase tracking-[.14em] text-violet-200/70">{organizationLabel} workspace</p></div>
      <nav aria-label="Management navigation" className="tenant-sidebar-nav flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.map(({ label, icon: Icon }) => <button key={label} onClick={() => select(label)} aria-current={currentPage === label ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[14px] font-semibold transition-all ${currentPage === label ? 'bg-white text-[#321653] shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-md ${currentPage === label ? 'bg-violet-100 text-[#321653]' : 'text-white/65 group-hover:bg-white/10 group-hover:text-white'}`}><Icon size={12}/></span><span className="flex-1">{label}</span>{currentPage === label && <ChevronRight size={15}/>}
        </button>)}
        {filtered.length === 0 && <p className="px-3 py-5 text-sm text-slate-400">No matching modules</p>}
      </nav>
      <div className="border-t border-white/10 p-3"><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14px] font-semibold text-white/90 transition hover:bg-rose-500/20 hover:text-white"><LogOut size={20}/> Sign out securely</button></div>
    </aside>
    <div className="min-w-0 lg:pl-[275px]">
      <header className="sticky top-0 z-20 flex min-h-[74px] items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-[#321653] via-[#3e1d60] to-[#4a2369] px-3 text-white shadow-lg shadow-violet-950/10 sm:px-3 xl:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-xl border border-violet-100 bg-white p-2.5 text-violet-900 shadow-sm lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
          <div className="hidden items-center gap-2 text-xs text-white/60 sm:flex"><School size={15}/><span>Workspace</span><ChevronRight size={13}/><span className="font-semibold text-white">{currentPage}</span></div>
          <div className="sm:hidden"><p className="truncate text-sm font-bold">{currentPage}</p><p className="truncate text-[11px] text-slate-500">{institution}</p></div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <label className="hidden max-w-[285px] flex-1 items-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2.5 text-slate-400 md:flex"><Search size={17}/><input aria-label="Search management modules" value={search} onChange={e => setSearch(e.target.value)} placeholder={tenantType === 'college' ? 'Search students, faculty, departments...' : tenantType === 'institution' ? 'Search members, programs, services...' : 'Search students, teachers, classes...'} className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"/></label>
          <button onClick={() => select('Communication')} aria-label="Notifications" title="Open communication" className="relative rounded-lg p-1.5 text-white transition hover:bg-white/10"><Bell size={19}/></button>
          <div className="h-6 w-px bg-white/20"/>
          <div className="flex items-center gap-2.5 pl-1"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-200 to-fuchsia-100 text-[9px] font-extrabold text-violet-900 shadow">{initials}</span><div className="hidden max-w-36 sm:block"><p className="truncate text-[12px] font-bold text-white">{user.name || 'Management user'}</p><p className="truncate text-[10px] text-violet-200">{user.role || 'Head Administrator'}</p></div></div>
        </div>
      </header>
      <main className="relative mx-auto min-h-[calc(100vh-74px)] max-w-[1800px] space-y-6 overflow-hidden rounded-tl-[34px] rounded-tr-none border border-white/80 bg-[#f7f6fb] p-6 shadow-[-10px_-4px_40px_rgba(255,255,255,.18)] sm:p-8 xl:p-10">
        {currentPage === 'Dashboard' ? <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-100/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-800"><Sparkles size={13}/> {organizationLabel} overview</div><h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[#17132f] sm:text-[40px]">Welcome back{firstName ? `, ${firstName}` : ''}</h1><p className="mt-1 text-[15px] text-slate-500">Here's what's happening at <span className="font-semibold text-slate-700">{institution}</span>.</p></div>
            <button onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : tenantType === 'institution' ? 'Members & Staff' : 'Students')} className="inline-flex items-center gap-2 rounded-xl bg-[#45116f] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-950/20 transition hover:bg-[#551887]"><Plus size={18}/> {tenantType === 'college' ? 'Add new student' : tenantType === 'institution' ? 'Add new member' : 'Add new student'}</button>
          </div>
          <section className="grid gap-5 sm:grid-cols-2">
            {dashboardMetrics.map(item => <div key={item.label} className="min-h-[160px] rounded-2xl border border-[#edf0f6] bg-white p-6 shadow-[0_2px_5px_rgba(28,25,55,.04)] transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-3 text-[34px] font-extrabold leading-none tracking-tight text-[#17132f]">{item.value}</p></div><span className={`rounded-2xl p-3.5 ${item.tone === 'violet' ? 'bg-purple-100 text-violet-600' : item.tone === 'blue' ? 'bg-blue-100 text-blue-600' : item.tone === 'teal' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}><item.icon size={22}/></span></div>
              <p className="mt-7 flex items-center gap-2 text-[13px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>{item.hint}</p>
            </div>)}
          </section>
          <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.9fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#edf0f6] bg-white p-5 shadow-[0_2px_5px_rgba(28,25,55,.04)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-purple-100 p-3 text-violet-600"><UserRound size={21}/></span><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-[16px] font-extrabold tracking-tight text-slate-800">{tenantType === 'college' ? 'Recent Admissions' : tenantType === 'institution' ? 'Recent Registrations' : 'Recent Admissions'}</h2><span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[11px] font-semibold text-violet-700">12 new</span></div><p className="mt-1 text-[12px] text-slate-400">Latest student admissions across all classes</p></div></div><div className="flex items-center gap-3"><button onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : tenantType === 'institution' ? 'Members & Staff' : 'Students')} className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-purple-100"><Search size={14}/> Filter</button><button onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : tenantType === 'institution' ? 'Members & Staff' : 'Students')} className="text-xs font-semibold text-violet-800 hover:underline">View all</button></div></div>
              <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[590px] table-fixed border-collapse text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-400"><th className="w-[20%] py-4 pr-2">Student</th><th className="w-[15%] px-2 py-4">Class</th><th className="w-[22%] px-2 py-4">Admission No.</th><th className="w-[18%] px-2 py-4">Admission date</th><th className="w-[17%] px-2 py-4">Status</th><th className="w-[8%] py-4 text-right"> </th></tr></thead><tbody>
              {[{initials:'AR',name:'Aarav Sharma',className:'Class 10',section:'Section A',id:'ADM-2024-001',date:'Today, 10:45 AM',status:'Active',tone:'blue'},{initials:'SM',name:'Sanya Mishra',className:'Class 8',section:'Section B',id:'ADM-2024-002',date:'Today, 09:30 AM',status:'Active',tone:'purple'},{initials:'RK',name:'Rohan Kumar',className:'Class 12',section:'Section A',id:'ADM-2024-003',date:'Yesterday, 04:15 PM',status:'Pending',tone:'pink'},{initials:'NP',name:'Nikita Patel',className:'Class 6',section:'Section C',id:'ADM-2024-004',date:'Yesterday, 11:20 AM',status:'Active',tone:'green'},{initials:'VT',name:'Vihaan Thakur',className:'Class 9',section:'Section B',id:'ADM-2024-005',date:'2 days ago, 02:10 PM',status:'Active',tone:'indigo'}].map(student => <tr key={student.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-2"><div className="flex items-center gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${student.tone==='blue'?'bg-blue-100 text-blue-600':student.tone==='purple'?'bg-purple-100 text-violet-600':student.tone==='pink'?'bg-pink-100 text-pink-600':student.tone==='green'?'bg-emerald-100 text-emerald-600':'bg-indigo-100 text-indigo-600'}`}>{student.initials}</span><span className="text-[12px] font-semibold leading-4 text-slate-800">{student.name}</span></div></td><td className="px-2 py-3"><span className="block text-[12px] font-medium text-slate-700">{student.className}</span><span className="mt-0.5 block text-[11px] text-slate-400">{student.section}</span></td><td className="px-2 py-3 text-[11px] text-slate-500">{student.id}</td><td className="px-2 py-3 text-[11px] leading-4 text-slate-500">{student.date}</td><td className="px-2 py-3"><span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold ${student.status==='Active'?'bg-emerald-50 text-emerald-600':'bg-orange-50 text-orange-600'}`}><span className={`h-1.5 w-1.5 rounded-full ${student.status==='Active'?'bg-emerald-500':'bg-orange-500'}`}/>{student.status}</span></td><td className="py-3 text-right"><button aria-label={`View ${student.name}`} onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : 'Students')} className="rounded-lg p-1 text-slate-400 hover:bg-violet-50 hover:text-violet-700"><ChevronRight size={18}/></button></td></tr>)}
              </tbody></table></div>
            </section>
            <section className="rounded-2xl border border-[#edf0f6] bg-white p-5 shadow-[0_2px_5px_rgba(28,25,55,.04)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Users size={21}/></span><div><h2 className="text-[16px] font-extrabold tracking-tight text-slate-800">Recent Activity</h2><p className="mt-1 text-[12px] text-slate-400">Live updates from your school</p></div></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-400"/></div>
              <div className="divide-y divide-slate-100">{[{initials:'AR',name:'Aarav Sharma',detail:'New student admission completed.',time:'5m ago',tag:'Admission',tone:'blue'},{initials:'PS',name:'Priya Singh',detail:'Marked attendance for Class 10.',time:'1h ago',tag:'Attendance',tone:'amber'},{initials:'RT',name:'Rahul Tiwari',detail:'Uploaded Class 12 syllabus.',time:'2h ago',tag:'Academics',tone:'pink'},{initials:'SK',name:'Sneha Kapoor',detail:'Generated fee collection report.',time:'3h ago',tag:'Finance',tone:'green'},{initials:'AM',name:'Amit Mehta',detail:'Added new faculty member.',time:'5h ago',tag:'Faculty',tone:'purple'}].map(item => <div key={item.initials} className="flex gap-3 py-4 first:pt-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold ${item.tone==='blue'?'bg-blue-100 text-blue-600':item.tone==='amber'?'bg-amber-100 text-amber-700':item.tone==='pink'?'bg-pink-100 text-pink-600':item.tone==='green'?'bg-emerald-100 text-emerald-600':'bg-violet-100 text-violet-600'}`}>{item.initials}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[12px] font-bold text-slate-800">{item.name}</p><span className="shrink-0 text-[10px] text-slate-400">{item.time}</span></div><p className="mt-1 text-[12px] leading-4 text-slate-500">{item.detail}</p><span className={`mt-1.5 inline-flex rounded px-2 py-1 text-[10px] font-semibold ${item.tone==='amber'?'bg-blue-50 text-blue-600':item.tone==='green'?'bg-emerald-50 text-emerald-600':item.tone==='pink'?'bg-blue-50 text-blue-600':'bg-purple-50 text-violet-600'}`}>{item.tag}</span></div></div>)}</div>
            </section>
          </div>
        </> : <><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white p-3 text-violet-700 shadow-sm"><ActiveIcon size={23}/></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-violet-700">{organizationLabel} workspace</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{active}</h1><p className="mt-1 text-sm text-slate-500">Manage {active.toLowerCase()} for {institution}.</p></div></div><button onClick={() => select('Dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-2.5 text-xs font-bold text-violet-800 shadow-sm hover:bg-violet-50"><LayoutDashboard size={15}/> Back to overview</button></div>
          {(currentPage === 'Institution Profile' || currentPage === 'Organization Profile') ? <div className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><p className="text-[11px] font-semibold text-slate-400">Dashboard / Settings / Organization Profile</p><h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Organization Profile</h1><p className="mt-1 text-sm text-slate-500">Manage your institution’s identity, contact information, and organizational details.</p></div>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setProfileNotice('Preview mode: review your organization profile before saving.')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"><Search size={14}/> View Public Directory</button><button type="submit" form="organization-profile-form" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-teal-800"><CheckCircle2 size={14}/> Edit Profile</button></div>
            </div>
            {profileNotice && <p role="status" className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">{profileNotice}</p>}
            <form id="organization-profile-form" onSubmit={saveProfile} className="space-y-5">
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center"><div className="flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-teal-700"><Building2 size={27}/></div><div className="min-w-0"><h2 className="text-lg font-extrabold text-slate-900">{institution}</h2><p className="mt-1 text-xs text-slate-500">{organizationLabel} · {profileDraft.code || user.tenantCode || 'ORG-2026-0001'}</p><p className="mt-1 text-[11px] text-slate-400">Accredited workspace · Organization profile and details</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800">● {organizationLabel} identity</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">Profile settings</span></div></div></div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Campuses</p><p className="mt-1 text-lg font-extrabold text-slate-900">4 Units</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Total enrolled</p><p className="mt-1 text-lg font-extrabold text-slate-900">3,420</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Faculty / staff</p><p className="mt-1 text-lg font-extrabold text-slate-900">184 Staff</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] text-slate-500">Established</p><p className="mt-1 text-lg font-extrabold text-slate-900">Est. 1994</p></div></div></div></section>
              <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(270px,.85fr)]">
                <div className="space-y-5">
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-start justify-between gap-3"><div className="flex items-start gap-2"><Building2 size={16} className="mt-0.5 text-teal-700"/><div><h2 className="text-sm font-extrabold text-slate-900">Basic Organization Information</h2><p className="mt-1 text-[11px] text-slate-500">Official details and organization-level contact information.</p></div></div><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Section 01</span></div><div className="grid gap-3 sm:grid-cols-2">
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Organization Legal Name</span><input value={profileDraft.name} onChange={event=>setProfileDraft(v=>({...v,name:event.target.value}))} required className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-50"/></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Trade / Display Name</span><input defaultValue={institution} className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500"/></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Institution Classification</span><select value={profileDraft.type} onChange={event=>setProfileDraft(v=>({...v,type:event.target.value}))} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"><option value="school">School / K-12</option><option value="college">College / University</option><option value="institution">Education institution</option></select></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">System Identification Code</span><input value={profileDraft.code} onChange={event=>setProfileDraft(v=>({...v,code:event.target.value}))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500"/></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Official Email Address</span><input type="email" value={profileDraft.email} onChange={event=>setProfileDraft(v=>({...v,email:event.target.value}))} className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500"/></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Primary Contact Number</span><input defaultValue="+1 (555) 123-4000" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500"/></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Date of Establishment / Registration</span><input defaultValue="1994-06-01" type="date" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></label>
                    <label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Organization Academic Model</span><select className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"><option>Semester & Dual Credit System</option><option>Annual System</option><option>Trimester System</option></select></label>
                    <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Public Website URL</span><input defaultValue="https://www.example.edu" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></label>
                    <label className="block sm:col-span-2"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Official Organizational Description</span><textarea rows={3} defaultValue="Dedicated to delivering quality learning, inclusive opportunities, and lifelong development through innovative academic and university-wide programs." className="w-full resize-y rounded-md border border-slate-200 px-3 py-2 text-xs leading-5 outline-none focus:border-teal-500"/></label>
                  </div></section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-start justify-between"><div className="flex gap-2"><Globe2 size={16} className="mt-0.5 text-teal-700"/><div><h2 className="text-sm font-extrabold text-slate-900">Campus Headquarters & Regional Liaison</h2><p className="mt-1 text-[11px] text-slate-500">Primary administrative address and regional contacts.</p></div></div><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Section 02</span></div><div className="space-y-4"><div><p className="mb-2 text-[10px] font-bold text-slate-700">Address Line 1 (Street / Road / Block)</p><input defaultValue="420 Academic Boulevard, Innovation Quad" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></div><div><p className="mb-2 text-[10px] font-bold text-slate-700">Address Line 2 (Building / Floor / Unit)</p><input defaultValue="Suite 600 – Central Administration Wing" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></div><div className="grid gap-3 sm:grid-cols-2"><label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">City</span><input defaultValue="Cambridge" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">State / Province</span><input defaultValue="Massachusetts" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Postal / ZIP Code</span><input defaultValue="02138" className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs"/></label><label className="block"><span className="mb-1 block text-[10px] font-semibold text-slate-600">Country / Jurisdiction</span><select defaultValue="United States" className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs"><option>United States</option><option>India</option><option>United Kingdom</option><option>Canada</option></select></label></div><div className="border-t border-slate-100 pt-3"><h3 className="text-xs font-extrabold text-slate-800">Primary Administrative Liaison Person</h3><div className="mt-3 grid gap-3 sm:grid-cols-3"><div><p className="text-[10px] text-slate-500">Liaison Officer</p><p className="mt-1 text-xs font-bold text-slate-800">Dr. Marcus Sterling</p><p className="text-[10px] text-slate-500">Provost & Registrar</p></div><div><p className="text-[10px] text-slate-500">Official Email</p><p className="mt-1 break-all text-[10px] font-semibold text-teal-700">registrar@example.edu</p></div><div><p className="text-[10px] text-slate-500">Direct Telephone</p><p className="mt-1 text-[10px] font-semibold text-slate-700">+1 (555) 123-4054</p></div></div></div></div></section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="mb-4 flex items-start justify-between"><div className="flex gap-2"><BookOpen size={16} className="mt-0.5 text-teal-700"/><div><h2 className="text-sm font-extrabold text-slate-900">Academic Configuration & Standards</h2><p className="mt-1 text-[11px] text-slate-500">Academic year, curriculum structure and learning program parameters.</p></div></div><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Section 03</span></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Academic Year / Session</p><p className="mt-1 text-sm font-extrabold text-slate-900">2024–2025</p><p className="mt-1 text-[10px] text-slate-500">Term 2 · Mid-year academic calendar</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Academic Model</p><p className="mt-1 text-sm font-extrabold text-slate-900">Semester Model</p><p className="mt-1 text-[10px] text-slate-500">Fall, Spring / Annual Sessions</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Active Departments</p><p className="mt-1 text-sm font-extrabold text-slate-900">8 Departments</p><p className="mt-1 text-[10px] text-slate-500">Business, Management, Engineering, Arts</p></div><div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] text-slate-500">Grading Standard</p><p className="mt-1 text-sm font-extrabold text-slate-900">4.0 Scale / Letter Grade</p><p className="mt-1 text-[10px] text-slate-500">GPA, transcripts and academic reporting</p></div><div className="rounded-lg border border-slate-200 bg-teal-50/50 p-3 sm:col-span-2"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] text-slate-500">Academic Calendar Sync Hook</p><p className="mt-1 text-xs font-bold text-slate-800">Automated LMS & SIS synchronization</p></div><span className="rounded-full bg-teal-100 px-2 py-1 text-[9px] font-bold text-teal-800">Operational</span></div></div></div></section>
                </div>
                <aside className="space-y-5"><section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-700"/><h2 className="text-sm font-extrabold text-slate-900">Visual Identity & Theme</h2></div><span className="text-[9px] text-slate-400">Section 04</span></div><p className="mt-1 text-[11px] text-slate-500">Customize branding and visual identity.</p><div className="mt-4 space-y-3"><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-600">Primary Brand Accent</span><span className="flex items-center gap-2 text-[10px] font-bold text-slate-700"><i className="h-4 w-4 rounded bg-teal-700"/> #0F766E</span></div><div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-slate-600">Text / Background Theme</span><span className="flex items-center gap-2 text-[10px] font-bold text-slate-700"><i className="h-4 w-4 rounded bg-slate-900"/> #111827</span></div><div className="rounded-lg bg-slate-900 p-3 text-white"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded bg-teal-600 text-[9px] font-black">EA</span><div><p className="text-[10px] font-bold">Organization Dashboard</p><p className="text-[9px] text-slate-300">Brand preview</p></div></div><button type="button" onClick={()=>setProfileNotice('Brand preview selected. Save profile to keep your changes.')} className="mt-3 w-full rounded-md bg-teal-600 py-2 text-[10px] font-bold text-white">Preview theme</button></div><div className="rounded-lg border border-slate-100 bg-slate-50 p-3"><p className="text-[10px] font-bold text-slate-700">Official Organization Logo</p><div className="mt-2 grid h-16 place-items-center rounded-lg border border-dashed border-slate-300 bg-white text-[10px] text-slate-400"><UploadCloud size={17}/> Upload logo</div><p className="mt-1 text-[9px] text-slate-400">PNG or SVG · Recommended 512 × 512</p></div></div></section>
                  <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><CreditCard size={16} className="text-teal-700"/><h2 className="text-sm font-extrabold text-slate-900">Subscription Entitlements</h2></div><span className="rounded-full bg-teal-50 px-2 py-1 text-[9px] font-bold text-teal-800">SLA Tier</span></div><p className="mt-1 text-[11px] text-slate-500">Active Tenant Plan</p><div className="mt-3 rounded-lg bg-teal-50 p-3"><p className="text-[10px] font-semibold text-teal-800">Enterprise Unlimited Tier</p><p className="mt-1 text-lg font-extrabold text-slate-900">Enterprise Unlimited Tier</p><p className="mt-1 text-[10px] text-slate-500">Annual plan · renewed 01 January 2026</p></div><div className="mt-3 space-y-2">{[['Student Quota','Unlimited Seats'],['Active Modules','All Enabled'],['Institutional File Stack','Enterprise Storage'],['Access Model','RBAC · Multi-Tenant']].map(([label,value])=><div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 text-[10px]"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-slate-700">{value}</span></div>)}</div><div className="mt-3 rounded-lg border border-teal-100 bg-teal-50/60 p-3 text-[10px] leading-4 text-teal-900">Your tenant subscription is active. Plan features and access controls are managed by the platform administrator.</div><p className="mt-3 text-[9px] text-slate-400">Last updated: 01 January 2026 · Usage refreshed daily</p></section></aside>
              </div>
              <div className="flex justify-end"><button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-teal-800"><CheckCircle2 size={15}/> Save organization profile</button></div>
            </form>
          </div> : <ModuleWorkspace page={currentPage} tenantId={user.tenantId} tenantName={institution} />}
        </>}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] text-slate-400"><span>© 2026 EduManage Cloud · {institution}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={12}/> Secure management portal</span></footer>
      </main>
    </div>
  </div>;
}
