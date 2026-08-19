import type { Metadata } from "next";
import RuntimeBugReporter from "./components/RuntimeBugReporter";
import PublicSessionBridge from "./components/PublicSessionBridge";
import "./globals.css";
import "./mobile.css";
import "./accessibility.css";

export const metadata: Metadata = {
  title: "Hanami High",
  description: "The official public school network for Hanami High School.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><RuntimeBugReporter/><PublicSessionBridge/>{children}</body></html>;
}
