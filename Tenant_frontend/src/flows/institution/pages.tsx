import DashboardPage from '../../../tenant-shared/DashboardPage';import OrganizationProfilePage from '../../../tenant-shared/OrganizationProfilePage';import ModulePage from '../../../tenant-shared/ModulePage';
type Props={tenantId?:string;institution:string;user?:{tenantId?:string;tenantCode?:string|null;email?:string;tenantName?:string;institutionName?:string};onNavigate?:(page:string)=>void};
export function LayoutPage({institution,onNavigate}:Props){return <DashboardPage organization="Institution" institution={institution} onNavigate={onNavigate||(()=>{})}/>}
export function ProfilePage({institution,user}:Props){return <OrganizationProfilePage organization="Institution" tenantId={user?.tenantId} name={user?.institutionName||user?.tenantName||institution} code={user?.tenantCode} email={user?.email}/>}
export function ManagementUsersPage({tenantId,institution}:Props){return <ModulePage page="Management Users" tenantId={tenantId} tenantName={institution}/>}
export function CommunicationPage({tenantId,institution}:Props){return <ModulePage page="Communication" tenantId={tenantId} tenantName={institution}/>}
export function ReportsAndAnalyticsPage({tenantId,institution}:Props){return <ModulePage page="Reports & Analytics" tenantId={tenantId} tenantName={institution}/>}
export function SettingsPage({tenantId,institution}:Props){return <ModulePage page="Settings" tenantId={tenantId} tenantName={institution}/>}
export function OrganizationUnitsPage({tenantId,institution}:Props){return <ModulePage page="Organization Units" tenantId={tenantId} tenantName={institution}/>}
export function ProgramsAndServicesPage({tenantId,institution}:Props){return <ModulePage page="Programs & Services" tenantId={tenantId} tenantName={institution}/>}
export function MembersAndStaffPage({tenantId,institution}:Props){return <ModulePage page="Members & Staff" tenantId={tenantId} tenantName={institution}/>}
export function LearnersBeneficiariesPage({tenantId,institution}:Props){return <ModulePage page="Learners / Beneficiaries" tenantId={tenantId} tenantName={institution}/>}
export function SchedulesAndActivitiesPage({tenantId,institution}:Props){return <ModulePage page="Schedules & Activities" tenantId={tenantId} tenantName={institution}/>}
export function ParticipationAndRecordsPage({tenantId,institution}:Props){return <ModulePage page="Participation & Records" tenantId={tenantId} tenantName={institution}/>}
export function FinanceAndFundingPage({tenantId,institution}:Props){return <ModulePage page="Finance & Funding" tenantId={tenantId} tenantName={institution}/>}
export function ComplianceAndDocumentsPage({tenantId,institution}:Props){return <ModulePage page="Compliance & Documents" tenantId={tenantId} tenantName={institution}/>}