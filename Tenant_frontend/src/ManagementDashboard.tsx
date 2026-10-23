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
  const institution = user.institutionName || user.tenantName || 'Your ' + organizationLabel.toLowerCase();
  const [profileDraft, setProfileDraft] = useState(() => ({ name: user.institutionName || user.tenantName || '', code: user.tenantCode || '', type: user.tenantType || organizationLabel.toLowerCase(), email: user.email || '' }));
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
        { label: 'Setup progress', value: '1/4', hint: 'College onboarding checklist', icon: Activity, tone: 'amber' }
      ]
    : tenantType === 'institution'
    ? [
        { label: 'Members & learners', value: '—', hint: 'People registered with your organization', icon: Users, tone: 'violet' },
        { label: 'Staff members', value: '—', hint: 'Staff and team directory', icon: UserRound, tone: 'blue' },
        { label: 'Programs & services', value: '—', hint: 'Organization service overview', icon: BookOpen, tone: 'teal' },
        { label: 'Setup progress', value: '1/4', hint: 'Organization onboarding checklist', icon: Activity, tone: 'amber' }
      ]
    : [
        { label: 'Students', value: '—', hint: 'School enrollment overview', icon: GraduationCap, tone: 'violet' },
        { label: 'Faculty & staff', value: '—', hint: 'Teachers and staff directory', icon: Users, tone: 'blue' },
        { label: 'Attendance today', value: '—', hint: 'Daily school attendance', icon: CalendarCheck, tone: 'teal' },
        { label: 'Setup progress', value: '1/4', hint: 'School onboarding checklist', icon: Activity, tone: 'amber' }
      ];
  const filtered = useMemo(() => menu.filter(item => item.label.toLowerCase().includes(search.toLowerCase())), [menu, search]);
  const select = (page: string) => { setActive(page); setMobileOpen(false); };
  const firstName = user.name?.trim().split(/\s+/)[0];
  const activeIcon = menu.find(item => item.label === active)?.icon || LayoutDashboard;
  const ActiveIcon = activeIcon;
  const initials = (user.name || 'Management').split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  return <div className="min-h-screen bg-[#f3f1fc] text-[#17143a]" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
    {mobileOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-30 bg-[#170c36]/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[278px] flex-col overflow-hidden border-r border-violet-100 bg-white text-slate-800 shadow-xl shadow-violet-950/5 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 border-b border-violet-100 px-5 pb-6 pt-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-700 to-fuchsia-600 text-white shadow-lg shadow-violet-200"><GraduationCap size={25} /></div>
        <div className="min-w-0"><p className="truncate text-[17px] font-extrabold tracking-tight">{tenantType === 'college' ? 'EduManage College' : tenantType === 'institution' ? 'EduManage Institution' : 'EduManage School'}</p><p className="mt-0.5 text-[10px] font-bold tracking-wide text-violet-500">{organizationLabel.toUpperCase()} MANAGEMENT SUITE</p></div>
        <button className="ml-auto rounded-lg p-1 text-slate-500 hover:bg-violet-50 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19}/></button>
      </div>
      <div className="px-4 pb-2 pt-4"><p className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">{organizationLabel} workspace</p></div>
      <nav aria-label="Management navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {filtered.map(({ label, icon: Icon }) => <button key={label} onClick={() => select(label)} aria-current={active === label ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-[11px] text-left text-[13px] font-semibold transition-all ${active === label ? 'bg-violet-50 text-violet-900 ring-1 ring-inset ring-violet-100 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-violet-800'}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${active === label ? 'bg-violet-200/70 text-violet-800' : 'text-slate-400 group-hover:bg-violet-50 group-hover:text-violet-700'}`}><Icon size={17}/></span><span className="flex-1">{label}</span>{active === label && <ChevronRight size={15}/>}
        </button>)}
        {filtered.length === 0 && <p className="px-3 py-5 text-sm text-slate-400">No matching modules</p>}
      </nav>
      <div className="border-t border-violet-100 p-3"><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"><LogOut size={18}/> Sign out securely</button></div>
    </aside>
    <div className="min-w-0 lg:pl-[278px]">
      <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-violet-100/80 bg-white/90 px-4 backdrop-blur-xl sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-xl border border-violet-100 bg-white p-2.5 text-violet-900 shadow-sm lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
          <div className="hidden items-center gap-2 text-xs text-slate-400 sm:flex"><School size={15}/><span>Workspace</span><ChevronRight size={13}/><span className="font-semibold text-violet-800">{active}</span></div>
          <div className="sm:hidden"><p className="truncate text-sm font-bold">{active}</p><p className="truncate text-[11px] text-slate-500">{institution}</p></div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <label className="hidden max-w-[440px] flex-1 items-center gap-2.5 rounded-full border border-violet-100 bg-[#f8f7ff] px-4 py-2.5 text-slate-400 md:flex"><Search size={17}/><input aria-label="Search management modules" value={search} onChange={e => setSearch(e.target.value)} placeholder={tenantType === 'college' ? 'Search students, faculty, departments...' : tenantType === 'institution' ? 'Search members, programs, services...' : 'Search students, teachers, classes...'} className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"/></label>
          <button onClick={() => setShowNotifications(v => !v)} aria-label="Notifications" className="relative rounded-xl p-2.5 text-violet-900 transition hover:bg-violet-50"><Bell size={19}/><span className="absolute right-2 top-2 h-2 w-2 rounded-full border border-white bg-rose-500"/></button>
          {showNotifications && <div className="absolute right-20 top-[62px] w-72 rounded-2xl border border-violet-100 bg-white p-4 shadow-xl"><p className="text-sm font-bold">Notifications</p><p className="mt-2 text-xs leading-5 text-slate-500">You're all caught up. Setup reminders will appear here.</p></div>}
          <div className="h-8 w-px bg-violet-100"/>
          <div className="flex items-center gap-2.5 pl-1"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-200 to-fuchsia-100 text-xs font-extrabold text-violet-900 shadow">{initials}</span><div className="hidden max-w-36 sm:block"><p className="truncate text-xs font-bold text-slate-900">{user.name || 'Management user'}</p><p className="truncate text-[10px] text-slate-500">{user.role || 'Head Administrator'}</p></div></div>
        </div>
      </header>
      <main className="mx-auto max-w-[1700px] space-y-5 p-4 sm:p-6 xl:p-7">
        {active === 'Dashboard' ? <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-violet-700"><Sparkles size={12}/> {organizationLabel} management overview</div><h1 className="text-[25px] font-extrabold tracking-tight text-[#17143a] sm:text-[30px]">Welcome back{firstName ? `, ${firstName}` : ''}</h1><p className="mt-1.5 text-sm text-slate-500">Here’s what’s happening at <span className="font-semibold text-slate-700">{institution}</span>.</p></div>
            <button onClick={() => select('Organization Profile')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4b1682] to-[#7026a6] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-900/15 transition hover:-translate-y-0.5 hover:shadow-xl"><Plus size={16}/> Complete {organizationLabel.toLowerCase()} setup</button>
          </div>
          <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            {dashboardMetrics.map(item => <div key={item.label} className="group relative overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_4px_18px_rgba(55,33,111,.055)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(55,33,111,.10)]">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[50px] bg-violet-50/70 transition group-hover:scale-110"/><div className="relative flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-3 text-[29px] font-extrabold tracking-tight text-[#1b1740]">{item.value}</p></div><span className={`rounded-2xl p-3 ${item.tone === 'violet' ? 'bg-violet-100 text-violet-700' : item.tone === 'blue' ? 'bg-blue-100 text-blue-700' : item.tone === 'teal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><item.icon size={21}/></span></div><p className="relative mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>{item.hint}</p>
            </div>)}
          </section>
          <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
            <section className="overflow-hidden rounded-2xl border border-white bg-white p-5 shadow-[0_4px_18px_rgba(55,33,111,.055)] sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><ClipboardCheck size={20}/></span><div><h2 className="text-base font-extrabold">{organizationLabel} setup checklist</h2><p className="mt-0.5 text-xs text-slate-500">Recommended steps for your {organizationLabel.toLowerCase()} workspace</p></div></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-700">In progress</span></div>
              <div className="mb-5 rounded-xl bg-[#f8f6ff] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-violet-950">{organizationLabel} setup progress</p><p className="mt-1 text-[11px] text-slate-500">Complete these essentials to prepare your {organizationLabel.toLowerCase()} workspace.</p></div><span className="text-xl font-extrabold text-violet-800">25%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full w-1/4 rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-500"/></div></div>
              <div className="space-y-2.5">{tasks.map((task, i) => <button key={task.title} onClick={() => select(task.page)} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3.5 text-left transition hover:border-violet-200 hover:bg-violet-50/50 sm:p-4"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-extrabold ${i === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}>{i === 0 ? <CheckCircle2 size={18}/> : String(i + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{task.title}</span><span className="mt-1 block text-[11px] leading-4 text-slate-500">{task.detail}</span></span><ChevronRight size={17} className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-700"/></button>)}</div>
            </section>
            <section className="rounded-2xl border border-white bg-white p-5 shadow-[0_4px_18px_rgba(55,33,111,.055)] sm:p-6">
              <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-100 p-2.5 text-indigo-700"><Activity size={20}/></span><div><h2 className="text-base font-extrabold">Quick access</h2><p className="mt-0.5 text-xs text-slate-500">Jump into a workspace module</p></div></div><button aria-label="More quick actions" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><MoreHorizontal size={19}/></button></div>
              <div className="mt-5 space-y-2.5">{subjects.map(({ name: title, detail, icon: Icon, color, page }) => <button key={title} onClick={() => select(page)} className="group flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3.5 text-left transition hover:border-violet-200 hover:bg-violet-50/60"><span className={`rounded-xl p-2.5 ${color === 'violet' ? 'bg-violet-100 text-violet-700' : color === 'blue' ? 'bg-blue-100 text-blue-700' : color === 'teal' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}><Icon size={18}/></span><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{title}</span><span className="mt-1 block text-[11px] text-slate-500">{detail}</span></span><ArrowUpRight size={16} className="text-slate-400 group-hover:text-violet-700"/></button>)}</div>
              <div className="mt-4 rounded-xl border border-dashed border-violet-200 bg-violet-50/60 p-4"><div className="flex items-start gap-3"><span className="rounded-lg bg-white p-2 text-violet-700 shadow-sm"><ShieldCheck size={17}/></span><div><p className="text-xs font-bold text-violet-950">Secure institution workspace</p><p className="mt-1 text-[11px] leading-4 text-slate-600">Your management access is authenticated. Configure team roles and academic settings when ready.</p></div></div></div>
            </section>
          </div>
          <section className="rounded-2xl border border-white bg-white p-5 shadow-[0_4px_18px_rgba(55,33,111,.055)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-xl bg-sky-100 p-2.5 text-sky-700"><BarChart3 size={20}/></span><div><h2 className="text-base font-extrabold">{tenantType === 'college' ? 'College performance' : tenantType === 'institution' ? 'Organization performance' : 'School performance'}</h2><p className="mt-0.5 text-xs text-slate-500">Key {organizationLabel.toLowerCase()} indicators and activity</p></div></div><button onClick={() => select('Reports & Analytics')} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-violet-700 transition hover:bg-violet-50">View reports <ArrowUpRight size={15}/></button></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-slate-500"><TrendingUp size={15}/><span className="text-[11px] font-semibold">{tenantType === 'institution' ? 'Membership trend' : tenantType === 'college' ? 'Enrollment trend' : 'Student enrollment'}</span></div><p className="mt-3 text-sm font-bold text-slate-800">Awaiting data connection</p><p className="mt-1 text-[11px] text-slate-500">{tenantType === 'institution' ? 'Member and learner records will appear here.' : 'Enrollment records will appear here.'}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-slate-500"><CalendarCheck size={15}/><span className="text-[11px] font-semibold">Attendance pulse</span></div><p className="mt-3 text-sm font-bold text-slate-800">Awaiting data connection</p><p className="mt-1 text-[11px] text-slate-500">{tenantType === 'college' ? 'Department and semester activity insights.' : tenantType === 'institution' ? 'Program participation insights.' : 'Daily attendance insights.'}</p></div><div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center gap-2 text-slate-500"><CreditCard size={15}/><span className="text-[11px] font-semibold">{tenantType === 'college' ? 'Fees & scholarships' : tenantType === 'institution' ? 'Finance & funding' : 'Fee collection'}</span></div><p className="mt-3 text-sm font-bold text-slate-800">Awaiting data connection</p><p className="mt-1 text-[11px] text-slate-500">{tenantType === 'institution' ? 'Funding and finance summaries.' : 'Finance summaries and balances.'}</p></div></div></section>
        </> : <><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white p-3 text-violet-700 shadow-sm"><ActiveIcon size={23}/></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-violet-700">{organizationLabel} workspace</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{active}</h1><p className="mt-1 text-sm text-slate-500">Manage {active.toLowerCase()} for {institution}.</p></div></div><button onClick={() => select('Dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-2.5 text-xs font-bold text-violet-800 shadow-sm hover:bg-violet-50"><LayoutDashboard size={15}/> Back to overview</button></div>
          {(active === 'Institution Profile' || active === 'Organization Profile') ? <section className="rounded-2xl border border-white bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><Building2 size={20}/></span><div><h2 className="font-extrabold">{organizationLabel} information</h2><p className="mt-1 text-xs text-slate-500">Details linked to your authenticated tenant account</p></div></div><form onSubmit={saveProfile} className="mt-5"><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold text-slate-700">{organizationLabel} name</span><input value={profileDraft.name} onChange={event => setProfileDraft(current => ({ ...current, name: event.target.value }))} required className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Organization name"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Organization code</span><input value={profileDraft.code} onChange={event => setProfileDraft(current => ({ ...current, code: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Organization code"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Organization type</span><input value={profileDraft.type} onChange={event => setProfileDraft(current => ({ ...current, type: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Management email</span><input type="email" value={profileDraft.email} onChange={event => setProfileDraft(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="admin@organization.edu"/></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">{profileNotice && <p role="status" className="text-xs text-emerald-700">{profileNotice}</p>}<button type="submit" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-800"><CheckCircle2 size={15}/> Save profile</button></div></form></section> : <ModuleWorkspace page={active} tenantId={user.tenantId} tenantName={institution} />
        </>}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] text-slate-400"><span>© 2026 EduManage Cloud · {institution}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={12}/> Secure management portal</span></footer>
      </main>
    </div>
  </div>;
}
