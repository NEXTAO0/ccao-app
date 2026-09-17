import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@/components/Analytics";
import { ThemeProvider } from "@/components/theme-provider";

// [MANUAL_SETUP_REQUIRED]: Public app URL (lands in email links, sitemap.xml, robots.txt).
const appUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "CCAO: by NEXTAO",
    template: "%s · CCAO by NEXTAO",
  },
  description:
    "Unified multi-cloud and AI budget controller for GCP, AWS, and OpenAI. Track spend in real time, enforce hard caps, and get anomaly alerts by email.",
  keywords: [
    "multi-cloud cost control",
    "AI spend control",
    "AWS cost",
    "OpenAI spend",
    "cloud cost control",
    "Google Cloud billing",
    "spend alerts",
    "budget cap",
    "anomaly detection",
    "CCAO",
    "NEXTAO",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: appUrl,
    siteName: "CCAO by NEXTAO",
    title: "CCAO: by NEXTAO",
    description:
      "Never get surprised by a cloud or AI bill again. Real-time GCP, AWS, and OpenAI spend tracking, hard caps, and anomaly alerts.",
    images: [{ url: `${appUrl}/icon.svg`, width: 64, height: 64, alt: "CCAO logo" }],
  },
  twitter: {
    card: "summary",
    title: "CCAO: by NEXTAO",
    description:
      "Never get surprised by a cloud or AI bill again. Real-time GCP, AWS, and OpenAI spend tracking, hard caps, and anomaly alerts.",
    images: [`${appUrl}/icon.svg`],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}