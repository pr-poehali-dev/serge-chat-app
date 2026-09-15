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
}

export interface Message {
  id: number;
  text: string;
  out: boolean;
  read: boolean;
  time: string;
  sender_id: number;
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