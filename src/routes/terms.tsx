import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Drocsid" },
      { name: "description", content: "Terms for using the official Drocsid service." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These terms are the agreement between you and the maintainers of the official Drocsid hosted service."
    >
      <section>
        <h2>1. Accepting these terms</h2>
        <p>
          By creating an account, accepting an invitation, or using the official
          Drocsid service, you agree to these Terms, the <Link to="/privacy">Privacy Policy</Link>,
          and the <Link to="/acceptable-use">Acceptable Use Policy</Link>. If you do
          not agree, do not use the service.
        </p>
        <p>
          You must be at least 13 and legally able to enter this agreement. If the
          law where you live requires a higher age or parental permission, you must
          meet that requirement. If you use Drocsid for an organization, you confirm
          that you may accept these Terms for it.
        </p>
      </section>

      <section>
        <h2>2. Your account</h2>
        <p>
          Provide accurate information, keep control of your email and connected
          sign-in providers, and tell us promptly about unauthorized access. You are
          responsible for activity performed through your account unless caused by
          our failure to use reasonable security. You may not sell, transfer, or
          share an account in a way that defeats identity or safety controls.
        </p>
      </section>

      <section>
        <h2>3. Communities and content</h2>
        <p>
          You keep ownership of content you submit. You give us a worldwide,
          non-exclusive, royalty-free license to host, copy, process, transform, and
          display that content only as needed to operate, secure, and improve the
          service. This license ends when the content is deleted, except for copies
          reasonably retained in backups, legal records, or content shared by others.
        </p>
        <p>
          You must have the rights needed to submit your content. Community owners
          and their delegates can organize spaces, manage access, and moderate
          channel content. Their rules may add to ours but cannot override these
          Terms. Private channels and direct messages have access controls, but you
          should only share information you are comfortable entrusting to recipients
          and the service operators.
        </p>
      </section>

      <section>
        <h2>4. Using Drocsid responsibly</h2>
        <p>
          Follow the <Link to="/acceptable-use">Acceptable Use Policy</Link> and
          respect the <Link to="/community-guidelines">Community Guidelines</Link>.
          Do not use Drocsid to break the law, harm people, violate rights, interfere
          with the service, or evade enforcement. We may investigate reports and
          preserve or disclose information when reasonably required for safety,
          security, or legal compliance.
        </p>
      </section>

      <section>
        <h2>5. The hosted service and open-source code</h2>
        <p>
          These Terms govern use of the official hosted service. The Drocsid source
          code is separately available under the GNU Affero General Public License
          version 3. The license grants rights to copy, modify, and distribute the
          software subject to its conditions; it does not grant access to our hosted
          accounts, domains, infrastructure, branding, or user data.
        </p>
        <p>
          Third-party libraries, services, and content may have their own terms and
          licenses. Your use of GitHub or Discord sign-in is also subject to the
          terms you have with those providers.
        </p>
      </section>

      <section>
        <h2>6. Changes, availability, and beta features</h2>
        <p>
          Drocsid is evolving. We may add, change, limit, or discontinue features;
          set reasonable storage or usage limits; or suspend the service for
          maintenance and security. We aim to communicate material changes, but we
          do not promise uninterrupted or error-free availability. Keep your own
          copies of content you cannot afford to lose.
        </p>
      </section>

      <section>
        <h2>7. Enforcement and ending use</h2>
        <p>
          You may stop using Drocsid at any time and request account deletion. We
          may remove content, restrict features, suspend an account, or terminate
          access when reasonably necessary to enforce these Terms, protect users or
          the service, comply with law, or address a serious risk. When practical,
          we will give notice and an opportunity to appeal at hello@drocsid.app.
        </p>
        <p>
          Sections that by their nature should survive termination—including rights
          concerning existing copies, disclaimers, liability limits, and dispute
          provisions—continue to apply.
        </p>
      </section>

      <section>
        <h2>8. Disclaimers</h2>
        <p>
          To the maximum extent permitted by law, the hosted service is provided
          “as is” and “as available.” We disclaim implied warranties of
          merchantability, fitness for a particular purpose, non-infringement, and
          uninterrupted operation. Nothing in these Terms excludes a warranty or
          consumer right that cannot lawfully be excluded.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Drocsid’s maintainers will not be
          liable for indirect, incidental, special, consequential, exemplary, or
          punitive damages, or for lost profits, data, goodwill, or opportunities,
          arising from the service. Our aggregate liability relating to the hosted
          service will not exceed the greater of the amount you paid us during the
          previous 12 months or US$100. These limits do not apply where prohibited
          by law or to liability that cannot lawfully be limited.
        </p>
      </section>

      <section>
        <h2>10. Disputes and general terms</h2>
        <p>
          Contact us first so we can try to resolve a dispute informally. Applicable
          law governs these Terms without overriding mandatory rights you have where
          you live. If one provision is unenforceable, the remaining provisions
          continue. A delay in enforcing a provision is not a waiver. You may not
          transfer this agreement without our consent; we may transfer it as part of
          a reorganization of the hosted service.
        </p>
      </section>

      <section>
        <h2>11. Changes to these terms</h2>
        <p>
          We may update these Terms. We will revise the effective date and provide
          reasonable notice of material changes. Continuing to use the service after
          an update takes effect means you accept the revised Terms.
        </p>
      </section>
    </LegalPage>
  );
}
