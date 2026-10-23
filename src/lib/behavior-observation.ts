/** Behavior facts. A named animation or a video element is not Working until t1 and t2 differ. */

export type BehaviorCheckState = "yes" | "no" | "not_measured";

export type BehaviorCheck = {
  id: "web_animation" | "transform" | "bounding_box" | "rendered_region" | "opacity" | "playback";
  state: BehaviorCheckState;
};

export type AnimationObservation = {
  detected: boolean;
  play_state_before: string | null;
  play_state_after: string | null;
  time_before: number | null;
  time_after: number | null;
  transform_changed: boolean | null;
  box_changed: boolean | null;
  region_changed: boolean | null;
  opacity_changed: boolean | null;
};

export type VideoObservation = {
  time_before: number | null;
  time_after: number | null;
  paused_before: boolean | null;
  paused_after: boolean | null;
  ended: boolean | null;
  ready_before: number | null;
  ready_after: number | null;
  video_width: number | null;
  video_height: number | null;
  playback_error: string | null;
  media_network: boolean | null;
  visible: boolean | null;
};

const CHECK_LABEL: Record<BehaviorCheck["id"], string> = {
  web_animation: "WebAnimation running",
  transform: "Transform t1 → t2 changed",
  bounding_box: "Bounding box changed",
  rendered_region: "Rendered region changed",
  opacity: "Opacity changed",
  playback: "Playback progressed",
};

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.slice(0, max);
  return trimmed.length ? trimmed : null;
}

function flag(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

function stateOf(value: boolean | null): BehaviorCheckState {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "not_measured";
}

export function parseAnimationObservation(raw: unknown): AnimationObservation | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  if (row.detected !== true) return null;
  return {
    detected: true,
    play_state_before: text(row.play_state_before, 24),
    play_state_after: text(row.play_state_after, 24),
    time_before: finite(row.time_before),
    time_after: finite(row.time_after),
    transform_changed: flag(row.transform_changed),
    box_changed: flag(row.box_changed),
    region_changed: flag(row.region_changed),
    opacity_changed: flag(row.opacity_changed),
  };
}

export function parseVideoObservation(raw: unknown): VideoObservation | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const parsed: VideoObservation = {
    time_before: finite(row.time_before),
    time_after: finite(row.time_after),
    paused_before: flag(row.paused_before),
    paused_after: flag(row.paused_after),
    ended: flag(row.ended),
    ready_before: finite(row.ready_before),
    ready_after: finite(row.ready_after),
    video_width: finite(row.video_width),
    video_height: finite(row.video_height),
    playback_error: text(row.playback_error, 120),
    media_network: flag(row.media_network),
    visible: flag(row.visible),
  };
  const measured = Object.values(parsed).some((value) => value != null);
  return measured ? parsed : null;
}

export function animationChecks(raw: AnimationObservation | null | undefined): BehaviorCheck[] {
  if (!raw?.detected) return [];
  const timed = raw.time_before != null && raw.time_after != null;
  const running: BehaviorCheckState = timed
    ? raw.time_after! > raw.time_before! + 0.01 ? "yes" : "no"
    : raw.play_state_before != null || raw.play_state_after != null
      ? "no"
      : "not_measured";
  return [
    { id: "web_animation", state: running },
    { id: "transform", state: stateOf(raw.transform_changed) },
    { id: "bounding_box", state: stateOf(raw.box_changed) },
    { id: "rendered_region", state: stateOf(raw.region_changed) },
    { id: "opacity", state: stateOf(raw.opacity_changed) },
  ];
}

/** animation-name is not an input. A region hash alone is not Working. */
export function animationChanged(raw: AnimationObservation | null | undefined): boolean {
  return animationChecks(raw).some((check) => check.id !== "rendered_region" && check.state === "yes");
}

export function playbackProgressed(raw: VideoObservation | null | undefined): boolean {
  if (!raw || raw.time_before == null || raw.time_after == null || raw.paused_after == null) return false;
  return raw.paused_after === false && raw.time_after > raw.time_before + 0.05;
}

/** currentTime movement says playback progressed. It does not say the picture looked correct. */
export function videoClaim(raw: VideoObservation | null | undefined): string | null {
  if (!raw || raw.time_before == null || raw.time_after == null) return null;
  const from = raw.time_before.toFixed(2);
  const to = raw.time_after.toFixed(2);
  return playbackProgressed(raw) ? `Playback progressed ${from} → ${to}` : `Playback did not progress ${from} → ${to}`;
}

function mark(state: BehaviorCheckState): string {
  if (state === "yes") return "✓";
  if (state === "no") return "no";
  return "not measured";
}

export function behaviorFactLines(input: {
  animation?: AnimationObservation | null;
  video?: VideoObservation | null;
}): string[] {
  const lines: string[] = [];
  if (input.animation?.detected) {
    lines.push("Animation detected");
    for (const check of animationChecks(input.animation)) {
      lines.push(`${CHECK_LABEL[check.id]} ${mark(check.state)}`);
    }
  }
  const video = input.video;
  if (video) {
    const claim = videoClaim(video);
    if (claim) lines.push(`${claim} ${playbackProgressed(video) ? "✓" : "no"}`);
    if (video.ready_before != null || video.ready_after != null) {
      lines.push(`readyState ${video.ready_before ?? "—"} → ${video.ready_after ?? "—"}`);
    }
    if (video.paused_before != null || video.paused_after != null) {
      lines.push(`paused ${video.paused_before ?? "—"} → ${video.paused_after ?? "—"}`);
    }
    if (video.ended != null) lines.push(`ended ${video.ended ? "yes" : "no"}`);
    if (video.video_width != null || video.video_height != null) {
      lines.push(`video ${video.video_width ?? "—"}×${video.video_height ?? "—"}`);
    }
    if (video.playback_error != null) lines.push(`Playback error ${video.playback_error}`);
    else if (video.time_before != null) lines.push("Playback error none");
    if (video.media_network != null) lines.push(`Media network failure ${video.media_network ? "yes" : "no"}`);
    if (video.visible != null) lines.push(`Rendered visibility ${video.visible ? "visible" : "hidden"}`);
  }
  return lines;
}
