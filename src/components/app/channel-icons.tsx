import { CommunityIconUpload } from "./community-icon-upload";
import { useRef, useState } from "react";
import type { Channel, Community } from "../../types/app";
import { useApp } from "../../lib/app-state";
import { EmojiPanel } from "./emoji-panel";
import { AppIcon, Dialog } from "./primitives";

export function ChannelIcon({
  channel,
  size = 20,
}: {
  channel: Channel;
  size?: number;
}) {
  return channel.icon ? (
    <span
      className="inline-flex shrink-0 items-center justify-center text-lg leading-none"
      aria-hidden="true"
    >
      {channel.icon}
      {channel.private && <AppIcon name="lock" size={12} />}
    </span>
  ) : (
    <AppIcon name={channel.private ? "lock" : "hash"} size={size} />
  );
}

export function ChannelIconField({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-(--a-border) p-3">
      <div>
        <p className="text-xs font-medium">
          Channel icon{" "}
          <span className="font-normal text-(--a-faint)">· optional</span>
        </p>
        <p className="mt-1 text-xs text-(--a-muted)">
          Choose an emoji for this channel.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <EmojiPanel
          label={value ? "Change channel icon" : "Add channel icon"}
          value={value}
          onSelect={onChange}
          disabled={disabled}
        />
        {value && (
          <button
            type="button"
            disabled={disabled}
            className="text-xs text-(--a-muted) hover:text-(--a-text)"
            onClick={() => onChange("")}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function ChannelIconEditor({
  communityId,
  channel,
  onClose,
}: {
  communityId: string;
  channel: Channel;
  onClose: () => void;
}) {
  const { createChannel } = useApp((app) => ({
    createChannel: app.createChannel,
  }));
  const [icon, setIcon] = useState(channel.icon ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  return (
    <Dialog
      title="Channel icon"
      description={`Make #${channel.name} easy to spot.`}
      onClose={() => {
        if (!busy.current) onClose();
      }}
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy.current) return;
          busy.current = true;
          setSaving(true);
          setError("");
          try {
            if (await createChannel(communityId, { ...channel, icon }))
              onClose();
            else setError("Could not save the icon. Please try again.");
          } finally {
            busy.current = false;
            setSaving(false);
          }
        }}
      >
        <ChannelIconField value={icon} onChange={setIcon} disabled={saving} />
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-(--a-orange) px-4 py-3 text-xs font-semibold text-[#462419] disabled:opacity-60"
        >
          {saving && (
            <span className="animate-spin">
              <AppIcon name="reset" size={16} />
            </span>
          )}
          {saving ? "Saving…" : "Save icon"}
        </button>
      </form>
    </Dialog>
  );
}

const communityIcons: Community["icon"][] = [
  "sun",
  "leaf",
  "coffee",
  "book",
  "game",
  "brush",
  "music",
  "code",
];
export function CommunityIconEditor({
  community,
  onClose,
}: {
  community: Community;
  onClose: () => void;
}) {
  const { setState } = useApp((app) => ({ setState: app.setState }));
  const [icon, setIcon] = useState(community.icon);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const busy = useRef(false);
  const [error, setError] = useState("");
  return (
    <Dialog
      title="Community icon"
      description="Upload an image or choose a symbol for your people."
      onClose={() => {
        if (!busy.current && !uploading) onClose();
      }}
    >
      <form
        className="space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy.current || uploading) return;
          if (community.iconUrl && icon === community.icon) {
            onClose();
            return;
          }
          if (!icon) return;
          busy.current = true;
          setSaving(true);
          setError("");
          try {
            const saved = await setState((previous) => ({
              ...previous,
              communities: previous.communities.map((item) =>
                item.id === community.id ? { ...item, icon } : item,
              ),
            }));
            if (saved) onClose();
            else setError("Could not save the icon. Please try again.");
          } finally {
            busy.current = false;
            setSaving(false);
          }
        }}
      >
        <CommunityIconUpload
          community={community}
          communityId={community.id}
          onBusyChange={setUploading}
          disabled={saving || uploading}
        />
        <p className="text-xs text-(--a-muted)">Or choose a fallback symbol</p>
        <div className="grid grid-cols-4 gap-3">
          {communityIcons.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-label={`${choice} icon`}
              aria-pressed={icon === choice}
              disabled={saving || uploading}
              onClick={() => setIcon(choice)}
              className="flex h-14 items-center justify-center rounded-lg border border-(--a-border) bg-(--a-soft) text-(--a-muted) aria-pressed:border-(--a-orange) aria-pressed:text-(--a-orange)"
            >
              <AppIcon name={choice} size={25} />
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-xs text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || uploading || (!icon && !community.iconUrl)}
          aria-busy={saving}
          className="w-full rounded-md bg-(--a-orange) px-4 py-3 text-xs font-semibold text-[#462419] disabled:opacity-60"
        >
          {saving
            ? "Saving…"
            : community.iconUrl && icon === community.icon
              ? "Done"
              : "Save icon"}
        </button>
      </form>
    </Dialog>
  );
}
