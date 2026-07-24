import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Viewtrace — Tamper-evident records of what sites showed";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADLINE = "Tamper-evident records of what sites showed";
const SUBLINE =
  "Geo-routed captures with timestamps and integrity checks for teams that need shared truth.";

/** public 配下のロゴを data URL 化。読めない場合は null（テキストにフォールバック） */
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(join(process.cwd(), "public/brand/viewtrace-logo.png"));
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const logo = await loadLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#fffcf7",
          backgroundImage:
            "radial-gradient(circle at 88% 12%, #d4ebe4 0%, rgba(212,235,228,0) 45%), radial-gradient(circle at 6% 96%, #d4ebe4 0%, rgba(212,235,228,0) 40%)",
          color: "#0c1222",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="Viewtrace" width={252} height={107} />
          ) : (
            <div style={{ display: "flex", fontSize: 56, fontWeight: 700, color: "#1a6b5c" }}>
              Viewtrace
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              maxWidth: 980,
            }}
          >
            {HEADLINE}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              lineHeight: 1.4,
              color: "#3d4a63",
              maxWidth: 900,
            }}
          >
            {SUBLINE}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 9999, backgroundColor: "#1a6b5c" }} />
          <div style={{ display: "flex", fontSize: 26, fontWeight: 600, color: "#1a6b5c" }}>
            viewtrace.net
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
