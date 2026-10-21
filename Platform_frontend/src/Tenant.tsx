import { ArrowRight, GraduationCap, Landmark, Globe2 } from "lucide-react";

const tenantTypes = [
  {
    title: "School",
    description: "Manage school tenants, classes, faculty and students.",
    icon: GraduationCap,
    tone: "violet"
  },
  {
    title: "College",
    description: "Manage colleges, departments, programs and campus users.",
    icon: Landmark,
    tone: "teal"
  },
  {
    title: "Institution",
    description: "Manage other education institutions and their workspaces.",
    icon: Globe2,
    tone: "blue"
  }
];

export default function Tenant() {
  return (
    <section className="tenant-page">
      <div className="tenant-page-heading">
        <div>
          <p className="eyebrow">TENANT MANAGEMENT</p>
          <h1>Choose tenant type</h1>
          <p className="muted">Select the kind of education organization you want to manage.</p>
        </div>
        <span className="platform-status"><i /> Tenant workspace</span>
      </div>

      <div className="tenant-type-grid">
        {tenantTypes.map((item) => {
          const Icon = item.icon;
          return (
            <button className="tenant-type-card" type="button" key={item.title}>
              <span className={"tenant-type-icon " + item.tone}><Icon size={23} /></span>
              <span className="tenant-type-copy">
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowRight className="tenant-type-arrow" size={18} />
            </button>
          );
        })}
      </div>
    </section>
  );
}
