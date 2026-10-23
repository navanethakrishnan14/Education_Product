import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { School, LayoutDashboard, CalendarDays, Users, GraduationCap, UserRound, ClipboardCheck, BookOpen, Wallet, Bus, BarChart3, Settings, LogOut, Menu, X, ChevronRight, Search, Bell, Plus, ArrowUpRight } from 'lucide-react';

type User = { name?: string; email?: string; tenantId?: string; tenantCode?: string | null; tenantType?: string; tenantName?: string };
const modules = [
  { label: 'Dashboard', icon: LayoutDashboard, description: 'School overview and daily activity' },
  { label: 'Academic Year', icon: CalendarDays, description: 'Academic years, terms and holidays' },
  { label: 'Classes & Sections', icon: School, description: 'Grades, classes and section structure' },
  { label: 'Teachers & Staff', icon: Users, description: 'Staff directory and assignments' },
  { label: 'Students', icon: GraduationCap, description: 'Admissions and student records' },
  { label: 'Parents & Guardians', icon: UserRound, description: 'Guardian contacts and relationships' },
  { label: 'Attendance', icon: ClipboardCheck, description: 'Daily attendance and absence tracking' },
  { label: 'Timetable', icon: CalendarDays, description: 'Class schedules and teacher periods' },
  { label: 'Examinations & Results', icon: BookOpen, description: 'Assessments, marks and report cards' },
  { label: 'School Fees', icon: Wallet, description: 'Fee plans, collections and balances' },
  { label: 'Transport', icon: Bus, description: 'Routes, vehicles and student assignments' },
  { label: 'Reports', icon: BarChart3, description: 'School performance and operational reports' },
  { label: 'Settings', icon: Settings, description: 'School configuration and access settings' }
];
export default function SchoolManagementFlow({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [active, setActive] = useState('Dashboard');
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = useNavigate();
  const filtered = modules.filter(m => m.label.toLowerCase().includes(search.toLowerCase()));
  const current = modules.find(m => m.label === active) || modules[0];
  const Icon = current.icon;
  const name = user.tenantName || user.name || 'Your school';
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    {mobileOpen && <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#102f55] text-white transition-transform lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6"><span className="rounded-xl bg-sky-400/15 p-2.5 text-sky-300"><School size={24}/></span><div><p className="font-bold">EduSphere Schools</p><p className="text-[10px] uppercase tracking-widest text-sky-200">School management</p></div><button className="ml-auto lg:hidden" onClick={()=>setMobileOpen(false)} aria-label="Close menu"><X size={18}/></button></div>
      <div className="px-4 py-4"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-sky-200">{user.tenantCode || 'School workspace'}</p></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">{filtered.map(m=>{const I=m.icon;return <button key={m.label} onClick={()=>{setActive(m.label);setMobileOpen(false)}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium ${active===m.label?'bg-sky-300 text-slate-950 shadow':'text-slate-200 hover:bg-white/10'}`}><I size={18}/><span className="flex-1">{m.label}</span>{active===m.label&&<ChevronRight size={15}/>}</button>})}</nav>
      <button onClick={onLogout} className="flex items-center gap-3 border-t border-white/10 px-5 py-4 text-sm text-slate-200 hover:bg-white/10"><LogOut size={17}/> Sign out</button>
    </aside>
    <div className="min-w-0 lg:pl-64"><header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7"><button className="lg:hidden" onClick={()=>setMobileOpen(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="min-w-0 flex-1"><p className="text-xs text-slate-500">School workspace / {active}</p><p className="truncate font-bold">{name}</p></div><label className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-slate-400 md:flex"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a school module" className="w-44 bg-transparent text-sm outline-none"/></label><button aria-label="Notifications" className="rounded-xl border border-slate-200 p-2.5 text-slate-600"><Bell size={18}/></button><button onClick={onLogout} className="hidden rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white sm:block">Sign out</button></header>
      <main className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800"><School size={14}/> SCHOOL ADMINISTRATION</span><h1 className="mt-3 text-3xl font-extrabold tracking-tight">{active==='Dashboard'?'School dashboard':active}</h1><p className="mt-2 text-sm text-slate-500">{active==='Dashboard'?'Manage academics, people and daily school operations in one place.':current.description}</p></div><button onClick={()=>setActive('Students')} className="inline-flex items-center gap-2 rounded-xl bg-[#123d68] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0b2d50]"><Plus size={17}/> Student actions</button></div>
      {active==='Dashboard'?<><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Students',value:'—',hint:'Enrolled learners',icon:GraduationCap},{label:'Teachers & Staff',value:'—',hint:'School workforce',icon:Users},{label:'Attendance today',value:'—',hint:'Daily attendance',icon:ClipboardCheck},{label:'Fee collection',value:'—',hint:'Current academic year',icon:Wallet}].map(x=>{const I=x.icon;return <article key={x.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="inline-flex rounded-xl bg-sky-100 p-3 text-sky-800"><I size={20}/></span><p className="mt-4 text-sm font-medium text-slate-500">{x.label}</p><p className="mt-1 text-3xl font-extrabold">{x.value}</p><p className="mt-2 text-xs text-slate-400">{x.hint}</p></article>})}</section><section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"><h2 className="text-lg font-bold">School setup checklist</h2><p className="mt-1 text-sm text-slate-500">Configure the core school records to prepare your workspace.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{['Set up academic year and terms','Create classes and sections','Add teachers and staff','Configure fee structure'].map((s,i)=><button key={s} onClick={()=>setActive(modules[i+1].label)} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-sky-300 hover:bg-sky-50"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sm font-bold text-sky-800">{i+1}</span><span className="flex-1 text-sm font-semibold">{s}</span><ArrowUpRight size={16} className="text-slate-400"/></button>)}</div></section></>:<section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><span className="inline-flex rounded-xl bg-sky-100 p-3 text-sky-800"><Icon size={24}/></span><h2 className="mt-4 text-xl font-bold">{active}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{current.description}. This module is separated into the School workflow. Connect its forms and records to the school-scoped API before using it with live data.</p><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Data forms and backend operations for this module are not connected yet; no sample values are being saved.</div><button onClick={()=>setActive('Dashboard')} className="mt-5 rounded-xl bg-[#123d68] px-4 py-2.5 text-sm font-semibold text-white">Back to school dashboard</button></section>}
      <footer className="flex flex-wrap justify-between gap-2 pb-3 text-xs text-slate-400"><span>EduSphere School Management</span><span>Authenticated tenant: {user.tenantId || 'Unavailable'}</span></footer></main></div>
  </div>;
}
