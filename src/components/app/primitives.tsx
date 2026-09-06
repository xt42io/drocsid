import { useEffect, useId, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Icon, Avatar } from "../ui";
import type { Person } from "../../lib/demo-data";
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
} from "@hugeicons/core-free-icons";
export const icons = {
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
      className={`a-icon-button ${active ? "is-active" : ""}`}
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
    <span className={`a-avatar ${large ? "a-avatar-large" : ""}`}>
      <Avatar name={person.name} color={person.color} />
      {presence && <i className={`a-presence ${person.status}`} />}
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
    <div className="a-empty">
      <div className="a-empty-icon">
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
      className={`a-dialog ${wide ? "wide" : ""}`}
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
      <div className="a-dialog-head">
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
    <div className="a-toggle-row">
      <div>
        <label id={id}>{label}</label>
        {description && <p>{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        className={`a-switch ${checked ? "checked" : ""}`}
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
    <div className="a-page-heading">
      <div>
        {eyebrow && <span className="a-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function PreviewNote() {
  return (
    <span className="a-preview-note">
      <span /> PREVIEW · JUST ON THIS DEVICE
    </span>
  );
}
