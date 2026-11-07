import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

type AnchorProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function popoverAnchor(anchor: ReactElement<AnchorProps>, open: boolean): ReactElement<AnchorProps> {
  return cloneElement(anchor, {
    "aria-haspopup": "menu",
    "aria-expanded": open ? "true" : "false",
  });
}

export function Popover({
  open,
  onClose,
  anchor,
  children,
  role = "menu",
  className,
}: {
  open: boolean;
  onClose: () => void;
  anchor: ReactNode;
  children: ReactNode;
  role?: "menu" | "dialog";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div ref={rootRef} className="mp-popover-wrap">
      {isValidElement(anchor) ? popoverAnchor(anchor as ReactElement<AnchorProps>, open) : anchor}
      {open ? (
        <div className={className} role={role}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
