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
}

export interface Message {
  id: number;
  text: string;
  out: boolean;
  read: boolean;
  time: string;
  sender_id: number;
  reactions?: Record<string, number[]>;
}

export type Tab = "chats" | "contacts" | "notifications" | "gallery" | "search" | "profile" | "bots";

export interface Attachment {
  name: string;
  size: string;
  type: string;
  icon: string;
  color: string;
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