import { useState, type ComponentProps } from "react";
import { Link } from "@tanstack/react-router";
import { HugeiconsIcon } from "@hugeicons/react";

export function Icon(props: ComponentProps<typeof HugeiconsIcon>) {
  return (
    <HugeiconsIcon size={20} strokeWidth={1.7} aria-hidden="true" {...props} />
  );
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link
      to="/"
      aria-label="drocsid home"
      className={`logo ${light ? "logo-light" : ""}`}
    >
      <LogoMark />
      <span>
        drocsid<span className="logo-period">.</span>
      </span>
    </Link>
  );
}

export function LogoMark() {
  return (
    <svg
      className="logo-mark"
      width="33"
      height="33"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 7h28v23H17L6 36V7Z" fill="currentColor" />
      <rect
        x="13"
        y="14"
        width="4"
        height="8"
        rx="2"
        fill="var(--logo-eyes, #f8f7f4)"
      />
      <rect
        x="24"
        y="14"
        width="4"
        height="8"
        rx="2"
        fill="var(--logo-eyes, #f8f7f4)"
      />
    </svg>
  );
}

export function Avatar({
  name,
  color = "peach",
  small = false,
  src,
}: {
  name: string;
  color?: string;
  small?: boolean;
  src?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <span
      className={`avatar avatar-${color} ${small ? "avatar-small" : ""}`}
      aria-hidden="true"
    >
      {src && src !== failedSrc ? (
        <img src={src} alt="" onError={() => setFailedSrc(src)} />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
