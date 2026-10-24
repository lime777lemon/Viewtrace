/**
 * Repeated rendered-state samples.
 * Animation currentTime advancing is recorded separately and is not Working.
 */
export const MOTION_FRAME_CLASSIFIER = `function classifyMotionFrames(frames) {
  function nums(text) {
    var found = String(text || "").match(/[-0-9.]+/g);
    var values = [];
    var i;
    if (!found) return values;
    for (i = 0; i < found.length; i++) {
      var n = Number(found[i]);
      if (isFinite(n)) values.push(n);
    }
    return values;
  }
  function decompose(transform) {
    var text = String(transform || "none");
    var m3 = text.match(/matrix3d\\(([^)]+)\\)/);
    var m2 = text.match(/matrix\\(([^)]+)\\)/);
    var n;
    if (m3) {
      n = nums(m3[1]);
      if (n.length >= 16) {
        return {
          tx: n[12], ty: n[13],
          sx: Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 0,
          sy: Math.sqrt(n[4] * n[4] + n[5] * n[5]) || 0,
          rot: Math.atan2(n[1], n[0]) * 180 / Math.PI,
        };
      }
    }
    if (m2) {
      n = nums(m2[1]);
      if (n.length >= 6) {
        return {
          tx: n[4], ty: n[5],
          sx: Math.sqrt(n[0] * n[0] + n[1] * n[1]) || 0,
          sy: Math.sqrt(n[2] * n[2] + n[3] * n[3]) || 0,
          rot: Math.atan2(n[1], n[0]) * 180 / Math.PI,
        };
      }
    }
    return { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0 };
  }
  function steps(values, epsilon) {
    var forward = 0;
    var dir = 0;
    var jumps = 0;
    var i;
    for (i = 1; i < values.length; i++) {
      if (!isFinite(values[i]) || !isFinite(values[i - 1])) return { forward: 0, jumps: 0 };
      var d = values[i] - values[i - 1];
      if (Math.abs(d) < epsilon) continue;
      jumps += 1;
      var sign = d > 0 ? 1 : -1;
      if (dir === 0) dir = sign;
      if (sign !== dir) return { forward: 0, jumps: jumps };
      forward += 1;
    }
    return { forward: forward, jumps: jumps };
  }
  function textJumps(values) {
    var jumps = 0;
    var i;
    for (i = 1; i < values.length; i++) {
      if (String(values[i] || "") !== String(values[i - 1] || "")) jumps += 1;
    }
    return jumps;
  }
  var rows = [];
  var i;
  for (i = 0; i < (frames || []).length; i++) {
    if (frames[i]) rows.push(frames[i]);
  }
  if (rows.length < 2) return { continuous: false, oneShot: false, timeline: false, changes: [] };
  var parts = rows.map(function (f) { return decompose(f.transform); });
  var x = steps(rows.map(function (f) { return Number(f.x) || 0; }), 2);
  var y = steps(rows.map(function (f) { return Number(f.y) || 0; }), 2);
  var w = steps(rows.map(function (f) { return Number(f.w) || 0; }), 2);
  var h = steps(rows.map(function (f) { return Number(f.h) || 0; }), 2);
  var opacity = steps(rows.map(function (f) { return Number(f.opacity); }), 0.02);
  var tx = steps(parts.map(function (p) { return p.tx; }), 0.5);
  var ty = steps(parts.map(function (p) { return p.ty; }), 0.5);
  var sx = steps(parts.map(function (p) { return p.sx; }), 0.01);
  var sy = steps(parts.map(function (p) { return p.sy; }), 0.01);
  var rot = steps(parts.map(function (p) { return p.rot; }), 0.5);
  var filter = textJumps(rows.map(function (f) { return f.filter; }));
  var clip = textJumps(rows.map(function (f) { return f.clipPath; }));
  var color = textJumps(rows.map(function (f) { return f.color; }));
  var background = textJumps(rows.map(function (f) { return f.backgroundColor; }));
  var changes = [];
  if (x.jumps || y.jumps || w.jumps || h.jumps) changes.push("bounding_rect");
  if (tx.jumps || ty.jumps) changes.push("transform");
  if (sx.jumps || sy.jumps) changes.push("scale");
  if (rot.jumps) changes.push("rotation");
  if (opacity.jumps) changes.push("opacity");
  if (filter) changes.push("filter");
  if (clip) changes.push("clip_path");
  if (color) changes.push("color");
  if (background) changes.push("background");
  var times = [];
  for (i = 0; i < rows.length; i++) {
    if (typeof rows[i].time === "number" && isFinite(rows[i].time)) times.push(rows[i].time);
  }
  var timeline = false;
  if (times.length >= 2) timeline = steps(times, 16).forward >= 1;
  var continuous = x.forward >= 2 || y.forward >= 2 || w.forward >= 2 || h.forward >= 2
    || opacity.forward >= 2 || tx.forward >= 2 || ty.forward >= 2
    || sx.forward >= 2 || sy.forward >= 2 || rot.forward >= 2
    || filter >= 2 || clip >= 2 || color >= 2 || background >= 2;
  var oneShot = !continuous && (
    x.jumps === 1 || y.jumps === 1 || w.jumps === 1 || h.jumps === 1 || opacity.jumps === 1
    || tx.jumps === 1 || ty.jumps === 1 || sx.jumps === 1 || sy.jumps === 1 || rot.jumps === 1
    || filter === 1 || clip === 1 || color === 1 || background === 1
  );
  return { continuous: continuous, oneShot: oneShot, timeline: timeline, changes: changes };
}`;

export type MotionFrameSample = {
  x: number;
  y: number;
  opacity: number;
  transform: string;
  time: number | null;
  w?: number;
  h?: number;
  filter?: string;
  clipPath?: string;
  color?: string;
  backgroundColor?: string;
};

export type MotionTraceEvidence = {
  x: string;
  opacity: string;
  transform: string;
  time: string;
};

export function parseMotionTrace(raw: unknown): MotionTraceEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const text = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 120) : "");
  const x = text(row.x);
  const opacity = text(row.opacity);
  if (!x && !opacity) return null;
  return { x, opacity, transform: text(row.transform), time: text(row.time) };
}

export type MotionFrameVerdict = {
  continuous: boolean;
  oneShot: boolean;
  timeline: boolean;
  changes: string[];
};

export function classifyMotionFrames(frames: Array<MotionFrameSample | null>): MotionFrameVerdict {
  const run = new Function(`${MOTION_FRAME_CLASSIFIER}; return classifyMotionFrames;`) as () => (
    frames: Array<MotionFrameSample | null>,
  ) => MotionFrameVerdict;
  return run()(frames);
}
