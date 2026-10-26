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

/** College-specific entry point. College navigation and modules are configured in the college flow. */
export default function CollegeFlow({ user, onLogout }: { user: TenantUser; onLogout: () => void }) {
  return <ManagementDashboard user={{ ...user, tenantType: 'college' }} onLogout={onLogout} tenantTypeOverride="college" />;
}
