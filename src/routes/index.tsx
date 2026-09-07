import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight01Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  SourceCodeIcon,
  HashtagIcon,
  HeartCheckIcon,
  Menu01Icon,
  Cancel01Icon,
  Add01Icon,
  GithubIcon,
} from "@hugeicons/core-free-icons";
import { Icon, Logo, LogoMark } from "../components/ui";
import { ChatPreview } from "../components/chat-preview";

export const Route = createFileRoute("/")({ component: LandingPage });

const faqs = [
  [
    "What is drocsid?",
    "An open-source alternative to Discord, focused on text chat. A home for your friends, projects, and communities, with familiar channels and a little less noise.",
  ],
  [
    "Is it free to use?",
    "The goal is a free, open-source chat experience. We’re still building the first version, and will share hosting options as the project takes shape.",
  ],
  [
    "Will there be voice or video calls?",
    "We’re starting with text and giving it our full attention. Voice and video aren’t part of this first version.",
  ],
  [
    "Can I host my own community?",
    "Self-hosting is part of the vision. Setup instructions and the public source repository will be shared when the first working release is ready.",
  ],
];

function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div data-ui="landing-page" className="">
      <header
        data-ui="site-header content-width"
        className="w-[calc(100%-112px)] max-w-300 mx-auto h-25.5 flex items-center justify-between [border-bottom-width:1px] [border-bottom-style:solid] border-b-line gap-7.5 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:h-20.5 max-[580px]:w-[calc(100%-36px)] max-[580px]:h-19 max-[580px]:gap-2.5"
      >
        <Logo />
        <nav
          data-ui="desktop-nav"
          className="flex items-center gap-8 text-[13px] font-medium ml-9 [&_a]:[transition:color_0.2s] [&_a:hover]:text-[#cc4826] max-[1100px]:gap-4.75 max-[1100px]:ml-0 max-[1100px]:text-[12px] max-[800px]:hidden"
          aria-label="Main navigation"
        >
          <a href="#features">The good stuff</a>
          <a href="#open-source">Open by nature</a>
          <a href="#faq">A few questions</a>
        </nav>
        <div
          data-ui="header-actions"
          className="flex items-center gap-6 max-[1100px]:gap-4.5 max-[800px]:ml-auto max-[580px]:gap-2 max-[580px]:**:data-[ui~=button]:hidden"
        >
          <Link
            to="/sign-in"
            data-ui="login-link"
            className="[transition:color_0.2s] text-[13px] font-semibold hover:text-[#cc4826] max-[580px]:text-[13px]"
          >
            Log in
          </Link>
          <Link
            to="/app"
            data-ui="button button-dark button-small"
            className="inline-flex items-center justify-center gap-3 border border-solid border-transparent font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-ink text-white min-h-10.5 py-2.5 px-4 text-[13px] hover:transform-[translateY(-2px)] hover:bg-[#42433d] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
          >
            Open drocsid <Icon icon={ArrowUpRight01Icon} size={17} />
          </Link>
          <button
            data-ui="mobile-menu-button"
            className="hidden border-0 border-none border-[currentColor] bg-transparent p-2.5 max-[580px]:flex"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon icon={menuOpen ? Cancel01Icon : Menu01Icon} />
          </button>
        </div>
      </header>
      {menuOpen && (
        <nav
          id="mobile-menu"
          data-ui="mobile-menu"
          className="hidden max-[580px]:flex max-[580px]:flex-col max-[580px]:absolute max-[580px]:top-18.75 max-[580px]:left-4.5 max-[580px]:right-4.5 max-[580px]:z-10 max-[580px]:bg-paper max-[580px]:border max-[580px]:border-solid max-[580px]:border-line max-[580px]:p-3 max-[580px]:rounded-[0_0_8px_8px] max-[580px]:shadow-[0_12px_20px_#0000000b] max-[580px]:[&_a]:py-3.25 max-[580px]:[&_a]:px-2.5 max-[580px]:[&_a]:text-[14px] max-[580px]:[&_a]:rounded-[5px] max-[580px]:[&_a:hover]:bg-[#eeeee6]"
          aria-label="Mobile navigation"
        >
          <a href="#features" onClick={() => setMenuOpen(false)}>
            The good stuff
          </a>
          <a href="#open-source" onClick={() => setMenuOpen(false)}>
            Open by nature
          </a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>
            A few questions
          </a>
          <Link to="/sign-up">Find your people ↗</Link>
        </nav>
      )}
      <main id="main">
        <section
          data-ui="hero content-width"
          className="w-[calc(100%-112px)] max-w-300 mx-auto relative text-center pt-17 pb-13.75 [&_h1]:relative [&_h1]:w-fit [&_h1]:mt-5.75 [&_h1]:mb-5.5 [&_h1]:mx-auto [&_h1]:text-[clamp(72px,6.9vw,100px)] [&_h1]:leading-[0.99] [&_h1]:tracking-[-0.071em] [&_h1]:font-[650] [&_h1>span:not([data-ui~=headline-spark])]:text-orange max-[1100px]:w-[calc(100%-72px)] max-[1100px]:[&_h1]:text-[83px] max-[800px]:w-[calc(100%-48px)] max-[800px]:pt-14.75 max-[800px]:[&_h1]:text-[78px] max-[580px]:w-[calc(100%-36px)] max-[580px]:pt-12 max-[580px]:pb-9.25 max-[580px]:px-0 max-[580px]:[&_h1]:text-[clamp(57px,13.8vw,80px)] max-[580px]:[&_h1]:mt-6.25 max-[580px]:[&_h1]:mb-5.25 max-[580px]:[&_h1]:tracking-[-0.066em] max-[360px]:[&_h1]:text-[52px]"
        >
          <div
            data-ui="hero-eyebrow"
            className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-[1.5px] **:data-[ui~=little-asterisk]:text-[20px] max-[580px]:text-[9px] max-[580px]:tracking-[1px]"
          >
            <span
              data-ui="little-asterisk"
              className="text-orange text-[28px] leading-none"
            >
              ✳
            </span>{" "}
            OPEN SOURCE. OPEN DOOR.
          </div>
          <h1>
            A place for
            <br />
            <span>your people.</span>
            <span
              data-ui="headline-spark"
              className="absolute -right-16.5 top-4 text-orange text-[64px] leading-none font-normal transform-[rotate(7deg)] max-[800px]:text-[50px] max-[800px]:-right-12.75 max-[580px]:top-1.75 max-[580px]:-right-7 max-[580px]:text-[30px] max-[360px]:text-[24px] max-[360px]:-right-4.25 max-[360px]:-top-2"
              aria-hidden="true"
            >
              ✳
            </span>
          </h1>
          <p
            data-ui="hero-description"
            className="text-[#6c6e65] text-[16px] leading-[1.65] tracking-[-0.15px] m-0 max-[800px]:text-[15px] max-[580px]:text-[14px] max-[580px]:max-w-82.5 max-[580px]:mx-auto max-[580px]:leading-[1.7]"
          >
            For the late-night ideas, the niche obsessions,
            <br data-ui="desktop-break" className="max-[580px]:hidden" /> and
            the friends who just get it. Make yourself at home.
          </p>
          <div
            data-ui="hero-actions"
            className="flex justify-center gap-3 mt-7 max-[580px]:gap-2.25 max-[580px]:mt-6.25 max-[580px]:**:data-[ui~=button]:text-[11px] max-[580px]:**:data-[ui~=button]:gap-2 max-[580px]:**:data-[ui~=button]:py-3 max-[580px]:**:data-[ui~=button]:px-3.25 max-[580px]:**:data-[ui~=button]:min-h-11.5 max-[580px]:[&_svg]:w-4"
          >
            <Link
              to="/sign-up"
              data-ui="button button-orange"
              className="inline-flex items-center justify-center gap-3 border border-solid border-transparent min-h-13 py-3.5 px-5.5 text-[14px] font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-orange text-[#3e2118] shadow-[0_2px_0_#d842201c] hover:transform-[translateY(-2px)] hover:bg-[#ed724d] hover:shadow-[0_5px_12px_#ee58202a] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
            >
              Find your people <Icon icon={ArrowUpRight01Icon} size={20} />
            </Link>
            <a
              href="#preview"
              data-ui="button button-outline"
              className="inline-flex items-center justify-center gap-3 border border-solid min-h-13 py-3.5 px-5.5 text-[14px] font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap border-[#d9d8d0] bg-transparent hover:transform-[translateY(-2px)] hover:bg-[#efeee9] hover:border-[#b7b7af] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
            >
              Take a look around <Icon icon={ArrowDown01Icon} size={18} />
            </a>
          </div>
          <div
            data-ui="hero-footnote"
            className="flex items-center justify-center gap-2 text-[#83857c] text-[11px] mt-4.5 max-[580px]:text-[9px] max-[580px]:mt-4.25"
          >
            <span>Free to be yourself.</span>
            <span data-ui="footnote-dot" className="text-[#b2b3ab]">
              ·
            </span>
            <span>Yours to make your own.</span>
          </div>
          <div
            data-ui="hero-margin-note"
            className="absolute right-5.5 bottom-4 text-[14px] leading-[1.45] italic text-[#6e7464] transform-[rotate(9deg)] max-[1100px]:right-0 max-[1100px]:text-[12px] max-[800px]:hidden"
          >
            <span>
              less scrolling.
              <br />
              more belonging.
            </span>
            <span
              data-ui="note-arrow"
              className="block ml-17.5 text-[43px] leading-[0.9] transform-[rotate(10deg)]"
              aria-hidden="true"
            >
              ⤵
            </span>
          </div>
        </section>
        <div
          data-ui="preview-container content-width"
          className="w-[calc(100%-112px)] mx-auto max-w-277.5 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[580px]:w-[calc(100%-28px)]"
        >
          <ChatPreview />
        </div>
        <section
          data-ui="manifesto-strip content-width"
          className="w-[calc(100%-112px)] max-w-300 mx-auto min-h-31.5 flex items-center justify-between gap-6 [border-bottom-width:1px] [border-bottom-style:solid] border-b-line [&>span:first-child]:font-mono [&>span:first-child]:text-[9px] [&>span:first-child]:tracking-[1px] [&>span:first-child]:text-[#929387] [&>div]:text-[#8a8c80] [&>div]:text-[16px] [&>div]:tracking-[-0.3px] [&_strong]:font-medium [&_strong]:text-[#484d3e] **:data-[ui~=little-asterisk]:text-[#687254] **:data-[ui~=little-asterisk]:text-[24px] max-[1100px]:w-[calc(100%-72px)] max-[1100px]:[&>div]:text-[13px] max-[1100px]:[&>span:first-child]:text-[8px] max-[800px]:w-[calc(100%-48px)] max-[800px]:min-h-28.75 max-[800px]:flex-wrap max-[800px]:justify-center max-[800px]:gap-3.5 max-[800px]:py-6.25 max-[800px]:[&>div]:text-[13px] max-[800px]:[&>div]:text-center max-[800px]:[&>span:first-child]:w-full max-[800px]:[&>span:first-child]:text-center max-[800px]:*:data-[ui~=little-asterisk]:hidden max-[580px]:w-[calc(100%-36px)] max-[580px]:min-h-28 max-[580px]:py-6.5 max-[580px]:gap-2.5 max-[580px]:[&>div]:text-[13px] max-[580px]:[&>div]:leading-[1.6] max-[580px]:[&>div]:max-w-67.5 max-[580px]:[&>span:first-child]:text-[8px]"
          aria-label="Our focus"
        >
          <span>SMALL GROUPS. BIG FEELINGS.</span>
          <div>
            For the <strong>makers.</strong> The <strong>friends.</strong> The{" "}
            <strong>“anyone still up?”</strong> people.
          </div>
          <span
            data-ui="little-asterisk"
            className="text-orange text-[28px] leading-none"
            aria-hidden="true"
          >
            ✳
          </span>
        </section>
        <section
          id="features"
          data-ui="features-section content-width"
          className="w-[calc(100%-112px)] max-w-300 mx-auto pt-26 pb-21.5 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:pt-16.25 max-[800px]:pb-16 max-[580px]:w-[calc(100%-36px)] max-[580px]:py-[56px_47px]"
        >
          <div
            data-ui="section-heading"
            className="flex items-end justify-between gap-8 mb-10.5 [&>p]:text-[#6e7464] [&>p]:text-[16px] [&>p]:leading-[1.7] [&>p]:mb-1 max-[800px]:[align-items:start] max-[800px]:gap-7 max-[800px]:[&>p]:text-[12px] max-[800px]:[&>p]:max-w-55 max-[800px]:[&>p_br]:hidden max-[580px]:block max-[580px]:mb-7.25 max-[580px]:[&>p]:max-w-82.5 max-[580px]:[&>p]:text-[14px] max-[580px]:[&>p]:mt-4.5"
          >
            <div>
              <span
                data-ui="eyebrow"
                className="block font-mono text-[11px] tracking-[1.6px] font-normal leading-[1.7] max-[580px]:text-[9px]"
              >
                ALL THE GOOD STUFF
              </span>
              <h2>
                Less in the way.
                <br />
                More in common.
              </h2>
            </div>
            <p>
              Just the things that bring people together.
              <br />A familiar space with a little more breathing room.
            </p>
          </div>
          <div
            data-ui="feature-grid"
            className="grid grid-cols-3 gap-8 max-[1100px]:gap-5.75 max-[800px]:gap-5 max-[580px]:grid-cols-[1fr] max-[580px]:gap-8.25"
          >
            <article
              data-ui="feature-card"
              className="[&_h3]:font-semibold [&_h3]:text-[20px] [&_h3]:tracking-[-0.5px] [&_h3]:my-2.75 [&_h3]:mx-0 [&>p]:text-[16px] [&>p]:leading-[1.75] [&>p]:text-[#6c7262] [&>p]:m-0 [&>p]:max-w-82.5 max-[1100px]:[&_h3]:text-[17px] max-[800px]:[&_h3]:text-[17px] max-[800px]:[&_h3]:leading-[1.3] max-[800px]:[&>p]:text-[12px] max-[580px]:[&_h3]:text-[21px] max-[580px]:[&_h3]:mt-2.5 max-[580px]:[&>p]:text-[16px] max-[580px]:[&>p]:max-w-none max-[580px]:[&>p]:leading-[1.7]"
            >
              <div
                data-ui="feature-visual channels-visual"
                className="relative h-50 rounded-[7px] mb-7 overflow-hidden bg-[#eeefe5] py-7 px-4.25 flex flex-col justify-center gap-1.5 max-[1100px]:px-3 max-[800px]:h-40 max-[800px]:mb-4.5 max-[580px]:h-48 max-[580px]:mb-5 max-[580px]:px-8"
              >
                <div
                  data-ui="mini-channel"
                  className="flex items-center gap-2 text-[#a3a996] text-[12px] py-2.25 px-2.5 max-[1100px]:text-[10px] max-[1100px]:px-0.5 max-[800px]:text-[8px] max-[800px]:gap-1 max-[800px]:[&_svg]:w-3.5 max-[580px]:text-[12px] max-[580px]:p-2.25 max-[580px]:gap-2 max-[580px]:[&_svg]:w-4.75"
                >
                  <Icon icon={HashtagIcon} /> the-everyday
                </div>
                <div
                  data-ui="mini-channel highlighted"
                  className="flex items-center gap-2 text-[#a3a996] text-[12px] py-2.25 px-2.5 data-[ui~=highlighted]:bg-[#fdfdf7] data-[ui~=highlighted]:shadow-[0_3px_10px_#515f1a08] data-[ui~=highlighted]:text-[#626e4c] data-[ui~=highlighted]:border data-[ui~=highlighted]:border-solid data-[ui~=highlighted]:border-[#dee2d3] data-[ui~=highlighted]:rounded-md data-[ui~=highlighted]:transform-[rotate(-3deg)] [&[data-ui~=highlighted]_span]:flex [&[data-ui~=highlighted]_span]:items-center [&[data-ui~=highlighted]_span]:justify-center [&[data-ui~=highlighted]_span]:bg-[#f3ab8f] [&[data-ui~=highlighted]_span]:text-[#a1492b] [&[data-ui~=highlighted]_span]:text-[9px] [&[data-ui~=highlighted]_span]:ml-auto [&[data-ui~=highlighted]_span]:rounded-sm [&[data-ui~=highlighted]_span]:size-4.25 max-[1100px]:text-[10px] max-[1100px]:px-0.5 max-[800px]:text-[8px] max-[800px]:gap-1 max-[800px]:[&_svg]:w-3.5 max-[800px]:[&[data-ui~=highlighted]_span]:hidden max-[580px]:text-[12px] max-[580px]:p-2.25 max-[580px]:gap-2 max-[580px]:[&_svg]:w-4.75 max-[580px]:[&[data-ui~=highlighted]_span]:flex"
                >
                  <Icon icon={HashtagIcon} /> wildly-specific-interests{" "}
                  <span>2</span>
                </div>
                <div
                  data-ui="mini-channel"
                  className="flex items-center gap-2 text-[#a3a996] text-[12px] py-2.25 px-2.5 max-[1100px]:text-[10px] max-[1100px]:px-0.5 max-[800px]:text-[8px] max-[800px]:gap-1 max-[800px]:[&_svg]:w-3.5 max-[580px]:text-[12px] max-[580px]:p-2.25 max-[580px]:gap-2 max-[580px]:[&_svg]:w-4.75"
                >
                  <Icon icon={HashtagIcon} /> good-news-only
                </div>
              </div>
              <span
                data-ui="feature-number"
                className="font-mono text-[#758067] text-[9px] tracking-[0.6px] max-[1100px]:text-[8px] max-[800px]:text-[7px] max-[800px]:tracking-normal max-[580px]:text-[9px] max-[580px]:tracking-[0.5px]"
              >
                01 / FIND YOUR CORNER
              </span>
              <h3>A room for every rabbit hole.</h3>
              <p>
                Give every conversation a home. Keep your projects, inside
                jokes, and very important pet pictures in their own channels.
              </p>
            </article>
            <article
              data-ui="feature-card"
              className="[&_h3]:font-semibold [&_h3]:text-[20px] [&_h3]:tracking-[-0.5px] [&_h3]:my-2.75 [&_h3]:mx-0 [&>p]:text-[16px] [&>p]:leading-[1.75] [&>p]:text-[#6c7262] [&>p]:m-0 [&>p]:max-w-82.5 max-[1100px]:[&_h3]:text-[17px] max-[800px]:[&_h3]:text-[17px] max-[800px]:[&_h3]:leading-[1.3] max-[800px]:[&>p]:text-[12px] max-[580px]:[&_h3]:text-[21px] max-[580px]:[&_h3]:mt-2.5 max-[580px]:[&>p]:text-[16px] max-[580px]:[&>p]:max-w-none max-[580px]:[&>p]:leading-[1.7]"
            >
              <div
                data-ui="feature-visual conversation-visual"
                className="relative h-50 rounded-[7px] mb-7 overflow-hidden bg-[#f2eae1] flex flex-col items-center justify-center p-3.75 max-[800px]:h-40 max-[800px]:mb-4.5 max-[580px]:h-48 max-[580px]:mb-5"
              >
                <span
                  data-ui="mini-bubble bubble-one"
                  className="bg-[#fffdf7] p-3.5 rounded-[9px_9px_9px_2px] text-[11px] text-[#857363] shadow-[0_4px_10px_#70532e05] max-w-full transform-[rotate(-3deg)_translateX(-5px)] [&_span]:font-mono [&_span]:text-[#bcad9d] [&_span]:block [&_span]:text-[7px] [&_span]:mt-1.5 max-[1100px]:text-[9px] max-[800px]:text-[8px] max-[800px]:p-2.25 max-[580px]:text-[11px] max-[580px]:p-3.25"
                >
                  anyone else still working on this? <span>12:04 AM</span>
                </span>
                <span
                  data-ui="mini-bubble bubble-two"
                  className="text-[11px] text-[#857363] shadow-[0_4px_10px_#70532e05] max-w-full bg-[#e4d5c4] mt-1.75 mr-0 mb-0 ml-16 py-3 px-3.75 transform-[rotate(3deg)] rounded-[9px_9px_2px_9px] [&_span]:ml-2.5 max-[1100px]:text-[9px] max-[1100px]:ml-6.75 max-[800px]:text-[8px] max-[800px]:p-2.25 max-[800px]:ml-0 max-[580px]:text-[11px] max-[580px]:p-3.25 max-[580px]:ml-15"
                >
                  right here with you. <span>🧡</span>
                </span>
                <span
                  data-ui="bubble-reaction"
                  className="bg-[#fffaf0] border border-solid border-[#e6d8c5] text-[13px] py-0.75 px-2 rounded-md -mt-0.5 mr-0 mb-0 ml-36.25 z-1 transform-[rotate(3deg)] [&_span]:text-[10px] [&_span]:text-[#a28c73] max-[800px]:ml-18.75 max-[580px]:ml-33.75"
                >
                  🤝 <span>3</span>
                </span>
              </div>
              <span
                data-ui="feature-number"
                className="font-mono text-[#758067] text-[9px] tracking-[0.6px] max-[1100px]:text-[8px] max-[800px]:text-[7px] max-[800px]:tracking-normal max-[580px]:text-[9px] max-[580px]:tracking-[0.5px]"
              >
                02 / PICK UP WHERE YOU LEFT OFF
              </span>
              <h3>The conversation stays open.</h3>
              <p>
                Drop a thought. Share a small win. There’s no algorithm to keep
                up with, just a conversation to come back to.
              </p>
            </article>
            <article
              data-ui="feature-card"
              className="[&_h3]:font-semibold [&_h3]:text-[20px] [&_h3]:tracking-[-0.5px] [&_h3]:my-2.75 [&_h3]:mx-0 [&>p]:text-[16px] [&>p]:leading-[1.75] [&>p]:text-[#6c7262] [&>p]:m-0 [&>p]:max-w-82.5 max-[1100px]:[&_h3]:text-[17px] max-[800px]:[&_h3]:text-[17px] max-[800px]:[&_h3]:leading-[1.3] max-[800px]:[&>p]:text-[12px] max-[580px]:[&_h3]:text-[21px] max-[580px]:[&_h3]:mt-2.5 max-[580px]:[&>p]:text-[16px] max-[580px]:[&>p]:max-w-none max-[580px]:[&>p]:leading-[1.7]"
            >
              <div
                data-ui="feature-visual open-visual"
                className="relative h-50 rounded-[7px] mb-7 overflow-hidden bg-[#e9eae6] flex flex-col items-center justify-center max-[800px]:h-40 max-[800px]:mb-4.5 max-[580px]:h-48 max-[580px]:mb-5"
              >
                <div
                  data-ui="open-code"
                  className="flex items-center justify-center h-19.75 w-20.75 border border-solid border-[#cccfc3] rounded-[17px] bg-[#f7f8f1] text-[#7b8666] transform-[rotate(-7deg)] shadow-[5px_5px_0_#d9dfce] max-[800px]:h-16 max-[800px]:w-16.75 max-[800px]:[&_svg]:w-8.5 max-[580px]:h-18.25 max-[580px]:w-20 max-[580px]:[&_svg]:w-10"
                >
                  <Icon icon={SourceCodeIcon} size={44} />
                </div>
                <span
                  data-ui="source-tag"
                  className="bg-[#fcfdf7] border border-solid border-[#dadfd1] py-1.5 px-3 rounded-[5px] font-mono text-[9px] text-[#778362] mt-4.75 flex items-center gap-2 transform-[rotate(2deg)] max-[800px]:text-[8px] max-[800px]:px-2 max-[580px]:text-[10px] max-[580px]:mt-5"
                >
                  <span
                    data-ui="online-dot"
                    className="inline-block shrink-0 rounded-full bg-[#2ee68b] size-1.25"
                  />{" "}
                  built in the open
                </span>
              </div>
              <span
                data-ui="feature-number"
                className="font-mono text-[#758067] text-[9px] tracking-[0.6px] max-[1100px]:text-[8px] max-[800px]:text-[7px] max-[800px]:tracking-normal max-[580px]:text-[9px] max-[580px]:tracking-[0.5px]"
              >
                03 / MAKE IT YOURS
              </span>
              <h3>Your community. Your call.</h3>
              <p>
                Open source at heart, with self-hosting in sight. Help shape a
                space that belongs to the people who use it.
              </p>
            </article>
          </div>
        </section>
        <section
          id="open-source"
          data-ui="open-source-section content-width"
          className="w-[calc(100%-112px)] max-w-300 mx-auto flex justify-between [border-top-width:1px] [border-top-style:solid] border-t-line [border-bottom-width:1px] [border-bottom-style:solid] border-b-line pt-17.25 pb-17 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:py-13.5 max-[800px]:gap-5 max-[580px]:w-[calc(100%-36px)] max-[580px]:flex-col max-[580px]:py-11.75 max-[580px]:gap-9.25"
        >
          <div
            data-ui="open-source-copy"
            className="max-w-147.5 [&_h2]:mb-6 [&_p]:text-[16px] [&_p]:leading-[1.8] [&_p]:text-[#6d7362] [&_p]:mt-0 [&_p]:mb-3.25 [&_p]:mx-0 [&_p]:max-w-115 max-[800px]:[&_h2]:text-[31px] max-[800px]:[&_p]:text-[12px] max-[580px]:[&_h2]:text-[34px] max-[580px]:[&_p]:text-[16px]"
          >
            <span
              data-ui="eyebrow"
              className="block font-mono text-[11px] tracking-[1.6px] font-normal leading-[1.7] max-[580px]:text-[9px]"
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
              drocsid is an open-source project, made for communities who want a
              space of their own. No big pitch. Just good company.
            </p>
            <div
              data-ui="open-source-note"
              className="flex items-center gap-2 text-[11px] mt-7 text-[#737b64] max-[800px]:text-[9px] max-[580px]:text-[10px] max-[580px]:[align-items:start] max-[580px]:[&_svg]:shrink-0"
            >
              <Icon icon={GithubIcon} size={20} />
              <span>
                Our public repository is coming with the first release.
              </span>
            </div>
          </div>
          <div
            data-ui="open-source-art"
            className="flex flex-col items-center justify-center w-80 max-[800px]:w-50 max-[580px]:w-full max-[580px]:flex-row max-[580px]:gap-8.75"
            aria-hidden="true"
          >
            <div
              data-ui="open-stamp"
              className="border border-solid border-[#bcc4af] [outline:1px_solid_#d5dacb] outline-offset-[-9px] rounded-full flex flex-col items-center justify-center gap-6 text-[#768260] transform-[rotate(13deg)] size-52.75 [&>span]:font-mono [&>span]:text-[11px] [&>span]:tracking-[1.8px] **:data-[ui~=logo-mark]:size-14.5 max-[800px]:gap-3.75 max-[800px]:size-38.75 max-[800px]:[&>span]:text-[8px] max-[800px]:**:data-[ui~=logo-mark]:size-10.25 max-[580px]:size-36.5"
            >
              <span>MADE OF PEOPLE</span>
              <LogoMark />
              <span>NOT ALGORITHMS</span>
            </div>
            <span
              data-ui="open-art-note"
              className="text-[#919782] italic mt-6.75 transform-[rotate(-5deg)] text-center text-sm/normal max-[800px]:text-[12px] max-[580px]:text-[12px] max-[580px]:m-0"
            >
              a work in progress.
              <br />
              just like the rest of us.
            </span>
          </div>
        </section>
        <section
          id="faq"
          data-ui="faq-section content-width"
          className="w-[calc(100%-112px)] max-w-300 mx-auto grid grid-cols-2 gap-20 pt-22 pb-23 [&_h2]:text-[37px] [&>div>p]:text-[14px] [&>div>p]:text-[#707662] [&>div>p]:mt-4.75 max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:gap-8.75 max-[800px]:py-15 max-[800px]:[&_h2]:text-[30px] max-[800px]:[&>div>p]:text-[12px] max-[580px]:w-[calc(100%-36px)] max-[580px]:grid-cols-[1fr] max-[580px]:gap-6.5 max-[580px]:py-12.25 max-[580px]:[&_h2]:text-[34px] max-[580px]:[&>div>p]:text-[14px]"
        >
          <div>
            <span
              data-ui="eyebrow"
              className="block font-mono text-[11px] tracking-[1.6px] font-normal leading-[1.7] max-[580px]:text-[9px]"
            >
              GLAD YOU ASKED
            </span>
            <h2>
              A few things
              <br />
              you might wonder.
            </h2>
            <p>New here? You’re in good company.</p>
          </div>
          <div
            data-ui="faq-list"
            className="[&_details]:[border-bottom-width:1px] [&_details]:[border-bottom-style:solid] [&_details]:border-b-line [&_details:first-child]:[border-top-width:1px] [&_details:first-child]:[border-top-style:solid] [&_details:first-child]:border-t-line [&_summary]:flex [&_summary]:items-center [&_summary]:justify-between [&_summary]:gap-4 [&_summary]:[list-style:none] [&_summary]:text-[14px] [&_summary]:py-5.75 [&_summary]:px-0 [&_summary]:font-medium [&_summary::-webkit-details-marker]:hidden [&_summary_svg]:[transition:transform_0.2s] [&_summary_svg]:text-[#929781] [&_details[open]_summary_svg]:transform-[rotate(45deg)] [&_details>p]:text-[16px] [&_details>p]:leading-[1.7] [&_details>p]:text-[#7c806f] [&_details>p]:-mt-0.75 [&_details>p]:mb-5.5 [&_details>p]:mx-0 max-[800px]:[&_summary]:text-[12px] max-[800px]:[&_details>p]:text-[12px] max-[580px]:[&_summary]:text-[14px] max-[580px]:[&_summary]:py-5.25 max-[580px]:[&_details>p]:text-[16px]"
          >
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Icon icon={Add01Icon} size={20} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          data-ui="closing-section"
          className="bg-[#eaece2] pt-16.25 pb-15.5 px-5 flex flex-col items-center text-center **:data-[ui~=little-asterisk]:text-[#74815b] **:data-[ui~=little-asterisk]:text-[32px] [&_h2]:text-[46px] [&_h2]:mt-4.75 [&_h2]:mb-7.25 **:data-[ui~=button]:min-h-11.75 max-[800px]:[&_h2]:text-[39px] max-[580px]:py-11.5 max-[580px]:[&_h2]:text-[32px] max-[580px]:[&_h2]:leading-[1.16] max-[580px]:[&_h2]:mt-4 max-[580px]:[&_h2]:mb-6.25 max-[580px]:**:data-[ui~=button]:text-[12px]"
        >
          <span
            data-ui="little-asterisk"
            className="text-orange text-[28px] leading-none"
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
            className="inline-flex items-center justify-center gap-3 border border-solid border-transparent min-h-13 py-3.5 px-5.5 text-[14px] font-semibold rounded-[7px] [transition:background_0.2s,transform_0.2s,box-shadow_0.2s] whitespace-nowrap bg-ink text-white hover:transform-[translateY(-2px)] hover:bg-[#42433d] active:transform-[translateY(0)] motion-reduce:hover:transform-none"
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
        className="w-[calc(100%-112px)] max-w-300 mx-auto min-h-27.25 flex items-center justify-between gap-6 [&_a]:[transition:color_0.2s] [&_a:hover]:text-[#cc4826] **:data-[ui~=logo]:text-[23px] **:data-[ui~=logo-mark]:size-6.75 [&>span]:text-[#909384] [&>span]:text-[11px] [&>a:not([data-ui~=logo])]:flex [&>a:not([data-ui~=logo])]:items-center [&>a:not([data-ui~=logo])]:gap-2 [&>a:not([data-ui~=logo])]:text-[11px] [&>a:not([data-ui~=logo])]:text-[#717a60] max-[1100px]:w-[calc(100%-72px)] max-[800px]:w-[calc(100%-48px)] max-[800px]:flex-wrap max-[800px]:gap-3.75 max-[800px]:py-6.5 max-[800px]:[&>span:not([data-ui~=copyright])]:hidden max-[800px]:[&>a:not([data-ui~=logo])]:ml-auto max-[580px]:w-[calc(100%-36px)] max-[580px]:min-h-32 max-[580px]:py-6.5 max-[580px]:gap-x-3 max-[580px]:[&>a:not([data-ui~=logo])]:text-[10px]"
      >
        <Logo />
        <span>A little corner of the internet, for you.</span>
        <a href="#open-source">
          Made in the open <Icon icon={HeartCheckIcon} size={16} />
        </a>
        <span
          data-ui="copyright"
          className="font-mono text-[9px]! max-[580px]:w-full max-[580px]:text-center max-[580px]:text-[8px]!"
        >
          © {new Date().getFullYear()} drocsid
        </span>
      </footer>
    </div>
  );
}
