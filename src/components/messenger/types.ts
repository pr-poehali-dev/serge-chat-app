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
}

export interface Message {
  id: number;
  text: string;
  out: boolean;
  read: boolean;
  time: string;
  sender_id: number;
}

export type Tab = "chats" | "contacts" | "notifications" | "gallery" | "search" | "profile";

export interface Attachment {
  name: string;
  size: string;
  type: string;
  icon: string;
  color: string;
}
