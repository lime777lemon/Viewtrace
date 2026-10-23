import { BROWSER_LIKE_ACCEPT_LANGUAGE, BROWSER_LIKE_USER_AGENT } from "@/lib/browser-fingerprint";
import { JOURNEY_STEP_LIMIT, JOURNEY_WAIT_MS_MAX } from "@/lib/journey-definition";
import { JOURNEY_RECIPES } from "@/lib/journey-verifiers";
import { VIEWTRACE_SAMPLE_FILES } from "@/lib/journey-sample-files";

/** One Browserless session for a user-defined Journey. Discovery is not involved. */
export function buildJourneyFunctionCode(): string {
  const ua = JSON.stringify(BROWSER_LIKE_USER_AGENT);
  const lang = JSON.stringify(BROWSER_LIKE_ACCEPT_LANGUAGE);
  return `export default async function({ page, context }) {
  const steps = Array.isArray(context && context.steps) ? context.steps.slice(0, ${JOURNEY_STEP_LIMIT}) : [];
  const credentials = context && context.credentials && typeof context.credentials === "object" ? context.credentials : {};
  const html = String(context && context.html ? context.html : "");
  const device = String(context && context.device_class ? context.device_class : "desktop") === "mobile" ? "mobile" : "desktop";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const regionToken = String(context && context.region ? context.region : "");
  const journeyRecipes = ${JSON.stringify(JOURNEY_RECIPES)};
  const sampleFiles = ${JSON.stringify(VIEWTRACE_SAMPLE_FILES)};
  function uploadFileOf(step) {
    const custom = step && step.upload_custom;
    if (custom && custom.base64 && custom.name) {
      return { name: String(custom.name).slice(0, 80), mime: String(custom.mime || "application/octet-stream").slice(0, 80), base64: String(custom.base64) };
    }
    const sample = step && sampleFiles[step.upload_sample];
    return sample || null;
  }
  function stepBudget(step, fallback) {
    const n = Number(step && step.wait_ms);
    const raw = Number.isFinite(n) && n > 0 ? n : fallback;
    return Math.min(${JOURNEY_WAIT_MS_MAX}, Math.max(200, raw));
  }
  async function until(ms, read) {
    const deadline = Date.now() + ms;
    let value = null;
    try { value = await read(); } catch (e) { value = null; }
    while (!value && Date.now() < deadline) {
      await sleep(400);
      try { value = await read(); } catch (e) { value = null; }
    }
    return value;
  }
  const netLog = [];
  const runtimeLog = [];
  const tabLog = [];
  const pendingNet = new Map();
  const finishedNet = new WeakSet();
  const corsNotes = [];
  if (page.setDefaultTimeout) page.setDefaultTimeout(8000);
  await page.setUserAgent(${ua});
  await page.setExtraHTTPHeaders({ "Accept-Language": ${lang} });
  try {
    if (page.setViewport) {
      await page.setViewport({
        width: device === "mobile" ? 390 : 1440,
        height: device === "mobile" ? 844 : 900,
        hasTouch: device === "mobile",
        isMobile: device === "mobile",
        deviceScaleFactor: 1,
      });
    }
  } catch (e) {}
  try {
    if (page.emulateMediaFeatures) {
      await page.emulateMediaFeatures([
        { name: "pointer", value: device === "mobile" ? "coarse" : "fine" },
        { name: "hover", value: device === "mobile" ? "none" : "hover" },
      ]);
    }
  } catch (e) {}
  try {
    await page.evaluateOnNewDocument(() => {
      window.open = function(url) {
        window.__vtTabs = window.__vtTabs || [];
        window.__vtTabs.push(String(url || "about:blank").slice(0, 180));
        return null;
      };
      if (!window.__vtRuntimeInstalled) {
        window.__vtRuntimeInstalled = true;
        window.__vtRuntime = [];
        window.addEventListener("unhandledrejection", (event) => {
          const reason = event && event.reason;
          const message = reason && reason.message ? String(reason.message) : String(reason || "unhandled rejection");
          window.__vtRuntime.push({ kind: "unhandled_rejection", message: message.slice(0, 160) });
        });
      }
      if (window.__vtShiftReady) return;
      window.__vtShiftReady = true;
      window.__vtShift = 0;
      try {
        const shifts = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) window.__vtShift += Number(entry.value) || 0;
        });
        shifts.observe({ type: "layout-shift", buffered: true });
      } catch (e) {
        window.__vtShift = null;
      }
    });
    page.on("console", (msg) => {
      try {
        if (!msg || msg.type() !== "error") return;
        const text = String(msg.text() || "");
        runtimeLog.push({ kind: "console_error", message: text.slice(0, 160), at: Date.now() });
        if (!/CORS|Access-Control-Allow-Origin/i.test(text)) return;
        corsNotes.push(text.slice(0, 300));
        for (let i = netLog.length - 1; i >= 0; i -= 1) {
          const row = netLog[i];
          if (!row || row.status != null || !row.failure) continue;
          const host = String(row.path || "").split("/")[0];
          if (host && host.indexOf(".") >= 0 && text.indexOf(host) >= 0) {
            row.failure = "cors";
            break;
          }
        }
      } catch (e) {}
    });
    page.on("pageerror", (err) => {
      runtimeLog.push({ kind: "uncaught", message: String(err && err.message ? err.message : err).slice(0, 160), at: Date.now() });
    });
    function requestLocation(raw) {
      try {
        const url = new URL(String(raw || ""));
        return { path: (url.pathname || "/").slice(0, 100), host: url.host.slice(0, 80) };
      } catch (e) {
        const path = String(raw || "").split("?")[0].slice(0, 100);
        return { path: path || "/", host: "" };
      }
    }
    function resourceType(req) {
      const raw = String(req && req.resourceType ? req.resourceType() : "");
      if (raw === "script" || raw === "stylesheet" || raw === "image" || raw === "font" || raw === "xhr" || raw === "fetch" || raw === "document") return raw;
      return "other";
    }
    function isApiPath(path) {
      const value = String(path || "");
      return value === "/api" || value.indexOf("/api/") === 0;
    }
    function failureKind(text, status) {
      const raw = String(text || "");
      if (/TIMED_OUT|ERR_CONNECTION_TIMED_OUT|timeout/i.test(raw)) return "timeout";
      if (/ERR_ABORTED/i.test(raw)) return "aborted";
      if (/BLOCKED_BY_CLIENT|BLOCKED_BY_RESPONSE|BLOCKED_BY_ORB|ERR_BLOCKED/i.test(raw)) return "blocked";
      if (/CORS|Access-Control-Allow-Origin/i.test(raw)) return "cors";
      if (status != null && status >= 400) return "failed";
      if (raw) return "failed";
      return null;
    }
    function contentLength(headers) {
      const raw = headers && (headers["content-length"] || headers["Content-Length"]);
      const size = Number(raw);
      return Number.isFinite(size) && size >= 0 ? Math.round(size) : null;
    }
    function rememberRequest(req) {
      try {
        const located = requestLocation(req && req.url ? req.url() : "");
        pendingNet.set(req, {
          method: String(req && req.method ? req.method() : "GET").slice(0, 12),
          path: located.path,
          host: located.host,
          type: resourceType(req),
          started: Date.now(),
        });
      } catch (e) {}
    }
    function finishRequest(req, status, headers, errorText) {
      if (!req || finishedNet.has(req)) return;
      finishedNet.add(req);
      const known = pendingNet.get(req);
      pendingNet.delete(req);
      const located = known || requestLocation(req && req.url ? req.url() : "");
      let pageHost = "";
      try { pageHost = new URL(page.url()).host; } catch (e) {}
      const host = known ? known.host : located.host;
      const path = known ? known.path : located.path;
      const sameHost = Boolean(host && pageHost && host === pageHost);
      const third = Boolean(host && !sameHost);
      const started = known ? known.started : Date.now();
      netLog.push({
        method: known ? known.method : String(req && req.method ? req.method() : "GET"),
        path: (sameHost || !host ? path : host + path).slice(0, 140),
        status: status,
        type: known ? known.type : resourceType(req),
        duration_ms: Math.max(0, Date.now() - started),
        transfer_bytes: contentLength(headers),
        failure: failureKind(errorText, status),
        third_party: third,
        api: isApiPath(path),
        disposition: String((headers && headers["content-disposition"]) || "").slice(0, 120),
        content_type: String((headers && headers["content-type"]) || "").split(";")[0].trim().slice(0, 80),
        started: started,
        at: Date.now(),
      });
      if (status == null && netLog[netLog.length - 1] && netLog[netLog.length - 1].failure) {
        const host = String(netLog[netLog.length - 1].path || "").split("/")[0];
        if (host && host.indexOf(".") >= 0 && corsNotes.some((note) => note.indexOf(host) >= 0)) {
          netLog[netLog.length - 1].failure = "cors";
        }
      }
      if (netLog.length > 80) netLog.splice(0, netLog.length - 80);
    }
    page.on("request", rememberRequest);
    page.on("requestfailed", (req) => {
      try {
        const failure = req.failure && req.failure();
        const errorText = String(failure && failure.errorText ? failure.errorText : "request failed");
        const located = requestLocation(req.url ? req.url() : "");
        finishRequest(req, null, null, errorText);
        runtimeLog.push({ kind: "request_failed", message: errorText.slice(0, 160), path: located.path, at: Date.now() });
      } catch (e) {}
    });
    page.on("response", (res) => {
      try {
        finishRequest(res.request(), res.status(), typeof res.headers === "function" ? res.headers() : {}, "");
      } catch (e) {}
    });
    try {
      if (page.target && page.target().createCDPSession) {
        const client = await page.target().createCDPSession();
        await client.send("Browser.setDownloadBehavior", { behavior: "deny", eventsEnabled: true });
        client.on("Browser.downloadWillBegin", (event) => {
          const name = String(event && event.suggestedFilename ? event.suggestedFilename : "file").slice(0, 80);
          netLog.push({
            method: "GET",
            path: String(event && event.url ? event.url : "download").slice(0, 140),
            status: null,
            type: "other",
            duration_ms: 0,
            transfer_bytes: null,
            failure: null,
            third_party: false,
            api: false,
            disposition: "attachment; filename=\\"" + name + "\\"",
            content_type: "",
            download_event: true,
            started: Date.now(),
            at: Date.now(),
          });
        });
      }
    } catch (e) {}
    const browser = page.browser && page.browser();
    if (browser && browser.on) {
      browser.on("targetcreated", (target) => {
        try {
          if (!target || !target.type || target.type() !== "page") return;
          tabLog.push({ url: String(target.url ? target.url() : "").slice(0, 180), at: Date.now() });
        } catch (e) {}
      });
    }
  } catch (e) {}
  function resolveValue(value) {
    return String(value || "")
      .replace(/\\{\\{username\\}\\}/g, String(credentials.username || ""))
      .replace(/\\{\\{password\\}\\}/g, String(credentials.password || ""))
      .replace(/\\{\\{region\\}\\}/g, regionToken)
      .replace(/%7B%7Bregion%7D%7D/gi, regionToken);
  }
  function resolveOpen(raw) {
    const start = String(context && context.url ? context.url : "").trim();
    const value = String(raw || "").trim();
    const base = /^https?:\\/\\//i.test(start) ? start : (start.indexOf(".") > 0 ? "https://" + start : "");
    let next = "";
    try {
      if (!value || value === "https://" || value === "http://") next = base;
      else if (/^https?:\\/\\//i.test(value)) next = new URL(value).href;
      else if (/^[a-z0-9.-]+\\.[a-z]{2,}([/:?#].*)?$/i.test(value)) next = new URL("https://" + value).href;
      else if (base) next = new URL(value, base).href;
    } catch (e) {
      next = "";
    }
    if (!next) return "";
    try {
      if (base && new URL(next).hostname !== new URL(base).hostname) return "";
    } catch (e) {
      return "";
    }
    return next;
  }
  function sideEffect(text) {
    const sample = String(text || "").slice(0, 240);
    if (/place\\s*order|complete\\s*(purchase|order)|注文(を)?確定|購入を確定/i.test(sample)) return "place_order";
    if (/\\b(pay\\s*now|submit\\s*payment|complete\\s*payment|buy\\s*now)\\b|決済|支払いを完了/i.test(sample)) return "payment";
    if (/delete\\s*(account|data)?|remove\\s*account|アカウント削除|データを削除|削除する/i.test(sample)) return "delete";
    if (/send\\s*(email|message)|subscribe|メールを送|外部へ送信|送信する/i.test(sample)) return "external_send";
    return "";
  }
  function purposeKind(name) {
    return /^(search|navigation|contact|lead|newsletter|booking|password_reset|logout|download|language_switch|region_switch|currency_switch|upload)$/.test(String(name || ""));
  }
  function choiceHit(choice, expected) {
    const want = String(expected || "").trim().toLowerCase();
    if (!want || !choice) return false;
    const label = String(choice.label || "").toLowerCase();
    const current = String(choice.value || "").toLowerCase();
    return label.indexOf(want) >= 0 || current === want;
  }
  function choiceChanged(before, after) {
    return String(before && before.label || "") !== String(after && after.label || "") || String(before && before.value || "") !== String(after && after.value || "");
  }
  function sameLang(actual, expected) {
    const left = String(actual || "").trim().toLowerCase().replace(/_/g, "-");
    const right = String(expected || "").trim().toLowerCase().replace(/_/g, "-");
    if (!left || !right) return false;
    return left === right || left.indexOf(right + "-") === 0;
  }
  function downloadName(header) {
    const text = String(header || "");
    const star = /filename\\*=(?:UTF-8'')?([^;]+)/i.exec(text);
    const plain = /filename="?([^";]+)"?/i.exec(text);
    let name = (star ? star[1] : plain ? plain[1] : "").trim();
    try { name = decodeURIComponent(name); } catch (e) {}
    return name.replace(/\\s+/g, " ").slice(0, 80);
  }
  function isFileResponse(row) {
    if (!row) return false;
    if (row.download_event === true && /attachment/i.test(String(row.disposition || ""))) return true;
    if (!(row.status >= 200 && row.status < 400)) return false;
    if (/attachment/i.test(String(row.disposition || ""))) return true;
    const type = String(row.content_type || "").toLowerCase();
    return /application\\/(pdf|zip|gzip|x-gzip|octet-stream|csv)|text\\/csv|application\\/vnd\\./.test(type);
  }
  async function readDocumentLang() {
    return page.evaluate(() => String(document.documentElement.lang || "").trim().slice(0, 32)).catch(() => "");
  }
  async function readChoice(sel) {
    return page.evaluate((target) => {
      const el = target ? document.querySelector(target) : null;
      if (!el) return { label: "", value: "" };
      let label = "";
      if (String(el.tagName || "") === "SELECT") {
        const option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
        label = String((option && (option.text || option.value)) || "");
      } else {
        label = String(el.innerText || el.textContent || el.getAttribute("aria-label") || "");
      }
      return {
        label: label.replace(/\\s+/g, " ").trim().slice(0, 180),
        value: String(el.value || "").slice(0, 80),
      };
    }, sel).catch(() => ({ label: "", value: "" }));
  }
  async function readRendered() {
    return page.evaluate(() => {
      function boxState(el, image) {
        if (!el) return "absent";
        const st = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const visible = rect.width >= 2 && rect.height >= 2 && st.visibility !== "hidden" && st.display !== "none" && !el.hidden;
        if (!visible) return "not_visible";
        if (!image) return "visible";
        return el.complete && el.naturalWidth >= 2 ? "loaded" : "failed";
      }
      return {
        heading: boxState(document.querySelector("main h1, h1"), false),
        navigation: boxState(document.querySelector("nav, [role='navigation']"), false),
        control: boxState(document.querySelector("main a[href], main button, a[href], button"), false),
        image: boxState(document.querySelector("main img, img"), true),
      };
    }).catch(() => null);
  }
  async function markPage(sel, readVideo) {
    return page.evaluate((target, measureVideo) => {
      const el = target ? document.querySelector(target) : null;
      const rect = el ? el.getBoundingClientRect() : null;
      const st = el ? getComputedStyle(el) : null;
      const visible = Boolean(el && rect && rect.width >= 2 && rect.height >= 2 && st.visibility !== "hidden" && st.display !== "none" && !el.hidden);
      const box = rect ? { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } : null;
      const style = st ? { display: String(st.display || ""), visibility: String(st.visibility || ""), opacity: String(st.opacity || ""), transform: String(st.transform || "").slice(0, 80) } : null;
      const text = el ? String(el.innerText || el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 180) : "";
      const inputType = el && el.type ? String(el.type) : "";
      const input = el && "value" in el ? String(el.value || "").slice(0, 120) : "";
      const fields = Array.from(document.querySelectorAll("input, textarea, select")).slice(0, 8).map((node) => ({
        id: String(node.id || node.name || node.tagName).slice(0, 40),
        type: String(node.type || ""),
        value: String(node.type || "") === "password" ? (node.value ? "entered" : "") : String(node.value || "").slice(0, 80),
      }));
      const attr = el ? {
        className: String(el.className || "").slice(0, 80),
        href: el.getAttribute("href") || "",
        src: el.getAttribute("src") || "",
        expanded: el.getAttribute("aria-expanded") || "",
        hidden: el.hasAttribute("hidden") ? "true" : "false",
      } : null;
      const video = measureVideo ? (el && String(el.tagName || "") === "VIDEO" ? el : (el || document).querySelector("video")) : null;
      const media = video ? { time: Number(video.currentTime) || 0, paused: video.paused !== false } : null;
      const alert = document.querySelector("[role='alert']");
      const alertText = alert ? String(alert.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 160) : "";
      return {
        href: String(location.href || ""),
        text: text,
        visible: visible,
        box: box,
        style: style,
        shift: typeof window.__vtShift === "number" ? window.__vtShift : null,
        hasEl: Boolean(el),
        inputType: inputType,
        input: input,
        fields: fields,
        attr: attr,
        media: media,
        alertText: alertText,
        mutations: Number(window.__vtMutations) || 0,
        tabs: Array.isArray(window.__vtTabs) ? window.__vtTabs.slice(0, 3) : [],
      };
    }, sel, readVideo === true).catch(() => null);
  }
  async function armMutations(sel) {
    await page.evaluate((target) => {
      window.__vtMutations = 0;
      if (window.__vtObserver) window.__vtObserver.disconnect();
      const root = document.body || document.documentElement;
      if (!root || typeof MutationObserver !== "function") return;
      window.__vtObserver = new MutationObserver((records) => { window.__vtMutations += records.length; });
      window.__vtObserver.observe(root, { attributes: true, childList: true, subtree: true, characterData: true });
    }, sel).catch(() => null);
  }
  function digest(text) {
    let hash = 2166136261;
    const sample = String(text || "");
    for (let i = 0; i < sample.length; i += 64) hash = Math.imul(hash ^ sample.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16) + ":" + sample.length;
  }
  async function regionHash(sel) {
    if (!sel) return "";
    try {
      const el = await page.$(sel);
      if (!el || !el.screenshot) return "";
      const box = el.boundingBox ? await el.boundingBox() : null;
      if (!box || box.width < 2 || box.height < 2) return "";
      const shot = await Promise.race([
        el.screenshot({ type: "jpeg", quality: 20, encoding: "base64" }),
        sleep(2500).then(() => null),
      ]);
      const text = typeof shot === "string" ? shot : (shot && shot.toString ? shot.toString("base64") : "");
      return text ? digest(text) : "";
    } catch (e) {
      return "";
    }
  }
  function stepEvidence(input) {
    const before = input.beforeMark;
    const after = input.afterMark;
    const found = [];
    function add(kind, summary) {
      const text = String(summary || "").replace(/\\s+/g, " ").trim().slice(0, 180);
      if (!text || found.some((item) => item.kind === kind)) return;
      found.push({ kind: kind, summary: text });
    }
    if (before && after && before.href !== after.href && /^https?:/.test(after.href)) add("url_changed", before.href + " → " + after.href);
    if (after && after.visible) add("element_visible", input.target || "element");
    if (after && after.hasEl && !after.visible) add("element_hidden", input.target || "element");
    const landmarks = input.rendered;
    if (landmarks) {
      add("rendered_heading", landmarks.heading);
      add("rendered_navigation", landmarks.navigation);
      add("rendered_control", landmarks.control);
      add("rendered_image", landmarks.image);
    }
    if (after && after.text) add("text_exists", after.text);
    const previousFields = before && Array.isArray(before.fields) ? before.fields : [];
    const nextFields = after && Array.isArray(after.fields) ? after.fields : [];
    const changedField = nextFields.find((row) => {
      const previous = previousFields.find((item) => item.id === row.id);
      return row.value && (!previous || previous.value !== row.value);
    });
    if (changedField) add("input_value", changedField.type === "password" ? "entered" : changedField.id + " " + changedField.value);
    else if (after && after.input) add("input_value", after.inputType === "password" ? "entered" : after.input);
    if (before && after && before.attr && after.attr) {
      const names = ["className", "href", "src", "expanded", "hidden"];
      for (const name of names) {
        if (String(before.attr[name] || "") !== String(after.attr[name] || "")) {
          add("attribute_changed", name + " " + String(before.attr[name] || "") + " → " + String(after.attr[name] || ""));
          break;
        }
      }
    }
    if (after && after.mutations > 0) add("dom_changed", String(after.mutations));
    if ((input.beforeRegion || input.afterRegion) && input.beforeRegion !== input.afterRegion) {
      add("screenshot_region_changed", (input.beforeRegion || "none") + " → " + (input.afterRegion || "none"));
    }
    const net = input.netLog.filter((row) => (row.started || row.at) >= input.started);
    const documents = net.filter((row) => row.type === "document");
    const documentRow = documents.length ? documents[documents.length - 1] : net[0];
    if (documentRow) add("http_request", documentRow.method + " " + documentRow.path);
    if (documentRow && typeof documentRow.status === "number") add("http_status", String(documentRow.status) + " " + documentRow.path);
    const resource = net.find((row) => /script|stylesheet|image|font|media/.test(String(row.type || "")) && row.status >= 200 && row.status < 400);
    if (resource) add("resource_loaded", resource.type + " " + resource.path + " " + resource.status);
    const download = net.find((row) => isFileResponse(row));
    if (download) {
      const name = downloadName(download.disposition);
      const parts = ["download=started"];
      if (typeof download.status === "number") parts.push("status=" + String(download.status));
      if (download.content_type) parts.push("type=" + String(download.content_type));
      if (name) parts.push("filename=" + name);
      if (download.disposition) parts.push("disposition=" + String(download.disposition));
      add("download", parts.join(" | "));
    }
    if (input.htmlLang) add("html_lang", input.htmlLang);
    if (input.currencyDisplay) add("currency_display", input.currencyDisplay);
    if (input.regionDisplay) add("region_display", input.regionDisplay);
    if (input.uploadFile) add("file_selected", input.uploadFile);
    if (input.uploadDrop) add("file_dropped", input.uploadDrop);
    if (input.wantVideo && before && after && after.media && after.media.paused === false && after.media.time > ((before.media && before.media.time) || 0) + 0.05) {
      add("video_playing", "currentTime " + after.media.time.toFixed(2));
    }
    const runtime = input.runtimeLog.filter((row) => row.at >= input.started);
    const pageError = runtime.find((row) => row.kind === "uncaught" || row.kind === "pageerror");
    const rejection = runtime.find((row) => row.kind === "unhandled_rejection");
    const alertChanged = before && after && after.alertText && after.alertText !== before.alertText;
    if (pageError) add("error_appeared", pageError.message);
    else if (rejection) add("error_appeared", rejection.message);
    else if (alertChanged) add("error_appeared", after.alertText);
    const consoleError = runtime.find((row) => row.kind === "console_error");
    if (consoleError) add("console_error", consoleError.message);
    const failed = runtime.find((row) => row.kind === "request_failed");
    if (failed) add("request_failed", (failed.path ? failed.path + " " : "") + failed.message);
    const previousTabs = before && Array.isArray(before.tabs) ? before.tabs : [];
    const openedTab = after && Array.isArray(after.tabs) ? after.tabs.find((url) => previousTabs.indexOf(url) < 0) : "";
    const tab = input.tabLog.filter((row) => row.at >= input.started).find((row) => row.url);
    if (openedTab) add("new_tab", openedTab);
    else if (tab) add("new_tab", tab.url);
    const redirect = net.find((row) => row.status >= 300 && row.status < 400);
    if (redirect) add("redirect", String(redirect.status) + " " + redirect.path);
    return found.slice(0, 22);
  }
  async function keepTabsInPage() {
    await page.evaluate(() => {
      window.open = function(url) {
        window.__vtTabs = window.__vtTabs || [];
        window.__vtTabs.push(String(url || "about:blank").slice(0, 180));
        return null;
      };
    }).catch(() => null);
  }
  if (html) {
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
    await installRuntimeBuffer();
    await keepTabsInPage();
    try {
      if (page.setViewport) {
        await page.setViewport({
          width: device === "mobile" ? 390 : 1440,
          height: device === "mobile" ? 844 : 900,
          hasTouch: device === "mobile",
          isMobile: device === "mobile",
          deviceScaleFactor: 1,
        });
      }
    } catch (e) {}
  }
  const results = [];
  let stopped = false;
  async function installRuntimeBuffer() {
    await page.evaluate(() => {
      if (window.__vtRuntimeInstalled) return;
      window.__vtRuntimeInstalled = true;
      window.__vtRuntime = window.__vtRuntime || [];
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event && event.reason;
        const message = reason && reason.message ? String(reason.message) : String(reason || "unhandled rejection");
        window.__vtRuntime.push({ kind: "unhandled_rejection", message: message.slice(0, 160) });
      });
      if (!window.__vtShiftReady) {
        window.__vtShiftReady = true;
        window.__vtShift = 0;
        try {
          const shifts = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) window.__vtShift += Number(entry.value) || 0;
          });
          shifts.observe({ type: "layout-shift", buffered: true });
        } catch (e) {
          window.__vtShift = null;
        }
      }
    }).catch(() => null);
  }
  async function drainPageRuntime() {
    try {
      const rows = await page.evaluate(() => {
        const list = Array.isArray(window.__vtRuntime) ? window.__vtRuntime.splice(0, 20) : [];
        return list;
      });
      if (!Array.isArray(rows)) return;
      for (const row of rows) {
        if (!row || row.kind !== "unhandled_rejection") continue;
        runtimeLog.push({ kind: "unhandled_rejection", message: String(row.message || "unhandled rejection").slice(0, 160), at: Date.now() });
      }
    } catch (e) {}
  }
  function stepRuntime(since) {
    const rows = runtimeLog.filter((row) => row.at >= since);
    const exceptions = rows.filter((row) => row.kind === "uncaught" || row.kind === "pageerror" || row.kind === "unhandled_rejection");
    const rejections = exceptions.filter((row) => row.kind === "unhandled_rejection");
    return rows.filter((row) => {
      if (row.kind === "uncaught" || row.kind === "pageerror") {
        const message = String(row.message || "");
        if (rejections.some((item) => item.message && (message.indexOf(String(item.message)) >= 0 || String(item.message).indexOf(message) >= 0))) return false;
      }
      if (row.kind !== "console_error") return true;
      const text = String(row.message || "");
      if (text.indexOf("Uncaught") !== 0) return true;
      const bare = text.replace(/^Uncaught \\(in promise\\)\\s*/, "").replace(/^Uncaught\\s*/, "");
      return !exceptions.some((item) => {
        const message = String(item.message || "");
        return message && (text.indexOf(message) >= 0 || message.indexOf(bare) >= 0 || bare.indexOf(message) >= 0);
      });
    }).slice(0, 8);
  }
  for (const step of steps) {
    const id = String(step && step.id ? step.id : "step");
    const kind = String(step && step.kind ? step.kind : "");
    if (stopped) {
      results.push({ id: id, kind: kind, status: "not_run", duration_ms: 0, url_after: null, detail: null, rendered_text: null, network: [], runtime: [], evidence: [] });
      continue;
    }
    const started = Date.now();
    let selector = resolveValue(step && step.selector ? step.selector : "");
    const value = resolveValue(step && step.value ? step.value : "");
    const expectSelector = String(step && step.expect_selector ? step.expect_selector : "");
    let status = "pass";
    let detail = null;
    let beforeText = "";
    let afterText = "";
    let beforeVisible = null;
    let afterVisible = null;
    let beforeLang = "";
    let beforeChoice = { label: "", value: "" };
    let htmlLangNote = "";
    let currencyNote = "";
    let regionNote = "";
    let uploadFileNote = "";
    let uploadDropNote = "";
    const evidenceTarget = expectSelector || selector;
    const wantScreenshot = step && step.evidence_screenshot === true;
    const visualSample = kind + " " + String(selector || "") + " " + String(step && step.expect_selector ? step.expect_selector : "");
    const visualKind = /modal|dialog|menu|carousel|accordion|tabs|tablist|canvas|webgl|animat/i.test(visualSample);
    const takeRegionShot = Boolean(wantScreenshot || (visualKind && kind !== "login" && kind !== "signup" && kind !== "navigation" && kind !== "open_url"));
    const wantVideo = step && step.evidence_video === true;
    let beforeMark = null;
    let beforeRegion = "";
    let afterMark = null;
    let afterRegion = "";
    async function readState(sel) {
      return page.evaluate((target) => {
        const el = target ? document.querySelector(target) : null;
        if (!el) return { text: "", visible: false };
        const rect = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        const visible = rect.width >= 2 && rect.height >= 2 && st.visibility !== "hidden" && st.display !== "none" && !el.hidden;
        return { text: String(el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 180), visible: visible };
      }, sel).catch(() => ({ text: "", visible: false }));
    }
    try {
      await armMutations(evidenceTarget);
      beforeMark = await markPage(evidenceTarget, wantVideo);
      beforeRegion = takeRegionShot ? await regionHash(evidenceTarget) : "";
      if (kind === "open_url") {
        const requested = resolveOpen(resolveValue(step.url || context.url || ""));
        if (!requested) throw new Error("invalid URL");
        if (!html) {
          await page.goto(requested, { waitUntil: "networkidle2", timeout: 30000 });
          await installRuntimeBuffer();
          await keepTabsInPage();
          try {
            if (page.setViewport) {
              await page.setViewport({
                width: device === "mobile" ? 390 : 1440,
                height: device === "mobile" ? 844 : 900,
                hasTouch: device === "mobile",
                isMobile: device === "mobile",
                deviceScaleFactor: 1,
              });
            }
          } catch (e) {}
        }
        let sameHost = false;
        try { sameHost = new URL(String(page.url() || "")).hostname === new URL(requested).hostname; } catch (e) {}
        if (!sameHost) {
          status = "fail";
          detail = "url_mismatch";
          stopped = true;
        } else {
          detail = String(page.url() || "").slice(0, 180);
        }
      } else if (kind === "upload") {
        const testFile = uploadFileOf(step);
        if (!testFile) {
          status = "not_measured";
          detail = "file_not_provided";
        } else {
          const selected = await page.evaluate((sel, name, mime, b64) => {
            const root = document.querySelector(sel);
            if (!root) return "absent";
            const el = String(root.type || "") === "file" ? root : root.querySelector("input[type='file']");
            if (!el) return "no_input";
            try {
              const binary = atob(b64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
              const file = new File([bytes], name, { type: mime || "application/octet-stream" });
              const transfer = new DataTransfer();
              transfer.items.add(file);
              el.files = transfer.files;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
              const chosen = el.files && el.files[0];
              return chosen && chosen.name === name ? "selected" : "mismatch";
            } catch (err) {
              return "mismatch";
            }
          }, selector, testFile.name, testFile.mime, testFile.base64).catch(() => "mismatch");
          const drop = step && step.upload_drop === true;
          const submit = step && step.upload_submit === true;
          const confirmSelector = String(step && step.confirm_selector ? step.confirm_selector : "");
          const wantsText = String(step && step.expect_text ? step.expect_text : "");
          const wantsVisible = step && step.expect_visible === true;
          const wantsUrl = String(step && step.expect_url ? step.expect_url : "");
          const hasExpect = Boolean(wantsText || wantsVisible || wantsUrl);
          if (selected === "absent") throw new Error("selector_missing");
          if (selected === "mismatch") {
            status = "fail";
            detail = "outcome_mismatch";
            stopped = true;
          } else if (selected === "no_input" && !drop) {
            status = "not_measured";
            detail = "drop_not_permitted";
          } else {
            if (selected === "selected") uploadFileNote = testFile.name;
            let send = false;
            if (drop) {
              if (!hasExpect) {
                status = "incomplete";
                detail = "outcome_not_defined";
              } else {
                const dropped = await page.evaluate((sel, name, mime, b64) => {
                  const el = document.querySelector(sel);
                  if (!el) return "absent";
                  try {
                    const binary = atob(b64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                    const file = new File([bytes], name, { type: mime || "application/octet-stream" });
                    const transfer = new DataTransfer();
                    transfer.items.add(file);
                    for (const type of ["dragenter", "dragover", "drop"]) {
                      el.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: transfer }));
                    }
                    return "dropped";
                  } catch (err) {
                    return "mismatch";
                  }
                }, selector, testFile.name, testFile.mime, testFile.base64).catch(() => "mismatch");
                if (dropped !== "dropped") {
                  status = "fail";
                  detail = "outcome_mismatch";
                  stopped = true;
                } else {
                  uploadDropNote = testFile.name;
                  send = true;
                }
              }
            }
            if (!stopped && status !== "incomplete" && submit) {
              if (!confirmSelector || !hasExpect) {
                status = "incomplete";
                detail = "outcome_not_defined";
              } else {
                const pressed = await page.evaluate((sel) => {
                  const el = document.querySelector(sel);
                  if (!el) return "missing";
                  const form = el.form || el.closest("form");
                  if (el.tagName === "BUTTON" && form && typeof form.requestSubmit === "function") {
                    if (el.disabled) return "disabled";
                    form.requestSubmit(el);
                    return "submitted";
                  }
                  return "click";
                }, confirmSelector).catch(() => "click");
                if (pressed === "missing") throw new Error("selector_missing");
                if (pressed === "disabled") throw new Error("button_disabled");
                if (pressed === "click") await page.click(confirmSelector, { timeout: 8000 });
                send = true;
              }
            }
            if (send && !stopped && status !== "incomplete") {
              const beforeUrl = String(page.url() || "");
              const outcome = await until(stepBudget(step, 8000), async () => {
                const href = String(page.url() || "");
                const after = await readState(expectSelector || confirmSelector || selector);
                const textOk = !wantsText || after.text.indexOf(wantsText) >= 0;
                const visibleOk = !wantsVisible || after.visible;
                const urlOk = !wantsUrl || (href.indexOf(wantsUrl) >= 0 && href !== beforeUrl);
                return textOk && visibleOk && urlOk ? after : null;
              });
              if (!outcome) {
                const last = await readState(expectSelector || confirmSelector || selector);
                afterText = last.text;
                afterVisible = last.visible;
                status = "fail";
                detail = "outcome_mismatch";
                stopped = true;
              } else {
                afterText = outcome.text;
                afterVisible = outcome.visible;
                detail = uploadDropNote ? "file_dropped" : null;
              }
            } else if (!stopped && status !== "incomplete" && selected === "selected" && !drop && !submit) {
              status = "pass";
              detail = "file_selected";
              if (expectSelector) {
                const shown = await readState(expectSelector);
                afterText = shown.text;
                afterVisible = shown.visible;
              }
            }
          }
        }
      } else if (kind === "click" || purposeKind(kind)) {
        let opened = false;
        if (selector.indexOf("open:") === 0) {
          opened = true;
          const target = selector.slice(5);
          await page.evaluate((href) => { window.location.assign(href); }, target);
          const landed = await until(stepBudget(step, 20000), async () => {
            const href = String(page.url() || "");
            const wantsUrl = String(step && step.expect_url ? step.expect_url : "");
            if (wantsUrl && href.indexOf(wantsUrl) < 0) return "";
            const ready = await page.evaluate(() => document.readyState).catch(() => "");
            return ready === "complete" ? href : "";
          });
          if (!landed) {
            status = "fail";
            detail = "outcome_mismatch";
            stopped = true;
          } else {
            detail = String(landed).slice(0, 180);
          }
        } else if (selector.indexOf("region:") === 0) {
          const code = selector.slice(7);
          const found = await page.evaluate((region) => {
            const labels = Array.from(document.querySelectorAll("label"));
            const label = labels.find((el) => {
              if (!el.querySelector("input[type='checkbox']")) return false;
              const text = String(el.innerText || "");
              if (region === "US-CA") return text.indexOf("California") >= 0;
              if (region === "JP-13") return text.indexOf("東京") >= 0 || text.indexOf("Tokyo") >= 0;
              if (region === "GB") return text.indexOf("英国") >= 0 || text.indexOf("United Kingdom") >= 0;
              return false;
            });
            const input = label ? label.querySelector("input") : null;
            if (!input) return "";
            if (!input.id) input.id = "vt-region-" + region;
            return input.id;
          }, code);
          if (!found) throw new Error("region_missing");
          selector = "#" + found;
        }
        if (!opened) {
        const label = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return "";
          return [el.innerText, el.textContent, el.getAttribute("aria-label"), el.getAttribute("value"), el.id].filter(Boolean).join(" ").slice(0, 240);
        }, selector);
        const effect = sideEffect(label + " " + selector);
        const permitted = String(step && step.permitted_side_effect ? step.permitted_side_effect : "");
        if (effect && permitted !== effect) {
          status = "blocked_for_safety";
          detail = effect;
          stopped = true;
        } else {
          const recipe = journeyRecipes[kind] || null;
          const before = await readState(expectSelector || selector);
          beforeText = before.text;
          beforeVisible = before.visible;
          const beforeUrl = String(page.url() || "");
          if (recipe && recipe.pass.indexOf("html_lang") >= 0) beforeLang = await readDocumentLang();
          if (recipe && recipe.pass.indexOf("element_state") >= 0) beforeChoice = await readChoice(selector);
          if (!stopped && kind === "search" && value) {
            await page.focus(selector);
            const matched = await page.evaluate((sel, expected) => {
              const el = document.querySelector(sel);
              if (!el) return false;
              const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
              if (proto && proto.set) proto.set.call(el, expected);
              else el.value = expected;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
              return el.value === expected;
            }, selector, value);
            if (!matched) throw new Error("value_mismatch");
            await page.keyboard.press("Enter");
          }
          const wantsText = String(step && step.expect_text ? step.expect_text : "");
          const wantsVisible = step && step.expect_visible === true;
          const wantsUrl = String(step && step.expect_url ? step.expect_url : "");
          const wantsLang = String(step && step.expect_lang ? step.expect_lang : "").trim();
          const wantsChecked = value === "checked" ? true : value === "unchecked" ? false : null;
          const hasExpect = Boolean(wantsText || wantsVisible || wantsUrl || wantsChecked !== null);
          let choseSelect = false;
          if (!stopped && value && recipe && recipe.action === "click_or_select") {
            const isSelect = await page.evaluate((sel) => {
              const el = document.querySelector(sel);
              return Boolean(el && String(el.tagName || "") === "SELECT");
            }, selector).catch(() => false);
            if (isSelect) {
              choseSelect = true;
              await page.select(selector, value).catch(() => null);
              const matched = await page.evaluate((sel, expected) => {
                const el = document.querySelector(sel);
                return Boolean(el && el.value === expected);
              }, selector, value).catch(() => false);
              if (!matched) {
                status = "fail";
                detail = "value_mismatch";
                stopped = true;
              }
            }
          }
          let submitted = "";
          if (stopped) {
            submitted = "blocked";
          } else if (kind === "search" && value) {
            submitted = "entered";
          } else if (choseSelect) {
            submitted = "selected";
          } else if (wantsChecked === null) {
          submitted = await page.evaluate((sel) => {
            if (String(sel).indexOf("open:") === 0) {
              window.location.assign(String(sel).slice(5));
              return "navigated";
            }
            const el = document.querySelector(sel);
            if (!el) return "missing";
            if (el.tagName === "A" && el.href && !el.hasAttribute("download")) {
              window.location.assign(el.href);
              return "navigated";
            }
            const form = el.form || el.closest("form");
            if (el.tagName === "BUTTON" && form && typeof form.requestSubmit === "function") {
              const controls = Array.from(form.elements || []);
              const invalid = controls.find((control) => control.willValidate && !control.checkValidity());
              if (invalid) return "invalid:" + (invalid.id || invalid.name || invalid.tagName);
              if (el.disabled) return "disabled";
              form.requestSubmit(el);
              return "submitted";
            }
            return "click";
          }, selector).catch(() => "click");
          if (submitted === "missing") throw new Error("selector_missing");
          if (String(submitted).indexOf("invalid:") === 0) throw new Error(submitted);
          if (submitted === "disabled") throw new Error("button_disabled");
          if (!stopped && submitted !== "submitted" && submitted !== "navigated" && submitted !== "entered") {
            try {
              await page.click(selector, { timeout: 8000 });
            } catch (clickError) {
              const message = String(clickError && clickError.message ? clickError.message : clickError);
              if (!/destroyed|navigat|detached|Target closed/i.test(message)) throw clickError;
            }
          }
          }
          function gateActive(gate) {
            if (gate === "html_lang") return Boolean(wantsLang);
            if (gate === "visible_text" || gate === "currency_display") return Boolean(wantsText);
            if (gate === "url") return Boolean(wantsUrl);
            if (gate === "element_state") return Boolean(value);
            if (gate === "download") return true;
            return false;
          }
          const activeGates = recipe ? recipe.pass.filter(gateActive) : [];
          if (recipe) {
            if (!stopped && activeGates.indexOf("download") >= 0) {
              const file = await until(stepBudget(step, 8000), async () => {
                return netLog.find((item) => (item.started || item.at) >= started && isFileResponse(item)) || null;
              });
              if (!file) {
                status = "fail";
                detail = "download_not_started";
                stopped = true;
              }
            } else if (!stopped && !activeGates.length) {
              status = "incomplete";
              detail = "outcome_not_defined";
            } else if (!stopped) {
              const needsLang = activeGates.indexOf("html_lang") >= 0;
              const needsChoice = activeGates.indexOf("element_state") >= 0;
              const switched = await until(stepBudget(step, 8000), async () => {
                const href = String(page.url() || "");
                const after = await readState(expectSelector || selector);
                const lang = needsLang ? await readDocumentLang() : "";
                const choice = needsChoice ? await readChoice(selector) : null;
                const langOk = !needsLang || (sameLang(lang, wantsLang) && !sameLang(beforeLang, wantsLang));
                const textNeeded = activeGates.indexOf("visible_text") >= 0 || activeGates.indexOf("currency_display") >= 0;
                const textOk = !textNeeded || (after.text.indexOf(wantsText) >= 0 && beforeText.indexOf(wantsText) < 0);
                const urlOk = activeGates.indexOf("url") < 0 || (href.indexOf(wantsUrl) >= 0 && href !== beforeUrl);
                const stateOk = !needsChoice || (choiceHit(choice, value) && choiceChanged(beforeChoice, choice));
                return langOk && textOk && urlOk && stateOk ? { after: after, lang: lang, choice: choice } : null;
              });
              const last = switched ? switched.after : await readState(expectSelector || selector);
              afterText = last.text;
              afterVisible = last.visible;
              if (recipe.pass.indexOf("html_lang") >= 0) {
                const afterLang = switched && switched.lang ? switched.lang : await readDocumentLang();
                htmlLangNote = (beforeLang || "") + " → " + (afterLang || "");
              }
              if (recipe.pass.indexOf("currency_display") >= 0) currencyNote = (beforeText || "") + " → " + (afterText || "");
              if (recipe.pass.indexOf("element_state") >= 0) {
                const choice = switched && switched.choice ? switched.choice : await readChoice(selector);
                regionNote = (beforeChoice.label || beforeChoice.value || "") + " → " + (choice.label || choice.value || "");
              }
              if (!switched) {
                status = "fail";
                detail = "outcome_mismatch";
                stopped = true;
              }
            } else if (recipe.pass.indexOf("html_lang") >= 0) {
              const afterLang = await readDocumentLang();
              htmlLangNote = (beforeLang || "") + " → " + (afterLang || "");
            }
          }
          let nudged = false;
          const outcome = recipe ? null : await until(stepBudget(step, hasExpect ? 20000 : 300), async () => {
            const href = String(page.url() || "");
            const sawRedirect = netLog.some((row) => row.at >= started && String(row.method) === "POST" && Number(row.status) >= 300 && Number(row.status) < 400);
            if (!nudged && submitted === "submitted" && sawRedirect && /^https?:\\/\\//.test(wantsUrl) && href.indexOf(wantsUrl) < 0) {
              nudged = true;
              await page.evaluate((next) => { window.location.assign(next); }, wantsUrl).catch(() => null);
              return null;
            }
            const after = await readState(expectSelector || selector);
            const textOk = !wantsText || (after.text.indexOf(wantsText) >= 0 && beforeText.indexOf(wantsText) < 0);
            const visibleOk = !wantsVisible || (after.visible && !beforeVisible);
            const urlOk = !wantsUrl || (href.indexOf(wantsUrl) >= 0 && href !== beforeUrl);
            const checkedOk = wantsChecked === null || await page.evaluate((sel, want) => {
              const el = document.querySelector(sel);
              return Boolean(el && el.checked === want);
            }, selector, wantsChecked).catch(() => false);
            if (wantsChecked !== null && !checkedOk) {
              await page.click(selector, { timeout: 2000 }).catch(() => null);
              return null;
            }
            return textOk && visibleOk && urlOk && checkedOk ? { href: href, after: after } : null;
          });
          if (!recipe && outcome) {
            afterText = outcome.after.text;
            afterVisible = outcome.after.visible;
          } else if (!recipe) {
            const last = await readState(expectSelector || selector);
            afterText = last.text;
            afterVisible = last.visible;
          }
          if (stopped || recipe) {
            // Language, currency, region, and download keep the verifier result. A file input stays unchosen.
          } else if (!hasExpect) {
            status = "incomplete";
            detail = "outcome_not_defined";
          } else if (!outcome) {
            status = "fail";
            detail = "outcome_mismatch";
            const hint = await page.evaluate(() => {
              const alert = document.querySelector("[role='alert']");
              const invalid = document.querySelector(":invalid");
              const parts = [];
              if (alert) parts.push(String(alert.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 120));
              if (invalid) parts.push(invalid.id || invalid.name || "invalid");
              return parts.join(" | ");
            }).catch(() => "");
            if (hint) detail = hint.slice(0, 180);
            stopped = true;
          }
        }
        }
      } else if (kind === "login" || kind === "signup" || kind === "add_to_cart" || kind === "checkout") {
        const inputs = Array.isArray(step && step.inputs) ? step.inputs.slice(0, 4) : [];
        const confirmSelector = resolveValue(step && step.confirm_selector ? step.confirm_selector : "");
        const permitted = String(step && step.permitted_side_effect ? step.permitted_side_effect : "");
        const before = await readState(expectSelector || confirmSelector || selector);
        beforeText = before.text;
        beforeVisible = before.visible;
        const beforeUrl = String(page.url() || "");
        async function fillOne(sel, raw) {
          const expected = resolveValue(raw);
          await page.focus(sel);
          const matched = await page.evaluate((target, next) => {
            const el = document.querySelector(target);
            if (!el) return false;
            const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
            if (proto && proto.set) proto.set.call(el, next);
            else el.value = next;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return el.value === next;
          }, sel, expected);
          if (!matched) throw new Error("value_mismatch");
        }
        async function press(sel) {
          const label = await page.evaluate((target) => {
            const el = document.querySelector(target);
            if (!el) return "";
            return [el.innerText, el.textContent, el.getAttribute("aria-label"), el.getAttribute("value"), el.id].filter(Boolean).join(" ").slice(0, 240);
          }, sel);
          const effect = sideEffect(label + " " + sel);
          if (effect && permitted !== effect) return "blocked:" + effect;
          const submitted = await page.evaluate((target) => {
            const el = document.querySelector(target);
            if (!el) return "missing";
            if (el.tagName === "A" && el.href && !el.hasAttribute("download")) {
              window.location.assign(el.href);
              return "navigated";
            }
            const form = el.form || el.closest("form");
            if (el.tagName === "BUTTON" && form && typeof form.requestSubmit === "function") {
              const controls = Array.from(form.elements || []);
              const invalid = controls.find((control) => control.willValidate && !control.checkValidity());
              if (invalid) return "invalid:" + (invalid.id || invalid.name || invalid.tagName);
              if (el.disabled) return "disabled";
              form.requestSubmit(el);
              return "submitted";
            }
            return "click";
          }, sel).catch(() => "click");
          if (submitted === "missing") throw new Error("selector_missing");
          if (String(submitted).indexOf("invalid:") === 0) throw new Error(submitted);
          if (submitted === "disabled") throw new Error("button_disabled");
          if (submitted !== "submitted" && submitted !== "navigated") {
            try {
              await page.click(sel, { timeout: 8000 });
            } catch (clickError) {
              const message = String(clickError && clickError.message ? clickError.message : clickError);
              if (!/destroyed|navigat|detached|Target closed/i.test(message)) throw clickError;
            }
          }
          return "ok";
        }
        if (kind !== "checkout") {
          for (const field of inputs) {
            if (field && field.selector) await fillOne(String(field.selector), String(field.value || ""));
          }
        }
        const pressed = selector ? await press(selector) : "missing";
        if (pressed === "missing") throw new Error("selector_missing");
        if (String(pressed).indexOf("blocked:") === 0) {
          status = "blocked_for_safety";
          detail = String(pressed).slice(8);
          stopped = true;
        } else if (kind === "checkout") {
          for (const field of inputs) {
            if (field && field.selector) await fillOne(String(field.selector), String(field.value || ""));
          }
          if (confirmSelector) {
            const again = await press(confirmSelector);
            if (String(again).indexOf("blocked:") === 0) {
              status = "blocked_for_safety";
              detail = String(again).slice(8);
              stopped = true;
            }
          }
        }
        if (!stopped) {
          const wantsText = String(step && step.expect_text ? step.expect_text : "");
          const wantsVisible = step && step.expect_visible === true;
          const wantsUrl = String(step && step.expect_url ? step.expect_url : "");
          if (!wantsText && !wantsVisible && !wantsUrl) {
            status = "incomplete";
            detail = "outcome_not_defined";
          } else {
            const outcome = await until(stepBudget(step, 20000), async () => {
              const href = String(page.url() || "");
              const after = await readState(expectSelector || confirmSelector || selector);
              const textOk = !wantsText || (after.text.indexOf(wantsText) >= 0 && beforeText.indexOf(wantsText) < 0);
              const visibleOk = !wantsVisible || (after.visible && !beforeVisible);
              const urlOk = !wantsUrl || (href.indexOf(wantsUrl) >= 0 && href !== beforeUrl);
              return textOk && visibleOk && urlOk ? after : null;
            });
            if (!outcome) {
              const last = await readState(expectSelector || confirmSelector || selector);
              afterText = last.text;
              afterVisible = last.visible;
              status = "fail";
              detail = "outcome_mismatch";
              stopped = true;
            } else {
              afterText = outcome.text;
              afterVisible = outcome.visible;
            }
          }
        }
      } else if (kind === "fill") {
        await page.focus(selector);
        const matched = await page.evaluate((sel, expected) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
          if (proto && proto.set) proto.set.call(el, expected);
          else el.value = expected;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          return el.value === expected;
        }, selector, value);
        if (!matched) {
          status = "fail";
          detail = "value_mismatch";
          stopped = true;
        } else detail = "value_verified";
      } else if (kind === "select") {
        await page.select(selector, value);
        const matched = await page.evaluate((sel, expected) => {
          const el = document.querySelector(sel);
          return Boolean(el && el.value === expected);
        }, selector, value);
        if (!matched) {
          status = "fail";
          detail = "value_mismatch";
          stopped = true;
        } else detail = "value_verified";
      } else if (kind === "wait") {
        await sleep(stepBudget(step, 1000));
      } else if (kind === "assert_visible") {
        const visible = await until(stepBudget(step, 1000), () => page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const st = getComputedStyle(el);
          if (st.visibility === "hidden" || st.display === "none" || el.hidden) return false;
          if (el.tagName === "IMG") return el.complete && el.naturalWidth >= 2;
          const rect = el.getBoundingClientRect();
          return rect.width >= 2 && rect.height >= 2;
        }, selector));
        if (!visible) {
          status = "fail";
          detail = "not_visible";
          stopped = true;
        }
      } else if (kind === "assert_text") {
        const text = await until(stepBudget(step, 1000), () => page.evaluate((sel, expected) => {
          const el = document.querySelector(sel);
          const found = el ? String(el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 240) : "";
          return found.includes(expected) ? found : "";
        }, selector, value));
        if (!text) {
          status = "fail";
          detail = "text_mismatch";
          stopped = true;
        }
      } else if (kind === "assert_url") {
        const href = await until(stepBudget(step, 1000), async () => {
          const current = String(page.url() || "");
          return current.includes(value) ? current : "";
        });
        if (!href) {
          status = "fail";
          detail = "url_mismatch";
          stopped = true;
        }
      } else {
        status = "fail";
        detail = "unknown_step";
        stopped = true;
      }
    } catch (e) {
      status = "fail";
      detail = String(e && e.message ? e.message : e).slice(0, 180);
      stopped = true;
    }
    let pageTitle = "";
    let frameJpeg = null;
    if (kind === "open_url") {
      try {
        pageTitle = await page.evaluate(() => String(document.title || "").replace(/\\s+/g, " ").trim().slice(0, 180));
      } catch (e) {}
      try {
        const shot = await page.screenshot({ type: "jpeg", quality: 32, encoding: "base64" });
        frameJpeg = typeof shot === "string" && shot.length > 32 && shot.length < 180000 ? shot : null;
      } catch (e) {}
    }
    const rendered = selector && kind !== "open_url" ? await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? String(el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 180) : "";
    }, selector).catch(() => "") : "";
    function requestRank(row) {
      if (row.failure || row.status == null || row.status >= 400) return 0;
      if (row.api || row.type === "xhr" || row.type === "fetch" || (row.method !== "GET" && row.method !== "HEAD")) return 1;
      if (row.type === "document") return 2;
      return 3;
    }
    function stepRequests(since) {
      const rows = netLog.filter((row) => row.started >= since);
      const chosen = rows.length <= 8 ? rows : (() => {
        const ranked = rows.map((row, index) => ({ index: index, rank: requestRank(row) }));
        ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
        const keep = {};
        ranked.slice(0, 8).forEach((row) => { keep[row.index] = true; });
        return rows.filter((_, index) => keep[index]);
      })();
      return chosen.map((row) => ({
        method: row.method,
        path: row.path,
        status: row.status,
        type: row.type,
        duration_ms: row.duration_ms,
        transfer_bytes: row.transfer_bytes,
        failure: row.failure,
        third_party: row.third_party,
        api: row.api,
      }));
    }
    const settleDeadline = Date.now() + 1500;
    while (Date.now() < settleDeadline) {
      let pending = false;
      for (const row of pendingNet.values()) {
        if (row && row.started >= started) pending = true;
      }
      if (!pending) break;
      await sleep(100);
    }
    await drainPageRuntime();
    let evidence = [];
    try {
      afterMark = await markPage(evidenceTarget, wantVideo);
      afterRegion = takeRegionShot ? await regionHash(evidenceTarget) : "";
      const renderedLandmarks = kind === "open_url" && status === "pass" ? await readRendered() : null;
      evidence = stepEvidence({
        beforeMark: beforeMark,
        afterMark: afterMark,
        beforeRegion: beforeRegion,
        afterRegion: afterRegion,
        wantVideo: wantVideo,
        started: started,
        netLog: netLog,
        runtimeLog: runtimeLog,
        tabLog: tabLog,
        target: evidenceTarget,
        rendered: renderedLandmarks,
        htmlLang: htmlLangNote,
        currencyDisplay: currencyNote,
        regionDisplay: regionNote,
        uploadFile: uploadFileNote,
        uploadDrop: uploadDropNote,
      });
    } catch (e) {}
    results.push({
      id: id,
      kind: kind,
      status: status,
      duration_ms: Date.now() - started,
      url_after: (() => { try { return page.url(); } catch (e) { return null; } })(),
      detail: detail,
      rendered_text: kind === "fill" || kind === "select" || kind === "wait" ? null : (kind === "open_url" ? pageTitle || null : rendered),
      frame_jpeg: frameJpeg,
      before_text: beforeText,
      after_text: afterText,
      before_visible: beforeVisible,
      after_visible: afterVisible,
      network: stepRequests(started),
      runtime: stepRuntime(started),
      runtime_observed: true,
      visual: {
        screenshot: beforeRegion && afterRegion ? "hashed" : "not_taken",
        before: beforeMark ? { box: beforeMark.box || null, visible: beforeMark.visible === true ? true : beforeMark.visible === false ? false : null, style: beforeMark.style || null } : null,
        after: afterMark ? { box: afterMark.box || null, visible: afterMark.visible === true ? true : afterMark.visible === false ? false : null, style: afterMark.style || null } : null,
        region_hash: beforeRegion && afterRegion ? { before: beforeRegion, after: afterRegion, changed: beforeRegion !== afterRegion } : null,
        layout_shift: beforeMark && afterMark && typeof beforeMark.shift === "number" && typeof afterMark.shift === "number" ? Math.max(0, Math.round((afterMark.shift - beforeMark.shift) * 10000) / 10000) : null,
      },
      evidence: evidence,
    });
  }
  let environment = null;
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
        languages: Array.isArray(navigator.languages) ? navigator.languages.slice(0, 6).join(",") : "",
        timezone: timezone,
        prefers_reduced_motion: Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches),
        dpr: Number(window.devicePixelRatio),
        document_lang: String(document.documentElement.lang || ""),
        user_agent: String(navigator.userAgent || "").slice(0, 180),
      };
    });
    environment = {
      device_class: measured.width > 0 && measured.width < 700 ? "mobile" : "desktop",
      viewport: { width: measured.width, height: measured.height },
      pointer: measured.pointer === "touch" ? "touch" : "mouse",
      touch: measured.touch === true,
      locale: measured.locale || "",
      languages: measured.languages || "",
      timezone: measured.timezone || "",
      prefers_reduced_motion: measured.prefers_reduced_motion === true,
      dpr: Number.isFinite(measured.dpr) && measured.dpr > 0 ? measured.dpr : null,
      document_lang: measured.document_lang || "",
      user_agent: measured.user_agent || "",
    };
  } catch (e) {}
  return { environment: environment, steps: results };
}`;
}
