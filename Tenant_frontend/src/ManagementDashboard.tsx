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
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-[236px] flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-[#321653] via-[#3b1b5d] to-[#4b2165] text-white shadow-xl shadow-violet-950/20 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 pb-6 pt-6">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 text-white shadow-lg shadow-black/10"><GraduationCap size={25} /></div>
        <div className="min-w-0"><p className="truncate text-[17px] font-extrabold tracking-tight">{tenantType === 'college' ? 'EduManage College' : tenantType === 'institution' ? 'EduManage Institution' : 'EduManage School'}</p><p className="mt-0.5 text-[10px] font-bold tracking-wide text-violet-200">{organizationLabel.toUpperCase()} MANAGEMENT SUITE</p></div>
        <button className="ml-auto rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}><X size={19}/></button>
      </div>
      <div className="px-4 pb-2 pt-4"><p className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-violet-200/70">{organizationLabel} workspace</p></div>
      <nav aria-label="Management navigation" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {filtered.map(({ label, icon: Icon }) => <button key={label} onClick={() => select(label)} aria-current={active === label ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-[11px] text-left text-[13px] font-semibold transition-all ${active === label ? 'bg-white text-[#321653] shadow-md' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}>
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${active === label ? 'bg-violet-100 text-[#321653]' : 'text-white/65 group-hover:bg-white/10 group-hover:text-white'}`}><Icon size={17}/></span><span className="flex-1">{label}</span>{active === label && <ChevronRight size={15}/>}
        </button>)}
        {filtered.length === 0 && <p className="px-3 py-5 text-sm text-slate-400">No matching modules</p>}
      </nav>
      <div className="border-t border-white/10 p-3"><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-white/80 transition hover:bg-rose-500/20 hover:text-white"><LogOut size={18}/> Sign out securely</button></div>
    </aside>
    <div className="min-w-0 lg:pl-[236px]">
      <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-[#321653] via-[#3e1d60] to-[#4a2369] px-4 text-white shadow-lg shadow-violet-950/10 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button className="rounded-xl border border-violet-100 bg-white p-2.5 text-violet-900 shadow-sm lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19}/></button>
          <div className="hidden items-center gap-2 text-xs text-white/60 sm:flex"><School size={15}/><span>Workspace</span><ChevronRight size={13}/><span className="font-semibold text-white">{active}</span></div>
          <div className="sm:hidden"><p className="truncate text-sm font-bold">{active}</p><p className="truncate text-[11px] text-slate-500">{institution}</p></div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <label className="hidden max-w-[440px] flex-1 items-center gap-2.5 rounded-full border border-white/20 bg-white px-4 py-2.5 text-slate-400 md:flex"><Search size={17}/><input aria-label="Search management modules" value={search} onChange={e => setSearch(e.target.value)} placeholder={tenantType === 'college' ? 'Search students, faculty, departments...' : tenantType === 'institution' ? 'Search members, programs, services...' : 'Search students, teachers, classes...'} className="w-full bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"/></label>
          <button onClick={() => setShowNotifications(v => !v)} aria-label="Notifications" className="relative rounded-xl p-2.5 text-white transition hover:bg-white/10"><Bell size={19}/></button>
          {showNotifications && <div className="absolute right-20 top-[62px] w-72 rounded-2xl border border-violet-100 bg-white p-4 shadow-xl"><p className="text-sm font-bold">Notifications</p><p className="mt-2 text-xs leading-5 text-slate-500">You're all caught up. Setup reminders will appear here.</p></div>}
          <div className="h-8 w-px bg-white/20"/>
          <div className="flex items-center gap-2.5 pl-1"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-white bg-gradient-to-br from-violet-200 to-fuchsia-100 text-xs font-extrabold text-violet-900 shadow">{initials}</span><div className="hidden max-w-36 sm:block"><p className="truncate text-xs font-bold text-white">{user.name || 'Management user'}</p><p className="truncate text-[10px] text-violet-200">{user.role || 'Head Administrator'}</p></div></div>
        </div>
      </header>
      <main className="relative mx-auto min-h-[calc(100vh-64px)] max-w-[1800px] space-y-4 overflow-hidden rounded-tl-[30px] rounded-tr-[6px] border border-white/80 bg-[#f7f6fb] p-4 shadow-[-10px_-4px_40px_rgba(255,255,255,.18)] sm:p-5 xl:p-6"><div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-16 w-16 rounded-bl-[34px] border-b border-l border-violet-200/70 bg-gradient-to-bl from-[#e6dcff] via-[#f4efff] to-transparent"/><div aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-12 w-12 rounded-tr-[28px] border-r border-t border-violet-200/60 bg-gradient-to-tr from-[#e8e0ff] to-transparent"/><div aria-hidden="true" className="pointer-events-none absolute right-0 bottom-0 h-20 w-20 rounded-tl-[38px] border-l border-t border-violet-200/70 bg-gradient-to-tl from-[#e4d8ff] via-[#f1ebff] to-transparent"/>
        {active === 'Dashboard' ? <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-100 bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.14em] text-violet-700"><Sparkles size={12}/> {organizationLabel} management overview</div><h1 className="text-[25px] font-extrabold tracking-tight text-[#17143a] sm:text-[30px]">Welcome back{firstName ? `, ${firstName}` : ''}</h1><p className="mt-1.5 text-sm text-slate-500">Here’s what’s happening at <span className="font-semibold text-slate-700">{institution}</span>.</p></div>
            <button onClick={() => select('Organization Profile')} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4b1682] to-[#7026a6] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-violet-900/15 transition hover:-translate-y-0.5 hover:shadow-xl"><Plus size={16}/> Complete {organizationLabel.toLowerCase()} setup</button>
          </div>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardMetrics.map(item => <div key={item.label} className="group relative overflow-hidden rounded-xl border border-white bg-white p-4 shadow-[0_3px_14px_rgba(55,33,111,.045)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(55,33,111,.09)]">
              <div className="absolute right-0 top-0 h-20 w-20 rounded-bl-[50px] bg-violet-50/70 transition group-hover:scale-110"/><div className="relative flex items-start justify-between"><div><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-3 text-[29px] font-extrabold tracking-tight text-[#1b1740]">{item.value}</p></div><span className={`rounded-2xl p-3 ${item.tone === 'violet' ? 'bg-violet-100 text-violet-700' : item.tone === 'blue' ? 'bg-blue-100 text-blue-700' : item.tone === 'teal' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}><item.icon size={21}/></span></div><p className="relative mt-3 flex items-center gap-1.5 text-[11px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-slate-300"/>{item.hint}</p>
            </div>)}
          </section>
        </> : <><div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><span className="rounded-2xl bg-white p-3 text-violet-700 shadow-sm"><ActiveIcon size={23}/></span><div><p className="text-xs font-bold uppercase tracking-[.12em] text-violet-700">{organizationLabel} workspace</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">{active}</h1><p className="mt-1 text-sm text-slate-500">Manage {active.toLowerCase()} for {institution}.</p></div></div><button onClick={() => select('Dashboard')} className="inline-flex items-center gap-2 rounded-xl border border-violet-100 bg-white px-4 py-2.5 text-xs font-bold text-violet-800 shadow-sm hover:bg-violet-50"><LayoutDashboard size={15}/> Back to overview</button></div>
          {(active === 'Institution Profile' || active === 'Organization Profile') ? <section className="rounded-2xl border border-white bg-white p-6 shadow-sm"><div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2.5 text-violet-700"><Building2 size={20}/></span><div><h2 className="font-extrabold">{organizationLabel} information</h2><p className="mt-1 text-xs text-slate-500">Details linked to your authenticated tenant account</p></div></div><form onSubmit={saveProfile} className="mt-5"><div className="grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-xs font-bold text-slate-700">{organizationLabel} name</span><input value={profileDraft.name} onChange={event => setProfileDraft(current => ({ ...current, name: event.target.value }))} required className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Organization name"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Organization code</span><input value={profileDraft.code} onChange={event => setProfileDraft(current => ({ ...current, code: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="Organization code"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Organization type</span><input value={profileDraft.type} onChange={event => setProfileDraft(current => ({ ...current, type: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"/></label><label><span className="mb-1.5 block text-xs font-bold text-slate-700">Management email</span><input type="email" value={profileDraft.email} onChange={event => setProfileDraft(current => ({ ...current, email: event.target.value }))} className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" placeholder="admin@organization.edu"/></label></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">{profileNotice && <p role="status" className="text-xs text-emerald-700">{profileNotice}</p>}<button type="submit" className="ml-auto inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-800"><CheckCircle2 size={15}/> Save profile</button></div></form></section> : <ModuleWorkspace page={active} tenantId={user.tenantId} tenantName={institution} />}
        </>}
        <footer className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2 text-[10px] text-slate-400"><span>© 2026 EduManage Cloud · {institution}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck size={12}/> Secure management portal</span></footer>
      </main>
    </div>
  </div>;
}
