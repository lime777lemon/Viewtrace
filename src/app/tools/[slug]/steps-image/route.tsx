import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getRequestLocale } from "@/lib/i18n/locale-server";
import { getHowItWorks, getTopicPageCopy, isTopicSlug } from "@/lib/seo/topic-pages";

const SIZE = { width: 1200, height: 630 } as const;

export const runtime = "nodejs";

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public/brand/viewtrace-logo.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** 使い方4ステップを図解した説明画像（OG 画像と同じ ImageResponse 方式） */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!isTopicSlug(slug)) {
    return new Response("Not found", { status: 404 });
  }

  const locale = await getRequestLocale();
  const how = getHowItWorks(locale);
  const c = getTopicPageCopy(locale, slug);
  const logo = await loadLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px",
          backgroundColor: "#fffcf7",
          backgroundImage:
            "radial-gradient(circle at 92% 8%, #d4ebe4 0%, rgba(212,235,228,0) 42%), radial-gradient(circle at 4% 98%, #d4ebe4 0%, rgba(212,235,228,0) 38%)",
          color: "#0c1222",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#1a6b5c" }}>
              {how.title}
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 8,
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                lineHeight: 1.15,
                maxWidth: 900,
              }}
            >
              {c.h1}
            </div>
          </div>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Viewtrace" width={168} height={71} />
          ) : (
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#1a6b5c" }}>
              Viewtrace
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            alignItems: "stretch",
            gap: 20,
            marginTop: 48,
          }}
        >
          {how.steps.map((step, i) => (
            <div key={step.title} style={{ display: "flex", flex: 1, alignItems: "stretch" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  borderRadius: 24,
                  border: "1px solid #e2ddd4",
                  backgroundColor: "#ffffff",
                  padding: "28px 24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 56,
                    height: 56,
                    borderRadius: 9999,
                    backgroundColor: "#d4ebe4",
                    color: "#1a6b5c",
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 20,
                    fontSize: 24,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    color: "#0c1222",
                  }}
                >
                  {step.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 12,
                    fontSize: 16,
                    lineHeight: 1.4,
                    color: "#3d4a63",
                  }}
                >
                  {step.body}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 36 }}>
          <div style={{ display: "flex", width: 12, height: 12, borderRadius: 9999, backgroundColor: "#1a6b5c" }} />
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: "#1a6b5c" }}>
            viewtrace.net
          </div>
        </div>
      </div>
    ),
    { ...SIZE },
  );
}
