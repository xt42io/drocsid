import { CommunityIconUpload, type IconUpload } from "./community-icon-upload";
import { CommunityIcon } from "./community-icon";
import { ChannelIconField } from "./channel-icons";
import { useDirectory } from "../../lib/use-directory";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { usePostHog } from "@posthog/react";
import {
  getChannelCategories,
  createDefaultChannels,
} from "../../lib/channels";
import type { Community, Person } from "../../types/app";
import type { InviteLink } from "../../types/invites";
import { api, apiDelete } from "../../lib/api-client";
import {
  AppIcon,
  Dialog,
  EmptyState,
  PersonAvatar,
} from "./primitives";
import { ButtonLoader } from "../button-loader";
import { AutoLinkText } from "./auto-link-text";
import { canManageCommunity } from "../../lib/community-permissions";

export function AppDialogs() {
  const app = useApp();
  const modal = app.modal;
  const managedCommunityId =
    modal?.type === "create-category" ||
    modal?.type === "create-channel" ||
    modal?.type === "invite"
      ? modal.communityId
      : modal?.type === "confirm"
        ? (modal.managedCommunityId ?? null)
      : null;
  const blockedManagementDialog =
    !!managedCommunityId &&
    !canManageCommunity(
      app.state.communities.find(
        (community) => community.id === managedCommunityId,
      ),
    );
  useEffect(() => {
    if (blockedManagementDialog) app.setModal(null);
  }, [app.setModal, blockedManagementDialog]);
  if (!modal || blockedManagementDialog) return null;
  if (modal.type === "create-community") return <CreateCommunity />;
  if (modal.type === "create-category")
    return <CreateCategory communityId={modal.communityId} />;
  if (modal.type === "create-channel")
    return (
      <CreateChannel
        communityId={modal.communityId}
        initialGroup={modal.group}
      />
    );
  if (modal.type === "new-message" || modal.type === "add-friend")
    return <PeoplePicker mode={modal.type} />;
  if (modal.type === "invite")
    return <Invite communityId={modal.communityId} />;
  if (modal.type === "profile") return <Profile personId={modal.personId} />;
  if (modal.type === "confirm")
    return (
      <Dialog
        title={modal.title}
        description={modal.description}
        onClose={() => app.setModal(null)}
      >
        <div
          data-ui="a-dialog-actions"
          className="flex justify-end gap-2.5 mt-7.5"
        >
          <button
            data-ui="a-button secondary"
            className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
            onClick={() => app.setModal(null)}
          >
            Keep it
          </button>
          <button
            data-ui="a-button danger"
            className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=danger]:text-white data-[ui~=danger]:bg-[#b94f3b]"
            onClick={() => {
              modal.action();
              app.setModal(null);
            }}
          >
            {modal.label}
          </button>
        </div>
      </Dialog>
    );
  return (
    <Dialog
      title="Make yourself at home."
      description="A little guide to your corner of the internet."
      onClose={() => app.setModal(null)}
    >
      <div
        data-ui="a-help-list"
        className="flex flex-col gap-5.5 mb-6.5 [&>div]:flex [&>div]:gap-3.25 [&>div>svg]:text-(--a-green) [&>div>svg]:shrink-0 [&_strong]:text-[13px] [&_strong]:font-semibold [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:text-(--a-muted) [&_p]:mt-1.75 max-[480px]:[&_p]:text-[12px]"
      >
        <div>
          <AppIcon name="message" />
          <span>
            <strong>Start a conversation</strong>
            <p>
              Pick a channel or a friend. Type a message and press Enter. Shift
              + Enter adds a new line.
            </p>
          </span>
        </div>
        <div>
          <AppIcon name="search" />
          <span>
            <strong>Find the good stuff</strong>
            <p>Press ⌘ K or Ctrl K to search messages, people, and channels.</p>
          </span>
        </div>
        <div>
          <AppIcon name="reply" />
          <span>
            <strong>Give a thought some room</strong>
            <p>
              Use Reply on a message to open its thread. React, pin, or save the
              messages you love.
            </p>
          </span>
        </div>
        <div>
          <AppIcon name="info" />
          <span>
            <strong>A home for your community</strong>
            <p>
              Messages are shared with your conversation. Private channels and
              files are only available to people with access.
            </p>
          </span>
        </div>
      </div>
      <Link
        to="/app/settings"
        search={{ section: "data" }}
        onClick={() => app.setModal(null)}
        data-ui="a-text-link"
        className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
      >
        Manage your account <AppIcon name="right" size={16} />
      </Link>
    </Dialog>
  );
}
function CreateCommunity() {
  const { setState, setModal, notify } = useApp();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedIcon, setUploadedIcon] = useState<IconUpload>();
  const submitting = useRef(false);
  const [icon, setIcon] = useState<Community["icon"]>("");
  const [error, setError] = useState("");
  const choices: Community["icon"][] = [
    "",
    "sun",
    "leaf",
    "coffee",
    "book",
    "game",
    "brush",
    "music",
    "code",
  ];
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || uploading) return;
    if (name.trim().length < 2) {
      setError("Give your corner a name with at least 2 characters.");
      return;
    }
    const id = crypto.randomUUID();
    submitting.current = true;
    setCreating(true);
    setError("");
    const saved = await setState((previous) => ({
      ...previous,
      communities: [
        ...previous.communities,
        {
          id,
          name: name.trim(),
          description: "",
          icon,
          iconUrl: uploadedIcon?.url,
          iconUploadId: uploadedIcon?.id,
          color: "peach",
          category: "Your community",
          discoverable: true,
          members: 1,
          memberIds: ["you"],
          memberRoles: { you: "Owner" },
          joined: true,
          channels: createDefaultChannels(),
        },
      ],
    }));
    submitting.current = false;
    setCreating(false);
    if (!saved) {
      posthog.capture("community_create_failed", { source: "sidebar" });
      setError("Could not create your community. Please try again.");
      return;
    }
    posthog.capture("community_created", {
      community_id: id,
      has_icon: !!(uploadedIcon || icon),
      source: "sidebar",
    });
    // Route into the new community before the dialog unmounts, so a saved
    // community always lands the viewer inside it.
    void navigate({
      to: "/app/community/$communityId/$channelId",
      params: { communityId: id, channelId: "general" },
    });
    notify("Your corner is ready. Make it your own.");
    setModal(null);
  }
  const dirty = name.trim().length > 0 || icon !== "" || !!uploadedIcon;
  return (
    <Dialog
      title="A place for your people."
      description="Your book club, side project, or very specific obsession. Give it a home."
      dismissable={!dirty && !uploading}
      onClose={() => {
        if (!submitting.current && !uploading) setModal(null);
      }}
    >
      <form
        data-ui="a-form"
        className="flex flex-col gap-5 [&>label]:block [&>label]:font-[550] [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px]"
        onSubmit={submit}
      >
        <CommunityIconUpload
          community={{ icon, iconUrl: uploadedIcon?.url }}
          onChange={setUploadedIcon}
          onBusyChange={setUploading}
          disabled={creating || uploading}
        />
        <p className="text-center text-xs text-(--a-muted)">
          Or choose a symbol. You can also add an image later.
        </p>
        <div
          data-ui="a-icon-options"
          className="flex gap-1.75 justify-center [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button]:bg-(--a-surface) [&>button]:text-(--a-muted) [&>button]:rounded-lg [&>button]:size-8.75 [&>button]:border! [&>button]:border-solid! [&>button]:border-(--a-border)! [&>button[data-ui~=selected]]:border-[#a9bc8d]! [&>button[data-ui~=selected]]:text-(--a-green) [&>button[data-ui~=selected]]:bg-(--a-selected) [[data-ui~=theme-dark]_&>button[data-ui~=selected]]:border-[#626262]! max-[480px]:gap-1.5 max-[480px]:[&>button]:w-7.5 max-[480px]:[&>button]:h-8"
          aria-label="Community icon"
        >
          {choices.map((choice) => (
            <button
              disabled={creating || uploading}
              type="button"
              aria-label={choice ? `${choice} icon` : "Skip community icon"}
              aria-pressed={icon === choice}
              data-ui={icon === choice ? "selected" : ""}
              key={choice}
              onClick={() => setIcon(choice)}
            >
              <AppIcon name={choice} size={20} />
            </button>
          ))}
        </div>
        <label>
          Your community’s name
          <input
            disabled={creating || uploading}
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="The next good thing"
            maxLength={40}
            required
          />
        </label>
        {error && (
          <p
            data-ui="a-form-error"
            className="text-[#b56345] text-[12px] leading-[1.6]"
            role="alert"
          >
            {error}
          </p>
        )}
        <div
          data-ui="a-form-footnote"
          className="text-(--a-muted) leading-[1.8] text-[11px]!"
        >
          Start small. You can always add more channels later.
        </div>
        <button
          disabled={creating || uploading}
          aria-busy={creating}
          type="submit"
          data-ui="a-button primary full"
          className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
        >
          {creating ? (
            <ButtonLoader label="Creating community" />
          ) : (
            <>
              Create your corner <AppIcon name="right" size={17} />
            </>
          )}
        </button>
      </form>
    </Dialog>
  );
}
function CreateCategory({ communityId }: { communityId: string }) {
  const { state, setState, setModal, notify } = useApp();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const community = state.communities.find((c) => c.id === communityId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    const normalized = name.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setError("Give your category a name.");
      return;
    }
    if (!community) return;
    if (
      getChannelCategories(community).some(
        (category) => category.toLowerCase() === normalized.toLowerCase(),
      )
    ) {
      setError("There’s already a category with that name.");
      return;
    }
    setCreating(true);
    const saved = await setState((previous) => ({
      ...previous,
      communities: previous.communities.map((c) =>
        c.id === communityId
          ? {
              ...c,
              channelCategories: [...getChannelCategories(c), normalized],
            }
          : c,
      ),
    }));
    setCreating(false);
    if (!saved) return;
    setModal(null);
    notify(`${normalized} is ready. Add a channel to get started.`);
  }
  return (
    <Dialog
      title="Create a category"
      description={`Keep related channels together in ${community?.name ?? "your community"}.`}
      onClose={() => setModal(null)}
    >
      <form
        data-ui="a-form"
        className="flex flex-col gap-5 [&>label]:block [&>label]:font-[550] [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px]"
        onSubmit={submit}
      >
        <label>
          Category name
          <input
            autoFocus
            disabled={creating}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="Projects, hobbies, or something else"
            maxLength={40}
            required
            aria-invalid={!!error}
            aria-describedby={error ? "category-error" : undefined}
          />
        </label>
        {error && (
          <p
            id="category-error"
            data-ui="a-form-error"
            className="text-[#b56345] text-[12px] leading-[1.6]"
            role="alert"
          >
            {error}
          </p>
        )}
        <p
          data-ui="a-form-footnote"
          className="text-(--a-muted) leading-[1.8] text-[11px]!"
        >
          You can add channels after creating your category.
        </p>
        <button
          type="submit"
          disabled={creating}
          aria-busy={creating}
          data-ui="a-button primary full"
          className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
        >
          {creating ? (
            <ButtonLoader label="Creating category" />
          ) : (
            <>
              Create category <AppIcon name="plus" size={18} />
            </>
          )}
        </button>
      </form>
    </Dialog>
  );
}
function CreateChannel({
  communityId,
  initialGroup,
}: {
  communityId: string;
  initialGroup?: string;
}) {
  const { state, createChannel, setModal, notify } = useApp();
  const navigate = useNavigate();
  const community = state.communities.find((c) => c.id === communityId);
  const categories = community ? getChannelCategories(community) : [];
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");

  const [group, setGroup] = useState(initialGroup ?? "");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const submitting = useRef(false);
  const channelId = useRef<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const normalized = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    if (!normalized) {
      setError("Use letters or numbers for your channel name.");
      return;
    }
    if (community?.channels.some((c) => c.name === normalized)) {
      setError("There’s already a channel with that name.");
      return;
    }
    const id = (channelId.current ??= crypto.randomUUID());
    submitting.current = true;
    setCreating(true);
    let saved = false;
    try {
      saved = await createChannel(communityId, {
        id,
        name: normalized,
        description: "",
        icon,
        group,
      });
    } finally {
      submitting.current = false;
      setCreating(false);
    }
    if (!saved) {
      setError("Could not create the channel. Please try again.");
      return;
    }
    setModal(null);
    notify(`#${normalized} is ready for its first hello.`);
    void navigate({
      to: "/app/community/$communityId/$channelId",
      params: { communityId, channelId: id },
    });
  }
  return (
    <Dialog
      title="Make room for a conversation."
      description={`A new text channel in ${community?.name ?? "your community"}.`}
      onClose={() => {
        if (!submitting.current) setModal(null);
      }}
    >
      <form
        data-ui="a-form"
        className="flex flex-col gap-5 [&>label]:block [&>label]:font-[550] [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px]"
        onSubmit={submit}
      >
        <div
          data-ui="a-channel-type"
          className="flex gap-3 p-4 bg-(--a-selected) border border-solid border-(--a-border) rounded-lg text-(--a-green) [&>span]:flex-1 [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-semibold [&_small]:block [&_small]:text-[10px] [&_small]:mt-1 [&_small]:text-(--a-muted)"
        >
          <AppIcon name="hash" size={25} />
          <span>
            <strong>Text channel</strong>
            <small>A place to chat, share, and stay in the loop.</small>
          </span>
          <AppIcon name="checkCircle" size={20} />
        </div>
        <label>
          Channel name
          <input
            autoFocus
            disabled={creating}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            placeholder="a-very-good-topic"
            maxLength={40}
            required
          />
        </label>
        <ChannelIconField value={icon} onChange={setIcon} disabled={creating} />
        {categories.length > 0 && (
          <label>
            Category
            <select
              disabled={creating}
              value={group}
              onChange={(event) => setGroup(event.target.value)}
            >
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        )}
        {error && (
          <p
            data-ui="a-form-error"
            className="text-[#b56345] text-[12px] leading-[1.6]"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          data-ui="a-button primary full"
          className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
          type="submit"
          disabled={creating}
          aria-busy={creating}
        >
          {creating ? (
            <ButtonLoader label="Creating channel" />
          ) : (
            <>
              Create channel <AppIcon name="plus" size={18} />
            </>
          )}
        </button>
      </form>
    </Dialog>
  );
}
function PeoplePicker({ mode }: { mode: "new-message" | "add-friend" }) {
  const { state, setState, setModal, notify } = useApp();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [query, setQuery] = useState("");
  const directory = useDirectory("people", query);
  const results = (
    query.trim() ? (directory.people ?? []) : state.people
  ).filter(
    (p) =>
      !state.blocked.includes(p.id) &&
      `${p.name} ${p.handle}`
        .toLowerCase()
        .includes(query.replace(/^@/, "").toLowerCase()),
  );
  return (
    <Dialog
      title={
        mode === "new-message"
          ? "Say a little hello."
          : "Good company starts here."
      }
      description={
        mode === "new-message"
          ? "Start a direct conversation with someone you know."
          : "Find a person by name or username."
      }
      onClose={() => setModal(null)}
    >
      <label
        data-ui="a-search-field"
        className="flex items-center gap-2.25 bg-(--a-surface) border border-solid border-(--a-border) rounded-[7px] min-h-10.75 py-0 px-3 text-(--a-muted) [&_input]:w-full [&_input]:py-2.75 [&_input]:px-0 [&_input]:bg-transparent [&_input]:border-0 [&_input]:border-none [&_input]:border-[currentColor] [&_input]:rounded-none [&_input]:text-[12px] [&_input]:shadow-none! focus-within:border-[#b8c5a3] [[data-ui~=theme-dark]_&:focus-within]:border-[#888888] [[data-ui~=theme-dark]_&:focus-within]:shadow-[0_0_0_3px_#ffffff08] max-[760px]:[[data-ui~=workspace]_&_input]:text-[16px] max-[760px]:[[data-ui~=workspace]_&_input::placeholder]:text-[12px]"
      >
        <AppIcon name="search" size={19} />
        <input
          autoFocus
          aria-label="Find a person"
          placeholder="A name or @username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div
        data-ui="a-picker-list"
        className="max-h-107.5 overflow-y-auto mt-3.75"
      >
        {directory.loading && <p role="status">Searching…</p>}
        {directory.error && <p role="alert">{directory.error}</p>}
        {results.map((person) => (
          <div
            data-ui="a-picker-person"
            className="flex items-center gap-2.75 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) py-4 px-0 [&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:min-w-0 [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-[550] [&_small]:block [&_small]:text-[10px] [&_small]:text-(--a-faint) [&_small]:mt-1 max-[480px]:gap-2.25 max-[480px]:[&_strong]:text-[12px] max-[480px]:**:data-[ui~=a-button]:text-[10px]! max-[480px]:**:data-[ui~=a-button]:py-1.5 max-[480px]:**:data-[ui~=a-button]:px-2.25"
            key={person.id}
          >
            <PersonAvatar person={person} presence />
            <span>
              <strong>{person.name}</strong>
              {person.handle && <small>@{person.handle}</small>}
            </span>
            {mode === "new-message" ? (
              <button
                data-ui="a-button secondary small"
                className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                onClick={() => {
                  setModal(null);
                  void navigate({
                    to: "/app/dm/$personId",
                    params: { personId: person.id },
                  });
                }}
              >
                Message
              </button>
            ) : (
              <button
                data-ui="a-button secondary small"
                className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                disabled={
                  state.friends.includes(person.id) ||
                  state.outgoing.includes(person.id)
                }
                onClick={() => {
                  if (state.pending.includes(person.id)) {
                    setState((previous) => ({
                      ...previous,
                      friends: [...new Set([...previous.friends, person.id])],
                      pending: previous.pending.filter(
                        (id) => id !== person.id,
                      ),
                      outgoing: previous.outgoing.filter(
                        (id) => id !== person.id,
                      ),
                    }));
                    notify(
                      `${person.name.split(" ")[0]} is now in your friends.`,
                    );
                    return;
                  }
                  setState((previous) => ({
                    ...previous,
                    outgoing: [...previous.outgoing, person.id],
                  }));
                  posthog.capture("friend_request_sent");
                  notify("Friend request sent.");
                }}
              >
                {state.friends.includes(person.id)
                  ? "Friends"
                  : state.outgoing.includes(person.id)
                    ? "Requested"
                    : state.pending.includes(person.id)
                      ? "Accept request"
                      : "Add friend"}
              </button>
            )}
          </div>
        ))}
        {query.trim() && directory.hasMore && (
          <button
            type="button"
            className="w-full rounded-md border border-(--a-border) px-4 py-2 text-xs text-(--a-text) hover:bg-(--a-hover) disabled:opacity-50"
            disabled={directory.loading}
            onClick={directory.more}
          >
            {directory.loading ? (
              <ButtonLoader label="Loading more people" />
            ) : (
              "Load more"
            )}
          </button>
        )}
        {results.length === 0 && !directory.loading && !directory.error && (
          <EmptyState
            icon="search"
            title="No familiar faces yet."
            description="Try a different name or username."
          />
        )}
      </div>
    </Dialog>
  );
}
function Invite({ communityId }: { communityId: string }) {
  const { state, setModal, notify } = useApp();
  const [copied, setCopied] = useState(false);
  const [invite, setInvite] = useState<InviteLink>();
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState("");
  const community = state.communities.find((c) => c.id === communityId);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    void api<InviteLink>("/api/invites", { communityId })
      .then((next) => {
        if (current) setInvite(next);
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error ? cause.message : "Could not make an invite.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [communityId]);
  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
      notify("Invitation link copied.");
    } catch {
      notify("Copy isn’t available here. Select the link to copy it manually.");
    }
  }
  async function revoke() {
    if (!invite) return;
    setRevoking(true);
    try {
      await apiDelete(`/api/invites/${encodeURIComponent(invite.code)}`);
      setInvite(undefined);
      notify("Invitation link revoked.");
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : "Could not revoke invite.");
    } finally {
      setRevoking(false);
    }
  }
  return (
    <Dialog
      title="Good things are better together."
      description={`Make a little room in ${community?.name ?? "your community"}.`}
      onClose={() => setModal(null)}
    >
      <div
        data-ui="a-invite-preview"
        className="flex flex-col items-center text-center pt-2.25 pb-7.5 px-0 **:data-[ui~=a-community-icon]:rounded-[18px] **:data-[ui~=a-community-icon]:mb-4 **:data-[ui~=a-community-icon]:size-15 [&_h3]:text-[21px] [&_p]:mt-2.25 [&_p]:text-(--a-muted) [&_p]:text-[12px]"
      >
        <span
          data-ui={`a-community-icon tone-${community?.color ?? "peach"}`}
          className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] size-11.5 data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] hover:transform-[translateY(-2px)] hover:rounded-xl max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
        >
          <CommunityIcon community={community ?? { icon: "sun" }} size={30} />
        </span>
        <h3>{community?.name}</h3>
        <p>There’s a spot with your name on it.</p>
      </div>
      <label
        data-ui="a-field-label"
        className="block font-[550] text-xs/normal"
        htmlFor="invite-link"
      >
        Your invite link
      </label>
      <div
        data-ui="a-copy-field"
        className="flex items-center gap-1.75 mt-2 mb-4.25 mx-0 [&>input]:flex-1 [&>input]:h-10.25 [&>input]:p-2.5 [&>input]:text-[11px] [&>input]:text-(--a-muted) max-[480px]:[&>input]:text-[10px] max-[480px]:**:data-[ui~=a-button]:text-[11px]! max-[480px]:**:data-[ui~=a-button]:px-2.5"
      >
        <input
          id="invite-link"
          readOnly
          value={loading ? "Making your invite…" : (invite?.url ?? "")}
          aria-invalid={!!error}
          onFocus={(event) => event.target.select()}
        />
        <button
          data-ui="a-button primary"
          className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
          disabled={!invite || loading}
          onClick={copy}
        >
          <AppIcon name={copied ? "check" : "copy"} size={17} />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mb-3 text-xs text-[#ff776d]">
          {error}
        </p>
      )}
      <p
        data-ui="a-form-footnote"
        className="text-(--a-muted) leading-[1.8] text-[11px]!"
      >
        Anyone with this link can join this community.
      </p>
      {invite ? (
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/invite/$code"
            params={{ code: invite.code }}
            data-ui="a-text-link"
            className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
            onClick={() => setModal(null)}
          >
            Preview invitation <AppIcon name="external" size={15} />
          </Link>
          <button
            type="button"
            className="text-[11px] font-[550] text-(--a-muted) hover:text-[#ff776d] disabled:cursor-wait disabled:opacity-60"
            disabled={revoking}
            onClick={revoke}
          >
            {revoking ? (
              <ButtonLoader label="Revoking invite link" />
            ) : (
              "Revoke link"
            )}
          </button>
        </div>
      ) : (
        !loading && !error && (
          <button
            type="button"
            className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) hover:text-(--a-orange)"
            onClick={() => {
              setLoading(true);
              setError("");
              void api<InviteLink>("/api/invites", { communityId })
                .then(setInvite)
                .catch((cause) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Could not make an invite.",
                  ),
                )
                .finally(() => setLoading(false));
            }}
          >
            Make a new invite link <AppIcon name="right" size={15} />
          </button>
        )
      )}
    </Dialog>
  );
}
function Profile({ personId }: { personId: string }) {
  const { state, setState, setModal, findPerson, notify } = useApp();
  const person = findPerson(personId);
  const own = personId === "you";
  const blocked = state.blocked.includes(personId);
  return (
    <Dialog
      title={own ? "Your little introduction." : "Profile"}
      onClose={() => setModal(null)}
    >
      <div
        data-ui={`a-profile-cover tone-${person.color}`}
        className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] h-23.75 rounded-lg flex items-center justify-center p-5.5 mb-0 overflow-hidden [&>svg]:transform-[rotate(-12deg)] [&>svg]:opacity-60"
      >
        <AppIcon name="sun" size={56} />
      </div>
      <div
        data-ui="a-profile-details"
        className="pt-0 pb-px px-2 *:data-[ui~=a-avatar]:-mt-7.75 *:data-[ui~=a-avatar]:border-[5px] *:data-[ui~=a-avatar]:border-solid *:data-[ui~=a-avatar]:border-(--a-bg) *:data-[ui~=a-avatar]:rounded-[26px] *:data-[ui~=a-avatar]:mb-2.5 [&_h3]:text-[25px] [&_h3]:mb-1.25 [&_h3]:tracking-[-0.8px] [&>span:not([data-ui~=a-avatar])]:text-(--a-faint) [&>span:not([data-ui~=a-avatar])]:text-[12px] **:data-[ui~=a-role-tag]:ml-2 [&>p]:text-[14px] [&>p]:leading-[1.8] [&>p]:mt-4.75 [&>p]:text-(--a-muted) [&>p]:whitespace-pre-wrap [&>p]:wrap-anywhere [&>select]:w-full [&>select]:mt-2 [&>select]:mb-4.5 [&>select]:text-[12px] max-[480px]:[&_h3]:text-[25px] max-[480px]:[&>p]:text-[13px]"
      >
        <PersonAvatar person={person} large presence />
        <h3>{person.name}</h3>
        <span>
          {person.handle && <>@{person.handle} </>}
          <span
            data-ui="a-role-tag"
            className="inline-block py-0.75 px-1.75 border border-solid border-(--a-border) rounded-sm bg-(--a-soft) text-[9px] text-(--a-muted)"
          >
            {person.role}
          </span>
        </span>
        <p className="[&_a]:text-(--a-green) [&_a]:underline [&_a]:underline-offset-3">
          <AutoLinkText
            text={person.bio || "Sometimes a hello says enough."}
          />
        </p>
        <div
          data-ui="a-profile-meta"
          className="flex flex-col py-5 px-0 my-4.5 [border-block:1px_solid_var(--a-border)] [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>span]:text-(--a-muted) [&>span]:text-[11px] [&>span]:leading-[1.6] max-[480px]:[&>span]:text-[10px]"
        >
          <span>
            <i
              data-ui={`a-status-dot ${person.status}`}
              className="data-[ui~=online]:bg-[#2ee68b] data-[ui~=away]:bg-[#ffc447] data-[ui~=offline]:bg-[#cbd5e1] inline-block rounded-full shrink-0 size-1.5"
            />
            {person.status === "online"
              ? "Online"
              : person.status === "away"
                ? "Taking a break"
                : "Offline"}{" "}
            · {person.activity}
          </span>
        </div>
        {own ? (
          <>
            <label
              data-ui="a-field-label"
              className="block font-[550] text-xs/normal"
              htmlFor="presence"
            >
              How are you showing up?
            </label>
            <select
              id="presence"
              value={state.profile.status}
              onChange={(event) =>
                setState((previous) => ({
                  ...previous,
                  profile: {
                    ...previous.profile,
                    status: event.target.value as Person["status"],
                  },
                }))
              }
            >
              <option value="online">Online — happy to be here</option>
              <option value="away">Away — taking a little break</option>
              <option value="offline">Invisible — keeping it quiet</option>
            </select>
            <Link
              to="/app/settings"
              search={{ section: "profile" }}
              onClick={() => setModal(null)}
              data-ui="a-button primary full"
              className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
            >
              Edit your profile <AppIcon name="edit" size={17} />
            </Link>
          </>
        ) : (
          <div
            data-ui="a-profile-buttons"
            className="flex gap-2.25 *:data-[ui~=primary]:flex-1 max-[480px]:**:data-[ui~=a-button]:text-[11px]!"
          >
            {!blocked && (
              <Link
                to="/app/dm/$personId"
                params={{ personId }}
                onClick={() => setModal(null)}
                data-ui="a-button primary"
                className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
              >
                <AppIcon name="message" size={17} /> Send a message
              </Link>
            )}
            <button
              data-ui="a-button secondary"
              className="disabled:cursor-wait disabled:opacity-60 inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
              onClick={() => {
                setState((previous) => ({
                  ...previous,
                  blocked: blocked
                    ? previous.blocked.filter((id) => id !== personId)
                    : [...previous.blocked, personId],
                }));
                notify(
                  blocked
                    ? `${person.name.split(" ")[0]} unblocked.`
                    : `${person.name.split(" ")[0]} blocked.`,
                );
                setModal(null);
              }}
            >
              {blocked ? "Unblock" : "Block"}
            </button>
          </div>
        )}
        {!own && state.friends.includes(personId) && (
          <button
            data-ui="a-text-link a-remove-friend"
            className="inline-flex items-center gap-1.75 font-[550] bg-transparent p-0 mt-5 text-(--a-muted) text-[11px] hover:text-(--a-orange)"
            onClick={() =>
              setModal({
                type: "confirm",
                title: `Remove ${person.name.split(" ")[0]} from your friends?`,
                description:
                  "Your existing conversation will stay. You can add them again whenever you like.",
                label: "Remove friend",
                action: () => {
                  setState((previous) => ({
                    ...previous,
                    friends: previous.friends.filter((id) => id !== personId),
                  }));
                  notify("Removed from your friends.");
                },
              })
            }
          >
            <AppIcon name="userRemove" size={15} /> Remove from friends
          </button>
        )}
      </div>
    </Dialog>
  );
}
