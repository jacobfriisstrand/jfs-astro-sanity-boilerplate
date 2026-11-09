import { sanityClient } from "sanity:client";
import { validatePreviewUrl } from "@sanity/preview-url-secret";
import type { APIRoute } from "astro";

// `process.env` is not populated from `.env` files in `astro dev` (only during
// `astro build`), so prefer `import.meta.env` with a `process.env` fallback for
// production/standalone runtime.
const token =
  import.meta.env.SANITY_API_READ_TOKEN ?? process.env.SANITY_API_READ_TOKEN;

export const GET: APIRoute = async ({ request, redirect, cookies }) => {
  if (!token) {
    return new Response("Missing SANITY_API_READ_TOKEN", { status: 500 });
  }

  const client = sanityClient.withConfig({ token });
  const { isValid, redirectTo = "/" } = await validatePreviewUrl(
    client,
    request.url
  );

  if (!isValid) {
    return new Response("Invalid preview secret", { status: 401 });
  }

  cookies.set("__sanity_preview", "true", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
  });

  return redirect(redirectTo, 307);
};
