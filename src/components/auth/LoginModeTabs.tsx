"use client";

import { startTransition, useState } from "react";

type Mode = "signin" | "signup";

export function LoginModeTabs({
  initialMode,
  signupLabel,
  signinLabel,
}: {
  initialMode: Mode;
  signupLabel: string;
  signinLabel: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  function select(next: Mode) {
    startTransition(() => {
      setMode(next);
      const signup = document.getElementById("login-signup-panel");
      const signin = document.getElementById("login-signin-panel");
      if (signup instanceof HTMLElement) signup.hidden = next !== "signup";
      if (signin instanceof HTMLElement) signin.hidden = next !== "signin";
    });
  }

  return (
    <div className="flex rounded-xl border border-border p-1 text-sm font-medium">
      <button
        type="button"
        onClick={() => select("signup")}
        className={`flex-1 rounded-lg py-2 transition ${
          mode === "signup"
            ? "bg-accent text-white shadow-sm"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        {signupLabel}
      </button>
      <button
        type="button"
        onClick={() => select("signin")}
        className={`flex-1 rounded-lg py-2 transition ${
          mode === "signin"
            ? "bg-accent text-white shadow-sm"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        {signinLabel}
      </button>
    </div>
  );
}
