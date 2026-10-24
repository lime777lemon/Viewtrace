/**
 * Menu and modal open when the same panel becomes visible, or a dialog appears and is visible.
 * ARIA alone is not an open. No rendered open stays no_change_observed.
 */
export const TOGGLE_STATE_SOURCE = `function isPanelVisible(panel) {
  if (!panel || !panel.exists) return false;
  if (panel.display === "none" || panel.visibility === "hidden") return false;
  if (!(Number(panel.opacity) > 0.05)) return false;
  if (!(Number(panel.w) > 0) || !(Number(panel.h) > 0)) return false;
  if (panel.tag === "DIALOG" && panel.open !== "1") return false;
  return true;
}
function isFullyOpen(panel) {
  if (!isPanelVisible(panel)) return false;
  return Number(panel.opacity) >= 0.9;
}
function panelShift(before, after) {
  if (!isPanelVisible(after)) return false;
  if (!before || !before.exists || !isPanelVisible(before)) return true;
  return false;
}
function openedPair(before, after) {
  var panels = after && after.panels ? after.panels : [];
  var prior = before && before.panels ? before.panels : [];
  var i;
  var j;
  var next;
  var prev;
  for (i = 0; i < panels.length; i++) {
    next = panels[i];
    if (!isPanelVisible(next)) continue;
    prev = null;
    for (j = 0; j < prior.length; j++) {
      if (prior[j] && prior[j].selector && prior[j].selector === next.selector) prev = prior[j];
    }
    if (!prev) {
      var keyed = next.selector && next.selector.charAt(0) === "#";
      var dialogish = next.modal === "true" || next.open === "1" || next.role === "dialog" || next.role === "menu";
      if (!keyed && !dialogish) continue;
    }
    if (panelShift(prev, next)) {
      return {
        before: prev || { exists: false, visible: false, selector: next.selector, opacity: "0", visibility: "hidden", display: "none", w: 0, h: 0, open: "0" },
        after: next,
      };
    }
  }
  return null;
}
function toggleClosed(openedPanel, later) {
  if (!openedPanel || !openedPanel.selector) return false;
  var panels = later && later.panels ? later.panels : [];
  var found = null;
  var i;
  for (i = 0; i < panels.length; i++) {
    if (panels[i] && panels[i].selector === openedPanel.selector) found = panels[i];
  }
  if (!found || !found.exists || !isPanelVisible(found)) return true;
  return false;
}
function packToggle(trigger, panel) {
  var src = panel && panel.exists ? panel : null;
  return {
    key: (src && src.selector) || (trigger && trigger.selector) || "",
    exists: Boolean(src),
    visibility: isPanelVisible(src) ? "visible" : "hidden",
    opacity: src && src.opacity ? String(src.opacity) : "0",
    display: src && src.display ? src.display : "none",
    expanded: trigger && trigger.expanded != null ? trigger.expanded : null,
    w: src ? src.w || 0 : 0,
    h: src ? Number(src.h) || 0 : 0,
  };
}
`;
