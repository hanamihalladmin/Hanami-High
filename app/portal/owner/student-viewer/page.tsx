import OwnerStudentPortalViewer from "./OwnerStudentPortalViewer";
import {hanamiRoleplayDate} from "../../../components/roleplay-date";

export default function OwnerStudentViewerPage(){
 const currentDate=hanamiRoleplayDate();
 return <main className="site-page portal-page"><header className="school-header"><div className="network-strip">HANAMI HIGH SCHOOL • OWNER MODERATION NETWORK • EST. 2006</div><div className="brand-row"><a className="brand-lockup brand-link" href="../../../"><div className="school-mark"><span>H</span></div><div><p className="jp-name">HANAMI HIGH SCHOOL</p><p className="brand-name">HANAMI HIGH SCHOOL</p><p className="brand-subtitle">Owner Student Portal Viewer</p></div></a><div className="school-clock"><strong>{currentDate.toUpperCase()}</strong><span>HANAMI CITY • MODERATION DESK</span></div></div><div className="nav-row"><nav><a href="../">Owner</a><a href="../../">Portal Gateway</a><a href="../../admin/">Administration</a></nav><a className="portal-button active" href="./">Student Viewer</a></div></header><section style={{padding:"24px"}}><OwnerStudentPortalViewer/></section><footer><p>HANAMI HIGH SCHOOL • OWNER MODERATION • EST. 2006</p><nav><a href="../">Owner Portal</a><a href="../../">Portal Gateway</a></nav></footer></main>;
}
