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
    <div
      data-ui="preview-shell"
      className="border border-solid border-[#d3d4ca] rounded-[11px] overflow-hidden shadow-[0_3px_1px_#30312703,0_18px_60px_#2426130a] scroll-mt-7"
      id="preview"
    >
      <div
        data-ui="preview-titlebar"
        className="h-9.5 py-0 px-4 bg-[#edeee7] [border-bottom-width:1px] [border-bottom-style:solid] border-b-[#daddd1] flex items-center justify-between font-mono text-[8px] tracking-[1px] text-[#7f8378] max-[800px]:[&>span:first-of-type]:text-[6px] max-[800px]:[&>span:first-of-type]:tracking-[0.5px] max-[580px]:h-7.5 max-[580px]:px-2.5 max-[580px]:[&>span:first-of-type]:hidden"
      >
        <div
          data-ui="window-dots"
          className="flex gap-1.5 w-22.75 [&_i]:rounded-full [&_i]:border [&_i]:border-solid [&_i]:border-[#c3c7ba] [&_i]:size-1.75 [&_i:first-child]:bg-[#c9cdbf] max-[580px]:w-auto max-[580px]:[&_i]:size-1.5"
        >
          <i />
          <i />
          <i />
        </div>
        <span>GOOD PEOPLE, ONE LITTLE CORNER OF THE INTERNET.</span>
        <span
          data-ui="preview-label"
          className="text-[8px] [&_span]:ml-1.5 max-[580px]:text-[7px]"
        >
          A SNEAK PEEK <span>↗</span>
        </span>
      </div>
      <div
        data-ui="chat-app"
        className="flex h-112.75 max-[800px]:h-112.75 max-[580px]:block max-[580px]:h-auto max-[580px]:min-h-117.5"
      >
        <aside
          data-ui="server-rail"
          className="w-15.75 pt-3.5 pb-3 px-2.25 bg-[#e8ebdf] shrink-0 flex items-center flex-col gap-2.5 [border-right-width:1px] [border-right-style:solid] border-r-[#daddd3] max-[800px]:w-13 max-[800px]:px-1.5 max-[580px]:hidden"
          aria-label="Community preview"
        >
          <div
            data-ui="rail-home"
            className="text-[#555e43] h-8.5 **:data-[ui~=logo-mark]:size-7.25"
          >
            <LogoMark />
          </div>
          <div
            data-ui="rail-divider"
            className="h-px w-6.5 bg-[#ced4c3] mt-0.5 mb-1 mx-0"
          />
          <span
            data-ui="server-icon active"
            className="relative flex items-center justify-center rounded-[13px] text-[#7b8960] bg-[#e0e5d5] size-10 data-[ui~=active]:bg-[#f3aa76] data-[ui~=active]:text-[#7a4829] data-[ui~=active]:border-2 data-[ui~=active]:border-solid data-[ui~=active]:border-[#bc7c50] [&[data-ui~=active]::before]:[content:''] [&[data-ui~=active]::before]:absolute [&[data-ui~=active]::before]:w-0.75 [&[data-ui~=active]::before]:h-5.75 [&[data-ui~=active]::before]:rounded-[0_3px_3px_0] [&[data-ui~=active]::before]:bg-[#52613a] [&[data-ui~=active]::before]:-left-3.25 max-[800px]:rounded-[10px] max-[800px]:size-8.75 max-[800px]:[&[data-ui~=active]::before]:-left-2.75"
            title="The Creative Corner"
          >
            <Icon icon={Sun03Icon} size={27} />
          </span>
          <span
            data-ui="server-icon leaf"
            className="relative flex items-center justify-center rounded-[13px] text-[#7b8960] bg-[#e0e5d5] size-10 data-[ui~=leaf]:bg-[#d0ddc0] max-[800px]:rounded-[10px] max-[800px]:size-8.75"
            title="The Greenhouse"
          >
            <Icon icon={Leaf01Icon} size={25} />
          </span>
          <span
            data-ui="server-icon coffee"
            className="relative flex items-center justify-center rounded-[13px] text-[#7b8960] bg-[#e0e5d5] size-10 data-[ui~=coffee]:bg-[#e0d5c5] data-[ui~=coffee]:text-[#8d7258] max-[800px]:rounded-[10px] max-[800px]:size-8.75"
            title="Coffee Club"
          >
            <Icon icon={Coffee01Icon} size={25} />
          </span>
          <Link
            data-ui="server-icon add-server"
            className="relative flex items-center justify-center rounded-[13px] text-[#7b8960] bg-transparent border border-dashed border-[#bfc9ac] mt-0.75 [transition:background_0.2s] size-10 hover:bg-[#d2dcc5] max-[800px]:rounded-[10px] max-[800px]:size-8.75"
            to="/app"
            aria-label="Create your community"
          >
            <Icon icon={Add01Icon} />
          </Link>
          <div data-ui="rail-bottom" className="mt-auto">
            <Avatar name="You" color="blue" small />
          </div>
        </aside>
        <aside
          data-ui="channel-sidebar"
          className="relative w-55 shrink-0 py-0 px-3.25 bg-[#f0f1ea] [border-right-width:1px] [border-right-style:solid] border-r-[#e0e2d9] max-[1100px]:w-46.75 max-[800px]:w-41.25 max-[800px]:px-2 max-[580px]:w-full max-[580px]:pt-0 max-[580px]:pb-2.25 max-[580px]:px-2.5 max-[580px]:[border-right-width:0] max-[580px]:[border-right-style:none] max-[580px]:border-r-[currentColor] max-[580px]:[border-bottom-width:1px] max-[580px]:[border-bottom-style:solid] max-[580px]:border-b-[#dfe2d5] max-[580px]:**:data-[ui~=channel-group]:hidden"
        >
          <div
            data-ui="community-title"
            className="h-16.25 flex items-center justify-between py-0 px-0.5 [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-bold [&>div>span]:flex [&>div>span]:items-center [&>div>span]:gap-1.5 [&>div>span]:mt-0.75 [&>div>span]:text-[10px] [&>div>span]:text-[#89907d] max-[800px]:[&_strong]:text-[11px] max-[580px]:h-10.75 max-[580px]:py-0 max-[580px]:px-0.75 max-[580px]:[&_strong]:text-[12px] max-[580px]:[&>div]:flex max-[580px]:[&>div]:items-center max-[580px]:[&>div]:gap-3 max-[580px]:[&>div>span]:mt-0 max-[580px]:[&>div>span]:text-[9px]"
          >
            <div>
              <strong>The Creative Corner</strong>
              <span>
                <i
                  data-ui="online-dot"
                  className="inline-block shrink-0 rounded-full bg-[#2ee68b] size-1.25"
                />
                12 people around
              </span>
            </div>
            <Icon icon={ArrowDown01Icon} size={16} />
          </div>
          <div
            data-ui="channel-group"
            className="flex items-center justify-between font-mono text-[#919688] text-[8px] tracking-[1px] mt-3.75 mb-2.5 py-0 px-2"
          >
            <span>THE COMMON ROOM</span>
            <Icon icon={Add01Icon} size={14} />
          </div>
          <div
            data-ui="channel-list"
            className="flex flex-col gap-1 max-[580px]:flex-row max-[580px]:overflow-x-auto max-[580px]:gap-1 max-[580px]:p-0.5 max-[580px]:scrollbar-none max-[580px]:[&::-webkit-scrollbar]:hidden"
            aria-label="Preview channels"
          >
            {(Object.keys(conversations) as Channel[]).map((item) => (
              <button
                key={item}
                data-ui={`channel ${channel === item ? "selected" : ""}`}
                className="flex items-center gap-2 border-0 border-none border-[currentColor] p-2 bg-transparent rounded-[5px] w-full text-left text-[12px] text-[#7b8171] [&_svg]:text-[#929a85] data-[ui~=selected]:text-[#4d5b37] data-[ui~=selected]:bg-[#e0e6d3] data-[ui~=selected]:font-[650] [&[data-ui~=selected]_svg]:text-[#6d7d53] hover:bg-[#e5e8dc] max-[800px]:text-[10px] max-[800px]:px-1.25 max-[580px]:w-auto max-[580px]:shrink-0 max-[580px]:py-1.5 max-[580px]:px-2.25 max-[580px]:text-[10px] max-[580px]:gap-1 max-[580px]:[&_svg]:size-3.25 max-[580px]:**:data-[ui~=unread-count]:hidden"
                onClick={() => setChannel(item)}
                aria-pressed={channel === item}
              >
                <Icon icon={HashtagIcon} size={18} />
                {item}
                {item === "show-and-tell" && (
                  <span
                    data-ui="unread-count"
                    className="flex items-center justify-center bg-[#e5e6df] rounded-sm text-[9px] ml-auto size-4"
                  >
                    3
                  </span>
                )}
              </button>
            ))}
          </div>
          <div
            data-ui="channel-group friends-label"
            className="flex items-center justify-between font-mono text-[#919688] text-[8px] tracking-[1px] mb-2.5 py-0 px-2 mt-5.75"
          >
            <span>YOUR PEOPLE</span>
          </div>
          <div
            data-ui="friend"
            className="flex items-center gap-2 py-1.25 px-2 text-[11px] text-[#747b68] **:data-[ui~=online-dot]:ml-auto max-[580px]:hidden"
          >
            <Avatar name="Jamie" color="purple" small />
            <span>Jamie</span>
            <i
              data-ui="online-dot"
              className="inline-block shrink-0 rounded-full bg-[#2ee68b] size-1.25"
            />
          </div>
          <div
            data-ui="friend"
            className="flex items-center gap-2 py-1.25 px-2 text-[11px] text-[#747b68] **:data-[ui~=online-dot]:ml-auto max-[580px]:hidden"
          >
            <Avatar name="Alex" small />
            <span>Alex</span>
            <i
              data-ui="online-dot"
              className="inline-block shrink-0 rounded-full bg-[#2ee68b] size-1.25"
            />
          </div>
          <div
            data-ui="friend"
            className="flex items-center gap-2 py-1.25 px-2 text-[11px] text-[#747b68] **:data-[ui~=online-dot]:ml-auto max-[580px]:hidden"
          >
            <Avatar name="Sam" color="green" small />
            <span>Sam</span>
            <i
              data-ui="online-dot"
              className="inline-block shrink-0 rounded-full bg-[#2ee68b] size-1.25"
            />
          </div>
        </aside>
        <section
          data-ui="chat-conversation"
          className="flex flex-col flex-1 min-w-0 bg-[#fffefa] max-[580px]:w-full max-[580px]:min-h-106.25"
          aria-label={`${channel} conversation preview`}
        >
          <header
            data-ui="chat-header"
            className="h-13.25 [border-bottom-width:1px] [border-bottom-style:solid] border-b-[#eeeee7] flex items-center justify-between py-0 px-5.5 gap-3.75 shrink-0 [&>div]:flex [&>div]:items-center [&>div]:gap-2 [&>div>svg]:text-[#989c8f] [&_strong]:text-[12px] [&_strong]:font-[650] **:data-[ui~=chat-header-icons]:gap-3.5 max-[1100px]:px-3.75 max-[1100px]:**:data-[ui~=chat-header-icons]:gap-2.25 max-[580px]:h-10.75 max-[580px]:px-4 max-[580px]:[&_strong]:text-[11px] max-[580px]:[&_[data-ui~=chat-header-icons]_svg]:w-3.75 max-[580px]:**:data-[ui~=chat-header-icons]:gap-3"
          >
            <div>
              <Icon icon={HashtagIcon} />
              <strong>{channel}</strong>
              <span
                data-ui="channel-description"
                className="text-[10px] text-[#9d9f94] [border-left-width:1px] [border-left-style:solid] border-l-[#e5e6de] ml-1.25 pl-3 max-[1100px]:text-[9px] max-[800px]:hidden"
              >
                A place for a little bit of everything.
              </span>
            </div>
            <div
              data-ui="chat-header-icons"
              className="max-[800px]:[&_svg:first-child]:hidden"
              aria-hidden="true"
            >
              <Icon icon={Notification01Icon} size={17} />
              <Icon icon={UserGroupIcon} size={18} />
              <Icon icon={Search01Icon} size={18} />
            </div>
          </header>
          <div
            data-ui="messages"
            className="flex-1 overflow-y-auto pt-3 pb-0 px-6 max-[1100px]:px-4.5 max-[800px]:px-3.5 max-[580px]:pt-2.75 max-[580px]:pb-0 max-[580px]:px-4"
          >
            <div
              data-ui="date-separator"
              className="flex items-center gap-3 text-[#9b9e91] text-[9px] mt-0 mb-4.25 mx-0 before:[content:''] before:h-px before:flex-1 before:bg-[#efefe9] after:[content:''] after:h-px after:flex-1 after:bg-[#efefe9] max-[580px]:mb-3.5"
            >
              <span>Today, September 6</span>
            </div>
            {conversations[channel].map((message) => {
              const key = `${channel}-${message.name}`;
              return (
                <div
                  data-ui="message"
                  className="flex gap-2.5 mb-3.75 [&_p]:text-[11px] [&_p]:leading-normal [&_p]:text-[#777b6e] [&_p]:mt-0.75 [&_p]:mb-1.25 [&_p]:mx-0 max-[800px]:[&_p]:text-[10px] max-[800px]:mb-3.25 max-[800px]:**:data-[ui~=avatar]:rounded-lg max-[800px]:**:data-[ui~=avatar]:text-[10px] max-[800px]:**:data-[ui~=avatar]:size-6.25 max-[580px]:**:data-[ui~=avatar]:size-7 max-[580px]:[&_p]:text-[11px] max-[580px]:[&_p]:leading-normal max-[580px]:mb-4 max-[580px]:gap-2.25"
                  key={key}
                >
                  <Avatar name={message.name} color={message.color} />
                  <div data-ui="message-content" className="">
                    <div
                      data-ui="message-meta"
                      className="flex items-center gap-2 h-4 [&_strong]:text-[11px] [&_strong]:font-[650] [&>span]:text-[8px] [&>span]:text-[#a7a99e] [&_em]:text-[8px] [&_em]:not-italic [&_em]:py-0 [&_em]:px-1 [&_em]:text-[#90997f] [&_em]:bg-[#f0f3e8] max-[800px]:[&_em]:hidden max-[580px]:[&_strong]:text-[11px] max-[580px]:[&>span]:text-[8px]"
                    >
                      <strong>{message.name}</strong>
                      <span>{message.time}</span>
                      {message.name === "Jamie" && <em>the friendly one</em>}
                    </div>
                    <p>{message.text}</p>
                    <button
                      data-ui={`reaction ${reactions[key] ? "reacted" : ""}`}
                      className="inline-flex items-center justify-center gap-1.5 py-px px-1.75 min-h-5.75 bg-[#f8f8f3] border border-solid border-[#e5e7da] rounded-[5px] [transition:background_0.2s,border-color_0.2s] text-[11px]/4.25 [&_span]:text-[9px] [&_span]:text-[#969c89] hover:border-[#b9c6a2] hover:bg-[#eaf0dd] data-[ui~=reacted]:border-[#b9c6a2] data-[ui~=reacted]:bg-[#eaf0dd] [&[data-ui~=reacted]_span]:text-[#657a42] max-[580px]:min-h-6 max-[580px]:px-2"
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
          <div
            data-ui="composer-area"
            className="pt-2.25 pb-2 px-5.25 max-[580px]:px-3.25"
          >
            <Link
              to="/app"
              data-ui="preview-composer"
              className="h-9.5 bg-[#f1f2ea] border border-solid border-[#e7e9de] rounded-md text-[#979e8b] flex items-center gap-3 py-0 px-2.75 [transition:border-color_0.2s] hover:border-[#b7c79c] [&_span]:flex-1 [&_span]:text-[10px] max-[580px]:h-9.25 max-[580px]:gap-2.25 max-[580px]:[&_span]:text-[9px]"
            >
              <Icon icon={Add01Icon} />
              <span>Your next good conversation starts here...</span>
              <Icon icon={SmileIcon} />
            </Link>
            <div
              data-ui="typing-indicator"
              className="flex items-center gap-1 text-[#a2a797] text-[8px] h-4.75 pt-1.25 pb-0 px-0.5 [&_strong]:font-medium max-[580px]:text-[7px]"
            >
              <span
                data-ui="typing-dots"
                className="flex gap-0.5 mr-0.75 [&_i]:rounded-full [&_i]:bg-[#98a28c] [&_i]:size-0.75"
              >
                <i />
                <i />
                <i />
              </span>
              <strong>Jamie</strong> is probably typing something nice
            </div>
          </div>
        </section>
      </div>
      <div
        data-ui="preview-bottom"
        className="flex items-center justify-between h-8 py-0 px-3.75 [border-top-width:1px] [border-top-style:solid] border-t-[#dce1d1] bg-[#f0f2e9] text-[#8b947d] text-[9px] [&>span]:flex [&>span]:items-center [&>span]:gap-1.5 [&>a]:flex [&>a]:items-center [&>a]:gap-1.5 [&>a]:text-[#62714c] [&>a]:font-semibold max-[580px]:text-[8px] max-[580px]:px-2.75"
      >
        <span>
          <i
            data-ui="online-dot"
            className="inline-block shrink-0 rounded-full bg-[#2ee68b] size-1.25"
          />{" "}
          Room for everyone. Including you.
        </span>
        <Link to="/app">
          Come on in <Icon icon={ArrowUpRight01Icon} size={15} />
        </Link>
      </div>
    </div>
  );
}
