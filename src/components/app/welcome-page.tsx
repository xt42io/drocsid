import { useUsernameAvailability } from "../../lib/use-username-availability";
import { CommunityIcon } from "./community-icon";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { usePostHog } from "@posthog/react";
import { Logo } from "../ui";
import { AppIcon } from "./primitives";
import { AvatarUpload } from "./avatar-upload";
export function WelcomePage() {
  const { state, setState, notify, setModal } = useApp();
  const navigate = useNavigate();
  const posthog = usePostHog();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(state.profile.name);
  const [username, setUsername] = useState(
    /^user_[a-z0-9]{19}$/.test(state.profile.handle)
      ? ""
      : state.profile.handle,
  );
  const [error, setError] = useState("");
  const availability = useUsernameAvailability(username);
  const canSave =
    name.trim().length >= 2 &&
    name.trim().length <= 40 &&
    availability.status === "available" &&
    !saving &&
    !uploading;
  const [color, setColor] = useState(state.profile.color);
  const [selected, setSelected] = useState<string[]>([]);
  async function saveProfile() {
    if (!canSave) return;
    setSaving(true);
    setError("");
    try {
      const saved = await setState((previous) => ({
        ...previous,
        profile: {
          ...previous.profile,
          name: name.trim(),
          handle: username,
          color,
        },
      }));
      if (saved) {
        posthog.capture("profile_saved", {
          username_length: username.length,
          color,
        });
        setStep(2);
      } else {
        setError(
          "Couldn’t save your profile. Check your username and try again.",
        );
        availability.retry();
      }
    } finally {
      setSaving(false);
    }
  }
  async function finish(mode: "join" | "skip" | "create" = "join") {
    if (saving || uploading) return;
    setSaving(true);
    const saved = await setState((previous) => ({
      ...previous,
      communities: previous.communities.map((c) =>
        mode === "join" && selected.includes(c.id) ? { ...c, joined: true } : c,
      ),
      onboardingComplete: true,
    }));
    setSaving(false);
    if (!saved) return;
    posthog.capture("onboarding_completed", {
      mode,
      communities_joined: mode === "join" ? selected.length : 0,
    });
    if (mode === "create") {
      await navigate({ to: "/app" });
      setModal({ type: "create-community" });
    } else {
      notify("Welcome to Drocsid.");
      void navigate({ to: "/app" });
    }
  }
  return (
    <div
      data-ui="a-welcome-page"
      className="min-h-full flex flex-col pt-8.75 pb-6.25 px-13.75 [&>header]:flex [&>header]:justify-between [&>header]:items-center **:data-[ui~=logo]:text-[26px] [&>footer]:text-(--a-faint) [&>footer]:text-[10px] [&>footer]:text-center max-[760px]:p-6.25 max-[760px]:[&>header>[data-ui~=a-text-link]]:text-[11px] max-[480px]:py-5.75 max-[480px]:px-5 max-[480px]:[&>header>[data-ui~=a-text-link]]:text-[10px] max-[480px]:[&>footer]:text-[9px]"
    >
      <header>
        <Logo />
        {step === 2 && (
          <button
            type="button"
            data-ui="a-text-link"
            className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 hover:text-(--a-orange)"
            disabled={saving || uploading}
            onClick={() => void finish("skip")}
          >
            Skip for now <AppIcon name="right" size={17} />
          </button>
        )}
      </header>
      <div
        data-ui="a-welcome-content"
        className="m-auto py-12.5 w-full max-w-180 text-center [&>h1]:text-[42px] [&>h1]:leading-[1.16] [&>h1]:mt-3.75 [&>h1]:tracking-[-1.8px] [&>p]:text-[14px] [&>p]:leading-[1.8] [&>p]:text-(--a-muted) [&>p]:mt-3.5 max-[760px]:py-10.5 max-[760px]:[&>h1]:text-[35px] max-[480px]:[&>h1]:text-[33px] max-[480px]:[&>p]:text-[13px] max-[480px]:*:data-[ui~=a-eyebrow]:text-[8px]"
      >
        <div
          data-ui="a-welcome-progress"
          className="flex items-center justify-center mb-8 [&>span]:flex [&>span]:justify-center [&>span]:items-center [&>span]:border [&>span]:border-solid [&>span]:border-(--a-border) [&>span]:bg-(--a-soft) [&>span]:rounded-full [&>span]:text-[10px] [&>span]:text-(--a-faint) [&>span]:size-6.25 [&>span[data-ui~=active]]:border-[#9eaf85] [&>span[data-ui~=active]]:bg-(--a-selected) [&>span[data-ui~=active]]:text-(--a-green) [&_i]:h-px [&_i]:w-14.5 [&_i]:bg-(--a-border) [[data-ui~=theme-dark]_&>span[data-ui~=active]]:border-[#626262]!"
        >
          <span data-ui="active" className="">
            1
          </span>
          <i />
          <span data-ui={step === 2 ? "active" : ""} className="">
            2
          </span>
        </div>
        <span
          data-ui="a-eyebrow"
          className="block font-mono text-[9px] font-normal tracking-[1.3px] leading-[1.6] text-(--a-muted)"
        >
          {step === 1
            ? "FIRST, A LITTLE INTRODUCTION"
            : "NOW, FIND YOUR CORNER"}
        </span>
        <h1>
          {step === 1
            ? "Good to have you here."
            : "What feels like your kind of place?"}
        </h1>
        <p>
          {step === 1
            ? "Come as you are. Let’s put a name to that hello."
            : "Join a community, create your own, or skip this for now."}
        </p>
        {step === 1 ? (
          <form
            data-ui="a-welcome-form a-form"
            className="flex flex-col gap-5 max-w-86.25 mt-8 mb-0 mx-auto [&>label]:block [&>label]:font-[550] [&>label]:text-left [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] *:data-[ui~=a-avatar]:self-center [&_[data-ui~=a-color-field]>div]:justify-center [&_[data-ui~=a-color-field]>div]:mt-px [&_[data-ui~=a-color-field]>div]:mb-2 max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px]"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile();
            }}
          >
            <AvatarUpload
              person={{ ...state.profile, name: name || "You", color }}
              onBusyChange={setUploading}
            />
            <div
              data-ui="a-color-field"
              className="border-0 border-none border-[currentColor] p-0 m-0 [&_legend]:p-0 [&_legend]:mb-3 [&_legend]:text-[12px] [&_legend]:font-[550] [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:size-7.25 [&_button[data-ui~=selected]]:[outline:1px_solid_var(--a-green)] [&_button[data-ui~=selected]]:outline-offset-[3px]"
            >
              <div>
                {["blue", "peach", "purple", "green", "yellow"].map((tone) => (
                  <button
                    type="button"
                    key={tone}
                    data-ui={`tone-${tone} ${color === tone ? "selected" : ""}`}
                    className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249]"
                    aria-label={`${tone} avatar`}
                    aria-pressed={color === tone}
                    onClick={() => setColor(tone)}
                  >
                    {color === tone && <AppIcon name="check" size={16} />}
                  </button>
                ))}
              </div>
            </div>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value.toLowerCase());
                  setError("");
                }}
                placeholder="Choose a username"
                minLength={3}
                maxLength={24}
                pattern="[a-z0-9_]{3,24}"
                aria-invalid={["invalid", "taken"].includes(
                  availability.status,
                )}
                aria-describedby="welcome-username-status"
                disabled={saving}
                required
              />
              <span
                id="welcome-username-status"
                role="status"
                aria-live="polite"
                data-status={availability.status}
                className="mt-2 block text-xs font-normal leading-5 text-(--a-muted) data-[status=available]:text-emerald-500 data-[status=taken]:text-red-500 data-[status=invalid]:text-red-500 data-[status=error]:text-red-500"
              >
                {availability.message}
              </span>
            </label>
            {availability.status === "error" && (
              <button
                type="button"
                onClick={availability.retry}
                className="self-start text-xs text-(--a-orange) underline underline-offset-4"
              >
                Check again
              </button>
            )}
            <label>
              Profile name
              <input
                name="name"
                autoComplete="nickname"
                disabled={saving}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="What should we call you?"
                minLength={2}
                maxLength={40}
                required
              />
            </label>
            {error && (
              <p role="alert" className="text-left text-sm text-red-500">
                {error}
              </p>
            )}
            <button
              data-ui="a-button primary full"
              className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954] data-[ui~=full]:w-full"
              type="submit"
              disabled={!canSave}
            >
              {saving ? "Saving profile…" : "Continue"}{" "}
              <AppIcon name="right" size={18} />
            </button>
          </form>
        ) : (
          <>
            <div
              data-ui="a-welcome-communities"
              className="grid grid-cols-3 gap-3.25 mt-8 max-[760px]:gap-2.75 max-[480px]:grid-cols-2"
            >
              {state.communities.slice(0, 6).map((community) => (
                <button
                  disabled={saving}
                  key={community.id}
                  data-ui={`a-welcome-choice ${selected.includes(community.id) ? "selected" : ""}`}
                  className="relative flex flex-col items-center pt-6 pb-5.75 px-3.25 rounded-[10px] bg-(--a-surface) border! border-solid! border-(--a-border)! data-[ui~=selected]:border-[#a4b78b]! data-[ui~=selected]:bg-(--a-soft) [&>strong]:text-[13px] [&>strong]:font-[550] [&>strong]:mt-3.75 [&>small]:text-(--a-muted) [&>small]:text-[10px] [&>small]:mt-1.75 [&[data-ui~=selected]_[data-ui~=a-choice-check]]:bg-(--a-selected) [&[data-ui~=selected]_[data-ui~=a-choice-check]]:border-[#a4b78b] [[data-ui~=theme-dark]_&[data-ui~=selected]]:border-[#626262]! [[data-ui~=theme-dark]_&[data-ui~=selected]_[data-ui~=a-choice-check]]:border-[#626262]! max-[760px]:py-5.5 max-[760px]:px-2.5 max-[760px]:[&>strong]:text-[12px] max-[760px]:[&>small]:text-[9px] max-[480px]:[&>strong]:text-[12px] max-[480px]:[&>small]:text-[9px]"
                  aria-pressed={selected.includes(community.id)}
                  onClick={() =>
                    setSelected((previous) =>
                      previous.includes(community.id)
                        ? previous.filter((id) => id !== community.id)
                        : [...previous, community.id],
                    )
                  }
                >
                  <span
                    data-ui={`a-community-icon tone-${community.color}`}
                    className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] size-11.5 data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249] hover:transform-[translateY(-2px)] hover:rounded-xl max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
                  >
                    <CommunityIcon community={community} size={29} />
                  </span>
                  <strong>{community.name}</strong>
                  <small>{community.category}</small>
                  <span
                    data-ui="a-choice-check"
                    className="flex items-center justify-center border border-solid border-(--a-border) rounded-full absolute top-2.75 right-2.75 text-(--a-green) size-4.5"
                  >
                    {selected.includes(community.id) && (
                      <AppIcon name="check" size={14} />
                    )}
                  </span>
                </button>
              ))}
              <button
                data-ui="a-welcome-choice a-welcome-create"
                className="relative flex flex-col items-center pt-6 pb-5.75 px-3.25 rounded-[10px] bg-(--a-surface) border! border-(--a-border)! border-dashed! [&>strong]:text-[13px] [&>strong]:font-[550] [&>strong]:mt-3.75 [&>small]:text-(--a-muted) [&>small]:text-[10px] [&>small]:mt-1.75 max-[760px]:py-5.5 max-[760px]:px-2.5 max-[760px]:[&>strong]:text-[12px] max-[760px]:[&>small]:text-[9px] max-[480px]:[&>strong]:text-[12px] max-[480px]:[&>small]:text-[9px] **:data-[ui~=a-community-icon]:bg-(--a-soft) **:data-[ui~=a-community-icon]:text-(--a-text)"
                disabled={saving}
                onClick={() => void finish("create")}
              >
                <span
                  data-ui="a-community-icon"
                  className="relative flex items-center justify-center shrink-0 rounded-[15px] [transition:transform_0.15s,border-radius_0.15s] size-11.5 hover:transform-[translateY(-2px)] hover:rounded-xl max-[1250px]:rounded-[14px] max-[1250px]:size-10.75"
                >
                  <AppIcon name="plus" size={29} />
                </span>
                <strong>Create mine</strong>
                <small>Start your own community</small>
              </button>
            </div>
            <div
              data-ui="a-welcome-actions"
              className="flex gap-3.75 justify-center mt-7.25 flex-wrap max-[480px]:gap-2.5 max-[480px]:**:data-[ui~=a-button]:text-[11px]! max-[480px]:**:data-[ui~=a-button]:whitespace-normal max-[480px]:**:data-[ui~=a-button]:px-3"
            >
              <button
                data-ui="a-button secondary"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                disabled={saving}
                onClick={() => setStep(1)}
              >
                <AppIcon name="left" size={17} />
                Back
              </button>
              <button
                data-ui="a-button primary"
                className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
                onClick={() => void finish()}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : selected.length
                    ? "Join & continue"
                    : "Continue"}{" "}
                <AppIcon name="right" size={18} />
              </button>
            </div>
            <button
              data-ui="a-text-link a-welcome-skip"
              className="inline-flex items-center gap-1.75 text-[12px] font-[550] text-(--a-green) bg-transparent p-0 mt-5.5 mb-0 mx-auto hover:text-(--a-orange)"
              disabled={saving}
              onClick={() => void finish("skip")}
            >
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
