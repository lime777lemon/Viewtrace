"use client";

import { useState } from "react";

export function LoginPasswordVisibilityToggle({
  inputIds,
  showLabel,
  hideLabel,
}: {
  inputIds: string[];
  showLabel: string;
  hideLabel: string;
}) {
  const [show, setShow] = useState(false);

  function toggle() {
    const next = !show;
    setShow(next);
    for (const id of inputIds) {
      const el = document.getElementById(id);
      if (el instanceof HTMLInputElement) {
        el.type = next ? "text" : "password";
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-xs font-medium text-accent hover:text-accent-hover"
    >
      {show ? hideLabel : showLabel}
    </button>
  );
}
