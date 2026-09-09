import type { Gender, Person } from "../types/app";

export function normalizeGender(gender: unknown): Gender {
  return gender === "he/him" || gender === "she/her" ? gender : "";
}

export function personName(person?: Person) {
  return person?.name.split(" ")[0] ?? "Someone";
}
