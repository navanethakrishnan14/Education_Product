import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { FormEvent } from "react";

type LinkState = "checking" | "valid" | "invalid" | "expired" | "unavailable" | "success";
type SetupPayload = {
  success?: boolean;
  message?: string;
  data?: {
    organizationName?: string;
    officialEmail?: string | null;
    workspaceUrl?: string;
    expiresAt?: string;
  };
};

export default function SetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [linkState, setLinkState] = useState<LinkState>("checking");
  const [organization, setOrganization] = useState<SetupPayload["data"]>(undefined);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [retryValidation, setRetryValidation] = useState(0);
  const token = params.get("token") || "";
  const base = (import.meta.env.VITE_PLATFORM_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
  const tenantPortalLogin = String(import.meta.env.VITE_TENANT_PORTAL_URL || "http://localhost:5174/login/management").trim();

  useEffect(() => {
    let cancelled = false;

    async function validateLink() {
      setMessage("");
      setOrganization(undefined);
      if (!token) {
        setLinkState("invalid");
        setMessage("This link is missing its setup token. Open the complete link from the organization email.");
        return;
      }

      setLinkState("checking");
      try {
        const response = await fetch(base + "/password-setup/validate?token=" + encodeURIComponent(token), {
          method: "GET",
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        const result = await response.json().catch(() => ({} as SetupPayload)) as SetupPayload;
        if (cancelled) return;
        if (!response.ok) {
          setLinkState(response.status === 410 ? "expired" : "invalid");
          setMessage(result.message || (response.status === 410
            ? "This setup link has expired. Ask the platform administrator to send a new email."
            : "This link is invalid or has already been used. Ask the platform administrator to send a new email."));
          return;
        }
        if (!result.data?.organizationName) {
          setLinkState("invalid");
          setMessage("The server could not identify the organization for this link. Ask the platform administrator for a new email.");
          return;
        }
        setOrganization(result.data);
        setLinkState("valid");
      } catch (error) {
        if (cancelled) return;
        setLinkState("unavailable");
        setMessage(error instanceof TypeError
          ? "Cannot reach the Platform API. Check that Platform_Backend is running and VITE_PLATFORM_API_BASE_URL is correct."
          : error instanceof Error ? error.message : "Could not verify this setup link.");
      }
    }

    void validateLink();
    return () => { cancelled = true; };
  }, [base, token, retryValidation]);

  const requirements = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter (A–Z)", valid: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a–z)", valid: /[a-z]/.test(password) },
    { label: "One number (0–9)", valid: /[0-9]/.test(password) },
    { label: "One special character", valid: /[^A-Za-z0-9]/.test(password) }
  ];
  const passwordIsValid = requirements.every(item => item.valid);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setMessage("");

    if (linkState !== "valid" || !token) {
      setMessage("Verify a valid setup link before creating the password.");
      return;
    }
    if (!passwordIsValid) {
      setMessage("Complete all password requirements before continuing.");
      return;
    }
    if (!passwordsMatch) {
      setMessage("The passwords do not match. Enter the same password in both fields.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(base + "/password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json().catch(() => ({} as SetupPayload)) as SetupPayload;
      if (!response.ok) {
        setLinkState(response.status === 410 ? "expired" : response.status === 400 ? "invalid" : "valid");
        throw new Error(result.message || "Unable to save the password. Please try again.");
      }
      setLinkState("success");
      setMessage(result.message || "Your password has been created successfully.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setMessage(error instanceof TypeError
        ? "Cannot reach the Platform API. Check the backend and try again."
        : error instanceof Error ? error.message : "Unable to set password.");
    } finally {
      setBusy(false);
    }
  }

  const completed = linkState === "success";
  const canShowForm = linkState === "valid" && !completed;

  return <main className="login-page">
    <div className="login-brand">
      <Link to="/" className="brand"><span className="brand-icon"><GraduationCap size={21}/></span><span><b>EduSphere</b><small>ORGANIZATION ACCESS</small></span></Link>
      <span className="secure"><ShieldCheck size={14}/> Secure password setup</span>
    </div>

    <section className="login-card">
      <div className="login-symbol">{completed ? <CheckCircle2 size={24}/> : <LockKeyhole size={23}/>}</div>
      <p className="eyebrow">ORGANIZATION ACCOUNT</p>
      <h1>{completed ? "Password created" : linkState === "checking" ? "Checking your link" : "Set your password"}</h1>
      <p className="muted">
        {completed
          ? "Your organization password has been saved securely."
          : linkState === "checking"
            ? "Checking that your email link is valid and has not expired."
            : "Create a secure password using the one-time link sent to your organization's official email."}
      </p>

      {linkState === "checking" && <div className="notice" role="status" aria-live="polite">Verifying setup link… Please wait.</div>}

      {(linkState === "expired" || linkState === "invalid" || linkState === "unavailable") && <>
        <p className="notice" role="alert" aria-live="polite">{message}</p>
        {linkState === "unavailable" && <button className="primary" type="button" onClick={() => setRetryValidation(value => value + 1)}>Try again <ArrowRight size={16}/></button>}
        {(linkState === "expired" || linkState === "invalid") && <p className="muted" style={{fontSize:13}}>For security, setup links work only once and expire after 30 minutes. Ask your platform administrator to resend the setup email.</p>}
      </>}

      {organization && linkState !== "invalid" && linkState !== "expired" && <div style={{textAlign:"left",padding:"12px 14px",margin:"18px 0",border:"1px solid #dbe5e2",borderRadius:12,background:"#f8fbfa"}}>
        <p style={{margin:"0 0 8px",fontWeight:700}}>{organization.organizationName}</p>
        {organization.officialEmail && <p style={{display:"flex",alignItems:"center",gap:8,margin:0,fontSize:14,color:"#475569",overflowWrap:"anywhere"}}><Mail size={15}/>{organization.officialEmail}</p>}
      </div>}

      {canShowForm && <form onSubmit={submit}>
        <label htmlFor="new-password">New password</label>
        <div className="field">
          <LockKeyhole size={16}/>
          <input id="new-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} maxLength={128} required placeholder="Create a strong password" aria-describedby="password-requirements"/>
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} style={{border:0,background:"transparent",display:"inline-flex",alignItems:"center",padding:4,cursor:"pointer",color:"#64748b"}}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
        </div>

        <div id="password-requirements" style={{textAlign:"left",margin:"10px 0 18px",fontSize:13}}>
          <p className="muted" style={{margin:"0 0 8px"}}>Your password must contain:</p>
          {requirements.map(item => <div key={item.label} style={{display:"flex",gap:8,alignItems:"center",margin:"5px 0",color:item.valid ? "#16734b" : "#64748b"}}>
            <CheckCircle2 size={14}/><span>{item.label}</span>
          </div>)}
        </div>

        <label htmlFor="confirm-password">Confirm password</label>
        <div className="field">
          <LockKeyhole size={16}/>
          <input id="confirm-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} required placeholder="Enter the same password again" aria-invalid={confirmPassword.length > 0 && !passwordsMatch}/>
        </div>
        {confirmPassword.length > 0 && <p style={{fontSize:13,marginTop:6,color:passwordsMatch ? "#16734b" : "#b42318"}} role="status">{passwordsMatch ? "Passwords match." : "Passwords do not match yet."}</p>}

        <button className="primary" type="submit" disabled={busy || linkState !== "valid" || !passwordIsValid || !passwordsMatch}>
          {busy ? "Saving password…" : "Create Password"} <ArrowRight size={16}/>
        </button>
      </form>}

      {message && (completed || canShowForm) && <p className={completed ? "login-note" : "notice"} role="status" aria-live="polite">{message}</p>}

      {completed && <>
        <div className="login-note" style={{textAlign:"left"}}>
          <CheckCircle2 size={15}/> Password setup is complete for the official email shown above. You can now sign in through the Management portal.
        </div>
        <a href={tenantPortalLogin} className="primary" style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,textDecoration:"none",marginTop:16}}>
          Continue to Management sign-in <ArrowRight size={16}/>
        </a>
        <p className="muted" style={{fontSize:13,textAlign:"left",marginTop:12}}>
          If the organization is still Pending or Inactive, the platform administrator must activate it before Management sign-in will be allowed.
        </p>
      </>}

      <div className="login-note"><ShieldCheck size={15}/> Setup links expire after 30 minutes and can be used only once.</div>
    </section>

    <footer>© {new Date().getFullYear()} EduSphere · Secure organization onboarding</footer>
  </main>;
}
