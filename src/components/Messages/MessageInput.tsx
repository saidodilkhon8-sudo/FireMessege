import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, Mic, Send, X, Square, Check, Image as ImageIcon } from 'lucide-react';
import { Message, Language } from '../../types';
import { getTranslation } from '../../i18n';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { validateAttachment, formatDuration } from '../../lib/validation';
import { sound } from '../../utils/sound';

interface MessageInputProps {
  onSendMessage: (content: string, replyToId?: string | null) => Promise<void>;
  onSendVoice: (audioBlob: Blob) => Promise<void>;
  onSendAttachment: (file: File) => Promise<void>;
  onSendTyping: () => void;
  replyTo: Message | null;
  editingMessage: Message | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: string, newContent: string) => Promise<void>;
  lang: Language;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendVoice,
  onSendAttachment,
  onSendTyping,
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onSaveEdit,
  lang,
}) => {
  const t = getTranslation(lang);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    isRecording,
    duration,
    audioBlob,
    waveforms,
    error: audioError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  // Populate text if editing
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle voice note readiness
  useEffect(() => {
    if (audioBlob && !isRecording) {
      setIsSending(true);
      onSendVoice(audioBlob).finally(() => {
        setIsSending(false);
      });
    }
  }, [audioBlob, isRecording, onSendVoice]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    sound.playMessageSent();

    try {
      if (editingMessage) {
        await onSaveEdit(editingMessage.id, trimmed);
        onCancelEdit();
      } else {
        await onSendMessage(trimmed, replyTo?.id);
        if (replyTo) onCancelReply();
      }
      setText('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const check = validateAttachment(file);
    if (!check.valid) {
      alert(check.error || t.fileSizeLimit);
      return;
    }

    setIsSending(true);
    try {
      await onSendAttachment(file);
      sound.playMessageSent();
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="relative border-t border-[#292929] bg-[#080808] p-3 sm:p-4">
      {/* Reply Quote Banner */}
      {replyTo && (
        <div className="mb-2 p-2.5 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-between text-xs">
          <div className="border-l-2 border-white pl-2">
            <span className="font-bold text-white">
              {t.reply}: {replyTo.sender?.full_name || 'Собеседник'}
            </span>
            <p className="text-[#8A8A8A] truncate max-w-sm">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-[#8A8A8A] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editing Banner */}
      {editingMessage && (
        <div className="mb-2 p-2.5 rounded-xl bg-[#111111] border border-[#292929] flex items-center justify-between text-xs">
          <div className="border-l-2 border-white pl-2">
            <span className="font-bold text-white">{t.edit}</span>
            <p className="text-[#8A8A8A] truncate max-w-sm">{editingMessage.content}</p>
          </div>
          <button
            onClick={onCancelEdit}
            className="p-1 text-[#8A8A8A] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Active Voice Recording Bar */}
      {isRecording ? (
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#111111] border border-white">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white animate-ping" />
            <span className="font-mono text-xs text-white">
              {formatDuration(duration)}
            </span>

            {/* Live waveform equalizer bars */}
            <div className="flex items-center gap-1 h-5 px-2">
              {waveforms.slice(-16).map((h, idx) => (
                <div
                  key={idx}
                  className="w-1 bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.max(4, (h / 100) * 20)}px` }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sound.playClick();
                cancelRecording();
              }}
              title={t.cancelRecording}
              className="p-2 rounded-xl text-[#8A8A8A] hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                sound.playClick();
                stopRecording();
              }}
              title={t.stopRecording}
              className="px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs uppercase flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Square className="w-3 h-3 fill-black" />
              <span>{t.send}</span>
            </button>
          </div>
        </div>
      ) : (
        /* Regular Message Input Row */
        <div className="flex items-end gap-2">
          {/* File Attachment Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Прикрепить файл или фото"
            className="p-2.5 rounded-xl bg-[#111111] border border-[#292929] text-[#8A8A8A] hover:text-white hover:border-white transition shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                onSendTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder={t.messagePlaceholder}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#111111] border border-[#292929] text-xs sm:text-sm text-white placeholder-[#8A8A8A] focus:outline-none focus:border-white transition resize-none max-h-32"
            />
          </div>

          {/* Voice Record OR Send Button */}
          {text.trim() ? (
            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="p-2.5 rounded-xl bg-white text-black hover:opacity-90 active:scale-95 transition shrink-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] disabled:opacity-50"
            >
              <Send className="w-4 h-4 fill-black" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                sound.playClick();
                startRecording();
              }}
              title={t.recordVoice}
              className="p-2.5 rounded-xl bg-[#111111] border border-[#292929] text-white hover:border-white transition shrink-0"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {audioError && (
        <div className="text-[11px] text-[#8A8A8A] mt-1 ml-1">{audioError}</div>
      )}
    </div>
  );
};
