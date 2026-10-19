import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, RefreshCw, Volume2, Shield } from 'lucide-react';
import { CallType, Language, Profile } from '../../types';
import { getTranslation } from '../../i18n';
import { callService } from '../../services/callService';
import { formatDuration } from '../../lib/validation';
import { sound } from '../../utils/sound';

interface CallModalProps {
  isOpen: boolean;
  isIncoming: boolean;
  conversationId: string;
  currentUserId: string;
  targetUser: Profile | null;
  callType: CallType;
  incomingSignalData?: any;
  lang: Language;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  isIncoming,
  conversationId,
  currentUserId,
  targetUser,
  callType,
  incomingSignalData,
  lang,
  onClose,
}) => {
  const t = getTranslation(lang);
  const [callState, setCallState] = useState<'ringing' | 'connected' | 'ended'>(
    isIncoming ? 'ringing' : 'ringing'
  );
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Setup Call
  useEffect(() => {
    if (!isOpen) return;

    const events = {
      onRemoteStream: (stream: MediaStream) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
      },
      onCallAccepted: () => {
        setCallState('connected');
        sound.stopRingtone();
        timerRef.current = window.setInterval(() => {
          setDuration((prev) => prev + 1);
        }, 1000);
      },
      onCallDeclined: () => {
        setCallState('ended');
        sound.stopRingtone();
        setTimeout(onClose, 1200);
      },
      onCallEnded: () => {
        setCallState('ended');
        sound.stopRingtone();
        setTimeout(onClose, 1200);
      },
      onError: (err: any) => {
        console.error('WebRTC error:', err);
        setCallError(err.message || 'Call failed');
      },
    };

    if (!isIncoming && targetUser) {
      // Outgoing call initiation
      callService
        .startCall({
          conversationId,
          currentUserId,
          targetUserId: targetUser.id,
          callType,
          events,
        })
        .then(() => {
          const stream = callService.getLocalStream();
          if (stream && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          setCallError(err.message);
        });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, isIncoming, conversationId, currentUserId, targetUser, callType, onClose]);

  const handleAcceptIncoming = async () => {
    if (!incomingSignalData || !targetUser) return;
    try {
      await callService.answerCall({
        conversationId,
        currentUserId,
        targetUserId: targetUser.id,
        sessionId: incomingSignalData.sessionId,
        callType: incomingSignalData.callType || callType,
        offer: incomingSignalData.offer,
        events: {
          onRemoteStream: (stream) => {
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = stream;
            }
          },
          onCallAccepted: () => {
            setCallState('connected');
            timerRef.current = window.setInterval(() => {
              setDuration((prev) => prev + 1);
            }, 1000);
          },
          onCallDeclined: () => {
            setCallState('ended');
            setTimeout(onClose, 1000);
          },
          onCallEnded: () => {
            setCallState('ended');
            setTimeout(onClose, 1000);
          },
          onError: (err) => setCallError(err.message),
        },
      });

      const stream = callService.getLocalStream();
      if (stream && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCallError(err.message);
    }
  };

  const handleDeclineIncoming = () => {
    callService.declineCall();
    onClose();
  };

  const handleEndCall = () => {
    callService.endCall();
    setCallState('ended');
    setTimeout(onClose, 800);
  };

  const toggleMic = () => {
    const next = !isMuted;
    setIsMuted(next);
    callService.toggleAudio(!next);
  };

  const toggleCamera = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    callService.toggleVideo(!next);
  };

  const handleSwitchCamera = () => {
    callService.switchCamera();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#080808] border border-[#292929] rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center">
        {/* Top Info Header */}
        <div className="w-full px-6 py-4 flex items-center justify-between border-b border-[#181818] z-20">
          <div className="flex items-center gap-2 text-xs font-mono text-[#8A8A8A]">
            <Shield className="w-3.5 h-3.5 text-white" />
            <span>P2P WebRTC Encrypted</span>
          </div>
          <span className="text-xs font-mono font-bold text-white">
            {callState === 'connected' ? formatDuration(duration) : t.outgoingCall}
          </span>
        </div>

        {/* Video / Call Screen Viewport */}
        <div className="relative w-full aspect-video max-h-[460px] bg-black flex items-center justify-center overflow-hidden">
          {/* Remote Video Stream (Main) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${
              callType === 'video' && callState === 'connected' ? 'block' : 'hidden'
            }`}
          />

          {/* Fallback Audio Call Avatar / Waveform View */}
          {(callType === 'audio' || callState === 'ringing') && (
            <div className="flex flex-col items-center justify-center p-8 text-center z-10">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-[#181818] border-2 border-white overflow-hidden flex items-center justify-center shadow-2xl">
                  {targetUser?.avatar_url ? (
                    <img
                      src={targetUser.avatar_url}
                      alt={targetUser.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-white uppercase">
                      {targetUser?.full_name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                {callState === 'ringing' && (
                  <div className="absolute -inset-2 rounded-full border border-white animate-ping opacity-40 pointer-events-none" />
                )}
              </div>

              <h3 className="text-lg font-bold text-white mb-1">
                {targetUser?.full_name || 'Собеседник'}
              </h3>
              <p className="text-xs text-[#8A8A8A] font-mono mb-2">
                @{targetUser?.username || 'user'}
              </p>
              <span className="text-xs text-white px-3 py-1 rounded-full bg-[#181818] border border-[#292929]">
                {callState === 'ringing'
                  ? isIncoming
                    ? t.incomingCall
                    : t.outgoingCall
                  : t.callConnected}
              </span>
            </div>
          )}

          {/* Local Video Stream (Picture-in-Picture) */}
          {callType === 'video' && (
            <div className="absolute bottom-4 right-4 w-32 sm:w-40 aspect-video rounded-xl bg-[#111111] border border-[#292929] overflow-hidden shadow-2xl z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-[#181818] text-[#8A8A8A] text-[10px]">
                  Камера выкл.
                </div>
              )}
            </div>
          )}
        </div>

        {callError && (
          <div className="w-full px-6 py-2 bg-[#111111] text-xs text-white text-center border-t border-[#292929]">
            {callError}
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="w-full p-6 bg-[#080808] border-t border-[#181818] flex items-center justify-center gap-4 z-20">
          {isIncoming && callState === 'ringing' ? (
            /* Incoming Call Action Buttons */
            <div className="flex items-center gap-8">
              <button
                onClick={handleDeclineIncoming}
                title={t.declineCall}
                className="w-14 h-14 rounded-2xl bg-[#181818] border border-[#292929] text-[#8A8A8A] hover:text-white hover:border-white flex items-center justify-center transition active:scale-95"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              <button
                onClick={handleAcceptIncoming}
                title={t.acceptCall}
                className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center transition hover:opacity-90 active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.4)]"
              >
                <Phone className="w-6 h-6 fill-black" />
              </button>
            </div>
          ) : (
            /* Active Call Controls */
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                onClick={toggleMic}
                title={isMuted ? t.unmuteMic : t.muteMic}
                className={`p-3.5 rounded-2xl border transition ${
                  isMuted
                    ? 'bg-white text-black border-white'
                    : 'bg-[#181818] border-[#292929] text-white hover:border-white'
                }`}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {callType === 'video' && (
                <>
                  <button
                    onClick={toggleCamera}
                    title={isVideoOff ? t.turnCameraOn : t.turnCameraOff}
                    className={`p-3.5 rounded-2xl border transition ${
                      isVideoOff
                        ? 'bg-white text-black border-white'
                        : 'bg-[#181818] border-[#292929] text-white hover:border-white'
                    }`}
                  >
                    {isVideoOff ? (
                      <VideoOff className="w-5 h-5" />
                    ) : (
                      <Video className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={handleSwitchCamera}
                    title="Переключить камеру"
                    className="p-3.5 rounded-2xl bg-[#181818] border border-[#292929] text-white hover:border-white transition"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                title={t.endCall}
                className="px-6 py-3.5 rounded-2xl bg-[#181818] border-2 border-white text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-white hover:text-black transition shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{t.endCall}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
