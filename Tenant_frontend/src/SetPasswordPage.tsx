import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export default function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const base = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim().replace(/\/$/, '');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setSuccess('');
    if (!token) { setError('This setup link is missing its token. Ask Management for a new link.'); return; }
    if (password.length < 8) { setError('Your password must contain at least 8 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await fetch(base + '/auth/set-password', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ token, password }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || 'Unable to set password. Request a new setup link.');
      setSuccess('Your password has been set. You can now sign in to the Faculty portal.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to set password. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900"><section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-9"><div className="mb-6 flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-800"><GraduationCap size={26}/></span><div><p className="text-xs font-bold uppercase tracking-widest text-violet-700">EduSphere</p><h1 className="text-2xl font-black">Set your password</h1></div></div><p className="mb-6 text-sm leading-6 text-slate-600">Create a strong password for your school portal account. This secure link can only be used once and expires after 60 minutes.</p>{error&&<div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{success?<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><div className="flex items-center gap-2 font-bold text-emerald-800"><ShieldCheck size={18}/>{success}</div><button onClick={()=>navigate('/login/faculty')} className="mt-4 w-full rounded-xl bg-violet-900 px-4 py-3 text-sm font-bold text-white">Go to Faculty Login</button></div>:<form onSubmit={submit} className="space-y-5"><label className="block text-sm font-semibold">New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-600" placeholder="At least 8 characters"/></label><label className="block text-sm font-semibold">Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-600" placeholder="Enter it again"/></label><button disabled={busy} className="w-full rounded-xl bg-violet-900 px-4 py-3 font-bold text-white disabled:opacity-60">{busy?'Saving password…':'Set Password Securely'}</button></form>}<p className="mt-6 text-center text-sm text-slate-500"><Link to="/" className="font-semibold text-violet-800 hover:underline">Back to EduSphere</Link></p></section></main>;
}
