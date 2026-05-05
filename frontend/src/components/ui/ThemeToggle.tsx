import { useRef, useState, useEffect } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useThemeStore, type Theme } from "../../stores/themeStore";
import { cn } from "../../lib/utils";

const OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "light",  icon: <Sun    size={12}/>, label: "Light"  },
  { value: "dark",   icon: <Moon   size={12}/>, label: "Dark"   },
  { value: "system", icon: <Monitor size={12}/>, label: "System" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const cur = OPTIONS.find(o => o.value === theme)!;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold border border-[rgb(var(--border))] bg-[rgb(var(--card-bg))] text-ink2 hover:bg-[rgb(var(--page-bg))] hover:text-ink transition-colors">
        {cur.icon}
        <span className="hidden sm:block">{cur.label}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 bg-[rgb(var(--card-bg))] border border-[rgb(var(--border))] rounded-xl shadow-card-lg w-32 py-1 overflow-hidden slide-in">
          {OPTIONS.map(o => (
            <button key={o.value} onClick={() => { setTheme(o.value); setOpen(false); }}
              className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-[rgb(var(--page-bg))]", theme===o.value ? "text-blue-500 font-bold" : "text-ink2")}>
              {o.icon}{o.label}{theme===o.value && <Check size={10} className="ml-auto"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
