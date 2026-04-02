import { defineMiddleware } from "astro:middleware";
import { loadQuery } from "@/sanity/lib/load-query";

const STYLE_SRC_RE = /style-src[^;]*/;
const SCRIPT_SRC_RE = /script-src[^;]*/;

type Redirect = {
  source: string;
  destination: string;
  permanent: boolean;
};

let cachedRedirects: Redirect[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 1 minute

async function getRedirects(): Promise<Redirect[]> {
  const now = Date.now();
  if (cachedRedirects && now - cacheTimestamp < CACHE_TTL) {
    return cachedRedirects;
  }

  const { data } = await loadQuery<Redirect[]>({
    query: `*[_type == "redirect"]{
      "source": select(
        sourceType == "internal" => "/" + sourcePage->slug.current,
        sourcePath
      ),
      "destination": select(
        destinationType == "internal" => "/" + destinationPage->slug.current,
        destinationPath
      ),
      permanent
    }`,
  });

  cachedRedirects = (data ?? []).filter((r) => r.source && r.destination);
  cacheTimestamp = now;
  return cachedRedirects;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;

  // Set preview mode based on cookie
  context.locals.isPreview =
    context.cookies.has("__sanity_preview") ||
    import.meta.env.PUBLIC_SANITY_VISUAL_EDITING_ENABLED === "true";

  // Skip studio and API routes
  const studioRoute = import.meta.env.PUBLIC_SANITY_STUDIO_ROUTE || "/studio";
  if (pathname.startsWith(studioRoute) || pathname.startsWith("/api/")) {
    return next();
  }

  const redirects = await getRedirects();
  const match = redirects.find((r) => r.source === pathname);

  if (match) {
    return context.redirect(match.destination, match.permanent ? 301 : 302);
  }

  const response = await next();

  // Fix CSP style-src: Astro auto-generates sha256 hashes for inline <style> elements,
  // but mux-video web component injects <style> in its shadow DOM at runtime.
  // When hashes are present, browsers ignore 'unsafe-inline' per CSP spec.
  // Strip the hashes so 'unsafe-inline' takes effect for shadow DOM compatibility.
  // Also append gstatic.com to script-src for Chrome's Chromecast detection on <video> pages.
  const csp = response.headers.get("content-security-policy");
  if (csp) {
    const fixedCsp = csp
      .replace(STYLE_SRC_RE, "style-src 'self' 'unsafe-inline'")
      .replace(SCRIPT_SRC_RE, (m) => `${m} www.gstatic.com`);
    response.headers.set("content-security-policy", fixedCsp);
  }

  return response;
});
