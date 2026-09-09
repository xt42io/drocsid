import { createFileRoute, Link } from "@tanstack/react-router";
import { LegalPage } from "../components/legal-page";

export const Route = createFileRoute("/community-guidelines")({
  head: () => ({ meta: [{ title: "Community Guidelines — Drocsid" }] }),
  component: CommunityGuidelines,
});

function CommunityGuidelines() {
  return (
    <LegalPage
      title="Community Guidelines"
      description="Drocsid works best when people can disagree, create, and be themselves without making the room unsafe."
    >
      <section>
        <h2>Make room for people</h2>
        <p>
          Speak to people, not at them. Challenge ideas without degrading the person
          behind them. Avoid repeated unwanted contact, dogpiling, slurs, threats,
          sexual harassment, and attacks based on identity or vulnerability.
        </p>
      </section>

      <section>
        <h2>Respect boundaries</h2>
        <p>
          A direct message is an invitation to talk, not an entitlement to someone’s
          attention. Respect declines, blocks, channel rules, and requests to stop.
          Ask before sharing private conversations, personal details, or sensitive
          images outside their original context.
        </p>
      </section>

      <section>
        <h2>Share with care</h2>
        <p>
          Use clear labels and appropriate channels for sexual, graphic, flashing,
          or otherwise sensitive material. Never share exploitative sexual content,
          content involving minors, or intimate media without consent. Credit
          creators and only post material you have the right to share.
        </p>
      </section>

      <section>
        <h2>Build communities responsibly</h2>
        <p>
          Owners, administrators, and moderators should publish understandable
          rules, apply them consistently, protect member privacy, and use elevated
          permissions for the community’s benefit. Community rules may be stricter
          than these guidelines, but they must also follow the
          <Link to="/acceptable-use"> Acceptable Use Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Help us respond</h2>
        <p>
          Preserve relevant message links or identifiers and report urgent safety
          issues to hello@drocsid.app. If someone faces immediate danger, contact
          local emergency services first. Do not retaliate against people who make
          a good-faith report or participate in an investigation.
        </p>
      </section>

      <section>
        <h2>What happens after a violation</h2>
        <p>
          Community moderators can act within their spaces. Drocsid’s maintainers
          may also remove content or restrict accounts when the hosted service or
          its users are at risk. We weigh context and severity, and we welcome
          appeals at hello@drocsid.app when you believe a decision missed important
          information.
        </p>
      </section>
    </LegalPage>
  );
}
