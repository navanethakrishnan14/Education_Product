import DashboardPage from '../../../tenant-shared/DashboardPage';import OrganizationProfilePage from '../../../tenant-shared/OrganizationProfilePage';import ModulePage from '../../../tenant-shared/ModulePage';
type Props={tenantId?:string;institution:string;user?:{tenantId?:string;tenantCode?:string|null;email?:string;tenantName?:string;institutionName?:string};onNavigate?:(page:string)=>void};
export function LayoutPage({institution,onNavigate}:Props){return <DashboardPage organization="College" institution={institution} onNavigate={onNavigate||(()=>{})}/>}
export function ProfilePage({institution,user}:Props){return <OrganizationProfilePage organization="College" tenantId={user?.tenantId} name={user?.institutionName||user?.tenantName||institution} code={user?.tenantCode} email={user?.email}/>}
export function ManagementUsersPage({tenantId,institution}:Props){return <ModulePage page="Management Users" tenantId={tenantId} tenantName={institution}/>}
export function CommunicationPage({tenantId,institution}:Props){return <ModulePage page="Communication" tenantId={tenantId} tenantName={institution}/>}
export function ReportsAndAnalyticsPage({tenantId,institution}:Props){return <ModulePage page="Reports & Analytics" tenantId={tenantId} tenantName={institution}/>}
export function SettingsPage({tenantId,institution}:Props){return <ModulePage page="Settings" tenantId={tenantId} tenantName={institution}/>}
export function AcademicStructurePage({tenantId,institution}:Props){return <ModulePage page="Academic Structure" tenantId={tenantId} tenantName={institution}/>}
export function DepartmentsPage({tenantId,institution}:Props){return <ModulePage page="Departments" tenantId={tenantId} tenantName={institution}/>}
export function CoursesAndProgramsPage({tenantId,institution}:Props){return <ModulePage page="Courses & Programs" tenantId={tenantId} tenantName={institution}/>}
export function FacultyPage({tenantId,institution}:Props){return <ModulePage page="Faculty" tenantId={tenantId} tenantName={institution}/>}
export function StudentsAndAdmissionsPage({tenantId,institution}:Props){return <ModulePage page="Students & Admissions" tenantId={tenantId} tenantName={institution}/>}
export function SemesterAndCreditsPage({tenantId,institution}:Props){return <ModulePage page="Semester & Credits" tenantId={tenantId} tenantName={institution}/>}
export function ExaminationsAndResultsPage({tenantId,institution}:Props){return <ModulePage page="Examinations & Results" tenantId={tenantId} tenantName={institution}/>}
export function FeesAndScholarshipsPage({tenantId,institution}:Props){return <ModulePage page="Fees & Scholarships" tenantId={tenantId} tenantName={institution}/>}
export function ResearchAndProjectsPage({tenantId,institution}:Props){return <ModulePage page="Research & Projects" tenantId={tenantId} tenantName={institution}/>}
export function PlacementAndAlumniPage({tenantId,institution}:Props){return <ModulePage page="Placement & Alumni" tenantId={tenantId} tenantName={institution}/>}