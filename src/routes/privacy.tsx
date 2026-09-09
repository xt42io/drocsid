import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Drocsid" },
      {
        name: "description",
        content: "How Drocsid collects, uses, stores, and shares personal data.",
      },
    ],
  }),
  component: PrivacyPolicy,
});

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains what the official Drocsid service collects, why we use it, and the choices you have."
    >
      <section>
        <h2>1. Scope and who is responsible</h2>
        <p>
          This policy applies to the official Drocsid website, hosted application,
          and related services at drocsid.app and drocsid.cc. “Drocsid,” “we,” and
          “us” mean the maintainers operating those services.
        </p>
        <p>
          Drocsid is open-source software. Anyone can run a separate instance. A
          third-party or self-hosted instance controls its own data and must provide
          its own privacy information; this policy does not cover it.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3>Account and profile information</h3>
        <p>
          We collect your email address, display name, username, profile photo,
          bio, activity text, presence choice, preferences, and account creation
          and update times. If you use GitHub or Discord to sign in, we receive the
          account identifiers and profile information that provider shares under
          the permissions shown during authorization. Authentication records may
          include provider tokens needed to maintain the connection.
        </p>
        <h3>Content and relationships</h3>
        <p>
          We store messages, replies, reactions, attachments, saved messages,
          community and channel information, memberships, roles, invitations,
          friendships, message requests, blocks, read state, and notification
          state. Other people can see content according to the community, channel,
          and direct-message access rules in the product.
        </p>
        <h3>Technical and usage information</h3>
        <p>
          We process session identifiers, IP address, browser user agent, request
          and security-limit records, WebSocket connection state, diagnostics,
          performance traces, page views, and product interaction events. Sentry
          session replay is configured to mask text, block media, and omit cookies,
          request bodies, query parameters, database query data, and user details.
        </p>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul>
          <li>Provide accounts, authentication, communities, messaging, uploads, search, and realtime delivery.</li>
          <li>Apply your preferences, permissions, blocks, moderation decisions, and privacy choices.</li>
          <li>Secure the service, prevent abuse, enforce rate limits, and investigate faults.</li>
          <li>Understand reliability and feature usage so we can improve Drocsid.</li>
          <li>Send requested sign-in codes and necessary service communications.</li>
          <li>Comply with law and protect users, the public, and the service.</li>
        </ul>
        <p>
          Where data-protection law requires a legal basis, we rely on performance
          of our agreement with you, our legitimate interests in operating and
          securing the service, compliance with legal obligations, and consent
          where the law requires it. You may withdraw consent without affecting
          earlier lawful processing.
        </p>
      </section>

      <section>
        <h2>4. When information is shared</h2>
        <p>
          We share information with other users when the feature requires it. For
          example, community members see channel content and participants see direct
          messages. Public community names, descriptions, icons, and member counts
          can appear in discovery when an administrator enables discoverability.
        </p>
        <p>We also use service providers to operate Drocsid:</p>
        <ul>
          <li>PostgreSQL and hosting infrastructure for application data and service delivery.</li>
          <li>Byteship for private file storage and image transformation.</li>
          <li>Sendbyte for delivery of email verification codes.</li>
          <li>PostHog for product analytics and error signals.</li>
          <li>Sentry for error monitoring, traces, and privacy-masked session replay.</li>
          <li>GitHub and Discord when you choose their sign-in options.</li>
        </ul>
        <p>
          We may disclose information when required by law, to respond to valid
          legal process, to protect safety or rights, or as part of a reorganization
          of the hosted service. We do not sell personal information.
        </p>
      </section>

      <section>
        <h2>5. Storage, retention, and deletion</h2>
        <p>
          We retain account data and user content while your account is active and
          as needed to provide the service. Messages remain available until they are
          deleted by an authorized user or the relevant conversation is removed.
          Deleted messages become unavailable in the product; related stored files
          are queued for removal. Short-lived verification, security, and delivery
          records expire or are periodically cleaned up.
        </p>
        <p>
          Residual copies may remain temporarily in backups, logs, or systems that
          protect service integrity. We may retain limited records when reasonably
          needed for security, dispute resolution, legal compliance, or enforcement.
          To request account access, correction, export, or deletion, contact us at
          hello@drocsid.app from the email connected to your account.
        </p>
      </section>

      <section>
        <h2>6. Cookies and local storage</h2>
        <p>
          Drocsid uses a session cookie to keep you signed in and browser storage
          for preferences and service operation. Analytics may also store a device
          or session identifier. See our <Link to="/cookies">Cookie Policy</Link> for
          details and controls.
        </p>
      </section>

      <section>
        <h2>7. International processing and security</h2>
        <p>
          Drocsid and its providers may process information in countries other than
          yours. Where required, we use appropriate safeguards for those transfers.
          We use access checks, private object storage, signed delivery links,
          encrypted network connections, hashed one-time codes, and other technical
          and organizational safeguards. No online service can guarantee absolute
          security, so protect your account and report suspected compromise promptly.
        </p>
      </section>

      <section>
        <h2>8. Your choices and rights</h2>
        <p>
          You can update your profile, notification settings, activity visibility,
          direct-message preference, community discoverability where you are an
          administrator, and blocked-user list in the app. You can disconnect an
          OAuth provider through that provider and control cookies through your
          browser.
        </p>
        <p>
          Depending on where you live, you may have rights to access, correct,
          delete, restrict, object to, or receive a portable copy of personal data,
          and to complain to a data-protection authority. Contact us to exercise a
          right. We may verify your identity before completing a request.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          Drocsid is not intended for children under 13. If local law requires a
          higher age to use an online service without parental consent, that higher
          age applies. Contact us if you believe a child provided personal data in
          violation of this section.
        </p>
      </section>

      <section>
        <h2>10. Changes to this policy</h2>
        <p>
          We may update this policy as Drocsid changes. We will revise the effective
          date and provide additional notice when a change materially affects your
          rights or how we use personal data.
        </p>
      </section>
    </LegalPage>
  );
}
