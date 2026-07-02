import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Without this, Turbopack walks up looking for a workspace root and picks
  // /home/<user>/package-lock.json (an unrelated stub outside this repo) over
  // this project's own Docs/package-lock.json, breaking node_modules resolution
  // (e.g. "Can't resolve 'tailwindcss'"). Pin it explicitly to this directory.
  turbopack: {
    root: path.join(__dirname),
  },
  // Prints "GET <url> 200 in Nms (cache: HIT/SKIP)" server-side for every fetch()
  // call — the official way to see whether a request actually hit GitHub or was
  // served from the Data Cache, independent of the custom logging in lib/github.ts.
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
