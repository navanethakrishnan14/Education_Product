import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Globe2, Save, ShieldCheck, MapPin, GraduationCap, Image, Landmark, Users, CalendarDays, BookOpen, BadgeCheck } from 'lucide-react';

type Draft = Record<string, string>;
type Props = { organization: string; tenantId?: string; name?: string; code?: string | null; email?: string };
const schoolSections = [
  { title: 'Basic Organization Information', subtitle: 'Official identity and primary contact information', icon: Building2, fields: [['Organization Legal Name','name'],['Trade / Display Name','displayName'],['Institution Classification','classification'],['System Identification Code','systemCode'],['Board / Affiliation / Registration No.','registration'],['Academic System Model','academicModel'],['Primary Official Email','email'],['Primary Contact Phone','phone'],['Official Website Address','website'],['Primary Address','address']] },
  { title: 'Campus Headquarters & Regional Liaison', subtitle: 'Main campus location and administrative contacts', icon: MapPin, fields: [['Address Line 1','address1'],['Address Line 2','address2'],['City','city'],['State / Province','state'],['Postal / ZIP Code','postal'],['Country / Jurisdiction','country'],['Primary Administrative Liaison','liaison'],['Liaison Email','liaisonEmail'],['Liaison Phone','liaisonPhone']] },
  { title: 'Academic Configuration & Standards', subtitle: 'Academic year, curriculum and grading configuration', icon: GraduationCap, fields: [['Active Academic Session','session'],['Academic Calendar','calendar'],['Academic Departments','departments'],['Grading / Evaluation Scale','grading'],['Academic Calendar Sync Hook','calendarSync']] }
];
const collegeSections = [
  { title: 'Basic College Information', subtitle: 'Official college identity, affiliation and contact details', icon: Building2, fields: [['College Legal Name','name'],['College Display Name','displayName'],['College Type','classification'],['University Affiliation','affiliation'],['UGC / AICTE / Approval Number','approval'],['NAAC Grade','naac'],['Official Email','email'],['Contact Phone','phone'],['Official Website','website'],['Year Established','established']] },
  { title: 'Campus Address & Administration', subtitle: 'College campus location and administration contacts', icon: MapPin, fields: [['Address Line 1','address1'],['Address Line 2','address2'],['City','city'],['State / Province','state'],['Postal / ZIP Code','postal'],['Country','country'],['Principal / Dean Name','liaison'],['Administrative Email','liaisonEmail'],['Administrative Phone','liaisonPhone']] },
  { title: 'Academic Configuration & Standards', subtitle: 'Courses, departments, academic calendar and grading', icon: GraduationCap, fields: [['Active Academic Year','session'],['Semester / Term System','calendar'],['Departments / Faculties','departments'],['Degree Programs Offered','programs'],['Grading / Evaluation Scale','grading'],['Academic Calendar Sync','calendarSync']] }
];
const defaults: Draft = { name:'', displayName:'', code:'', email:'', phone:'', website:'', address:'', address1:'', address2:'', city:'', state:'', country:'India', postal:'', classification:'', systemCode:'', registration:'', academicModel:'Semester & Dual Credit System', affiliation:'', approval:'', naac:'', established:'', liaison:'', liaisonEmail:'', liaisonPhone:'', session:'2024–2025', calendar:'Semester Model', departments:'6 Departments', programs:'', grading:'4.0 Scale / Letter Grade', calendarSync:'' };
const inputClass = 'mt-1.5 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100';
export default function OrganizationProfilePage({ organization, tenantId, name, code, email }: Props) {
  const key = 'edusphere_profile:' + (tenantId || 'tenant');
  const isCollege = organization.toLowerCase().includes('college');
  const sections = isCollege ? collegeSections : schoolSections;
  const [draft, setDraft] = useState<Draft>(() => {
    const base = { ...defaults, name: name || '', displayName: name || '', code: code || '', email: email || '' };
    try { return { ...base, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { return base; }
  });
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const apiBase = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim().replace(/\/$/, '');
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
      if (!token) { if (!cancelled) { setNotice('Please sign in with a Management account to load the organization profile.'); setLoading(false); } return; }
      try {
        const response = await fetch(apiBase + '/organization-profile', { headers: { Accept: 'application/json', Authorization: 'Bearer ' + token } });
        const payload = await response.json().catch(() => ({})) as { success?: boolean; profile?: Draft | null; message?: string };
        if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to load organization profile.');
        if (!cancelled && payload.profile) { const saved = { ...payload.profile }; delete saved.organizationType; setDraft(current => ({ ...current, ...saved })); }
      } catch (error) { if (!cancelled) setNotice(error instanceof Error ? error.message : 'Unable to connect to the Tenant Backend.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void loadProfile();
    return () => { cancelled = true; };
  }, [apiBase]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setSaving(true); setNotice('');
    const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token');
    if (!token) { setNotice('Please sign in with a Management account before saving.'); setSaving(false); return; }
    try {
      const response = await fetch(apiBase + '/organization-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ organizationType: organization, profile: draft }) });
      const payload = await response.json().catch(() => ({})) as { success?: boolean; message?: string; profile?: Draft };
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to save organization profile.');
      if (payload.profile) { const saved = { ...payload.profile }; delete saved.organizationType; setDraft(current => ({ ...current, ...saved })); }
      localStorage.setItem(key, JSON.stringify(draft));
      setNotice('Organization profile saved successfully to the database.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to connect to the Tenant Backend.'); }
    finally { setSaving(false); }
  }
  const field = (label: string, k: string) => (
    <label key={k} className="block min-w-0 text-xs font-semibold text-slate-600">{label}
      {['classification','academicModel','calendar','grading','country','naac'].includes(k) ? (
        <select className={inputClass} value={draft[k] || ''} onChange={e => setDraft({ ...draft, [k]: e.target.value })}>
          {(k === 'classification' ? (isCollege ? ['Arts & Science College','Engineering College','Medical College','Polytechnic College','University College','Autonomous College','Other'] : ['Primary & Secondary School','Higher Secondary School','Matriculation School','CBSE School','ICSE School','International School','Other']) : k === 'academicModel' ? ['Semester & Dual Credit System','Annual System','Semester System'] : k === 'calendar' ? ['Semester Model','Trimester Model','Annual Model','Quarter System'] : k === 'grading' ? ['4.0 Scale / Letter Grade','Percentage','CGPA / GPA','Grade Points'] : k === 'naac' ? ['Not Accredited','A++','A+','A','B++','B+','B'] : ['India','United States','United Kingdom','Canada','Australia','Other']).map(v => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : <input className={inputClass} type={k.toLowerCase().includes('email') ? 'email' : 'text'} value={draft[k] || ''} onChange={e => setDraft({ ...draft, [k]: e.target.value })} />}
    </label>
  );
  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="mb-2 text-xs font-medium text-slate-400"></div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{organization} Profile</h1><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">● Active · Multi-Campus Enabled</span></div><p className="mt-1 text-sm text-slate-500">Manage your institution’s identity, contact information, and organizational details.</p></div>
      <div className="flex gap-2"><span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><ShieldCheck size={15}/> Profile overview</span><button type="submit" form="org-profile-form" className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-900"><Save size={15}/> {saving ? "Saving…" : "Save Profile"}</button></div>
    </div>
    {loading && <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">Loading organization profile…</p>}\n    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex min-w-0 items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-violet-800"><Building2 size={28}/></div><div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-slate-900">{draft.displayName || draft.name || (isCollege ? 'College Name' : 'School Name')}</h2><p className="mt-1 text-xs text-slate-500">{isCollege ? 'Accredited College / Higher Education Institution' : 'Accredited School / K–12 Education Institution'}</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{draft.classification || (isCollege ? 'College / University' : 'School / K–12')}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Active</span></div></div></div><div className="grid grid-cols-2 gap-3 sm:min-w-48"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Organization Code</p><p className="mt-1 text-sm font-extrabold text-slate-800">{draft.code || 'Not assigned'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Established</p><p className="mt-1 text-sm font-extrabold text-slate-800">{draft.established || 'Not provided'}</p></div></div></div>
        <form id="org-profile-form" onSubmit={save} className="space-y-5">{sections.map((section, index) => { const Icon = section.icon; return <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-800"><Icon size={17}/></div><div><h3 className="text-sm font-extrabold text-slate-800">{section.title}</h3><p className="mt-1 text-xs text-slate-500">{section.subtitle}</p></div></div><span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Section 0{index + 1}</span></div><div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{section.fields.map(([label,k]) => field(label,k))}</div></section>; })}<div className="flex justify-end"><button className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-900"><Save size={16}/> {saving ? "Saving…" : "Save organization profile"}</button></div></form>
      </div>
      <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center gap-2"><Image size={16} className="text-violet-800"/><h3 className="text-sm font-extrabold text-slate-800">Visual Identity & Theme</h3></div><div className="space-y-3"><div className="flex items-center gap-3"><span className="h-8 w-8 rounded-lg bg-violet-800"/><div><p className="text-xs font-bold text-slate-700">Primary Brand Accent</p><p className="text-[10px] text-slate-400">Violet · #5B21B6</p></div></div><div className="flex items-center gap-3"><span className="h-8 w-8 rounded-lg bg-slate-900"/><div><p className="text-xs font-bold text-slate-700">Navigation / Header</p><p className="text-[10px] text-slate-400">Midnight Slate</p></div></div><div className="rounded-xl bg-slate-900 p-3 text-white"><div className="flex items-center gap-2"><GraduationCap size={18}/><span className="text-xs font-bold">{draft.displayName || draft.name || organization}</span></div><p className="mt-2 text-[10px] text-slate-300">Institution workspace preview</p><div className="mt-3 rounded-md bg-violet-700 px-3 py-2 text-center text-[10px] font-bold">Academic Session: {draft.session || 'Not set'}</div></div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><BadgeCheck size={16} className="text-violet-800"/><h3 className="text-sm font-extrabold text-slate-800">Subscription Entitlements</h3></div><div className="rounded-xl bg-violet-50 p-3"><p className="text-xs font-extrabold text-violet-900">Enterprise Unlimited Tier</p><p className="mt-1 text-[10px] text-violet-800">All core academic modules enabled</p></div><div className="mt-3 space-y-3 text-xs">{[[Users,'Student / Learner Quota','Unlimited Seats'],[BookOpen,'Academic Modules','All Enabled'],[Landmark,'Institution Units','Multi-Campus'],[CalendarDays,'Access Model','Role-Based Access']].map(([I,label,value]:any)=><div key={label} className="flex items-start justify-between gap-2"><span className="flex items-center gap-2 text-slate-500"><I size={13}/>{label}</span><span className="text-right font-bold text-slate-700">{value}</span></div>)}</div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500">Profile changes update this browser’s saved profile. Server-side synchronization depends on the organization profile API.</div></section></aside>
    </div>
    {notice && <p role="status" className={`rounded-xl border p-3 text-sm font-medium ${notice.toLowerCase().includes('successfully') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>{notice}</p>}
  </div>;
}
