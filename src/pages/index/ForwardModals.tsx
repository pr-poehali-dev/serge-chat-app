import { Dispatch, SetStateAction } from "react";
import ForwardModal from "@/components/messenger/chat/ForwardModal";
import PollLinkModal from "@/components/messenger/polls/PollLinkModal";
import { replyLabel } from "@/components/messenger/chat/ReplyQuote";
import { AuthUser, Chat, Message, PollData } from "@/components/messenger/types";
import { useMessaging } from "./useMessaging";

interface ForwardModalsProps {
  chats: Chat[];
  activeChatId: number | null;
  authUser: AuthUser | null;
  msg: ReturnType<typeof useMessaging>;
  forwardSource: Message | null;
  setForwardSource: Dispatch<SetStateAction<Message | null>>;
  forwardMany: number[] | null;
  setForwardMany: Dispatch<SetStateAction<number[] | null>>;
  forwardPoll: PollData | null;
  setForwardPoll: Dispatch<SetStateAction<PollData | null>>;
  pollCode: string | null;
  setPollCode: Dispatch<SetStateAction<string | null>>;
}

export default function ForwardModals({
  chats,
  activeChatId,
  authUser,
  msg,
  forwardSource,
  setForwardSource,
  forwardMany,
  setForwardMany,
  forwardPoll,
  setForwardPoll,
  pollCode,
  setPollCode,
}: ForwardModalsProps) {
  return (
    <>
      {forwardSource && (
        <ForwardModal
          preview={replyLabel({ text: forwardSource.text || forwardSource.fileName || "", kind: (forwardSource.kind || "text") as "text" })}
          chats={chats}
          currentChatId={activeChatId}
          onForward={(targetId) => msg.forwardMessage(forwardSource, targetId)}
          onClose={() => setForwardSource(null)}
        />
      )}

      {forwardMany && (
        <ForwardModal
          title="Переслать сообщения"
          preview={`Выбрано сообщений: ${forwardMany.length}`}
          chats={chats}
          currentChatId={activeChatId}
          onForward={(targetId) => msg.forwardMessages(forwardMany, targetId)}
          onClose={() => setForwardMany(null)}
        />
      )}

      {forwardPoll && (
        <ForwardModal
          title="Переслать опрос в группу"
          preview={forwardPoll.question}
          groupsOnly
          chats={chats}
          currentChatId={activeChatId}
          onForward={(targetId) => msg.sharePoll(forwardPoll.id, targetId)}
          onClose={() => setForwardPoll(null)}
        />
      )}

      {pollCode && authUser && (
        <PollLinkModal code={pollCode} sessionId={authUser.sessionId} onClose={() => setPollCode(null)} />
      )}
    </>
  );
}
