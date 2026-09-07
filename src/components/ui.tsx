import { avatarImageSources } from "../lib/media-images";
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
      aria-label="Drocsid home"
      data-ui={`logo ${light ? "logo-light" : ""}`}
      className="inline-flex items-center gap-2 text-[29px] leading-none font-extrabold tracking-[-1.5px] w-fit max-[580px]:text-[26px]"
    >
      <LogoMark />
      <span>
        drocsid
        <span data-ui="logo-period" className="text-orange">
          .
        </span>
      </span>
    </Link>
  );
}

export function LogoMark() {
  return (
    <img
      src="/logo.png"
      data-ui="logo-mark"
      className="block shrink-0 object-contain max-[580px]:size-7.25"
      width="33"
      height="33"
      alt=""
      aria-hidden="true"
    />
  );
}

export function Avatar({
  name,
  color = "peach",
  small = false,
  src,
  large = false,
}: {
  name: string;
  color?: string;
  small?: boolean;
  src?: string;
  large?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <span
      data-ui={`avatar avatar-${color} ${small ? "avatar-small" : ""}`}
      className="inline-flex items-center justify-center shrink-0 rounded-[10px] text-[13px] font-bold text-[#875442] bg-[#efd9cc] size-7.75 data-[ui~=avatar-purple]:bg-[#e6ddf0] data-[ui~=avatar-purple]:text-[#83718f] data-[ui~=avatar-green]:bg-[#e1e8d1] data-[ui~=avatar-green]:text-[#6c7c50] data-[ui~=avatar-yellow]:bg-[#f2e7c7] data-[ui~=avatar-yellow]:text-[#a18449] data-[ui~=avatar-blue]:bg-[#dbe7e9] data-[ui~=avatar-blue]:text-[#597e88] data-[ui~=avatar-small]:text-[10px] data-[ui~=avatar-small]:rounded-lg data-[ui~=avatar-small]:size-6 [&>img]:object-cover [&>img]:rounded-[inherit] [&>img]:block [&>img]:size-full"
      aria-hidden="true"
    >
      {src && src !== failedSrc ? (
        <img
          {...avatarImageSources(src, large)}
          decoding="async"
          alt=""
          onError={() => setFailedSrc(src)}
        />
      ) : (
        name.slice(0, 1)
      )}
    </span>
  );
}
