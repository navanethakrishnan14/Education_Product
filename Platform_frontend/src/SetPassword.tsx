import { useState } from "react";
import { ArrowRight, CheckCircle2, GraduationCap, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";

export default function SetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!token) { setMessage("This password setup link is missing its token. Request a new email."); return; }
    if (password !== confirmPassword) { setMessage("The passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch(base + "/password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to set password.");
      setSuccess(true);
      setMessage(result.message || "Password created successfully.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "Failed to fetch"
        ? "Cannot reach EduSphere. Check the Platform API URL and try again."
        : error instanceof Error ? error.message : "Unable to set password.");
    } finally { setBusy(false); }
  }

  return <main className="login-page">
    <div className="login-brand"><Link to="/" className="brand"><span className="brand-icon"><GraduationCap size={21}/></span><span><b>EduSphere</b><small>ORGANIZATION ACCESS</small></span></Link><span className="secure"><ShieldCheck size={14}/> Secure password setup</span></div>
    <section className="login-card">
      <div className="login-symbol">{success ? <CheckCircle2 size={24}/> : <LockKeyhole size={23}/>}</div>
      <p className="eyebrow">ORGANIZATION ACCOUNT</p>
      <h1>{success ? "Password created" : "Set your password"}</h1>
      <p className="muted">{success ? "Your password has been saved securely." : "Create a secure password for your organization's official email account."}</p>
      {!success && <form onSubmit={submit}>
        <label htmlFor="new-password">New password</label>
        <div className="field"><LockKeyhole size={16}/><input id="new-password" type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={128} required placeholder="At least 8 characters"/></div>
        <p className="muted" style={{fontSize:13,marginTop:6}}>Use at least 8 characters, including uppercase and lowercase letters, a number, and a special character.</p>
        <label htmlFor="confirm-password">Confirm password</label>
        <div className="field"><LockKeyhole size={16}/><input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} required placeholder="Enter the same password again"/></div>
        <button className="primary" disabled={busy || !token}>{busy ? "Saving password…" : "Create Password"} <ArrowRight size={16}/></button>
      </form>}
      {message && <p className={success ? "login-note" : "notice"} role="status">{message}</p>}
      {success && <button className="primary" type="button" onClick={() => navigate("/")}>Continue to login <ArrowRight size={16}/></button>}
      {!token && !success && <p className="notice" role="status">No setup token was found in this link.</p>}
      <div className="login-note"><ShieldCheck size={15}/> Setup links expire after 30 minutes and can be used only once.</div>
    </section>
    <footer>© {new Date().getFullYear()} EduSphere · Secure organization onboarding</footer>
  </main>;
}
