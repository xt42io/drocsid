const oldGeneratedUsername = /^user_[a-z0-9]{19}$/;

export function chosenUsername(username: string | null | undefined) {
  return username && !oldGeneratedUsername.test(username) ? username : "";
}

export function usernameError(username: string): string | null {
  if (!/^[a-z0-9_]{3,24}$/.test(username))
    return "Use 3–24 lowercase letters, numbers, or underscores.";
  if (
    ["you", "everyone", "admin"].includes(username) ||
    oldGeneratedUsername.test(username)
  )
    return "This username is reserved.";
  return null;
}
