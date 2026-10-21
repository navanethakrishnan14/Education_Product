import { ArrowRight, GraduationCap, Landmark, Globe2, ArrowLeft } from "lucide-react";
import { Link, Route, Routes, useParams } from "react-router-dom";

const tenantTypes = [
  { slug: "school", title: "School", description: "Manage school tenants, classes, faculty and students.", icon: GraduationCap, tone: "violet" },
  { slug: "college", title: "College", description: "Manage colleges, departments, programs and campus users.", icon: Landmark, tone: "teal" },
  { slug: "institution", title: "Institution", description: "Manage other education institutions and their workspaces.", icon: Globe2, tone: "blue" }
];

function TenantTypeDetail() {
  const { type } = useParams();
  const tenant = tenantTypes.find((item) => item.slug === type);
  if (!tenant) return <section className="section-card"><h1>Tenant type not found</h1><Link className="back-link" to="/dashboard/tenant"><ArrowLeft size={16} /> Back to Tenant</Link></section>;
  const Icon = tenant.icon;
  return (
    <section className="tenant-detail-page">
      <Link className="back-link" to="/dashboard/tenant"><ArrowLeft size={16} /> All tenant types</Link>
      <div className="tenant-detail-card">
        <span className={"tenant-type-icon " + tenant.tone}><Icon size={28} /></span>
        <p className="eyebrow">TENANT MANAGEMENT</p>
        <h1>{tenant.title} tenants</h1>
        <p className="muted">{tenant.description}</p>
        <div className="coming">Tenant creation and directory API integration required</div>
      </div>
    </section>
  );
}

function TenantTypeChooser() {
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
            <Link className="tenant-type-card" to={`/dashboard/tenant/${item.slug}`} key={item.slug}>
              <span className={"tenant-type-icon " + item.tone}><Icon size={23} /></span>
              <span className="tenant-type-copy"><strong>{item.title}</strong><small>{item.description}</small></span>
              <ArrowRight className="tenant-type-arrow" size={18} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function Tenant() {
  return <Routes>
    <Route index element={<TenantTypeChooser />} />
    <Route path=":type" element={<TenantTypeDetail />} />
  </Routes>;
}
