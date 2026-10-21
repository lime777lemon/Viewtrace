import { readFileSync } from "node:fs";

function loadEnvLocal() {
  let text = "";
  try {
    text = readFileSync(".env.local", "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

loadEnvLocal();

const html = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<div id="host"></div>
<div id="closed-host"></div>
<iframe id="same-frame" srcdoc="<!doctype html><html><body><button id='frame-btn' type='button'>Frame</button><p id='frame-copy' style='opacity:0'>Inside frame</p><script>document.getElementById('frame-btn').addEventListener('click',function(){document.getElementById('frame-copy').style.opacity='1';if(document.getElementById('nested-frame'))return;var nested=document.createElement('iframe');nested.id='nested-frame';document.body.appendChild(nested);var child=nested.contentDocument;var nestedBtn=child.createElement('button');nestedBtn.id='nested-btn';nestedBtn.type='button';nestedBtn.textContent='Nested';var nestedCopy=child.createElement('p');nestedCopy.id='nested-copy';nestedCopy.hidden=true;nestedCopy.textContent='Nested frame';nestedBtn.addEventListener('click',function(){nestedCopy.hidden=false;});child.body.appendChild(nestedBtn);child.body.appendChild(nestedCopy);});</script></body></html>"></iframe>
<iframe id="cross-frame" sandbox srcdoc="<p id='secret'>Secret</p>"></iframe>
<script>
var host = document.getElementById("host");
var root = host.attachShadow({ mode: "open" });
var shadowBtn = document.createElement("button");
shadowBtn.id = "shadow-btn";
shadowBtn.type = "button";
shadowBtn.textContent = "Shadow";
var shadowCopy = document.createElement("p");
shadowCopy.id = "shadow-copy";
shadowCopy.textContent = "Inside shadow";
shadowCopy.style.opacity = "0";
shadowBtn.addEventListener("click", function () { shadowCopy.style.opacity = "1"; });
root.appendChild(shadowBtn);
root.appendChild(shadowCopy);
var closedHost = document.getElementById("closed-host");
var closed = closedHost.attachShadow({ mode: "closed" });
var closedBtn = document.createElement("button");
closedBtn.id = "closed-btn";
closedBtn.type = "button";
closedBtn.textContent = "Closed";
closed.appendChild(closedBtn);
</script>
</body></html>`;

const detailsHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<button id="details-btn" type="button">Details</button>
<dialog id="details-dialog">
  <p id="nested-copy" style="opacity:0">Hidden detail</p>
  <button id="inner-btn" type="button">Inner</button>
  <p id="inner-note" hidden>Second stage</p>
</dialog>
<script>
document.getElementById("details-btn").addEventListener("click", function () {
  var dialog = document.getElementById("details-dialog");
  if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
  document.getElementById("nested-copy").style.opacity = "1";
});
document.getElementById("inner-btn").addEventListener("click", function () {
  document.getElementById("inner-note").hidden = false;
});
</script>
</body></html>`;

const networkHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body>
<button id="pricing-details" type="button">Pricing</button>
<p id="pricing-panel" hidden>Pricing</p>
<button id="load-more" type="button">Load more</button>
<script>
console.error("baseline analytics");
fetch("https://viewtrace.net/analytics/ping").catch(function () {});
setInterval(function () { fetch("https://viewtrace.net/analytics/ping").catch(function () {}); }, 400);
document.getElementById("pricing-details").addEventListener("click", function () {
  fetch("https://viewtrace.net/api/pricing").then(function (res) {
    if (res.ok) document.getElementById("pricing-panel").hidden = false;
  }).catch(function () {});
});
document.getElementById("load-more").addEventListener("click", function () {
  fetch("https://viewtrace.net/api/items", { method: "POST" }).then(function (res) {
    if (!res.ok) console.error("items failed");
  }).catch(function (err) { console.error(String(err && err.message ? err.message : err)); });
});
</script>
</body></html>`;

const regionHtml = `<!doctype html>
<html><head><meta charset="utf-8"></head><body style="margin:0;background:#f4f4f4">
<div id="orb-host" style="width:220px;height:180px;margin:8px"></div>
<script>
var host = document.getElementById("orb-host");
var root = host.attachShadow({ mode: "closed" });
var canvas = document.createElement("canvas");
canvas.width = 220;
canvas.height = 180;
root.appendChild(canvas);
var ctx = canvas.getContext("2d");
var x = 0;
function draw() {
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, 220, 180);
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(40 + (x % 140), 90, 28, 0, Math.PI * 2);
  ctx.fill();
  x += 10;
  requestAnimationFrame(draw);
}
draw();
</script>
</body></html>`;

const scopeHtml = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin: 0; background: #f4f4f4; }
  #brief { opacity: 0; animation: vt-fade 1s forwards; }
  @keyframes vt-fade { from { opacity: 0; } to { opacity: 1; } }
  #hamburger { display: none; }
  @media (max-width: 700px) { #hamburger { display: inline-block; } }
  #page { margin-top: 320px; }
</style>
</head><body>
<div id="orb-host" style="position:fixed;left:8px;top:8px;width:220px;height:180px"></div>
<div id="page">
  <p id="brief">Brief</p>
  <button id="hamburger" type="button">Menu</button>
  <div id="menu-panel" hidden><p id="menu-copy">Menu item</p></div>
  <p id="late-popup" hidden>Late popup</p>
  <p id="carousel-slide">one</p>
  <button id="d0" type="button">Open</button>
  <button id="d1" type="button" hidden>Next</button>
  <button id="d2" type="button" hidden>Deeper</button>
  <button id="d3" type="button" hidden>Limit</button>
</div>
<script>
var host = document.getElementById("orb-host");
var root = host.attachShadow({ mode: "closed" });
var canvas = document.createElement("canvas");
canvas.width = 220;
canvas.height = 180;
root.appendChild(canvas);
var ctx = canvas.getContext("2d");
var x = 0;
function draw() {
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, 220, 180);
  ctx.fillStyle = "#22d3ee";
  ctx.beginPath();
  ctx.arc(40 + (x % 140), 90, 28, 0, Math.PI * 2);
  ctx.fill();
  x += 10;
  requestAnimationFrame(draw);
}
draw();
setTimeout(function () { document.getElementById("late-popup").hidden = false; }, 5000);
setInterval(function () { document.getElementById("carousel-slide").textContent = "slide"; }, 8000);
document.getElementById("hamburger").addEventListener("click", function () {
  document.getElementById("menu-panel").hidden = false;
});
function wire(from, to) {
  document.getElementById(from).addEventListener("click", function () {
    document.getElementById(to).hidden = false;
  });
}
wire("d0", "d1");
wire("d1", "d2");
wire("d2", "d3");
</script>
</body></html>`;

async function main() {
  const mode = process.env.EXPLORE_FIXTURE === "details"
    ? "details"
    : process.env.EXPLORE_FIXTURE === "network"
      ? "network"
      : process.env.EXPLORE_FIXTURE === "region"
        ? "region"
        : process.env.EXPLORE_FIXTURE === "scope"
          ? "scope"
          : "shadow";
  const device = process.env.EXPLORE_DEVICE === "mobile" ? "mobile" : "desktop";
  const { runBrowserlessScrollWithProxyRetry } = await import("../src/lib/browserless-scroll-interaction");
  const result = await runBrowserlessScrollWithProxyRetry({
    url:
      mode === "details"
        ? "https://viewtrace.net/tests/interactions/state-exploration"
        : mode === "network"
          ? "https://viewtrace.net/tests/interactions/network-chain"
          : mode === "region"
            ? "https://viewtrace.net/tests/interactions/visual-region"
            : mode === "scope"
              ? "https://viewtrace.net/tests/interactions/scan-scope"
              : "https://viewtrace.net/tests/interactions/shadow-iframe",
    region: "US-CA",
    scan: "full",
    environment: { device_class: device },
    fixtureHtml: mode === "details" ? detailsHtml : mode === "network" ? networkHtml : mode === "region" ? regionHtml : mode === "scope" ? scopeHtml : html,
  });
  if (!result.ok) {
    console.error("FAIL", result.error, result.detail ?? "");
    process.exit(1);
  }
  const modal = result.check.types.find((row) => row.type === "modal");
  const canvas = result.check.types.find((row) => row.type === "canvas");
  const webgl = result.check.types.find((row) => row.type === "webgl");
  const discovery = result.check.discovery;
  console.log(
    JSON.stringify(
      {
        duration_ms: result.durationMs,
        modal: modal ? { status: modal.status, detected: modal.detected, selector: modal.evidence?.selector ?? null } : null,
        canvas: canvas ? { status: canvas.status, detected: canvas.detected } : null,
        webgl: webgl ? { status: webgl.status, detected: webgl.detected } : null,
        exploration: discovery?.exploration ?? null,
        traversal: discovery?.traversal ?? null,
        unreadable: discovery?.unreadable ?? [],
        transitions: discovery?.transitions ?? null,
        region_track: discovery?.region_track ?? null,
        environment: discovery?.environment ?? null,
        temporal: discovery?.temporal ?? null,
        exhaustion: discovery?.exhaustion ?? null,
        coverage: discovery?.coverage ?? null,
        map: (discovery?.map ?? []).map((row) => ({
          selector: row.selector,
          classification: row.classification,
          sources: row.sources,
          changes: row.changes,
          actions: row.actions,
          shadow_path: row.shadow_path ?? [],
          frame_path: row.frame_path ?? [],
          pattern: typeof row.t1?.pattern === "string" ? row.t1.pattern : null,
          samples: Array.isArray(row.t1?.samples) ? row.t1.samples : [],
          region: row.region,
        })),
      },
      null,
      2,
    ),
  );
}

main();
