import { useState } from "react";
import { ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { FormEvent } from "react";
import Brand from "../components/Brand";
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
      const res = await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to sign in.");
      if (!data.token) throw new Error("The platform API did not return a session token.");
      sessionStorage.setItem("platform_token", data.token);
      sessionStorage.setItem("platform_user", JSON.stringify(data.user || {}));
      nav("/dashboard");
    } catch (e) {
      setMessage(e instanceof Error && e.message === "Failed to fetch"
        ? "Cannot reach Platform_Backend. Check that it is running and VITE_PLATFORM_API_BASE_URL is correct."
        : e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <div className="login-brand"><Brand /><span className="secure"><ShieldCheck size={14} /> Secure administrator access</span></div>
    <section className="login-card">
      <div className="login-symbol"><LockKeyhole size={23} /></div>
      <p className="eyebrow">PLATFORM CONTROL CENTER</p>
      <h1>Welcome back</h1>
      <p className="muted">Sign in to manage schools and platform operations.</p>
      <form onSubmit={submit}>
        <label htmlFor="email">Administrator email</label>
        <div className="field"><Mail size={16} /><input id="email" type="email" autoComplete="username" placeholder="admin@edusphere.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
        <label htmlFor="password">Password</label>
        <div className="field"><LockKeyhole size={16} /><input id="password" type="password" autoComplete="current-password" placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required /></div>
        <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in to Platform"} <ArrowRight size={16} /></button>
        {message && <p className="notice" role="status">{message}</p>}
      </form>
      <div className="login-note"><ShieldCheck size={15} /> Access is restricted to authorized platform administrators.</div>
    </section>
    <footer>© {new Date().getFullYear()} EduSphere · Platform Administration</footer>
  </main>;
}

type TenantSummary = {
  id: string;
  name: string;
  code?: string | null;
  tenantType?: string | null;
  officialEmail?: string | null;
  workspaceUrl?: string | null;
  status?: string | null;
  planName?: string | null;
  createdAt?: string;
};
