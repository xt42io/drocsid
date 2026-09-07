import { useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  AlertCircleIcon,
  GithubIcon,
} from "@hugeicons/core-free-icons";
import { Avatar, Icon, Logo } from "./ui";
import { authClient } from "../lib/auth-client";
import {
  EmailCodeForm,
  requestEmailCode,
  type EmailCodePurpose,
} from "./email-code-form";

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
    submit: "Send reset code",
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
  const [codeStep, setCodeStep] = useState<{
    email: string;
    purpose: EmailCodePurpose;
  } | null>(null);
  const [socialNotice, setSocialNotice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
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
    setBusy(true);
    setServerError("");
    try {
      const address = email.trim().toLowerCase();
      const result = recovery
        ? await requestEmailCode(address, "forget-password")
        : signup
          ? await authClient.signUp.email({
              email: address,
              password,
              name: name.trim(),
            })
          : await authClient.signIn.email({ email: address, password });
      if (result.error) {
        if (
          !signup &&
          !recovery &&
          result.error.code === "EMAIL_NOT_VERIFIED"
        ) {
          const sent = await requestEmailCode(address, "email-verification");
          if (sent.error)
            setServerError(sent.error.message || "Could not send your code.");
          else {
            setPassword("");
            setCodeStep({ email: address, purpose: "email-verification" });
          }
          return;
        }
        setServerError(
          result.error.message || "Could not continue. Please try again.",
        );
        return;
      }
      setPassword("");
      if (recovery || signup) {
        setCodeStep({
          email: address,
          purpose: recovery ? "forget-password" : "email-verification",
        });
      } else enterApp();
    } catch {
      setServerError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function enterApp() {
    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(
      next?.startsWith("/app/") && !next.includes("\\")
        ? next
        : signup
          ? "/app/welcome"
          : "/app",
    );
  }

  async function signInWithCode() {
    if (busy) return;
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setErrors((previous) => ({
        ...previous,
        email: "Enter your email address to receive a sign-in code.",
      }));
      emailRef.current?.focus();
      return;
    }
    setBusy(true);
    setServerError("");
    try {
      const result = await requestEmailCode(address, "sign-in");
      if (result.error)
        setServerError(result.error.message || "Could not send your code.");
      else {
        setPassword("");
        setCodeStep({ email: address, purpose: "sign-in" });
      }
    } catch {
      setServerError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function clearError(field: keyof Errors) {
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }

  return (
    <main
      id="main"
      data-ui="auth-page"
      className="min-h-svh flex max-[580px]:block"
    >
      <aside
        data-ui="auth-story"
        className="relative w-[44%] shrink-0 bg-[#f3653f] pt-10.5 pb-8.5 px-12 flex flex-col text-[#44261d] overflow-hidden **:data-[ui~=logo-period]:text-[#ffe4c8] [&_h1]:text-[clamp(49px,4.8vw,75px)] [&_h1]:leading-[1.06] [&_h1]:tracking-[-0.065em] [&_h1]:font-[550] [&_h1]:mt-5.25 [&_h1]:mb-6.5 [&_h1]:mx-0 [&_h1_em]:text-[#ffebd3] [&_h1_em]:not-italic min-[1600px]:px-17.5 min-[1600px]:[&_h1]:text-[80px] max-[1100px]:px-8.5 max-[1100px]:[&_h1]:text-[58px] max-[800px]:w-[41%] max-[800px]:px-6 max-[800px]:[&_h1]:text-[45px] max-[580px]:w-full max-[580px]:p-6 max-[580px]:**:data-[ui~=logo]:text-[26px] max-[580px]:[&_h1]:text-[45px] max-[580px]:[&_h1]:mt-2.75 max-[580px]:[&_h1]:mb-0 max-[580px]:[&_h1]:mx-0 max-[580px]:[&_h1]:leading-none max-[580px]:[&_h1_em]:whitespace-nowrap"
      >
        <Logo />
        <div
          data-ui="auth-story-main"
          className="w-full max-w-115 m-auto py-[76px_70px] [&>p]:text-[16px] [&>p]:leading-[1.65] [&>p]:text-[#833c26] [&>p]:m-0 min-[1600px]:max-w-122.5 max-[1100px]:[&>p]:text-[14px] max-[800px]:[&>p]:text-[13px] max-[580px]:pt-7.75 max-[580px]:px-0 max-[580px]:max-w-none max-[580px]:pb-4.25 max-[580px]:[&>p]:hidden"
        >
          <div
            data-ui="auth-story-eyebrow"
            className="flex items-center gap-2 text-[9px] tracking-[1.2px] font-mono text-[#71341f] [&>span]:text-[23px] max-[1100px]:text-[8px] max-[800px]:text-[7px] max-[800px]:tracking-[0.5px] max-[800px]:[&>span]:text-[19px] max-[580px]:text-[8px]"
          >
            <span>✳</span> GOOD PEOPLE. GOOD COMPANY.
          </div>
          <h1>{content.aside}</h1>
          <p>
            For your people, your projects,
            <br />
            and your beautifully specific interests.
          </p>
          <div
            data-ui="auth-conversation"
            className="mt-12.75 py-0 px-1.25 max-[800px]:mt-9.25 max-[800px]:p-0 max-[580px]:hidden"
          >
            <div
              data-ui="auth-message"
              className="flex items-center gap-3 w-[90%] min-w-62 bg-[#fffaf0] border border-solid border-[#eac6ad] p-4.5 rounded-[10px] transform-[rotate(-4deg)] shadow-[0_10px_20px_#7d2c1110] **:data-[ui~=avatar]:size-8.5 [&_p]:text-[12px] [&_p]:mt-1.25 [&_p]:mb-0 [&_p]:mx-0 [&_p]:text-[#93826f] max-[1100px]:min-w-56 max-[1100px]:p-3.5 max-[1100px]:[&_p]:text-[11px] max-[800px]:min-w-0 max-[800px]:w-full max-[800px]:py-3.25 max-[800px]:px-2.25 max-[800px]:gap-1.75 max-[800px]:**:data-[ui~=avatar]:text-[10px] max-[800px]:**:data-[ui~=avatar]:rounded-lg max-[800px]:**:data-[ui~=avatar]:size-6.25 max-[800px]:[&_p]:text-[10px]"
            >
              <Avatar name="Jamie" color="purple" />
              <div>
                <div
                  data-ui="auth-message-meta"
                  className="flex items-center gap-3 [&_strong]:text-[12px] [&_strong]:text-[#5b554a] [&>span]:text-[9px] [&>span]:text-[#b6a794] max-[800px]:[&_strong]:text-[10px] max-[800px]:[&>span]:hidden"
                >
                  <strong>Jamie</strong>
                  <span>just now</span>
                </div>
                <p>hey! saved you a spot. 👋</p>
              </div>
            </div>
            <div
              data-ui="auth-message reply"
              className="flex items-center gap-3 w-[90%] min-w-62 bg-[#fffaf0] border border-solid border-[#eac6ad] p-4.5 rounded-[10px] transform-[rotate(-4deg)] shadow-[0_10px_20px_#7d2c1110] **:data-[ui~=avatar]:size-8.5 [&_p]:text-[12px] [&_p]:mt-1.25 [&_p]:mb-0 [&_p]:mx-0 [&_p]:text-[#93826f] data-[ui~=reply]:ml-6.75 data-[ui~=reply]:mt-4 data-[ui~=reply]:transform-[rotate(3deg)] max-[1100px]:min-w-56 max-[1100px]:p-3.5 max-[1100px]:[&_p]:text-[11px] max-[1100px]:data-[ui~=reply]:ml-3 max-[800px]:min-w-0 max-[800px]:w-full max-[800px]:py-3.25 max-[800px]:px-2.25 max-[800px]:gap-1.75 max-[800px]:**:data-[ui~=avatar]:text-[10px] max-[800px]:**:data-[ui~=avatar]:rounded-lg max-[800px]:**:data-[ui~=avatar]:size-6.25 max-[800px]:[&_p]:text-[10px] max-[800px]:data-[ui~=reply]:ml-0.5"
            >
              <Avatar name="You" color="green" />
              <div>
                <div
                  data-ui="auth-message-meta"
                  className="flex items-center gap-3 [&_strong]:text-[12px] [&_strong]:text-[#5b554a] [&>span]:text-[9px] [&>span]:text-[#b6a794] max-[800px]:[&_strong]:text-[10px] max-[800px]:[&>span]:hidden"
                >
                  <strong>You</strong>
                  <span>just now</span>
                </div>
                <p>feels like my kind of place.</p>
              </div>
              <span
                data-ui="auth-reaction"
                className="absolute -bottom-3.75 right-4.5 bg-[#ffead3] border border-solid border-[#e1b697] py-1 px-2.25 rounded-md text-[12px] text-[#9b7355] max-[800px]:text-[10px] max-[800px]:-bottom-3.25"
              >
                🧡 3
              </span>
            </div>
          </div>
          <span
            data-ui="auth-handwritten"
            className="block text-right pr-4.5 mt-9.5 italic text-[17px] text-[#8d422a] transform-[rotate(-6deg)] max-[580px]:hidden"
          >
            come as you are.
          </span>
        </div>
        <div
          data-ui="auth-story-footer"
          className="flex items-center gap-2 font-mono tracking-[1px] text-[9px] text-[#8e3e24] max-[800px]:text-[7px] max-[800px]:tracking-[0.5px] max-[580px]:hidden"
        >
          <span
            data-ui="story-footer-dot"
            className="rounded-full bg-[#8f442e] size-1.5"
          />{" "}
          OPEN SOURCE. OPEN DOOR. ALWAYS.
        </div>
      </aside>
      <section
        data-ui="auth-form-side"
        className="flex-1 min-w-0 pt-10.25 pb-6.5 px-12.25 flex flex-col min-[1600px]:px-17.5 max-[1100px]:px-8.5 max-[800px]:px-7 max-[580px]:pt-5 max-[580px]:pb-6.25 max-[580px]:px-6.25 max-[580px]:min-h-[calc(100svh-220px)]"
      >
        <div
          data-ui="auth-topbar"
          className="flex items-center justify-between gap-4 w-full text-[11px] text-[#949486] [&>span>a]:inline-flex [&>span>a]:items-center [&>span>a]:gap-0.5 [&>span>a]:text-[#454b3e] [&>span>a]:ml-1.5 [&>span>a]:font-semibold [&_a:hover]:text-[#cf4c29] max-[1100px]:text-[10px] max-[800px]:[&>span]:hidden max-[580px]:text-[11px] max-[580px]:[&>span]:block max-[580px]:[&>span]:text-[10px]"
        >
          <Link
            to="/"
            data-ui="back-home"
            className="flex items-center gap-1.5 text-[#727769]"
          >
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
        <div
          data-ui="auth-form-wrap"
          className="w-full max-w-93 m-auto py-18.75 min-[1600px]:max-w-102.5 max-[800px]:py-13.75 max-[580px]:py-[38px_46px] max-[580px]:max-w-95"
        >
          {codeStep ? (
            <EmailCodeForm
              email={codeStep.email}
              purpose={codeStep.purpose}
              onBack={() => {
                setCodeStep(null);
                setServerError("");
                setErrors({});
              }}
              onVerified={enterApp}
            />
          ) : (
            <>
              <div
                data-ui="auth-heading"
                className="**:data-[ui~=eyebrow]:text-[9px] **:data-[ui~=eyebrow]:tracking-[1.3px] **:data-[ui~=eyebrow]:text-[#89907c] [&_h2]:text-[37px] [&_h2]:mt-3 [&_h2]:mb-3.25 [&_h2]:tracking-[-1.8px] [&_h2]:font-semibold [&>p]:text-[#707662] [&>p]:text-[14px] [&>p]:leading-[1.7] [&>p]:mt-0 [&>p]:mb-7 [&>p]:mx-0 max-[800px]:[&_h2]:text-[32px] max-[800px]:[&>p]:text-[13px] max-[800px]:**:data-[ui~=eyebrow]:text-[8px] max-[580px]:[&_h2]:text-[34px] max-[580px]:**:data-[ui~=eyebrow]:text-[8px] max-[580px]:[&>p]:text-[14px] max-[580px]:[&>p]:mb-6"
              >
                <span
                  data-ui="eyebrow"
                  className="block font-mono text-[11px] tracking-[1.6px] font-normal leading-[1.7] max-[580px]:text-[9px]"
                >
                  {content.eyebrow}
                </span>
                <h2>{content.title}</h2>
                <p>{content.description}</p>
              </div>
              {!recovery && (
                <>
                  <button
                    type="button"
                    data-ui="social-button"
                    className="w-full min-h-12 flex items-center justify-center gap-2 border border-solid border-[#d9dbcf] bg-transparent rounded-md text-[14px] font-semibold [transition:background_0.2s,border-color_0.2s] hover:bg-[#eeefe7] hover:border-[#b7c0a7] max-[580px]:text-[13px] max-[580px]:min-h-12"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const result = await authClient.signIn.social({
                          provider: "github",
                          callbackURL: "/app",
                        });
                        if (result.error) setSocialNotice(true);
                      } catch {
                        setSocialNotice(true);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Icon icon={GithubIcon} size={21} /> Continue with GitHub
                  </button>
                  {socialNotice && (
                    <p
                      data-ui="social-notice"
                      className="flex items-start gap-2 rounded-md text-[#727d60] bg-[#eaf0df] p-2.5 text-[11px] leading-[1.6] mb-0 [&_svg]:shrink-0 [&_svg]:mt-px"
                      role="status"
                    >
                      <Icon icon={AlertCircleIcon} size={17} /> GitHub sign-in
                      is not configured on this server yet.
                    </p>
                  )}
                  <div
                    data-ui="auth-divider"
                    className="flex items-center gap-4 my-5.75 mx-0 text-[#76806a] text-[10px] before:[content:''] before:flex-1 before:h-px before:bg-[#e1e3d8] after:[content:''] after:flex-1 after:h-px after:bg-[#e1e3d8] max-[580px]:text-[10px] max-[580px]:my-5.5"
                  >
                    <span>or, the good old email way</span>
                  </div>
                </>
              )}
              <form
                onSubmit={submit}
                noValidate
                data-ui="auth-form"
                className="flex flex-col gap-4.5"
              >
                {serverError && (
                  <p
                    data-ui="field-error"
                    className="mt-1.5 text-[11px] text-[#b04830] leading-normal"
                    role="alert"
                  >
                    {serverError}
                  </p>
                )}
                {signup && (
                  <div
                    data-ui="form-field"
                    className="flex flex-col [&_label]:block [&_label]:text-[14px] [&_label]:font-semibold [&_label]:mb-2 [&_input]:w-full [&_input]:border [&_input]:border-solid [&_input]:border-[#dcded2] [&_input]:bg-[#fcfcf8] [&_input]:h-11.75 [&_input]:py-0 [&_input]:px-3.25 [&_input]:rounded-md [&_input]:text-[#424938] [&_input]:text-[14px] [&_input]:[outline:none] [&_input]:[transition:border-color_0.15s,box-shadow_0.15s] [&_input::placeholder]:text-[#818974] [&_input:focus]:border-[#e58965] [&_input:focus]:shadow-[0_0_0_3px_#f45e3810] [&_input[aria-invalid='true']]:border-[#cc5d48] [&_input[aria-invalid='true']]:bg-[#fff8f2] max-[580px]:[&_label]:text-[13px] max-[580px]:[&_input]:text-[16px] max-[580px]:[&_input]:h-12 max-[580px]:[&_input]:px-3 max-[580px]:[&_input::placeholder]:text-[12px]"
                  >
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
                      <span
                        id={`${id}-name-error`}
                        data-ui="field-error"
                        className="mt-1.5 text-[11px] text-[#b04830] leading-normal"
                      >
                        {errors.name}
                      </span>
                    )}
                  </div>
                )}
                <div
                  data-ui="form-field"
                  className="flex flex-col [&_label]:block [&_label]:text-[14px] [&_label]:font-semibold [&_label]:mb-2 [&_input]:w-full [&_input]:border [&_input]:border-solid [&_input]:border-[#dcded2] [&_input]:bg-[#fcfcf8] [&_input]:h-11.75 [&_input]:py-0 [&_input]:px-3.25 [&_input]:rounded-md [&_input]:text-[#424938] [&_input]:text-[14px] [&_input]:[outline:none] [&_input]:[transition:border-color_0.15s,box-shadow_0.15s] [&_input::placeholder]:text-[#818974] [&_input:focus]:border-[#e58965] [&_input:focus]:shadow-[0_0_0_3px_#f45e3810] [&_input[aria-invalid='true']]:border-[#cc5d48] [&_input[aria-invalid='true']]:bg-[#fff8f2] max-[580px]:[&_label]:text-[13px] max-[580px]:[&_input]:text-[16px] max-[580px]:[&_input]:h-12 max-[580px]:[&_input]:px-3 max-[580px]:[&_input::placeholder]:text-[12px]"
                >
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
                    <span
                      id={`${id}-email-error`}
                      data-ui="field-error"
                      className="mt-1.5 text-[11px] text-[#b04830] leading-normal"
                    >
                      {errors.email}
                    </span>
                  )}
                </div>
                {!recovery && (
                  <div
                    data-ui="form-field"
                    className="flex flex-col [&_label]:block [&_label]:text-[14px] [&_label]:font-semibold [&_label]:mb-2 [&_input]:w-full [&_input]:border [&_input]:border-solid [&_input]:border-[#dcded2] [&_input]:bg-[#fcfcf8] [&_input]:h-11.75 [&_input]:py-0 [&_input]:px-3.25 [&_input]:rounded-md [&_input]:text-[#424938] [&_input]:text-[14px] [&_input]:[outline:none] [&_input]:[transition:border-color_0.15s,box-shadow_0.15s] [&_input::placeholder]:text-[#818974] [&_input:focus]:border-[#e58965] [&_input:focus]:shadow-[0_0_0_3px_#f45e3810] [&_input[aria-invalid='true']]:border-[#cc5d48] [&_input[aria-invalid='true']]:bg-[#fff8f2] max-[580px]:[&_label]:text-[13px] max-[580px]:[&_input]:text-[16px] max-[580px]:[&_input]:h-12 max-[580px]:[&_input]:px-3 max-[580px]:[&_input::placeholder]:text-[12px]"
                  >
                    <div
                      data-ui="password-label"
                      className="flex items-start justify-between gap-2 [&_a]:text-[11px] [&_a]:text-[#9c7861] [&_a:hover]:text-[#c2552e] max-[580px]:[&_a]:text-[11px]"
                    >
                      <label htmlFor={`${id}-password`}>Password</label>
                      {!signup && (
                        <Link to="/forgot-password">Forgot password?</Link>
                      )}
                    </div>
                    <div
                      data-ui="password-input"
                      className="relative [&_input]:pr-11.25 [&_button]:absolute [&_button]:right-px [&_button]:top-px [&_button]:bottom-px [&_button]:w-10.5 [&_button]:border-0 [&_button]:border-none [&_button]:border-[currentColor] [&_button]:bg-transparent [&_button]:flex [&_button]:items-center [&_button]:justify-center [&_button]:text-[#a1a794] [&_button]:rounded-[5px] [&_button:hover]:text-[#52623d] max-[580px]:[&_input]:pr-11"
                    >
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
                      <span
                        id={`${id}-password-error`}
                        data-ui="field-error"
                        className="mt-1.5 text-[11px] text-[#b04830] leading-normal"
                      >
                        {errors.password}
                      </span>
                    )}
                    {signup && (
                      <div
                        data-ui="password-hint"
                        className="mt-2 text-[#6f7c60] text-[10px] leading-normal"
                        id={`${id}-password-hint`}
                      >
                        {password.length > 0 ? (
                          <>
                            <div
                              data-ui={`strength-meter strength-${strength}`}
                              className="flex gap-1 mt-0.75 mb-1.75 [&_i]:h-0.75 [&_i]:flex-1 [&_i]:bg-[#e3e6d9] [&_i]:rounded-xs **:data-[ui~=filled]:bg-[#dea377] [&[data-ui~=strength-3]_[data-ui~=filled]]:bg-[#819567] [&[data-ui~=strength-4]_[data-ui~=filled]]:bg-[#819567]"
                              aria-hidden="true"
                            >
                              {[1, 2, 3, 4].map((level) => (
                                <i
                                  key={level}
                                  data-ui={strength >= level ? "filled" : ""}
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
                  data-ui="button button-orange auth-submit"
                  className="inline-flex items-center gap-3 border border-solid border-transparent py-3.5 pr-5.5 pl-5.5 font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-orange text-[#3e2118] shadow-[0_2px_0_#d842201c] w-full justify-between mt-0.75 min-h-12 text-[14px] px-4.25 hover:transform-[translateY(-2px)] hover:bg-[#ed724d] hover:shadow-[0_5px_12px_#ee58202a] active:transform-[translateY(0)] max-[580px]:text-[13px] max-[580px]:min-h-12.25 motion-reduce:hover:transform-none"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "One moment…" : content.submit}
                  <Icon icon={ArrowRight01Icon} size={19} />
                </button>
                {!signup && !recovery && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={signInWithCode}
                    className="py-2 text-center text-sm font-semibold text-[#76523e] underline-offset-4 hover:underline disabled:opacity-50"
                  >
                    Email me a sign-in code
                  </button>
                )}
              </form>
              {recovery ? (
                <Link
                  data-ui="auth-bottom-link"
                  className="flex items-center justify-center gap-2 text-[12px] text-[#828d70] mt-6.25"
                  to="/sign-in"
                >
                  <Icon icon={ArrowLeft01Icon} size={16} /> Back to log in
                </Link>
              ) : (
                <div
                  data-ui="auth-invite"
                  className="mt-6.5 [border-top-width:1px] [border-top-style:solid] border-t-[#e2e5d8] pt-5.75 text-center text-[11px] text-[#6d795e] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-0.5 [&_a]:ml-1 [&_a]:text-[#626f4e] [&_a]:font-semibold [&_a:hover]:text-[#d1522b] max-[800px]:text-[10px] max-[580px]:text-[12px] max-[580px]:pt-5.75"
                >
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
        <footer
          data-ui="auth-footer"
          className="flex items-center justify-between text-[#737d63] text-[10px] [&>span:last-child]:text-[21px] [&>span:last-child]:text-[#899577] max-[580px]:text-[9px]"
        >
          <span>A little corner of the internet, for you.</span>
          <span>✳</span>
        </footer>
      </section>
    </main>
  );
}
