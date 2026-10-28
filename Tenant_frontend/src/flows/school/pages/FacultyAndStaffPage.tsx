import { useEffect, useMemo, useState, type FormEvent, type ReactNode, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, Check, CircleUserRound, GraduationCap, Mail, Plus, Search, ShieldCheck, Users } from 'lucide-react';

type StaffRecord = { id: string; name: string; email: string; category: string; status: 'Active' | 'Inactive'; notes?: string };
type Props = { tenantId?: string; institution: string };
type Form = {
  staffType: 'FACULTY' | 'STAFF'; firstName: string; lastName: string; employeeId: string;
  designation: string; department: string; joiningDate: string; dob: string; gender: string;
  qualification: string; experience: string; employmentType: string; subject: string;
  email: string; phone: string; emergencyContact: string; address: string;
  password: string; confirmPassword: string;
};
const initial: Form = { staffType:'FACULTY', firstName:'', lastName:'', employeeId:'', designation:'', department:'',
  joiningDate:'', dob:'', gender:'', qualification:'', experience:'', employmentType:'Full-time', subject:'',
  email:'', phone:'', emergencyContact:'', address:'', password:'', confirmPassword:'' };
const steps = [
  { title:'Basic information', subtitle:'Personal details and role' },
  { title:'Professional details', subtitle:'Position and qualifications' },
  { title:'Contact & address', subtitle:'How to reach this person' },
  { title:'Account setup', subtitle:'Create secure portal access' },
];
const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10';
const labelClass = 'block text-xs font-bold tracking-wide text-slate-600';
function Field({label,children,required}:{label:string;children:ReactNode;required?:boolean}) {
  return <label className={labelClass}>{label}{required && <span className="ml-1 text-rose-500">*</span>}{children}</label>;
}
export default function FacultyAndStaffPage({ tenantId, institution }: Props) {
  const [records,setRecords] = useState<StaffRecord[]>([]);
  const [form,setForm] = useState<Form>(initial);
  const [step,setStep] = useState(0);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [notice,setNotice] = useState('');
  const [search,setSearch] = useState('');
  const [showForm,setShowForm] = useState(false);
  const base = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim().replace(/\/$/,'');
  const token = localStorage.getItem('tenant_token') || sessionStorage.getItem('tenant_token') || '';
  const headers = useMemo(()=>({ 'Content-Type':'application/json', Accept:'application/json', Authorization:'Bearer '+token }),[token]);
  async function load() {
    try {
      const res=await fetch(base+'/records?module=Faculty%20%26%20Staff',{headers});
      const data=await res.json();
      if(res.ok && Array.isArray(data.records)) setRecords(data.records);
    } catch { /* Keep the creation form usable and show the backend error on submit. */ }
  }
  useEffect(()=>{ void load(); },[base,token,tenantId]);
  function set<K extends keyof Form>(key:K,value:Form[K]) { setForm(old=>({...old,[key]:value})); }
  function validateStep() {
    if(step===0 && (!form.firstName.trim() || !form.lastName.trim() || !form.employeeId.trim() || !form.gender)) return 'Complete the required personal details before continuing.';
    if(step===1 && (!form.designation.trim() || !form.department.trim() || !form.joiningDate || !form.employmentType)) return 'Complete designation, department, joining date, and employment type.';
    if(step===2 && (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || !form.phone.trim())) return 'Enter a valid email address and phone number.';
    if(step===3) {
      if(form.password.length<8) return 'Set an initial password with at least 8 characters.';
      if(form.password!==form.confirmPassword) return 'The passwords do not match.';
    }
    return '';
  }
  function next(){ const issue=validateStep(); if(issue){setError(issue);return;} setError('');setStep(s=>Math.min(3,s+1)); }
  async function submit(e:FormEvent) {
    e.preventDefault(); const issue=validateStep(); if(issue){setError(issue);return;}
    setBusy(true);setError('');setNotice('');
    const name=(form.firstName+' '+form.lastName).trim();
    try {
      const response=await fetch(base+'/records/accounts',{method:'POST',headers,body:JSON.stringify({
        module:'Faculty & Staff', name, email:form.email.trim().toLowerCase(), role:form.staffType,
        password:form.password, employeeId:form.employeeId.trim(), designation:form.designation,
        department:form.department, joiningDate:form.joiningDate, dob:form.dob || null, gender:form.gender,
        qualification:form.qualification, experience:form.experience, employmentType:form.employmentType,
        subject:form.subject, phone:form.phone.trim(), emergencyContact:form.emergencyContact,
        address:form.address, status:'Active'
      })});
      const data=await response.json().catch(()=>({}));
      if(!response.ok) throw new Error(data.message || 'Unable to create the account. Check the Tenant API and database.');
      setNotice('Faculty/staff profile and login account created successfully. Share the initial password securely with the staff member.');
      setForm(initial);setStep(0);setShowForm(false);await load();
    } catch(err) { setError(err instanceof Error?err.message:'Something went wrong while creating the account.'); }
    finally { setBusy(false); }
  }
  const filtered=records.filter(r=>(r.name+' '+r.email+' '+r.category).toLowerCase().includes(search.toLowerCase()));
  const field=(key:keyof Form)=>(e:ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>set(key,e.target.value as never);
  const text=(key:keyof Form,label:string,required=false,type='text',placeholder='')=><Field label={label} required={required}><input className={inputClass} type={type} value={String(form[key])} onChange={field(key)} placeholder={placeholder} /></Field>;
  const select=(key:keyof Form,label:string,options:string[],required=false)=><Field label={label} required={required}><select className={inputClass} value={String(form[key])} onChange={field(key)}><option value="">Select {label.toLowerCase()}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select></Field>;
  return <div className="space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-teal-700"><span className="h-2 w-2 rounded-full bg-teal-500"/> People & workforce</div><h2 className="text-3xl font-black tracking-tight text-slate-900">Faculty & Staff</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage teaching and non-teaching teams at <span className="font-semibold text-slate-700">{institution}</span>, and set up secure portal access.</p></div>
      {!showForm && <button onClick={()=>{setShowForm(true);setNotice('');setError('');}} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-teal-900/15 transition hover:bg-teal-800"><Plus size={17}/> Add faculty / staff</button>}
    </div>
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{notice}</div>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">{error}</div>}
    {showForm ? <form onSubmit={submit} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50 via-white to-white px-5 py-6 sm:px-8">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.15em] text-teal-700">New team member</p><h3 className="mt-1 text-xl font-extrabold text-slate-900">{steps[step].title}</h3><p className="mt-1 text-sm text-slate-500">{steps[step].subtitle}</p></div><button type="button" onClick={()=>{setShowForm(false);setError('');}} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button></div>
        <div className="mt-6 grid grid-cols-4 gap-2">{steps.map((s,i)=><div key={s.title}><div className={'h-1.5 rounded-full '+(i<=step?'bg-teal-600':'bg-slate-100')}/><div className={'mt-2 text-[10px] font-bold sm:text-xs '+(i===step?'text-teal-800':'text-slate-400')}>{i+1}. {s.title}</div></div>)}</div>
      </div>
      <div className="px-5 py-7 sm:px-8">
        {step===0 && <div className="space-y-6"><div><p className="mb-3 text-sm font-extrabold text-slate-800">Choose team member type</p><div className="grid gap-3 sm:grid-cols-2">{([{value:'FACULTY',title:'Faculty / Teaching',desc:'Teachers, lecturers and academic staff',icon:GraduationCap},{value:'STAFF',title:'Non-teaching staff',desc:'Office, library, laboratory and support teams',icon:Users}] as const).map(item=><button type="button" key={item.value} onClick={()=>set('staffType',item.value)} className={'flex items-center gap-4 rounded-2xl border p-4 text-left transition '+(form.staffType===item.value?'border-teal-500 bg-teal-50 ring-2 ring-teal-500/10':'border-slate-200 hover:border-slate-300')}><span className={'grid h-12 w-12 place-items-center rounded-xl '+(form.staffType===item.value?'bg-teal-700 text-white':'bg-slate-100 text-slate-600')}><item.icon size={22}/></span><span><b className="block text-sm text-slate-900">{item.title}</b><small className="mt-1 block text-xs text-slate-500">{item.desc}</small></span>{form.staffType===item.value&&<Check className="ml-auto text-teal-700" size={18}/>}</button>)}</div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{text('firstName','First name',true,'text','e.g. Priya')}{text('lastName','Last name',true,'text','e.g. Kumar')}{text('employeeId','Employee ID',true,'text','e.g. EMP-1024')}{select('gender','Gender',['Female','Male','Non-binary','Prefer not to say'],true)}{text('dob','Date of birth',false,'date')}</div></div>}
        {step===1 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{text('designation','Designation',true,'text',form.staffType==='FACULTY'?'e.g. Mathematics Teacher':'e.g. Office Administrator')}{text('department','Department',true,'text','e.g. Mathematics / Administration')}{text('joiningDate','Joining date',true,'date')}{select('employmentType','Employment type',['Full-time','Part-time','Contract','Temporary','Visiting'],true)}{text('qualification','Highest qualification',false,'text','e.g. M.Sc., B.Ed.')}{text('experience','Experience (years)',false,'number','e.g. 5')}{text('subject','Subject / specialization',false,'text','e.g. Mathematics')}</div>}
        {step===2 && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{text('email','Official email address',true,'email','name@school.edu')}{text('phone','Phone number',true,'tel','10-digit mobile number')}{text('emergencyContact','Emergency contact',false,'tel','Contact number')}<div className="sm:col-span-2 lg:col-span-3"><Field label="Residential address"><textarea className={inputClass+' min-h-24 resize-y'} value={form.address} onChange={field('address')} placeholder="Street, city, state, PIN code"/></Field></div><div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900"><div className="flex gap-2"><Mail size={18} className="shrink-0"/><p><b>Login email:</b> This email will be the staff member's username. Use an email address they can access.</p></div></div></div>}
        {step===3 && <div className="mx-auto max-w-2xl space-y-5"><div className="rounded-2xl border border-teal-100 bg-teal-50 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-700 text-white"><ShieldCheck size={20}/></span><div><h4 className="font-extrabold text-teal-950">Create secure login access</h4><p className="mt-1 text-sm leading-6 text-teal-900/80">The account will use the email below. Set a temporary password and share it with the staff member through a secure channel. The backend stores a password hash, not the raw password.</p></div></div><div className="mt-4 rounded-xl bg-white/80 p-3 text-sm"><span className="text-slate-500">Login email</span><p className="mt-0.5 break-all font-bold text-slate-900">{form.email||'Enter an email in the previous step'}</p></div></div><div className="grid gap-4 sm:grid-cols-2">{text('password','Temporary password',true,'password','At least 8 characters')}{text('confirmPassword','Confirm password',true,'password','Re-enter password')}</div><p className="text-xs leading-5 text-slate-500">For stronger security, the staff member should change this password after their first sign-in. Password reset and email delivery require a configured email provider.</p></div>}
      </div>
      <div className="flex flex-col-reverse justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:px-8">{step>0?<button type="button" onClick={()=>{setError('');setStep(s=>s-1);}} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16}/> Previous</button>:<span/>}{step<3?<button type="button" onClick={next} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800">Continue <ArrowRight size={16}/></button>:<button disabled={busy} type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-60">{busy?'Creating account…':<><Check size={16}/> Create account</>}</button>}</div>
    </form> : <><div className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Total team members</span><Users size={19} className="text-teal-700"/></div><p className="mt-3 text-3xl font-black text-slate-900">{records.length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-semibold text-slate-500">Active accounts</span><p className="mt-3 text-3xl font-black text-emerald-700">{records.filter(r=>r.status==='Active').length}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="text-sm font-semibold text-slate-500">Teaching / other</span><p className="mt-3 text-3xl font-black text-slate-900">{records.filter(r=>/faculty|teaching/i.test(r.category)).length} <span className="text-base font-semibold text-slate-400">/ {records.filter(r=>!/faculty|teaching/i.test(r.category)).length}</span></p></div></div><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-extrabold text-slate-900">Team directory</h3><p className="mt-1 text-xs text-slate-500">Faculty and staff registered in this school</p></div><div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500 sm:w-64"/></div></div>{filtered.length===0?<div className="px-5 py-14 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700"><CircleUserRound size={25}/></span><h4 className="mt-4 font-bold text-slate-800">No faculty or staff records yet</h4><p className="mt-1 text-sm text-slate-500">Add your first team member to get started.</p><button onClick={()=>setShowForm(true)} className="mt-4 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white">Add team member</button></div>:<div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Name</th><th className="px-5 py-3">Email</th><th className="px-5 py-3">Designation / department</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.map(r=><tr key={r.id} className="hover:bg-slate-50/70"><td className="px-5 py-4 font-bold text-slate-800">{r.name}</td><td className="px-5 py-4 text-slate-600">{r.email||'—'}</td><td className="px-5 py-4 text-slate-600">{r.category||'—'}</td><td className="px-5 py-4"><span className={'rounded-full px-2.5 py-1 text-xs font-bold '+(r.status==='Active'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600')}>{r.status}</span></td></tr>)}</tbody></table></div>}</div></>}
  </div>;
}
