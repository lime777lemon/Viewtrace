import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { COOKIE_NOISE_PATTERN_SOURCE } from "@/lib/observation-interaction-evidence";
import { EXPENSIVE_INTERACTION_TYPES } from "@/lib/observation-interaction-plan";
import { INTERACTION_UNSAFE_PATTERN_SOURCE } from "@/lib/observation-regional-interaction";

/** Same Browserless session: Detect → Execute → Verify. Detected is never Working. */
export function buildInteractionFunctionCode(): string {
  const ua = JSON.stringify(BROWSER_LIKE_USER_AGENT);
  const lang = JSON.stringify(BROWSER_LIKE_ACCEPT_LANGUAGE);
  const unsafe = JSON.stringify(INTERACTION_UNSAFE_PATTERN_SOURCE);
  const cookieNoise = JSON.stringify(COOKIE_NOISE_PATTERN_SOURCE);
  return `export default async function({ page, context }) {
  const url = String(context && context.url ? context.url : "");
  const html = String(context && context.html ? context.html : "");
  const fracs = [0, 0.25, 0.5, 0.75, 1];
  const unsafeSource = ${unsafe};
  const cookieSource = ${cookieNoise};
  const cookieRe = new RegExp(cookieSource, "i");
  const expensiveTypes = ${JSON.stringify([...EXPENSIVE_INTERACTION_TYPES])};
  const priorList = Array.isArray(context && context.prior) ? context.prior : [];
  const started = Date.now();
  const deadline = started + 78000;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function withTimeout(promise, ms, fallback) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((resolve) => { timer = setTimeout(() => resolve(fallback), ms); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  if (page.setDefaultTimeout) page.setDefaultTimeout(8000);
  await page.setUserAgent(${ua});
  await page.setExtraHTTPHeaders({ "Accept-Language": ${lang} });
  const lightScan = String(context && context.scan ? context.scan : "") === "light";
  const requestedDevice = String(context && context.environment && context.environment.device_class ? context.environment.device_class : "desktop") === "mobile" ? "mobile" : "desktop";
  let environment = null;
  let temporal = { ran: false, window_ms: 0, completed_through_ms: 0, reason: "skipped", behaviors: [] };
  let pendingRegions = [];
  let regionTrack = { ran: false, samples: 0, active_cells: 0, error: "" };
  let exhaustion = { status: "skipped", reason: "skipped", discovered: 0, executed: 0, unexplored: 0, unexplored_reasons: [] };
  const unexploredSeen = {};
  function recordUnexplored(item, reason) {
    if (!item || !item.selector) return;
    const key = item.selector + "|s:" + (item.shadow_path || []).join(">") + "|f:" + (item.frame_path || []).join(">");
    if (unexploredSeen[key]) return;
    unexploredSeen[key] = true;
    if (exhaustion.unexplored_reasons.length >= 12) return;
    exhaustion.unexplored_reasons.push({ selector: item.selector, reason: reason });
  }
  try {
    if (page.setViewport) {
      await page.setViewport({
        width: requestedDevice === "mobile" ? 390 : 1440,
        height: requestedDevice === "mobile" ? 844 : 900,
        hasTouch: requestedDevice === "mobile",
        isMobile: requestedDevice === "mobile",
        deviceScaleFactor: 1,
      });
    }
  } catch (e) {}
  try {
    if (page.emulateMediaFeatures) {
      await page.emulateMediaFeatures([
        { name: "pointer", value: requestedDevice === "mobile" ? "coarse" : "fine" },
        { name: "hover", value: requestedDevice === "mobile" ? "none" : "hover" },
      ]);
    }
  } catch (e) {}
  function installSampler(light) {
    if (window.__vtInstalled) return;
    window.__vtInstalled = true;
    window.__vtEpoch = Date.now();
    window.__vtTimers = [];
    window.__vtSamples = [];
    function noteTimer(kind, delay) {
      const ms = Number(delay) || 0;
      if (ms < 4000 || window.__vtTimers.length >= 20) return;
      window.__vtTimers.push({ kind: kind, delay: ms, at: Date.now() - window.__vtEpoch });
    }
    try {
      const origTimeout = window.setTimeout;
      window.setTimeout = function (fn, delay) {
        noteTimer("timeout", delay);
        return origTimeout.apply(this, arguments);
      };
      const origInterval = window.setInterval;
      window.setInterval = function (fn, delay) {
        noteTimer("interval", delay);
        return origInterval.apply(this, arguments);
      };
    } catch (e) {}
    function path(el) {
      if (!el || !el.tagName) return "";
      if (el.id) return "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && parts.length < 5) {
        let sel = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (parent) {
          const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
          if (same.length > 1) sel += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    }
    function shadowChain(host) {
      const chain = [];
      let node = host;
      while (node && node.tagName && chain.length < 4) {
        chain.unshift(path(node));
        const root = node.getRootNode ? node.getRootNode() : null;
        if (!root || !root.host) break;
        node = root.host;
      }
      return chain;
    }
    function watchTree(root, shadowPath, framePath) {
      if (!root || root.__vtWatch || !window.MutationObserver) return;
      root.__vtWatch = true;
      const target = root.nodeType === 9 ? root.documentElement : root;
      if (!target) return;
      const obs = new MutationObserver((records) => {
        if (window.__vtMutations.length > 80) return;
        for (const rec of records) {
          const node = rec.target && rec.target.nodeType === 1 ? rec.target : (rec.target && rec.target.parentElement);
          if (!node || !node.tagName) continue;
          const tag = node.tagName.toLowerCase();
          if (tag === "html" || tag === "head" || tag === "body" || tag === "script" || tag === "style") continue;
          const key = path(node);
          if (!key) continue;
          window.__vtMutations.push({
            selector: key,
            kind: rec.type,
            attr: rec.attributeName || "",
            shadow_path: shadowPath || [],
            frame_path: framePath || [],
            at: Date.now() - (window.__vtEpoch || Date.now()),
          });
          if (window.__vtMutations.length > 80) break;
        }
      });
      try {
        obs.observe(target, {
          attributes: true,
          childList: true,
          subtree: true,
          attributeFilter: ["class", "style", "hidden", "open", "aria-expanded", "aria-selected", "aria-hidden"],
        });
      } catch (e) {}
    }
    window.__vtWatchTree = watchTree;
    window.__vtShadows = [];
    try {
      const origAttach = Element.prototype.attachShadow;
      Element.prototype.attachShadow = function (init) {
        const root = origAttach.call(this, init);
        const mode = init && init.mode === "closed" ? "closed" : "open";
        const chain = shadowChain(this);
        window.__vtShadows.push({ selector: chain[chain.length - 1] || path(this), mode: mode, shadow_path: chain });
        if (mode === "open") watchTree(root, chain, []);
        return root;
      };
    } catch (e) {}
    function snap() {
      if (!document.querySelectorAll) return;
      const rows = [];
      const nodes = document.querySelectorAll("h1, h2, p, div, img, span, button, a, canvas, svg, video, iframe, [data-reveal], [data-js-anim], [class*='slide'], [class*='lottie'], [role='tooltip'], [role='dialog'], dialog");
      for (const el of Array.from(nodes).slice(0, 80)) {
        let st;
        try { st = getComputedStyle(el); } catch (e) { continue; }
        const r = el.getBoundingClientRect();
        const anims = el.getAnimations ? el.getAnimations() : [];
        const time = anims.length && anims[0].currentTime != null ? Number(anims[0].currentTime) : null;
        rows.push({
          key: path(el),
          opacity: Number(st.opacity),
          transform: String(st.transform || "none"),
          visibility: String(st.visibility || ""),
          display: String(st.display || ""),
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          className: String(el.className || "").slice(0, 80),
          hidden: el.hidden ? "1" : "0",
          anim: time,
          animationName: String(st.animationName || "none"),
        });
      }
      window.__vtSamples.push({ t: Math.round(performance.now()), at: Date.now() - (window.__vtEpoch || Date.now()), rows: rows });
    }
    const marks = light ? [0, 250, 1000] : [0, 100, 250, 500, 1000, 2000, 3000];
    for (const ms of marks) setTimeout(snap, ms);
    let frames = 0;
    function raf() {
      snap();
      frames += 1;
      if (!light && frames < 12 && window.requestAnimationFrame) requestAnimationFrame(raf);
    }
    if (window.requestAnimationFrame) requestAnimationFrame(raf);
    document.addEventListener("DOMContentLoaded", snap);
    window.__vtMutations = [];
    if (window.MutationObserver) {
      const obs = new MutationObserver((records) => {
        if (window.__vtMutations.length > 80) return;
        for (const rec of records) {
          const node = rec.target && rec.target.nodeType === 1 ? rec.target : (rec.target && rec.target.parentElement);
          if (!node || !node.tagName) continue;
          const tag = node.tagName.toLowerCase();
          if (tag === "html" || tag === "head" || tag === "body" || tag === "script" || tag === "style") continue;
          const key = path(node);
          if (!key) continue;
          window.__vtMutations.push({ selector: key, kind: rec.type, attr: rec.attributeName || "", at: Date.now() - (window.__vtEpoch || Date.now()) });
          if (window.__vtMutations.length > 80) break;
        }
      });
      const arm = () => {
        if (window.__vtObs || !document.documentElement) return;
        window.__vtObs = true;
        const begin = () => {
          obs.observe(document.documentElement, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ["class", "style", "hidden", "open", "aria-expanded", "aria-selected", "aria-hidden"],
          });
        };
        if (window.requestAnimationFrame) requestAnimationFrame(begin);
        else begin();
      };
      if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arm);
      else arm();
    }
  }
  let initOk = false;
  const netLog = [];
  const runtimeLog = [];
  const pendingNet = new Map();
  function requestPath(raw) {
    try { return new URL(String(raw || "")).pathname.slice(0, 120); } catch (e) { return String(raw || "").split("?")[0].slice(0, 120); }
  }
  function rememberRequest(req) {
    if (!req || pendingNet.has(req)) return pendingNet.get(req);
    const row = { method: String(req.method ? req.method() : "GET"), path: requestPath(req.url ? req.url() : ""), started: Date.now(), done: false };
    pendingNet.set(req, row);
    return row;
  }
  try {
    page.on("console", (msg) => {
      try {
        if (!msg || msg.type() !== "error") return;
        runtimeLog.push({ kind: "console_error", message: String(msg.text() || "").slice(0, 160), at: Date.now() });
      } catch (e) {}
    });
    page.on("pageerror", (err) => {
      runtimeLog.push({ kind: "pageerror", message: String(err && err.message ? err.message : err).slice(0, 160), at: Date.now() });
    });
    page.on("response", (res) => {
      try {
        const req = res.request();
        const known = rememberRequest(req);
        known.done = true;
        netLog.push({
          method: known.method,
          path: known.path,
          status: res.status(),
          failed: res.status() >= 400,
          started: known.started,
          duration_ms: Math.max(0, Date.now() - known.started),
        });
      } catch (e) {}
    });
    page.on("requestfailed", (req) => {
      try {
        const known = rememberRequest(req);
        known.done = true;
        const failure = req.failure && req.failure();
        const message = String(failure && failure.errorText ? failure.errorText : "request failed").slice(0, 120);
        netLog.push({ method: known.method, path: known.path, status: null, failed: true, started: known.started, duration_ms: Math.max(0, Date.now() - known.started) });
        runtimeLog.push({ kind: "requestfailed", message: (known.method + " " + known.path + " " + message).slice(0, 160), at: Date.now() });
      } catch (e) {}
    });
  } catch (e) {}
  try {
    await page.goto("about:blank", { waitUntil: "domcontentloaded", timeout: 8000 });
    await page.evaluateOnNewDocument(installSampler, lightScan);
    initOk = true;
  } catch (e) {}
  if (html) {
    try {
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        const known = rememberRequest(req);
        const path = known.path;
        const cors = {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
          "Access-Control-Allow-Headers": "*",
        };
        if (req.method && req.method() === "OPTIONS" && (path === "/api/pricing" || path === "/api/items")) {
          req.respond({ status: 204, headers: cors }).catch(() => {});
          return;
        }
        if (path === "/api/pricing") {
          req.respond({ status: 200, contentType: "application/json", headers: cors, body: '{"ok":true}' }).catch(() => {});
          return;
        }
        if (path === "/api/items") {
          req.respond({ status: 500, contentType: "application/json", headers: cors, body: '{"error":true}' }).catch(() => {});
          return;
        }
        req.continue().catch(() => {});
      });
    } catch (e) {}
  } else {
    try {
      page.on("request", (req) => { rememberRequest(req); });
    } catch (e) {}
  }
  async function settleWindow(since) {
    const limit = Date.now() + 800;
    while (Date.now() < limit) {
      let open = false;
      for (const row of pendingNet.values()) {
        if (row && row.started >= since && !row.done) open = true;
      }
      if (!open) break;
      await sleep(30);
    }
    await sleep(80);
  }
  if (html) {
    const inline = "<script>(" + installSampler.toString() + ")(" + (lightScan ? "true" : "false") + ")</script>";
    const tagged = html.indexOf("<head>") >= 0 ? html.replace("<head>", "<head>" + inline) : inline + html;
    await page.setContent(tagged, { waitUntil: "domcontentloaded", timeout: 20000 });
  } else await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  try {
    if (page.setViewport) {
      await page.setViewport({
        width: requestedDevice === "mobile" ? 390 : 1440,
        height: requestedDevice === "mobile" ? 844 : 900,
        hasTouch: requestedDevice === "mobile",
        isMobile: requestedDevice === "mobile",
        deviceScaleFactor: 1,
      });
    }
  } catch (e) {}
  try {
    const measured = await page.evaluate(() => {
      const coarse = Boolean(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
      let timezone = "";
      try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
      return {
        width: window.innerWidth || 0,
        height: window.innerHeight || 0,
        pointer: coarse ? "touch" : "mouse",
        touch: (navigator.maxTouchPoints || 0) > 0,
        locale: String(navigator.language || ""),
        timezone: timezone,
        prefers_reduced_motion: Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
      };
    });
    environment = {
      device_class: measured.width > 0 && measured.width < 700 ? "mobile" : "desktop",
      viewport: { width: measured.width, height: measured.height },
      pointer: measured.pointer === "touch" ? "touch" : "mouse",
      touch: measured.touch === true,
      locale: measured.locale || "",
      timezone: measured.timezone || "",
      prefers_reduced_motion: measured.prefers_reduced_motion === true,
    };
  } catch (e) {}
  let surfaceInfo = {
    traversal: { shadow_open: 0, shadow_closed: 0, same_origin_frames: 0, cross_origin_frames: 0 },
    unreadable: [],
    controls: [],
    unsafe: [],
  };
  try { surfaceInfo = await readSurfaces(); } catch (e) {}

  async function collectStates() {
    return page.evaluate(() => {
      function path(el) {
        if (el.id) return "#" + CSS.escape(el.id);
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && parts.length < 5) {
          let sel = node.tagName.toLowerCase();
          const parent = node.parentElement;
          if (parent) {
            const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
            if (same.length > 1) sel += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
          }
          parts.unshift(sel);
          node = parent;
        }
        return parts.join(" > ");
      }
      return Array.from(document.querySelectorAll("h1, h2, p, div, img, section, canvas, svg, video, [data-reveal], [data-cursor], [class*='slide'], [class*='lottie']")).slice(0, 120).map((el) => {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          key: path(el),
          opacity: Number(st.opacity),
          transform: String(st.transform || "none"),
          visibility: String(st.visibility || ""),
          display: String(st.display || ""),
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          className: String(el.className || "").slice(0, 80),
          animationName: String(st.animationName || "none"),
        };
      });
    });
  }

  function timedDiff(a, b) {
    const byKey = new Map();
    for (const row of a) byKey.set(row.key, row);
    const load = [];
    const delayed = [];
    for (const row of b) {
      const prev = byKey.get(row.key);
      if (!prev) {
        if (cookieRe.test(row.key + " " + row.className)) delayed.push({ key: row.key, props: ["display"], t0: null, t1: row });
        continue;
      }
      const props = [];
      if (prev.transform !== row.transform) props.push("transform");
      if (Math.abs(prev.opacity - row.opacity) >= 0.02) props.push("opacity");
      if (prev.visibility !== row.visibility) props.push("visibility");
      if (prev.display !== row.display) props.push("display");
      if (Math.abs(prev.x - row.x) >= 2 || Math.abs(prev.y - row.y) >= 2 || Math.abs(prev.w - row.w) >= 2 || Math.abs(prev.h - row.h) >= 2) props.push("bounding_rect");
      if (!props.length) continue;
      const item = { key: row.key, props: props, t0: prev, t1: row };
      if (cookieRe.test(row.key + " " + row.className + " " + prev.className)) delayed.push(item);
      else if (props.indexOf("opacity") >= 0 || props.indexOf("transform") >= 0 || props.indexOf("visibility") >= 0) load.push(item);
      else delayed.push(item);
    }
    return { load: load, delayed: delayed };
  }

  const loadT0 = await collectStates();
  let timeline = [];
  if (initOk) {
    await sleep(lightScan ? 1300 : 3200);
    try { timeline = await page.evaluate(() => window.__vtSamples || []); } catch (e) { timeline = []; }
  } else {
    await sleep(900);
  }
  const loadT1 = await collectStates();
  async function mediaStates() {
    try {
      return await page.evaluate(() => {
        function path(el) {
          if (el.id) return "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
          return el.tagName.toLowerCase();
        }
        return Array.from(document.querySelectorAll("video, audio")).slice(0, 4).map((el) => ({
          selector: path(el),
          paused: el.paused ? "1" : "0",
          currentTime: Math.round((el.currentTime || 0) * 1000) / 1000,
          readyState: el.readyState || 0,
        }));
      });
    } catch (e) { return []; }
  }
  const mediaT0 = await mediaStates();
  function motionPairs(samples) {
    const byKey = {};
    for (const sample of samples || []) {
      for (const row of sample.rows || []) {
        if (!row || !row.key) continue;
        if (!byKey[row.key]) byKey[row.key] = [];
        byKey[row.key].push(row);
      }
    }
    const hits = [];
    for (const key of Object.keys(byKey)) {
      const rows = byKey[key];
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const row = rows[i];
        const props = [];
        if (prev.transform !== row.transform) props.push("transform");
        if (Math.abs((prev.opacity || 0) - (row.opacity || 0)) >= 0.02) props.push("opacity");
        if (prev.visibility !== row.visibility) props.push("visibility");
        if (prev.display !== row.display) props.push("display");
        if (prev.hidden !== row.hidden) props.push("hidden");
        const styleMoved = prev.transform !== row.transform || Math.abs((prev.opacity || 0) - (row.opacity || 0)) >= 0.02;
        const named = (prev.animationName && prev.animationName !== "none") || (row.animationName && row.animationName !== "none");
        if (((prev.anim != null && row.anim != null && row.anim > prev.anim + 16) || named) && styleMoved) props.push("animation");
        if (Math.abs((prev.x || 0) - (row.x || 0)) >= 2 || Math.abs((prev.y || 0) - (row.y || 0)) >= 2) props.push("bounding_rect");
        if (!props.length) continue;
        hits.push({ key: key, props: props, t0: prev, t1: row, className: row.className || prev.className || "" });
        break;
      }
    }
    return hits;
  }
  let motionHits = motionPairs(timeline);
  const legacy = timedDiff(loadT0, loadT1);
  const legacyHits = legacy.load.concat(legacy.delayed).map((row) => {
    const props = (row.props || []).slice();
    const name = (row.t0 && row.t0.animationName) || (row.t1 && row.t1.animationName) || "none";
    if (name !== "none" && (props.indexOf("opacity") >= 0 || props.indexOf("transform") >= 0) && props.indexOf("animation") < 0) props.push("animation");
    return { ...row, props: props, className: (row.t1 && row.t1.className) || (row.t0 && row.t0.className) || "" };
  });
  if (!motionHits.length) motionHits = legacyHits;
  else motionHits = motionHits.concat(legacyHits.filter((row) => !motionHits.some((hit) => hit.key === row.key)));
  const cookieSeen = motionHits.some((row) => cookieRe.test(row.key + " " + (row.className || ""))) ||
    loadT0.concat(loadT1).some((row) => cookieRe.test((row.key || "") + " " + (row.className || "")));
  const timed = {
    load: motionHits.filter((row) => !cookieRe.test(row.key + " " + (row.className || "")) && (row.props.indexOf("opacity") >= 0 || row.props.indexOf("transform") >= 0 || row.props.indexOf("animation") >= 0)),
    delayed: motionHits.filter((row) => cookieRe.test(row.key + " " + (row.className || ""))),
  };
  if (!lightScan && page.screenshot && Date.now() < deadline - 25000) {
    temporal.ran = true;
    try {
      const epoch = await page.evaluate(() => window.__vtEpoch || Date.now());
      const elapsed = () => Date.now() - epoch;
      async function domSnap() {
        return page.evaluate(() => {
          const out = [];
          for (const el of Array.from(document.querySelectorAll("[id]")).slice(0, 40)) {
            let opacity = 1;
            let animationName = "none";
            let running = false;
            try {
              const st = getComputedStyle(el);
              opacity = Number(st.opacity);
              animationName = String(st.animationName || "none");
              const anims = el.getAnimations ? el.getAnimations() : [];
              running = anims.some((anim) => anim.playState === "running");
            } catch (e) {}
            out.push({
              selector: "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id),
              hidden: el.hidden ? "1" : "0",
              text: String(el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 40),
              opacity: opacity,
              animationName: animationName,
              running: running,
            });
          }
          return out;
        }).catch(() => []);
      }
      async function signals() {
        return page.evaluate(() => {
          const timers = Array.isArray(window.__vtTimers) ? window.__vtTimers.slice(0, 20) : [];
          let playing = 0;
          for (const el of Array.from(document.querySelectorAll("video, audio")).slice(0, 4)) {
            if (!el.paused) playing += 1;
          }
          const samples = Array.isArray(window.__vtSamples) ? window.__vtSamples.slice(0, 24) : [];
          return {
            timers: timers,
            playing: playing,
            samples: samples.map((sample) => ({
              at: sample.at || 0,
              rows: (sample.rows || []).slice(0, 40).map((row) => ({
                key: row.key,
                opacity: row.opacity,
                transform: row.transform,
                hidden: row.hidden,
                animationName: row.animationName,
              })),
            })),
          };
        }).catch(() => ({ timers: [], playing: 0, samples: [] }));
      }
      function timerReason(timers, now, nextMark) {
        for (const timer of timers || []) {
          if (timer.kind === "timeout" && timer.delay >= now - 80 && timer.delay <= nextMark + 250) return "delayed_candidate";
        }
        for (const timer of timers || []) {
          if (timer.kind !== "interval" || timer.delay < 4000) continue;
          const next = timer.delay * Math.max(1, Math.ceil(now / timer.delay));
          if (next <= nextMark + 250 && next >= now - 80) return "periodic";
        }
        return "";
      }
      const early = await signals();
      const byKey = {};
      for (const sample of early.samples || []) {
        for (const row of sample.rows || []) {
          if (!row || !row.key || String(row.key).charAt(0) !== "#") continue;
          if (!byKey[row.key]) byKey[row.key] = [];
          byKey[row.key].push({ t: sample.at || 0, opacity: row.opacity, transform: row.transform, hidden: row.hidden });
        }
      }
      for (const key of Object.keys(byKey)) {
        if (temporal.behaviors.length >= 8) break;
        const rows = byKey[key];
        let first = null;
        let last = null;
        const points = [];
        for (let i = 1; i < rows.length; i += 1) {
          const changed = rows[i].opacity !== rows[i - 1].opacity || rows[i].transform !== rows[i - 1].transform || rows[i].hidden !== rows[i - 1].hidden;
          if (!changed) continue;
          if (first == null) first = rows[i - 1].t;
          last = rows[i].t;
          points.push({ t: rows[i].t, change: "style" });
        }
        if (first == null || last == null || last > 3200) continue;
        temporal.behaviors.push({
          selector: key,
          kind: "animation",
          first_seen_at: first,
          last_changed_at: last,
          samples: points.slice(0, 6),
          observation_window_ms: 0,
          sampling_reason: "settled",
        });
      }
      let previousDom = await domSnap();
      const seenBehavior = {};
      for (const row of temporal.behaviors) seenBehavior[row.selector] = true;
      const view = await page.evaluate(() => ({ width: window.innerWidth || 800, height: window.innerHeight || 600 }));
      const cols = 2;
      const rowsN = 2;
      const cellW = Math.max(1, Math.floor((view.width || 800) / cols));
      const cellH = Math.max(1, Math.floor((view.height || 600) / rowsN));
      const cells = [];
      for (let gy = 0; gy < rowsN; gy += 1) {
        for (let gx = 0; gx < cols; gx += 1) {
          cells.push({ gx: gx, gy: gy, x: gx * cellW, y: gy * cellH, width: cellW, height: cellH, samples: [] });
        }
      }
      async function hashCells(list) {
        const t = Math.max(0, elapsed());
        for (const cell of list) {
          try {
            const data = await page.screenshot({
              type: "png",
              encoding: "base64",
              clip: { x: cell.x, y: cell.y, width: cell.width, height: cell.height },
            });
            const text = String(data || "");
            let hash = 0;
            for (let i = 0; i < text.length; i += 64) hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
            cell.samples.push({ t: t, hash: hash.toString(16) });
          } catch (e) {
            if (!regionTrack.error) regionTrack.error = String(e && e.message ? e.message : e).slice(0, 180);
            cell.samples.push({ t: t, hash: "" });
          }
        }
      }
      function stillChanging(list) {
        return list.some((cell) => {
          const samples = (cell.samples || []).filter((sample) => sample.hash);
          if (samples.length < 2) return false;
          return samples[samples.length - 1].hash !== samples[samples.length - 2].hash;
        });
      }
      await hashCells(cells);
      await sleep(350);
      await hashCells(cells);
      let active = cells.filter((cell) => {
        const hashes = cell.samples.map((sample) => sample.hash).filter(Boolean);
        return new Set(hashes).size >= 2;
      });
      if (active.length >= cells.length) active = [];
      regionTrack = {
        ran: true,
        samples: cells[0] && cells[0].samples ? cells[0].samples.length : 0,
        active_cells: active.length,
        error: regionTrack.error || "",
      };
      let reason = active.length && stillChanging(active) ? "still_active" : "settled";
      let windowMs = Math.max(0, elapsed());
      const marks = [5000, 8000, 10000];
      for (const mark of marks) {
        const info = await signals();
        const now = Math.max(0, elapsed());
        const timedReason = timerReason(info.timers, now, mark);
        const visual = active.length > 0 && stillChanging(active);
        const media = info.playing > 0;
        if (!visual && !media && !timedReason) {
          reason = "settled";
          break;
        }
        reason = visual || media ? "still_active" : timedReason;
        const wait = mark + 180 - elapsed();
        if (wait > 0) {
          if (Date.now() + wait > deadline - 20000) {
            reason = "time_limit";
            break;
          }
          await sleep(wait);
        }
        if (active.length) await hashCells(active);
        const nextDom = await domSnap();
        const prev = {};
        for (const row of previousDom || []) prev[row.selector] = row;
        for (const row of nextDom || []) {
          const earlier = prev[row.selector];
          if (!earlier || seenBehavior[row.selector] || temporal.behaviors.length >= 8) continue;
          const changes = [];
          if (earlier.hidden !== row.hidden) changes.push("hidden");
          if (earlier.text !== row.text) changes.push("text");
          if (Math.abs((earlier.opacity || 0) - (row.opacity || 0)) >= 0.02) changes.push("opacity");
          if (!changes.length) continue;
          if (changes.join(",") === "text" && (nextDom || []).some((other) => other.selector !== row.selector && prev[other.selector] && (prev[other.selector].hidden !== other.hidden || (prev[other.selector].text !== other.text && String(row.text || "").indexOf(other.text || "") >= 0)))) continue;
          const at = Math.max(0, elapsed());
          temporal.behaviors.push({
            selector: row.selector,
            kind: timedReason === "periodic" ? "periodic" : "delayed",
            first_seen_at: at,
            last_changed_at: at,
            samples: [{ t: at, change: changes.join(",") }],
            observation_window_ms: 0,
            sampling_reason: timedReason || "delayed_candidate",
          });
          seenBehavior[row.selector] = true;
        }
        previousDom = nextDom;
        windowMs = Math.max(0, elapsed());
        regionTrack.samples = active[0] && active[0].samples ? active[0].samples.length : regionTrack.samples;
      }
      temporal.window_ms = windowMs;
      temporal.completed_through_ms = windowMs;
      temporal.reason = reason;
      for (const behavior of temporal.behaviors) behavior.observation_window_ms = windowMs;
      if (active.length && active.length < cells.length) {
        const group = active.slice(0, 3);
        const x = Math.min.apply(null, group.map((cell) => cell.x));
        const y = Math.min.apply(null, group.map((cell) => cell.y));
        const right = Math.max.apply(null, group.map((cell) => cell.x + cell.width));
        const bottom = Math.max.apply(null, group.map((cell) => cell.y + cell.height));
        const hit = await page.evaluate((px, py) => {
          const el = document.elementFromPoint(px, py);
          if (!el || el === document.body || el === document.documentElement || !el.id) return "";
          return "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
        }, Math.round(x + Math.min(24, (right - x) / 4)), Math.round(y + Math.min(24, (bottom - y) / 4))).catch(() => "");
        const samples = (group[0] && group[0].samples) || [];
        let intervals = 0;
        let changed = 0;
        let lastChanged = samples[0] ? samples[0].t : 0;
        for (let i = 1; i < samples.length; i += 1) {
          if (!samples[i] || !samples[i - 1] || !samples[i].hash || !samples[i - 1].hash) continue;
          intervals += 1;
          if (samples[i].hash !== samples[i - 1].hash) {
            changed += 1;
            lastChanged = samples[i].t;
          }
        }
        const pattern = intervals >= 2 && changed === intervals ? "continuous" : "intermittent";
        const selector = hit || "region:1";
        pendingRegions.push({
          selector: selector,
          source: "frame",
          changes: ["frame", pattern],
          t0: samples[0] ? { t: samples[0].t, hash: samples[0].hash } : null,
          t1: {
            t: samples.length ? samples[samples.length - 1].t : 0,
            hash: samples.length ? samples[samples.length - 1].hash : "",
            pattern: pattern,
            samples: samples.map((sample) => ({ t: sample.t, hash: sample.hash })),
          },
          region: { x: x, y: y, w: right - x, h: bottom - y },
        });
        if (!seenBehavior[selector] && temporal.behaviors.length < 8) {
          temporal.behaviors.push({
            selector: selector,
            kind: "visual",
            first_seen_at: samples[0] ? samples[0].t : 0,
            last_changed_at: lastChanged,
            samples: samples.map((sample) => ({ t: sample.t, hash: sample.hash })),
            observation_window_ms: windowMs,
            sampling_reason: changed > 0 && lastChanged >= 8000 ? "still_active" : "settled",
          });
        }
      }
    } catch (e) {
      temporal.reason = "time_limit";
      if (!regionTrack.error) regionTrack.error = String(e && e.message ? e.message : e).slice(0, 180);
    }
  }

  const detect = await page.evaluate((src) => {
    const bad = new RegExp(src, "i");
    function onPage(el) {
      const r = el.getBoundingClientRect();
      return r.width >= 4 || r.height >= 4 || el.offsetWidth >= 4 || el.offsetHeight >= 4;
    }
    function inView(el) {
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return false;
      const st = getComputedStyle(el);
      if (st.display === "none" || st.visibility === "hidden") return false;
      return r.bottom > 0 && r.top < innerHeight + 80;
    }
    function label(el) {
      return [el.innerText, el.getAttribute("aria-label"), el.getAttribute("name"), el.getAttribute("href"), el.className]
        .filter(Boolean).join(" ").slice(0, 180);
    }
    function path(el) {
      if (el.id) return "#" + CSS.escape(el.id);
      const parts = [];
      let node = el;
      while (node && node.nodeType === 1 && parts.length < 6) {
        let sel = node.tagName.toLowerCase();
        const parent = node.parentElement;
        if (parent) {
          const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
          if (same.length > 1) sel += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
        }
        parts.unshift(sel);
        node = parent;
      }
      return parts.join(" > ");
    }
    function navigates(el) {
      const href = el.getAttribute && el.getAttribute("href");
      if (el.tagName !== "A" || !href) return false;
      if (href.startsWith("#") || href.startsWith("javascript:")) return false;
      return true;
    }
    function firstSafe(nodes, click, viewOnly) {
      let blocked = false;
      for (const el of nodes) {
        if (viewOnly ? !inView(el) : !onPage(el)) continue;
        if (bad.test(label(el))) { blocked = true; continue; }
        if (click && (navigates(el) || String(el.getAttribute("type") || "").toLowerCase() === "submit")) {
          blocked = true;
          continue;
        }
        return { blocked: false, selector: path(el) };
      }
      return { blocked: blocked, selector: null };
    }
    const vh = window.innerHeight;
    const tall = Array.from(document.querySelectorAll("section, [aria-label], main, main > div")).some((el) => el.offsetHeight >= vh * 1.8);
    let cssAnim = false;
    const cssNodes = Array.from(document.querySelectorAll("div, img, h1, h2, section, span")).slice(0, 120);
    for (const el of cssNodes) {
      const st = getComputedStyle(el);
      if (st.animationName && st.animationName !== "none") { cssAnim = true; break; }
      const dur = parseFloat(st.transitionDuration || "0");
      if (dur > 0.05) { cssAnim = true; break; }
    }
    const jsAnim = Boolean(window.gsap || window.Motion || window.anime || document.querySelector("[data-framer-component], [class*='framer-'], [data-gsap], [data-js-anim]"));
    const canvases = Array.from(document.querySelectorAll("canvas"));
    let webgl = false;
    let canvas2d = false;
    for (const c of canvases.slice(0, 6)) {
      try {
        if (c.getContext("2d")) { canvas2d = true; continue; }
      } catch (e) {}
      try {
        if (c.getContext("webgl") || c.getContext("webgl2") || c.getContext("experimental-webgl")) webgl = true;
      } catch (e) {}
    }
    const lottie = Boolean(document.querySelector("lottie-player, dotlottie-player, [class*='lottie'], [data-lottie]"));
    const svgAnim = Boolean(document.querySelector("svg animate, svg animateTransform, svg animateMotion, svg [class*='animate']"));
    const lazy = Boolean(document.querySelector("img[loading='lazy'], img[data-src], img[data-lazy], img[data-original]"));
    const iframe = firstSafe(Array.from(document.querySelectorAll("iframe[src*='youtube'], iframe[src*='youtu.be'], iframe[src*='vimeo'], iframe[srcdoc], iframe[title='player']")).slice(0, 6), false, false);
    const autoCarousel = Boolean(document.querySelector("[class*='swiper'], [class*='carousel'], [class*='slick'], [aria-roledescription='carousel']"));
    const cursorEl = document.querySelector("[data-cursor], [data-speed], [class*='parallax'], [class*='cursor-follow'], [class*='mouse-follow']");
    const cursor = cursorEl ? path(cursorEl) : null;
    const reveal = Boolean(document.querySelector("[data-reveal], [class*='reveal']"));
    return {
      scroll: tall,
      cssAnim: cssAnim,
      jsAnim: jsAnim,
      canvas2d: canvas2d,
      webgl: webgl,
      lottie: lottie,
      svgAnim: svgAnim,
      lazy: lazy,
      reveal: reveal,
      autoCarousel: autoCarousel,
      cursor: cursor,
      hover: firstSafe(Array.from(document.querySelectorAll("a, button, [role='button'], summary, img")).filter((el) => !el.hasAttribute("aria-describedby") && !el.hasAttribute("data-tooltip") && !el.hasAttribute("data-tip")).slice(0, 40), false, true),
      menu: firstSafe(Array.from(document.querySelectorAll("[aria-haspopup='true'], [aria-haspopup='menu'], nav button, .menu-toggle, [class*='hamburger']")).slice(0, 20), true, false),
      modal: firstSafe(Array.from(document.querySelectorAll("[aria-haspopup='dialog'], [data-modal], [data-bs-toggle='modal'], [data-open-modal]")).slice(0, 20), true, false),
      accordion: firstSafe(Array.from(document.querySelectorAll("[aria-expanded='false'], details > summary")).slice(0, 20), true, false),
      carousel: firstSafe(Array.from(document.querySelectorAll("[aria-label*='next' i], [aria-label*='Next'], .swiper-button-next, [data-carousel-next], button[class*='next']")).slice(0, 12), true, false),
      tabs: firstSafe([
        ...Array.from(document.querySelectorAll("[role='tab'][aria-selected='false']")),
        ...Array.from(document.querySelectorAll("[role='tab']")),
      ].slice(0, 16), true, false),
      tooltip: firstSafe(Array.from(document.querySelectorAll("[aria-describedby], [data-tooltip], [data-tip]")).slice(0, 16), false, false),
      drag: firstSafe(Array.from(document.querySelectorAll("[draggable='true'], [data-drag], [data-draggable], .drag-handle, [class*='drag-handle']")).slice(0, 12), false, false),
      swipe: firstSafe([
        ...Array.from(document.querySelectorAll("[data-swipe], #swipe-track")),
        ...Array.from(document.querySelectorAll("[class*='swiper'], [class*='carousel'], [aria-roledescription='carousel']")),
      ].slice(0, 8), false, false),
      video: Boolean(document.querySelector("video")),
      form: firstSafe(Array.from(document.querySelectorAll("input:not([type='hidden']):not([type='password']):not([type='submit']):not([type='button']):not([type='file']):not([type='checkbox']):not([type='radio']), textarea")).slice(0, 16), false, false),
      iframe: iframe,
    };
  }, unsafeSource);

  async function motionSignature() {
    const rows = await collectStates();
    return JSON.stringify(rows.map((r) => [r.key, r.transform, r.opacity, r.display, r.x, r.y]));
  }

  const types = [];
  const pushed = {};
  function pushType(type, detected, status, evidence) {
    if (pushed[type]) return;
    pushed[type] = true;
    types.push({ type: type, detected: Boolean(detected), status: status, evidence: evidence || null });
  }

  async function restore(hard) {
    try {
      try { await page.keyboard.press("Escape"); } catch (e) {}
      if (html && hard) {
        await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
        await sleep(200);
        return { ok: true };
      }
      const here = String(page.url() || "");
      if (!html && (hard || (here && url && here.split("#")[0] !== url.split("#")[0]))) {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 18000 });
        await sleep(200);
        return { ok: true };
      }
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelectorAll("dialog[open]").forEach((d) => { try { d.close(); } catch (e) {} });
        document.querySelectorAll("video").forEach((v) => { try { v.pause(); v.currentTime = 0; } catch (e) {} });
        document.querySelectorAll("input, textarea").forEach((el) => {
          if (!("value" in el)) return;
          if (String(el.value || "").indexOf("vt-check") >= 0) {
            el.value = "";
            el.dispatchEvent(new Event("input", { bubbles: true }));
          }
        });
      });
      await sleep(120);
      return { ok: true };
    } catch (e) {
      return { ok: false };
    }
  }

  async function scrollSel(selector) {
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "center", inline: "nearest" });
    }, selector);
    await sleep(180);
  }

  async function styleSnap(selector) {
    return page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        transform: String(st.transform || "none"),
        opacity: String(st.opacity || ""),
        visibility: String(st.visibility || ""),
        display: String(st.display || ""),
        bg: String(st.backgroundColor || ""),
        color: String(st.color || ""),
        x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
        expanded: el.getAttribute("aria-expanded"),
        hidden: el.getAttribute("aria-hidden"),
        selected: el.getAttribute("aria-selected"),
        open: el.hasAttribute("open") ? "1" : "0",
      };
    }, selector);
  }

  function styleChanged(a, b) {
    if (!a || !b) return false;
    return a.transform !== b.transform || a.opacity !== b.opacity || a.visibility !== b.visibility ||
      a.display !== b.display || a.bg !== b.bg || a.color !== b.color || a.expanded !== b.expanded ||
      a.hidden !== b.hidden || a.selected !== b.selected || a.open !== b.open ||
      Math.abs(a.x - b.x) >= 2 || Math.abs(a.y - b.y) >= 2 || Math.abs(a.w - b.w) >= 2 || Math.abs(a.h - b.h) >= 2;
  }

  async function overlayOpen(kind) {
    return page.evaluate((k) => {
      const sel = k === "menu"
        ? "[role='menu'], [role='listbox'], [aria-expanded='true'] + *"
        : k === "tooltip"
          ? "[role='tooltip'], [data-tooltip-content], .tooltip, [class*='popover']"
          : "dialog[open], [role='dialog'], [aria-modal='true']";
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const el of nodes) {
        const r = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        if (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) continue;
        if (r.width > 8 && r.height > 8) return true;
      }
      return false;
    }, kind);
  }

  async function ownedTip(sel) {
    return page.evaluate((s) => {
      const trigger = s ? document.querySelector(s) : null;
      const id = trigger && (trigger.getAttribute("aria-describedby") || trigger.getAttribute("aria-controls"));
      const el = (id && document.getElementById(id)) || document.querySelector("[role='tooltip']");
      if (!el) return null;
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        selector: el.id ? "#" + CSS.escape(el.id) : "[role='tooltip']",
        open: el.hasAttribute("open") ? "1" : "0",
        hidden: el.hidden ? "1" : "0",
        display: String(st.display || ""),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }, sel);
  }

  async function overlaySnap(kind) {
    return page.evaluate((k) => {
      const el = k === "menu"
        ? document.querySelector("[role='menu']")
        : k === "tooltip"
          ? document.querySelector("[role='tooltip']")
          : document.querySelector("dialog, [role='dialog']");
      if (!el) return null;
      const st = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        selector: el.id ? "#" + CSS.escape(el.id) : el.tagName.toLowerCase(),
        open: el.hasAttribute("open") ? "1" : "0",
        hidden: el.hidden ? "1" : "0",
        display: String(st.display || ""),
        w: Math.round(r.width),
        h: Math.round(r.height),
      };
    }, kind);
  }

  async function nearbySnap(selector) {
    return page.evaluate((sel) => {
      const btn = document.querySelector(sel);
      if (!btn) return [];
      const root = btn.closest("[class*='swiper'], [class*='carousel'], [class*='slider'], [class*='accordion'], [role='tablist'], details, section, nav, [data-swipe], main") || btn.parentElement || document.body;
      const local = [btn, ...Array.from(btn.querySelectorAll("div, img, svg, [class*='slide']"))];
      const extra = Array.from(root.querySelectorAll("img, [class*='slide'], [aria-hidden], [aria-expanded], [aria-selected], [role='tabpanel'], div, li"));
      const seen = new Set();
      const nodes = [];
      for (const el of [...local, ...extra]) {
        if (!el || seen.has(el)) continue;
        seen.add(el);
        nodes.push(el);
        if (nodes.length >= 36) break;
      }
      return nodes.map((el) => {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return [String(st.transform || "none"), String(st.visibility || ""), String(el.getAttribute("aria-hidden") || ""), String(el.getAttribute("aria-expanded") || ""), String(el.getAttribute("aria-selected") || ""), el.hidden ? "1" : "0", Math.round(r.x), Math.round(r.y)].join("|");
      });
    }, selector);
  }

  async function safeClick(selector) {
    const info = await page.evaluate((sel, src) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, reason: "missing" };
      const text = [el.innerText, el.getAttribute("aria-label"), el.getAttribute("href"), el.getAttribute("type")].filter(Boolean).join(" ");
      if (new RegExp(src, "i").test(text)) return { ok: false, reason: "unsafe" };
      const href = el.getAttribute("href");
      if (el.tagName === "A" && href && !href.startsWith("#") && !href.startsWith("javascript:")) return { ok: false, reason: "unsafe" };
      if (String(el.getAttribute("type") || "").toLowerCase() === "submit") return { ok: false, reason: "unsafe" };
      return { ok: true };
    }, selector, unsafeSource);
    if (!info.ok) return info;
    await scrollSel(selector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el && typeof el.click === "function") el.click();
    }, selector);
    return { ok: true };
  }

  async function visualFrames(kind) {
    return page.evaluate(async (k) => {
      function hashCanvas(c, webgl) {
        try {
          if (webgl) {
            try {
              const url = c.toDataURL("image/png");
              if (url && url.length > 80) return String(url.length) + ":" + url.slice(-48);
            } catch (e) {}
            const gl = c.getContext("webgl") || c.getContext("webgl2") || c.getContext("experimental-webgl");
            if (!gl) return null;
            try { gl.finish(); } catch (e) {}
            const w = Math.min(32, c.width || 0);
            const h = Math.min(32, c.height || 0);
            if (!w || !h) return null;
            const buf = new Uint8Array(w * h * 4);
            gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
            let hsh = 0;
            for (let i = 0; i < buf.length; i += 16) hsh = (hsh * 33 + buf[i]) >>> 0;
            return String(hsh) + ":" + buf[0] + ":" + buf[4];
          }
          const ctx = c.getContext("2d");
          if (!ctx) return null;
          const w = Math.min(32, c.width || 32);
          const h = Math.min(32, c.height || 32);
          const data = ctx.getImageData(0, 0, w, h).data;
          let hsh = 0;
          for (let i = 0; i < data.length; i += 16) hsh = (hsh * 33 + data[i]) >>> 0;
          return String(hsh);
        } catch (e) {
          return "tainted";
        }
      }
      function svgSig() {
        return Array.from(document.querySelectorAll("svg")).slice(0, 8).map((s) => {
          const kids = Array.from(s.querySelectorAll("rect, circle, path, g, use")).slice(0, 8).map((n) => {
            const r = n.getBoundingClientRect();
            return [n.getAttribute("cx") || "", n.getAttribute("transform") || "", Math.round(r.x), Math.round(r.y)].join("/");
          }).join("~");
          return kids || String(s.innerHTML.length);
        }).join("|");
      }
      function lottieSig() {
        const el = document.querySelector("lottie-player, dotlottie-player, [class*='lottie']");
        if (!el) return "";
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return [st.transform, st.opacity, Math.round(r.x), Math.round(r.y), el.innerHTML.slice(0, 80)].join("|");
      }
      const samples = [];
      for (let i = 0; i < 5; i++) {
        if (k === "webgl" || k === "canvas") {
          const list = Array.from(document.querySelectorAll("canvas")).slice(0, 4);
          samples.push(list.map((c) => hashCanvas(c, k === "webgl")).filter(Boolean).join(","));
        } else if (k === "svg") samples.push(svgSig());
        else samples.push(lottieSig());
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
      const unique = Array.from(new Set(samples.filter(Boolean)));
      const tainted = samples.some((s) => String(s).indexOf("tainted") >= 0);
      const visible = k === "svg"
        ? Boolean(document.querySelector("svg"))
        : k === "lottie"
          ? Boolean(document.querySelector("lottie-player, dotlottie-player, [class*='lottie']"))
          : Array.from(document.querySelectorAll("canvas")).some((c) => {
              const r = c.getBoundingClientRect();
              return r.width > 8 && r.height > 8;
            });
      return { unique: unique.length, tainted: tainted, visible: visible, hashes: unique.slice(0, 5) };
    }, kind);
  }

  const loadHit = timed.load[0];
  const delayedHit =
    timed.delayed.find((row) => cookieRe.test(row.key + " " + (row.className || ""))) ||
    timed.delayed[0];
  pushType(
    "load_animation",
    Boolean(loadHit || detect.cssAnim),
    loadHit ? "working" : (detect.cssAnim ? "no_change_observed" : "not_detected"),
    loadHit ? { actions: ["LOAD", "WAIT"], selector: loadHit.key, t0: loadHit.t0, t1: loadHit.t1, changes: loadHit.props } : null,
  );
  pushType(
    "delayed",
    Boolean(delayedHit || cookieSeen),
    delayedHit ? "working" : (cookieSeen ? "no_change_observed" : "not_detected"),
    delayedHit ? { actions: ["WAIT"], selector: delayedHit.key, t0: delayedHit.t0, t1: delayedHit.t1, changes: delayedHit.props } : (cookieSeen ? { actions: ["WAIT"], changes: [] } : null),
  );
  async function runHit(type, hit, kind, extraNear) {
    if (hit.blocked && !hit.selector) { pushType(type, true, "blocked_for_safety"); return; }
    if (!hit.selector) { pushType(type, false, "not_detected"); return; }
    await scrollSel(hit.selector);
    const beforeOpen = kind ? await overlayOpen(kind) : false;
    const beforeOverlay = kind ? await overlaySnap(kind) : null;
    const before = await styleSnap(hit.selector);
    let trackSel = null;
    if (extraNear) {
      trackSel = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        const root = el ? (el.closest("main") || document) : document;
        const track = root.querySelector(".slides, [class*='track']");
        if (!track || !track.id) return null;
        return "#" + CSS.escape(track.id);
      }, hit.selector);
    }
    const beforeTrack = trackSel ? await styleSnap(trackSel) : null;
    const beforeNear = extraNear ? await nearbySnap(hit.selector) : null;
    const clicked = await safeClick(hit.selector);
    if (!clicked.ok) { pushType(type, true, "blocked_for_safety"); return; }
    await sleep(450);
    const after = await styleSnap(hit.selector);
    const afterOverlay = kind ? await overlaySnap(kind) : null;
    const afterTrack = trackSel ? await styleSnap(trackSel) : null;
    const afterNear = beforeNear ? await nearbySnap(hit.selector) : null;
    const opened = kind ? await overlayOpen(kind) : false;
    const nearChanged = Boolean(beforeNear && afterNear && JSON.stringify(beforeNear) !== JSON.stringify(afterNear));
    const trackChanged = styleChanged(beforeTrack, afterTrack);
    const overlayChanged = Boolean(beforeOverlay && afterOverlay && JSON.stringify(beforeOverlay) !== JSON.stringify(afterOverlay));
    const ok = (kind && opened && !beforeOpen) || styleChanged(before, after) || nearChanged || trackChanged || overlayChanged;
    let evidenceT0 = before;
    let evidenceT1 = after;
    let evidenceSel = hit.selector;
    if (trackChanged && beforeTrack && afterTrack) {
      evidenceT0 = beforeTrack;
      evidenceT1 = afterTrack;
      evidenceSel = trackSel || hit.selector;
    }
    if (overlayChanged) {
      evidenceT0 = beforeOverlay;
      evidenceT1 = afterOverlay;
      evidenceSel = afterOverlay.selector || hit.selector;
    }
    pushType(type, true, ok ? "working" : "no_change_observed", {
      actions: ["SAFE_CLICK"],
      selector: evidenceSel,
      t0: evidenceT0,
      t1: evidenceT1,
      changes: ok ? ["state"] : [],
    });
  }

  async function runHoverKind(type, hit, kind) {
    if (hit.blocked && !hit.selector) { pushType(type, true, "blocked_for_safety"); return; }
    if (!hit.selector) { pushType(type, false, "not_detected"); return; }
    await scrollSel(hit.selector);
    const beforeOpen = kind ? await overlayOpen(kind) : false;
    const beforeTip = type === "tooltip" ? await ownedTip(hit.selector) : null;
    const before = await styleSnap(hit.selector);
    await page.hover(hit.selector, { timeout: 4000 });
    let tipProbe = null;
    if (type === "tooltip") {
      tipProbe = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { missing: "trigger" };
        const r = el.getBoundingClientRect();
        const opts = { bubbles: true, clientX: r.x + Math.max(1, r.width / 2), clientY: r.y + Math.max(1, r.height / 2) };
        const id = el.getAttribute("aria-describedby") || el.getAttribute("aria-controls") || "";
        const tip = (id && document.getElementById(id)) || document.querySelector("[role='tooltip']");
        const before = tip ? (tip.hidden ? "1" : "0") : "missing";
        try { el.dispatchEvent(new PointerEvent("pointerover", opts)); } catch (e) {}
        try { el.dispatchEvent(new PointerEvent("pointerenter", opts)); } catch (e) {}
        el.dispatchEvent(new MouseEvent("mouseover", opts));
        el.dispatchEvent(new MouseEvent("mouseenter", opts));
        const enterKind = typeof el.onmouseenter;
        const focusKind = typeof el.onfocus;
        if (enterKind === "function") el.onmouseenter(new MouseEvent("mouseenter", opts));
        if (typeof el.focus === "function") el.focus();
        if (focusKind === "function") el.onfocus(new FocusEvent("focus"));
        const after = tip ? (tip.hidden ? "1" : "0") : "missing";
        return { before: before, after: after, enterKind: enterKind, focusKind: focusKind, id: id };
      }, hit.selector);
    }
    await sleep(350);
    let after = await styleSnap(hit.selector);
    const opened = kind ? await overlayOpen(kind) : false;
    const afterTip = type === "tooltip" ? await ownedTip(hit.selector) : null;
    try { await page.mouse.move(0, 0); } catch (e) {}
    let actions = ["HOVER"];
    let ok = (opened && !beforeOpen) || styleChanged(before, after);
    let tipAfter = afterTip;
    let tipChanged = Boolean(beforeTip && tipAfter && JSON.stringify(beforeTip) !== JSON.stringify(tipAfter));
    if (!tipChanged && tipProbe && tipProbe.before && tipProbe.after && tipProbe.before !== tipProbe.after && beforeTip) {
      tipChanged = true;
      tipAfter = { ...beforeTip, hidden: tipProbe.after };
    }
    if (tipChanged) ok = true;
    if (type === "tooltip" && !ok) {
      try { await page.focus(hit.selector); } catch (e) {}
      await sleep(250);
      const focused = await styleSnap(hit.selector);
      const focusedTip = await ownedTip(hit.selector);
      const openedFocus = kind ? await overlayOpen(kind) : false;
      if (beforeTip && focusedTip && JSON.stringify(beforeTip) !== JSON.stringify(focusedTip)) {
        ok = true;
        tipChanged = true;
        tipAfter = focusedTip;
        actions = ["HOVER", "FOCUS"];
      } else if ((openedFocus && !beforeOpen) || styleChanged(before, focused)) {
        ok = true;
        after = focused;
        actions = ["HOVER", "FOCUS"];
      }
    }
    const hoverChanges = [];
    const evidenceT0 = tipChanged ? beforeTip : before;
    const evidenceT1 = tipChanged ? tipAfter : after;
    const evidenceSel = tipChanged && afterTip && afterTip.selector ? afterTip.selector : hit.selector;
    if (ok && evidenceT0 && evidenceT1) {
      if (evidenceT0.transform !== evidenceT1.transform) hoverChanges.push("transform");
      if (evidenceT0.opacity !== evidenceT1.opacity) hoverChanges.push("opacity");
      if (evidenceT0.visibility !== evidenceT1.visibility) hoverChanges.push("visibility");
      if (evidenceT0.display !== evidenceT1.display) hoverChanges.push("display");
      if (evidenceT0.hidden !== evidenceT1.hidden) hoverChanges.push("hidden");
      if (!hoverChanges.length) hoverChanges.push("state");
    }
    pushType(type, true, ok ? "working" : "no_change_observed", {
      actions: actions,
      selector: evidenceSel,
      t0: evidenceT0,
      t1: evidenceT1,
      changes: hoverChanges,
    });
  }

  async function runPointer(type, hit, dx, dy) {
    if (hit.blocked && !hit.selector) { pushType(type, true, "blocked_for_safety"); return; }
    if (!hit.selector) { pushType(type, false, "not_detected"); return; }
    await scrollSel(hit.selector);
    const moving = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return sel;
      const inner = el.querySelector("[id]");
      if (inner && inner.id && inner !== el) return "#" + CSS.escape(inner.id);
      return sel;
    }, hit.selector);
    const beforeStyle = await styleSnap(moving);
    const box = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + Math.min(40, r.width / 2), y: r.y + Math.min(40, r.height / 2), w: r.width, h: r.height };
    }, hit.selector);
    if (!box) { pushType(type, true, "failed"); return; }
    const before = await nearbySnap(hit.selector);
    await page.mouse.move(box.x, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + dx, box.y + dy, { steps: 8 });
    await page.mouse.up();
    await page.evaluate((sel, x, y) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: x, clientY: y }));
    }, hit.selector, box.x + dx, box.y + dy);
    await sleep(350);
    const after = await nearbySnap(hit.selector);
    const afterStyle = await styleSnap(moving);
    const ok = styleChanged(beforeStyle, afterStyle) || JSON.stringify(before) !== JSON.stringify(after);
    pushType(type, true, ok ? "working" : "no_change_observed", {
      actions: type === "swipe" ? ["SWIPE"] : ["DRAG"],
      selector: moving,
      t0: beforeStyle,
      t1: afterStyle,
      changes: ok ? ["bounding_rect"] : [],
    });
  }

  const safetyScan = await page.evaluate((src) => {
    const bad = new RegExp(src, "i");
    const nodes = Array.from(document.querySelectorAll("a, button, input[type='submit'], [role='button']")).slice(0, 40);
    const blocked = [];
    const candidates = [];
    for (const el of nodes) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      const text = [el.innerText, el.getAttribute("aria-label"), el.getAttribute("value"), el.getAttribute("href"), el.getAttribute("name")].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 120);
      if (!text) continue;
      const selector = el.id ? "#" + CSS.escape(el.id) : el.tagName.toLowerCase();
      if (bad.test(text)) {
        if (blocked.length < 8) blocked.push({ selector: selector, text: text });
        continue;
      }
      if (candidates.length < 8) candidates.push({ selector: selector, text: text });
    }
    return { blocked: blocked, candidates: candidates };
  }, unsafeSource);
  const safetyBlocked = safetyScan && safetyScan.blocked ? safetyScan.blocked : [];
  const safetyCandidates = safetyScan && safetyScan.candidates ? safetyScan.candidates : [];

  const jobs = [];
  async function maybe(name, fn) {
    jobs.push({ name: name, fn: fn });
  }

  await maybe("auto_carousel", async () => {
    const early = motionHits.find((row) => row.key === "#auto-track" || row.key === "#auto" || row.key === "#auto-slides");
    if (early) {
      pushType("auto_carousel", true, "working", {
        actions: ["WAIT"],
        selector: early.key,
        t0: early.t0,
        t1: early.t1,
        changes: early.props,
      });
      return;
    }
    if (!detect.autoCarousel) { pushType("auto_carousel", false, "not_detected"); return; }
    const read = () => page.evaluate(() => {
      function path(el) {
        if (el.id) return "#" + CSS.escape(el.id);
        return el.tagName.toLowerCase();
      }
      const root = document.querySelector("[aria-roledescription='carousel'], [class*='swiper'], [class*='carousel'], [class*='slick']");
      if (!root) return null;
      const slides = Array.from(root.querySelectorAll("[class*='slide'], [role='group'], li")).slice(0, 12);
      let index = -1;
      for (let i = 0; i < slides.length; i++) {
        const el = slides[i];
        const active = el.classList.contains("swiper-slide-active") || el.classList.contains("slick-active") || el.getAttribute("aria-hidden") === "false" || el.getAttribute("data-active") === "true";
        if (active) { index = i; break; }
      }
      const track = root.querySelector("[class*='wrapper'], [class*='track'], [class*='slides']") || root;
      const st = getComputedStyle(track);
      return { selector: path(root), index: index, transform: String(st.transform || "none"), count: slides.length };
    });
    const a = await read();
    await sleep(1100);
    const b = await read();
    const ok = Boolean(a && b && (a.index !== b.index || a.transform !== b.transform));
    const changes = [];
    if (a && b && a.index !== b.index) changes.push("active_slide");
    if (a && b && a.transform !== b.transform) changes.push("transform");
    pushType("auto_carousel", true, ok ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      selector: (b && b.selector) || (a && a.selector) || undefined,
      t0: a,
      t1: b,
      changes: changes,
    });
  });
  await maybe("js_animation", async () => {
    if (!detect.jsAnim) { pushType("js_animation", false, "not_detected"); return; }
    const sel = await page.evaluate(() => {
      function path(el) {
        if (el.id) return "#" + CSS.escape(el.id);
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && parts.length < 5) {
          let name = node.tagName.toLowerCase();
          const parent = node.parentElement;
          if (parent) {
            const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
            if (same.length > 1) name += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
          }
          parts.unshift(name);
          node = parent;
        }
        return parts.join(" > ");
      }
      const named = document.querySelector("[data-gsap], [data-framer-component], [class*='framer-'], [data-anim], [data-js-anim]");
      return named ? path(named) : null;
    });
    if (!sel) { pushType("js_animation", true, "no_change_observed", { actions: ["WAIT"], note: "runtime present, no target element" }); return; }
    const early = motionHits.find((row) => row.key === sel);
    if (early) {
      pushType("js_animation", true, "working", {
        actions: ["WAIT"],
        selector: sel,
        t0: early.t0,
        t1: early.t1,
        changes: early.props,
      });
      return;
    }
    const before = await styleSnap(sel);
    await sleep(700);
    const after = await styleSnap(sel);
    const changes = [];
    if (before && after) {
      if (before.transform !== after.transform) changes.push("transform");
      if (before.opacity !== after.opacity) changes.push("opacity");
      if (Math.abs(before.x - after.x) >= 2 || Math.abs(before.y - after.y) >= 2 || Math.abs(before.w - after.w) >= 2 || Math.abs(before.h - after.h) >= 2) changes.push("bounding_rect");
    }
    pushType("js_animation", true, changes.length ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      selector: sel,
      t0: before,
      t1: after,
      changes: changes,
    });
  });
  await maybe("css_animation", async () => {
    const early = motionHits.find((row) => row.props.indexOf("animation") >= 0);
    if (early) {
      pushType("css_animation", true, "working", {
        actions: ["WAIT"],
        selector: early.key,
        t0: early.t0,
        t1: early.t1,
        changes: early.props,
      });
      return;
    }
    if (!detect.cssAnim) { pushType("css_animation", false, "not_detected"); return; }
    const sel = await page.evaluate(() => {
      function path(el) {
        if (el.id) return "#" + CSS.escape(el.id);
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && parts.length < 5) {
          let name = node.tagName.toLowerCase();
          const parent = node.parentElement;
          if (parent) {
            const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
            if (same.length > 1) name += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
          }
          parts.unshift(name);
          node = parent;
        }
        return parts.join(" > ");
      }
      const nodes = Array.from(document.querySelectorAll("div, img, h1, h2, section, span, p")).slice(0, 140);
      for (const el of nodes) {
        const st = getComputedStyle(el);
        const anims = el.getAnimations ? el.getAnimations() : [];
        if ((st.animationName && st.animationName !== "none") || anims.length) return path(el);
      }
      return null;
    });
    if (!sel) { pushType("css_animation", true, "no_change_observed", { actions: ["WAIT"] }); return; }
    const sample = () => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const st = getComputedStyle(el);
      const anims = el.getAnimations ? el.getAnimations() : [];
      const time = anims.length && anims[0].currentTime != null ? Number(anims[0].currentTime) : null;
      const r = el.getBoundingClientRect();
      return { transform: String(st.transform || "none"), opacity: Number(st.opacity), time: time, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    }, sel);
    const t0 = await sample();
    await sleep(420);
    const t1 = await sample();
    const changes = [];
    if (t0 && t1) {
      if (t0.time != null && t1.time != null && t1.time > t0.time + 0.01) changes.push("animation");
      if (t0.transform !== t1.transform) changes.push("transform");
      if (Math.abs((t0.opacity || 0) - (t1.opacity || 0)) >= 0.02) changes.push("opacity");
    }
    pushType("css_animation", true, changes.length ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      selector: sel,
      t0: t0,
      t1: t1,
      changes: changes,
    });
  });
  await maybe("canvas", async () => {
    if (!detect.canvas2d) { pushType("canvas", false, "not_detected"); return; }
    const frames = await visualFrames("canvas");
    if (frames.tainted && frames.unique < 2) { pushType("canvas", true, "failed"); return; }
    pushType("canvas", true, frames.visible && frames.unique >= 2 ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      frame_hashes: frames.hashes || [],
    });
  });
  await maybe("webgl", async () => {
    if (!detect.webgl) { pushType("webgl", false, "not_detected"); return; }
    const frames = await visualFrames("webgl");
    if (frames.tainted && frames.unique < 2) { pushType("webgl", true, "failed"); return; }
    pushType("webgl", true, frames.visible && frames.unique >= 2 ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      frame_hashes: frames.hashes || [],
    });
  });
  await maybe("lottie", async () => {
    if (!detect.lottie) { pushType("lottie", false, "not_detected"); return; }
    const frames = await visualFrames("lottie");
    pushType("lottie", true, frames.unique >= 2 ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      frame_hashes: frames.hashes || [],
    });
  });
  await maybe("svg_animation", async () => {
    if (!detect.svgAnim) { pushType("svg_animation", false, "not_detected"); return; }
    const frames = await visualFrames("svg");
    pushType("svg_animation", true, frames.unique >= 2 ? "working" : "no_change_observed", {
      actions: ["WAIT"],
      selector: "svg",
      frame_hashes: frames.hashes || [],
      changes: frames.unique >= 2 ? ["frame"] : [],
    });
  });

  await maybe("hover", async () => { await runHoverKind("hover", detect.hover || {}, null); });
  await maybe("tooltip", async () => { await runHoverKind("tooltip", detect.tooltip || {}, "tooltip"); });
  await maybe("cursor_follow", async () => {
    if (!detect.cursor) { pushType("cursor_follow", false, "not_detected"); return; }
    const before = await styleSnap(detect.cursor);
    const box = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, detect.cursor);
    try {
      const x = box ? box.x : 80;
      const y = box ? box.y : 120;
      await page.mouse.move(x, y);
      await sleep(80);
      await page.mouse.move(x + 140, y + 60, { steps: 8 });
    } catch (e) {}
    await sleep(180);
    const after = await styleSnap(detect.cursor);
    const changes = [];
    if (before && after) {
      if (before.transform !== after.transform) changes.push("transform");
      if (Math.abs(before.x - after.x) >= 2 || Math.abs(before.y - after.y) >= 2) changes.push("position");
    }
    pushType("cursor_follow", true, changes.length ? "working" : "no_change_observed", {
      actions: ["MOUSE_MOVE"],
      selector: detect.cursor,
      t0: before,
      t1: after,
      changes: changes,
    });
  });
  await maybe("menu", async () => { await runHit("menu", detect.menu || {}, "menu", true); });
  await maybe("modal", async () => { await runHit("modal", detect.modal || {}, "modal", false); });
  await maybe("tabs", async () => {
    const hit = detect.tabs || {};
    if (hit.blocked && !hit.selector) { pushType("tabs", true, "blocked_for_safety"); return; }
    if (!hit.selector) { pushType("tabs", false, "not_detected"); return; }
    await scrollSel(hit.selector);
    const snap = async () => page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const id = el.getAttribute("aria-controls");
      const panel = id ? document.getElementById(id) : null;
      const st = panel ? getComputedStyle(panel) : null;
      const hidden = !panel || panel.hidden || (panel.getAttribute("aria-hidden") === "true") || Boolean(st && (st.display === "none" || st.visibility === "hidden"));
      const r = panel ? panel.getBoundingClientRect() : { height: 0, width: 0 };
      return {
        selected: el.getAttribute("aria-selected"),
        hidden: hidden,
        h: Math.round(r.height || 0),
        text: panel ? String(panel.innerText || "").slice(0, 80) : "",
      };
    }, hit.selector);
    const before = await snap();
    const clicked = await safeClick(hit.selector);
    if (!clicked.ok) { pushType("tabs", true, "blocked_for_safety"); return; }
    await sleep(400);
    const after = await snap();
    const selected = Boolean(before && after && before.selected !== "true" && after.selected === "true");
    const panel = Boolean(before && after && (before.hidden !== after.hidden || before.h !== after.h || before.text !== after.text));
    const ok = selected && panel;
    const changes = [];
    if (selected) changes.push("aria-selected");
    if (panel) changes.push("panel");
    pushType("tabs", true, ok ? "working" : "no_change_observed", {
      actions: ["SAFE_CLICK"],
      selector: hit.selector,
      t0: before,
      t1: after,
      changes: changes,
    });
  });
  await maybe("accordion", async () => {
    const hit = detect.accordion || {};
    if (hit.blocked && !hit.selector) { pushType("accordion", true, "blocked_for_safety"); return; }
    if (!hit.selector) { pushType("accordion", false, "not_detected"); return; }
    await scrollSel(hit.selector);
    const snap = async () => page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const id = el.getAttribute("aria-controls");
      const panel = (id && document.getElementById(id)) || el.nextElementSibling;
      const st = panel ? getComputedStyle(panel) : null;
      const r = panel ? panel.getBoundingClientRect() : { height: 0 };
      const hidden = !panel || panel.hidden || Boolean(st && (st.display === "none" || st.visibility === "hidden" || Number(st.opacity) < 0.05));
      return { expanded: el.getAttribute("aria-expanded"), hidden: hidden, h: Math.round(r.height || 0) };
    }, hit.selector);
    const before = await snap();
    const clicked = await safeClick(hit.selector);
    if (!clicked.ok) { pushType("accordion", true, "blocked_for_safety"); return; }
    await sleep(400);
    const after = await snap();
    const ok = Boolean(before && after && (
      (before.expanded === "false" && after.expanded === "true") ||
      (before.hidden && !after.hidden) ||
      (after.h - before.h >= 8)
    ));
    pushType("accordion", true, ok ? "working" : "no_change_observed", {
      actions: ["SAFE_CLICK"],
      selector: hit.selector,
      t0: before,
      t1: after,
      changes: ok ? ["aria-expanded"] : [],
    });
  });
  await maybe("carousel", async () => { await runHit("carousel", detect.carousel || {}, null, true); });
  await maybe("drag", async () => { await runPointer("drag", detect.drag || {}, 48, 12); });
  await maybe("swipe", async () => { await runPointer("swipe", detect.swipe || {}, -90, 0); });
  await maybe("video", async () => {
    if (!detect.video) { pushType("video", false, "not_detected"); return; }
    const result = await withTimeout(page.evaluate(async () => {
      const v = document.querySelector("video");
      if (!v) return { working: false, error: false, start: null, end: null, selector: "video" };
      const start = v.currentTime || 0;
      const selector = v.id ? "#" + CSS.escape(v.id) : "video";
      try {
        v.muted = true;
        const p = v.play();
        if (p && p.then) await Promise.race([p, new Promise((resolve) => setTimeout(resolve, 2500))]);
      } catch (e) { return { working: false, error: true, start: start, end: start, selector: selector }; }
      await new Promise((resolve) => setTimeout(resolve, 700));
      const end = v.currentTime || 0;
      return {
        working: v.paused === false && end > start + 0.05,
        error: false,
        start: Math.round(start * 1000) / 1000,
        end: Math.round(end * 1000) / 1000,
        selector: selector,
      };
    }), 5000, { working: false, error: true, start: null, end: null, selector: "video" });
    if (result.error) {
      pushType("video", true, "failed", { actions: ["PLAY"], selector: result.selector || "video" });
      return;
    }
    pushType("video", true, result.working ? "working" : "no_change_observed", {
      actions: ["PLAY"],
      selector: result.selector || "video",
      t0: { currentTime: result.start },
      t1: { currentTime: result.end },
      changes: result.working ? ["currentTime"] : [],
      note: "currentTime " + result.start + " → " + result.end,
    });
  });
  await maybe("embedded_video", async () => {
    const hit = detect.iframe || {};
    if (!hit.selector) { pushType("embedded_video", false, "not_detected"); return; }
    await scrollSel(hit.selector);
    try { await page.click(hit.selector, { timeout: 3000 }); } catch (e) {}
    await sleep(400);
    let played = false;
    try {
      const frames = page.frames ? page.frames() : [];
      for (const frame of frames) {
        const inner = await withTimeout(frame.evaluate(async () => {
          const v = document.querySelector("video");
          if (!v) return false;
          try {
            v.muted = true;
            const p = v.play();
            if (p && p.then) await Promise.race([p, new Promise((resolve) => setTimeout(resolve, 2500))]);
          } catch (e) { return false; }
          await new Promise((resolve) => setTimeout(resolve, 700));
          return v.paused === false && (v.currentTime || 0) > 0.05;
        }).catch(() => false), 5000, false);
        if (inner) { played = true; break; }
      }
    } catch (e) {}
    if (played) {
      pushType("embedded_video", true, "working", { actions: ["PLAY"], selector: hit.selector, changes: ["currentTime"] });
      return;
    }
    let frameColors = [];
    try {
      const frames = page.frames ? page.frames() : [];
      const main = page.mainFrame ? page.mainFrame() : null;
      for (const frame of frames) {
        if (main && frame === main) continue;
        const colors = [];
        for (let i = 0; i < 4; i++) {
          const color = await withTimeout(frame.evaluate(() => {
            const body = document.body;
            if (!body) return "";
            return String(getComputedStyle(body).backgroundColor || "");
          }).catch(() => ""), 1500, "");
          if (color) colors.push(color);
          await sleep(140);
        }
        const unique = Array.from(new Set(colors.filter(Boolean)));
        if (unique.length >= 2) { frameColors = colors; break; }
      }
    } catch (e) {}
    const uniqueColors = Array.from(new Set(frameColors.filter(Boolean)));
    if (uniqueColors.length >= 2) {
      pushType("embedded_video", true, "working", {
        actions: ["PLAY"],
        selector: hit.selector,
        t0: { background: uniqueColors[0] },
        t1: { background: uniqueColors[1] },
        changes: ["frame"],
        note: "iframe visual progression",
      });
      return;
    }
    let hashes = [];
    try {
      const clip = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          x: Math.max(0, Math.round(r.x)),
          y: Math.max(0, Math.round(r.y)),
          width: Math.max(1, Math.min(320, Math.round(r.width))),
          height: Math.max(1, Math.min(180, Math.round(r.height))),
        };
      }, hit.selector);
      async function clipHash() {
        if (!clip || clip.width < 8 || clip.height < 8 || !page.screenshot) return null;
        const buf = await page.screenshot({ type: "jpeg", quality: 30, clip: clip });
        const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
        let hash = 0;
        for (let i = 0; i < bytes.length; i += 97) hash = (hash * 33 + bytes[i]) >>> 0;
        return hash.toString(16);
      }
      const first = await clipHash();
      await sleep(450);
      const second = await clipHash();
      hashes = [first, second].filter(Boolean);
    } catch (e) {}
    const moved = hashes.length >= 2 && hashes[0] !== hashes[1];
    pushType("embedded_video", true, moved ? "working" : "playback_not_verifiable", {
      actions: ["PLAY"],
      selector: hit.selector,
      frame_hashes: hashes,
      note: moved ? "frame delta" : "Detected — playback not verifiable",
      changes: moved ? ["frame"] : [],
    });
  });
  await maybe("form", async () => {
    const hit = detect.form || {};
    if (hit.blocked && !hit.selector) { pushType("form", true, "blocked_for_safety"); return; }
    if (!hit.selector) { pushType("form", false, "not_detected"); return; }
    const probe = await page.evaluate((sel, src) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, reason: "missing" };
      const text = [el.getAttribute("name"), el.getAttribute("id"), el.getAttribute("placeholder"), el.getAttribute("aria-label"), el.type].filter(Boolean).join(" ");
      if (new RegExp(src, "i").test(text)) return { ok: false, reason: "unsafe" };
      if (String(el.type || "").toLowerCase() === "password") return { ok: false, reason: "unsafe" };
      return { ok: true };
    }, hit.selector, unsafeSource);
    if (!probe.ok) { pushType("form", true, "blocked_for_safety"); return; }
    await scrollSel(hit.selector);
    const beforeValue = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && "value" in el ? String(el.value || "") : "";
    }, hit.selector);
    await page.focus(hit.selector);
    await page.type(hit.selector, "vt-check", { delay: 10 });
    await sleep(160);
    const filled = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && "value" in el ? String(el.value || "") : "";
    }, hit.selector);
    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || !("value" in el)) return;
      el.value = "";
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, hit.selector);
    const cleared = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && "value" in el ? String(el.value || "") : "";
    }, hit.selector);
    pushType("form", true, filled.indexOf("vt-check") >= 0 && cleared.indexOf("vt-check") < 0 ? "working" : "no_change_observed", {
      actions: ["FOCUS", "INPUT"],
      selector: hit.selector,
      t0: { value: beforeValue },
      t1: { value: filled },
      changes: filled !== beforeValue ? ["value"] : [],
    });
  });
  await maybe("scroll_reveal", async () => {
    const cands = await page.evaluate(() => {
      const out = [];
      const named = Array.from(document.querySelectorAll("[data-reveal], [class*='reveal']"));
      for (const el of named) {
        if (el.id) out.push("#" + CSS.escape(el.id));
        if (out.length >= 4) break;
      }
      if (!out.length) {
        for (const el of Array.from(document.querySelectorAll("p, h2, h3, img, div")).slice(0, 80)) {
          const st = getComputedStyle(el);
          if ((Number(st.opacity) < 0.05 || st.visibility === "hidden") && el.id) out.push("#" + CSS.escape(el.id));
          if (out.length >= 4) break;
        }
      }
      return out;
    });
    if (!cands.length) { pushType("scroll_reveal", false, "not_detected"); return; }
    let worked = false;
    let ev = null;
    for (const sel of cands) {
      const t0 = await styleSnap(sel);
      await scrollSel(sel);
      await sleep(450);
      const t1 = await styleSnap(sel);
      const revealed =
        t0 &&
        t1 &&
        ((Number(t0.opacity) < 0.2 && Number(t1.opacity) >= 0.2) ||
          (t0.visibility === "hidden" && t1.visibility !== "hidden") ||
          (t0.transform !== t1.transform && t0.transform !== "none"));
      if (revealed) {
        const changes = [];
        if (t0.opacity !== t1.opacity) changes.push("opacity");
        if (t0.transform !== t1.transform) changes.push("transform");
        if (t0.visibility !== t1.visibility) changes.push("visibility");
        worked = true;
        ev = { actions: ["SCROLL", "WAIT"], selector: sel, t0: t0, t1: t1, changes: changes };
        break;
      }
    }
    pushType("scroll_reveal", true, worked ? "working" : "no_change_observed", ev);
  });
  await maybe("lazy_load", async () => {
    const cands = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img[loading='lazy'], img[data-src]"))
        .slice(0, 4)
        .map((el) => (el.id ? "#" + CSS.escape(el.id) : ""))
        .filter(Boolean),
    );
    if (!cands.length) { pushType("lazy_load", false, "not_detected"); return; }
    let worked = false;
    let ev = null;
    for (const sel of cands) {
      const t0 = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        return { src: el.currentSrc || el.src || "", complete: el.complete, w: el.naturalWidth || 0 };
      }, sel);
      await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return;
        const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.35);
        window.scrollTo(0, y);
        if (el.scrollIntoView) el.scrollIntoView({ block: "center", inline: "nearest" });
        window.dispatchEvent(new Event("scroll"));
      }, sel);
      await sleep(400);
      try {
        await page.waitForFunction((s) => {
          const el = document.querySelector(s);
          if (!el) return false;
          const src = el.currentSrc || el.src || "";
          const data = el.getAttribute("data-src") || "";
          return Boolean(data && src && (src === data || src.indexOf(data.slice(-18)) >= 0));
        }, { timeout: 2500 }, sel);
      } catch (e) {}
      const t1 = await page.evaluate((s) => {
        const el = document.querySelector(s);
        if (!el) return null;
        return { src: el.currentSrc || el.src || "", complete: el.complete, w: el.naturalWidth || 0 };
      }, sel);
      if (t0 && t1 && (t1.w > t0.w || (t1.src && t0.src && t1.src !== t0.src) || (t1.complete && t1.w > 0 && t0.w === 0))) {
        worked = true;
        ev = { actions: ["SCROLL", "WAIT"], selector: sel, note: "naturalWidth " + t0.w + " -> " + t1.w };
        break;
      }
    }
    pushType("lazy_load", true, worked ? "working" : "no_change_observed", ev);
  });
  let section = { found: false, top: 0, range: 1, reduced: false };
  const checkpoints = [];
  let reveal = false;
  let lazyWork = false;
  await maybe("scroll", async () => {
    const imgs0 = await page.evaluate(() => Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length);
    section = await page.evaluate(() => {
      const vh = window.innerHeight;
      const nodes = Array.from(document.querySelectorAll("section, [aria-label], main, main > div, body > div"));
      let best = null;
      let bestScore = 0;
      for (const el of nodes.slice(0, 80)) {
        const h = el.offsetHeight;
        if (h < vh * 1.8) continue;
        let sticky = false;
        try {
          if (getComputedStyle(el).position === "sticky") sticky = true;
          if (!sticky && el.querySelector) {
            sticky = Array.from(el.querySelectorAll("div, section")).slice(0, 40).some((kid) => getComputedStyle(kid).position === "sticky");
          }
        } catch (e) {}
        const score = h + (sticky ? vh * 6 : 0);
        if (score > bestScore) { best = el; bestScore = score; }
      }
      const reduced = Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      if (!best) {
        const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 1);
        return { found: false, top: 0, range: Math.max(1, height - vh), reduced: reduced };
      }
      const top = Math.max(0, Math.round(best.getBoundingClientRect().top + window.scrollY));
      return { found: true, top: top, range: Math.max(1, best.offsetHeight - vh), reduced: reduced };
    });
    if (section.found) {
      await page.evaluate((info) => { window.scrollTo(0, info.top); }, { top: section.top });
      await sleep(280);
      const keys = await page.evaluate(() => {
        const rootCandidates = Array.from(document.querySelectorAll("section, [aria-label], main, body"));
        let root = document.body;
        for (const el of rootCandidates) {
          if (el.offsetHeight >= window.innerHeight * 1.8) { root = el; break; }
        }
        const all = Array.from(root.querySelectorAll("div, img, p, h1, h2, h3, span")).slice(0, 280);
        const picked = [];
        for (const el of all) {
          let st;
          try { st = getComputedStyle(el); } catch (e) { continue; }
          const interesting = (st.transform && st.transform !== "none") || /transform/i.test(st.willChange || "") || Number(st.opacity) < 0.99 || st.visibility === "hidden";
          if (!interesting) continue;
          if (el.id) picked.push("#" + CSS.escape(el.id));
          else {
            const parts = [];
            let node = el;
            while (node && node.nodeType === 1 && parts.length < 6) {
              let sel = node.tagName.toLowerCase();
              const parent = node.parentElement;
              if (parent) {
                const same = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
                if (same.length > 1) sel += ":nth-of-type(" + (same.indexOf(node) + 1) + ")";
              }
              parts.unshift(sel);
              node = parent;
            }
            picked.push(parts.join(" > "));
          }
          if (picked.length >= 16) break;
        }
        return picked;
      });
      let firstHidden = [];
      for (const frac of fracs) {
        const y = Math.round(section.top + section.range * frac);
        await page.evaluate((yy) => { window.scrollTo(0, yy); }, y);
        await sleep(320);
        const sample = await page.evaluate((selectors) => {
          const elements = [];
          for (const key of selectors) {
            let el = null;
            try { el = document.querySelector(key); } catch (e) { el = null; }
            if (!el) continue;
            let st;
            try { st = getComputedStyle(el); } catch (e) { continue; }
            const r = el.getBoundingClientRect();
            elements.push({
              key: String(key).slice(0, 180),
              transform: String(st.transform || "none").slice(0, 120),
              opacity: Number(st.opacity),
              visibility: String(st.visibility || "visible").slice(0, 24),
              x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
            });
          }
          return { scroll_y: Math.round(window.scrollY || window.pageYOffset || 0), elements: elements };
        }, keys);
        checkpoints.push({ frac: frac, scroll_y: sample.scroll_y, elements: sample.elements });
        if (frac === 0) {
          firstHidden = sample.elements.filter((el) => el.visibility === "hidden" || el.opacity < 0.05).map((el) => el.key);
        } else {
          for (const el of sample.elements) {
            if (firstHidden.indexOf(el.key) >= 0 && el.visibility !== "hidden" && el.opacity >= 0.05) reveal = true;
          }
        }
      }
    }
    const imgs1 = await page.evaluate(() => Array.from(document.images).filter((img) => img.complete && img.naturalWidth > 0).length);
    lazyWork = imgs1 > imgs0;
    let scrollHit = null;
    const byKey = {};
    for (const point of checkpoints) {
      for (const el of point.elements) {
        if (!byKey[el.key]) byKey[el.key] = [];
        byKey[el.key].push({ el: el, scrollY: point.scroll_y });
      }
    }
    const scrollKeys = Object.keys(byKey);
    for (const key of scrollKeys) {
      const rows = byKey[key];
      const origin = rows[0];
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const delta = row.scrollY - origin.scrollY;
        const changes = [];
        if (origin.el.transform !== row.el.transform) changes.push("transform");
        if (Math.abs(origin.el.opacity - row.el.opacity) >= 0.02) changes.push("opacity");
        if (origin.el.visibility !== row.el.visibility) changes.push("visibility");
        const expectedY = origin.el.y - delta;
        if (
          Math.abs(origin.el.x - row.el.x) >= 2 ||
          Math.abs(expectedY - row.el.y) >= 2 ||
          Math.abs(origin.el.w - row.el.w) >= 2 ||
          Math.abs(origin.el.h - row.el.h) >= 2
        ) changes.push("bounding_rect");
        if (changes.length && !scrollHit) scrollHit = { key: key, t0: origin.el, t1: row.el, changes: changes };
      }
    }
    const scrollDetected = Boolean(section.found || detect.scroll);
    if (!scrollDetected) pushType("scroll", false, "not_detected");
    else if (!checkpoints.length) pushType("scroll", true, "failed");
    else pushType("scroll", true, scrollHit ? "working" : "no_change_observed", scrollHit ? {
      actions: ["SCROLL"],
      selector: scrollHit.key,
      t0: scrollHit.t0,
      t1: scrollHit.t1,
      changes: scrollHit.changes,
    } : { actions: ["SCROLL"], changes: [] });
  });

  function hitOf(type) {
    if (type === "embedded_video") return detect.iframe || {};
    if (type === "css_animation") return detect.cssAnim ? { selector: "css" } : {};
    if (type === "js_animation") return detect.jsAnim ? { selector: "js" } : {};
    if (type === "auto_carousel") return detect.autoCarousel ? { selector: "auto" } : {};
    if (type === "video") return detect.video ? { selector: "video" } : {};
    if (type === "canvas") return detect.canvas2d ? { selector: "canvas" } : {};
    if (type === "webgl") return detect.webgl ? { selector: "webgl" } : {};
    if (type === "lottie") return detect.lottie ? { selector: "lottie" } : {};
    if (type === "svg_animation") return detect.svgAnim ? { selector: "svg" } : {};
    if (type === "cursor_follow") return detect.cursor ? { selector: detect.cursor } : {};
    if (type === "scroll") return detect.scroll ? { selector: "scroll" } : {};
    if (type === "lazy_load") return detect.lazy ? { selector: "lazy" } : {};
    if (type === "scroll_reveal") return detect.reveal ? { selector: "reveal" } : {};
    return detect[type] || {};
  }
  function detectedNow(type) {
    const hit = hitOf(type);
    return Boolean(hit && (hit.selector || hit.blocked));
  }
  function bandOf(type) {
    if (!detectedNow(type)) return 9;
    const prev = priorList.find((row) => row && row.type === type);
    const cost = expensiveTypes.indexOf(type) >= 0 ? 1 : 0;
    let band = 2;
    if (prev && prev.status === "working") band = 0;
    else if (prev && prev.detected && prev.status && prev.status !== "not_detected" && prev.status !== "not_measured") band = 1;
    return band * 2 + cost;
  }
  const ordered = jobs.slice().sort((a, b) => bandOf(a.name) - bandOf(b.name));
  const seeded = await restore(false);
  for (const row of types) {
    if (!row.evidence || typeof row.evidence !== "object") row.evidence = {};
    row.evidence.restore = seeded && seeded.ok ? "ok" : "failed";
  }
  for (const job of ordered) {
    if (pushed[job.name]) continue;
    if (Date.now() > deadline) {
      if (!detectedNow(job.name)) pushType(job.name, false, "not_detected");
      else pushType(job.name, true, "not_measured", { note: "execution time limit" });
      continue;
    }
    try { await job.fn(); }
    catch (e) { if (!pushed[job.name]) pushType(job.name, true, "failed"); }
    if (!pushed[job.name]) {
      pushType(job.name, detectedNow(job.name), "failed");
    }
    if (detectedNow(job.name)) {
      const restored = await restore(false);
      const row = types[types.length - 1];
      if (row && row.type === job.name) {
        const ev = row.evidence && typeof row.evidence === "object" ? row.evidence : {};
        ev.restore = restored && restored.ok ? "ok" : "failed";
        row.evidence = ev;
      }
    }
  }
  if (!pushed.scroll) pushType("scroll", Boolean(detect.scroll), Date.now() > deadline ? "not_measured" : "failed", Date.now() > deadline ? { note: "execution time limit" } : null);
  if (!pushed.scroll_reveal) pushType("scroll_reveal", reveal, reveal ? "working" : "not_detected");
  if (!pushed.lazy_load) pushType("lazy_load", Boolean(detect.lazy || lazyWork), lazyWork ? "working" : (detect.lazy ? "no_change_observed" : "not_detected"));

  const observations = [];
  function pushObs(row) {
    if (!row || !row.selector || observations.length >= 48) return;
    row.shadow_path = Array.isArray(row.shadow_path) ? row.shadow_path.filter(Boolean).slice(0, 4) : [];
    row.frame_path = Array.isArray(row.frame_path) ? row.frame_path.filter(Boolean).slice(0, 4) : [];
    observations.push(row);
  }
  for (const region of pendingRegions) pushObs(region);
  for (const hit of motionHits) {
    if (!hit || !hit.key) continue;
    const rendered = (hit.props || []).filter((name) => name !== "animation");
    if (rendered.length) pushObs({ selector: hit.key, source: "style", changes: rendered, t0: hit.t0 || null, t1: hit.t1 || null });
    if ((hit.props || []).indexOf("animation") >= 0) pushObs({ selector: hit.key, source: "animation", changes: ["animation"], t0: hit.t0 || null, t1: hit.t1 || null });
  }
  let domHits = [];
  try {
    domHits = await page.evaluate(() => {
      const seen = {};
      const out = [];
      for (const row of window.__vtMutations || []) {
        const id = row.selector + "|" + (row.kind || "") + "|" + (row.attr || "") + "|s:" + (row.shadow_path || []).join(">") + "|f:" + (row.frame_path || []).join(">");
        if (seen[id]) continue;
        seen[id] = true;
        out.push(row);
        if (out.length >= 12) break;
      }
      return out;
    });
  } catch (e) {}
  for (const row of domHits || []) {
    if (!row || !row.selector) continue;
    pushObs({
      selector: row.selector,
      source: "dom",
      changes: [row.kind === "childList" ? "childList" : (row.attr || "attribute")],
      t0: null,
      t1: { kind: row.kind || "", attr: row.attr || "" },
      shadow_path: row.shadow_path || [],
      frame_path: row.frame_path || [],
    });
  }
  const mediaT1 = await mediaStates();
  const mediaBy = {};
  for (const row of mediaT0 || []) mediaBy[row.selector] = row;
  for (const row of mediaT1 || []) {
    const prev = mediaBy[row.selector];
    if (!prev) continue;
    const changes = [];
    if (prev.paused !== row.paused) changes.push("paused");
    if (prev.currentTime !== row.currentTime) changes.push("currentTime");
    if (prev.readyState !== row.readyState) changes.push("readyState");
    if (!changes.length) continue;
    pushObs({ selector: row.selector, source: "media", changes: changes, t0: prev, t1: row });
  }
  let scrollRan = false;
  if (!lightScan && Date.now() < deadline - 8000) {
    scrollRan = true;
    try {
      const beforeRows = await collectStates();
      const y0 = await page.evaluate(() => window.scrollY || 0);
      await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight || 0) * 0.5)));
      await sleep(350);
      const y1 = await page.evaluate(() => window.scrollY || 0);
      const afterRows = await collectStates();
      await page.evaluate(() => window.scrollTo(0, 0));
      const byKey = {};
      for (const row of beforeRows || []) byKey[row.key] = row;
      const delta = Math.abs((y1 || 0) - (y0 || 0));
      for (const row of afterRows || []) {
        const prev = byKey[row.key];
        if (!prev) continue;
        const changes = [];
        if (prev.transform !== row.transform) changes.push("transform");
        if (Math.abs((prev.opacity || 0) - (row.opacity || 0)) >= 0.02) changes.push("opacity");
        if (prev.display !== row.display) changes.push("display");
        if (prev.visibility !== row.visibility) changes.push("visibility");
        const yMove = Math.abs((prev.y || 0) - (row.y || 0));
        if (delta >= 8 && yMove >= 2 && Math.abs(yMove - delta) > 8) changes.push("position");
        if (!changes.length) continue;
        pushObs({ selector: row.key, source: "scroll", changes: changes, t0: prev, t1: row });
      }
    } catch (e) {}
  }
  let frameRan = false;
  if (!lightScan && Date.now() < deadline - 5000 && page.screenshot) {
    frameRan = true;
    const regions = [];
    for (const hit of motionHits) {
      if (!hit || !hit.t1 || !hit.key) continue;
      const w = hit.t1.w || 0;
      const h = hit.t1.h || 0;
      if (w < 16 || h < 16) continue;
      regions.push({ selector: hit.key, x: Math.max(0, hit.t1.x || 0), y: Math.max(0, hit.t1.y || 0), width: Math.min(220, w), height: Math.min(140, h) });
      if (regions.length >= 2) break;
    }
    for (const clip of regions) {
      try {
        async function clipHash() {
          const buf = await page.screenshot({ type: "jpeg", quality: 30, clip: { x: clip.x, y: clip.y, width: clip.width, height: clip.height } });
          const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
          let hash = 0;
          for (let i = 0; i < bytes.length; i += 97) hash = (hash * 33 + bytes[i]) >>> 0;
          return hash.toString(16);
        }
        const first = await clipHash();
        await sleep(180);
        const second = await clipHash();
        if (first && second && first !== second) {
          pushObs({
            selector: clip.selector,
            source: "frame",
            changes: ["frame"],
            t0: { hash: first },
            t1: { hash: second },
            region: { x: clip.x, y: clip.y, w: clip.width, h: clip.height },
          });
        }
      } catch (e) {}
    }
    if (!temporal.ran && Date.now() < deadline - 12000) {
      regionTrack = { ran: true, samples: 0, active_cells: 0, error: "" };
      try {
        const view = await page.evaluate(() => ({ width: window.innerWidth || 800, height: window.innerHeight || 600 }));
        const cols = 4;
        const rows = 3;
        const cellW = Math.max(1, Math.floor((view.width || 800) / cols));
        const cellH = Math.max(1, Math.floor((view.height || 600) / rows));
        const cells = [];
        for (let gy = 0; gy < rows; gy += 1) {
          for (let gx = 0; gx < cols; gx += 1) {
            cells.push({ gx: gx, gy: gy, x: gx * cellW, y: gy * cellH, width: cellW, height: cellH, samples: [] });
          }
        }
        async function cellHash(cell) {
          const data = await page.screenshot({
            type: "png",
            encoding: "base64",
            clip: { x: cell.x, y: cell.y, width: cell.width, height: cell.height },
          });
          const text = String(data || "");
          let hash = 0;
          for (let i = 0; i < text.length; i += 64) hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
          return hash.toString(16);
        }
        const marks = [0, 250, 500, 1000];
        const trackStart = Date.now();
        for (const mark of marks) {
          if (Date.now() > deadline - 4000) break;
          const wait = mark - (Date.now() - trackStart);
          if (wait > 0) await sleep(wait);
          for (const cell of cells) {
            try { cell.samples.push({ t: mark, hash: await cellHash(cell) }); } catch (e) {
              if (!regionTrack.error) regionTrack.error = String(e && e.message ? e.message : e).slice(0, 180);
              cell.samples.push({ t: mark, hash: "" });
            }
          }
        }
        const active = cells.filter((cell) => {
          const hashes = cell.samples.map((sample) => sample.hash).filter(Boolean);
          return new Set(hashes).size >= 2;
        });
        regionTrack.samples = cells[0] && cells[0].samples ? cells[0].samples.length : 0;
        regionTrack.active_cells = active.length;
        if (active.length && active.length < cells.length) {
          const used = {};
          const groups = [];
          for (const cell of active) {
            if (used[cell.gx + ":" + cell.gy]) continue;
            const group = [];
            const stack = [cell];
            used[cell.gx + ":" + cell.gy] = true;
            while (stack.length) {
              const current = stack.pop();
              group.push(current);
              for (const other of active) {
                const key = other.gx + ":" + other.gy;
                if (used[key]) continue;
                if (Math.abs(other.gx - current.gx) <= 1 && Math.abs(other.gy - current.gy) <= 1) {
                  used[key] = true;
                  stack.push(other);
                }
              }
            }
            groups.push(group);
            if (groups.length >= 3) break;
          }
          let regionIndex = 0;
          for (const group of groups) {
            regionIndex += 1;
            const x = Math.min.apply(null, group.map((cell) => cell.x));
            const y = Math.min.apply(null, group.map((cell) => cell.y));
            const right = Math.max.apply(null, group.map((cell) => cell.x + cell.width));
            const bottom = Math.max.apply(null, group.map((cell) => cell.y + cell.height));
            const hit = await page.evaluate((px, py) => {
              const points = [[px, py], [px + 12, py + 12], [px - 12, py + 8]];
              for (const point of points) {
                const el = document.elementFromPoint(point[0], point[1]);
                if (!el || el === document.body || el === document.documentElement) continue;
                if (el.id) return "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
              }
              return "";
            }, Math.round(x + Math.min(24, (right - x) / 4)), Math.round(y + Math.min(24, (bottom - y) / 4))).catch(() => "");
            const samples = group[0].samples || [];
            let intervals = 0;
            let changed = 0;
            for (let i = 1; i < samples.length; i += 1) {
              if (!samples[i] || !samples[i - 1] || !samples[i].hash || !samples[i - 1].hash) continue;
              intervals += 1;
              if (samples[i].hash !== samples[i - 1].hash) changed += 1;
            }
            const pattern = intervals >= 2 && changed === intervals ? "continuous" : "intermittent";
            pushObs({
              selector: hit || ("region:" + String(regionIndex)),
              source: "frame",
              changes: ["frame", pattern],
              t0: samples[0] ? { t: samples[0].t, hash: samples[0].hash } : null,
              t1: {
                t: samples.length ? samples[samples.length - 1].t : 0,
                hash: samples.length ? samples[samples.length - 1].hash : "",
                pattern: pattern,
                samples: samples.map((sample) => ({ t: sample.t, hash: sample.hash })),
              },
              region: { x: x, y: y, w: right - x, h: bottom - y },
            });
          }
        }
      } catch (e) {
        regionTrack.error = String(e && e.message ? e.message : e).slice(0, 180);
      }
    }
  }
  for (const row of safetyCandidates) {
    if (!row || !row.selector) continue;
    pushObs({ selector: row.selector, source: "actionable", changes: [], t0: null, t1: { text: row.text || "" } });
  }
  async function readSurfaces() {
    return page.evaluate((src) => {
      const bad = new RegExp(src, "i");
      function path(el) {
        if (!el || !el.tagName) return "";
        if (el.id) return "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
        return el.tagName.toLowerCase();
      }
      function locate(loc) {
        if (!loc || !loc.selector) return null;
        let scope = document;
        for (const sel of loc.frame_path || []) {
          const frame = scope.querySelector(sel);
          if (!frame) return null;
          let child = null;
          try { child = frame.contentDocument; } catch (e) { child = null; }
          if (!child) return null;
          scope = child;
        }
        for (const sel of loc.shadow_path || []) {
          const host = scope.querySelector(sel);
          if (!host || !host.shadowRoot) return null;
          scope = host.shadowRoot;
        }
        return scope.querySelector(loc.selector);
      }
      window.__vtLocate = locate;
      const traversal = { shadow_open: 0, shadow_closed: 0, same_origin_frames: 0, cross_origin_frames: 0 };
      const unreadable = [];
      const controls = [];
      const unsafe = [];
      const seenHosts = {};
      function remember(list, row) {
        const key = row.selector + "|s:" + (row.shadow_path || []).join(">") + "|f:" + (row.frame_path || []).join(">");
        if (list.some((item) => item.key === key) || list.length >= 8) return;
        list.push({ key: key, selector: row.selector, text: row.text, shadow_path: row.shadow_path, frame_path: row.frame_path });
      }
      function addControl(el, shadowPath, framePath) {
        if (!el || !el.id) return;
        const text = [el.innerText, el.getAttribute("aria-label"), el.getAttribute("value")].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 80);
        if (!text) return;
        const selector = "#" + (window.CSS && CSS.escape ? CSS.escape(el.id) : el.id);
        const row = { selector: selector, text: text, shadow_path: shadowPath.slice(), frame_path: framePath.slice() };
        if (bad.test(text) || String(el.getAttribute("type") || "").toLowerCase() === "submit") remember(unsafe, row);
        else remember(controls, row);
      }
      function watch(root, shadowPath, framePath) {
        if (window.__vtWatchTree) window.__vtWatchTree(root, shadowPath, framePath);
      }
      function walkShadow(root, shadowPath, framePath, depth) {
        if (!root || depth > 4) return;
        watch(root, shadowPath, framePath);
        for (const el of Array.from(root.querySelectorAll("button, [role='button'], summary")).slice(0, 8)) addControl(el, shadowPath, framePath);
        for (const el of Array.from(root.querySelectorAll("*")).slice(0, 120)) {
          if (!el.shadowRoot) continue;
          const selector = path(el);
          const next = shadowPath.concat(selector);
          const id = "s:" + next.join(">") + "|f:" + framePath.join(">");
          if (seenHosts[id]) continue;
          seenHosts[id] = true;
          traversal.shadow_open += 1;
          walkShadow(el.shadowRoot, next, framePath, depth + 1);
        }
      }
      function walkDoc(doc, framePath, depth) {
        if (!doc || !doc.querySelectorAll || depth > 4) return;
        if (framePath.length) watch(doc, [], framePath);
        if (framePath.length) {
          for (const el of Array.from(doc.querySelectorAll("button, [role='button'], summary")).slice(0, 8)) addControl(el, [], framePath);
        }
        for (const el of Array.from(doc.querySelectorAll("*")).slice(0, 200)) {
          if (!el.shadowRoot) continue;
          const selector = path(el);
          const id = "s:" + selector + "|f:" + framePath.join(">");
          if (seenHosts[id]) continue;
          seenHosts[id] = true;
          traversal.shadow_open += 1;
          walkShadow(el.shadowRoot, [selector], framePath, depth + 1);
        }
        for (const frame of Array.from(doc.querySelectorAll("iframe")).slice(0, 6)) {
          const selector = frame.id ? "#" + (window.CSS && CSS.escape ? CSS.escape(frame.id) : frame.id) : path(frame);
          let child = null;
          try { child = frame.contentDocument; } catch (e) { child = null; }
          if (!child) {
            traversal.cross_origin_frames += 1;
            if (unreadable.length < 6) unreadable.push({ selector: selector, shadow_path: [], frame_path: framePath.concat(selector), reason: "cross_origin_frame" });
            continue;
          }
          traversal.same_origin_frames += 1;
          walkDoc(child, framePath.concat(selector), depth + 1);
        }
      }
      walkDoc(document, [], 0);
      for (const row of window.__vtShadows || []) {
        if (!row || row.mode !== "closed") continue;
        const chain = Array.isArray(row.shadow_path) && row.shadow_path.length ? row.shadow_path : [row.selector];
        traversal.shadow_closed += 1;
        if (unreadable.length < 6) unreadable.push({ selector: chain[chain.length - 1] || row.selector, shadow_path: chain, frame_path: [], reason: "closed_shadow" });
      }
      return { traversal: traversal, unreadable: unreadable, controls: controls, unsafe: unsafe };
    }, unsafeSource).catch(() => ({
      traversal: { shadow_open: 0, shadow_closed: 0, same_origin_frames: 0, cross_origin_frames: 0 },
      unreadable: [],
      controls: [],
      unsafe: [],
    }));
  }
  async function styleSnapAt(loc) {
    return page.evaluate((target) => {
      const el = window.__vtLocate ? window.__vtLocate(target) : null;
      if (!el) return null;
      const st = getComputedStyle(el);
      return {
        transform: String(st.transform || "none"),
        opacity: String(st.opacity || ""),
        visibility: String(st.visibility || ""),
        display: String(st.display || ""),
        hidden: el.hidden ? "1" : "0",
        open: el.hasAttribute && el.hasAttribute("open") ? "1" : "0",
      };
    }, loc);
  }
  async function actInRoot(loc) {
    return page.evaluate((target, src) => {
      const el = window.__vtLocate ? window.__vtLocate(target) : null;
      if (!el) return { ok: false, reason: "missing" };
      const text = [el.innerText, el.getAttribute("aria-label"), el.getAttribute("href"), el.getAttribute("type")].filter(Boolean).join(" ");
      if (new RegExp(src, "i").test(text)) return { ok: false, reason: "unsafe" };
      if (String(el.getAttribute("type") || "").toLowerCase() === "submit") return { ok: false, reason: "unsafe" };
      try { el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, composed: true })); } catch (e) {}
      try { if (el.focus) el.focus(); } catch (e) {}
      try { el.click(); } catch (e) { return { ok: false, reason: "click" }; }
      return { ok: true };
    }, loc, unsafeSource);
  }
  async function controlsWithin(loc) {
    return page.evaluate((target) => {
      const el = window.__vtLocate ? window.__vtLocate(target) : null;
      if (!el || !el.getRootNode) return [];
      const root = el.getRootNode();
      const out = [];
      const shadowPath = Array.isArray(target.shadow_path) ? target.shadow_path : [];
      const framePath = Array.isArray(target.frame_path) ? target.frame_path : [];
      function add(node, nextShadow, nextFrame) {
        if (!node || !node.id || out.length >= 6) return;
        const rect = node.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) return;
        const text = String(node.innerText || "").replace(/\s+/g, " ").trim();
        if (!text) return;
        out.push({
          selector: "#" + (window.CSS && CSS.escape ? CSS.escape(node.id) : node.id),
          text: text.slice(0, 80),
          shadow_path: nextShadow.slice(),
          frame_path: nextFrame.slice(),
        });
      }
      function walk(scope, nextShadow, nextFrame, depth) {
        if (!scope || !scope.querySelectorAll || depth > 3) return;
        for (const node of Array.from(scope.querySelectorAll("button, [role='button'], summary")).slice(0, 6)) add(node, nextShadow, nextFrame);
        for (const frame of Array.from(scope.querySelectorAll("iframe")).slice(0, 4)) {
          let child = null;
          try { child = frame.contentDocument; } catch (e) {}
          if (!child) continue;
          const selector = frame.id ? "#" + (window.CSS && CSS.escape ? CSS.escape(frame.id) : frame.id) : "iframe";
          walk(child, nextShadow, nextFrame.concat(selector), depth + 1);
        }
      }
      walk(root, shadowPath, framePath, 0);
      return out;
    }, loc).catch(() => []);
  }
  async function stateFingerprint() {
    return page.evaluate(() => {
      const bits = [];
      function snap(root, prefix, depth) {
        if (!root || !root.querySelectorAll || depth > 3) return;
        const rows = [];
        for (const el of Array.from(root.querySelectorAll("[id]")).slice(0, 16)) {
          let opacity = "";
          let display = "";
          try {
            const st = getComputedStyle(el);
            opacity = st.opacity;
            display = st.display;
          } catch (e) {}
          rows.push(el.id + ":" + (el.hidden ? "h" : "") + ":" + opacity + ":" + display);
        }
        bits.push(prefix + rows.join(","));
        for (const el of Array.from(root.querySelectorAll("*")).slice(0, 60)) {
          if (el.shadowRoot) snap(el.shadowRoot, prefix + ">s:" + (el.id || "shadow"), depth + 1);
        }
        for (const frame of Array.from(root.querySelectorAll("iframe")).slice(0, 4)) {
          let child = null;
          try { child = frame.contentDocument; } catch (e) {}
          if (child) snap(child, prefix + ">f:" + (frame.id || "iframe"), depth + 1);
        }
      }
      snap(document, "d", 0);
      return bits.join("|").slice(0, 500);
    }).catch(() => "");
  }
  let exploreRan = false;
  let exploreSteps = 0;
  let exploreRevealed = 0;
  let chainRaw = null;
  function locKey(item) {
    return item.selector + "|s:" + (item.shadow_path || []).join(">") + "|f:" + (item.frame_path || []).join(">");
  }
  function asItem(row, depth) {
    return {
      selector: row.selector,
      depth: depth,
      shadow_path: Array.isArray(row.shadow_path) ? row.shadow_path : [],
      frame_path: Array.isArray(row.frame_path) ? row.frame_path : [],
    };
  }
  if (!lightScan && Date.now() < deadline - 10000) {
    exploreRan = true;
    try { surfaceInfo = await readSurfaces(); } catch (e) {}
    const queue = [];
    const seen = {};
    const reached = {};
    const actedInState = {};
    let stateCount = 0;
    const initialFp = await stateFingerprint();
    if (initialFp) {
      reached[initialFp] = true;
      stateCount = 1;
    }
    for (const row of safetyCandidates) {
      if (row && row.selector && queue.length < 8) queue.push(asItem(row, 0));
    }
    for (const row of surfaceInfo.controls || []) {
      if (!row || !row.selector || queue.length >= 12) continue;
      const remote = (row.shadow_path && row.shadow_path.length) || (row.frame_path && row.frame_path.length);
      if (remote) queue.push(asItem(row, 0));
    }
    try {
      await page.keyboard.press("Tab");
      const focused = await page.evaluate((src) => {
        const el = document.activeElement;
        if (!el || el === document.body || el === document.documentElement) return null;
        const text = [el.innerText, el.getAttribute("aria-label"), el.getAttribute("value")].filter(Boolean).join(" ");
        if (text && new RegExp(src, "i").test(text)) return null;
        if (!el.id) return null;
        return "#" + CSS.escape(el.id);
      }, unsafeSource);
      if (focused) queue.unshift({ selector: focused, depth: 0 });
    } catch (e) {}
    const transitions = [];
    const chainBaseline = {
      paths: netLog.map((row) => row.method + " " + row.path).slice(0, 40),
      messages: runtimeLog.map((row) => row.kind + ":" + row.message).slice(0, 40),
    };
    function stateId(fp) {
      let hash = 0;
      const text = String(fp || "");
      for (let i = 0; i < text.length; i += 1) hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
      return hash.toString(16);
    }
    const exploreStarted = Date.now();
    const maxDepth = 3;
    const maxActions = 20;
    const maxStates = 15;
    while (
      queue.length &&
      exploreSteps < maxActions &&
      stateCount < maxStates &&
      Date.now() - exploreStarted < 25000 &&
      Date.now() < deadline - 4000
    ) {
      const item = queue.shift();
      if (!item || !item.selector || seen[locKey(item)]) continue;
      exhaustion.unexplored_reasons = exhaustion.unexplored_reasons.filter((row) => row.selector !== item.selector);
      delete unexploredSeen[item.selector + "|s:" + (item.shadow_path || []).join(">") + "|f:" + (item.frame_path || []).join(">")];
      if (item.depth >= maxDepth) {
        recordUnexplored(item, "depth_limit");
        continue;
      }
      const fp = await stateFingerprint();
      const actKey = (fp || "") + "||" + locKey(item);
      if (actedInState[actKey]) continue;
      actedInState[actKey] = true;
      if (item.depth === 0 && exploreSteps > 0) await restore(false);
      seen[locKey(item)] = true;
      exploreSteps += 1;
      const mark = await page.evaluate(() => (window.__vtMutations || []).length).catch(() => 0);
      const before = await styleSnap(item.selector);
      const hiddenSels = await page.evaluate(() => {
        const sels = [];
        for (const dialog of Array.from(document.querySelectorAll("dialog")).slice(0, 2)) {
          if (dialog.open) continue;
          if (dialog.id) sels.push("#" + CSS.escape(dialog.id));
          for (const el of Array.from(dialog.querySelectorAll("[id]")).slice(0, 3)) sels.push("#" + CSS.escape(el.id));
        }
        return sels;
      }).catch(() => []);
      const hiddenBefore = {};
      for (const sel of hiddenSels) hiddenBefore[sel] = await styleSnap(sel);
      const remote = (item.shadow_path && item.shadow_path.length) || (item.frame_path && item.frame_path.length);
      let action = "hover";
      let actionSince = 0;
      const obsMark = observations.length;
      if (!remote) {
        actionSince = Date.now();
        try { await page.hover(item.selector, { timeout: 1200 }); } catch (e) {}
        await sleep(160);
        try { await page.focus(item.selector); } catch (e) {}
        action = "focus";
        try { await page.keyboard.press("Enter"); } catch (e) {}
        await sleep(180);
        const clicked = await safeClick(item.selector);
        if (clicked && clicked.ok) action = "click";
        await settleWindow(actionSince);
      }
      const after = await styleSnap(item.selector);
      const found = await page.evaluate((start) => {
        const mutations = (window.__vtMutations || []).slice(start).slice(0, 8);
        const next = [];
        const dialog = document.querySelector("dialog[open], [role='dialog'], [aria-modal='true']");
        if (dialog) {
          for (const el of Array.from(dialog.querySelectorAll("button, [role='button'], summary")).slice(0, 2)) {
            if (el.id) next.push("#" + CSS.escape(el.id));
          }
        }
        const opened = document.querySelector("dialog[open]");
        return {
          mutations: mutations.map((row) => ({
            selector: row.selector,
            kind: row.kind || "",
            attr: row.attr || "",
            shadow_path: row.shadow_path || [],
            frame_path: row.frame_path || [],
          })),
          next: next,
          opened: opened && opened.id ? "#" + CSS.escape(opened.id) : "",
        };
      }, mark).catch(() => ({ mutations: [], next: [], opened: "" }));
      let revealed = false;
      if (before && after && JSON.stringify(before) !== JSON.stringify(after)) {
        revealed = true;
        pushObs({ selector: item.selector, source: "style", changes: ["state"], t0: before, t1: after, action: action });
      }
      for (const row of found.mutations || []) {
        if (!row || !row.selector) continue;
        revealed = true;
        pushObs({
          selector: row.selector,
          source: "dom",
          changes: [row.kind === "childList" ? "childList" : (row.attr || "attribute")],
          t0: null,
          t1: { via: action },
          action: action,
          shadow_path: row.shadow_path || item.shadow_path || [],
          frame_path: row.frame_path || item.frame_path || [],
        });
      }
      if (found.opened) revealed = true;
      for (const sel of Object.keys(hiddenBefore)) {
        const later = await styleSnap(sel);
        const earlier = hiddenBefore[sel];
        if (!earlier || !later || JSON.stringify(earlier) === JSON.stringify(later)) continue;
        const changes = [];
        if (String(earlier.open) !== String(later.open)) changes.push("open");
        if (String(earlier.opacity) !== String(later.opacity)) changes.push("opacity");
        if (String(earlier.display) !== String(later.display)) changes.push("display");
        if (String(earlier.transform) !== String(later.transform)) changes.push("transform");
        revealed = true;
        pushObs({
          selector: sel,
          source: "style",
          changes: changes.length ? changes : ["state"],
          t0: earlier,
          t1: later,
          action: action,
        });
      }
      if (remote) {
        const peers = await page.evaluate((target) => {
          const el = window.__vtLocate ? window.__vtLocate(target) : null;
          if (!el || !el.getRootNode) return [];
          const root = el.getRootNode();
          if (!root || !root.querySelectorAll) return [];
          const out = [];
          for (const node of Array.from(root.querySelectorAll("[id]")).slice(0, 8)) {
            out.push({
              selector: "#" + (window.CSS && CSS.escape ? CSS.escape(node.id) : node.id),
              shadow_path: target.shadow_path || [],
              frame_path: target.frame_path || [],
            });
          }
          return out;
        }, item).catch(() => []);
        const beforeTargets = {};
        for (const target of peers) beforeTargets[locKey(target)] = { loc: target, snap: await styleSnapAt(target) };
        const selfBefore = await styleSnapAt(item);
        actionSince = Date.now();
        const acted = await actInRoot(item);
        if (acted && acted.ok) action = "click";
        await settleWindow(actionSince);
        const selfAfter = await styleSnapAt(item);
        if (selfBefore && selfAfter && JSON.stringify(selfBefore) !== JSON.stringify(selfAfter)) {
          revealed = true;
          pushObs({
            selector: item.selector,
            source: "style",
            changes: ["state"],
            t0: selfBefore,
            t1: selfAfter,
            action: action,
            shadow_path: item.shadow_path,
            frame_path: item.frame_path,
          });
        }
        for (const key of Object.keys(beforeTargets)) {
          const earlier = beforeTargets[key];
          const later = await styleSnapAt(earlier.loc);
          if (!earlier.snap || !later || JSON.stringify(earlier.snap) === JSON.stringify(later)) continue;
          const changes = [];
          if (String(earlier.snap.opacity) !== String(later.opacity)) changes.push("opacity");
          if (String(earlier.snap.display) !== String(later.display)) changes.push("display");
          if (String(earlier.snap.hidden) !== String(later.hidden)) changes.push("hidden");
          if (String(earlier.snap.transform) !== String(later.transform)) changes.push("transform");
          revealed = true;
          pushObs({
            selector: earlier.loc.selector,
            source: "style",
            changes: changes.length ? changes : ["state"],
            t0: earlier.snap,
            t1: later,
            action: action,
            shadow_path: earlier.loc.shadow_path,
            frame_path: earlier.loc.frame_path,
          });
        }
      }
      if (revealed) exploreRevealed += 1;
      const nextFp = await stateFingerprint();
      const freshState = Boolean(nextFp) && !reached[nextFp];
      if (freshState) {
        reached[nextFp] = true;
        stateCount += 1;
      }
      if (actionSince && transitions.length < 8) {
        const rendered = [];
        const renderedSeen = {};
        for (const row of observations.slice(obsMark)) {
          if (!row || row.source === "actionable" || !row.changes || !row.changes.length) continue;
          const key = row.selector + "|s:" + (row.shadow_path || []).join(">") + "|f:" + (row.frame_path || []).join(">");
          if (renderedSeen[key]) continue;
          renderedSeen[key] = true;
          rendered.push({
            selector: row.selector,
            changes: row.changes.slice(0, 4),
            shadow_path: row.shadow_path || [],
            frame_path: row.frame_path || [],
          });
          if (rendered.length >= 4) break;
        }
        const network = netLog.filter((row) => row.started >= actionSince).slice(0, 12);
        const runtime = runtimeLog.filter((row) => row.at >= actionSince).slice(0, 12);
        if (rendered.length || network.length || runtime.length) {
          transitions.push({
            action_id: "a" + String(exploreSteps),
            action: action,
            selector: item.selector,
            shadow_path: item.shadow_path || [],
            frame_path: item.frame_path || [],
            state_before: stateId(fp),
            state_after: stateId(nextFp),
            started_at: Math.max(0, actionSince - started),
            rendered: rendered,
            network: network,
            runtime: runtime,
          });
        }
      }
      if (item.depth + 1 < maxDepth && (freshState || !nextFp) && stateCount < maxStates) {
        const children = [];
        for (const sel of found.next || []) {
          const child = asItem({ selector: sel, shadow_path: item.shadow_path, frame_path: item.frame_path }, item.depth + 1);
          if (!seen[locKey(child)]) children.push(child);
        }
        for (const row of await controlsWithin(item)) {
          const child = asItem(row, item.depth + 1);
          if (!seen[locKey(child)]) children.push(child);
        }
        for (let i = children.length - 1; i >= 0; i -= 1) queue.unshift(children[i]);
      } else if (item.depth + 1 >= maxDepth) {
        const deeper = [];
        for (const sel of found.next || []) deeper.push(asItem({ selector: sel, shadow_path: item.shadow_path, frame_path: item.frame_path }, item.depth + 1));
        for (const row of await controlsWithin(item)) deeper.push(asItem(row, item.depth + 1));
        for (const child of deeper) {
          if (!child || !child.selector || seen[locKey(child)] || child.selector === item.selector) continue;
          if (queue.some((queued) => locKey(queued) === locKey(child))) continue;
          recordUnexplored(child, "depth_limit");
        }
      }
    }
    let stopReason = "action_budget";
    if (stateCount >= maxStates) stopReason = "state_limit";
    else if (Date.now() - exploreStarted >= 25000 || Date.now() >= deadline - 4000) stopReason = "time_limit";
    else if (exploreSteps >= maxActions) stopReason = "action_budget";
    for (const item of queue) {
      recordUnexplored(item, item && item.depth >= maxDepth ? "depth_limit" : stopReason);
    }
    exhaustion.executed = exploreSteps;
    exhaustion.unexplored = exhaustion.unexplored_reasons.length;
    exhaustion.discovered = exploreSteps + exhaustion.unexplored;
    if (!exhaustion.unexplored) {
      exhaustion.status = "completed";
      exhaustion.reason = "no_unexplored_safe_candidates";
    } else {
      exhaustion.status = "incomplete";
      const reasons = exhaustion.unexplored_reasons.map((row) => row.reason);
      if (reasons.indexOf("time_limit") >= 0) exhaustion.reason = "time_limit";
      else if (reasons.indexOf("action_budget") >= 0) exhaustion.reason = "action_budget";
      else if (reasons.indexOf("state_limit") >= 0) exhaustion.reason = "state_limit";
      else exhaustion.reason = "depth_limit";
    }
    await restore(false);
    try { surfaceInfo = await readSurfaces(); } catch (e) {}
    chainRaw = {
      baseline_paths: chainBaseline.paths,
      baseline_messages: chainBaseline.messages,
      transitions: transitions,
    };
  }
  function routeCount(source) {
    return observations.filter((row) => row.source === source).length;
  }
  const detectedCount = types.filter((row) => row.detected).length;
  const verifiedCount = types.filter((row) => row.status === "working").length;
  const blockedCount = types.filter((row) => row.status === "blocked_for_safety").length;
  const notMeasuredCount = types.filter((row) => row.status === "not_measured").length;

  return {
    types: types,
    discovery: {
      scan: lightScan ? "light" : "full",
      samples: Array.isArray(timeline) ? timeline.length : 0,
      detected: detectedCount,
      verified: verifiedCount,
      blocked: blockedCount,
      not_measured: notMeasuredCount,
      observations: observations,
      routes: {
        dom: { ran: true, hits: routeCount("dom") },
        style: { ran: true, hits: routeCount("style") },
        animation: { ran: true, hits: routeCount("animation") },
        media: { ran: true, hits: routeCount("media") },
        frame: { ran: frameRan, hits: routeCount("frame") },
        scroll: { ran: scrollRan, hits: routeCount("scroll") },
        actionable: { ran: true, hits: routeCount("actionable") },
      },
      exploration: { ran: exploreRan, steps: exploreSteps, revealed: exploreRevealed },
      traversal: surfaceInfo.traversal,
      unreadable: (surfaceInfo.unreadable || []).slice(0, 6),
      chain_raw: chainRaw,
      region_track: regionTrack,
      environment: environment,
      temporal: temporal,
      exhaustion: exhaustion,
      unknown: [],
      safety: {
        blocked: (safetyBlocked || []).concat(
          (surfaceInfo.unsafe || []).map((row) => ({ selector: row.selector || "", text: row.text || "" })),
        ),
      },
    },
    scroll: {
      section_found: Boolean(section.found),
      reduced_motion: Boolean(section.reduced),
      checkpoints: checkpoints,
    },
  };
}`;
}
