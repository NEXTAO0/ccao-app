import type { MetadataRoute } from "next";

// [MANUAL_SETUP_REQUIRED]: Set NEXT_PUBLIC_APP_URL to the deployed base URL so the
// sitemap points at canonical pages rather than localhost.
const baseUrl: string = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    lastModified?: Date;
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
    priority?: number;
  }> = [
    { path: "", changeFrequency: "monthly", priority: 1 },
    { path: "/dashboard", changeFrequency: "daily", priority: 0.8 },
    { path: "/login", changeFrequency: "yearly", priority: 0.4 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: route.lastModified ?? new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}