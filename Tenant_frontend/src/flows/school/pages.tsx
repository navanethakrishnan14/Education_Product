import DashboardPage from '../../../tenant-shared/DashboardPage';import OrganizationProfilePage from '../../../tenant-shared/OrganizationProfilePage';import ModulePage from '../../../tenant-shared/ModulePage';
type Props={tenantId?:string;institution:string;user?:{tenantId?:string;tenantCode?:string|null;email?:string;tenantName?:string;institutionName?:string};onNavigate?:(page:string)=>void};
export function LayoutPage({institution,onNavigate}:Props){return <DashboardPage organization="School" institution={institution} onNavigate={onNavigate||(()=>{})}/>}
export function ProfilePage({institution,user}:Props){return <OrganizationProfilePage organization="School" tenantId={user?.tenantId} name={user?.institutionName||user?.tenantName||institution} code={user?.tenantCode} email={user?.email}/>}
export function ManagementUsersPage({tenantId,institution}:Props){return <ModulePage page="Management Users" tenantId={tenantId} tenantName={institution}/>}
export function CommunicationPage({tenantId,institution}:Props){return <ModulePage page="Communication" tenantId={tenantId} tenantName={institution}/>}
export function ReportsAndAnalyticsPage({tenantId,institution}:Props){return <ModulePage page="Reports & Analytics" tenantId={tenantId} tenantName={institution}/>}
export function SettingsPage({tenantId,institution}:Props){return <ModulePage page="Settings" tenantId={tenantId} tenantName={institution}/>}
export function AcademicSetupPage({tenantId,institution}:Props){return <ModulePage page="Academic Setup" tenantId={tenantId} tenantName={institution}/>}
export function ClassesAndSectionsPage({tenantId,institution}:Props){return <ModulePage page="Classes & Sections" tenantId={tenantId} tenantName={institution}/>}
export function FacultyAndStaffPage({tenantId,institution}:Props){return <ModulePage page="Faculty & Staff" tenantId={tenantId} tenantName={institution}/>}
export function StudentsPage({tenantId,institution}:Props){return <ModulePage page="Students" tenantId={tenantId} tenantName={institution}/>}
export function ParentsAndGuardiansPage({tenantId,institution}:Props){return <ModulePage page="Parents & Guardians" tenantId={tenantId} tenantName={institution}/>}
export function AttendancePage({tenantId,institution}:Props){return <ModulePage page="Attendance" tenantId={tenantId} tenantName={institution}/>}
export function TimetablePage({tenantId,institution}:Props){return <ModulePage page="Timetable" tenantId={tenantId} tenantName={institution}/>}
export function ExaminationsAndResultsPage({tenantId,institution}:Props){return <ModulePage page="Examinations & Results" tenantId={tenantId} tenantName={institution}/>}
export function SchoolFeesPage({tenantId,institution}:Props){return <ModulePage page="School Fees" tenantId={tenantId} tenantName={institution}/>}
export function TransportPage({tenantId,institution}:Props){return <ModulePage page="Transport" tenantId={tenantId} tenantName={institution}/>}