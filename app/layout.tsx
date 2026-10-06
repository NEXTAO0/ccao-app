import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Analytics as AppAnalytics } from "@/components/Analytics";
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
    "Budget monitoring for GCP, AWS, and OpenAI with scheduled spend checks, configurable provider actions, and optional email alerts.",
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
      "Scheduled budget monitoring for GCP, AWS, and OpenAI. Provider reporting delays and service availability may affect results.",
    images: [{ url: `${appUrl}/icon.svg`, width: 64, height: 64, alt: "CCAO logo" }],
  },
  twitter: {
    card: "summary",
    title: "CCAO: by NEXTAO",
    description:
      "Scheduled budget monitoring for GCP, AWS, and OpenAI. Provider reporting delays and service availability may affect results.",
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

export const viewport: Viewport = {
  themeColor: "#f4f1eb",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="light" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="min-h-dvh font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <a className="skip-link" href="#main-content">
            Skip to main content
          </a>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
          <AppAnalytics />
        </ThemeProvider>
      </body>
    </html>
  );
}