import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  Mail01Icon,
  Tick02Icon,
  AlertCircleIcon,
  GithubIcon,
} from "@hugeicons/core-free-icons";
import { Avatar, Icon, Logo } from "./ui";

type AuthMode = "sign-in" | "sign-up" | "forgot-password";
type Errors = Partial<Record<"name" | "email" | "password", string>>;
const copy = {
  "sign-in": {
    eyebrow: "YOUR CORNER IS WAITING",
    title: "Hey, welcome back.",
    description: "The conversation’s better with you in it.",
    submit: "Let me in",
    aside: (
      <>
        Right where <br />
        you <em>belong.</em>
      </>
    ),
  },
  "sign-up": {
    eyebrow: "THERE’S ROOM FOR YOU HERE",
    title: "Good to have you.",
    description: "A new account. A whole lot of possibility.",
    submit: "Make yourself at home",
    aside: (
      <>
        It starts with <br />a little <em>hello.</em>
      </>
    ),
  },
  "forgot-password": {
    eyebrow: "HAPPENS TO THE BEST OF US",
    title: "Lost your keys?",
    description: "Enter your email and we’ll help you find your way back.",
    submit: "Send reset link",
    aside: (
      <>
        Your people <br />
        are <em>still here.</em>
      </>
    ),
  },
};

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [complete, setComplete] = useState(false);
  const [socialNotice, setSocialNotice] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const content = copy[mode];
  const signup = mode === "sign-up";
  const recovery = mode === "forgot-password";
  const strength =
    Number(password.length >= 8) +
    Number(/[A-Z]/.test(password) && /[a-z]/.test(password)) +
    Number(/[0-9]/.test(password)) +
    Number(/[^a-zA-Z0-9]/.test(password));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (signup && name.trim().length < 2)
      nextErrors.name = "Give us a name with at least 2 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      nextErrors.email = "That email doesn’t look quite right. Try again?";
    if (!recovery && password.length < (signup ? 8 : 1))
      nextErrors.password = signup
        ? "Use at least 8 characters for your password."
        : "Pop in your password to continue.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    setComplete(true);
    setPassword("");
    requestAnimationFrame(() => successRef.current?.focus());
  }

  function clearError(field: keyof Errors) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  return (
    <main id="main" className="auth-page">
      <aside className="auth-story">
        <Logo />
        <div className="auth-story-main">
          <div className="auth-story-eyebrow">
            <span>✳</span> GOOD PEOPLE. GOOD COMPANY.
          </div>
          <h1>{content.aside}</h1>
          <p>
            For your people, your projects,
            <br />
            and your beautifully specific interests.
          </p>
          <div className="auth-conversation">
            <div className="auth-message">
              <Avatar name="Jamie" color="purple" />
              <div>
                <div className="auth-message-meta">
                  <strong>Jamie</strong>
                  <span>just now</span>
                </div>
                <p>hey! saved you a spot. 👋</p>
              </div>
            </div>
            <div className="auth-message reply">
              <Avatar name="You" color="green" />
              <div>
                <div className="auth-message-meta">
                  <strong>You</strong>
                  <span>just now</span>
                </div>
                <p>feels like my kind of place.</p>
              </div>
              <span className="auth-reaction">🧡 3</span>
            </div>
          </div>
          <span className="auth-handwritten">come as you are.</span>
        </div>
        <div className="auth-story-footer">
          <span className="story-footer-dot" /> OPEN SOURCE. OPEN DOOR. ALWAYS.
        </div>
      </aside>
      <section className="auth-form-side">
        <div className="auth-topbar">
          <Link to="/" className="back-home">
            <Icon icon={ArrowLeft01Icon} size={16} /> Back to home
          </Link>
          <span>
            {signup ? "Already one of us?" : "New around here?"}{" "}
            <Link to={signup ? "/sign-in" : "/sign-up"}>
              {signup ? "Log in" : "Join us"}{" "}
              <Icon icon={ArrowUpRight01Icon} size={14} />
            </Link>
          </span>
        </div>
        <div className="auth-form-wrap">
          {complete ? (
            <div
              className="auth-success"
              ref={successRef}
              tabIndex={-1}
              role="status"
            >
              <div className="success-icon">
                <Icon icon={recovery ? Mail01Icon : Tick02Icon} size={30} />
              </div>
              <span className="eyebrow">YOU’VE REACHED THE FRONT DOOR</span>
              <h2>
                {recovery
                  ? "You’re in the right place."
                  : signup
                    ? `Looking good, ${name.trim().split(" ")[0]}.`
                    : "Welcome back."}
              </h2>
              <p>
                {recovery
                  ? "In the live version, a reset link would be sent to your email."
                  : "This is where your next good conversation will begin."}
              </p>
              <div className="preview-notice">
                <strong>This is a design preview.</strong>
                <span>
                  {recovery
                    ? "No email was sent."
                    : "No account was created or signed in."}{" "}
                  Authentication will be connected in a later phase.
                </span>
              </div>
              <button
                className="button button-orange auth-submit"
                onClick={() => {
                  setComplete(false);
                  setSocialNotice(false);
                }}
              >
                Back to{" "}
                {recovery ? "password recovery" : signup ? "sign up" : "log in"}{" "}
                <Icon icon={ArrowLeft01Icon} size={17} />
              </button>
              <Link
                to={recovery ? "/sign-in" : signup ? "/app/welcome" : "/app"}
                className="success-home"
              >
                {recovery ? "Back to log in" : "Step inside the preview"}
                <Icon icon={ArrowUpRight01Icon} size={15} />
              </Link>
            </div>
          ) : (
            <>
              <div className="auth-heading">
                <span className="eyebrow">{content.eyebrow}</span>
                <h2>{content.title}</h2>
                <p>{content.description}</p>
              </div>
              {!recovery && (
                <>
                  <button
                    type="button"
                    className="social-button"
                    onClick={() => setSocialNotice(true)}
                  >
                    <Icon icon={GithubIcon} size={21} /> Continue with GitHub
                  </button>
                  {socialNotice && (
                    <p className="social-notice" role="status">
                      <Icon icon={AlertCircleIcon} size={17} /> GitHub sign-in
                      will be available when authentication is connected.
                    </p>
                  )}
                  <div className="auth-divider">
                    <span>or, the good old email way</span>
                  </div>
                </>
              )}
              <form onSubmit={submit} noValidate className="auth-form">
                {signup && (
                  <div className="form-field">
                    <label htmlFor={`${id}-name`}>
                      What should we call you?
                    </label>
                    <input
                      ref={nameRef}
                      id={`${id}-name`}
                      name="name"
                      autoComplete="nickname"
                      placeholder="Your name"
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        clearError("name");
                      }}
                      aria-invalid={!!errors.name}
                      aria-describedby={
                        errors.name ? `${id}-name-error` : undefined
                      }
                      required
                      minLength={2}
                      maxLength={40}
                    />
                    {errors.name && (
                      <span id={`${id}-name-error`} className="field-error">
                        {errors.name}
                      </span>
                    )}
                  </div>
                )}
                <div className="form-field">
                  <label htmlFor={`${id}-email`}>Email address</label>
                  <input
                    ref={emailRef}
                    id={`${id}-email`}
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@somewhere.nice"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError("email");
                    }}
                    aria-invalid={!!errors.email}
                    aria-describedby={
                      errors.email ? `${id}-email-error` : undefined
                    }
                    required
                  />
                  {errors.email && (
                    <span id={`${id}-email-error`} className="field-error">
                      {errors.email}
                    </span>
                  )}
                </div>
                {!recovery && (
                  <div className="form-field">
                    <div className="password-label">
                      <label htmlFor={`${id}-password`}>Password</label>
                      {!signup && (
                        <Link to="/forgot-password">Forgot password?</Link>
                      )}
                    </div>
                    <div className="password-input">
                      <input
                        ref={passwordRef}
                        id={`${id}-password`}
                        name="password"
                        type={passwordVisible ? "text" : "password"}
                        autoComplete={
                          signup ? "new-password" : "current-password"
                        }
                        placeholder={
                          signup
                            ? "Make it a good one (8+ characters)"
                            : "Your secret handshake"
                        }
                        value={password}
                        onChange={(event) => {
                          setPassword(event.target.value);
                          clearError("password");
                        }}
                        aria-invalid={!!errors.password}
                        aria-describedby={
                          errors.password
                            ? `${id}-password-error`
                            : signup
                              ? `${id}-password-hint`
                              : undefined
                        }
                        minLength={signup ? 8 : undefined}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setPasswordVisible(!passwordVisible)}
                        aria-label={
                          passwordVisible ? "Hide password" : "Show password"
                        }
                        aria-pressed={passwordVisible}
                      >
                        <Icon
                          icon={passwordVisible ? ViewOffSlashIcon : ViewIcon}
                          size={19}
                        />
                      </button>
                    </div>
                    {errors.password && (
                      <span id={`${id}-password-error`} className="field-error">
                        {errors.password}
                      </span>
                    )}
                    {signup && (
                      <div className="password-hint" id={`${id}-password-hint`}>
                        {password.length > 0 ? (
                          <>
                            <div
                              className={`strength-meter strength-${strength}`}
                              aria-hidden="true"
                            >
                              {[1, 2, 3, 4].map((level) => (
                                <i
                                  key={level}
                                  className={strength >= level ? "filled" : ""}
                                />
                              ))}
                            </div>
                            <span>
                              {password.length < 8
                                ? "A little longer — at least 8 characters."
                                : strength <= 2
                                  ? "Good start. Mix in numbers or symbols."
                                  : strength === 3
                                    ? "Looking strong."
                                    : "That’s a strong password."}
                            </span>
                          </>
                        ) : (
                          <span>
                            At least 8 characters. A little mystery is good.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <button
                  className="button button-orange auth-submit"
                  type="submit"
                >
                  {content.submit}
                  <Icon icon={ArrowRight01Icon} size={19} />
                </button>
                <p className="form-preview-note">
                  A little preview of what’s to come. No account needed yet.
                </p>
              </form>
              {recovery ? (
                <Link className="auth-bottom-link" to="/sign-in">
                  <Icon icon={ArrowLeft01Icon} size={16} /> Back to log in
                </Link>
              ) : (
                <div className="auth-invite">
                  {signup
                    ? "Already found your people?"
                    : "Don’t have an account yet?"}{" "}
                  <Link to={signup ? "/sign-in" : "/sign-up"}>
                    {signup ? "Log in" : "Come on in"}{" "}
                    <Icon icon={ArrowUpRight01Icon} size={15} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
        <footer className="auth-footer">
          <span>A little corner of the internet, for you.</span>
          <span>✳</span>
        </footer>
      </section>
    </main>
  );
}
