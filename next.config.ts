import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imghash pulls @cwasm/* (.wasm next to native decoders). Bundling breaks those paths on Vercel.
  serverExternalPackages: ["sharp", "imghash"],
  async redirects() {
    return [
      {
        source: "/support",
        destination: "/contact",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
