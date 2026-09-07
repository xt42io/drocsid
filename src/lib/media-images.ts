export type ImageVariant =
  "avatar-40" | "avatar-80" | "avatar-160" | "chat-420" | "chat-840";

// Only stored app images have a transformation endpoint. Local upload previews
// and external profile images must keep their original URL.
export function mediaImageUrl(src: string, variant: ImageVariant) {
  const [path] = src.split(/[?#]/);
  const kind = variant.startsWith("avatar-")
    ? "(?:avatars|community-icons)"
    : "attachments";
  if (!new RegExp(`^/api/${kind}/[^/]+$`).test(path)) return src;
  const url = new URL(src, "http://drocsid.local");
  url.searchParams.set("variant", variant);
  return `${url.pathname}${url.search}${url.hash}`;
}

export function avatarImageSources(src: string, large = false) {
  const normal = mediaImageUrl(src, large ? "avatar-80" : "avatar-40");
  return {
    src: normal,
    srcSet:
      normal === src
        ? undefined
        : `${normal} 1x, ${mediaImageUrl(src, large ? "avatar-160" : "avatar-80")} 2x`,
  };
}
