import type { AppState, Community } from "../types/app";

export function canManageCommunity(
  community: Pick<Community, "memberRoles"> | null | undefined,
) {
  return ["Owner", "Admin"].includes(
    community?.memberRoles?.you ?? "",
  );
}

export function canModerateCommunity(
  community: Pick<Community, "memberRoles"> | null | undefined,
) {
  return ["Owner", "Admin", "Moderator"].includes(
    community?.memberRoles?.you ?? "",
  );
}

export function canManageCommunityMember(
  community: Pick<Community, "memberRoles"> | null | undefined,
  personId: string,
) {
  const ownRole = community?.memberRoles?.you;
  const targetRole = community?.memberRoles?.[personId] ?? "Member";
  if (personId === "you" || targetRole === "Owner") return false;
  return (
    ownRole === "Owner" || (ownRole === "Admin" && targetRole !== "Admin")
  );
}

export function canPinConversation(
  state: Pick<AppState, "communities">,
  conversation: string,
) {
  if (conversation.startsWith("dm:")) return true;
  const communityId = conversation.split(":", 1)[0];
  return canManageCommunity(
    state.communities.find((community) => community.id === communityId),
  );
}
