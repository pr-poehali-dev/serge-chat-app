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
  notifyEnabled?: boolean;
  moodEmoji?: string;
  moodText?: string;
  bio?: string;
  description?: string;
  myRole?: "owner" | "admin" | "member" | null;
  chatBg?: string | null;
}

export interface PinnedMessage {
  id: number;
  text: string;
  kind: "text" | "voice" | "circle" | "image" | "file";
  fileName?: string | null;
  topicId?: number | null;
  senderName?: string | null;
  poll?: PollData | null;
}

export interface Message {
  id: number;
  text: string;
  out: boolean;
  read: boolean;
  delivered?: boolean;
  readCount?: number | null;
  recipientsCount?: number | null;
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
  forwardedFrom?: string | null;
  removed?: boolean;
  replyTo?: ReplyPreview | null;
  poll?: PollData | null;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
  percent: number;
  mine: boolean;
}

export interface PollData {
  id: number;
  messageId: number;
  question: string;
  multiple: boolean;
  closed: boolean;
  createdBy: number;
  voters: number;
  totalVotes: number;
  myVoted: boolean;
  options: PollOption[];
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
  moodEmoji?: string;
  moodText?: string;
  bio?: string;
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
export interface FoundMessage {
  messageId: number;
  chatId: number;
  topicId: number | null;
  topicName?: string | null;
  chatName: string;
  isGroup: boolean;
  senderName: string;
  snippet: string;
  time: string;
}

export interface ScheduledItem {
  id: number;
  chatId: number;
  topicId: number | null;
  text: string;
  sendAtMs: number;
  kind?: "text" | "image" | "file";
  mediaUrl?: string | null;
  fileName?: string | null;
}

export interface ScheduleDraft {
  kind: "text" | "image" | "file";
  text: string;
  file?: File;
}

export interface CustomSticker {
  id: number;
  url: string;
}

export interface StickerPack {
  id: number;
  title: string;
  stickers: CustomSticker[];
}

export interface GalleryItem {
  messageId: number;
  chatId: number;
  topicId: number | null;
  type: "photo" | "gif" | "video";
  url: string;
  fileName?: string | null;
  caption?: string;
  time: string;
  chatName: string;
  isGroup: boolean;
  senderName: string;
}
