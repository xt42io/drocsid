import type { Action } from "./contracts";

// Preserve ordering where actions can overwrite each other without making an
// unrelated read receipt, conversation or settings form wait behind them.
export function actionScope(action: Action) {
  if ("communityId" in action) return `community:${action.communityId}`;
  if (action.type.startsWith("community.") && "id" in action)
    return `community:${action.id}`;
  if ("conversation" in action) return `conversation:${action.conversation}`;
  if (action.type === "dm.request") return `conversation:dm:${action.personId}`;
  if (action.type === "friend") return `friend:${action.id}`;
  if ("id" in action) return `message:${action.id}`;
  return action.type;
}

export class ActionQueue {
  private jobs = new Map<string, Promise<unknown>>();
  run<T>(actions: Action[], work: () => Promise<T>): Promise<T> {
    const keys = [...new Set(actions.map(actionScope))];
    const previous = keys.flatMap((key) =>
      this.jobs.has(key) ? [this.jobs.get(key)!] : [],
    );
    const job = Promise.allSettled(previous).then(work);
    for (const key of keys) this.jobs.set(key, job);
    void job
      .finally(() => {
        for (const key of keys)
          if (this.jobs.get(key) === job) this.jobs.delete(key);
      })
      .catch(() => {});
    return job;
  }
}
