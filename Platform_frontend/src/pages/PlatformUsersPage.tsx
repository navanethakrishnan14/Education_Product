import { Users } from "lucide-react";
export default function PlatformUsersPage() {
  return <section className="section-card standalone-page">
    <p className="eyebrow">ACCESS CONTROL</p><h1>Platform users</h1>
    <p className="muted">Review and manage authorized platform administrator accounts.</p>
    <div className="empty-state"><span><Users size={24} /></span><h3>Platform user directory</h3><p>User listing and management will appear here after API integration.</p></div>
    <span className="coming">API integration required</span>
  </section>;
}
