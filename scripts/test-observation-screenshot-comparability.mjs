import assert from "node:assert/strict";

function captureScope(obs) {
  const value = obs.captureConditions?.full_page_requested;
  if (value === true) return "full_page";
  if (value === false) return "viewport";
  return null;
}

function screenshotCaptureComparability(left, right) {
  const leftScope = captureScope(left);
  const rightScope = captureScope(right);
  if (leftScope == null || rightScope == null) {
    return { comparable: false, reason: "unknown_conditions" };
  }
  if (leftScope !== rightScope) {
    return { comparable: false, reason: "scope" };
  }
  const leftW = left.captureConditions?.viewport?.width ?? null;
  const rightW = right.captureConditions?.viewport?.width ?? null;
  const leftH = left.captureConditions?.viewport?.height ?? null;
  const rightH = right.captureConditions?.viewport?.height ?? null;
  if (leftW != null && rightW != null && leftW !== rightW) {
    return { comparable: false, reason: "viewport" };
  }
  if (leftH != null && rightH != null && leftH !== rightH) {
    return { comparable: false, reason: "viewport" };
  }
  return { comparable: true };
}

function screenshotSliderEligible(left, right) {
  if (!screenshotCaptureComparability(left, right).comparable) return false;
  const leftH = left.captureConditions?.result?.image_height_px ?? null;
  const rightH = right.captureConditions?.result?.image_height_px ?? null;
  return leftH != null && rightH != null && leftH === rightH;
}

const hawaii = { captureConditions: { full_page_requested: true, viewport: { width: 1280, height: 720 } } };
const delaware = { captureConditions: { full_page_requested: false, viewport: { width: 1280, height: 720 } } };
const viewportA = {
  captureConditions: {
    full_page_requested: false,
    viewport: { width: 1280, height: 720 },
    result: { image_height_px: 720 },
  },
};
const viewportB = {
  captureConditions: {
    full_page_requested: false,
    viewport: { width: 1280, height: 720 },
    result: { image_height_px: 720 },
  },
};
const viewportTall = {
  captureConditions: {
    full_page_requested: false,
    viewport: { width: 1280, height: 720 },
    result: { image_height_px: 2400 },
  },
};

assert.equal(
  screenshotCaptureComparability(hawaii, delaware).comparable === false &&
    screenshotCaptureComparability(hawaii, delaware).reason === "scope",
  true,
);

function shouldNotifyWatchOnScreenshot(verdict) {
  return verdict === "changed";
}

assert.equal(shouldNotifyWatchOnScreenshot("changed"), true);
assert.equal(shouldNotifyWatchOnScreenshot("same"), false);
assert.equal(shouldNotifyWatchOnScreenshot("incomparable"), false);
assert.equal(shouldNotifyWatchOnScreenshot("unknown"), false);
assert.deepEqual(screenshotCaptureComparability(viewportA, viewportB), { comparable: true });
assert.equal(screenshotSliderEligible(hawaii, delaware), false);
assert.equal(screenshotSliderEligible(viewportA, viewportB), true);
assert.equal(screenshotSliderEligible(viewportA, viewportTall), false);
assert.deepEqual(screenshotCaptureComparability({}, viewportA), {
  comparable: false,
  reason: "unknown_conditions",
});

console.log("observation-screenshot-comparability ok");
