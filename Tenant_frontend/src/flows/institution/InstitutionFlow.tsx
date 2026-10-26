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

/** Institution-specific entry point. Institution navigation and modules are configured in this flow. */
export default function InstitutionFlow({ user, onLogout }: { user: TenantUser; onLogout: () => void }) {
  return <ManagementDashboard user={{ ...user, tenantType: 'institution' }} onLogout={onLogout} tenantTypeOverride="institution" />;
}
