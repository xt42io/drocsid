import type { Message } from "../types/app";

export const notificationSoundPath = "/sounds/new-notification-07.mp3";

type IncomingMessageSoundContext = {
  message: Message | null;
  newMessage: boolean;
  notifications: boolean;
  sounds: boolean;
  muted: readonly string[];
};

export function shouldPlayIncomingMessageSound({
  message,
  newMessage,
  notifications,
  sounds,
  muted,
}: IncomingMessageSoundContext) {
  if (
    !message ||
    !newMessage ||
    message.author === "you" ||
    !notifications ||
    !sounds ||
    muted.includes(message.conversation)
  )
    return false;
  return true;
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

  unlock(): Promise<boolean> {
    const audio = this.getAudio();
    if (!audio) return Promise.resolve(false);
    audio.muted = true;
    return audio
      .play()
      .then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        return true;
      })
      .catch(() => {
        audio.muted = false;
        return false;
      });
  }

  play(): Promise<boolean> {
    const audio = this.getAudio();
    if (!audio) return Promise.resolve(false);
    audio.muted = false;
    audio.currentTime = 0;
    return audio
      .play()
      .then(() => true)
      .catch(() => false);
  }
}
