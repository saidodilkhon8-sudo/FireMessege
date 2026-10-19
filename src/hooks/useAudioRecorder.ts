import { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioRecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  waveforms: number[];
  error: string | null;
}

export function useAudioRecorder() {
  const [state, setState] = useState<AudioRecordingState>({
    isRecording: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    waveforms: [],
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startRecording = async () => {
    cleanup();
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // AudioContext analyzer for visual waves
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyzer = audioCtx.createAnalyser();
      analyzer.fftSize = 64;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // Select mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setState((prev) => ({
          ...prev,
          isRecording: false,
          audioBlob: blob,
          audioUrl: url,
        }));
      };

      mediaRecorder.start(100);

      setState({
        isRecording: true,
        duration: 0,
        audioBlob: null,
        audioUrl: null,
        waveforms: [],
        error: null,
      });

      // Duration counter
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        setState((prev) => ({ ...prev, duration: secs }));
      }, 1000);

      // Waveform update loop
      const updateWaveform = () => {
        if (!analyzerRef.current) return;
        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);

        // Normalize 8 levels for minimalist bar visualization
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const level = Math.min(100, Math.max(10, Math.round((sum / dataArray.length) * 0.8)));

        setState((prev) => {
          const nextWaves = [...prev.waveforms.slice(-24), level];
          return { ...prev, waveforms: nextWaves };
        });

        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (err: any) {
      cleanup();
      setState((prev) => ({
        ...prev,
        isRecording: false,
        error: err?.message || 'Microphone access denied',
      }));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    setState({
      isRecording: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      waveforms: [],
      error: null,
    });
  };

  return {
    ...state,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
