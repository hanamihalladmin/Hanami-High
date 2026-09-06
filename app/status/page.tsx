import PublicSchoolShell from "../components/PublicSchoolShell";
import AdminOwnerOnly from "../components/AdminOwnerOnly";
import NetworkStatusBoard from "../components/NetworkStatusBoard";

export default function StatusPage(){return <PublicSchoolShell sectionTitle="NETWORK STATUS" breadcrumb="Internal Network Status" lastUpdated="09.06.2006"><AdminOwnerOnly label="Network Status"><NetworkStatusBoard/></AdminOwnerOnly></PublicSchoolShell>}
