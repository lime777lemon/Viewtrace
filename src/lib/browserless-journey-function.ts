import { BROWSER_LIKE_ACCEPT_LANGUAGE, BROWSER_LIKE_USER_AGENT } from "@/lib/browser-fingerprint";
import { JOURNEY_STEP_LIMIT, JOURNEY_WAIT_MS_MAX } from "@/lib/journey-definition";

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
    });
    page.on("console", (msg) => {
      try {
        if (!msg || msg.type() !== "error") return;
        runtimeLog.push({ kind: "console_error", message: String(msg.text() || "").slice(0, 160), at: Date.now() });
      } catch (e) {}
    });
    page.on("pageerror", (err) => {
      runtimeLog.push({ kind: "pageerror", message: String(err && err.message ? err.message : err).slice(0, 160), at: Date.now() });
    });
    page.on("requestfailed", (req) => {
      try {
        const raw = String(req.url ? req.url() : "");
        let path = raw.split("?")[0].slice(0, 120);
        try { path = new URL(raw).pathname.slice(0, 120); } catch (e) {}
        const failure = req.failure && req.failure();
        runtimeLog.push({ kind: "request_failed", message: String(failure && failure.errorText ? failure.errorText : "failed").slice(0, 160), path: path, at: Date.now() });
      } catch (e) {}
    });
    page.on("response", (res) => {
      try {
        const req = res.request();
        const raw = String(req.url ? req.url() : "");
        let path = raw.split("?")[0].slice(0, 120);
        try { path = new URL(raw).pathname.slice(0, 120); } catch (e) {}
        const headers = typeof res.headers === "function" ? res.headers() : {};
        netLog.push({
          method: String(req.method ? req.method() : "GET"),
          path: path,
          status: res.status(),
          type: String(req.resourceType ? req.resourceType() : ""),
          disposition: String(headers["content-disposition"] || "").slice(0, 120),
          at: Date.now(),
        });
      } catch (e) {}
    });
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
  async function markPage(sel, readVideo) {
    return page.evaluate((target, measureVideo) => {
      const el = target ? document.querySelector(target) : null;
      const rect = el ? el.getBoundingClientRect() : null;
      const st = el ? getComputedStyle(el) : null;
      const visible = Boolean(el && rect && rect.width >= 2 && rect.height >= 2 && st.visibility !== "hidden" && st.display !== "none" && !el.hidden);
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
      const root = (target && document.querySelector(target)) || document.body;
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
    const net = input.netLog.filter((row) => row.at >= input.started);
    const documents = net.filter((row) => row.type === "document");
    const documentRow = documents.length ? documents[documents.length - 1] : net[0];
    if (documentRow) add("http_request", documentRow.method + " " + documentRow.path);
    if (documentRow && typeof documentRow.status === "number") add("http_status", String(documentRow.status) + " " + documentRow.path);
    const resource = net.find((row) => /script|stylesheet|image|font|media/.test(String(row.type || "")) && row.status >= 200 && row.status < 400);
    if (resource) add("resource_loaded", resource.type + " " + resource.path + " " + resource.status);
    const download = net.find((row) => /attachment/i.test(String(row.disposition || "")));
    if (download) add("download", download.path);
    if (input.wantVideo && before && after && after.media && after.media.paused === false && after.media.time > ((before.media && before.media.time) || 0) + 0.05) {
      add("video_playing", "currentTime " + after.media.time.toFixed(2));
    }
    const runtime = input.runtimeLog.filter((row) => row.at >= input.started);
    const pageError = runtime.find((row) => row.kind === "pageerror");
    const alertChanged = before && after && after.alertText && after.alertText !== before.alertText;
    if (pageError) add("error_appeared", pageError.message);
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
    return found.slice(0, 18);
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
    const evidenceTarget = expectSelector || selector;
    const wantScreenshot = step && step.evidence_screenshot === true;
    const wantVideo = step && step.evidence_video === true;
    let beforeMark = null;
    let beforeRegion = "";
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
      beforeRegion = wantScreenshot ? await regionHash(evidenceTarget) : "";
      if (kind === "open_url") {
        const requested = resolveOpen(resolveValue(step.url || context.url || ""));
        if (!requested) throw new Error("invalid URL");
        if (!html) {
          await page.goto(requested, { waitUntil: "networkidle2", timeout: 30000 });
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
      } else if (kind === "click") {
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
          const before = await readState(expectSelector || selector);
          beforeText = before.text;
          beforeVisible = before.visible;
          const beforeUrl = String(page.url() || "");
          const wantsText = String(step && step.expect_text ? step.expect_text : "");
          const wantsVisible = step && step.expect_visible === true;
          const wantsUrl = String(step && step.expect_url ? step.expect_url : "");
          const wantsChecked = value === "checked" ? true : value === "unchecked" ? false : null;
          const hasExpect = Boolean(wantsText || wantsVisible || wantsUrl || wantsChecked !== null);
          let submitted = "";
          if (wantsChecked === null) {
          submitted = await page.evaluate((sel) => {
            if (String(sel).indexOf("open:") === 0) {
              window.location.assign(String(sel).slice(5));
              return "navigated";
            }
            const el = document.querySelector(sel);
            if (!el) return "missing";
            if (el.tagName === "A" && el.href) {
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
          if (submitted !== "submitted" && submitted !== "navigated") {
            try {
              await page.click(selector, { timeout: 8000 });
            } catch (clickError) {
              const message = String(clickError && clickError.message ? clickError.message : clickError);
              if (!/destroyed|navigat|detached|Target closed/i.test(message)) throw clickError;
            }
          }
          }
          let nudged = false;
          const outcome = await until(stepBudget(step, hasExpect ? 20000 : 300), async () => {
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
          if (outcome) {
            afterText = outcome.after.text;
            afterVisible = outcome.after.visible;
          }
          if (!hasExpect) {
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
            if (el.tagName === "A" && el.href) {
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
    function usefulNetwork(row) {
      const path = String(row && row.path ? row.path : "");
      if (/\\/_next\\/(static|image)|\\.(css|js|map|woff2?|png|jpe?g|gif|svg|ico|webp)$/i.test(path)) return false;
      if (/analytics|beacon|collect|gtm|googletagmanager|doubleclick|hotjar|segment|mixpanel|favicon/i.test(path)) return false;
      return Boolean(path);
    }
    let evidence = [];
    try {
      const afterMark = await markPage(evidenceTarget, wantVideo);
      const afterRegion = wantScreenshot ? await regionHash(evidenceTarget) : "";
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
      network: netLog.filter((row) => row.at >= started && usefulNetwork(row)).slice(0, 4),
      runtime: runtimeLog.filter((row) => row.at >= started).slice(0, 6),
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
  return { environment: environment, steps: results };
}`;
}
