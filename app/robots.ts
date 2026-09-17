import type { MetadataRoute } from "next";

// [MANUAL_SETUP_REQUIRED]: Set NEXT_PUBLIC_APP_URL to the deployed base URL.
const baseUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/login"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}