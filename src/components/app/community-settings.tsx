import { CommunityIcon } from "./community-icon";
import { CommunityIconUpload } from "./community-icon-upload";
import { ChannelIcon } from "./channel-icons";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { getChannelCategories, getChannelGroup } from "../../lib/channels";
import {
  canManageCommunity,
  canManageCommunityMember,
} from "../../lib/community-permissions";
import {
  AppIcon,
  EmptyState,
  IconButton,
  PageHeading,
  PersonAvatar,
  Toggle,
} from "./primitives";

const communityColors = ["peach", "green", "yellow", "purple", "blue"] as const;

export function CommunitySettings({ communityId }: { communityId: string }) {
  const { state, setState, setModal, notify, command } = useApp();
  const navigate = useNavigate();
  const community = state.communities.find((c) => c.id === communityId);
  const canManage = canManageCommunity(community);
  const [tab, setTab] = useState("overview");
  const [name, setName] = useState(community?.name ?? "");
  const [description, setDescription] = useState(community?.description ?? "");
  const [discoverable, setDiscoverable] = useState(
    community?.discoverable ?? true,
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    setName(community?.name ?? "");
    setDescription(community?.description ?? "");
    setDiscoverable(community?.discoverable ?? true);
  }, [community?.name, community?.description, community?.discoverable]);
  if (!community || !community.joined || !canManage)
    return (
      <EmptyState
        icon="settings"
        title="This corner isn’t available."
        description="Only community owners and admins can open these settings."
      >
        <Link
          to="/app"
          data-ui="a-button primary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
        >
          Back to your corner
        </Link>
      </EmptyState>
    );
  return (
    <div
      data-ui="a-page a-community-settings"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 [&_[data-ui~=a-page-heading]>[data-ui~=a-button]]:text-[10px]! [&_[data-ui~=a-page-heading]_h1]:text-[32px] **:data-[ui~=a-settings-section-bar]:flex-wrap min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[1250px]:**:data-[ui~=a-page-heading]:[align-items:start] max-[1250px]:[&_[data-ui~=a-page-heading]_h1]:text-[28px] max-[1250px]:[&_[data-ui~=a-page-heading]>[data-ui~=a-button]]:whitespace-normal max-[1250px]:[&_[data-ui~=a-page-heading]>[data-ui~=a-button]]:max-w-35 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[760px]:[&_[data-ui~=a-page-heading]_h1]:text-[29px] max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5 max-[480px]:[&_[data-ui~=a-page-heading]_h1]:text-[29px] max-[480px]:[&_[data-ui~=a-page-heading]>[data-ui~=a-button]]:max-w-none max-[480px]:[&_[data-ui~=a-page-heading]>[data-ui~=a-button]]:text-[11px]!"
    >
      <PageHeading
        title="A place that feels like yours."
        description={`A few things behind the scenes of ${community.name}.`}
      >
        <Link
          to="/app/community/$communityId/$channelId"
          params={{
            communityId,
            channelId: community.channels[0]?.id ?? "general",
          }}
          data-ui="a-button secondary"
          className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
        >
          <AppIcon name="left" size={17} />
          Back to the conversation
        </Link>
      </PageHeading>
      <div
        data-ui="a-tabs a-inbox-tabs"
        className="flex gap-4.25 items-center min-w-0 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) mb-6.25 [&>button]:relative [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:gap-1.5 [&>button]:min-h-11.25 [&>button]:bg-transparent [&>button]:pt-0 [&>button]:pb-3.25 [&>button]:px-0.75 [&>button]:text-(--a-muted) [&>button]:text-[12px] [&>button]:whitespace-nowrap [&>button[data-ui~=active]]:text-(--a-text) [&>button[data-ui~=active]]:font-semibold [&>button[data-ui~=active]::after]:[content:''] [&>button[data-ui~=active]::after]:absolute [&>button[data-ui~=active]::after]:-bottom-px [&>button[data-ui~=active]::after]:left-0 [&>button[data-ui~=active]::after]:right-0 [&>button[data-ui~=active]::after]:h-0.5 [&>button[data-ui~=active]::after]:bg-(--a-orange) [&>button>span]:bg-(--a-soft) [&>button>span]:text-(--a-muted) [&>button>span]:py-px [&>button>span]:px-1.25 [&>button>span]:rounded-sm [&>button>span]:text-[10px] max-[1250px]:gap-3 max-[1250px]:[&>button]:text-[11px] max-[760px]:gap-5.5 max-[760px]:[&>button]:text-[12px] max-[480px]:gap-4 max-[480px]:overflow-x-auto max-[480px]:scrollbar-none max-[480px]:[&>button]:text-[11px] max-[480px]:[&>button]:shrink-0 max-[480px]:[&>button>span]:text-[9px]"
      >
        {["overview", "channels", "members"].map((item) => (
          <button
            key={item}
            data-ui={tab === item ? "active" : ""}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>
      {tab === "overview" && (
        <div
          data-ui="a-community-overview"
          className="grid grid-cols-[minmax(0,1fr)_265px] gap-11 pt-1.5 [&_[data-ui~=a-form]>[data-ui~=a-button]]:[align-self:start] [&_[data-ui~=a-form]>[data-ui~=a-button]]:mt-1.75 max-[1250px]:grid-cols-[minmax(0,1fr)_220px] max-[1250px]:gap-6.5 max-[1050px]:grid-cols-[1fr] max-[760px]:gap-7"
        >
          <form
            data-ui="a-form"
            className="flex flex-col gap-5 [&>label]:block [&>label]:font-[550] [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px]"
            onSubmit={async (event) => {
              event.preventDefault();
              if (name.trim().length < 2) {
                setError(
                  "Your community needs a name with at least 2 characters.",
                );
                return;
              }
              const saved = await setState((previous) => ({
                ...previous,
                communities: previous.communities.map((c) =>
                  c.id === communityId
                    ? {
                        ...c,
                        name: name.trim(),
                        description: description.trim(),
                        discoverable,
                      }
                    : c,
                ),
              }));
              if (!saved) return;
              notify("Your corner is looking good. Changes saved.");
              setError("");
            }}
          >
            <div
              data-ui="a-community-brand"
              className="flex items-center gap-4.25 mb-1.5 **:data-[ui~=a-community-icon]:rounded-[21px] **:data-[ui~=a-community-icon]:size-17 [&_h2]:text-[22px] [&_p]:text-[11px] [&_p]:mt-1.5 [&_p]:text-(--a-muted) max-[480px]:[&_h2]:text-[21px] max-[480px]:**:data-[ui~=a-community-icon]:rounded-[18px] max-[480px]:**:data-[ui~=a-community-icon]:size-14.5"
            >
              <span
                data-ui={`a-community-icon tone-${community.color}`}
                className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] size-11.5 data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] hover:transform-[translateY(-2px)] hover:rounded-xl max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
              >
                <CommunityIcon community={community} size={38} />
              </span>
              <div>
                <h2>{community.name}</h2>
                <p>Made of people, not algorithms.</p>
              </div>
            </div>
            <CommunityIconUpload
              community={community}
              communityId={community.id}
            />
            <label>
              Community name
              <input
                value={name}
                maxLength={40}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <label>
              A little about this place
              <textarea
                value={description}
                maxLength={250}
                rows={4}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <fieldset className="border-0 p-0">
              <legend className="mb-2.5 text-xs/normal font-[550]">
                Your corner’s color
              </legend>
              <div className="flex flex-wrap items-center gap-2.5">
                {communityColors.map((color) => {
                  const selected = community.color === color;

                  return (
                    <button
                      key={color}
                      type="button"
                      data-ui={`color-swatch tone-${color}${selected ? " selected" : ""}`}
                      aria-label={`${color[0].toUpperCase()}${color.slice(1)}`}
                      aria-pressed={selected}
                      className="size-10 rounded-full border-2 border-transparent bg-transparent p-1 transition-[transform,border-color] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--a-orange) data-[ui~=selected]:border-(--a-text)"
                      onClick={() =>
                        setState((previous) => ({
                          ...previous,
                          communities: previous.communities.map((c) =>
                            c.id === communityId ? { ...c, color } : c,
                          ),
                        }))
                      }
                    >
                      <span
                        aria-hidden="true"
                        className="flex size-full items-center justify-center rounded-full data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#5f713e] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#8c733e] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#79648b] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#567984]"
                        data-ui={`tone-${color}`}
                      >
                        {selected && <AppIcon name="check" size={15} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <Toggle
              checked={discoverable}
              onChange={setDiscoverable}
              label="Show in Discover"
              description="When this is off, members can still open the community, and new people can join through a valid invite link."
            />
            {error && (
              <p
                role="alert"
                data-ui="a-form-error"
                className="text-[#b56345] text-[12px] leading-[1.6]"
              >
                {error}
              </p>
            )}
            <button
              data-ui="a-button primary"
              className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
              type="submit"
            >
              Save changes <AppIcon name="check" size={17} />
            </button>
          </form>
          <aside
            data-ui="a-community-settings-note"
            className="[align-self:start] mt-1 bg-(--a-soft) border border-solid border-(--a-border) p-5.75 rounded-[9px] text-(--a-green) [&>svg]:mb-4.5 [&_h3]:text-[24px] [&_h3]:leading-[1.15] [&_h3]:font-medium [&_h3]:tracking-[-0.8px] [&_p]:text-[12px] [&_p]:leading-[1.85] [&_p]:text-(--a-muted) [&_p]:my-[17px_21px] **:data-[ui~=danger-text]:text-[11px] max-[1050px]:max-w-none max-[1050px]:[&_h3_br]:hidden max-[1050px]:*:data-[ui~=a-button]:w-auto"
          >
            <AppIcon name="leaf" size={32} />
            <h3>
              Good communities
              <br />
              start small.
            </h3>
            <p>
              A clear name, a little context, and people who care. That’s a
              pretty good beginning.
            </p>
            <button
              data-ui="a-button secondary full"
              className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=full]:w-full [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
              onClick={() => setModal({ type: "invite", communityId })}
            >
              Invite your people <AppIcon name="userAdd" size={17} />
            </button>
            {community.memberRoles?.you !== "Owner" && (
              <>
                <div
                  data-ui="a-settings-divider"
                  className="h-px bg-(--a-border) my-6.75"
                />
                <button
                  data-ui="a-text-link danger-text"
                  className="text-[#b8654b]! inline-flex items-center gap-1.75 text-[12px] font-[550] bg-transparent p-0 hover:text-(--a-orange)"
                  onClick={() =>
                    setModal({
                      type: "confirm",
                      title: `Leave ${community.name}?`,
                      description: community.discoverable
                        ? "You will lose access to this community. You can rejoin from Discover."
                        : "You will lose access to this community. You’ll need a valid invite link to rejoin.",
                      label: "Leave community",
                      action: () => {
                        setState((previous) => ({
                          ...previous,
                          communities: previous.communities.map((c) =>
                            c.id === communityId ? { ...c, joined: false } : c,
                          ),
                        }));
                        void navigate({ to: "/app/discover" });
                        notify("You’ve left this corner.");
                      },
                    })
                  }
                >
                  Leave this community <AppIcon name="logout" size={16} />
                </button>
              </>
            )}
          </aside>
        </div>
      )}
      {tab === "channels" && (
        <>
          <div
            data-ui="a-settings-section-bar"
            className="flex items-center justify-between gap-5 mb-5.75 [&_h2]:text-[21px] [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:mt-1.75 max-[1050px]:[align-items:start] max-[1050px]:[&_h2]:text-[20px] max-[1050px]:*:data-[ui~=a-button]:text-[10px]! max-[760px]:[&_h2]:text-[22px] max-[480px]:flex-col max-[480px]:[align-items:start] max-[480px]:gap-4 max-[480px]:[&_h2]:text-[23px]"
          >
            <div>
              <h2>A room for every conversation.</h2>
              <p>
                {community.channels.length} text channels ·{" "}
                {getChannelCategories(community).length} categories
              </p>
            </div>
            <div
              data-ui="a-channel-settings-actions"
              className="flex flex-wrap gap-2.25"
            >
              <button
                data-ui="a-button secondary"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                onClick={() =>
                  setModal({ type: "create-category", communityId })
                }
              >
                <AppIcon name="folder" size={17} />
                Create category
              </button>
              <button
                data-ui="a-button primary"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
                onClick={() =>
                  setModal({ type: "create-channel", communityId })
                }
              >
                <AppIcon name="plus" size={17} />
                Create channel
              </button>
            </div>
          </div>
          {[
            ...(community.channels.some((channel) => !getChannelGroup(channel))
              ? [""]
              : []),
            ...getChannelCategories(community),
          ].map((group) => (
            <section
              data-ui={group ? "a-managed-category" : "a-managed-channels-only"}
              className="mb-5.5"
              key={group || "uncategorized"}
              aria-label={group || "Channels without a category"}
            >
              {group && (
                <header
                  data-ui="a-managed-category-header"
                  className="flex items-center gap-2.5 py-2.75 px-3.5 border border-solid border-(--a-border) rounded-[7px] bg-(--a-soft) text-(--a-muted) [&_h3]:flex-1 [&_h3]:min-w-0 [&_h3]:wrap-anywhere [&_h3]:text-[12px] [&_h3]:tracking-[0.6px] [&_h3]:uppercase [&>svg]:shrink-0 [&>button]:shrink-0"
                >
                  <AppIcon name="folder" size={18} />
                  <h3>{group}</h3>
                  <IconButton
                    name="plus"
                    label={`Create channel in ${group}`}
                    onClick={() =>
                      setModal({ type: "create-channel", communityId, group })
                    }
                  />
                </header>
              )}
              {!community.channels.some(
                (channel) => getChannelGroup(channel) === group,
              ) && (
                <div
                  data-ui="a-managed-category-empty"
                  className="flex flex-wrap items-center justify-between gap-3 py-4.5 px-3.75 text-(--a-muted) text-[12px]"
                >
                  <p>No channels yet.</p>
                  <button
                    data-ui="a-text-link"
                    className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
                    onClick={() =>
                      setModal({ type: "create-channel", communityId, group })
                    }
                  >
                    Add a channel <AppIcon name="plus" size={15} />
                  </button>
                </div>
              )}
              <div
                data-ui="a-managed-channels"
                className="[&_strong]:wrap-anywhere [&_strong]:block [&_strong]:font-[550] [&_strong]:text-[13px] [&>div]:flex [&>div]:items-center [&>div]:gap-3.75 [&>div]:py-4.75 [&>div]:px-0.5 [&>div]:[border-bottom-width:1px] [&>div]:[border-bottom-style:solid] [&>div]:border-b-(--a-border) [&>div>span:nth-child(2)]:flex-1 [&>div>span:nth-child(2)]:min-w-0 [&_small]:text-[9px] [&_small]:text-(--a-faint) [&_small]:font-normal [&_small]:ml-3.5 [&_p]:text-[11px] [&_p]:leading-[1.6] [&_p]:text-(--a-muted) [&_p]:mt-1.25 max-[1050px]:[&_small]:hidden max-[760px]:[&_p]:text-[12px] max-[480px]:[&>div]:gap-2.25 max-[480px]:**:data-[ui~=a-icon-button]:w-7 max-[480px]:[&_p]:text-[10px] max-[480px]:[&_strong]:text-[12px]"
              >
                {community.channels
                  .filter((channel) => getChannelGroup(channel) === group)
                  .map((channel) => (
                    <div key={channel.id}>
                      <span
                        data-ui="a-channel-square"
                        className="flex items-center justify-center border border-solid border-(--a-border) text-(--a-muted) rounded-[10px] bg-(--a-soft) shrink-0 size-9.25"
                      >
                        <ChannelIcon channel={channel} size={22} />
                      </span>
                      <span>
                        <strong>{channel.name}</strong>
                        <p>{channel.description}</p>
                      </span>
                      <Link
                        to="/app/community/$communityId/$channelId"
                        params={{ communityId, channelId: channel.id }}
                        data-ui="a-icon-button"
                        className="inline-flex items-center justify-center shrink-0 p-0 rounded-md text-(--a-muted) bg-transparent [transition:background_0.15s,color_0.15s] size-8 hover:bg-(--a-hover) hover:text-(--a-green)"
                        aria-label={`Open ${channel.name}`}
                        title="Open channel"
                      >
                        <AppIcon name="external" size={18} />
                      </Link>
                      <IconButton
                        name="trash"
                        label={`Delete ${channel.name}`}
                        disabled={community.channels.length === 1}
                        onClick={() =>
                          setModal({
                            type: "confirm",
                            title: `Delete #${channel.name}?`,
                            description:
                              "This channel and its messages will be deleted for everyone. This can’t be undone.",
                            label: "Delete channel",
                            managedCommunityId: communityId,
                            action: () => {
                              setState((previous) => ({
                                ...previous,
                                communities: previous.communities.map((c) =>
                                  c.id === communityId
                                    ? {
                                        ...c,
                                        channelCategories:
                                          getChannelCategories(c),
                                        channels: c.channels.filter(
                                          (ch) => ch.id !== channel.id,
                                        ),
                                      }
                                    : c,
                                ),
                                messages: previous.messages.filter(
                                  (m) =>
                                    m.conversation !==
                                    `${communityId}:${channel.id}`,
                                ),
                              }));
                              notify("Channel deleted.");
                            },
                          })
                        }
                      />
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </>
      )}
      {tab === "members" && (
        <>
          <div
            data-ui="a-settings-section-bar"
            className="flex items-center justify-between gap-5 mb-5.75 [&_h2]:text-[21px] [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:mt-1.75 max-[1050px]:[align-items:start] max-[1050px]:[&_h2]:text-[20px] max-[1050px]:*:data-[ui~=a-button]:text-[10px]! max-[760px]:[&_h2]:text-[22px] max-[480px]:flex-col max-[480px]:[align-items:start] max-[480px]:gap-4 max-[480px]:[&_h2]:text-[23px]"
          >
            <div>
              <h2>The people who make this place.</h2>
              <p>Your community members.</p>
            </div>
            <button
              data-ui="a-button primary"
              className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
              onClick={() => setModal({ type: "invite", communityId })}
            >
              Invite a friend <AppIcon name="userAdd" size={17} />
            </button>
          </div>
          <label
            data-ui="a-search-field a-wide-search"
            className="flex items-center gap-2.25 bg-(--a-surface) border border-solid border-(--a-border) rounded-[7px] min-h-10.75 py-0 px-3 text-(--a-muted) mb-6.5 max-w-150 [&_input]:w-full [&_input]:py-2.75 [&_input]:px-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:border-none [&_input]:border-[currentColor] [&_input]:rounded-none [&_input]:text-[12px] [&_input]:shadow-none! focus-within:border-[#b8c5a3] [[data-ui~=theme-dark]_&:focus-within]:border-[#888888] [[data-ui~=theme-dark]_&:focus-within]:shadow-[0_0_0_3px_#ffffff08] max-[760px]:[[data-ui~=workspace]_&_input]:text-[16px] max-[760px]:[[data-ui~=workspace]_&_input::placeholder]:text-[12px]"
          >
            <AppIcon name="search" size={18} />
            <input
              placeholder="Find a member"
              aria-label="Find a member"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {[state.profile, ...state.people]
            .filter(
              (person) =>
                !community.memberIds || community.memberIds.includes(person.id),
            )
            .filter((p) =>
              `${p.name} ${p.handle}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((person) => (
              <div
                data-ui="a-community-member-row"
                className="flex items-center gap-3.25 py-4.5 px-1.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) [&>span:nth-child(2)]:flex-1 [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-[550] [&_small]:block [&_small]:text-[11px] [&_small]:text-(--a-faint) [&_small]:mt-1.25 max-[480px]:**:data-[ui~=a-role-tag]:text-[8px] max-[480px]:**:data-[ui~=a-role-tag]:py-0.75 max-[480px]:**:data-[ui~=a-role-tag]:px-1.25 max-[480px]:gap-2.25 max-[480px]:[&_strong]:text-[12px] max-[480px]:[&_small]:text-[10px] max-[480px]:*:data-[ui~=a-icon-button]:w-6"
                key={person.id}
              >
                <PersonAvatar person={person} presence />
                <span>
                  <strong>{person.name}</strong>
                  {person.handle && <small>@{person.handle}</small>}
                </span>
                <span
                  data-ui="a-role-tag"
                  className="inline-block py-0.75 px-1.75 border border-solid border-(--a-border) rounded-sm bg-(--a-soft) text-[9px] text-(--a-muted)"
                >
                  {community.memberRoles?.[person.id] ?? "Member"}
                </span>
                {canManageCommunityMember(community, person.id) && (
                  <>
                    <select
                      aria-label={`Role for ${person.name}`}
                      value={community.memberRoles?.[person.id] ?? "Member"}
                      onChange={(event) => {
                        void command({
                          type: "member.role",
                          communityId,
                          userId: person.id,
                          role: event.target.value as
                            "Admin" | "Moderator" | "Member",
                        });
                      }}
                    >
                      <option>Member</option>
                      <option>Moderator</option>
                      {community.memberRoles?.you === "Owner" && (
                        <option>Admin</option>
                      )}
                    </select>
                    <IconButton
                      name="userRemove"
                      label={`Remove ${person.name}`}
                      onClick={() =>
                        setModal({
                          type: "confirm",
                          title: `Remove ${person.name}?`,
                          description:
                            "They will lose access to this community. Public communities can be rejoined.",
                          label: "Remove member",
                          managedCommunityId: communityId,
                          action: () => {
                            void command({
                              type: "member.remove",
                              communityId,
                              userId: person.id,
                            });
                          },
                        })
                      }
                    />
                    <IconButton
                      name="shield"
                      label={`Ban ${person.name}`}
                      onClick={() =>
                        setModal({
                          type: "confirm",
                          title: `Ban ${person.name}?`,
                          description:
                            "They will lose access and can't rejoin, even with an invite link. Use Remove for a temporary goodbye instead.",
                          label: "Ban member",
                          managedCommunityId: communityId,
                          action: () => {
                            void command({
                              type: "member.ban",
                              communityId,
                              userId: person.id,
                            });
                          },
                        })
                      }
                    />
                  </>
                )}
                <IconButton
                  name="more"
                  label={`View ${person.name}'s profile`}
                  onClick={() =>
                    setModal({ type: "profile", personId: person.id })
                  }
                />
              </div>
            ))}
          {(community.bannedIds?.length ?? 0) > 0 && (
            <section aria-label="Banned members" className="mt-8">
              <div className="mb-2">
                <h2 className="text-[21px]">Banned.</h2>
                <p className="text-[12px] text-(--a-muted) mt-1.75">
                  These people can&apos;t rejoin, even with an invite link.
                </p>
              </div>
              {(community.bannedIds ?? []).map((bannedId) => {
                const banned =
                  bannedId === "you"
                    ? state.profile
                    : (state.people.find((p) => p.id === bannedId) ?? {
                        id: bannedId,
                        name: "Banned member",
                        handle: "",
                        color: "peach",
                        status: "offline",
                        bio: "",
                        activity: "",
                        role: "Member",
                      } as const);
                return (
                  <div
                    data-ui="a-community-member-row"
                    className="flex items-center gap-3.25 py-4.5 px-1.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) [&>span:nth-child(2)]:flex-1 [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-[550] [&_small]:block [&_small]:text-[11px] [&_small]:text-(--a-faint) [&_small]:mt-1.25"
                    key={bannedId}
                  >
                    <PersonAvatar person={banned} />
                    <span>
                      <strong>{banned.name}</strong>
                      {banned.handle && <small>@{banned.handle}</small>}
                    </span>
                    <button
                      data-ui="a-button secondary"
                      className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)!"
                      onClick={() =>
                        void command({
                          type: "member.unban",
                          communityId,
                          userId: banned.id,
                        })
                      }
                    >
                      Unban
                    </button>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
