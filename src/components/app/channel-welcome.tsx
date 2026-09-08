import { CommunityIcon } from "./community-icon";
import type { Community } from "../../types/app";
import { AppIcon } from "./primitives";
import type { IconName } from "./primitives";

export function ChannelWelcome({
  community,
  onInvite,
  onIcon,
  onCompose,
}: {
  community: Community;
  onInvite: () => void;
  onIcon: () => void;
  onCompose: () => void;
}) {
  const actions: {
    title: string;
    detail: string;
    icon: IconName;
    onClick: () => void;
  }[] = [
    {
      title: "Invite your people",
      detail: "Share a link and bring everyone together.",
      icon: "userAdd",
      onClick: onInvite,
    },
    ...(!community.icon && !community.iconUrl
      ? [
          {
            title: "Add an icon",
            detail: "Give your community a face of its own.",
            icon: "brush" as const,
            onClick: onIcon,
          },
        ]
      : []),
    {
      title: "Send your first message",
      detail: "Start the conversation in #general.",
      icon: "send",
      onClick: onCompose,
    },
  ];
  return (
    <section
      data-ui="channel-welcome"
      className="mx-auto flex min-h-[min(620px,calc(100dvh-240px))] w-full max-w-145 flex-col justify-center px-6 py-12 sm:px-9"
    >
      <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-(--a-soft) text-(--a-orange)">
        <CommunityIcon community={community} size={32} />
      </span>
      <h2 className="text-3xl font-semibold tracking-tight text-(--a-text) sm:text-4xl">
        Welcome to
        <br />
        {community.name}.
      </h2>
      <p className="mt-4 text-sm leading-6 text-(--a-muted)">
        Your community starts here. A few small steps to get everyone talking.
      </p>
      <div className="mt-8 flex flex-col gap-3">
        {actions.map((action) => (
          <button
            type="button"
            key={action.title}
            onClick={action.onClick}
            className="group flex w-full items-center gap-4 rounded-xl border border-(--a-border) bg-(--a-soft) p-4 text-left transition-colors hover:border-(--a-muted) hover:bg-(--a-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--a-orange)"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--a-surface) text-(--a-orange)">
              <AppIcon name={action.icon} size={22} />
            </span>
            <span className="flex-1">
              <strong className="block text-sm font-semibold text-(--a-text)">
                {action.title}
              </strong>
              <span className="mt-1 block text-xs leading-5 text-(--a-muted)">
                {action.detail}
              </span>
            </span>
            <span className="text-(--a-faint) transition-transform group-hover:translate-x-1">
              <AppIcon name="right" size={19} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
