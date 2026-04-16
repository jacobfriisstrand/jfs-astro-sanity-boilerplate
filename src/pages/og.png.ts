import { Resvg } from "@resvg/resvg-js";
import type { APIRoute } from "astro";
import { loadSiteSettings } from "@/sanity/lib/load-site-settings";

const WIDTH = 1200;
const HEIGHT = 630;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildSvg(logoUrl?: string): string {
  const logoMarkup = logoUrl
    ? `<image href="${escapeXml(logoUrl)}" x="${WIDTH / 2 - 150}" y="${HEIGHT / 2 - 150}" width="300" height="300" preserveAspectRatio="xMidYMid meet" />`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#0a0a0a" />
  ${logoMarkup}
</svg>`;
}

export const GET: APIRoute = async ({ locals }) => {
  const isPreview = locals.isPreview;
  const siteSettings = await loadSiteSettings(isPreview);

  const logoAsset = siteSettings?.logo?.asset as { url?: string } | undefined;

  const svg = buildSvg(logoAsset?.url);

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
