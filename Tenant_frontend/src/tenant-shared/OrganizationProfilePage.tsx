import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Save, ShieldCheck, MapPin, GraduationCap, Image, Landmark, Users, CalendarDays, BookOpen, BadgeCheck, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

type Draft = Record<string, string>;
type Props = { organization: 'School' | 'College' | 'Institution' | string; tenantId?: string; name?: string; code?: string | null; email?: string };
type ApiPayload = { success?: boolean; profile?: Draft | null; organizationType?: string | null; updatedAt?: string | null; message?: string; hint?: string; code?: string };
const schoolSections = [
  { title: 'Basic Organization Information', subtitle: 'Official identity and primary contact information', icon: Building2, fields: [['Organization Legal Name','name'],['Trade / Display Name','displayName'],['Institution Classification','classification'],['System Identification Code','systemCode'],['Board / Affiliation / Registration No.','registration'],['Academic System Model','academicModel'],['Primary Official Email','email'],['Primary Contact Phone','phone'],['Official Website Address','website'],['Primary Address','address']] },
  { title: 'Campus Headquarters & Regional Liaison', subtitle: 'Main campus location and administrative contacts', icon: MapPin, fields: [['Address Line 1','address1'],['Address Line 2','address2'],['City','city'],['State / Province','state'],['Postal / ZIP Code','postal'],['Country / Jurisdiction','country'],['Primary Administrative Liaison','liaison'],['Liaison Email','liaisonEmail'],['Liaison Phone','liaisonPhone']] },
  { title: 'Academic Configuration & Standards', subtitle: 'Academic year, curriculum and grading configuration', icon: GraduationCap, fields: [['Active Academic Session','session'],['Academic Calendar','calendar'],['Academic Departments','departments'],['Grading / Evaluation Scale','grading'],['Academic Calendar Sync Hook','calendarSync']] },
];
const collegeSections = [
  { title: 'Basic College Information', subtitle: 'Official college identity, affiliation and contact details', icon: Building2, fields: [['College Legal Name','name'],['College Display Name','displayName'],['College Type','classification'],['University Affiliation','affiliation'],['UGC / AICTE / Approval Number','approval'],['NAAC Grade','naac'],['Official Email','email'],['Contact Phone','phone'],['Official Website','website'],['Year Established','established']] },
  { title: 'Campus Address & Administration', subtitle: 'College campus location and administration contacts', icon: MapPin, fields: [['Address Line 1','address1'],['Address Line 2','address2'],['City','city'],['State / Province','state'],['Postal / ZIP Code','postal'],['Country','country'],['Principal / Dean Name','liaison'],['Administrative Email','liaisonEmail'],['Administrative Phone','liaisonPhone']] },
  { title: 'Academic Configuration & Standards', subtitle: 'Courses, departments, academic calendar and grading', icon: GraduationCap, fields: [['Active Academic Year','session'],['Semester / Term System','calendar'],['Departments / Faculties','departments'],['Degree Programs Offered','programs'],['Grading / Evaluation Scale','grading'],['Academic Calendar Sync','calendarSync']] },
];
const defaults: Draft = { name:'', displayName:'', code:'', email:'', phone:'', website:'', address:'', address1:'', address2:'', city:'', state:'', country:'India', postal:'', classification:'', systemCode:'', registration:'', academicModel:'Semester & Dual Credit System', affiliation:'', approval:'', naac:'', established:'', liaison:'', liaisonEmail:'', liaisonPhone:'', session:'', calendar:'Semester Model', departments:'', programs:'', grading:'4.0 Scale / Letter Grade', calendarSync:'' };
const inputClass = 'mt-1.5 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';
function normalizedType(value: string): 'School' | 'College' | 'Institution' {
  const lower = value.toLowerCase();
  return lower.includes('college') ? 'College' : lower.includes('institution') ? 'Institution' : 'School';
}
function freshDraft(name?: string, code?: string | null, email?: string): Draft {
  return { ...defaults, name: name || '', displayName: name || '', code: code || '', email: email || '' };
}
function readToken(): string {
  return localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token') || '';
}
async function readApiPayload(response: Response): Promise<ApiPayload> {
  const payload = await response.json().catch(() => ({})) as ApiPayload;
  if (!response.ok || !payload.success) {
    const error = new Error(payload.message || `Request failed (HTTP ${response.status}).`) as Error & { code?: string; hint?: string; status?: number };
    error.code = payload.code;
    error.hint = payload.hint;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export default function OrganizationProfilePage({ organization, tenantId, name, code, email }: Props) {
  const type = useMemo(() => normalizedType(organization), [organization]);
  const key = 'edusphere_profile:' + (tenantId || 'tenant');
  const sections = type === 'College' ? collegeSections : schoolSections;
  const [draft, setDraft] = useState<Draft>(() => freshDraft(name, code, email));
  const [savedDraft, setSavedDraft] = useState<Draft>(() => freshDraft(name, code, email));
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const apiBase = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim().replace(/\/$/, '');
  const isDirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedDraft), [draft, savedDraft]);

  const loadProfile = useCallback(async (showNotice = false) => {
    const token = readToken();
    if (!token) {
      setNotice({ kind: 'error', text: 'Your sign-in session was not found. Please sign out and sign in again with your Management account.' });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(apiBase + '/organization-profile', {
        headers: { Accept: 'application/json', Authorization: 'Bearer ' + token },
        cache: 'no-store',
      });
      const payload = await readApiPayload(response);
      const serverType = normalizedType(payload.organizationType || payload.profile?.organizationType || type);
      if (serverType !== type) {
        throw new Error(`This tenant is registered as a ${serverType.toLowerCase()}, but this workspace is configured for ${type.toLowerCase()}. No profile was changed. Please correct the tenant type in Platform Admin, then sign in again.`);
      }
      const base = freshDraft(name, code, email);
      const serverProfile = { ...(payload.profile || {}) };
      delete serverProfile.organizationType;
      const merged = { ...base, ...serverProfile };
      setDraft(merged);
      setSavedDraft(merged);
      setLoaded(true);
      try { localStorage.setItem(key, JSON.stringify(merged)); } catch { /* Browser storage is a convenience cache only. */ }
      if (showNotice) setNotice({ kind: 'success', text: payload.updatedAt ? 'Profile reloaded from the database.' : 'No saved profile yet. Complete the details and save to the database.' });
      else setNotice(null);
    } catch (error) {
      const err = error as Error & { code?: string; hint?: string; status?: number };
      const extra = err.hint ? ' ' + err.hint : '';
      setNotice({ kind: 'error', text: (err.message || 'Unable to load the organization profile.') + extra });
    } finally {
      setLoading(false);
    }
  }, [apiBase, email, key, name, code, type]);

  useEffect(() => { void loadProfile(); }, [loadProfile]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (saving || loading) return;
    const token = readToken();
    if (!token) {
      setNotice({ kind: 'error', text: 'Your sign-in session was not found. Please sign out and sign in again.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const profileToSave = Object.fromEntries(Object.entries(draft).map(([fieldKey, value]) => [fieldKey, value.trim()])) as Draft;
      const response = await fetch(apiBase + '/organization-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ organizationType: type, profile: profileToSave }),
      });
      const payload = await readApiPayload(response);
      const returnedType = normalizedType(payload.organizationType || payload.profile?.organizationType || type);
      if (returnedType !== type) throw new Error('The server returned a different organization type. The profile was not updated in this screen.');
      const saved = { ...freshDraft(name, code, email), ...(payload.profile || profileToSave) };
      delete saved.organizationType;
      setDraft(saved);
      setSavedDraft(saved);
      try { localStorage.setItem(key, JSON.stringify(saved)); } catch { /* Database remains the source of truth. */ }
      setNotice({ kind: 'success', text: 'Organization profile saved to the database successfully.' });
      setLoaded(true);
    } catch (error) {
      const err = error as Error & { hint?: string };
      setNotice({ kind: 'error', text: (err.message || 'Unable to save the organization profile.') + (err.hint ? ' ' + err.hint : '') });
    } finally {
      setSaving(false);
    }
  }

  const updateField = (fieldKey: string, value: string) => {
    setDraft(current => ({ ...current, [fieldKey]: value }));
    setNotice(current => current?.kind === 'success' ? null : current);
  };
  const field = (label: string, fieldKey: string) => {
    const isEmail = fieldKey.toLowerCase().includes('email');
    const isUrl = fieldKey === 'website';
    const isPhone = fieldKey.toLowerCase().includes('phone');
    return <label key={fieldKey} className="block min-w-0 text-xs font-semibold text-slate-600">{label}
      {['classification','academicModel','calendar','grading','country','naac'].includes(fieldKey) ? (
        <select className={inputClass} value={draft[fieldKey] || ''} disabled={loading || saving} onChange={e => updateField(fieldKey, e.target.value)}>
          {(fieldKey === 'classification' ? (type === 'College' ? ['Arts & Science College','Engineering College','Medical College','Polytechnic College','University College','Autonomous College','Other'] : ['Primary & Secondary School','Higher Secondary School','Matriculation School','CBSE School','ICSE School','International School','Other']) : fieldKey === 'academicModel' ? ['Semester & Dual Credit System','Annual System','Semester System'] : fieldKey === 'calendar' ? ['Semester Model','Trimester Model','Annual Model','Quarter System'] : fieldKey === 'grading' ? ['4.0 Scale / Letter Grade','Percentage','CGPA / GPA','Grade Points'] : fieldKey === 'naac' ? ['Not Accredited','A++','A+','A','B++','B+','B'] : ['India','United States','United Kingdom','Canada','Australia','Other']).map(value => <option key={value} value={value}>{value}</option>)}
        </select>
      ) : <input className={inputClass} type={isEmail ? 'email' : isUrl ? 'url' : isPhone ? 'tel' : fieldKey === 'established' ? 'number' : 'text'} inputMode={isPhone ? 'tel' : undefined} min={fieldKey === 'established' ? 1800 : undefined} max={fieldKey === 'established' ? new Date().getFullYear() : undefined} maxLength={fieldKey === 'established' ? undefined : 5000} value={draft[fieldKey] || ''} disabled={loading || saving} onChange={e => updateField(fieldKey, e.target.value)} />
      }
    </label>;
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-8">
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 text-xs font-medium text-slate-400">ORGANIZATION SETTINGS</div>
        <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{type} Profile</h1><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800">● Tenant profile</span></div>
        <p className="mt-1 text-sm text-slate-500">Manage official identity, contact information, campus details and academic configuration.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600"><ShieldCheck size={15}/> {loaded ? 'Database connected' : 'Profile status'}</span>
        <button type="button" onClick={() => void loadProfile(true)} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14}/> Reload</button>
        <button type="submit" form="org-profile-form" disabled={loading || saving || !isDirty} className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"><Save size={15}/> {saving ? 'Saving…' : 'Save Profile'}</button>
      </div>
    </div>

    {loading && <p role="status" className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-500">Loading organization profile from the database…</p>}
    {notice && <div role="status" aria-live="polite" className={`flex items-start gap-2 rounded-xl border p-3 text-sm font-medium ${notice.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : notice.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>{notice.kind === 'success' ? <CheckCircle2 size={17} className="mt-0.5 shrink-0"/> : <AlertCircle size={17} className="mt-0.5 shrink-0"/>}<span>{notice.text}</span></div>}
    {!loading && !loaded && notice?.kind === 'error' && <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-bold text-slate-800">Your data has not been changed.</p><p className="mt-1 text-xs text-slate-500">Fix the connection or session issue and use Reload to try again. The profile is not saved only to this browser.</p></div>}

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 space-y-5">
        <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex min-w-0 items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-violet-800"><Building2 size={28}/></div><div className="min-w-0"><h2 className="truncate text-lg font-extrabold text-slate-900">{draft.displayName || draft.name || (type === 'College' ? 'College Name' : type === 'Institution' ? 'Institution Name' : 'School Name')}</h2><p className="mt-1 text-xs text-slate-500">{type === 'College' ? 'Higher education institution' : type === 'Institution' ? 'Institution workspace' : 'School / K–12 education institution'}</p><div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{draft.classification || (type === 'College' ? 'College / University' : type === 'Institution' ? 'Institution' : 'School / K–12')}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Tenant-scoped</span></div></div></div><div className="grid grid-cols-2 gap-3 sm:min-w-48"><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Organization Code</p><p className="mt-1 text-sm font-extrabold text-slate-800">{draft.code || 'Not assigned'}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-[10px] font-semibold text-slate-500">Established</p><p className="mt-1 text-sm font-extrabold text-slate-800">{draft.established || 'Not provided'}</p></div></div></div>
        <form id="org-profile-form" onSubmit={save} className="space-y-5">{sections.map((section, index) => { const Icon = section.icon; return <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-5 flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="rounded-lg bg-violet-50 p-2 text-violet-800"><Icon size={17}/></div><div><h3 className="text-sm font-extrabold text-slate-800">{section.title}</h3><p className="mt-1 text-xs text-slate-500">{section.subtitle}</p></div></div><span className="shrink-0 rounded-md bg-slate-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-slate-400">Section 0{index + 1}</span></div><div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">{section.fields.map(([label, fieldKey]) => field(label, fieldKey))}</div></section>; })}<div className="flex justify-end"><button type="submit" disabled={loading || saving || !isDirty} className="inline-flex items-center gap-2 rounded-lg bg-violet-800 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"><Save size={16}/>{saving ? 'Saving…' : 'Save organization profile'}</button></div></form>
      </div>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex items-center gap-2"><Image size={16} className="text-violet-800"/><h3 className="text-sm font-extrabold text-slate-800">Visual Identity & Theme</h3></div><div className="space-y-3"><div className="flex items-center gap-3"><span className="h-8 w-8 rounded-lg bg-violet-800"/><div><p className="text-xs font-bold text-slate-700">Primary Brand Accent</p><p className="text-[10px] text-slate-400">Violet · #5B21B6</p></div></div><div className="flex items-center gap-3"><span className="h-8 w-8 rounded-lg bg-slate-900"/><div><p className="text-xs font-bold text-slate-700">Navigation / Header</p><p className="text-[10px] text-slate-400">Midnight Slate</p></div></div><div className="rounded-xl bg-slate-900 p-3 text-white"><div className="flex items-center gap-2"><GraduationCap size={18}/><span className="text-xs font-bold">{draft.displayName || draft.name || organization}</span></div><p className="mt-2 text-[10px] text-slate-300">Institution workspace preview</p><div className="mt-3 rounded-md bg-violet-700 px-3 py-2 text-center text-[10px] font-bold">Academic Session: {draft.session || 'Not set'}</div></div></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-3 flex items-center gap-2"><BadgeCheck size={16} className="text-violet-800"/><h3 className="text-sm font-extrabold text-slate-800">Profile Details</h3></div><div className="mt-3 space-y-3 text-xs">{[[Users,'Tenant ID',tenantId || 'Unavailable'],[BookOpen,'Organization Type',type],[Landmark,'Organization Code',code || 'Not assigned'],[CalendarDays,'Saved Status',loaded ? (isDirty ? 'Unsaved changes' : 'Up to date') : 'Not loaded']].map(([Icon,label,value]: any) => <div key={label} className="flex items-start justify-between gap-2"><span className="flex items-center gap-2 text-slate-500"><Icon size={13}/>{label}</span><span className="max-w-[145px] break-words text-right font-bold text-slate-700">{value}</span></div>)}</div><div className="mt-4 rounded-lg bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500">The database is the source of truth. Browser storage is only a convenience cache and is never treated as a successful save.</div></section>
      </aside>
    </div>
  </div>;
}
