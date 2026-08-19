import type { Metadata } from "next";
import RuntimeBugReporter from "./components/RuntimeBugReporter";
import RuntimeOperationsBridge from "./components/RuntimeOperationsBridge";
import PublicSessionBridge from "./components/PublicSessionBridge";
import GlobalRulesNotice from "./components/GlobalRulesNotice";
import "./globals.css";
import "./mobile.css";
import "./accessibility.css";
import "./readability.css";
import "./profile-studio-overrides.css";

export const metadata: Metadata = {
  title: "Hanami High",
  description: "The official public school network for Hanami High School.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RuntimeBugReporter/><RuntimeOperationsBridge/><PublicSessionBridge/><GlobalRulesNotice/>{children}</body></html>;
}
