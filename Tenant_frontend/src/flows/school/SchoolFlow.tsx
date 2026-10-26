import ManagementDashboard from '../../ManagementDashboard';

type TenantUser = {
  name?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  tenantCode?: string | null;
  tenantType?: string;
  tenantName?: string;
  institutionName?: string;
};

/** School-specific entry point. School navigation and modules are configured in the school flow. */
export default function SchoolFlow({ user, onLogout }: { user: TenantUser; onLogout: () => void }) {
  return <ManagementDashboard user={{ ...user, tenantType: 'school' }} onLogout={onLogout} tenantTypeOverride="school" />;
}
