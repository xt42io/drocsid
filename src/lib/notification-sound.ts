import type { Message } from "../types/app";

export const notificationSoundPath = "/sounds/new-notification-07.mp3";

type IncomingMessageSoundContext = {
  message: Message | null;
  newMessage: boolean;
  alreadyKnown: boolean;
  notifications: boolean;
  sounds: boolean;
  muted: readonly string[];
  pathname: string;
  visibility: DocumentVisibilityState;
};

export function isConversationOpen(conversation: string, pathname: string) {
  if (conversation.startsWith("dm:"))
    return pathname === `/app/dm/${conversation.slice(3)}`;

  const separator = conversation.indexOf(":");
  if (separator === -1) return false;
  return (
    pathname ===
    `/app/community/${conversation.slice(0, separator)}/${conversation.slice(separator + 1)}`
  );
}

export function shouldPlayIncomingMessageSound({
  message,
  newMessage,
  alreadyKnown,
  notifications,
  sounds,
  muted,
  pathname,
  visibility,
}: IncomingMessageSoundContext) {
  if (
    !message ||
    !newMessage ||
    alreadyKnown ||
    message.author === "you" ||
    !notifications ||
    !sounds ||
    muted.includes(message.conversation)
  )
    return false;

  return !(
    visibility === "visible" &&
    isConversationOpen(message.conversation, pathname)
  );
}

export class IncomingMessageSound {
  private audio: HTMLAudioElement | null = null;

  private getAudio() {
    if (typeof Audio === "undefined") return null;
    if (!this.audio) {
      this.audio = new Audio(notificationSoundPath);
      this.audio.preload = "auto";
      this.audio.volume = 0.5;
    }
    return this.audio;
  }

  unlock() {
    const audio = this.getAudio();
    if (!audio) return;
    audio.muted = true;
    const playback = audio.play();
    if (!playback) return;
    void playback
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      })
      .catch(() => {
        audio.muted = false;
      });
  }

  play() {
    const audio = this.getAudio();
    if (!audio) return;
    audio.muted = false;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers can reject audio before the first user interaction.
    });
  }
}
