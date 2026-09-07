export function usernameError(username: string): string | null {
  if (!/^[a-z0-9_]{3,24}$/.test(username))
    return "Use 3–24 lowercase letters, numbers, or underscores.";
  if (["you", "everyone", "admin"].includes(username))
    return "This username is reserved.";
  return null;
}
