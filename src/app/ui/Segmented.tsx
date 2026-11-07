import { type CSSProperties, type ReactNode } from "react";

export type SegItem<T extends string> = { id: T; label: ReactNode; disabled?: boolean };

type SegProps<T extends string> = {
  items: SegItem<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  size?: "sm";
};

function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
  size,
  kind,
}: SegProps<T> & { kind: "tabs" | "toggle" }) {
  const index = items.findIndex((item) => item.id === value);
  const isTabs = kind === "tabs";
  const vars =
    index >= 0
      ? ({ ["--mp-seg-n"]: items.length, ["--mp-seg-i"]: index } as CSSProperties)
      : undefined;
  return (
    <div
      className={`mp-seg${size === "sm" ? " mp-seg-sm" : ""}`}
      role={isTabs ? "tablist" : "group"}
      aria-label={label}
      style={vars}
    >
      {index >= 0 ? <span className="mp-seg-thumb" aria-hidden="true" /> : null}
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            className={`mp-seg-item mp-btn mp-ghost${size === "sm" ? " sm" : ""}`}
            role={isTabs ? "tab" : undefined}
            aria-selected={isTabs ? selected : undefined}
            aria-pressed={isTabs ? undefined : selected}
            data-state={isTabs && selected ? "active" : undefined}
            tabIndex={isTabs ? (selected ? 0 : -1) : undefined}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>(props: SegProps<T>) {
  return <Segmented {...props} kind="tabs" />;
}

export function Toggle<T extends string>(props: SegProps<T>) {
  return <Segmented {...props} kind="toggle" />;
}

export function TabPanel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="mp-tab-host">
      <div className="mp-tab-panel" key={id}>
        {children}
      </div>
    </div>
  );
}
