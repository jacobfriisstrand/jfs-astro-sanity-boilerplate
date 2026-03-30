import type { APIRoute } from "astro";

export const GET: APIRoute = ({ redirect, cookies }) => {
  cookies.delete("__sanity_preview", { path: "/" });
  return redirect("/", 307);
};
