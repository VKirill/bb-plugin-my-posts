import type { ReactElement, ReactNode } from "react";
import type { Platform } from "../../shared/model";

function Svg({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden={label === "" ? true : undefined} aria-label={label === "" ? undefined : label} fill="none" stroke="currentColor" strokeWidth="1.5">
      {children}
    </svg>
  );
}

const ICONS: Record<Platform | "all", (label: string) => ReactElement> = {
  telegram: (label) => (
    <Svg label={label}>
      <path d="M2.5 8.2 13 3.5 11.2 13 8 9.8 5.2 11.4 6.1 8.6z" strokeLinejoin="round" />
    </Svg>
  ),
  x: (label) => (
    <Svg label={label}>
      <path d="M3.2 3.2 12.8 12.8M12.8 3.2 3.2 12.8" />
    </Svg>
  ),
  dzen: (label) => (
    <Svg label={label}>
      <path d="M8 2.5 9.7 6.3 13.5 8 9.7 9.7 8 13.5 6.3 9.7 2.5 8 6.3 6.3z" strokeLinejoin="round" />
    </Svg>
  ),
  vk: (label) => (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden={label === "" ? true : undefined} aria-label={label === "" ? undefined : label} fill="currentColor">
      <path d="M2.4 5.2h1.7c.1 2.1 1 3.3 1.7 3.9.3.2.4 0 .4-.4V5.2h1.6v2.6c0 .6.3.8.6.4.8-.9 1.7-2.3 2.2-3H12c-.7 1.2-1.7 2.4-2.5 3.1-.4.3-.3.5 0 .8.8.7 1.8 1.6 2.5 2.6h-1.9c-.6-.8-1.4-1.6-2-2.1-.3-.3-.6-.2-.6.3v1.8H6.2V9.2c0-.5-.2-.7-.5-.4-.8.8-1.8 2.2-2.1 3h-1.8c.6-1.3 1.8-2.8 2.6-3.6.3-.3.2-.5-.1-.8-.8-.7-1.8-2-2-2.2z" />
    </svg>
  ),
  all: (label) => (
    <Svg label={label}>
      <path d="M2.5 5h11M2.5 8h11M2.5 11h7" />
    </Svg>
  ),
};

export function PlatformIcon({ platform, label = "" }: { platform: Platform | "all"; label?: string }) {
  return ICONS[platform](label);
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </svg>
  );
}

export function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M4.5 6.5 8 10l3.5-3.5" />
    </svg>
  );
}

export function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12.5 8A4.5 4.5 0 1 1 11 4.2" />
      <path d="M11 2.5v2.2h2.2" />
    </svg>
  );
}
