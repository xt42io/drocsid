import type { Person } from "../types/app";

export function personName(person?: Person) {
  return person?.name.split(" ")[0] ?? "Someone";
}
