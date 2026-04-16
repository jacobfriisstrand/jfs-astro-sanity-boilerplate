import type { APIRoute } from "astro";

const studioRoute = import.meta.env.PUBLIC_SANITY_STUDIO_ROUTE || "/studio";

const getRobotsTxt = (siteUrl: string) =>
  [
    "User-agent: *",
    "Allow: /",
    "",
    `Disallow: ${studioRoute}/`,
    "Disallow: /api/",
    "",
    `Sitemap: ${siteUrl}sitemap-index.xml`,
  ].join("\n");

export const GET: APIRoute = ({ site, url }) => {
  const siteUrl = site ? site.href : `${url.protocol}//${url.host}/`;

  return new Response(getRobotsTxt(siteUrl), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
