import { useState } from "react";
import type { Community } from "../../types/app";
import {
  avatarImageSources,
  communityCoverImageSources,
} from "../../lib/media-images";
import { AppIcon } from "./primitives";

export function CommunityIcon({
  community,
  size = 25,
  cover = false,
}: {
  community: Pick<Community, "icon" | "iconUrl">;
  size?: number;
  cover?: boolean;
}) {
  const [failed, setFailed] = useState<string>();
  if (community.iconUrl && failed !== community.iconUrl)
    return (
      <img
        {...(cover
          ? communityCoverImageSources(community.iconUrl)
          : avatarImageSources(community.iconUrl, size > 32))}
        alt=""
        className="size-full rounded-[inherit] object-cover"
        decoding="async"
        draggable={false}
        onError={() => setFailed(community.iconUrl)}
      />
    );
  return <AppIcon name={community.icon} size={size} />;
}
