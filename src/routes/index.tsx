import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  GithubIcon,
  HeartCheckIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { ChatPreview } from "../components/chat-preview";
import { Icon, Logo } from "../components/ui";

export const Route = createFileRoute("/")({ component: LandingPage });

const avatarRows = [
  [
    { seed: "Amara", style: "lorelei" },
    { seed: "Milo", style: "adventurer" },
    { seed: "Lena", style: "micah" },
    { seed: "Kofi", style: "notionists" },
    { seed: "Iris", style: "avataaars" },
    { seed: "Theo", style: "personas" },
    { seed: "Nia", style: "open-peeps" },
    { seed: "Remy", style: "big-smile" },
  ],
  [
    { seed: "Zuri", style: "dylan" },
    { seed: "Noah", style: "miniavs" },
    { seed: "Aya", style: "toon-head" },
    { seed: "Finn", style: "fun-emoji" },
    { seed: "Sage", style: "pixel-art" },
    { seed: "Luca", style: "clay" },
    { seed: "Maya", style: "cameo" },
    { seed: "Jules", style: "line-face" },
  ],
  [
    { seed: "Arlo", style: "big-ears" },
    { seed: "Imani", style: "croodles" },
    { seed: "Eden", style: "cutouts" },
    { seed: "Kai", style: "moods" },
    { seed: "Cleo", style: "initial-face" },
    { seed: "Owen", style: "thumbs" },
    { seed: "Nova", style: "sprouts" },
    { seed: "Bea", style: "bottts" },
  ],
  [
    { seed: "Ravi", style: "critters" },
    { seed: "Mae", style: "gaze" },
    { seed: "Sol", style: "voxel-art" },
    { seed: "Tobi", style: "pixelbot" },
    { seed: "Hana", style: "adventurer-neutral" },
    { seed: "Enzo", style: "lorelei-neutral" },
    { seed: "Ada", style: "avataaars-neutral" },
    { seed: "Max", style: "notionists-neutral" },
  ],
];

function PeopleMarquee() {
  return (
    <div
      data-ui="people-marquee"
      className="group relative h-96 w-110 max-w-full overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_center,#f2ede5_0%,#f8f7f4_68%)] py-5 [mask-image:radial-gradient(ellipse_at_center,black_42%,rgba(0,0,0,0.92)_60%,transparent_84%)] max-[800px]:h-84 max-[800px]:w-82 max-[580px]:mx-auto max-[580px]:h-92 max-[580px]:w-full"
      aria-hidden="true"
    >
      <div className="flex h-full flex-col justify-center gap-3 -rotate-3 scale-110">
        {avatarRows.map((row, rowIndex) => (
          <div
            key={row[0].seed}
            className={`flex w-max motion-reduce:animate-none group-hover:[animation-play-state:paused] ${
              rowIndex % 2 === 1
                ? "[animation:people-marquee_30s_linear_infinite_reverse]"
                : "[animation:people-marquee_34s_linear_infinite]"
            }`}
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-3 pr-3">
                {row.map((avatar, avatarIndex) => (
                  <div
                    key={`${copy}-${avatar.seed}`}
                    className={`grid size-20 shrink-0 place-items-end overflow-hidden rounded-[20px] border border-white/80 shadow-[0_8px_24px_rgba(67,55,41,0.10)] max-[800px]:size-17 max-[580px]:size-19 ${
                      (avatarIndex + rowIndex) % 4 === 0
                        ? "bg-[#ffd9ca]"
                        : (avatarIndex + rowIndex) % 4 === 1
                          ? "bg-[#dcd8ff]"
                          : (avatarIndex + rowIndex) % 4 === 2
                            ? "bg-[#cceedd]"
                            : "bg-[#ffe9af]"
                    }`}
                  >
                    <img
                      src={`https://api.dicebear.com/10.x/${avatar.style}/svg?seed=${avatar.seed}`}
                      className="size-full object-cover"
                      width="80"
                      height="80"
                      loading="lazy"
                      decoding="async"
                      alt=""
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div data-ui="landing-page">
      <header
        data-ui="site-header content-width"
        className="mx-auto flex h-25.5 w-[calc(100%-112px)] max-w-300 items-center justify-between gap-7.5 max-[1100px]:w-[calc(100%-72px)] max-[800px]:h-20.5 max-[800px]:w-[calc(100%-48px)] max-[580px]:h-19 max-[580px]:w-[calc(100%-36px)] max-[580px]:gap-2.5"
      >
        <Logo />
        <div
          data-ui="header-actions"
          className="flex items-center gap-6 max-[1100px]:gap-4.5 max-[800px]:ml-auto max-[580px]:gap-2 max-[580px]:**:data-[ui~=button]:hidden"
        >
          <Link
            to="/sign-in"
            data-ui="login-link"
            className="text-[13px] font-semibold transition-colors hover:text-[#cc4826]"
          >
            Log in
          </Link>
          <Link
            to="/app"
            data-ui="button button-dark button-small"
            className="inline-flex min-h-10.5 items-center justify-center gap-3 whitespace-nowrap rounded-[7px] border border-transparent bg-ink px-4 py-2.5 text-[13px] font-semibold text-white transition-[background,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#42433d] active:translate-y-0 motion-reduce:hover:translate-y-0"
          >
            Open Drocsid <Icon icon={ArrowUpRight01Icon} size={17} />
          </Link>
        </div>
      </header>

      <main id="main">
        <section
          data-ui="hero content-width"
          className="relative isolate mx-auto mb-12 w-[calc(100%-112px)] max-w-300 overflow-hidden rounded-[36px] pt-17 pb-20 text-center [&_h1]:relative [&_h1]:z-1 [&_h1]:mx-auto [&_h1]:mt-5.75 [&_h1]:mb-5.5 [&_h1]:w-fit [&_h1]:text-[clamp(72px,6.9vw,100px)] [&_h1]:leading-[0.99] [&_h1]:font-[650] [&_h1]:tracking-[-0.071em] [&_h1>span:not([data-ui~=headline-spark])]:text-orange max-[1100px]:w-[calc(100%-72px)] max-[1100px]:[&_h1]:text-[83px] max-[800px]:mb-10 max-[800px]:w-[calc(100%-48px)] max-[800px]:pt-14.75 max-[800px]:pb-17 max-[800px]:[&_h1]:text-[78px] max-[580px]:mb-8 max-[580px]:w-[calc(100%-36px)] max-[580px]:rounded-[24px] max-[580px]:px-0 max-[580px]:pt-12 max-[580px]:pb-14 max-[580px]:[&_h1]:mt-6.25 max-[580px]:[&_h1]:mb-5.25 max-[580px]:[&_h1]:text-[clamp(57px,13.8vw,80px)] max-[580px]:[&_h1]:tracking-[-0.066em] max-[360px]:[&_h1]:text-[52px]"
        >
          <div
            data-ui="hero-decoration"
            className="pointer-events-none absolute inset-0 -z-1 overflow-hidden"
            aria-hidden="true"
          >
            <span className="absolute top-24 left-[5%] grid size-16 -rotate-12 place-items-center overflow-hidden rounded-[19px] border border-white/90 bg-[#dcd8ff] shadow-[0_14px_34px_rgba(83,70,150,0.13)] [animation:hero-float_6s_ease-in-out_infinite] motion-reduce:animate-none max-[800px]:left-[2%] max-[800px]:size-13 max-[580px]:hidden">
              <img
                src="https://api.dicebear.com/10.x/notionists/svg?seed=HeroAmara"
                className="size-full object-cover"
                width="64"
                height="64"
                alt=""
              />
            </span>
            <span className="absolute top-31 right-[5%] grid size-17 rotate-10 place-items-center overflow-hidden rounded-[22px] border border-white/90 bg-[#cceedd] shadow-[0_14px_34px_rgba(33,111,81,0.13)] [animation:hero-float_7s_ease-in-out_-2s_infinite] motion-reduce:animate-none max-[800px]:right-[1%] max-[800px]:size-13 max-[580px]:hidden">
              <img
                src="https://api.dicebear.com/10.x/adventurer/svg?seed=HeroKofi"
                className="size-full object-cover"
                width="68"
                height="68"
                alt=""
              />
            </span>
            <span className="absolute bottom-14 left-[13%] grid size-12 rotate-8 place-items-center overflow-hidden rounded-[15px] border border-white/90 bg-[#ffe9af] shadow-[0_12px_28px_rgba(133,93,29,0.12)] [animation:hero-float_5.5s_ease-in-out_-1s_infinite] motion-reduce:animate-none max-[800px]:left-[5%] max-[580px]:hidden">
              <img
                src="https://api.dicebear.com/10.x/micah/svg?seed=HeroNia"
                className="size-full object-cover"
                width="48"
                height="48"
                alt=""
              />
            </span>
          </div>
          <h1>
            A place for
            <br />
            <span>your people.</span>
            <span
              data-ui="headline-spark"
              className="absolute -right-16.5 top-4 rotate-[7deg] text-[64px] leading-none font-normal text-orange max-[800px]:-right-12.75 max-[800px]:text-[50px] max-[580px]:top-1.75 max-[580px]:-right-7 max-[580px]:text-[30px] max-[360px]:-top-2 max-[360px]:-right-4.25 max-[360px]:text-[24px]"
              aria-hidden="true"
            >
              ✳
            </span>
          </h1>
          <p
            data-ui="hero-description"
            className="relative z-1 m-0 text-[16px] leading-[1.65] tracking-[-0.15px] text-[#6c6e65] max-[800px]:text-[15px] max-[580px]:mx-auto max-[580px]:max-w-82.5 max-[580px]:text-[14px] max-[580px]:leading-[1.7]"
          >
            For the late-night ideas, the niche obsessions,
            <br data-ui="desktop-break" className="max-[580px]:hidden" /> and
            the friends who just get it. Make yourself at home.
          </p>
          <div
            data-ui="hero-actions"
            className="relative z-1 mt-7 flex justify-center gap-3 max-[580px]:mt-6.25 max-[580px]:gap-2.25 max-[580px]:**:data-[ui~=button]:min-h-11.5 max-[580px]:**:data-[ui~=button]:gap-2 max-[580px]:**:data-[ui~=button]:px-3.25 max-[580px]:**:data-[ui~=button]:py-3 max-[580px]:**:data-[ui~=button]:text-[11px] max-[580px]:[&_svg]:w-4"
          >
            <Link
              to="/sign-up"
              data-ui="button button-orange"
              className="inline-flex min-h-13 items-center justify-center gap-3 whitespace-nowrap rounded-[7px] border border-transparent bg-orange px-5.5 py-3.5 text-[14px] font-semibold text-[#3e2118] shadow-[0_2px_0_#d842201c] transition-[background,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#ed724d] hover:shadow-[0_5px_12px_#ee58202a] active:translate-y-0 motion-reduce:hover:translate-y-0"
            >
              Find your people <Icon icon={ArrowUpRight01Icon} size={20} />
            </Link>
            <a
              href="https://github.com/xt42io/drocsid"
              target="_blank"
              rel="noreferrer"
              data-ui="button button-outline"
              className="inline-flex min-h-13 items-center justify-center gap-3 whitespace-nowrap rounded-[7px] border border-[#d9d8d0] bg-transparent px-5.5 py-3.5 text-[14px] font-semibold transition-[background,transform,box-shadow] hover:-translate-y-0.5 hover:border-[#b7b7af] hover:bg-[#efeee9] active:translate-y-0 motion-reduce:hover:translate-y-0"
            >
              Star on GitHub <Icon icon={GithubIcon} size={19} />
            </a>
          </div>
          <div
            data-ui="hero-margin-note"
            className="absolute right-5.5 bottom-4 rotate-[9deg] text-[14px] leading-[1.45] text-[#6e7464] italic max-[1100px]:right-0 max-[1100px]:text-[12px] max-[800px]:hidden"
          >
            <span>
              less scrolling.
              <br />
              more belonging.
            </span>
            <span
              data-ui="note-arrow"
              className="ml-17.5 block rotate-[10deg] text-[43px] leading-[0.9]"
              aria-hidden="true"
            >
              ⤵
            </span>
          </div>
        </section>

        <div
          data-ui="preview-container content-width"
          className="mx-auto w-[calc(100%-112px)] max-w-277.5 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[580px]:w-[calc(100%-28px)]"
        >
          <ChatPreview />
        </div>

        <section
          data-ui="manifesto-strip content-width"
          className="mx-auto flex min-h-43 w-[calc(100%-112px)] max-w-300 items-center justify-center border-b border-line px-6 py-10 text-center text-[clamp(28px,3.2vw,48px)] leading-[1.18] tracking-[-0.045em] text-[#65675f] max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[580px]:min-h-38 max-[580px]:w-[calc(100%-36px)] max-[580px]:px-0 max-[580px]:text-[31px]"
          aria-label="Our community"
        >
          <p className="m-0 max-w-250">
            For the <strong className="font-bold text-[#ed542e]">makers.</strong>{" "}
            The <strong className="font-bold text-[#6658e8]">friends.</strong>{" "}
            The{" "}
            <strong className="font-bold text-[#078a62]">
              “anyone still up?”
            </strong>{" "}
            people.
          </p>
        </section>

        <section
          id="open-source"
          data-ui="open-source-section content-width"
          className="mx-auto flex w-[calc(100%-112px)] max-w-300 justify-between border-y border-line pt-17.25 pb-17 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:gap-5 max-[800px]:py-13.5 max-[580px]:w-[calc(100%-36px)] max-[580px]:flex-col max-[580px]:gap-9.25 max-[580px]:py-11.75"
        >
          <div
            data-ui="open-source-copy"
            className="max-w-147.5 [&_h2]:mb-6 [&_p]:mx-0 [&_p]:mt-0 [&_p]:mb-3.25 [&_p]:max-w-115 [&_p]:text-[16px] [&_p]:leading-[1.8] [&_p]:text-[#6d7362] max-[800px]:[&_h2]:text-[31px] max-[800px]:[&_p]:text-[12px] max-[580px]:[&_h2]:text-[34px] max-[580px]:[&_p]:text-[16px]"
          >
            <span
              data-ui="eyebrow"
              className="block font-mono text-[11px] leading-[1.7] font-normal tracking-[1.6px] max-[580px]:text-[9px]"
            >
              OPEN BY NATURE
            </span>
            <h2>
              A little less platform.
              <br />A lot more people.
            </h2>
            <p>
              We miss when the internet felt like a place to hang out.
              <br data-ui="desktop-break" className="max-[580px]:hidden" /> So
              we’re building a little corner of it, together.
            </p>
            <p>
              Drocsid is an open-source project, made for communities who want a
              space of their own. No big pitch. Just good company.
            </p>
            <a
              href="https://github.com/xt42io/drocsid"
              target="_blank"
              rel="noreferrer"
              data-ui="button github-button"
              className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-[9px] bg-ink px-4.5 py-2.5 text-[13px] font-semibold text-white shadow-[0_5px_18px_rgba(41,42,38,0.16)] transition-[background,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#42433d] hover:shadow-[0_8px_24px_rgba(41,42,38,0.22)] active:translate-y-0 motion-reduce:hover:translate-y-0"
            >
              <Icon icon={GithubIcon} size={20} />
              <span>Star on GitHub</span>
              <span className="ml-1 flex items-center border-l border-white/20 pl-3 text-[#ffd766]">
                <Icon icon={StarIcon} size={18} />
              </span>
            </a>
          </div>
          <div
            data-ui="open-source-art"
            className="flex w-110 max-w-[44%] items-center justify-center max-[800px]:w-82 max-[580px]:w-full max-[580px]:max-w-none"
          >
            <PeopleMarquee />
          </div>
        </section>

        <section
          data-ui="closing-section"
          className="flex flex-col items-center bg-[#eaece2] px-5 pt-16.25 pb-15.5 text-center [&_h2]:mt-4.75 [&_h2]:mb-7.25 [&_h2]:text-[46px] **:data-[ui~=button]:min-h-11.75 **:data-[ui~=little-asterisk]:text-[32px] **:data-[ui~=little-asterisk]:text-[#74815b] max-[800px]:[&_h2]:text-[39px] max-[580px]:py-11.5 max-[580px]:[&_h2]:mt-4 max-[580px]:[&_h2]:mb-6.25 max-[580px]:[&_h2]:text-[32px] max-[580px]:[&_h2]:leading-[1.16] max-[580px]:**:data-[ui~=button]:text-[12px]"
        >
          <span
            data-ui="little-asterisk"
            className="text-[28px] leading-none text-orange"
            aria-hidden="true"
          >
            ✳
          </span>
          <h2>
            Your people are out there.
            <br />
            Give them a place to land.
          </h2>
          <Link
            to="/sign-up"
            data-ui="button button-dark"
            className="inline-flex min-h-13 items-center justify-center gap-3 whitespace-nowrap rounded-[7px] border border-transparent bg-ink px-5.5 py-3.5 text-[14px] font-semibold text-white transition-[background,transform,box-shadow] hover:-translate-y-0.5 hover:bg-[#42433d] active:translate-y-0 motion-reduce:hover:translate-y-0"
          >
            Make yourself at home <Icon icon={ArrowRight01Icon} size={19} />
          </Link>
          <span
            data-ui="closing-footnote"
            className="mt-4 text-[11px] text-[#677354]"
          >
            Good conversations start with a hello.
          </span>
        </section>
      </main>

      <footer
        data-ui="site-footer content-width"
        className="mx-auto flex min-h-27.25 w-[calc(100%-112px)] max-w-300 items-center justify-between gap-6 [&_a]:transition-colors [&_a:hover]:text-[#cc4826] [&>a:not([data-ui~=logo])]:flex [&>a:not([data-ui~=logo])]:items-center [&>a:not([data-ui~=logo])]:gap-2 [&>a:not([data-ui~=logo])]:text-[11px] [&>a:not([data-ui~=logo])]:text-[#717a60] [&>span]:text-[11px] [&>span]:text-[#909384] **:data-[ui~=logo]:text-[23px] **:data-[ui~=logo-mark]:size-6.75 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:flex-wrap max-[800px]:gap-3.75 max-[800px]:py-6.5 max-[800px]:[&>a:not([data-ui~=logo])]:ml-auto max-[800px]:[&>span:not([data-ui~=copyright])]:hidden max-[580px]:min-h-32 max-[580px]:w-[calc(100%-36px)] max-[580px]:gap-x-3 max-[580px]:py-6.5 max-[580px]:[&>a:not([data-ui~=logo])]:text-[10px]"
      >
        <Logo />
        <span>A little corner of the internet, for you.</span>
        <a
          href="https://github.com/xt42io/drocsid"
          target="_blank"
          rel="noreferrer"
        >
          Made in the open <Icon icon={HeartCheckIcon} size={16} />
        </a>
        <span
          data-ui="copyright"
          className="font-mono text-[9px]! max-[580px]:w-full max-[580px]:text-center max-[580px]:text-[8px]!"
        >
          © {new Date().getFullYear()} Drocsid
        </span>
      </footer>
    </div>
  );
}
