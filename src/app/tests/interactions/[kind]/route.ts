import { NextResponse } from "next/server";
import {
  INTERACTION_FIXTURE_KINDS,
  INTERACTION_FIXTURE_MODES,
  interactionFixtureDocument,
  type InteractionFixtureKind,
  type InteractionFixtureMode,
} from "@/lib/interaction-test-fixtures";

type Props = { params: Promise<{ kind: string }> };

function isKind(raw: string): raw is InteractionFixtureKind {
  return (INTERACTION_FIXTURE_KINDS as readonly string[]).includes(raw);
}

function isMode(raw: string): raw is InteractionFixtureMode {
  return (INTERACTION_FIXTURE_MODES as readonly string[]).includes(raw);
}

export async function GET(request: Request, { params }: Props) {
  const { kind } = await params;
  if (!isKind(kind)) return new NextResponse("Not found", { status: 404 });
  const modeRaw = new URL(request.url).searchParams.get("mode") ?? "working";
  if (!isMode(modeRaw)) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(interactionFixtureDocument(kind, modeRaw), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
