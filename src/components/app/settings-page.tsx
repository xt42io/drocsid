import { AvatarUpload } from "./avatar-upload";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import type { Preferences } from "../../types/app";
import { AppIcon, PageHeading, PersonAvatar, Toggle } from "./primitives";
import type { IconName } from "./primitives";
import { authClient } from "../../lib/auth-client";

const sections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Your profile", icon: "people" },
  { id: "appearance", label: "Look & feel", icon: "brush" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "privacy", label: "Privacy & boundaries", icon: "shield" },
  { id: "data", label: "Your data", icon: "code" },
];
export function SettingsPage({ section }: { section: string }) {
  const { state, setState, setModal, notify, reset } = useApp();
  const [name, setName] = useState(state.profile.name);
  const [handle, setHandle] = useState(state.profile.handle);
  const [bio, setBio] = useState(state.profile.bio);
  const [activity, setActivity] = useState(state.profile.activity);
  const [color, setColor] = useState(state.profile.color);
  const [error, setError] = useState("");
  useEffect(() => {
    setName(state.profile.name);
    setHandle(state.profile.handle);
    setBio(state.profile.bio);
    setActivity(state.profile.activity);
    setColor(state.profile.color);
  }, [
    state.profile.name,
    state.profile.handle,
    state.profile.bio,
    state.profile.activity,
    state.profile.color,
  ]);
  const updatePreference = <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) =>
    setState((previous) => ({
      ...previous,
      preferences: { ...previous.preferences, [key]: value },
    }));
  const preview = {
    ...state.profile,
    name: name || state.profile.name,
    bio,
    color,
  };
  const dirty =
    name !== state.profile.name ||
    handle !== state.profile.handle ||
    bio !== state.profile.bio ||
    activity !== state.profile.activity ||
    color !== state.profile.color;
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drocsid-loaded-data.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Your export is ready.");
  }
  return (
    <div
      data-ui="a-page a-settings-page"
      className="h-full overflow-y-auto pt-10.75 pb-10 px-11 min-[1600px]:py-12 min-[1600px]:px-15 max-[1250px]:py-8.75 max-[1250px]:px-7.5 max-[760px]:pt-7 max-[760px]:pb-8 max-[760px]:px-6 max-[480px]:pt-6 max-[480px]:pb-8 max-[480px]:px-4.5"
    >
      <PageHeading
        eyebrow="MAKE YOURSELF COMFORTABLE"
        title="A little more you."
        description="Your corner should feel like your corner."
      />
      <div
        data-ui="a-settings-layout"
        className="grid grid-cols-[185px_minmax(0,1fr)] gap-9 [border-top-width:1px] [border-top-style:solid] border-t-(--a-border) pt-7.5 max-[1250px]:grid-cols-[160px_minmax(0,1fr)] max-[1250px]:gap-6.25 max-[1050px]:grid-cols-[1fr] max-[1050px]:gap-6.25 max-[760px]:pt-5.25 max-[480px]:gap-6.5"
      >
        <nav
          data-ui="a-settings-nav"
          className="flex flex-col gap-1.25 [&>a]:flex [&>a]:items-center [&>a]:gap-2.25 [&>a]:py-2.75 [&>a]:px-2.5 [&>a]:rounded-md [&>a]:text-(--a-muted) [&>a]:text-[12px] [&>a[data-ui~=active]]:bg-(--a-selected) [&>a[data-ui~=active]]:text-(--a-green) [&>a[data-ui~=active]]:font-semibold [&>a:hover]:bg-(--a-hover) [&>span]:my-4.25 [&>span]:mx-2.5 [&>span]:text-[9px] [&>span]:leading-[1.8] [&>span]:text-(--a-faint) max-[1250px]:[&>a]:text-[11px] max-[1250px]:[&>a]:px-2 max-[1050px]:flex-row max-[1050px]:flex-wrap max-[1050px]:gap-1.75 max-[1050px]:[&>a]:text-[11px] max-[1050px]:[&>a]:py-2.25 max-[1050px]:[&>a]:px-2.75 max-[1050px]:[&>a]:border max-[1050px]:[&>a]:border-solid max-[1050px]:[&>a]:border-(--a-border) max-[1050px]:[&>span]:hidden max-[760px]:gap-1.75 max-[760px]:[&>a]:text-[11px] max-[480px]:gap-1.5 max-[480px]:[&>a]:text-[10px] max-[480px]:[&>a]:py-2 max-[480px]:[&>a]:px-2.25 max-[480px]:[&>a]:gap-1.5 max-[480px]:[&>a>svg]:w-3.75 max-[480px]:[&>a:last-of-type]:hidden"
          aria-label="Settings sections"
        >
          {sections.map((item) => (
            <Link
              key={item.id}
              to="/app/settings"
              search={{ section: item.id }}
              data-ui={section === item.id ? "active" : ""}
            >
              <AppIcon name={item.icon} size={19} />
              {item.label}
            </Link>
          ))}
          <div
            data-ui="a-settings-nav-divider"
            className="h-px bg-(--a-border) my-3.75 mx-2.25 max-[1050px]:hidden"
          />
          <button
            onClick={async () => {
              try {
                const result = await authClient.signOut();
                if (result.error) {
                  notify(result.error.message || "Could not sign out.");
                  return;
                }
                window.location.assign("/sign-in");
              } catch {
                notify("Could not sign out. Please try again.");
              }
            }}
          >
            <AppIcon name="logout" size={18} />
            Sign out
          </button>
          <span>
            Drocsid · made in the open
            <br />
            Early access
          </span>
        </nav>
        <div data-ui="a-settings-content" className="min-w-0 max-w-205">
          {section === "profile" && (
            <>
              <div
                data-ui="a-section-title"
                className="mb-6.75 [&_h2]:text-[25px] [&_h2]:mb-2.25 [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.7] max-[760px]:[&_h2]:text-[26px] max-[760px]:[&_p]:text-[13px] max-[480px]:[&_h2]:text-[25px]"
              >
                <h2>Your little introduction.</h2>
                <p>A name, a few words, a little bit of you.</p>
              </div>
              <form
                data-ui="a-profile-form"
                className="grid grid-cols-[minmax(0,1fr)_215px] gap-7.5 [align-items:start] max-[1250px]:grid-cols-[minmax(0,1fr)_180px] max-[1250px]:gap-5.5 max-[1050px]:grid-cols-[minmax(0,1fr)_200px] max-[760px]:grid-cols-[minmax(0,1fr)_200px] max-[480px]:flex max-[480px]:flex-col max-[480px]:gap-7 max-[480px]:**:data-[ui~=a-form]:gap-4.75"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (name.trim().length < 2) {
                    setError("Your name needs at least 2 characters.");
                    return;
                  }
                  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
                    setError(
                      "Use 3–24 lowercase letters, numbers, or underscores for your username.",
                    );
                    return;
                  }
                  if (
                    ["everyone", "admin", "you"].includes(handle) ||
                    state.people.some((person) => person.handle === handle)
                  ) {
                    setError(
                      "That username is reserved or already taken. Try another one.",
                    );
                    return;
                  }
                  const saved = await setState((previous) => ({
                    ...previous,
                    profile: {
                      ...previous.profile,
                      name: name.trim(),
                      handle,
                      bio: bio.trim(),
                      activity: activity.trim(),
                      color,
                    },
                  }));
                  if (!saved) return;
                  setError("");
                  notify("Looking like you. Profile saved.");
                }}
              >
                <div
                  data-ui="a-profile-form-fields a-form"
                  className="flex flex-col gap-5 [&>label]:block [&>label]:font-[550] [&>label]:text-xs/normal [&_label_input]:block [&_label_input]:w-full [&_label_input]:min-h-10.5 [&_label_input]:py-2.75 [&_label_input]:px-3 [&_label_input]:mt-1.75 [&_label_input]:text-[13px] [&_label_input]:font-normal [&_label_input]:leading-[1.65] [&_label_textarea]:block [&_label_textarea]:w-full [&_label_textarea]:min-h-10.5 [&_label_textarea]:py-2.75 [&_label_textarea]:px-3 [&_label_textarea]:mt-1.75 [&_label_textarea]:text-[13px] [&_label_textarea]:font-normal [&_label_textarea]:leading-[1.65] [&_label_textarea]:resize-y [&_label_select]:block [&_label_select]:w-full [&_label_select]:min-h-10.5 [&_label_select]:py-2.75 [&_label_select]:px-3 [&_label_select]:mt-1.75 [&_label_select]:text-[13px] [&_label_select]:font-normal [&_label_select]:leading-[1.65] max-[760px]:[&_label_input]:text-[16px] max-[760px]:[&_label_textarea]:text-[16px] max-[760px]:[&_label_select]:text-[16px] max-[760px]:[&_label_input::placeholder]:text-[13px] max-[760px]:[&_label_textarea::placeholder]:text-[13px] max-[480px]:w-full"
                >
                  <AvatarUpload person={preview} />
                  <label>
                    Display name
                    <input
                      value={name}
                      maxLength={40}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Username
                    <div
                      data-ui="a-input-prefix"
                      className="flex items-center relative [&>span]:absolute [&>span]:left-3.25 [&>span]:top-5 [&>span]:text-(--a-faint) [&_input]:pl-7.25!"
                    >
                      <span>@</span>
                      <input
                        value={handle}
                        onChange={(event) =>
                          setHandle(
                            event.target.value.toLowerCase().replace(/\s/g, ""),
                          )
                        }
                        maxLength={24}
                        required
                      />
                    </div>
                  </label>
                  <label>
                    A little about you
                    <textarea
                      value={bio}
                      rows={4}
                      maxLength={200}
                      onChange={(event) => setBio(event.target.value)}
                      placeholder="Your interests, your current rabbit hole, or just a hello."
                    />
                    <small
                      data-ui="a-field-counter"
                      className="block text-right font-normal text-[10px] text-(--a-faint) mt-1.25"
                    >
                      {bio.length}/200
                    </small>
                  </label>
                  <label>
                    Your status
                    <input
                      value={activity}
                      onChange={(event) => setActivity(event.target.value)}
                      maxLength={45}
                      placeholder="What are you up to?"
                    />
                  </label>
                  <fieldset
                    data-ui="a-color-field"
                    className="border-0 border-none border-[currentColor] p-0 m-0 [&_legend]:p-0 [&_legend]:mb-3 [&_legend]:text-[12px] [&_legend]:font-[550] [&>div]:flex [&>div]:items-center [&>div]:gap-2.5 [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:rounded-full [&_button]:size-7.25 [&_button[data-ui~=selected]]:[outline:1px_solid_var(--a-green)] [&_button[data-ui~=selected]]:outline-offset-[3px]"
                  >
                    <legend>Your color</legend>
                    <div>
                      {["blue", "peach", "purple", "green", "yellow"].map(
                        (tone) => (
                          <button
                            type="button"
                            key={tone}
                            aria-label={`${tone} avatar color`}
                            aria-pressed={color === tone}
                            data-ui={`tone-${tone} ${color === tone ? "selected" : ""}`}
                            className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249]"
                            onClick={() => setColor(tone)}
                          >
                            {color === tone && (
                              <AppIcon name="check" size={16} />
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  </fieldset>
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
                    data-ui="a-save-row"
                    className="flex items-center gap-3.75 [border-top-width:1px] [border-top-style:solid] border-t-(--a-border) pt-5.5 mt-1.5 [&>span]:text-[10px] [&>span]:text-(--a-muted) max-[760px]:flex-wrap max-[760px]:gap-2.5"
                  >
                    <button
                      data-ui="a-button primary"
                      className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=primary]:bg-(--a-orange) data-[ui~=primary]:text-[#462419] [&[data-ui~=primary]:hover:not(:disabled)]:bg-[#f37954]"
                      type="submit"
                      disabled={!dirty}
                    >
                      Save changes <AppIcon name="check" size={17} />
                    </button>
                    <span>
                      {dirty
                        ? "A few little changes to save."
                        : "All up to date."}
                    </span>
                  </div>
                </div>
                <div
                  data-ui="a-profile-preview"
                  className="*:data-[ui~=a-eyebrow]:text-[8px] *:data-[ui~=a-eyebrow]:mb-3 *:data-[ui~=a-eyebrow]:tracking-[0.6px] [&>p]:text-(--a-faint) [&>p]:text-[11px] [&>p]:italic [&>p]:text-center [&>p]:mt-3.75 max-[760px]:**:data-[ui~=a-eyebrow]:text-[8px] max-[480px]:w-full max-[480px]:max-w-65 max-[480px]:-order-1 max-[480px]:self-center max-[480px]:*:data-[ui~=a-eyebrow]:hidden max-[480px]:[&>p]:hidden"
                >
                  <span
                    data-ui="a-eyebrow"
                    className="block font-mono text-[9px] font-normal tracking-[1.3px] leading-[1.6] text-(--a-muted)"
                  >
                    A LITTLE PREVIEW OF YOU
                  </span>
                  <div
                    data-ui="a-profile-preview-card"
                    className="border border-solid border-(--a-border) rounded-[9px] bg-(--a-surface) overflow-hidden [&>div]:h-18.5 [&>div]:flex [&>div]:justify-end [&>div]:p-4.25 [&>div>svg]:opacity-60 [&>div>svg]:transform-[rotate(15deg)] [&_section]:relative [&_section]:pt-9.75 [&_section]:pb-5.75 [&_section]:px-4.25 **:data-[ui~=a-avatar]:absolute **:data-[ui~=a-avatar]:-top-7 **:data-[ui~=a-avatar]:border-[5px] **:data-[ui~=a-avatar]:border-solid **:data-[ui~=a-avatar]:border-(--a-surface) **:data-[ui~=a-avatar]:rounded-[25px] [&_[data-ui~=a-avatar]_[data-ui~=avatar]]:rounded-[17px] [&_[data-ui~=a-avatar]_[data-ui~=avatar]]:text-[21px] [&_[data-ui~=a-avatar]_[data-ui~=avatar]]:size-12.75 [&_h3]:text-[16px] [&_h3]:mt-0 [&_h3]:mb-1 [&_h3]:mx-0 [&_h3]:wrap-anywhere [&_section>span:not([data-ui~=a-avatar])]:text-(--a-faint) [&_section>span:not([data-ui~=a-avatar])]:text-[10px] [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:my-3.75 [&_p]:whitespace-pre-wrap [&_p]:wrap-anywhere [&_section>small]:flex [&_section>small]:items-center [&_section>small]:gap-1.25 [&_section>small]:text-(--a-muted) [&_section>small]:text-[9px] [&_section>small]:leading-[1.6] max-[480px]:[&>div]:h-15.25 max-[480px]:[&_section]:pt-8.5 max-[480px]:[&_section]:pb-5 max-[480px]:[&_section]:px-4 max-[480px]:[&_h3]:text-[18px] max-[480px]:[&_p]:text-[12px] max-[480px]:[&_p]:my-3"
                  >
                    <div
                      data-ui={`tone-${color}`}
                      className="data-[ui~=tone-peach]:bg-[#f2bc95] data-[ui~=tone-peach]:text-[#885130] data-[ui~=tone-green]:bg-[#d4dfbd] data-[ui~=tone-green]:text-[#6b7d47] data-[ui~=tone-purple]:bg-[#e3dced] data-[ui~=tone-purple]:text-[#867296] data-[ui~=tone-blue]:bg-[#d6e4e7] data-[ui~=tone-blue]:text-[#64838d] data-[ui~=tone-yellow]:bg-[#eee1bb] data-[ui~=tone-yellow]:text-[#9b8249]"
                    >
                      <AppIcon name="sun" size={43} />
                    </div>
                    <section>
                      <PersonAvatar person={preview} large presence />
                      <h3>{name || "Your name"}</h3>
                      <span>@{handle || "yourname"}</span>
                      <p>{bio || "Sometimes a hello says enough."}</p>
                      <small>
                        <i
                          data-ui="a-status-dot online"
                          className="data-[ui~=online]:bg-[#2ee68b] inline-block rounded-full shrink-0 size-1.5"
                        />
                        {activity || "Happy to be here"}
                      </small>
                    </section>
                  </div>
                  <p>Looks good on you.</p>
                </div>
              </form>
            </>
          )}
          {section === "appearance" && (
            <>
              <div
                data-ui="a-section-title"
                className="mb-6.75 [&_h2]:text-[25px] [&_h2]:mb-2.25 [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.7] max-[760px]:[&_h2]:text-[26px] max-[760px]:[&_p]:text-[13px] max-[480px]:[&_h2]:text-[25px]"
              >
                <h2>Settle into your surroundings.</h2>
                <p>A few little choices to make this place feel right.</p>
              </div>
              <h3
                data-ui="a-settings-label"
                className="text-[13px]! tracking-normal! mb-4!"
              >
                Choose your light
              </h3>
              <div
                data-ui="a-theme-options"
                className="grid grid-cols-2 gap-4 max-[480px]:gap-2.75"
              >
                {(["light", "dark"] as const).map((theme) => (
                  <button
                    key={theme}
                    data-ui={`a-theme-choice ${theme} ${state.preferences.theme === theme ? "selected" : ""}`}
                    className="block text-left p-3.25 bg-(--a-surface) rounded-[9px] border! border-solid! border-(--a-border)! data-[ui~=selected]:border-[#a5b68c]! data-[ui~=selected]:shadow-[0_0_0_2px_#b4c79822] [&[data-ui~=dark]_[data-ui~=a-theme-mini]]:bg-[#171717] [&[data-ui~=dark]_[data-ui~=a-theme-mini]]:border-[#343434] [&[data-ui~=dark]_[data-ui~=a-theme-mini]>i]:bg-[#111111] [&[data-ui~=dark]_[data-ui~=a-theme-mini]>i]:border-[#343434] [&[data-ui~=dark]_[data-ui~=a-theme-mini]_b]:bg-[#626262] [&[data-ui~=dark]_[data-ui~=a-theme-mini]_em]:bg-[#2d2d2d] [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&>span]:text-[12px] [&>span]:font-[550] [&>span]:mt-3.25 [&>span]:mb-1.75 [&>span]:mx-0 [&>span>svg:last-child]:ml-auto [&>span>svg:last-child]:text-(--a-green) [&>small]:block [&>small]:text-[10px] [&>small]:text-(--a-muted) [&>small]:leading-normal [[data-ui~=theme-dark]_&[data-ui~=selected]]:border-(--a-orange)! [[data-ui~=theme-dark]_&[data-ui~=selected]]:shadow-[0_0_0_2px_#f45e381a] max-[760px]:[&>small]:text-[11px] max-[480px]:p-2.5 max-[480px]:[&>span]:text-[11px] max-[480px]:[&>span]:gap-1.25 max-[480px]:[&>small]:text-[9px] max-[480px]:[&>span>svg]:w-3.75"
                    aria-pressed={state.preferences.theme === theme}
                    onClick={() => updatePreference("theme", theme)}
                  >
                    <div
                      data-ui="a-theme-mini"
                      className="flex h-25.5 bg-[#fcfcf7] border border-solid border-[#dfe5d4] rounded-md overflow-hidden [&>i]:w-[24%] [&>i]:bg-[#e6ecda] [&>i]:[border-right-width:1px] [&>i]:[border-right-style:solid] [&>i]:border-r-[#d6e1c5] [&>span]:flex-1 [&>span]:p-4 [&_b]:block [&_b]:w-[85%] [&_b]:h-1.25 [&_b]:rounded-xs [&_b]:bg-[#dbe0d2] [&_b]:mb-2 [&_b:nth-child(2)]:w-[66%] [&_em]:block [&_em]:w-full [&_em]:h-3.5 [&_em]:rounded-[3px] [&_em]:bg-[#ecefe3] [&_em]:mt-3.75 max-[480px]:h-21 max-[480px]:[&>span]:p-2.75"
                    >
                      <i />
                      <span>
                        <b />
                        <b />
                        <b />
                        <em />
                      </span>
                    </div>
                    <span>
                      <AppIcon
                        name={theme === "light" ? "sun" : "moon"}
                        size={18}
                      />
                      {theme === "light" ? "Daylight" : "After hours"}
                      {state.preferences.theme === theme && (
                        <AppIcon name="checkCircle" size={18} />
                      )}
                    </span>
                    <small>
                      {theme === "light"
                        ? "Warm paper. A little room to breathe."
                        : "A softer glow for the late-night ideas."}
                    </small>
                  </button>
                ))}
              </div>
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <h3
                data-ui="a-settings-label"
                className="text-[13px]! tracking-normal! mb-4!"
              >
                Room between thoughts
              </h3>
              <div
                data-ui="a-segmented"
                className="inline-flex items-center gap-1 border border-solid border-(--a-border) bg-(--a-soft) p-1 rounded-[7px] [&_button]:min-w-30 [&_button]:py-2.25 [&_button]:px-3.75 [&_button]:bg-transparent [&_button]:rounded-[5px] [&_button]:text-(--a-muted) [&_button]:text-[12px] [&_button[data-ui~=active]]:bg-(--a-surface) [&_button[data-ui~=active]]:text-(--a-text) [&_button[data-ui~=active]]:shadow-[0_1px_4px_#1b2d0c12]"
              >
                {(["comfortable", "compact"] as const).map((density) => (
                  <button
                    data-ui={
                      state.preferences.density === density ? "active" : ""
                    }
                    key={density}
                    aria-pressed={state.preferences.density === density}
                    onClick={() => updatePreference("density", density)}
                  >
                    {density === "comfortable" ? "Comfortable" : "Compact"}
                  </button>
                ))}
              </div>
              <p
                data-ui="a-setting-help"
                className="text-(--a-muted) text-[12px] leading-[1.8] mt-3.25!"
              >
                Change the space between messages in your conversations.
              </p>
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <h3
                data-ui="a-settings-label"
                className="text-[13px]! tracking-normal! mb-4!"
              >
                A comfortable reading size
              </h3>
              <div
                data-ui="a-segmented"
                className="inline-flex items-center gap-1 border border-solid border-(--a-border) bg-(--a-soft) p-1 rounded-[7px] [&_button]:min-w-30 [&_button]:py-2.25 [&_button]:px-3.75 [&_button]:bg-transparent [&_button]:rounded-[5px] [&_button]:text-(--a-muted) [&_button]:text-[12px] [&_button[data-ui~=active]]:bg-(--a-surface) [&_button[data-ui~=active]]:text-(--a-text) [&_button[data-ui~=active]]:shadow-[0_1px_4px_#1b2d0c12]"
              >
                {(["default", "large"] as const).map((fontSize) => (
                  <button
                    data-ui={
                      state.preferences.fontSize === fontSize ? "active" : ""
                    }
                    key={fontSize}
                    aria-pressed={state.preferences.fontSize === fontSize}
                    onClick={() => updatePreference("fontSize", fontSize)}
                  >
                    {fontSize === "default" ? "Just right" : "A little bigger"}
                  </button>
                ))}
              </div>
              <div
                data-ui="a-font-preview"
                className="text-(length:--a-font) bg-(--a-soft) border border-solid border-(--a-border) p-5 rounded-[7px] mt-4.5"
              >
                The best conversations feel like coming home.
              </div>
              <p
                data-ui="a-setting-help"
                className="text-(--a-muted) text-[12px] leading-[1.8] mt-3.25!"
              >
                Your preferences save automatically on this device.
              </p>
            </>
          )}
          {section === "notifications" && (
            <>
              <div
                data-ui="a-section-title"
                className="mb-6.75 [&_h2]:text-[25px] [&_h2]:mb-2.25 [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.7] max-[760px]:[&_h2]:text-[26px] max-[760px]:[&_p]:text-[13px] max-[480px]:[&_h2]:text-[25px]"
              >
                <h2>A little less interruption.</h2>
                <p>Choose what gets your attention. Quiet is good, too.</p>
              </div>
              <div
                data-ui="a-settings-callout"
                className="flex [align-items:start] gap-3.5 bg-(--a-soft) border border-solid border-(--a-border) rounded-lg p-4.75 mb-3 text-(--a-muted) [&>svg]:shrink-0 [&>svg]:text-(--a-green) [&_strong]:block [&_strong]:text-(--a-text) [&_strong]:text-[13px] [&_strong]:font-[550] [&_strong]:mb-1.75 [&_p]:text-[12px] [&_p]:leading-[1.8] max-[760px]:[&_p]:text-[12px] max-[480px]:p-4.25 max-[480px]:gap-2.75 max-[480px]:[&_p]:text-[12px]"
              >
                <AppIcon name="bell" size={23} />
                <div>
                  <strong>Your notification preferences</strong>
                  <p>
                    These preferences control your in-app notifications. Browser
                    push and email notifications are not enabled yet.
                  </p>
                </div>
              </div>
              <Toggle
                label="Message notifications"
                description="Keep up with new conversations in your communities."
                checked={state.preferences.notifications}
                onChange={(value) => updatePreference("notifications", value)}
              />
              <Toggle
                label="Mentions & replies"
                description="A little nudge when someone has something just for you."
                checked={state.preferences.mentions}
                onChange={(value) => updatePreference("mentions", value)}
              />
              <Toggle
                label="Notification sounds"
                description="A gentle sound when a new message comes in."
                checked={state.preferences.sounds}
                onChange={(value) => updatePreference("sounds", value)}
              />
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <h3
                data-ui="a-settings-label"
                className="text-[13px]! tracking-normal! mb-4!"
              >
                Quiet corners
              </h3>
              <p
                data-ui="a-setting-help"
                className="text-(--a-muted) text-[12px] leading-[1.8] mt-3.25!"
              >
                {state.muted.length
                  ? `${state.muted.length} conversations muted. Use the bell in a conversation to unmute it.`
                  : "No conversations muted. Use the bell in any conversation for a little quiet."}
              </p>
              {state.muted.length > 0 && (
                <button
                  data-ui="a-button secondary"
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                  onClick={() => {
                    setState((previous) => ({ ...previous, muted: [] }));
                    notify("All conversations unmuted.");
                  }}
                >
                  Unmute all conversations
                </button>
              )}
            </>
          )}
          {section === "privacy" && (
            <>
              <div
                data-ui="a-section-title"
                className="mb-6.75 [&_h2]:text-[25px] [&_h2]:mb-2.25 [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.7] max-[760px]:[&_h2]:text-[26px] max-[760px]:[&_p]:text-[13px] max-[480px]:[&_h2]:text-[25px]"
              >
                <h2>Your space. Your boundaries.</h2>
                <p>Being part of a community should feel comfortable.</p>
              </div>
              <Toggle
                label="Message requests from community members"
                description="Let non-friends in your communities send message requests. You decide which requests to accept."
                checked={state.preferences.directMessages}
                onChange={(value) => updatePreference("directMessages", value)}
              />
              <Toggle
                label="Show your activity"
                description="Let people see the little status you’ve set on your profile."
                checked={state.preferences.activity}
                onChange={(value) => updatePreference("activity", value)}
              />
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <h3
                data-ui="a-settings-label"
                className="text-[13px]! tracking-normal! mb-4!"
              >
                Blocked people
              </h3>
              <p
                data-ui="a-setting-help"
                className="text-(--a-muted) text-[12px] leading-[1.8] mt-3.25!"
              >
                People you block can’t exchange direct messages with you until
                you unblock them.
              </p>
              {state.blocked.length === 0 ? (
                <div
                  data-ui="a-settings-callout"
                  className="flex [align-items:start] gap-3.5 bg-(--a-soft) border border-solid border-(--a-border) rounded-lg p-4.75 mb-3 text-(--a-muted) [&>svg]:shrink-0 [&>svg]:text-(--a-green) [&_strong]:block [&_strong]:text-(--a-text) [&_strong]:text-[13px] [&_strong]:font-[550] [&_strong]:mb-1.75 [&_p]:text-[12px] [&_p]:leading-[1.8] max-[760px]:[&_p]:text-[12px] max-[480px]:p-4.25 max-[480px]:gap-2.75 max-[480px]:[&_p]:text-[12px]"
                >
                  <AppIcon name="shield" size={22} />
                  <p>
                    You haven’t blocked anyone. You can do this from a person’s
                    profile.
                  </p>
                </div>
              ) : (
                state.people
                  .filter((p) => state.blocked.includes(p.id))
                  .map((person) => (
                    <div
                      key={person.id}
                      data-ui="a-picker-person"
                      className="flex items-center gap-2.75 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) py-4 px-0 [&>span:nth-child(2)]:flex-1 [&>span:nth-child(2)]:min-w-0 [&_strong]:block [&_strong]:text-[12px] [&_strong]:font-[550] [&_small]:block [&_small]:text-[10px] [&_small]:text-(--a-faint) [&_small]:mt-1 max-[480px]:gap-2.25 max-[480px]:[&_strong]:text-[12px] max-[480px]:**:data-[ui~=a-button]:text-[10px]! max-[480px]:**:data-[ui~=a-button]:py-1.5 max-[480px]:**:data-[ui~=a-button]:px-2.25"
                    >
                      <PersonAvatar person={person} />
                      <span>
                        <strong>{person.name}</strong>
                        <small>@{person.handle}</small>
                      </span>
                      <button
                        data-ui="a-button secondary small"
                        className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! data-[ui~=small]:min-h-7.75 data-[ui~=small]:py-1.5 data-[ui~=small]:px-2.75 data-[ui~=small]:text-[11px]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                        onClick={() =>
                          setState((previous) => ({
                            ...previous,
                            blocked: previous.blocked.filter(
                              (id) => id !== person.id,
                            ),
                          }))
                        }
                      >
                        Unblock
                      </button>
                    </div>
                  ))
              )}
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <p className="text-xs text-(--a-muted)">
                Sign in with a one-time code sent to your email.
              </p>
            </>
          )}
          {section === "data" && (
            <>
              <div
                data-ui="a-section-title"
                className="mb-6.75 [&_h2]:text-[25px] [&_h2]:mb-2.25 [&_p]:text-[12px] [&_p]:text-(--a-muted) [&_p]:leading-[1.7] max-[760px]:[&_h2]:text-[26px] max-[760px]:[&_p]:text-[13px] max-[480px]:[&_h2]:text-[25px]"
              >
                <h2>Your data, in your hands.</h2>
                <p>A little clarity about what lives where.</p>
              </div>
              <div
                data-ui="a-data-card"
                className="p-6.25 border border-solid border-(--a-border) bg-(--a-soft) rounded-[9px] [&>svg]:text-(--a-green) [&>svg]:mb-4.25 [&_h3]:text-[20px] [&_h3]:mb-3.25 [&_p]:text-(--a-muted) [&_p]:text-[13px] [&_p]:leading-[1.85] [&_p]:mt-3 [&>span]:block [&>span]:text-[10px] [&>span]:text-(--a-faint) [&>span]:mt-5.25 max-[480px]:p-5.25 max-[480px]:[&_p]:text-[13px]"
              >
                <AppIcon name="code" size={27} />
                <h3>Connected to your community.</h3>
                <p>
                  Your account, conversations, and preferences are stored on
                  this server. Message attachments are stored privately with
                  Byteship.
                </p>
                <p>
                  Unsent drafts stay in this tab and are cleared when you leave.
                </p>
                <span>
                  {state.messages.length} loaded messages ·{" "}
                  {state.communities.filter((c) => c.joined).length} joined
                  communities
                </span>
              </div>
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <div
                data-ui="a-setting-action"
                className="flex items-center justify-between gap-6.25 [&_h3]:text-[14px] [&_h3]:tracking-normal [&_p]:text-(--a-muted) [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:mt-1.75 max-[760px]:gap-5 max-[480px]:[align-items:start] max-[480px]:flex-col max-[480px]:gap-3.75 max-[480px]:**:data-[ui~=a-button]:[align-self:start]"
              >
                <div>
                  <h3>Keep a copy</h3>
                  <p>
                    Download the data currently loaded in this tab as a JSON
                    file.
                  </p>
                </div>
                <button
                  data-ui="a-button secondary"
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=secondary]:bg-(--a-surface) data-[ui~=secondary]:text-(--a-text) data-[ui~=secondary]:border-(--a-border)! [&[data-ui~=secondary]:hover:not(:disabled)]:bg-(--a-hover) [&[data-ui~=secondary]:hover:not(:disabled)]:border-[#b8c2a8]! [[data-ui~=theme-dark]_&[data-ui~=secondary]:hover:not(:disabled)]:border-[#626262]!"
                  onClick={exportData}
                >
                  Export loaded data <AppIcon name="external" size={16} />
                </button>
              </div>
              <div
                data-ui="a-settings-divider"
                className="h-px bg-(--a-border) my-6.75"
              />
              <div
                data-ui="a-setting-action"
                className="flex items-center justify-between gap-6.25 [&_h3]:text-[14px] [&_h3]:tracking-normal [&_p]:text-(--a-muted) [&_p]:text-[12px] [&_p]:leading-[1.8] [&_p]:mt-1.75 max-[760px]:gap-5 max-[480px]:[align-items:start] max-[480px]:flex-col max-[480px]:gap-3.75 max-[480px]:**:data-[ui~=a-button]:[align-self:start]"
              >
                <div>
                  <h3>A fresh start</h3>
                  <p>Clear your unsent drafts in this tab.</p>
                </div>
                <button
                  data-ui="a-button danger-outline"
                  className="inline-flex justify-center items-center gap-2.25 min-h-10 py-2.5 px-4 rounded-md leading-[1.4] [transition:background_0.15s,border-color_0.15s] whitespace-nowrap border! border-solid! border-transparent! font-[550]! text-[12px]! data-[ui~=danger-outline]:text-[#b5674d] data-[ui~=danger-outline]:bg-transparent data-[ui~=danger-outline]:border-[#dfb9a8]! [&[data-ui~=danger-outline]:hover]:bg-[#be624911]"
                  onClick={() =>
                    setModal({
                      type: "confirm",
                      title: "Start fresh?",
                      description: "Unsent drafts in this tab will be cleared.",
                      label: "Clear drafts",
                      action: reset,
                    })
                  }
                >
                  Clear drafts <AppIcon name="reset" size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
