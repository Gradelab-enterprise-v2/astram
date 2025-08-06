import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AstramLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  textClassName?: string;
}

export function AstramLogo({ 
  className, 
  showText = false, 
  size = "md",
  textClassName 
}: AstramLogoProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Size mappings
  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10"
  };

  // Listen for theme changes
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    };

    // Set initial theme
    updateTheme();

    // Create a mutation observer to watch for class changes on documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <img
          src="https://astramtech.com/static/media/logo.e952f2da044d9188dcfb.webp"
          alt="Astram Logo"
          className={cn("w-auto object-contain", sizeClasses[size])}
        />
      </div>
      {showText && (
        <span className={cn(
          "font-bold", 
          theme === "dark" ? "text-white" : "text-gradelab-black",
          textClassName
        )}>
          Astram
        </span>
      )}
    </div>
  );
}