import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import type { Preferences } from "../../lib/demo-data";
import { AppIcon, PageHeading, PersonAvatar, Toggle } from "./primitives";
import type { IconName } from "./primitives";

const sections: { id: string; label: string; icon: IconName }[] = [
  { id: "profile", label: "Your profile", icon: "people" },
  { id: "appearance", label: "Look & feel", icon: "brush" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "privacy", label: "Privacy & boundaries", icon: "shield" },
  { id: "data", label: "Your preview", icon: "code" },
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
  }, [state.profile]);
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
    link.download = "drocsid-preview.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Your preview is ready to keep.");
  }
  return (
    <div className="a-page a-settings-page">
      <PageHeading
        eyebrow="MAKE YOURSELF COMFORTABLE"
        title="A little more you."
        description="Your corner should feel like your corner."
      />
      <div className="a-settings-layout">
        <nav className="a-settings-nav" aria-label="Settings sections">
          {sections.map((item) => (
            <Link
              key={item.id}
              to="/app/settings"
              search={{ section: item.id }}
              className={section === item.id ? "active" : ""}
            >
              <AppIcon name={item.icon} size={19} />
              {item.label}
            </Link>
          ))}
          <div className="a-settings-nav-divider" />
          <Link to="/sign-in">
            <AppIcon name="logout" size={18} />
            Back to sign in
          </Link>
          <span>
            drocsid · made in the open
            <br />
            Frontend preview v0.1
          </span>
        </nav>
        <div className="a-settings-content">
          {section === "profile" && (
            <>
              <div className="a-section-title">
                <h2>Your little introduction.</h2>
                <p>A name, a few words, a little bit of you.</p>
              </div>
              <form
                className="a-profile-form"
                onSubmit={(event) => {
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
                  setState((previous) => ({
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
                  setError("");
                  notify("Looking like you. Profile saved.");
                }}
              >
                <div className="a-profile-form-fields a-form">
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
                    <div className="a-input-prefix">
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
                    <small className="a-field-counter">{bio.length}/200</small>
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
                  <fieldset className="a-color-field">
                    <legend>Your color</legend>
                    <div>
                      {["blue", "peach", "purple", "green", "yellow"].map(
                        (tone) => (
                          <button
                            type="button"
                            key={tone}
                            aria-label={`${tone} avatar color`}
                            aria-pressed={color === tone}
                            className={`tone-${tone} ${color === tone ? "selected" : ""}`}
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
                    <p className="a-form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="a-save-row">
                    <button
                      className="a-button primary"
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
                <div className="a-profile-preview">
                  <span className="a-eyebrow">A LITTLE PREVIEW OF YOU</span>
                  <div className="a-profile-preview-card">
                    <div className={`tone-${color}`}>
                      <AppIcon name="sun" size={43} />
                    </div>
                    <section>
                      <PersonAvatar person={preview} large presence />
                      <h3>{name || "Your name"}</h3>
                      <span>@{handle || "yourname"}</span>
                      <p>{bio || "Sometimes a hello says enough."}</p>
                      <small>
                        <i className="a-status-dot online" />
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
              <div className="a-section-title">
                <h2>Settle into your surroundings.</h2>
                <p>A few little choices to make this place feel right.</p>
              </div>
              <h3 className="a-settings-label">Choose your light</h3>
              <div className="a-theme-options">
                {(["light", "dark"] as const).map((theme) => (
                  <button
                    key={theme}
                    className={`a-theme-choice ${theme} ${state.preferences.theme === theme ? "selected" : ""}`}
                    aria-pressed={state.preferences.theme === theme}
                    onClick={() => updatePreference("theme", theme)}
                  >
                    <div className="a-theme-mini">
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
              <div className="a-settings-divider" />
              <h3 className="a-settings-label">Room between thoughts</h3>
              <div className="a-segmented">
                {(["comfortable", "compact"] as const).map((density) => (
                  <button
                    className={
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
              <p className="a-setting-help">
                Change the space between messages in your conversations.
              </p>
              <div className="a-settings-divider" />
              <h3 className="a-settings-label">A comfortable reading size</h3>
              <div className="a-segmented">
                {(["default", "large"] as const).map((fontSize) => (
                  <button
                    className={
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
              <div className="a-font-preview">
                The best conversations feel like coming home.
              </div>
              <p className="a-setting-help">
                Your preferences save automatically on this device.
              </p>
            </>
          )}
          {section === "notifications" && (
            <>
              <div className="a-section-title">
                <h2>A little less interruption.</h2>
                <p>Choose what gets your attention. Quiet is good, too.</p>
              </div>
              <div className="a-settings-callout">
                <AppIcon name="bell" size={23} />
                <div>
                  <strong>Your notification preferences</strong>
                  <p>
                    These controls save your choices for the preview. Browser
                    and email notifications will come with the connected app.
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
              <div className="a-settings-divider" />
              <h3 className="a-settings-label">Quiet corners</h3>
              <p className="a-setting-help">
                {state.muted.length
                  ? `${state.muted.length} conversations muted. Use the bell in a conversation to unmute it.`
                  : "No conversations muted. Use the bell in any conversation for a little quiet."}
              </p>
              {state.muted.length > 0 && (
                <button
                  className="a-button secondary"
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
              <div className="a-section-title">
                <h2>Your space. Your boundaries.</h2>
                <p>Being part of a community should feel comfortable.</p>
              </div>
              <Toggle
                label="Direct messages from community members"
                description="Allow people in your communities to start a conversation with you. Saved as a preview preference."
                checked={state.preferences.directMessages}
                onChange={(value) => updatePreference("directMessages", value)}
              />
              <Toggle
                label="Show your activity"
                description="Let people see the little status you’ve set on your profile."
                checked={state.preferences.activity}
                onChange={(value) => updatePreference("activity", value)}
              />
              <div className="a-settings-divider" />
              <h3 className="a-settings-label">Blocked people</h3>
              <p className="a-setting-help">
                People you block can’t be messaged from this preview until you
                unblock them.
              </p>
              {state.blocked.length === 0 ? (
                <div className="a-settings-callout">
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
                    <div key={person.id} className="a-picker-person">
                      <PersonAvatar person={person} />
                      <span>
                        <strong>{person.name}</strong>
                        <small>@{person.handle}</small>
                      </span>
                      <button
                        className="a-button secondary small"
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
              <div className="a-settings-divider" />
              <Link to="/forgot-password" className="a-text-link">
                Need to reset your password?{" "}
                <AppIcon name="external" size={16} />
              </Link>
            </>
          )}
          {section === "data" && (
            <>
              <div className="a-section-title">
                <h2>Your preview, in your hands.</h2>
                <p>A little clarity about what lives where.</p>
              </div>
              <div className="a-data-card">
                <AppIcon name="code" size={27} />
                <h3>Just here, on this device.</h3>
                <p>
                  This is a frontend design preview. Conversations, communities,
                  and people are sample data. Changes are saved in your browser
                  so you can keep exploring.
                </p>
                <p>
                  No messages are delivered. No real accounts are created. No
                  credentials are stored.
                </p>
                <span>
                  {state.messages.length} sample messages ·{" "}
                  {state.communities.filter((c) => c.joined).length} joined
                  communities
                </span>
              </div>
              <div className="a-settings-divider" />
              <div className="a-setting-action">
                <div>
                  <h3>Keep a copy</h3>
                  <p>Download your local preview data as a JSON file.</p>
                </div>
                <button className="a-button secondary" onClick={exportData}>
                  Export preview <AppIcon name="external" size={16} />
                </button>
              </div>
              <div className="a-settings-divider" />
              <div className="a-setting-action">
                <div>
                  <h3>A fresh start</h3>
                  <p>
                    Restore the original people, conversations, and settings.
                  </p>
                </div>
                <button
                  className="a-button danger-outline"
                  onClick={() =>
                    setModal({
                      type: "confirm",
                      title: "Start fresh?",
                      description:
                        "Your local messages, new communities, and preferences will be replaced with the original sample data. This can’t be undone unless you export a copy first.",
                      label: "Reset preview",
                      action: reset,
                    })
                  }
                >
                  Reset preview <AppIcon name="reset" size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
