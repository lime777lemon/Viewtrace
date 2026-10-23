import { animationChanged, animationChecks, behaviorFactLines, playbackProgressed, videoClaim } from "../src/lib/behavior-observation";
import { interactionEvidenceCard } from "../src/lib/interaction-evidence-card";
import { parseInteractionEvidence } from "../src/lib/observation-interaction-evidence";

const namedOnly = parseInteractionEvidence({
  actions: ["WAIT"],
  selector: "#still",
  animation: {
    detected: true,
    play_state_before: "paused",
    play_state_after: "paused",
    time_before: 0,
    time_after: 0,
    transform_changed: false,
    box_changed: false,
    region_changed: true,
    opacity_changed: false,
  },
});
if (animationChanged(namedOnly?.animation)) throw new Error("name or hash alone");
if (animationChecks(namedOnly?.animation).find((row) => row.id === "web_animation")?.state !== "no") throw new Error("paused");

const running = {
  detected: true,
  play_state_before: "running",
  play_state_after: "running",
  time_before: 0.1,
  time_after: 0.52,
  transform_changed: true,
  box_changed: true,
  region_changed: true,
  opacity_changed: false,
};
if (!animationChanged(running)) throw new Error("running");
const runningLines = behaviorFactLines({ animation: running });
if (!runningLines.includes("Animation detected")) throw new Error("detected");
if (!runningLines.includes("WebAnimation running ✓")) throw new Error(runningLines.join(" | "));
if (!runningLines.includes("Transform t1 → t2 changed ✓")) throw new Error("transform");
if (!runningLines.includes("Bounding box changed ✓")) throw new Error("box");
if (!runningLines.includes("Rendered region changed ✓")) throw new Error("region");

const played = {
  time_before: 2.1,
  time_after: 4.2,
  paused_before: true,
  paused_after: false,
  ended: false,
  ready_before: 2,
  ready_after: 4,
  video_width: 160,
  video_height: 90,
  playback_error: null,
  media_network: false,
  visible: true,
};
if (!playbackProgressed(played)) throw new Error("progress");
const claim = videoClaim(played);
if (claim !== "Playback progressed 2.10 → 4.20") throw new Error(claim ?? "missing");
const videoLines = behaviorFactLines({ video: played });
if (videoLines.some((line) => /fully|picture|displayed correctly/i.test(line))) throw new Error(videoLines.join(" | "));
if (!videoLines.includes("readyState 2 → 4")) throw new Error("ready");
if (!videoLines.includes("paused true → false")) throw new Error("paused");
if (!videoLines.includes("ended no")) throw new Error("ended");
if (!videoLines.includes("video 160×90")) throw new Error("size");
if (!videoLines.includes("Playback error none")) throw new Error("error");
if (!videoLines.includes("Media network failure no")) throw new Error("network");
if (!videoLines.includes("Rendered visibility visible")) throw new Error("visible");

const hidden = { ...played, visible: false };
if (!playbackProgressed(hidden)) throw new Error("hidden still progressed");
if (!behaviorFactLines({ video: hidden }).includes("Rendered visibility hidden")) throw new Error("hidden line");

const stuck = { ...played, time_after: 2.1, paused_after: true };
if (playbackProgressed(stuck)) throw new Error("stuck");
if (videoClaim(stuck) !== "Playback did not progress 2.10 → 2.10") throw new Error(videoClaim(stuck) ?? "");

const card = interactionEvidenceCard("video", parseInteractionEvidence({ actions: ["PLAY"], video: played, note: claim }));
if (!card?.facts.some((line) => line.startsWith("Playback progressed 2.10 → 4.20"))) throw new Error("card");
if (card.note) throw new Error("duplicate note");

console.log("ok");
