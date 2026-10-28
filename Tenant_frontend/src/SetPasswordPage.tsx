import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, EyeOff, GraduationCap, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function SetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const base = String(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').trim().replace(/\/$/, '');
  const meetsLength = password.length >= 8;
  const passwordsMatch = password.length > 0 && password === confirm;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This setup link is missing its security token. Please ask your school Management team to send a new invitation.');
      return;
    }
    if (!meetsLength) {
      setError('Your password must contain at least 8 characters.');
      return;
    }
    if (!passwordsMatch) {
      setError('The passwords do not match. Please check both fields.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(base + '/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const payload = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Unable to set your password. Your invitation may have expired.');
      setSuccess(true);
      setPassword('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to set your password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-slate-900 sm:px-6">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute -bottom-36 -right-20 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(139,92,246,0.12),transparent_45%)]" />
      </div>

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-2xl shadow-black/30 md:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-900 p-10 text-white md:flex lg:p-12">
          <div aria-hidden="true" className="absolute -right-20 top-24 h-64 w-64 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-8 top-36 h-40 w-40 rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10 text-violet-200"><GraduationCap size={27} /></span>
            <div><p className="text-xs font-bold uppercase tracking-[0.24em] text-violet-200">EduSphere</p><p className="mt-0.5 text-sm text-white/70">School Portal</p></div>
          </div>
          <div className="relative my-12">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-3 py-1.5 text-xs font-semibold text-violet-100"><ShieldCheck size={14} /> Secure account activation</span>
            <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight lg:text-[42px]">Your school journey starts here.</h1>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">Create your personal password to activate your Faculty &amp; Staff portal account and access your school workspace securely.</p>
          </div>
          <div className="relative flex items-center gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400">
            <LockKeyhole size={17} className="shrink-0 text-violet-300" />
            <p>Your invitation is private, single-use, and valid for 60 minutes.</p>
          </div>
        </aside>

        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-800"><GraduationCap size={25} /></span>
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-700">EduSphere</p><p className="text-sm text-slate-500">School Portal</p></div>
          </div>

          {success ? (
            <div className="py-5 sm:py-10">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={34} /></span>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Account secured</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Password created</h2>
              <p className="mt-4 text-sm leading-6 text-slate-600">Your Faculty &amp; Staff account password has been set successfully. You can now sign in using your school portal login.</p>
              <button onClick={() => navigate('/login/faculty')} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-800 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-900">Continue to Faculty &amp; Staff Login <ArrowRight size={17} /></button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-800"><LockKeyhole size={14} /> FACULTY &amp; STAFF ACCOUNT SETUP</span>
                <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-[34px]">Set your password</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">Choose a strong password to activate your account. You will use it whenever you sign in to the school portal.</p>
              </div>

              {error && <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">{error}</div>}
              {!token && <div role="status" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">No invitation token was found in this link. Ask your school Management team to send a new password setup email.</div>}

              <form onSubmit={submit} className="space-y-5">
                <label className="block text-sm font-semibold text-slate-800">New password
                  <span className="relative mt-2 block">
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10" placeholder="Enter at least 8 characters" />
                    <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-700">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </span>
                </label>

                <div className="flex items-center gap-2 text-xs">
                  <span className={'h-1.5 w-1.5 rounded-full ' + (meetsLength ? 'bg-emerald-500' : 'bg-slate-300')} />
                  <span className={meetsLength ? 'font-semibold text-emerald-700' : 'text-slate-500'}>At least 8 characters</span>
                </div>

                <label className="block text-sm font-semibold text-slate-800">Confirm password
                  <span className="relative mt-2 block">
                    <input type={showConfirm ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e => setConfirm(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 pr-12 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-600 focus:ring-4 focus:ring-violet-600/10" placeholder="Re-enter your password" />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} className="absolute inset-y-0 right-0 grid w-12 place-items-center text-slate-400 hover:text-slate-700">{showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </span>
                </label>
                {confirm.length > 0 && <p className={'-mt-2 text-xs ' + (passwordsMatch ? 'text-emerald-700' : 'text-rose-600')}>{passwordsMatch ? 'Passwords match.' : 'Passwords do not match yet.'}</p>}

                <button type="submit" disabled={busy || !token} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-800 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-900/20 transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Securing your account…' : 'Set Password Securely'} {!busy && <ArrowRight size={17} />}</button>
              </form>

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
                <ShieldCheck size={17} className="mt-0.5 shrink-0 text-violet-700" />
                <p>Your password is encrypted before storage. The invitation link can be used once and expires after 60 minutes.</p>
              </div>
            </>
          )}
          <div className="mt-8 border-t border-slate-100 pt-5 text-center text-xs text-slate-500"><Link to="/" className="font-semibold text-violet-800 hover:text-violet-950 hover:underline">Back to EduSphere home</Link></div>
        </div>
      </section>
    </main>
  );
}
