import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imghash pulls @cwasm/* (.wasm next to native decoders). Bundling breaks those paths on Vercel.
  serverExternalPackages: ["sharp", "imghash"],
  // Dev: localhost で起動したサーバーへ 127.0.0.1 から /_next/* を取るとき（ブラウザ／Cursor）
  allowedDevOrigins: ["127.0.0.1"],
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
