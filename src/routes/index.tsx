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
    <div className="landing-page">
      <header className="site-header content-width">
        <Logo />
        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#features">The good stuff</a>
          <a href="#open-source">Open by nature</a>
          <a href="#faq">A few questions</a>
        </nav>
        <div className="header-actions">
          <Link to="/sign-in" className="login-link">
            Log in
          </Link>
          <Link to="/app" className="button button-dark button-small">
            Open drocsid <Icon icon={ArrowUpRight01Icon} size={17} />
          </Link>
          <button
            className="mobile-menu-button"
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
          className="mobile-menu"
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
        <section className="hero content-width">
          <div className="hero-eyebrow">
            <span className="little-asterisk">✳</span> OPEN SOURCE. OPEN DOOR.
          </div>
          <h1>
            A place for
            <br />
            <span>your people.</span>
            <span className="headline-spark" aria-hidden="true">
              ✳
            </span>
          </h1>
          <p className="hero-description">
            For the late-night ideas, the niche obsessions,
            <br className="desktop-break" /> and the friends who just get it.
            Make yourself at home.
          </p>
          <div className="hero-actions">
            <Link to="/sign-up" className="button button-orange">
              Find your people <Icon icon={ArrowUpRight01Icon} size={20} />
            </Link>
            <a href="#preview" className="button button-outline">
              Take a look around <Icon icon={ArrowDown01Icon} size={18} />
            </a>
          </div>
          <div className="hero-footnote">
            <span>Free to be yourself.</span>
            <span className="footnote-dot">·</span>
            <span>Yours to make your own.</span>
          </div>
          <div className="hero-margin-note">
            <span>
              less scrolling.
              <br />
              more belonging.
            </span>
            <span className="note-arrow" aria-hidden="true">
              ⤵
            </span>
          </div>
        </section>
        <div className="preview-container content-width">
          <ChatPreview />
        </div>
        <section
          className="manifesto-strip content-width"
          aria-label="Our focus"
        >
          <span>SMALL GROUPS. BIG FEELINGS.</span>
          <div>
            For the <strong>makers.</strong> The <strong>friends.</strong> The{" "}
            <strong>“anyone still up?”</strong> people.
          </div>
          <span className="little-asterisk" aria-hidden="true">
            ✳
          </span>
        </section>
        <section id="features" className="features-section content-width">
          <div className="section-heading">
            <div>
              <span className="eyebrow">ALL THE GOOD STUFF</span>
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
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-visual channels-visual">
                <div className="mini-channel">
                  <Icon icon={HashtagIcon} /> the-everyday
                </div>
                <div className="mini-channel highlighted">
                  <Icon icon={HashtagIcon} /> wildly-specific-interests{" "}
                  <span>2</span>
                </div>
                <div className="mini-channel">
                  <Icon icon={HashtagIcon} /> good-news-only
                </div>
              </div>
              <span className="feature-number">01 / FIND YOUR CORNER</span>
              <h3>A room for every rabbit hole.</h3>
              <p>
                Give every conversation a home. Keep your projects, inside
                jokes, and very important pet pictures in their own channels.
              </p>
            </article>
            <article className="feature-card">
              <div className="feature-visual conversation-visual">
                <span className="mini-bubble bubble-one">
                  anyone else still working on this? <span>12:04 AM</span>
                </span>
                <span className="mini-bubble bubble-two">
                  right here with you. <span>🧡</span>
                </span>
                <span className="bubble-reaction">
                  🤝 <span>3</span>
                </span>
              </div>
              <span className="feature-number">
                02 / PICK UP WHERE YOU LEFT OFF
              </span>
              <h3>The conversation stays open.</h3>
              <p>
                Drop a thought. Share a small win. There’s no algorithm to keep
                up with, just a conversation to come back to.
              </p>
            </article>
            <article className="feature-card">
              <div className="feature-visual open-visual">
                <div className="open-code">
                  <Icon icon={SourceCodeIcon} size={44} />
                </div>
                <span className="source-tag">
                  <span className="online-dot" /> built in the open
                </span>
              </div>
              <span className="feature-number">03 / MAKE IT YOURS</span>
              <h3>Your community. Your call.</h3>
              <p>
                Open source at heart, with self-hosting in sight. Help shape a
                space that belongs to the people who use it.
              </p>
            </article>
          </div>
        </section>
        <section id="open-source" className="open-source-section content-width">
          <div className="open-source-copy">
            <span className="eyebrow">OPEN BY NATURE</span>
            <h2>
              A little less platform.
              <br />A lot more people.
            </h2>
            <p>
              We miss when the internet felt like a place to hang out.
              <br className="desktop-break" /> So we’re building a little corner
              of it, together.
            </p>
            <p>
              drocsid is an open-source project, made for communities who want a
              space of their own. No big pitch. Just good company.
            </p>
            <div className="open-source-note">
              <Icon icon={GithubIcon} size={20} />
              <span>
                Our public repository is coming with the first release.
              </span>
            </div>
          </div>
          <div className="open-source-art" aria-hidden="true">
            <div className="open-stamp">
              <span>MADE OF PEOPLE</span>
              <LogoMark />
              <span>NOT ALGORITHMS</span>
            </div>
            <span className="open-art-note">
              a work in progress.
              <br />
              just like the rest of us.
            </span>
          </div>
        </section>
        <section id="faq" className="faq-section content-width">
          <div>
            <span className="eyebrow">GLAD YOU ASKED</span>
            <h2>
              A few things
              <br />
              you might wonder.
            </h2>
            <p>New here? You’re in good company.</p>
          </div>
          <div className="faq-list">
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
        <section className="closing-section">
          <span className="little-asterisk" aria-hidden="true">
            ✳
          </span>
          <h2>
            Your people are out there.
            <br />
            Give them a place to land.
          </h2>
          <Link to="/sign-up" className="button button-dark">
            Make yourself at home <Icon icon={ArrowRight01Icon} size={19} />
          </Link>
          <span className="closing-footnote">
            Good conversations start with a hello.
          </span>
        </section>
      </main>
      <footer className="site-footer content-width">
        <Logo />
        <span>A little corner of the internet, for you.</span>
        <a href="#open-source">
          Made in the open <Icon icon={HeartCheckIcon} size={16} />
        </a>
        <span className="copyright">© {new Date().getFullYear()} drocsid</span>
      </footer>
    </div>
  );
}
