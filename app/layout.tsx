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
import RoleplaySchoolYearInputs from "./components/RoleplaySchoolYearInputs";
import RoleplayClockRuntime from "./components/RoleplayClockRuntime";
import ForumReplyLimitRuntime from "./components/ForumReplyLimitRuntime";
import GlobalUpdateAccess from "./components/GlobalUpdateAccess";
import PortalCustomizationRuntime from "./components/PortalCustomizationRuntime";
import ScheduleDedupRuntime from "./components/ScheduleDedupRuntime";
import PostRebuildRegressionRuntime from "./components/PostRebuildRegressionRuntime";
import StrictTextContrastRuntime from "./components/StrictTextContrastRuntime";
import "./globals.css";
import "./styles/rebuild/tokens.css";
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
import "./public-retro-notion.css";
import "./unified-shell-fixes.css";
import "./bugfix-20260821.css";
import "./portal-customization-runtime.css";
import "./tokyo-slate-theme.css";
import "./portal-mobile-stabilization.css";
import "./hanami-unified-theme.css";
import "./phase5-portal-final.css";
import "./phase5-role-portals.css";
import "./phase5-website-final-qa.css";
import "./post-phase5-bugfix.css";
import "./rebuild-tokens.css";
import "./phase-c-public-followups.css";
import "./phase-f-profile-customization.css";
import "./phase-g-integration-qa.css";
import "./post-rebuild-regressions.css";
import "./strict-text-contrast.css";
import "./portal-dimension-fixes.css";
import "./fill-text-contrast-fixes.css";
import "./portal-reference-layout.css";
import "./final-portal-geometry.css";
import "./live-regression-hotfix.css";
import "./cozy-hanami-workspace.css";
import "./cozy-hanami-workspace-details.css";
import "./cozy-hanami-geometry-lock.css";
import "./portal-breathing-room.css";
import "./styles/rebuild/portal-shell-phase3.css";

export const metadata: Metadata = {
  title: "Hanami High",
  description: "The official public school network for Hanami High School.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RuntimeBugReporter/><RuntimeOperationsBridge/><PublicSessionBridge/><PublicPageTextEditor/><ProfileOpenBridge/><SiteThemeRuntime/><PortalCustomizationRuntime/><ExamWeekRuntime/><RoleplaySchoolYearInputs/><RoleplayClockRuntime/><ForumReplyLimitRuntime/><GlobalRulesNotice/><RoleplayWeatherEffects/><GlobalUpdateAccess/><ScheduleDedupRuntime/><PostRebuildRegressionRuntime/><StrictTextContrastRuntime/>{children}</body></html>;
}
