import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/acceptable-use")({
  head: () => ({ meta: [{ title: "Acceptable Use Policy — Drocsid" }] }),
  component: AcceptableUse,
});

function AcceptableUse() {
  return (
    <LegalPage
      title="Acceptable Use"
      description="Use Drocsid to bring people together without putting people, communities, or the service at risk."
    >
      <section>
        <h2>1. Safety and illegal activity</h2>
        <p>You may not use Drocsid to:</p>
        <ul>
          <li>Exploit or endanger a child, distribute child sexual abuse material, or sexualize minors.</li>
          <li>Threaten, facilitate, celebrate, or coordinate violence, terrorism, human trafficking, or self-harm.</li>
          <li>Buy, sell, or coordinate illegal goods, services, or activity.</li>
          <li>Share another person’s highly sensitive information without authorization or use Drocsid for stalking.</li>
        </ul>
      </section>

      <section>
        <h2>2. Abuse and deception</h2>
        <ul>
          <li>Do not harass, bully, intimidate, or target people with hateful conduct.</li>
          <li>Do not impersonate a person or organization deceptively, commit fraud, run scams, or manipulate others for financial or account access.</li>
          <li>Do not send spam, unsolicited bulk messages, artificial engagement, or misleading invitations.</li>
          <li>Do not use intimate or sexual content without the informed consent of every person depicted.</li>
        </ul>
      </section>

      <section>
        <h2>3. Security and service integrity</h2>
        <ul>
          <li>Do not distribute malware, phishing material, credential theft tools, or malicious code.</li>
          <li>Do not probe, scan, or exploit Drocsid or another user’s systems without clear authorization.</li>
          <li>Do not bypass access controls, rate limits, blocks, suspensions, or technical restrictions.</li>
          <li>Do not overload, scrape, automate, or interfere with the hosted service in a way that harms availability or privacy.</li>
        </ul>
        <p>
          Good-faith security research should avoid accessing other people’s data,
          degrading the service, or publicly disclosing an unresolved vulnerability.
          Report findings privately to hello@drocsid.app.
        </p>
      </section>

      <section>
        <h2>4. Rights and authenticity</h2>
        <p>
          Do not upload material that infringes copyright, trademark, privacy,
          publicity, or other rights. Do not remove ownership notices or falsely
          claim another person’s work. Parody and fan communities are welcome when
          they are lawful and do not mislead people about affiliation.
        </p>
      </section>

      <section>
        <h2>5. Enforcement</h2>
        <p>
          We consider context, severity, history, intent, and risk. Responses can
          include warnings, content removal, feature limits, community restrictions,
          account suspension, termination, preservation of evidence, and reports to
          relevant authorities when required or necessary to address imminent harm.
          Attempts to evade an action may lead to further restrictions.
        </p>
        <p>
          Report violations with the relevant community, channel, message, account,
          and supporting context to hello@drocsid.app. Do not place illegal or highly
          sensitive material in the report when a description or message identifier
          is enough.
        </p>
      </section>
    </LegalPage>
  );
}
