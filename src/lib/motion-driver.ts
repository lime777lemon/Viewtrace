/**
 * Driver evidence for a rendered motion.
 * A classification says which signals were observed. It is not a proof that JavaScript created every frame.
 */

export const MOTION_DRIVER_INSTALL = `function installMotionDriver() {
  if (window.__vtMotionInstalled) return;
  window.__vtMotionInstalled = true;
  var events = [];
  var rafDepth = 0;
  var rafCount = 0;
  var lists = new WeakMap();
  function record(kind, el, detail, raf) {
    try {
      if (!el || el.nodeType !== 1) return;
      events.push({
        kind: kind,
        el: el,
        detail: String(detail || "").slice(0, 32),
        raf: Boolean(raf),
        at: Math.round(performance.now()),
      });
      if (events.length > 400) events.splice(0, events.length - 400);
    } catch (e) {}
  }
  window.__vtMotion = { events: events, rafCount: 0, installed: true };
  try {
    var origRAF = window.requestAnimationFrame;
    if (typeof origRAF === "function") {
      window.requestAnimationFrame = function (callback) {
        if (typeof callback !== "function") return origRAF.apply(window, arguments);
        return origRAF.call(window, function (timestamp) {
          rafDepth += 1;
          rafCount += 1;
          window.__vtMotion.rafCount = rafCount;
          try {
            return callback(timestamp);
          } finally {
            rafDepth -= 1;
          }
        });
      };
    }
  } catch (e) {}
  try {
    var proto = CSSStyleDeclaration && CSSStyleDeclaration.prototype;
    function hookStyle(prop) {
      var existing = Object.getOwnPropertyDescriptor(proto, prop);
      if (!existing || typeof existing.set !== "function") return;
      Object.defineProperty(proto, prop, {
        configurable: true,
        enumerable: existing.enumerable,
        get: existing.get,
        set: function (value) {
          record("style", this.ownerElement || null, prop, rafDepth > 0);
          return existing.set.call(this, value);
        },
      });
    }
    hookStyle("transform");
    hookStyle("opacity");
    if (proto && typeof proto.setProperty === "function") {
      var origSet = proto.setProperty;
      proto.setProperty = function (prop, value, priority) {
        var name = String(prop || "").toLowerCase();
        if (name === "transform" || name === "opacity" || name === "translate" || name === "rotate" || name === "scale") {
          record("style", this.ownerElement || null, name, rafDepth > 0);
        }
        return origSet.apply(this, arguments);
      };
    }
    var cssText = Object.getOwnPropertyDescriptor(proto, "cssText");
    if (cssText && typeof cssText.set === "function") {
      Object.defineProperty(proto, "cssText", {
        configurable: true,
        enumerable: cssText.enumerable,
        get: cssText.get,
        set: function (value) {
          record("style", this.ownerElement || null, "cssText", rafDepth > 0);
          return cssText.set.call(this, value);
        },
      });
    }
  } catch (e) {}
  try {
    var className = Object.getOwnPropertyDescriptor(Element.prototype, "className");
    if (className && typeof className.set === "function") {
      Object.defineProperty(Element.prototype, "className", {
        configurable: true,
        enumerable: className.enumerable,
        get: className.get,
        set: function (value) {
          record("class", this, "className", rafDepth > 0);
          return className.set.call(this, value);
        },
      });
    }
    var classList = Object.getOwnPropertyDescriptor(Element.prototype, "classList");
    if (classList && typeof classList.get === "function") {
      Object.defineProperty(Element.prototype, "classList", {
        configurable: true,
        enumerable: classList.enumerable,
        get: function () {
          var list = classList.get.call(this);
          try { if (list) lists.set(list, this); } catch (err) {}
          return list;
        },
      });
    }
    function hookToken(method) {
      var orig = DOMTokenList.prototype[method];
      if (typeof orig !== "function") return;
      DOMTokenList.prototype[method] = function () {
        try {
          var el = lists.get(this);
          if (el) record("class", el, method, rafDepth > 0);
        } catch (err) {}
        return orig.apply(this, arguments);
      };
    }
    hookToken("add");
    hookToken("remove");
    hookToken("toggle");
    hookToken("replace");
    var origAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function (name, value) {
      try {
        var n = String(name || "").toLowerCase();
        if (n === "class") record("class", this, "class", rafDepth > 0);
        else if (n === "style") record("style", this, "style", rafDepth > 0);
      } catch (err) {}
      return origAttr.apply(this, arguments);
    };
  } catch (e) {}
  try {
    var origAnimate = Element.prototype.animate;
    if (typeof origAnimate === "function") {
      Element.prototype.animate = function () {
        record("waapi", this, "animate", rafDepth > 0);
        return origAnimate.apply(this, arguments);
      };
    }
  } catch (e) {}
}`;

export const MOTION_DRIVER_CLASSIFIER = `function classifyMotionDriver(input) {
  if (!input || !input.renderedContinuous) return null;
  var styleWrites = Number(input.styleMutations) || 0;
  var rafStyle = Number(input.rafStyleMutations) || 0;
  var classWrites = Number(input.classMutations) || 0;
  var attributeWrites = Number(input.attributeMutations) || 0;
  var cssAnimation = Boolean(input.cssAnimation);
  var cssTransition = Boolean(input.cssTransition);
  var css = cssAnimation || cssTransition;
  var waapi = Boolean(input.waapi);
  if (rafStyle >= 2 || styleWrites >= 2) return "js_driven";
  if (waapi && styleWrites < 2 && rafStyle < 2) return "waapi";
  if ((classWrites >= 1 || attributeWrites >= 1 || styleWrites === 1) && css) return "js_triggered_css";
  if (css && styleWrites === 0 && classWrites === 0 && attributeWrites === 0) return "css_driven";
  return null;
}`;

export type MotionImplementation = "js_driven" | "js_triggered_css" | "css_driven" | "waapi";

export type MotionDriverSignals = {
  renderedContinuous: boolean;
  cssAnimation: boolean;
  cssTransition: boolean;
  styleMutations: number;
  classMutations: number;
  attributeMutations: number;
  rafStyleMutations: number;
  waapi: boolean;
};

export type MotionDriverEvidence = {
  implementation: MotionImplementation | null;
  raf_callbacks: number;
  raf_style_mutations: number;
  style_mutations: number;
  class_mutations: number;
  css_animation: boolean;
  css_transition: boolean;
  waapi: boolean;
  gsap: boolean;
};

const IMPLEMENTATIONS: MotionImplementation[] = ["js_driven", "js_triggered_css", "css_driven", "waapi"];

function count(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(240, Math.round(value)));
}

function flag(value: unknown): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  return null;
}

export function classifyMotionDriver(input: MotionDriverSignals): MotionImplementation | null {
  const run = new Function(`${MOTION_DRIVER_CLASSIFIER}; return classifyMotionDriver;`) as () => (
    input: MotionDriverSignals,
  ) => MotionImplementation | null;
  return run()(input);
}

export function parseMotionDriver(raw: unknown): MotionDriverEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const raf = count(row.raf_callbacks);
  const rafStyle = count(row.raf_style_mutations);
  const style = count(row.style_mutations);
  const klass = count(row.class_mutations);
  const cssAnimation = flag(row.css_animation);
  const cssTransition = flag(row.css_transition);
  const waapi = flag(row.waapi);
  const gsap = flag(row.gsap);
  if (
    raf == null ||
    rafStyle == null ||
    style == null ||
    klass == null ||
    cssAnimation == null ||
    cssTransition == null ||
    waapi == null ||
    gsap == null
  ) {
    return null;
  }
  const named = IMPLEMENTATIONS.find((item) => item === row.implementation) ?? null;
  return {
    implementation: named,
    raf_callbacks: raf,
    raf_style_mutations: rafStyle,
    style_mutations: style,
    class_mutations: klass,
    css_animation: cssAnimation,
    css_transition: cssTransition,
    waapi,
    gsap,
  };
}

export function motionDriverFactLines(driver: MotionDriverEvidence, locale: "ja" | "en"): string[] {
  const ja = locale === "ja";
  const observed = ja ? "観測した" : "observed";
  const absent = ja ? "観測していない" : "not observed";
  const implementation = ja
    ? {
        js_driven: "実装: JS がフレームごとに描画を更新",
        js_triggered_css: "実装: JS が CSS アニメーションを開始",
        css_driven: "実装: CSS アニメーション",
        waapi: "実装: Web Animations API。各フレームの style 更新は観測していない",
      }
    : {
        js_driven: "Implementation: JS-driven",
        js_triggered_css: "Implementation: JS-triggered CSS",
        css_driven: "Implementation: CSS-driven",
        waapi: "Implementation: Web Animations API. Per-frame style writes were not observed",
      };
  const lines = [
    driver.implementation
      ? implementation[driver.implementation]
      : ja
        ? "実装: 駆動は分類していない"
        : "Implementation: driver was not classified",
    ja
      ? `requestAnimationFrame: 計測中に ${driver.raf_callbacks} 回`
      : `requestAnimationFrame: ${driver.raf_callbacks} during the measurement window`,
    ja
      ? `RAF 中の style 更新: ${driver.raf_style_mutations}`
      : `Style writes during requestAnimationFrame: ${driver.raf_style_mutations}`,
    `${ja ? "JS の style 更新" : "JS style mutation"}: ${driver.style_mutations > 0 ? observed : absent}`,
    `${ja ? "CSS animation" : "CSS animation"}: ${driver.css_animation ? observed : absent}`,
    `${ja ? "CSS transition" : "CSS transition"}: ${driver.css_transition ? observed : absent}`,
  ];
  if (driver.gsap) lines.push(ja ? "補助: GSAP は存在する" : "Auxiliary: GSAP is present");
  return lines;
}
