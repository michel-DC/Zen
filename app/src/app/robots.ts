import type { MetadataRoute } from "next";

/** Zen est une application personnelle : aucune page n'a vocation à être indexée. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
