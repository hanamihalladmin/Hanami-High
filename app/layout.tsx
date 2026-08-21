import type { Metadata } from "next";
import RuntimeBugReporter from "./components/RuntimeBugReporter";
import RuntimeOperationsBridge from "./components/RuntimeOperationsBridge";
import PublicSessionBridge from "./components/PublicSessionBridge";
import PublicPageTextEditor from "./components/PublicPageTextEditor";
import ProfileOpenBridge from "./components/ProfileOpenBridge";
import GlobalRulesNotice from "./components/GlobalRulesNotice";
import SiteThemeRuntime from "./components/SiteThemeRuntime";
import RoleplayWeatherEffects from "./components/RoleplayWeatherEffects";
import ExamWeekRuntime from "./components/ExamWeekRuntime";
import "./globals.css";
import "./mobile.css";
import "./accessibility.css";
import "./readability.css";
import "./profile-studio-overrides.css";
import "./school-resources-fix.css";
import "./site-themes.css";
import "./exam-week.css";
import "./classroom-hub.css";
import "./retro-ui.css";
import "./portal-refresh.css";
import "./public-network-fixes.css";

export const metadata: Metadata = {
  title: "Hanami High",
  description: "The official public school network for Hanami High School.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RuntimeBugReporter/><RuntimeOperationsBridge/><PublicSessionBridge/><PublicPageTextEditor/><ProfileOpenBridge/><SiteThemeRuntime/><ExamWeekRuntime/><GlobalRulesNotice/><RoleplayWeatherEffects/>{children}</body></html>;
}
