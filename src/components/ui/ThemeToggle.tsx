import { Sun, MoonStar } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`
        relative w-12 h-7 rounded-full border-2 transition-colors duration-300 focus:outline-none
        ${isDark ? "bg-black border-black" : "bg-white border-neutral-300"}
        flex items-center
        shadow
      `}
      style={{ minWidth: 48, minHeight: 28 }}
    >
      {/* Sun icon (left, only in light mode) */}
      <span className={`
        absolute left-1.5 top-1/2 -translate-y-1/2
        ${isDark ? "opacity-0" : "opacity-100"}
        transition-opacity duration-300
      `}>
        <Sun className="h-4 w-4 text-black" />
      </span>
      {/* Moon+stars icon (right, only in dark mode) */}
      <span className={`
        absolute right-1.5 top-1/2 -translate-y-1/2
        ${isDark ? "opacity-100" : "opacity-0"}
        transition-opacity duration-300
      `}>
        <MoonStar className="h-4 w-4 text-white" />
      </span>
      {/* Slider knob */}
      <span
        className={`
          absolute top-0.5 left-1 w-5 h-5 rounded-full shadow-md transition-transform duration-300
          ${isDark ? "translate-x-0 bg-white" : "translate-x-5 bg-black"}
        `}
      />
    </button>
  );
}
