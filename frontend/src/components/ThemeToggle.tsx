"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * ThemeToggle — small, accessible Sun/Moon button for the Navbar.
 *
 * Layout-shift prevention:
 *   - Fixed h-8 w-8 dimensions on both the placeholder and the live button.
 *   - Placeholder renders server-side (no theme class yet) and matches button dimensions exactly.
 *   - `mounted` guard prevents hydration mismatch from resolvedTheme being undefined on SSR.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fixed-size invisible placeholder — same size as the real button.
  // Using visibility:hidden (not display:none) so space is reserved in layout.
  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className="h-8 w-8 flex-shrink-0 rounded-md border border-transparent"
        style={{ visibility: "hidden" }}
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={[
        "h-8 w-8 flex-shrink-0",          // matches placeholder — prevents layout shift
        "flex items-center justify-center",
        "rounded-md",
        "text-slate-500 dark:text-slate-400",
        "bg-slate-100 dark:bg-slate-800",
        "border border-slate-200 dark:border-slate-700",
        "hover:bg-slate-200 dark:hover:bg-slate-700",
        "hover:text-slate-700 dark:hover:text-slate-200",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
      ].join(" ")}
    >
      {isDark
        ? <Sun  size={14} strokeWidth={2} />
        : <Moon size={14} strokeWidth={2} />
      }
    </button>
  );
}
