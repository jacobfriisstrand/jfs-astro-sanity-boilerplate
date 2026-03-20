import { defineMiddleware } from "astro:middleware";
import { loadQuery } from "@/sanity/lib/load-query";

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

  // Skip studio and API routes
  if (pathname.startsWith("/studio") || pathname.startsWith("/api/")) {
    return next();
  }

  const redirects = await getRedirects();
  const match = redirects.find((r) => r.source === pathname);

  if (match) {
    return context.redirect(match.destination, match.permanent ? 301 : 302);
  }

  return next();
});
