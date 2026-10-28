import Icon from "@/components/ui/icon";
import { Message } from "../../types";
import VoiceMessage from "../../media/VoiceMessage";
import CircleMessage from "../../media/CircleMessage";
import ReplyQuote from "../ReplyQuote";
import { ImageAttachment, FileCard } from "../FileAttachment";
import { extractGifUrl } from "@/pages/index/config";
import PollCard from "../../polls/PollCard";
import { extractStickerPath, stickerTitle } from "../../stickers/stickerCatalog";
import { highlightText } from "./messageText";

interface MessageBodyProps {
  msg: Message;
  searchQuery: string;
  currentMatchId: number | null;
  jumpTo: (messageId: number) => void;
  onTranscribe?: (messageId: number) => Promise<string | null>;
  canModerate: boolean;
  sessionId: string | null;
  onVotePoll?: (pollId: number, optionIds: number[]) => void;
  onClosePoll?: (pollId: number) => void;
  onForwardPoll?: () => void;
}

export default function MessageBody({
  msg,
  searchQuery,
  currentMatchId,
  jumpTo,
  onTranscribe,
  canModerate,
  sessionId,
  onVotePoll,
  onClosePoll,
  onForwardPoll,
}: MessageBodyProps) {
  return (
    <>
      {msg.removed ? (
        <div className="msg-bubble-in flex items-center gap-2 px-4 py-2.5 text-fg/40">
          <Icon name="Ban" size={13} />
          <span className="text-sm italic">Сообщение удалено</span>
        </div>
      ) : msg.kind === "circle" && msg.mediaUrl ? (
        <CircleMessage msg={msg} />
      ) : (
      <div className={`${msg.kind === "voice" || msg.kind === "image" || extractGifUrl(msg.text) !== null ? "p-1" : "px-4 py-2.5"} ${msg.kind === "voice" ? "px-3 py-2" : ""} ${msg.kind === "file" ? "px-3 py-2.5" : ""} ${extractStickerPath(msg.text) && !msg.removed ? "!p-0 !bg-transparent !border-0 !shadow-none" : msg.out ? "msg-bubble-out text-white" : "msg-bubble-in text-fg/85"}`}>
        {msg.forwardedFrom && (
          <p className={`mb-1 flex items-center gap-1 text-[11px] font-medium opacity-80 ${msg.kind === "image" ? "px-3 pt-1" : ""}`}>
            <Icon name="Forward" size={11} className="shrink-0" />
            <span className="truncate">Переслано от {msg.forwardedFrom}</span>
          </p>
        )}
        {msg.replyTo && (
          <div className={msg.kind === "image" ? "px-2 pt-1" : ""}>
            <ReplyQuote reply={msg.replyTo} out={msg.out} onJump={jumpTo} />
          </div>
        )}
        {msg.kind === "voice" && msg.mediaUrl ? (
          <VoiceMessage msg={msg} onTranscribe={onTranscribe} />
        ) : msg.kind === "image" && msg.mediaUrl ? (
          <>
            <ImageAttachment msg={msg} />
            {msg.text && (
              <p className="px-3 py-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {highlightText(msg.text, searchQuery, currentMatchId === msg.id)}
              </p>
            )}
          </>
        ) : msg.kind === "file" && msg.mediaUrl ? (
          <>
            <FileCard msg={msg} out={msg.out} />
            {msg.text && (
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {highlightText(msg.text, searchQuery, currentMatchId === msg.id)}
              </p>
            )}
          </>
        ) : msg.poll && !msg.removed ? (
          <PollCard
            poll={msg.poll}
            out={msg.out}
            canClose={msg.out || canModerate}
            sessionId={sessionId}
            onVote={onVotePoll}
            onClose={onClosePoll}
            onForward={onForwardPoll}
          />
        ) : extractStickerPath(msg.text) && !msg.removed ? (
          <img
            src={extractStickerPath(msg.text) || ""}
            alt={stickerTitle(extractStickerPath(msg.text) || "")}
            className="h-32 w-32 object-contain sm:h-40 sm:w-40 drop-shadow-lg"
            loading="lazy"
            draggable={false}
          />
        ) : extractGifUrl(msg.text) !== null ? (
          <img
            src={extractGifUrl(msg.text) || ""}
            alt="GIF"
            className="rounded-xl max-w-[220px] max-h-[160px] object-cover"
            loading="lazy"
          />
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {highlightText(msg.text, searchQuery, currentMatchId === msg.id)}
          </p>
        )}
      </div>
      )}
    </>
  );
}
