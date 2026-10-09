export interface Chat {
  id: number;
  name: string;
  isGroup: boolean;
  color: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  isBot?: boolean;
  pinned?: boolean;
  avatarUrl?: string | null;
  statusText?: string;
  typing?: boolean;
  contactUserId?: number | null;
  memberCount?: number | null;
  pinnedMessage?: PinnedMessage | null;
}

export interface PinnedMessage {
  id: number;
  text: string;
  kind: "text" | "voice" | "circle" | "image" | "file";
  fileName?: string | null;
  topicId?: number | null;
  senderName?: string | null;
}

export interface Message {
  id: number;
  text: string;
  out: boolean;
  read: boolean;
  time: string;
  sender_id: number;
  reactions?: Record<string, number[]>;
  kind?: "text" | "voice" | "circle" | "image" | "file";
  mediaUrl?: string | null;
  duration?: number | null;
  transcript?: string | null;
  senderName?: string | null;
  senderColor?: string | null;
  senderInitials?: string | null;
  senderAvatarUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  edited?: boolean;
  removed?: boolean;
  replyTo?: ReplyPreview | null;
}

export interface ReplyPreview {
  id: number;
  text: string;
  kind: "text" | "voice" | "circle" | "image" | "file";
  senderName?: string | null;
  removed?: boolean;
}

export type Tab = "chats" | "contacts" | "notifications" | "gallery" | "search" | "profile" | "bots";

export interface Attachment {
  name: string;
  size: string;
  type: string;
  icon: string;
  color: string;
  file?: File;
}

export interface Topic {
  id: number;
  name: string;
  color: string;
  pinned?: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  login: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
  sessionId: string;
}

export interface NotificationItem {
  id: number;
  icon: string;
  text: string;
  time: string;
  color: string;
  read: boolean;
}

export interface DirectoryUser {
  id: number;
  displayName: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl?: string | null;
  login: string;
}

export interface BotInfo {
  username: string;
  name: string;
  avatar: string;
  color: string;
  description: string;
  category: string;
  users: string;
  verified: boolean;
}