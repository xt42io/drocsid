import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Logo } from "./ui";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div data-ui="legal-page" className="min-h-svh bg-paper text-ink">
      <header className="mx-auto flex h-23 w-[calc(100%-64px)] max-w-285 items-center justify-between border-b border-line max-[700px]:h-19 max-[700px]:w-[calc(100%-36px)]">
        <Logo />
        <div className="flex items-center gap-5 text-[12px] font-semibold text-[#666b5e] max-[480px]:gap-3.5 max-[480px]:text-[11px]">
          <Link to="/" className="transition-colors hover:text-[#c84b2b]">
            Home
          </Link>
          <a
            href="https://github.com/xt42io/drocsid"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-[#c84b2b]"
          >
            Source code
          </a>
        </div>
      </header>

      <main
        id="main"
        className="mx-auto grid w-[calc(100%-64px)] max-w-285 grid-cols-[210px_minmax(0,720px)] justify-between gap-18 py-16 max-[900px]:grid-cols-1 max-[900px]:gap-10 max-[700px]:w-[calc(100%-36px)] max-[700px]:py-10"
      >
        <aside className="self-start max-[900px]:border-b max-[900px]:border-line max-[900px]:pb-8">
          <nav
            aria-label="Legal pages"
            className="flex flex-col gap-1.5 text-[12px] text-[#6d7167] max-[900px]:flex-row max-[900px]:flex-wrap max-[900px]:gap-2 [&_a]:rounded-md [&_a]:px-3 [&_a]:py-2.5 [&_a]:transition-colors [&_a:hover]:bg-[#eeeee8] [&_a:hover]:text-ink max-[480px]:[&_a]:px-2.5 max-[480px]:[&_a]:py-2 max-[480px]:[&_a]:text-[11px]"
          >
            <Link to="/privacy" activeProps={{ className: "bg-[#e8eadf] text-ink font-semibold" }}>
              Privacy Policy
            </Link>
            <Link to="/terms" activeProps={{ className: "bg-[#e8eadf] text-ink font-semibold" }}>
              Terms of Service
            </Link>
            <Link
              to="/acceptable-use"
              activeProps={{ className: "bg-[#e8eadf] text-ink font-semibold" }}
            >
              Acceptable Use
            </Link>
            <Link
              to="/community-guidelines"
              activeProps={{ className: "bg-[#e8eadf] text-ink font-semibold" }}
            >
              Community Guidelines
            </Link>
            <Link to="/cookies" activeProps={{ className: "bg-[#e8eadf] text-ink font-semibold" }}>
              Cookie Policy
            </Link>
          </nav>
          <p className="mt-7 border-t border-line pt-5 text-[10px] leading-5 text-[#888b82] max-[900px]:mb-0 max-[900px]:mt-5 max-[900px]:pb-0">
            Effective September 9, 2026
          </p>
        </aside>

        <article className="min-w-0 pb-12 [&_a]:font-semibold [&_a]:text-[#b84427] [&_a]:underline [&_a]:decoration-[#e6aa98] [&_a]:underline-offset-3 [&_a:hover]:text-[#852f1a] [&_h1]:m-0 [&_h1]:text-[clamp(44px,6vw,70px)] [&_h1]:leading-[0.98] [&_h1]:tracking-[-0.055em] [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:text-[25px] [&_h2]:leading-tight [&_h2]:tracking-[-0.7px] [&_h3]:mt-7 [&_h3]:mb-3 [&_h3]:text-[16px] [&_p]:my-4 [&_p]:text-[14px] [&_p]:leading-7 [&_p]:text-[#5f625a] [&_li]:pl-1 [&_li]:text-[14px] [&_li]:leading-7 [&_li]:text-[#5f625a] [&_ul]:my-4 [&_ul]:space-y-2 [&_ul]:pl-5 max-[580px]:[&_h1]:text-[43px] max-[580px]:[&_h2]:mt-10 max-[580px]:[&_h2]:text-[22px] max-[580px]:[&_p]:text-[13px] max-[580px]:[&_p]:leading-6 max-[580px]:[&_li]:text-[13px] max-[580px]:[&_li]:leading-6">
          <h1>{title}</h1>
          <p className="mt-6! max-w-165 text-[17px]! leading-7.5! text-[#72766b]! max-[580px]:text-[15px]!">
            {description}
          </p>
          <div className="mt-12 border-t border-line pt-1">{children}</div>
          <section className="mt-14 rounded-xl border border-[#d9d9d1] bg-[#f1f1eb] px-6 py-5 max-[580px]:px-5">
            <h2 className="mt-0! text-[18px]!">Questions about this page?</h2>
            <p className="mb-0! text-[13px]!">
              Email us at <a href="mailto:hello@drocsid.app">hello@drocsid.app</a>.
            </p>
          </section>
        </article>
      </main>

      <footer className="mx-auto flex min-h-22 w-[calc(100%-64px)] max-w-285 items-center justify-between gap-5 border-t border-line text-[10px] text-[#85887e] max-[700px]:w-[calc(100%-36px)] max-[580px]:flex-col max-[580px]:items-start max-[580px]:justify-center max-[580px]:py-6">
        <span>© {new Date().getFullYear()} Drocsid</span>
        <span>Open-source software licensed under AGPL-3.0-only</span>
      </footer>
    </div>
  );
}
