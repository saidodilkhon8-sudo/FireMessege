import { supabase } from '../lib/supabase';
import { CallType, WebRTCSignalPayload } from '../types';
import { sound } from '../utils/sound';

export interface CallEvents {
  onRemoteStream: (stream: MediaStream) => void;
  onCallEnded: () => void;
  onCallAccepted: () => void;
  onCallDeclined: () => void;
  onError: (err: any) => void;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class CallController {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private channel: any = null;
  private sessionId: string | null = null;
  private conversationId: string | null = null;
  private currentUserId: string | null = null;
  private targetUserId: string | null = null;
  private events: CallEvents | null = null;
  private currentFacingMode: 'user' | 'environment' = 'user';

  constructor() {}

  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  public async startCall(params: {
    conversationId: string;
    currentUserId: string;
    targetUserId: string;
    callType: CallType;
    events: CallEvents;
  }): Promise<string> {
    this.conversationId = params.conversationId;
    this.currentUserId = params.currentUserId;
    this.targetUserId = params.targetUserId;
    this.events = params.events;
    this.sessionId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Get user media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: params.callType === 'video' ? { facingMode: this.currentFacingMode } : false,
      });
    } catch (err) {
      this.events.onError(err);
      throw err;
    }

    // 2. Setup RTCPeerConnection
    this.setupPeerConnection();

    // 3. Connect Realtime Signaling Channel
    this.subscribeSignalingChannel();

    sound.startRingtone();

    // 4. Create and send offer
    try {
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      // Send initial invite signal
      setTimeout(() => {
        this.sendSignal({
          type: 'offer',
          sender_id: this.currentUserId!,
          target_id: this.targetUserId!,
          session_id: this.sessionId!,
          data: { offer, callType: params.callType },
        });
      }, 300);
    } catch (err) {
      this.cleanup();
      this.events?.onError(err);
      throw err;
    }

    return this.sessionId;
  }

  public async answerCall(params: {
    conversationId: string;
    currentUserId: string;
    targetUserId: string;
    sessionId: string;
    callType: CallType;
    offer: RTCSessionDescriptionInit;
    events: CallEvents;
  }) {
    this.conversationId = params.conversationId;
    this.currentUserId = params.currentUserId;
    this.targetUserId = params.targetUserId;
    this.sessionId = params.sessionId;
    this.events = params.events;

    sound.stopRingtone();

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: params.callType === 'video' ? { facingMode: this.currentFacingMode } : false,
      });

      this.setupPeerConnection();
      this.subscribeSignalingChannel();

      await this.peerConnection!.setRemoteDescription(new RTCSessionDescription(params.offer));
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.sendSignal({
        type: 'answer',
        sender_id: this.currentUserId!,
        target_id: this.targetUserId!,
        session_id: this.sessionId!,
        data: { answer },
      });

      this.events.onCallAccepted();
    } catch (err) {
      this.cleanup();
      this.events?.onError(err);
      throw err;
    }
  }

  public declineCall() {
    sound.stopRingtone();
    if (this.sessionId && this.currentUserId && this.targetUserId) {
      this.sendSignal({
        type: 'call-declined',
        sender_id: this.currentUserId,
        target_id: this.targetUserId,
        session_id: this.sessionId,
        data: {},
      });
    }
    this.cleanup();
  }

  public endCall() {
    sound.stopRingtone();
    if (this.sessionId && this.currentUserId && this.targetUserId) {
      this.sendSignal({
        type: 'call-ended',
        sender_id: this.currentUserId,
        target_id: this.targetUserId,
        session_id: this.sessionId,
        data: {},
      });
    }
    this.cleanup();
  }

  public toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public toggleVideo(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  public async switchCamera() {
    if (!this.localStream) return;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: this.currentFacingMode },
      });
      const newVideoTrack = newStream.getVideoTracks()[0];

      if (this.peerConnection) {
        const sender = this.peerConnection.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }

      this.localStream.removeTrack(videoTrack);
      videoTrack.stop();
      this.localStream.addTrack(newVideoTrack);
    } catch (err) {
      console.warn('Could not switch camera:', err);
    }
  }

  private setupPeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.remoteStream = new MediaStream();

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote track
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      if (this.events) {
        this.events.onRemoteStream(this.remoteStream!);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.currentUserId && this.targetUserId && this.sessionId) {
        this.sendSignal({
          type: 'candidate',
          sender_id: this.currentUserId,
          target_id: this.targetUserId,
          session_id: this.sessionId,
          data: { candidate: event.candidate },
        });
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      if (
        this.peerConnection?.connectionState === 'disconnected' ||
        this.peerConnection?.connectionState === 'failed' ||
        this.peerConnection?.connectionState === 'closed'
      ) {
        this.cleanup();
        this.events?.onCallEnded();
      } else if (this.peerConnection?.connectionState === 'connected') {
        sound.stopRingtone();
      }
    };
  }

  private subscribeSignalingChannel() {
    if (!this.conversationId) return;

    this.channel = supabase.channel(`call_signaling_${this.conversationId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel
      .on('broadcast', { event: 'signal' }, async ({ payload }: { payload: WebRTCSignalPayload }) => {
        if (!payload || payload.target_id !== this.currentUserId) return;

        if (payload.type === 'answer' && this.peerConnection) {
          sound.stopRingtone();
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.data.answer));
          this.events?.onCallAccepted();
        } else if (payload.type === 'candidate' && this.peerConnection) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.data.candidate));
          } catch (e) {
            console.warn('Error adding ICE candidate', e);
          }
        } else if (payload.type === 'call-ended' || payload.type === 'call-declined') {
          sound.stopRingtone();
          this.cleanup();
          if (payload.type === 'call-declined') {
            this.events?.onCallDeclined();
          } else {
            this.events?.onCallEnded();
          }
        }
      })
      .subscribe();
  }

  private sendSignal(payload: WebRTCSignalPayload) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'signal',
        payload,
      });
    }
  }

  public cleanup() {
    sound.stopRingtone();

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((t) => t.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.sessionId = null;
    this.conversationId = null;
    this.targetUserId = null;
  }
}

export const callService = new CallController();
