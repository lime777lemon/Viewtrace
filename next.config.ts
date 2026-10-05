import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // imghash pulls @cwasm/* (.wasm next to native decoders). Bundling breaks those paths on Vercel.
  serverExternalPackages: ["sharp", "imghash"],
  // Dev: localhost で起動したサーバーへ 127.0.0.1 から /_next/* を取るとき（ブラウザ／Cursor）
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return [
      {
        source: "/signup",
        destination: "/login?mode=signup",
        permanent: true,
      },
      {
        source: "/sign-up",
        destination: "/login?mode=signup",
        permanent: true,
      },
      {
        source: "/register",
        destination: "/login?mode=signup",
        permanent: true,
      },
      {
        source: "/signin",
        destination: "/login?mode=signin",
        permanent: true,
      },
      {
        source: "/sign-in",
        destination: "/login?mode=signin",
        permanent: true,
      },
      {
        source: "/support",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/contactus",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/contact-us",
        destination: "/contact",
        permanent: true,
      },
      {
        source: "/security.txt",
        destination: "/.well-known/security.txt",
        permanent: true,
      },
      {
        source: "/sitemap.html",
        destination: "/site-map",
        permanent: true,
      },
      {
        source: "/sitemap",
        destination: "/sitemap.xml",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
