/** Interaction Check fixtures. Not a preview. Browserless must Execute → Verify. */

export const INTERACTION_FIXTURE_KINDS = [
  "all",
  "scroll",
  "hover",
  "menu",
  "modal",
  "accordion",
  "tabs",
  "tooltip",
  "form",
  "drag",
  "swipe",
  "cursor_follow",
  "load_animation",
  "css_animation",
  "js_animation",
  "scroll_reveal",
  "delayed",
  "lazy_load",
  "carousel",
  "auto_carousel",
  "video",
  "embedded_video",
  "lottie",
  "svg_animation",
  "canvas",
  "webgl",
] as const;
export const INTERACTION_FIXTURE_MODES = ["working", "broken", "absent", "unsafe"] as const;

export type InteractionFixtureKind = (typeof INTERACTION_FIXTURE_KINDS)[number];
export type InteractionFixtureMode = (typeof INTERACTION_FIXTURE_MODES)[number];

const PIXEL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const PIXEL_B =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

function shell(title: string, body: string, script: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${title}</title>
  <style>
    body { font-family: sans-serif; margin: 0; background: #fff; color: #111; }
    main { padding: 16px; }
    #hero-copy { opacity: 0; transform: translateY(16px); }
    #hero-copy.ready { animation: hero-in .7s ease forwards; }
    #hero-copy.static { opacity: 1; transform: none; }
    #hover-target { display: inline-block; color: #111; }
    #hover-target:hover { color: #b91c1c; transform: scale(1.08); }
    #hover-target.inert:hover { color: #111; transform: none; }
    @keyframes hero-in { to { opacity: 1; transform: none; } }
    #cookie-banner { display: none; position: fixed; bottom: 0; left: 0; right: 0; padding: 12px; background: #222; color: #fff; }
    #cookie-banner.show { display: block; }
    #spacer { height: 140vh; }
    #reveal-copy { opacity: 0; transform: translateY(12px); }
    #reveal-copy.in { opacity: 1; transform: none; }
    dialog { border: 1px solid #ccc; padding: 16px; }
    [role="tabpanel"] { min-height: 40px; }
    .slides { display: flex; width: 200px; overflow: hidden; }
    .slides .slide { min-width: 200px; height: 80px; }
    #drag-item { width: 48px; height: 48px; background: #2563eb; }
    #swipe-track { width: 220px; height: 80px; overflow: hidden; border: 1px solid #ccc; }
    #swipe-inner { display: flex; width: 440px; transform: translateX(0); }
    #swipe-inner div { width: 220px; height: 80px; }
    #cursor-dot { width: 12px; height: 12px; background: #e11; position: absolute; top: 8px; left: 8px; }
    canvas { width: 120px; height: 80px; background: #111; }
    lottie-player, .lottie { width: 80px; height: 80px; display: inline-block; }
  </style>
</head>
<body>
${body}
<script>${script}</script>
</body>
</html>`;
}

function workingBody(): string {
  return `<main>
  <h1 id="hero-copy">Hero copy</h1>
  <p>Fixture kitchen sink. Detected is not Working.</p>
  <a href="#hero-copy" id="hover-target">Hover me</a>
  <button type="button" id="menu-btn" aria-haspopup="menu">Menu</button>
  <div id="menu-list" role="menu" hidden>Item</div>
  <button type="button" id="modal-open" aria-haspopup="dialog">Open details</button>
  <dialog id="modal-dialog">Details <button type="button" id="modal-close">Close</button></dialog>
  <button type="button" id="acc-btn" aria-expanded="false" aria-controls="acc-panel">Section</button>
  <div id="acc-panel" hidden>Panel body</div>
  <div role="tablist">
    <button type="button" role="tab" id="tab-a" aria-selected="true" aria-controls="panel-a">A</button>
    <button type="button" role="tab" id="tab-b" aria-selected="false" aria-controls="panel-b">B</button>
  </div>
  <div id="panel-a" role="tabpanel">Panel A</div>
  <div id="panel-b" role="tabpanel" hidden>Panel B</div>
  <button type="button" id="tip-btn" aria-describedby="tip-pop">Hint</button>
  <div id="tip-pop" role="tooltip" hidden>Tip text</div>
  <label>Name <input id="form-input" name="note" /></label>
  <div id="carousel" class="carousel" aria-roledescription="carousel">
    <div class="slides" id="carousel-slides">
      <div class="slide" data-i="0" style="background:#ddd">One</div>
      <div class="slide" data-i="1" style="background:#bbb">Two</div>
    </div>
    <button type="button" id="carousel-next" aria-label="Next">Next</button>
  </div>
  <div id="auto-carousel" class="swiper" aria-roledescription="carousel">
    <div class="slides" id="auto-slides">
      <div class="slide" style="background:#cde">Auto 1</div>
      <div class="slide" style="background:#9bc">Auto 2</div>
    </div>
  </div>
  <div id="drag-item" draggable="true">Drag</div>
  <div id="swipe-track" data-swipe="1"><div id="swipe-inner"><div>S1</div><div>S2</div></div></div>
  <div id="cursor-dot" data-cursor="1"></div>
  <video id="vid" muted playsinline width="160" height="90"></video>
  <iframe id="embed" title="player" srcdoc="<video id='inner-vid' muted playsinline width='160' height='90'></video>"></iframe>
  <div class="lottie" id="lottie-box"><svg viewBox="0 0 40 40"><circle id="lottie-c" cx="12" cy="20" r="6" fill="#0a0"/></svg></div>
  <svg id="svg-stage" width="40" height="40"><rect id="svg-r" x="2" y="2" width="12" height="12" fill="#06c"><animateTransform attributeName="transform" type="translate" values="0 0; 16 0; 0 0" dur="0.8s" repeatCount="indefinite"/></rect></svg>
  <canvas id="canvas2d" width="120" height="80"></canvas>
  <canvas id="webgl" width="120" height="80"></canvas>
  <div id="spacer"></div>
  <p id="reveal-copy" data-reveal="1">Revealed copy</p>
  <img id="lazy-img" alt="" loading="lazy" src="${PIXEL}" data-src="${PIXEL_B}" width="40" height="40" />
  <div id="cookie-banner" class="cookie-banner">Cookies</div>
</main>`;
}

function workingScript(): string {
  return `
  const broken = false;
  document.getElementById("hero-copy").classList.add("ready");
  setTimeout(() => document.getElementById("cookie-banner").classList.add("show"), 250);
  (async () => {
    async function attachBlobVideo(el) {
      if (!el || typeof MediaRecorder === "undefined") return;
      const c = document.createElement("canvas");
      c.width = 64; c.height = 36;
      const ctx = c.getContext("2d");
      if (!ctx || !c.captureStream) return;
      let n = 0;
      const id = setInterval(() => {
        ctx.fillStyle = n++ % 2 ? "#0a0" : "#111";
        ctx.fillRect(0, 0, 64, 36);
      }, 50);
      const stream = c.captureStream(10);
      let rec;
      try { rec = new MediaRecorder(stream); } catch (e) { clearInterval(id); return; }
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      await new Promise((resolve) => {
        rec.onstop = () => resolve();
        rec.start();
        setTimeout(() => { try { rec.stop(); } catch (err) { resolve(); } }, 700);
      });
      clearInterval(id);
      if (!chunks.length) return;
      el.src = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "video/webm" }));
      try { el.load(); } catch (e) {}
    }
    const vid = document.getElementById("vid");
    await attachBlobVideo(vid);
    const embed = document.getElementById("embed");
    const inner = embed && embed.contentDocument ? embed.contentDocument.querySelector("video") : null;
    if (inner && vid && vid.src) inner.src = vid.src;
  })();
  const dragEl = document.getElementById("drag-item");
  dragEl.addEventListener("pointerdown", () => {
    const move = (ev) => {
      dragEl.style.transform = "translate(" + Math.round(ev.clientX - 24) + "px," + Math.round(ev.clientY - 24) + "px)";
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
  });
  document.getElementById("menu-btn").onclick = () => {
    const el = document.getElementById("menu-list");
    el.hidden = !el.hidden;
  };
  document.getElementById("modal-open").onclick = () => document.getElementById("modal-dialog").showModal();
  document.getElementById("modal-close").onclick = () => document.getElementById("modal-dialog").close();
  document.getElementById("acc-btn").onclick = () => {
    const btn = document.getElementById("acc-btn");
    const panel = document.getElementById("acc-panel");
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", open ? "false" : "true");
    panel.hidden = open;
  };
  document.getElementById("tab-b").onclick = () => {
    document.getElementById("tab-a").setAttribute("aria-selected", "false");
    document.getElementById("tab-b").setAttribute("aria-selected", "true");
    document.getElementById("panel-a").hidden = true;
    document.getElementById("panel-b").hidden = false;
  };
  const tip = document.getElementById("tip-btn");
  const pop = document.getElementById("tip-pop");
  tip.onmouseenter = () => { pop.hidden = false; };
  tip.onmouseleave = () => { pop.hidden = true; };
  let slide = 0;
  document.getElementById("carousel-next").onclick = () => {
    slide = 1;
    document.getElementById("carousel-slides").style.transform = "translateX(-200px)";
  };
  let auto = 0;
  setInterval(() => {
    auto = auto ? 0 : 1;
    document.getElementById("auto-slides").style.transform = auto ? "translateX(-200px)" : "translateX(0)";
  }, 400);
  let swipe = 0;
  document.getElementById("swipe-track").onpointerup = () => {
    swipe = 1;
    document.getElementById("swipe-inner").style.transform = "translateX(-220px)";
  };
  document.addEventListener("mousemove", (e) => {
    const d = document.getElementById("cursor-dot");
    d.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)";
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => { if (en.isIntersecting) en.target.classList.add("in"); });
  });
  io.observe(document.getElementById("reveal-copy"));
  const lazy = document.getElementById("lazy-img");
  const lazyIo = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        lazy.src = lazy.getAttribute("data-src");
        lazyIo.disconnect();
      }
    });
  }, { root: null, threshold: 0.01, rootMargin: "80px" });
  lazyIo.observe(lazy);
  function tryLazy() {
    const r = lazy.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) {
      const next = lazy.getAttribute("data-src");
      if (next) lazy.src = next;
      window.removeEventListener("scroll", tryLazy);
      lazyIo.disconnect();
    }
  }
  window.addEventListener("scroll", tryLazy, { passive: true });
  let lx = 12;
  setInterval(() => {
    lx = lx === 12 ? 28 : 12;
    document.getElementById("lottie-c").setAttribute("cx", String(lx));
  }, 180);
  const c = document.getElementById("canvas2d").getContext("2d");
  let x = 0;
  function draw2d() {
    x = (x + 3) % 120;
    c.fillStyle = "#111"; c.fillRect(0,0,120,80);
    c.fillStyle = "#0f0"; c.fillRect(x, 20, 20, 20);
    requestAnimationFrame(draw2d);
  }
  draw2d();
  const glc = document.getElementById("webgl");
  const gl = glc.getContext("webgl", { preserveDrawingBuffer: true }) || glc.getContext("experimental-webgl", { preserveDrawingBuffer: true });
  if (gl) {
    let t = 0;
    function drawGl() {
      t += 0.08;
      gl.clearColor(Math.abs(Math.sin(t)), 0.1, 0.4, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      requestAnimationFrame(drawGl);
    }
    drawGl();
  }
`;
}

function brokenScript(): string {
  return `
  document.getElementById("hero-copy").classList.add("static");
  document.getElementById("hover-target").classList.add("inert");
  document.querySelectorAll("animate, animateTransform, animateMotion").forEach((el) => el.remove());
  document.getElementById("menu-btn").onclick = () => {};
  document.getElementById("modal-open").onclick = () => {};
  document.getElementById("acc-btn").onclick = () => {};
  document.getElementById("tab-b").onclick = () => {};
  document.getElementById("carousel-next").onclick = () => {};
  document.getElementById("tip-btn").onmouseenter = () => {};
`;
}

function absentBody(): string {
  return `<main><p>No interactive widgets.</p></main>`;
}

function unsafeBody(): string {
  return `<main>
  <h1>Checkout</h1>
  <button type="button" id="buy" aria-haspopup="dialog">Confirm purchase</button>
  <dialog id="buy-dialog">Pay now</dialog>
</main>`;
}

const TYPE_FIXTURES: Record<
  Exclude<InteractionFixtureKind, "all">,
  { body: string; working: string; broken: string }
> = {
  scroll: {
    body: `<main><section id="scroll-root" style="height:220vh"><p id="scroll-copy" style="opacity:.2;transform:translateY(12px)">Copy</p></section></main>`,
    working: `window.addEventListener("scroll", () => { const el = document.getElementById("scroll-copy"); if (window.scrollY > 30) { el.style.opacity = "1"; el.style.transform = "none"; } });`,
    broken: `document.getElementById("scroll-copy").style.opacity = "1"; document.getElementById("scroll-copy").style.transform = "none";`,
  },
  hover: {
    body: `<main><a href="#x" id="hover-target">Hover me</a></main>`,
    working: `document.getElementById("hover-target").onmouseenter = (e) => { e.currentTarget.style.color = "#b91c1c"; e.currentTarget.style.transform = "scale(1.08)"; };`,
    broken: `document.getElementById("hover-target").classList.add("inert");`,
  },
  menu: {
    body: `<main><button type="button" id="menu-btn" aria-haspopup="menu">Menu</button><div id="menu-list" role="menu" hidden>Item</div></main>`,
    working: `document.getElementById("menu-btn").onclick = () => { document.getElementById("menu-list").hidden = false; document.getElementById("menu-btn").setAttribute("aria-expanded","true"); };`,
    broken: `document.getElementById("menu-btn").onclick = () => {};`,
  },
  modal: {
    body: `<main><button type="button" id="modal-open" aria-haspopup="dialog">Open details</button><dialog id="modal-dialog">Details</dialog></main>`,
    working: `document.getElementById("modal-open").onclick = () => document.getElementById("modal-dialog").showModal();`,
    broken: `document.getElementById("modal-open").onclick = () => {};`,
  },
  accordion: {
    body: `<main><button type="button" id="acc-btn" aria-expanded="false" aria-controls="acc-panel">Section</button><div id="acc-panel" hidden style="height:0">Panel body</div></main>`,
    working: `document.getElementById("acc-btn").onclick = () => { const p = document.getElementById("acc-panel"); p.hidden = false; p.style.height = "48px"; document.getElementById("acc-btn").setAttribute("aria-expanded","true"); };`,
    broken: `document.getElementById("acc-btn").onclick = () => {};`,
  },
  tabs: {
    body: `<main><div role="tablist"><button type="button" role="tab" id="tab-a" aria-selected="true" aria-controls="panel-a">A</button><button type="button" role="tab" id="tab-b" aria-selected="false" aria-controls="panel-b">B</button></div><div id="panel-a" role="tabpanel">Alpha</div><div id="panel-b" role="tabpanel" hidden>Beta</div></main>`,
    working: `document.getElementById("tab-b").onclick = () => { document.getElementById("tab-a").setAttribute("aria-selected","false"); document.getElementById("tab-b").setAttribute("aria-selected","true"); document.getElementById("panel-a").hidden = true; document.getElementById("panel-b").hidden = false; };`,
    broken: `document.getElementById("tab-b").onclick = () => {};`,
  },
  tooltip: {
    body: `<main><button type="button" id="tip-btn" aria-describedby="tip">Hint</button><span id="tip" role="tooltip" hidden>More</span></main>`,
    working: `const show = () => { document.getElementById("tip").hidden = false; }; document.getElementById("tip-btn").onmouseenter = show; document.getElementById("tip-btn").onfocus = show;`,
    broken: `document.getElementById("tip-btn").onmouseenter = () => {}; document.getElementById("tip-btn").onfocus = () => {};`,
  },
  form: {
    body: `<main><form><input id="field" type="text" name="note" /></form></main>`,
    working: "",
    broken: `document.getElementById("field").readOnly = true;`,
  },
  drag: {
    body: `<main><div id="drag-item" data-drag="true" style="width:48px;height:48px;background:#2563eb">Drag</div></main>`,
    working: `document.getElementById("drag-item").onpointerup = (e) => { e.currentTarget.style.transform = "translate(48px, 12px)"; };`,
    broken: "",
  },
  swipe: {
    body: `<main><div id="swipe-track" data-swipe="true" style="width:220px;height:80px;overflow:hidden"><div id="swipe-inner" style="display:flex;width:440px;transform:translateX(0)"><div style="width:220px">1</div><div style="width:220px">2</div></div></div></main>`,
    working: `document.getElementById("swipe-track").onpointerup = () => { document.getElementById("swipe-inner").style.transform = "translateX(-90px)"; };`,
    broken: "",
  },
  cursor_follow: {
    body: `<main style="height:240px"><div id="cursor-dot" data-cursor="true" style="width:12px;height:12px;background:#e11;position:absolute;top:8px;left:8px"></div></main>`,
    working: `window.addEventListener("mousemove", (e) => { const el = document.getElementById("cursor-dot"); el.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; });`,
    broken: "",
  },
  load_animation: {
    body: `<main><h1 id="hero-copy" style="opacity:0;transform:translateY(16px)">Hero</h1></main>`,
    working: `requestAnimationFrame(() => { const el = document.getElementById("hero-copy"); el.style.opacity = "1"; el.style.transform = "none"; });`,
    broken: `const el = document.getElementById("hero-copy"); el.style.animation = "hero-in 2s linear"; el.style.animationPlayState = "paused";`,
  },
  css_animation: {
    body: `<main><h1 id="hero-copy">Hero</h1></main>`,
    working: `const el = document.getElementById("hero-copy"); el.style.opacity = "0"; el.style.transform = "translateY(16px)"; el.style.animation = "hero-in .8s linear forwards";`,
    broken: `const el = document.getElementById("hero-copy"); el.style.animation = "hero-in .8s linear forwards"; el.style.animationPlayState = "paused";`,
  },
  js_animation: {
    body: `<main><div id="js-box" data-js-anim="true" style="width:40px;height:40px">Box</div></main>`,
    working: `(function () { const el = document.getElementById("js-box"); const start = performance.now(); function tick(now) { const p = Math.min(1, (now - start) / 500); el.style.transform = "translateX(" + Math.round(p * 40) + "px)"; if (p < 1) requestAnimationFrame(tick); } requestAnimationFrame(tick); })();`,
    broken: "",
  },
  scroll_reveal: {
    body: `<main style="height:180vh"><p id="reveal-copy" data-reveal="true" style="margin-top:120vh;opacity:0">Reveal</p></main>`,
    working: `document.getElementById("reveal-copy").style.opacity = "0"; window.addEventListener("scroll", () => { if (window.scrollY > 20) document.getElementById("reveal-copy").style.opacity = "1"; });`,
    broken: "",
  },
  delayed: {
    body: `<main><div id="cookie-banner" class="cookie-banner" style="display:none">Cookie</div></main>`,
    working: `setTimeout(() => { document.getElementById("cookie-banner").style.display = "block"; }, 400);`,
    broken: "",
  },
  lazy_load: {
    body: `<main style="height:180vh"><img id="lazy-img" alt="" loading="lazy" data-src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" style="margin-top:140vh;width:20px;height:20px" /></main>`,
    working: `window.addEventListener("scroll", () => { const img = document.getElementById("lazy-img"); if (!img.getAttribute("data-src")) return; img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); });`,
    broken: "",
  },
  carousel: {
    body: `<main><div class="slides" id="slides"><div class="slide">1</div><div class="slide">2</div></div><button type="button" id="carousel-next" aria-label="Next">Next</button></main>`,
    working: `document.getElementById("carousel-next").onclick = () => { document.getElementById("slides").style.transform = "translateX(-40px)"; };`,
    broken: `document.getElementById("carousel-next").onclick = () => {};`,
  },
  auto_carousel: {
    body: `<main><div id="auto" class="carousel" aria-roledescription="carousel"><div id="auto-track" class="slides"><div class="slide" aria-hidden="false">1</div><div class="slide" aria-hidden="true">2</div></div></div></main>`,
    working: `setTimeout(() => { const slides = document.querySelectorAll("#auto .slide"); slides[0].setAttribute("aria-hidden","true"); slides[1].setAttribute("aria-hidden","false"); document.getElementById("auto-track").style.transform = "translateX(-40px)"; }, 400);`,
    broken: "",
  },
  video: {
    body: `<main><video id="clip" muted playsinline></video></main>`,
    working: `const canvas = document.createElement("canvas"); canvas.width = 16; canvas.height = 16; const ctx = canvas.getContext("2d"); let n = 0; setInterval(() => { ctx.fillStyle = (n++ % 2) ? "#111" : "#eee"; ctx.fillRect(0,0,16,16); }, 80); document.getElementById("clip").srcObject = canvas.captureStream(12);`,
    broken: "",
  },
  embedded_video: {
    body: `<main><iframe id="player" title="player" width="320" height="180" srcdoc="<html><body style='margin:0;background:#111'><script>var n=0;setInterval(function(){document.body.style.background=(n++%2)?'#eee':'#111';},120);</script></body></html>"></iframe></main>`,
    working: "",
    broken: "",
  },
  lottie: {
    body: `<main><div id="lot" class="lottie" style="width:80px;height:80px;background:#111"></div></main>`,
    working: `let n = 0; setInterval(() => { document.getElementById("lot").style.transform = "rotate(" + (n++ * 20) + "deg)"; }, 180);`,
    broken: "",
  },
  svg_animation: {
    body: `<main><svg id="svg" width="80" height="80"><circle cx="10" cy="10" r="8" fill="#111"><animate attributeName="cx" from="10" to="60" dur="1s" repeatCount="indefinite" /></circle></svg></main>`,
    working: "",
    broken: `const svg = document.getElementById("svg"); if (svg && svg.pauseAnimations) svg.pauseAnimations(); const anim = document.querySelector("animate"); if (anim) anim.setAttribute("begin", "indefinite");`,
  },
  canvas: {
    body: `<main><canvas id="c2d" width="120" height="80"></canvas></main>`,
    working: `const c = document.getElementById("c2d"); const g = c.getContext("2d"); let n = 0; setInterval(() => { g.fillStyle = (n++ % 2) ? "#111" : "#eee"; g.fillRect(0,0,120,80); }, 160);`,
    broken: `document.getElementById("c2d").getContext("2d").fillRect(0,0,1,1);`,
  },
  webgl: {
    body: `<main><canvas id="gl" width="120" height="80"></canvas></main>`,
    working: `const c = document.getElementById("gl"); const gl = c.getContext("webgl", { preserveDrawingBuffer: true }); let n = 0; setInterval(() => { gl.clearColor((n++ % 2) ? 0.1 : 0.8, 0.2, 0.3, 1); gl.clear(gl.COLOR_BUFFER_BIT); }, 160);`,
    broken: `document.getElementById("gl").getContext("webgl");`,
  },
};

export function interactionFixtureDocument(
  kind: InteractionFixtureKind,
  mode: InteractionFixtureMode,
): string {
  if (kind === "modal" && mode === "unsafe") {
    return shell("Unsafe modal fixture", unsafeBody(), `document.getElementById("buy").onclick = () => document.getElementById("buy-dialog").showModal();`);
  }
  if (kind !== "all") {
    const piece = TYPE_FIXTURES[kind];
    if (mode === "unsafe") {
      return shell("Unsafe " + kind, unsafeBody(), "");
    }
    if (mode === "absent") return shell("Absent " + kind, absentBody(), "");
    if (mode === "broken") return shell("Broken " + kind, piece.body, piece.broken);
    return shell("Working " + kind, piece.body, piece.working);
  }
  if (mode === "absent") return shell("Absent fixture", absentBody(), "");
  if (mode === "broken") return shell("Broken fixture", workingBody(), brokenScript());
  return shell("Working fixture", workingBody(), workingScript());
}

export function interactionFixturePath(kind: InteractionFixtureKind, mode: InteractionFixtureMode): string {
  return `/tests/interactions/${kind}?mode=${mode}`;
}
