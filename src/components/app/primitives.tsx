import { useEffect, useId, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Icon, Avatar } from "../ui";
import type { Person } from "../../types/app";
import {
  Home01Icon,
  Message01Icon,
  UserGroupIcon,
  UserAdd01Icon,
  UserRemove01Icon,
  InboxIcon,
  Compass01Icon,
  Settings01Icon,
  Notification01Icon,
  NotificationOff01Icon,
  HashtagIcon,
  Add01Icon,
  Search01Icon,
  SmileIcon,
  SentIcon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArrowDown01Icon,
  ArrowUpRight01Icon,
  Cancel01Icon,
  Tick02Icon,
  MoreHorizontalIcon,
  PinIcon,
  Bookmark02Icon,
  Edit02Icon,
  Delete02Icon,
  Copy01Icon,
  Link01Icon,
  LockPasswordIcon,
  Logout01Icon,
  Moon02Icon,
  Sun03Icon,
  Leaf01Icon,
  Coffee01Icon,
  SourceCodeIcon,
  FavouriteIcon,
  Mail01Icon,
  Menu01Icon,
  CheckmarkCircle02Icon,
  ArrowReloadHorizontalIcon,
  Shield01Icon,
  TextFontIcon,
  BookOpen01Icon,
  GameController01Icon,
  PaintBrush01Icon,
  MusicNote01Icon,
  ReplyIcon,
  InformationCircleIcon,
  Folder01Icon,
  Flag01Icon,
  File01Icon,
  Download01Icon,
} from "@hugeicons/core-free-icons";
export const icons = {
  file: File01Icon,
  download: Download01Icon,
  home: Home01Icon,
  message: Message01Icon,
  people: UserGroupIcon,
  userAdd: UserAdd01Icon,
  userRemove: UserRemove01Icon,
  inbox: InboxIcon,
  discover: Compass01Icon,
  settings: Settings01Icon,
  bell: Notification01Icon,
  muted: NotificationOff01Icon,
  hash: HashtagIcon,
  plus: Add01Icon,
  search: Search01Icon,
  smile: SmileIcon,
  send: SentIcon,
  right: ArrowRight01Icon,
  left: ArrowLeft01Icon,
  down: ArrowDown01Icon,
  external: ArrowUpRight01Icon,
  close: Cancel01Icon,
  check: Tick02Icon,
  more: MoreHorizontalIcon,
  pin: PinIcon,
  bookmark: Bookmark02Icon,
  edit: Edit02Icon,
  trash: Delete02Icon,
  copy: Copy01Icon,
  link: Link01Icon,
  lock: LockPasswordIcon,
  logout: Logout01Icon,
  moon: Moon02Icon,
  sun: Sun03Icon,
  leaf: Leaf01Icon,
  coffee: Coffee01Icon,
  code: SourceCodeIcon,
  heart: FavouriteIcon,
  mail: Mail01Icon,
  menu: Menu01Icon,
  checkCircle: CheckmarkCircle02Icon,
  reset: ArrowReloadHorizontalIcon,
  shield: Shield01Icon,
  font: TextFontIcon,
  book: BookOpen01Icon,
  game: GameController01Icon,
  brush: PaintBrush01Icon,
  music: MusicNote01Icon,
  reply: ReplyIcon,
  info: InformationCircleIcon,
  folder: Folder01Icon,
  flag: Flag01Icon,
};
export type IconName = keyof typeof icons;
export function AppIcon({
  name,
  size = 20,
}: {
  name: IconName;
  size?: number;
}) {
  return <Icon icon={icons[name]} size={size} />;
}
export function IconButton({
  name,
  label,
  active,
  ...props
}: Omit<ComponentProps<"button">, "name"> & {
  name: IconName;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      data-ui={`a-icon-button ${active ? "is-active" : ""}`}
      className="inline-flex items-center justify-center shrink-0 p-0 rounded-md text-(--a-muted) bg-transparent [transition:background_0.15s,color_0.15s] size-8 hover:bg-(--a-hover) hover:text-(--a-green) data-[ui~=is-active]:bg-(--a-hover) data-[ui~=is-active]:text-(--a-green)"
      aria-label={label}
      title={label}
      {...props}
    >
      <AppIcon name={name} size={19} />
    </button>
  );
}
export function PersonAvatar({
  person,
  large = false,
  presence = false,
}: {
  person: Person;
  large?: boolean;
  presence?: boolean;
}) {
  return (
    <span
      data-ui={`a-avatar ${large ? "a-avatar-large" : ""}`}
      className="inline-flex relative shrink-0 align-middle **:data-[ui~=avatar]:rounded-[11px] **:data-[ui~=avatar]:text-[13px] **:data-[ui~=avatar]:font-[550] **:data-[ui~=avatar]:size-8.75 [&[data-ui~=a-avatar-large]_[data-ui~=avatar]]:rounded-[21px] [&[data-ui~=a-avatar-large]_[data-ui~=avatar]]:text-[27px] [&[data-ui~=a-avatar-large]_[data-ui~=avatar]]:size-17"
    >
      <Avatar
        name={person.name}
        color={person.color}
        src={person.avatarUrl}
        large={large}
      />
      {presence && (
        <i
          data-ui={`a-presence ${person.status}`}
          className="absolute -bottom-px -right-px border-2 border-solid border-(--a-sidebar) rounded-full bg-[#cbd5e1] size-2.5 data-[ui~=online]:bg-[#2ee68b] data-[ui~=away]:bg-[#ffc447] data-[ui~=offline]:bg-[#cbd5e1]"
        />
      )}
    </span>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  children,
}: {
  icon: IconName;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-ui="a-empty"
      className="flex flex-col items-center justify-center gap-4 min-h-75 py-11.25 px-6.25 text-center [&_h2]:text-[25px] [&_h2]:tracking-[-0.8px] [&_p]:text-(--a-muted) [&_p]:text-[14px] [&_p]:leading-[1.8] [&_p]:max-w-87.5 max-[480px]:min-h-75 max-[480px]:px-3.5 max-[480px]:[&_h2]:text-[25px] max-[480px]:[&_p]:text-[13px]"
    >
      <div
        data-ui="a-empty-icon"
        className="flex items-center justify-center bg-(--a-selected) text-(--a-green) rounded-[20px] transform-[rotate(-6deg)] mb-0.75 size-16.75"
      >
        <AppIcon name={icon} size={30} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </div>
  );
}
export function Dialog({
  title,
  description,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const node = dialog.current;
    const prior = document.activeElement as HTMLElement | null;
    node?.showModal();
    return () => {
      node?.close();
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      data-ui={`a-dialog ${wide ? "wide" : ""}`}
      className="w-[calc(100%-40px)] max-w-116.25 max-h-[calc(100svh-54px)] m-auto p-7 border border-solid border-(--a-border) rounded-[13px] bg-(--a-bg) text-(--a-text) shadow-[0_25px_100px_#16220e30] overflow-auto data-[ui~=wide]:max-w-170 backdrop:bg-[#27341c66] backdrop:[backdrop-filter:blur(4px)] [&_[data-ui~=a-form-footnote]+[data-ui~=a-text-link]]:mt-4.5 in-data-[ui~=theme-dark]:shadow-[0_25px_100px_#00000080] [[data-ui~=theme-dark]_&::backdrop]:bg-[#00000099] max-[760px]:p-6.25 max-[760px]:w-[calc(100%-30px)] max-[760px]:max-h-[calc(100svh-36px)] max-[760px]:[&_[data-ui~=a-search-field]_input]:text-[16px] max-[760px]:[&_[data-ui~=a-search-field]_input::placeholder]:text-[12px] max-[480px]:py-5.75 max-[480px]:px-5.25 max-[480px]:**:data-[ui~=a-form]:gap-4.5"
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialog.current) {
          const bounds = dialog.current.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div
        data-ui="a-dialog-head"
        className="flex gap-4 mb-6.25 [align-items:start] [&>div]:flex-1 [&_h2]:text-[26px] [&_h2]:font-[550] [&_h2]:leading-[1.15] [&_h2]:tracking-[-1px] [&_p]:text-[13px] [&_p]:leading-[1.75] [&_p]:text-(--a-muted) [&_p]:mt-3 **:data-[ui~=a-icon-button]:-mt-1.5 **:data-[ui~=a-icon-button]:-mr-2 max-[760px]:[&_h2]:text-[26px] max-[760px]:[&_p]:text-[13px] max-[480px]:[&_h2]:text-[26px] max-[480px]:[&_p]:text-[12px]"
      >
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          {description && <p id={`${id}-description`}>{description}</p>}
        </div>
        <IconButton name="close" label="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  const id = useId();
  return (
    <div
      data-ui="a-toggle-row"
      className="flex items-center gap-6.25 py-5.75 [border-bottom-width:1px] [border-bottom-style:solid] border-b-(--a-border) [&>div]:flex-1 [&_label]:text-[13px] [&_label]:font-[550] [&_p]:text-[12px] [&_p]:leading-[1.7] [&_p]:mt-1.75 [&_p]:text-(--a-muted) max-[760px]:[&_label]:text-[14px] max-[480px]:gap-4.5 max-[480px]:[&_label]:text-[13px] max-[480px]:[&_p]:text-[12px]"
    >
      <div>
        <label id={id}>{label}</label>
        {description && <p>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        data-ui={`a-switch ${checked ? "checked" : ""}`}
        className="shrink-0 relative w-9.25 h-5.5 p-0.75 rounded-[14px] bg-[#d6ddca] [&>span]:block [&>span]:bg-[#fffef8] [&>span]:rounded-full [&>span]:shadow-[0_1px_4px_#24360817] [&>span]:[transition:transform_0.15s] [&>span]:size-4 data-[ui~=checked]:bg-[#839b65] [&[data-ui~=checked]>span]:transform-[translateX(15px)] in-data-[ui~=theme-dark]:bg-[#484848] [[data-ui~=theme-dark]_&>span]:bg-[#ffffff] [[data-ui~=theme-dark]_&>span]:shadow-[0_1px_4px_#00000026] [[data-ui~=theme-dark]_&[data-ui~=checked]]:bg-(--a-orange)"
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div
      data-ui="a-page-heading"
      className="flex items-center justify-between gap-6 mb-8.25 **:data-[ui~=a-eyebrow]:mb-3 [&_h1]:mb-2.75 [&_p]:text-[14px] [&_p]:leading-[1.7] [&_p]:text-(--a-muted) *:data-[ui~=a-button]:self-center max-[1250px]:[&_h1]:text-[32px] max-[1250px]:[&_p]:text-[13px] max-[1050px]:[&_h1]:text-[29px] max-[1050px]:*:data-[ui~=a-button]:text-[11px]! max-[1050px]:*:data-[ui~=a-button]:py-2.25 max-[1050px]:*:data-[ui~=a-button]:px-3 max-[760px]:mb-6.25 max-[760px]:gap-5 max-[760px]:[&_h1]:text-[32px] max-[760px]:[&_p]:text-[13px] max-[760px]:[&_p]:leading-[1.75] max-[760px]:**:data-[ui~=a-eyebrow]:text-[8px] max-[760px]:**:data-[ui~=a-eyebrow]:tracking-[1px] max-[760px]:*:data-[ui~=a-button]:text-[11px]! max-[760px]:*:data-[ui~=a-button]:whitespace-nowrap max-[480px]:[align-items:start] max-[480px]:gap-3 max-[480px]:flex-wrap max-[480px]:[&_h1]:text-[30px] max-[480px]:*:data-[ui~=a-button]:min-h-9"
    >
      <div>
        {eyebrow && (
          <span
            data-ui="a-eyebrow"
            className="block font-mono text-[9px] font-normal tracking-[1.3px] leading-[1.6] text-(--a-muted)"
          >
            {eyebrow}
          </span>
        )}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function PreviewNote() {
  return (
    <span
      data-ui="a-preview-note"
      className="flex items-center justify-center gap-1.5 text-[7px] tracking-[0.65px] font-mono text-(--a-faint) [&>span]:bg-[#b9a276] [&>span]:rounded-full [&>span]:size-1"
    >
      <span /> YOUR COMMUNITY · CONNECTED
    </span>
  );
}
