import React, { useState, useRef } from 'react';
import { Play, Pause, FileText, Download, Check, Reply, Edit3, Trash2, Smile, Sparkles } from 'lucide-react';
import { Message, Profile, Language } from '../../types';
import { getTranslation } from '../../i18n';
import { formatTime, formatBytes } from '../../lib/validation';
import { sound } from '../../utils/sound';

interface MessageBubbleProps {
  message: Message;
  currentUserId: string;
  lang: Language;
  onReply: (msg: Message) => void;
  onEdit: (msg: Message) => void;
  onDelete: (msgId: string) => void;
  onReact: (msgId: string, reaction: string) => void;
  onOpenImage: (url: string) => void;
}

const MONO_REACTIONS = ['🖤', '⚡', '👍', '🔥', '👀', '💯'];

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUserId,
  lang,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onOpenImage,
}) => {
  const t = getTranslation(lang);
  const isOwn = message.sender_id === currentUserId;
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const senderName = message.sender?.full_name || message.sender?.username || 'User';

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
      className={`group relative flex flex-col mb-4 ${
        isOwn ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender name for group chats if not own */}
      {!isOwn && (
        <span className="text-[11px] font-semibold text-[#8A8A8A] mb-1 ml-3 font-mono">
          {senderName}
        </span>
      )}

      {/* Main Message Card */}
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Reply Quote Preview */}
        {message.reply_to && (
          <div
            className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-l-2 ${
              isOwn
                ? 'bg-[#181818] border-white text-[#D0D0D0]'
                : 'bg-[#111111] border-[#8A8A8A] text-[#8A8A8A]'
            }`}
          >
            <div className="font-bold text-[10px] text-white">
              {message.reply_to.sender?.full_name || 'Собеседник'}
            </div>
            <div className="truncate text-[11px]">{message.reply_to.content}</div>
          </div>
        )}

        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
            isOwn
              ? 'bg-white text-black font-medium shadow-[0_4px_20px_rgba(255,255,255,0.08)]'
              : 'bg-[#111111] text-white border border-[#292929]'
          }`}
        >
          {/* Text Content */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((att) => {
                const isImage = att.file_type.startsWith('image/');
                const isAudio =
                  att.file_type.startsWith('audio/') || att.file_name.endsWith('.webm');

                if (isImage) {
                  return (
                    <div
                      key={att.id}
                      onClick={() => att.public_url && onOpenImage(att.public_url)}
                      className="cursor-pointer overflow-hidden rounded-xl border border-[#292929] max-h-64 group/img relative"
                    >
                      <img
                        src={att.public_url}
                        alt={att.file_name}
                        className="w-full h-full object-cover transition group-hover/img:scale-105"
                      />
                    </div>
                  );
                }

                if (isAudio) {
                  return (
                    <div
                      key={att.id}
                      className={`flex items-center gap-3 p-2.5 rounded-xl ${
                        isOwn ? 'bg-[#080808] text-white' : 'bg-[#181818] text-white'
                      }`}
                    >
                      <audio
                        ref={audioRef}
                        src={att.public_url}
                        onTimeUpdate={() => {
                          if (audioRef.current) {
                            const p =
                              (audioRef.current.currentTime / audioRef.current.duration) * 100;
                            setAudioProgress(p || 0);
                          }
                        }}
                        onEnded={() => {
                          setIsPlayingAudio(false);
                          setAudioProgress(0);
                        }}
                      />
                      <button
                        onClick={togglePlayAudio}
                        className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:opacity-90 transition"
                      >
                        {isPlayingAudio ? (
                          <Pause className="w-3.5 h-3.5 fill-black" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                        )}
                      </button>

                      {/* Waveform track */}
                      <div className="flex-1 flex flex-col gap-1">
                        <div className="h-1.5 w-full bg-[#292929] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-white transition-all duration-100"
                            style={{ width: `${audioProgress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#8A8A8A] font-mono">
                          {t.recordVoice}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={att.id}
                    className={`flex items-center justify-between gap-3 p-2.5 rounded-xl ${
                      isOwn ? 'bg-[#080808] text-white' : 'bg-[#181818] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#8A8A8A] shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{att.file_name}</div>
                        <div className="text-[10px] text-[#8A8A8A]">
                          {formatBytes(att.file_size)}
                        </div>
                      </div>
                    </div>
                    {att.public_url && (
                      <a
                        href={att.public_url}
                        download={att.file_name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-white text-black hover:opacity-90 transition shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer: timestamp + edited indicator */}
          <div
            className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] font-mono ${
              isOwn ? 'text-black/60' : 'text-[#8A8A8A]'
            }`}
          >
            {message.is_edited && <span>(изм.)</span>}
            <span>{formatTime(message.created_at)}</span>
            {isOwn && <Check className="w-3 h-3" />}
          </div>
        </div>

        {/* Hover Action Bar */}
        {showActions && (
          <div
            className={`absolute top-0 z-20 flex items-center gap-1 p-1 rounded-xl bg-[#080808] border border-[#292929] shadow-xl ${
              isOwn ? '-left-28 -translate-x-full' : '-right-28 translate-x-full'
            }`}
          >
            <button
              onClick={() => {
                sound.playClick();
                onReply(message);
              }}
              title={t.reply}
              className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#181818]"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowReactionPicker((p) => !p)}
              title="React"
              className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#181818]"
            >
              <Smile className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleCopy}
              title={t.copy}
              className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#181818]"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-white" /> : <Sparkles className="w-3.5 h-3.5" />}
            </button>

            {isOwn && (
              <>
                <button
                  onClick={() => {
                    sound.playClick();
                    onEdit(message);
                  }}
                  title={t.edit}
                  className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#181818]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    sound.playClick();
                    onDelete(message.id);
                  }}
                  title={t.delete}
                  className="p-1.5 rounded-lg text-[#8A8A8A] hover:text-white hover:bg-[#181818]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Reaction Picker Dropdown */}
        {showReactionPicker && (
          <div className="absolute -top-10 left-0 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#080808] border border-[#292929] shadow-2xl">
            {MONO_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  sound.playClick();
                  onReact(message.id, emoji);
                  setShowReactionPicker(false);
                }}
                className="w-7 h-7 rounded-lg hover:bg-[#181818] text-sm flex items-center justify-center transition active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Reactions Counter Row */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {Array.from(new Set(message.reactions.map((r) => r.reaction))).map((reaction) => {
              const count = message.reactions!.filter((r) => r.reaction === reaction).length;
              const hasUserReacted = message.reactions!.some(
                (r) => r.reaction === reaction && r.user_id === currentUserId
              );

              return (
                <button
                  key={reaction}
                  onClick={() => {
                    sound.playClick();
                    onReact(message.id, reaction);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[11px] font-mono border flex items-center gap-1 transition ${
                    hasUserReacted
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#111111] text-[#D0D0D0] border-[#292929] hover:border-white'
                  }`}
                >
                  <span>{reaction}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
