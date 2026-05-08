import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imghash pulls @cwasm/* (.wasm next to native decoders). Bundling breaks those paths on Vercel.
  serverExternalPackages: ["sharp", "imghash"],
};

export default nextConfig;
