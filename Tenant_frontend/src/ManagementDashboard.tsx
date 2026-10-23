import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  LayoutDashboard, Building2, GraduationCap, Users, UserRound, CalendarDays,
  BookOpen, ClipboardCheck, Wallet, Megaphone, BarChart3, Settings, Bell,
  Search, Menu, X, LogOut, ChevronRight, Plus, ShieldCheck,
  FileText, MoreHorizontal, ArrowUpRight, CheckCircle2, TrendingUp, School,
  CreditCard, Activity, CalendarCheck, Sparkles
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
export default function ManagementDashboard({ user, onLogout }: { user: TenantUser; onLogout: () => void }) {
  const [active, setActive] = useState('Dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const tenantType = (user.tenantType || 'school').toLowerCase() as keyof typeof typeMenus;
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
  const select = (page: string) => { setActive(page); setMobileOpen(false); };
  const firstName = user.name?.trim().split(/\s+/)[0];
  const activeIcon = menu.find(item => item.label === active)?.icon || LayoutDashboard;
  const ActiveIcon = activeIcon;
  const initials = (user.name || 'Management').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className="min-h-screen bg-[#e8e2ff] text-[#17143a]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
    {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-[#170c36]/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[275px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#321653] via-[#3b1b5d] to-[#4b2165] text-white shadow-xl shadow-violet-950/20 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-5 pb-4 pt-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/15 text-white shadow-lg shadow-black/10"><GraduationCap size={15} /></div>
        <div className="min-w-0"><p className="truncate text-[16px] font-extrabold tracking-tight">{tenantType === 'college' ? 'EduManage College' : tenantType === 'institution' ? 'EduManage Institution' : 'EduManage School'}</p><p className="mt-1 text-[10px] font-bold tracking-wide text-violet-200">{organizationLabel.toUpperCase()} MANAGEMENT SUITE</p></div>
        <button className="ml-auto rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19}/></button>
      </div>
      <div className="px-5 pb-3 pt-5"><p className="px-3 text-[11px] font-bold uppercase tracking-[.14em] text-violet-200/70">{organizationLabel} workspace</p></div>
      <nav aria-label="Management navigation" className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {filtered.map(({ label, icon: Icon }) => <button key={label} onClick={() => select(label)} aria-current={active === label ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-[14px] font-semibold transition-all ${active === label ? 'bg-white text-[#321653] shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-md ${active === label ? 'bg-violet-100 text-[#321653]' : 'text-white/65 group-hover:bg-white/10 group-hover:text-white'}`}><Icon size={12}/></span><span className="flex-1">{label}</span>{active === label && <ChevronRight size={15}/>}
        </button>)}
        {filtered.length === 0 && <p className="px-3 py-5 text-sm text-slate-400">No matching modules</p>}
      </nav>
      <div className="border-t border-white/10 p-2"><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[8px] font-semibold text-white/80 transition hover:bg-rose-500/20 hover:text-white"><LogOut size={18}/> Sign out securely</button></div>
    </aside>
    <div className="min-w-0 lg:pl-[275px]">
      <header className="sticky top-0 z-20 flex min-h-[74px] items-center justify-between gap-2 border-b border-white/10 bg-gradient-to-r from-[#321653] via-[#3e1d60] to-[#4a2369] px-3 text-white shadow-lg shadow-violet-950/10 sm:px-3 xl:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-xl border border-violet-100 bg-white p-2.5 text-violet-900 shadow-sm lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
          <div className="hidden items-center gap-2 text-xs text-white/60 sm:flex"><School size={15}/><span>Workspace</span><ChevronRight size={13}/><span className="font-semibold text-white">{active}</span></div>
          <div className="sm:hidden"><p className="truncate text-sm font-bold">{active}</p><p className="truncate text-[11px] text-slate-500">{institution}</p></div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <label className="hidden max-w-[285px] flex-1 items-center gap-2 rounded-full border border-white/20 bg-white px-4 py-2.5 text-slate-400 md:flex"><Search size={17}/><input aria-label="Search management modules" value={search} onChange={e => setSearch(e.target.value)} placeholder={tenantType === 'college' ? 'Search students, faculty, departments...' : tenantType === 'institution' ? 'Search members, programs, services...' : 'Search students, teachers, classes...'} className="w-full bg-transparent text-[13px] text-slate-700 outline-none placeholder:text-slate-400"/></label>
          <button onClick={() => setShowNotifications(v => !v)} aria-label="Notifications" className="relative rounded-lg p-1.5 text-white transition hover:bg-white/10"><Bell size={19}/></button>
          {showNotifications && <div className="absolute right-20 top-[62px] w-72 rounded-2xl border border-violet-100 bg-white p-4 shadow-xl"><p className="text-sm font-bold">Notifications</p><p className="mt-2 text-xs leading-5 text-slate-500">You're all caught up. Setup reminders will appear here.</p></div>}
          <div className="h-6 w-px bg-white/20"/>
          <div className="flex items-center gap-2.5 pl-1"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-200 to-fuchsia-100 text-[9px] font-extrabold text-violet-900 shadow">{initials}</span><div className="hidden max-w-36 sm:block"><p className="truncate text-[12px] font-bold text-white">{user.name || 'Management user'}</p><p className="truncate text-[10px] text-violet-200">{user.role || 'Head Administrator'}</p></div></div>
        </div>
      </header>
      <main className="relative mx-auto min-h-[calc(100vh-74px)] max-w-[1800px] space-y-6 overflow-hidden rounded-tl-[34px] rounded-tr-none border border-white/80 bg-[#f7f6fb] p-6 shadow-[-10px_-4px_40px_rgba(255,255,255,.18)] sm:p-8 xl:p-10">
        {active === 'Dashboard' ? <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-violet-100/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-800"><Sparkles size={13}/> {organizationLabel} overview</div><h1 className="text-[32px] font-extrabold leading-tight tracking-tight text-[#17132f] sm:text-[40px]">Welcome back{firstName ? \`, \${firstName}\` : ''}</h1><p className="mt-1 text-[15px] text-slate-500">Here's what's happening at <span className="font-semibold text-slate-700">{institution}</span>.</p></div>
            <button onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : tenantType === 'institution' ? 'Members & Staff' : 'Students')} className="inline-flex items-center gap-2 rounded-xl bg-[#45116f] px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-950/20 transition hover:bg-[#551887]"><Plus size={18}/> {tenantType === 'college' ? 'Add new student' : tenantType === 'institution' ? 'Add new member' : 'Add new student'}</button>
          </div>
          <section className="grid gap-5 sm:grid-cols-2">
            {dashboardMetrics.map(item => <div key={item.label} className="min-h-[160px] rounded-2xl border border-[#edf0f6] bg-white p-6 shadow-[0_2px_5px_rgba(28,25,55,.04)] transition hover:shadow-md">
              <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-slate-600">{item.label}</p><p className="mt-3 text-[34px] font-extrabold leading-none tracking-tight text-[#17132f]">{item.value}</p></div><span className={\`rounded-2xl p-3.5 \${item.tone === 'violet' ? 'bg-purple-100 text-violet-600' : item.tone === 'blue' ? 'bg-blue-100 text-blue-600' : item.tone === 'teal' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}\`}><item.icon size={22}/></span></div>
              <p className="mt-7 flex items-center gap-2 text-[13px] text-slate-400"><span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>{item.hint}</p>
            </div>)}
          </section>
          <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.9fr)]">
            <section className="min-w-0 overflow-hidden rounded-2xl border border-[#edf0f6] bg-white p-5 shadow-[0_2px_5px_rgba(28,25,55,.04)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-purple-100 p-3 text-violet-600"><UserRound size={21}/></span><div><div className="flex flex-wrap items-center gap-3"><h2 className="text-[16px] font-extrabold tracking-tight text-slate-800">{tenantType === 'college' ? 'Recent Admissions' : tenantType === 'institution' ? 'Recent Registrations' : 'Recent Admissions'}</h2><span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[11px] font-semibold text-violet-700">12 new</span></div><p className="mt-1 text-[12px] text-slate-400">Latest student admissions across all classes</p></div></div><div className="flex items-center gap-3"><button onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : tenantType === 'institution' ? 'Members & Staff' : 'Students')} className="inline-flex items-center gap-2 rounded-lg bg-purple-50 px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-purple-100"><Search size={14}/> Filter</button><button onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : tenantType === 'institution' ? 'Members & Staff' : 'Students')} className="text-xs font-semibold text-violet-800 hover:underline">View all</button></div></div>
              <div className="mt-1 overflow-x-auto"><table className="w-full min-w-[590px] table-fixed border-collapse text-left"><thead><tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-400"><th className="w-[20%] py-4 pr-2">Student</th><th className="w-[15%] px-2 py-4">Class</th><th className="w-[22%] px-2 py-4">Admission No.</th><th className="w-[18%] px-2 py-4">Admission date</th><th className="w-[17%] px-2 py-4">Status</th><th className="w-[8%] py-4 text-right"> </th></tr></thead><tbody>
              {[{initials:'AR',name:'Aarav Sharma',className:'Class 10',section:'Section A',id:'ADM-2024-001',date:'Today, 10:45 AM',status:'Active',tone:'blue'},{initials:'SM',name:'Sanya Mishra',className:'Class 8',section:'Section B',id:'ADM-2024-002',date:'Today, 09:30 AM',status:'Active',tone:'purple'},{initials:'RK',name:'Rohan Kumar',className:'Class 12',section:'Section A',id:'ADM-2024-003',date:'Yesterday, 04:15 PM',status:'Pending',tone:'pink'},{initials:'NP',name:'Nikita Patel',className:'Class 6',section:'Section C',id:'ADM-2024-004',date:'Yesterday, 11:20 AM',status:'Active',tone:'green'},{initials:'VT',name:'Vihaan Thakur',className:'Class 9',section:'Section B',id:'ADM-2024-005',date:'2 days ago, 02:10 PM',status:'Active',tone:'indigo'}].map(student => <tr key={student.id} className="border-b border-slate-100 last:border-0"><td className="py-3 pr-2"><div className="flex items-center gap-3"><span className={\`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold \${student.tone==='blue'?'bg-blue-100 text-blue-600':student.tone==='purple'?'bg-purple-100 text-violet-600':student.tone==='pink'?'bg-pink-100 text-pink-600':student.tone==='green'?'bg-emerald-100 text-emerald-600':'bg-indigo-100 text-indigo-600'}\`}>{student.initials}</span><span className="text-[12px] font-semibold leading-4 text-slate-800">{student.name}</span></div></td><td className="px-2 py-3"><span className="block text-[12px] font-medium text-slate-700">{student.className}</span><span className="mt-0.5 block text-[11px] text-slate-400">{student.section}</span></td><td className="px-2 py-3 text-[11px] text-slate-500">{student.id}</td><td className="px-2 py-3 text-[11px] leading-4 text-slate-500">{student.date}</td><td className="px-2 py-3"><span className={\`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold \${student.status==='Active'?'bg-emerald-50 text-emerald-600':'bg-orange-50 text-orange-600'}\`}><span className={\`h-1.5 w-1.5 rounded-full \${student.status==='Active'?'bg-emerald-500':'bg-orange-500'}\`}/>{student.status}</span></td><td className="py-3 text-right"><button aria-label={\`View \${student.name}\`} onClick={() => select(tenantType === 'college' ? 'Students & Admissions' : 'Students')} className="rounded-lg p-1 text-slate-400 hover:bg-violet-50 hover:text-violet-700"><ChevronRight size={18}/></button></td></tr>)}
              </tbody></table></div>
            </section>
            <section className="rounded-2xl border border-[#edf0f6] bg-white p-5 shadow-[0_2px_5px_rgba(28,25,55,.04)] sm:p-6">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Users size={21}/></span><div><h2 className="text-[16px] font-extrabold tracking-tight text-slate-800">Recent Activity</h2><p className="mt-1 text-[12px] text-slate-400">Live updates from your school</p></div></div><span className="h-2.5 w-2.5 rounded-full bg-emerald-400"/></div>
              <div className="divide-y divide-slate-100">{[{initials:'AR',name:'Aarav Sharma',detail:'New student admission completed.',time:'5m ago',tag:'Admission',tone:'blue'},{initials:'PS',name:'Priya Singh',detail:'Marked attendance for Class 10.',time:'1h ago',tag:'Attendance',tone:'amber'},{initials:'RT',name:'Rahul Tiwari',detail:'Uploaded Class 12 syllabus.',time:'2h ago',tag:'Academics',tone:'pink'},{initials:'SK',name:'Sneha Kapoor',detail:'Generated fee collection report.',time:'3h ago',tag:'Finance',tone:'green'},{initials:'AM',name:'Amit Mehta',detail:'Added new faculty member.',time:'5h ago',tag:'Faculty',tone:'purple'}].map(item => <div key={item.initials} className="flex gap-3 py-4 first:pt-3"><span className={\`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold \${item.tone==='blue'?'bg-blue-100 text-blue-600':item.tone==='amber'?'bg-amber-100 text-amber-700':item.tone==='pink'?'bg-pink-100 text-pink-600':item.tone==='green'?'bg-emerald-100 text-emerald-600':'bg-violet-100 text-violet-600'}\`}>{item.initials}</span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[12px] font-bold text-slate-800">{item.name}</p><span className="shrink-0 text-[10px] text-slate-400">{item.time}</span></div><p className="mt-1 text-[12px] leading-4 text-slate-500">{item.detail}</p><span className={\`mt-1.5 inline-flex rounded px-2 py-1 text-[10px] font-semibold \${item.tone==='amber'?'bg-blue-50 text-blue-600':item.tone==='green'?'bg-emerald-50 text-emerald-600':item.tone==='pink'?'bg-blue-50 text-blue-600':'bg-purple-50 text-violet-600'}\`}>{item.tag}</span></div></div>)}</div>
            </section>
          </div>
        </>}: <><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white p-3 text-violet-700 shadow-sm"><ActiveIcon size={23}/></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-violet-700">{organizationLabel} workspace</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{active}</h1><p className="mt-1 text-sm text-slate-500">Manage {active.toLowerCase()} for {institution}.</p></div></div><button onClick={() => select('Dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-2.5 text-xs font-bold text-violet-800 shadow-sm hover:bg-violet-50"><LayoutDashboard size={15}/> Back to overview</button></div>
          {(active === 'Institution Profile' || active === 'Organization Profile') ? <section className="rounded-2xl border border-white bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><Building2 size={20}/></span><div><h2 className="font-extrabold">{organizationLabel} information</h2><p className="mt-1 text-xs text-slate-500">Details linked to your authenticated tenant account</p></div></div><form onSubmit={saveProfile} className="mt-5"><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold text-slate-700">{organizationLabel} name</span><input value={profileDraft.name} onChange={event => setProfileDraft(current => ({ ...current, name: event.target.value }))} required className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Organization name"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Organization code</span><input value={profileDraft.code} onChange={event => setProfileDraft(current => ({ ...current, code: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Organization code"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Organization type</span><input value={profileDraft.type} onChange={event => setProfileDraft(current => ({ ...current, type: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Management email</span><input type="email" value={profileDraft.email} onChange={event => setProfileDraft(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="admin@organization.edu"/></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">{profileNotice && <p role="status" className="text-xs text-emerald-700">{profileNotice}</p>}<button type="submit" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-800"><CheckCircle2 size={15}/> Save profile</button></div></form></section> : <ModuleWorkspace page={active} tenantId={user.tenantId} tenantName={institution} />}
        </>}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] text-slate-400"><span>© 2026 EduManage Cloud · {institution}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={12}/> Secure management portal</span></footer>
      </main>
    </div>
  </div>;
}
