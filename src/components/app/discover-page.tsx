import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../../lib/app-state";
import { AppIcon, EmptyState, PageHeading } from "./primitives";

export function DiscoverPage() {
  const { state, joinCommunity, setModal } = useApp();
  const navigate = useNavigate();
  const [category, setCategory] = useState("All corners");
  const [query, setQuery] = useState("");
  const categories = [
    "All corners",
    "Design & making",
    "Technology",
    "Life & hobbies",
    "Books & culture",
    "Gaming",
  ];
  const communities = state.communities.filter(
    (c) =>
      (category === "All corners" || c.category === category) &&
      `${c.name} ${c.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="a-page a-discover-page">
      <PageHeading
        eyebrow="THE INTERNET CAN STILL FEEL SMALL"
        title="Find your kind of people."
        description="A place for every wonderfully specific interest."
      />
      <div className="a-discover-hero">
        <div>
          <span className="a-eyebrow">OPEN DOORS. GOOD COMPANY.</span>
          <h2>
            Somewhere in here,
            <br />
            there’s a corner for you.
          </h2>
          <p>
            You don’t have to have it all figured out.
            <br />
            Just bring a little curiosity.
          </p>
          <label className="a-search-field">
            <AppIcon name="search" size={19} />
            <input
              aria-label="Search communities"
              placeholder="Find your next favorite corner"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="a-discover-symbols" aria-hidden="true">
          <span className="tone-purple">
            <AppIcon name="book" size={43} />
          </span>
          <span className="tone-green">
            <AppIcon name="leaf" size={49} />
          </span>
          <span className="tone-peach">
            <AppIcon name="sun" size={61} />
          </span>
          <span className="tone-yellow">
            <AppIcon name="coffee" size={40} />
          </span>
          <i>THERE’S ROOM FOR YOU HERE.</i>
        </div>
      </div>
      <div className="a-category-filters" aria-label="Filter communities">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            aria-pressed={category === item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="a-discover-heading">
        <h2>
          {query
            ? "A few corners to explore."
            : category === "All corners"
              ? "Good places to start."
              : category}
        </h2>
        <span>
          {communities.length}{" "}
          {communities.length === 1 ? "community" : "communities"} · sample
          directory
        </span>
      </div>
      <div className="a-community-grid">
        {communities.map((community) => (
          <article className="a-community-card" key={community.id}>
            <div className={`a-community-card-cover tone-${community.color}`}>
              <span>{community.category.toUpperCase()}</span>
              <AppIcon name={community.icon} size={74} />
              <i>
                {community.joined ? (
                  <>
                    <AppIcon name="check" size={13} />
                    YOUR CORNER
                  </>
                ) : (
                  "OPEN DOOR"
                )}
              </i>
            </div>
            <div className="a-community-card-body">
              <h3>{community.name}</h3>
              <p>{community.description}</p>
              <div className="a-community-card-footer">
                <span>
                  <i className="a-status-dot online" />
                  {community.members.toLocaleString()} kind humans
                </span>
                <button
                  className={`a-button ${community.joined ? "secondary" : "primary"} small`}
                  onClick={() => {
                    joinCommunity(community.id);
                    void navigate({
                      to: "/app/community/$communityId/$channelId",
                      params: {
                        communityId: community.id,
                        channelId: "general",
                      },
                    });
                  }}
                >
                  {community.joined ? "Open" : "Join"}
                  <AppIcon name="right" size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {communities.length === 0 && (
        <EmptyState
          icon="search"
          title="A corner we haven’t found yet."
          description="Try another search. Or make a little space of your own."
        >
          <button
            className="a-button primary"
            onClick={() => setModal({ type: "create-community" })}
          >
            Create a community
          </button>
        </EmptyState>
      )}
      <div className="a-create-own-banner">
        <div>
          <h3>Your kind of place doesn’t exist yet?</h3>
          <p>That’s a pretty good reason to make it.</p>
        </div>
        <button
          className="a-button secondary"
          onClick={() => setModal({ type: "create-community" })}
        >
          Start your own corner <AppIcon name="plus" size={17} />
        </button>
      </div>
    </div>
  );
}
export function InvitePage({ communityId }: { communityId: string }) {
  const { state, joinCommunity } = useApp();
  const navigate = useNavigate();
  const community = state.communities.find((c) => c.id === communityId);
  if (!community)
    return (
      <div className="a-invitation-page">
        <EmptyState
          icon="mail"
          title="This invitation wandered off."
          description="This local preview invitation isn’t available in your browser."
        >
          <Link to="/app/discover" className="a-button primary">
            Explore communities
          </Link>
        </EmptyState>
      </div>
    );
  return (
    <div className="a-invitation-page">
      <Link to="/" className="a-invitation-brand">
        drocsid<span>.</span>
      </Link>
      <div className="a-invitation-card">
        <div className={`a-invitation-cover tone-${community.color}`}>
          <AppIcon name={community.icon} size={79} />
          <span>A LITTLE CORNER. A LOT OF POSSIBILITY.</span>
        </div>
        <div className="a-invitation-body">
          <span className="a-eyebrow">THERE’S A SPOT WITH YOUR NAME ON IT</span>
          <h1>You’re invited.</h1>
          <h2>{community.name}</h2>
          <p>{community.description}</p>
          <span className="a-invitation-members">
            <i className="a-status-dot online" />
            {community.members} kind humans. Room for one more.
          </span>
          <button
            className="a-button primary full"
            onClick={() => {
              joinCommunity(community.id);
              void navigate({
                to: "/app/community/$communityId/$channelId",
                params: {
                  communityId: community.id,
                  channelId: community.channels.some((c) => c.id === "general")
                    ? "general"
                    : community.channels[0].id,
                },
              });
            }}
          >
            {community.joined ? "Come on back in" : "Make yourself at home"}
            <AppIcon name="right" size={18} />
          </button>
          <p className="a-form-footnote">
            This is a local preview invitation. Joining changes this browser’s
            sample data only.
          </p>
        </div>
      </div>
      <Link to="/app/discover" className="a-text-link">
        Or look around a little first <AppIcon name="external" size={16} />
      </Link>
    </div>
  );
}
