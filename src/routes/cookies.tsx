import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/cookies")({
  head: () => ({ meta: [{ title: "Cookie Policy — Drocsid" }] }),
  component: CookiePolicy,
});

function CookiePolicy() {
  return (
    <LegalPage
      title="Cookie Policy"
      description="This page explains how the official Drocsid service uses cookies and similar browser storage."
    >
      <section>
        <h2>1. What these technologies are</h2>
        <p>
          Cookies are small values a website asks your browser to store. Local and
          session storage let a web application keep limited information in your
          browser. Drocsid uses these technologies to maintain sessions, remember
          choices, understand use, and diagnose problems.
        </p>
      </section>

      <section>
        <h2>2. Essential storage</h2>
        <p>
          Authentication cookies keep you signed in and protect account access.
          Drocsid also stores interface choices such as your selected theme and may
          keep temporary connection or workflow state. Blocking essential cookies
          can prevent sign-in and other core features from working.
        </p>
      </section>

      <section>
        <h2>3. Analytics and diagnostics</h2>
        <p>
          PostHog may store identifiers used to measure page views, product events,
          sessions, and reliability. Sentry may use browser storage to connect error
          reports, traces, and privacy-masked replay data into a diagnostic session.
          These tools help us understand failures and improve the hosted service.
        </p>
      </section>

      <section>
        <h2>4. Your controls</h2>
        <p>
          Most browsers let you inspect, delete, or block cookies and site storage.
          You can clear Drocsid’s stored data through your browser settings. Doing so
          may sign you out, reset preferences, or interrupt active uploads and
          conversations. Browser privacy controls may also limit analytics.
        </p>
        <p>
          For more about the information connected to these technologies and your
          data rights, read the <Link to="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>5. Changes</h2>
        <p>
          We may update this policy when storage practices or providers change. The
          effective date shown on this page identifies the current version.
        </p>
      </section>
    </LegalPage>
  );
}
