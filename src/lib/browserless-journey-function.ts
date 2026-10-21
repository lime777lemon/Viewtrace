import { BROWSER_LIKE_ACCEPT_LANGUAGE, BROWSER_LIKE_USER_AGENT } from "@/lib/browser-fingerprint";

/** One Browserless session for a user-defined Journey. Discovery is not involved. */
export function buildJourneyFunctionCode(): string {
  const ua = JSON.stringify(BROWSER_LIKE_USER_AGENT);
  const lang = JSON.stringify(BROWSER_LIKE_ACCEPT_LANGUAGE);
  return `export default async function({ page, context }) {
  const steps = Array.isArray(context && context.steps) ? context.steps.slice(0, 8) : [];
  const credentials = context && context.credentials && typeof context.credentials === "object" ? context.credentials : {};
  const html = String(context && context.html ? context.html : "");
  const device = String(context && context.device_class ? context.device_class : "desktop") === "mobile" ? "mobile" : "desktop";
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const netLog = [];
  const runtimeLog = [];
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
        const raw = String(req.url ? req.url() : "");
        let path = raw.split("?")[0].slice(0, 120);
        try { path = new URL(raw).pathname.slice(0, 120); } catch (e) {}
        netLog.push({ method: String(req.method ? req.method() : "GET"), path: path, status: res.status(), at: Date.now() });
      } catch (e) {}
    });
  } catch (e) {}
  function resolveValue(value) {
    return String(value || "")
      .replace(/\\{\\{username\\}\\}/g, String(credentials.username || ""))
      .replace(/\\{\\{password\\}\\}/g, String(credentials.password || ""));
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
  if (html) {
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 20000 });
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
      results.push({ id: id, kind: kind, status: "not_run", duration_ms: 0, url_after: null, detail: null, rendered_text: null, network: [], runtime: [] });
      continue;
    }
    const started = Date.now();
    const selector = String(step && step.selector ? step.selector : "");
    const value = resolveValue(step && step.value ? step.value : "");
    const expectSelector = String(step && step.expect_selector ? step.expect_selector : "");
    let status = "pass";
    let detail = null;
    let beforeText = "";
    let afterText = "";
    let beforeVisible = null;
    let afterVisible = null;
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
      if (kind === "open_url") {
        const requested = resolveOpen(step.url || context.url || "");
        if (!requested) throw new Error("invalid URL");
        if (!html) {
          await page.goto(requested, { waitUntil: "networkidle2", timeout: 30000 });
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
          await page.click(selector, { timeout: 8000 });
          await sleep(300);
          const after = await readState(expectSelector || selector);
          afterText = after.text;
          afterVisible = after.visible;
          const wantsText = String(step && step.expect_text ? step.expect_text : "");
          const wantsVisible = step && step.expect_visible === true;
          const wantsUrl = String(step && step.expect_url ? step.expect_url : "");
          const hasExpect = Boolean(wantsText || wantsVisible || wantsUrl);
          if (!hasExpect) {
            status = "incomplete";
            detail = "outcome_not_defined";
          } else {
            const textOk = !wantsText || (after.text.indexOf(wantsText) >= 0 && before.text.indexOf(wantsText) < 0);
            const visibleOk = !wantsVisible || (after.visible && !before.visible);
            const urlOk = !wantsUrl || String(page.url() || "").indexOf(wantsUrl) >= 0;
            if (!(textOk && visibleOk && urlOk)) {
              status = "fail";
              detail = "outcome_mismatch";
              stopped = true;
            }
          }
        }
      } else if (kind === "fill") {
        await page.focus(selector);
        const matched = await page.evaluate((sel, expected) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          el.value = "";
          el.value = expected;
          el.dispatchEvent(new Event("input", { bubbles: true }));
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
        await sleep(Math.min(15000, Math.max(200, Number(step.wait_ms) || 1000)));
      } else if (kind === "assert_visible") {
        const visible = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (!el) return false;
          const rect = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return rect.width >= 2 && rect.height >= 2 && st.visibility !== "hidden" && st.display !== "none" && !el.hidden;
        }, selector);
        if (!visible) {
          status = "fail";
          detail = "not_visible";
          stopped = true;
        }
      } else if (kind === "assert_text") {
        const text = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          return el ? String(el.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 240) : "";
        }, selector);
        if (!text.includes(value)) {
          status = "fail";
          detail = "text_mismatch";
          stopped = true;
        }
      } else if (kind === "assert_url") {
        const href = page.url();
        if (!String(href || "").includes(value)) {
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
    results.push({
      id: id,
      kind: kind,
      status: status,
      duration_ms: Date.now() - started,
      url_after: page.url(),
      detail: detail,
      rendered_text: kind === "fill" || kind === "select" || kind === "wait" ? null : (kind === "open_url" ? pageTitle || null : rendered),
      frame_jpeg: frameJpeg,
      before_text: beforeText,
      after_text: afterText,
      before_visible: beforeVisible,
      after_visible: afterVisible,
      network: netLog.filter((row) => row.at >= started && usefulNetwork(row)).slice(0, 4),
      runtime: runtimeLog.filter((row) => row.at >= started).slice(0, 6),
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
