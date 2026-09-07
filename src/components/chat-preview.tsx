import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  HashtagIcon,
  Add01Icon,
  Search01Icon,
  SmileIcon,
  UserGroupIcon,
  Notification01Icon,
  Sun03Icon,
  Leaf01Icon,
  Coffee01Icon,
} from "@hugeicons/core-free-icons";
import { Avatar, Icon, LogoMark } from "./ui";

const conversations = {
  general: [
    {
      name: "Jamie",
      color: "purple",
      time: "10:42 AM",
      text: "Morning, everyone! What are we making today? ☀️",
      reaction: "☀️",
      count: 4,
    },
    {
      name: "Alex",
      color: "peach",
      time: "10:44 AM",
      text: "Finally giving my side project a little love. And an unreasonable amount of coffee.",
      reaction: "☕",
      count: 3,
    },
    {
      name: "Sam",
      color: "green",
      time: "10:45 AM",
      text: "A playlist for people who have 37 tabs open and call it a workflow 🎶",
      reaction: "🤝",
      count: 6,
    },
    {
      name: "Riley",
      color: "yellow",
      time: "10:46 AM",
      text: "I feel very seen by this conversation.",
      reaction: "🧡",
      count: 2,
    },
  ],
  introductions: [
    {
      name: "Riley",
      color: "yellow",
      time: "9:12 AM",
      text: "Hey, I’m Riley! Designer, weekend baker, and a collector of unfinished notebooks.",
      reaction: "👋",
      count: 8,
    },
    {
      name: "Jamie",
      color: "purple",
      time: "9:14 AM",
      text: "You’re in exactly the right place. Welcome to the corner! Make yourself at home.",
      reaction: "🧡",
      count: 5,
    },
    {
      name: "Alex",
      color: "peach",
      time: "9:16 AM",
      text: "Important question: sourdough or cinnamon rolls?",
      reaction: "🥐",
      count: 3,
    },
  ],
  "show-and-tell": [
    {
      name: "Sam",
      color: "green",
      time: "11:03 AM",
      text: "Small win: shipped the first version of my little reading tracker today! 📚",
      reaction: "🎉",
      count: 7,
    },
    {
      name: "Jamie",
      color: "purple",
      time: "11:05 AM",
      text: "The best feeling. What was your favorite part of building it?",
      reaction: "✨",
      count: 3,
    },
    {
      name: "Sam",
      color: "green",
      time: "11:07 AM",
      text: "Honestly? Sharing it with you all.",
      reaction: "🧡",
      count: 9,
    },
  ],
  "off-topic": [
    {
      name: "Alex",
      color: "peach",
      time: "2:15 PM",
      text: "This is your reminder to drink some water and look at something that isn’t a screen. 🌿",
      reaction: "💧",
      count: 5,
    },
    {
      name: "Riley",
      color: "yellow",
      time: "2:17 PM",
      text: "Does staring at my houseplant while thinking about my screen count?",
      reaction: "😂",
      count: 8,
    },
    {
      name: "Jamie",
      color: "purple",
      time: "2:18 PM",
      text: "We’ll allow it.",
      reaction: "🌱",
      count: 4,
    },
  ],
};
type Channel = keyof typeof conversations;

export function ChatPreview() {
  const [channel, setChannel] = useState<Channel>("general");
  const [reactions, setReactions] = useState<Record<string, boolean>>({});
  return (
    <div className="preview-shell" id="preview">
      <div className="preview-titlebar">
        <div className="window-dots">
          <i />
          <i />
          <i />
        </div>
        <span>GOOD PEOPLE, ONE LITTLE CORNER OF THE INTERNET.</span>
        <span className="preview-label">
          A SNEAK PEEK <span>↗</span>
        </span>
      </div>
      <div className="chat-app">
        <aside className="server-rail" aria-label="Community preview">
          <div className="rail-home">
            <LogoMark />
          </div>
          <div className="rail-divider" />
          <span className="server-icon active" title="The Creative Corner">
            <Icon icon={Sun03Icon} size={27} />
          </span>
          <span className="server-icon leaf" title="The Greenhouse">
            <Icon icon={Leaf01Icon} size={25} />
          </span>
          <span className="server-icon coffee" title="Coffee Club">
            <Icon icon={Coffee01Icon} size={25} />
          </span>
          <Link
            className="server-icon add-server"
            to="/app"
            aria-label="Create your community"
          >
            <Icon icon={Add01Icon} />
          </Link>
          <div className="rail-bottom">
            <Avatar name="You" color="blue" small />
          </div>
        </aside>
        <aside className="channel-sidebar">
          <div className="community-title">
            <div>
              <strong>The Creative Corner</strong>
              <span>
                <i className="online-dot" />
                12 people around
              </span>
            </div>
            <Icon icon={ArrowDown01Icon} size={16} />
          </div>
          <div className="channel-group">
            <span>THE COMMON ROOM</span>
            <Icon icon={Add01Icon} size={14} />
          </div>
          <div className="channel-list" aria-label="Preview channels">
            {(Object.keys(conversations) as Channel[]).map((item) => (
              <button
                key={item}
                className={`channel ${channel === item ? "selected" : ""}`}
                onClick={() => setChannel(item)}
                aria-pressed={channel === item}
              >
                <Icon icon={HashtagIcon} size={18} />
                {item}
                {item === "show-and-tell" && (
                  <span className="unread-count">3</span>
                )}
              </button>
            ))}
          </div>
          <div className="channel-group friends-label">
            <span>YOUR PEOPLE</span>
          </div>
          <div className="friend">
            <Avatar name="Jamie" color="purple" small />
            <span>Jamie</span>
            <i className="online-dot" />
          </div>
          <div className="friend">
            <Avatar name="Alex" small />
            <span>Alex</span>
            <i className="online-dot" />
          </div>
          <div className="friend">
            <Avatar name="Sam" color="green" small />
            <span>Sam</span>
            <i className="online-dot" />
          </div>
        </aside>
        <section
          className="chat-conversation"
          aria-label={`${channel} conversation preview`}
        >
          <header className="chat-header">
            <div>
              <Icon icon={HashtagIcon} />
              <strong>{channel}</strong>
              <span className="channel-description">
                A place for a little bit of everything.
              </span>
            </div>
            <div className="chat-header-icons" aria-hidden="true">
              <Icon icon={Notification01Icon} size={17} />
              <Icon icon={UserGroupIcon} size={18} />
              <Icon icon={Search01Icon} size={18} />
            </div>
          </header>
          <div className="messages">
            <div className="date-separator">
              <span>Today, September 6</span>
            </div>
            {conversations[channel].map((message) => {
              const key = `${channel}-${message.name}`;
              return (
                <div className="message" key={key}>
                  <Avatar name={message.name} color={message.color} />
                  <div className="message-content">
                    <div className="message-meta">
                      <strong>{message.name}</strong>
                      <span>{message.time}</span>
                      {message.name === "Jamie" && <em>the friendly one</em>}
                    </div>
                    <p>{message.text}</p>
                    <button
                      className={`reaction ${reactions[key] ? "reacted" : ""}`}
                      aria-label={`${reactions[key] ? "Remove" : "Add"} ${message.reaction} reaction to ${message.name}'s message`}
                      aria-pressed={!!reactions[key]}
                      onClick={() =>
                        setReactions((current) => ({
                          ...current,
                          [key]: !current[key],
                        }))
                      }
                    >
                      {message.reaction}
                      <span>{message.count + (reactions[key] ? 1 : 0)}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="composer-area">
            <Link to="/app" className="preview-composer">
              <Icon icon={Add01Icon} />
              <span>Your next good conversation starts here...</span>
              <Icon icon={SmileIcon} />
            </Link>
            <div className="typing-indicator">
              <span className="typing-dots">
                <i />
                <i />
                <i />
              </span>
              <strong>Jamie</strong> is probably typing something nice
            </div>
          </div>
        </section>
      </div>
      <div className="preview-bottom">
        <span>
          <i className="online-dot" /> Room for everyone. Including you.
        </span>
        <Link to="/app">
          Come on in <Icon icon={ArrowUpRight01Icon} size={15} />
        </Link>
      </div>
    </div>
  );
}
