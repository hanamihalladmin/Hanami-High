import HomeDashboard from "./HomeDashboard";
import {hanamiRoleplayDate} from "./components/roleplay-date";

// Public-home contract lives in HomeDashboard: HANAMI HIGH SCHOOL • EST. 1836 • ONLINE • 2006
// ACADEMIC HIGHLIGHTS • TODAY AT HANAMI • QUICK LINKS • Student Login • Faculty Login
// LiveAnnouncements • LiveNextEvent • LiveUpcomingEvents • LiveSchoolStatus
export default function Home(){return <HomeDashboard currentDate={hanamiRoleplayDate()}/>;}
