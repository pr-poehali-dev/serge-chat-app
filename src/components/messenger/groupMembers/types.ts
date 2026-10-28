export type GroupRole = "owner" | "admin" | "member";

export interface GroupMember {
  id: number;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
  role?: GroupRole;
  moodEmoji?: string;
  moodText?: string;
  login?: string;
}

export type ConfirmState = { kind: "transfer" | "remove" | "leave"; member?: GroupMember };
