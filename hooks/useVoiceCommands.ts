import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export type VoiceCommand = 'capture' | 'delete' | 'play';

const COMMAND_MAP: { phrases: string[]; command: VoiceCommand }[] = [
  { phrases: ['take photo', 'capture', 'snap'], command: 'capture' },
  { phrases: ['delete photo', 'delete frame', 'undo'], command: 'delete' },
  { phrases: ['play', 'preview'], command: 'play' },
];

const DEBOUNCE_MS = 1500;

function matchCommand(transcript: string): VoiceCommand | null {
  const lower = transcript.toLowerCase().trim();
  for (const entry of COMMAND_MAP) {
    for (const phrase of entry.phrases) {
      if (lower.includes(phrase)) {
        return entry.command;
      }
    }
  }
  return null;
}

interface UseVoiceCommandsOptions {
  onCapture: () => void;
  onDelete: () => void;
  onPlay: () => void;
}

export function useVoiceCommands({ onCapture, onDelete, onPlay }: UseVoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);

  const wantsListening = useRef(false);
  const lastCommandTime = useRef(0);
  const lastCommandRef = useRef<VoiceCommand | null>(null);

  // Keep handler refs current to avoid stale closures
  const onCaptureRef = useRef(onCapture);
  const onDeleteRef = useRef(onDelete);
  const onPlayRef = useRef(onPlay);
  useEffect(() => { onCaptureRef.current = onCapture; }, [onCapture]);
  useEffect(() => { onDeleteRef.current = onDelete; }, [onDelete]);
  useEffect(() => { onPlayRef.current = onPlay; }, [onPlay]);

  const executeCommand = useCallback((cmd: VoiceCommand) => {
    const now = Date.now();
    if (now - lastCommandTime.current < DEBOUNCE_MS && lastCommandRef.current === cmd) {
      return; // debounce duplicate
    }
    lastCommandTime.current = now;
    lastCommandRef.current = cmd;
    setLastCommand(cmd);

    switch (cmd) {
      case 'capture':
        onCaptureRef.current();
        break;
      case 'delete':
        onDeleteRef.current();
        break;
      case 'play':
        onPlayRef.current();
        break;
    }

    // Clear feedback after a short delay
    setTimeout(() => setLastCommand(null), 1200);
  }, []);

  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results?.[0]?.transcript ?? '';
    if (!transcript) return;

    const cmd = matchCommand(transcript);
    if (cmd) {
      executeCommand(cmd);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    // Auto-restart if user still wants listening
    if (wantsListening.current) {
      startRecognition();
    } else {
      setIsListening(false);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.warn('Speech recognition error:', event.error, event.message);
    // If it's a "no-speech" timeout, restart if still wanted
    if (wantsListening.current && event.error === 'no-speech') {
      startRecognition();
    } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
      setIsAvailable(false);
      wantsListening.current = false;
      setIsListening(false);
    }
  });

  const startRecognition = useCallback(() => {
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
    });
  }, []);

  const toggleListening = useCallback(async () => {
    if (wantsListening.current) {
      // Stop
      wantsListening.current = false;
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      return;
    }

    // Request permission lazily
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setIsAvailable(false);
      return;
    }

    wantsListening.current = true;
    setIsListening(true);
    startRecognition();
  }, [startRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wantsListening.current = false;
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  return { isListening, isAvailable, lastCommand, toggleListening };
}
