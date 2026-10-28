import { Dispatch, SetStateAction } from "react";
import { Chat, Message, Tab, AuthUser, Attachment } from "@/components/messenger/types";
import { useChatSync } from "./useChatSync";
import { useSendMessage } from "./useSendMessage";
import { useMessageActions } from "./useMessageActions";
import { useChatActions } from "./useChatActions";

interface UseMessagingParams {
  authUser: AuthUser | null;
  authHeaders: () => Record<string, string>;
  reloadChats: () => Promise<void>;
  chats: Chat[];
  setChats: Dispatch<SetStateAction<Chat[]>>;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  activeChatId: number | null;
  setActiveChatId: (id: number | null) => void;
  setActiveChatIdRaw: Dispatch<SetStateAction<number | null>>;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  isBotChat: boolean;
  isGroupChat: boolean;
  activeTopicId: number | null;
  setActiveTopicId: (id: number | null) => void;
  botMessages: Record<number, Message[]>;
  setBotMessages: Dispatch<SetStateAction<Record<number, Message[]>>>;
  inputText: string;
  setInputText: Dispatch<SetStateAction<string>>;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  sendBotMessage: () => void;
  onIncomingCallHint?: () => void;
}

export function useMessaging({
  authUser,
  authHeaders,
  reloadChats,
  chats,
  setChats,
  messages,
  setMessages,
  activeChatId,
  setActiveChatId,
  setActiveChatIdRaw,
  activeTab,
  setActiveTab,
  isBotChat,
  isGroupChat,
  activeTopicId,
  setActiveTopicId,
  botMessages,
  setBotMessages,
  inputText,
  setInputText,
  attachments,
  setAttachments,
  sendBotMessage,
  onIncomingCallHint,
}: UseMessagingParams) {
  const sync = useChatSync({
    authUser,
    authHeaders,
    setChats,
    setMessages,
    activeChatId,
    setActiveChatId,
    setActiveChatIdRaw,
    activeTab,
    setActiveTab,
    isBotChat,
    activeTopicId,
    onIncomingCallHint,
  });

  const send = useSendMessage({
    authUser,
    authHeaders,
    chats,
    setChats,
    messages,
    setMessages,
    activeChatId,
    activeTopicId,
    isBotChat,
    isGroupChat,
    botMessages,
    inputText,
    setInputText,
    attachments,
    setAttachments,
    sendBotMessage,
    lastMessagesSigRef: sync.lastMessagesSigRef,
  });

  const actions = useMessageActions({
    authUser,
    authHeaders,
    chats,
    setChats,
    messages,
    setMessages,
    activeChatId,
    activeTopicId,
    setActiveTopicId,
    isBotChat,
    setBotMessages,
    setInputText,
    replyTo: send.replyTo,
    setReplyTo: send.setReplyTo,
    editingMessage: send.editingMessage,
    setEditingMessage: send.setEditingMessage,
    setSendError: send.setSendError,
    loadingMsgs: sync.loadingMsgs,
  });

  const chatActions = useChatActions({
    authUser,
    authHeaders,
    reloadChats,
    chats,
    setChats,
    setActiveChatId,
    setActiveTab,
    setSendError: send.setSendError,
  });

  return {
    loadingChats: sync.loadingChats,
    loadingMsgs: sync.loadingMsgs,
    sending: send.sending,
    notifications: sync.notifications,
    groupCalls: sync.groupCalls,
    messagesEndRef: send.messagesEndRef,
    startChatWithUser: chatActions.startChatWithUser,
    togglePinChat: chatActions.togglePinChat,
    setChatBackground: chatActions.setChatBackground,
    uploadChatBackground: chatActions.uploadChatBackground,
    setChatNotify: chatActions.setChatNotify,
    sendMedia: send.sendMedia,
    transcribeMessage: actions.transcribeMessage,
    sendMessage: send.sendMessage,
    sendGif: send.sendGif,
    sendSticker: send.sendSticker,
    createPoll: actions.createPoll,
    votePoll: actions.votePoll,
    closePoll: actions.closePoll,
    toggleReaction: actions.toggleReaction,
    replyTo: send.replyTo,
    editingMessage: send.editingMessage,
    sendError: send.sendError,
    startReply: send.startReply,
    startEdit: send.startEdit,
    cancelComposerContext: send.cancelComposerContext,
    removeMessage: actions.removeMessage,
    pinMessage: actions.pinMessage,
    openPinned: actions.openPinned,
    forwardMessage: actions.forwardMessage,
    forwardMessages: actions.forwardMessages,
    deleteMessages: actions.deleteMessages,
    sharePoll: actions.sharePoll,
    jumpRequest: actions.jumpRequest,
  };
}
