import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { Logo } from "../ui";
import { AppIcon } from "./primitives";
import { AvatarUpload } from "./avatar-upload";
export function WelcomePage() {
  const { state, setState, notify, setModal } = useApp();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState(state.profile.name);
  const [color, setColor] = useState(state.profile.color);
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => {
    setName(state.profile.name);
    setColor(state.profile.color);
  }, [state.profile.name, state.profile.color]);
  async function finish(mode: "join" | "skip" | "create" = "join") {
    if (saving || uploading) return;
    setSaving(true);
    const saved = await setState((previous) => ({
      ...previous,
      profile: {
        ...previous.profile,
        name: name.trim().length >= 2 ? name.trim() : previous.profile.name,
        color,
      },
      communities: previous.communities.map((c) =>
        mode === "join" && selected.includes(c.id) ? { ...c, joined: true } : c,
      ),
      onboardingComplete: true,
    }));
    setSaving(false);
    if (!saved) return;
    if (mode === "create") {
      await navigate({ to: "/app" });
      setModal({ type: "create-community" });
    } else {
      notify("Welcome to Drocsid.");
      void navigate({ to: "/app" });
    }
  }
  return (
    <div className="a-welcome-page">
      <header>
        <Logo />
        <button
          type="button"
          className="a-text-link"
          disabled={saving || uploading}
          onClick={() => void finish("skip")}
        >
          Skip for now <AppIcon name="right" size={17} />
        </button>
      </header>
      <div className="a-welcome-content">
        <div className="a-welcome-progress">
          <span className="active">1</span>
          <i />
          <span className={step === 2 ? "active" : ""}>2</span>
        </div>
        <span className="a-eyebrow">
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
            className="a-welcome-form a-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim().length >= 2 && !uploading) setStep(2);
            }}
          >
            <AvatarUpload
              person={{ ...state.profile, name: name || "You", color }}
              onBusyChange={setUploading}
            />
            <div className="a-color-field">
              <div>
                {["blue", "peach", "purple", "green", "yellow"].map((tone) => (
                  <button
                    type="button"
                    key={tone}
                    className={`tone-${tone} ${color === tone ? "selected" : ""}`}
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
              What should we call you?
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                minLength={2}
                maxLength={40}
                required
              />
            </label>
            <button
              className="a-button primary full"
              type="submit"
              disabled={name.trim().length < 2 || uploading}
            >
              That’s me. What’s next? <AppIcon name="right" size={18} />
            </button>
          </form>
        ) : (
          <>
            <div className="a-welcome-communities">
              {state.communities.slice(0, 6).map((community) => (
                <button
                  disabled={saving}
                  key={community.id}
                  className={`a-welcome-choice ${selected.includes(community.id) ? "selected" : ""}`}
                  aria-pressed={selected.includes(community.id)}
                  onClick={() =>
                    setSelected((previous) =>
                      previous.includes(community.id)
                        ? previous.filter((id) => id !== community.id)
                        : [...previous, community.id],
                    )
                  }
                >
                  <span className={`a-community-icon tone-${community.color}`}>
                    <AppIcon name={community.icon} size={29} />
                  </span>
                  <strong>{community.name}</strong>
                  <small>{community.category}</small>
                  <span className="a-choice-check">
                    {selected.includes(community.id) && (
                      <AppIcon name="check" size={14} />
                    )}
                  </span>
                </button>
              ))}
              <button
                className="a-welcome-choice a-welcome-create"
                disabled={saving}
                onClick={() => void finish("create")}
              >
                <span className="a-community-icon">
                  <AppIcon name="plus" size={29} />
                </span>
                <strong>Create mine</strong>
                <small>Start your own community</small>
              </button>
            </div>
            <div className="a-welcome-actions">
              <button
                className="a-button secondary"
                disabled={saving}
                onClick={() => setStep(1)}
              >
                <AppIcon name="left" size={17} />
                Back
              </button>
              <button
                className="a-button primary"
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
              className="a-text-link a-welcome-skip"
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
