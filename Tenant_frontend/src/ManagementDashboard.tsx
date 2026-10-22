import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building2, GraduationCap, Users, UserRound, CalendarDays, BookOpen, ClipboardCheck, Wallet, Megaphone, BarChart3, Settings, Bell, Search, Menu, X, LogOut, ChevronRight, Plus, ShieldCheck, Clock, CircleHelp } from 'lucide-react';

type TenantUser = {name?:string;email?:string;role?:string;tenantId?:string;tenantCode?:string|null;tenantType?:string;tenantName?:string;institutionName?:string};
const menu = [
  {label:'Dashboard',icon:LayoutDashboard},
  {label:'Institution Profile',icon:Building2},
  {label:'Academic Setup',icon:BookOpen},
  {label:'Management Users',icon:ShieldCheck},
  {label:'Faculty',icon:Users},
  {label:'Students',icon:GraduationCap},
  {label:'Parents',icon:UserRound},
  {label:'Attendance',icon:ClipboardCheck},
  {label:'Timetable',icon:CalendarDays},
  {label:'Examinations',icon:BookOpen},
  {label:'Fees & Finance',icon:Wallet},
  {label:'Communication',icon:Megaphone},
  {label:'Reports & Analytics',icon:BarChart3},
  {label:'Settings',icon:Settings}
];
const upcoming = ['Complete institution profile','Configure academic year','Add faculty and management users','Set up classes or departments'];
export default function ManagementDashboard({user,onLogout}:{user:TenantUser;onLogout:()=>void}) {
  const [active,setActive] = useState('Dashboard');
  const [mobileOpen,setMobileOpen] = useState(false);
  const [search,setSearch] = useState('');
  const navigate = useNavigate();
  const institution = user.institutionName || user.tenantName || 'Your institution';
  const select = (page:string) => {setActive(page);setMobileOpen(false);};
  const filtered = menu.filter(item=>item.label.toLowerCase().includes(search.toLowerCase()));
  return <div className="min-h-screen bg-slate-50 text-slate-900 md:flex" style={{fontFamily:'Inter, system-ui, sans-serif'}}>
    {mobileOpen && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-slate-900/40 md:hidden" onClick={()=>setMobileOpen(false)}/>}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${mobileOpen?'translate-x-0':'-translate-x-full'}`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-600 p-2.5 text-white"><GraduationCap size={23}/></span><div><p className="text-lg font-extrabold leading-tight">EduSphere</p><p className="text-xs font-medium tracking-wide text-slate-500">MANAGEMENT PORTAL</p></div></div>
        <button className="md:hidden" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"><X/></button>
      </div>
      <div className="px-4 pt-5"><div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Current institution</p><p className="mt-1 break-words text-base font-bold">{institution}</p><p className="mt-1 text-sm text-slate-600">{user.tenantType || 'Education institution'} {user.tenantCode?'· '+user.tenantCode:''}</p></div></div>
      <nav aria-label="Management navigation" className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {menu.map(({label,icon:Icon})=><button key={label} onClick={()=>select(label)} aria-current={active===label?'page':undefined} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-semibold transition-colors ${active===label?'bg-indigo-50 text-indigo-700':'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><Icon size={19}/><span>{label}</span>{active===label&&<ChevronRight size={16} className="ml-auto"/>}</button>)}
      </nav>
      <div className="border-t border-slate-100 p-4"><button onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-semibold text-rose-600 hover:bg-rose-50"><LogOut size={19}/> Sign out</button></div>
    </aside>
    <div className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-7">
        <div className="flex min-w-0 items-center gap-3"><button className="rounded-lg p-2 hover:bg-slate-100 md:hidden" aria-label="Open navigation" onClick={()=>setMobileOpen(true)}><Menu/></button><div className="min-w-0"><p className="truncate text-lg font-bold">{active}</p><p className="truncate text-xs text-slate-500">{institution}</p></div></div>
        <div className="flex items-center gap-2 sm:gap-4"><button title="Notifications (coming soon)" className="rounded-xl border border-slate-200 p-2.5 text-slate-600"><Bell size={20}/></button><div className="flex items-center gap-3 border-l border-slate-200 pl-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 font-bold text-indigo-700">{(user.name||'M').charAt(0).toUpperCase()}</span><div className="hidden sm:block"><p className="text-sm font-bold">{user.name||'Management'}</p><p className="text-xs text-slate-500">{user.email||'Management account'}</p></div></div></div>
      </header>
      <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-7">
        {active==='Dashboard'?<>
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm font-semibold text-indigo-600">MANAGEMENT OVERVIEW</p><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Welcome back{user.name?', '+user.name.split(' ')[0]:''}!</h1><p className="mt-2 text-base text-slate-600">Here's your institution workspace. Start by completing the setup steps below.</p></div><button onClick={()=>select('Institution Profile')} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700"><Building2 size={18}/> Institution profile</button></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{label:'Students',icon:GraduationCap},{label:'Faculty',icon:Users},{label:'Attendance Today',icon:ClipboardCheck},{label:'Pending Tasks',icon:Clock}].map(({label,icon:Icon})=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500">{label}</p><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icon size={20}/></span></div><p className="mt-4 text-2xl font-bold text-slate-400">—</p><p className="mt-2 text-sm text-slate-500">Awaiting connected data</p></div>)}</div>
          <div className="grid gap-5 xl:grid-cols-3"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-bold">Getting started</h2><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Setup checklist</span></div><div className="space-y-3">{upcoming.map((task,i)=><button key={task} onClick={()=>select(i===0?'Institution Profile':i===1?'Academic Setup':i===2?'Faculty':'Academic Setup')} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/40"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">{i+1}</span><span className="flex-1 text-base font-medium">{task}</span><ChevronRight size={18} className="text-slate-400"/></button>)}</div></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Quick actions</h2><p className="mb-5 mt-1 text-sm text-slate-500">Open the module you want to configure.</p><div className="space-y-3">{[{label:'Manage students',page:'Students'},{label:'Manage faculty',page:'Faculty'},{label:'Academic setup',page:'Academic Setup'},{label:'View reports',page:'Reports & Analytics'}].map(action=><button key={action.page} onClick={()=>select(action.page)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left text-[15px] font-semibold hover:bg-indigo-50">{action.label}<Plus size={18} className="text-indigo-600"/></button>)}</div></section></div>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-bold">Activity & analytics</h2><div className="mt-5 flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center"><BarChart3 className="text-slate-400" size={28}/><p className="mt-3 font-semibold">No analytics available yet</p><p className="mt-1 text-sm text-slate-500">Attendance and enrollment trends will appear when their APIs are connected.</p></div></section>
        </>:<><div className="flex items-center gap-3"><span className="rounded-xl bg-indigo-50 p-3 text-indigo-600">{(()=>{const Icon=menu.find(m=>m.label===active)?.icon||LayoutDashboard;return <Icon size={25}/>})()}</span><div><h1 className="text-2xl font-extrabold sm:text-3xl">{active}</h1><p className="mt-1 text-base text-slate-600">Manage {active.toLowerCase()} for {institution}.</p></div></div>
          {active==='Institution Profile'?<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="mb-5 text-xl font-bold">Institution information</h2><dl className="grid gap-5 sm:grid-cols-2">{[['Institution name',institution],['Institution code',user.tenantCode||'Not available'],['Institution type',user.tenantType||'Not available'],['Management email',user.email||'Not available']].map(([k,v])=><div key={k} className="rounded-xl bg-slate-50 p-4"><dt className="text-sm font-semibold text-slate-500">{k}</dt><dd className="mt-2 break-words text-base font-bold">{v}</dd></div>)}</dl><p className="mt-5 text-sm text-slate-500">Profile editing requires a connected institution settings API.</p></section>:<section className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CircleHelp size={32} className="text-indigo-500"/><h2 className="mt-4 text-xl font-bold">{active} module</h2><p className="mt-2 max-w-lg text-base text-slate-600">The navigation and page layout are ready. Data tables, forms, permissions, and backend operations for this module will be added in the next implementation phase.</p><button onClick={()=>select('Dashboard')} className="mt-6 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white">Back to dashboard</button></section>}
        </>}
      </main>
    </div>
  </div>;
}
