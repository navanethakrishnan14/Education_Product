import { Settings } from "lucide-react";
export default function SettingsPage() {
  return <section className="section-card standalone-page">
    <p className="eyebrow">CONFIGURATION</p><h1>Settings</h1>
    <p className="muted">Configure your platform workspace and administration preferences.</p>
    <div className="settings-row"><span className="quick-icon violet"><Settings size={20} /></span><div><strong>Platform settings</strong><p className="muted">Authentication, workspace and platform preferences.</p></div><span className="coming">Coming with API integration</span></div>
  </section>;
}
