import { useState, useRef, useCallback, useEffect } from 'react';

interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

interface SpeechRecognitionHook {
  transcript: string;
  interimTranscript: string;
  finalTranscript: string;
  isListening: boolean;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(options: SpeechRecognitionOptions = {}): SpeechRecognitionHook {
  const {
    continuous = true,
    interimResults = true,
    language = 'en-US',
    onResult,
    onError,
    onStart,
    onEnd
  } = options;

  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);

  // Check if speech recognition is supported
  const isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      onStart?.();
    };

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcriptPart;
        } else {
          interimText += transcriptPart;
        }
      }

      setInterimTranscript(interimText);
      
      if (finalText) {
        setFinalTranscript(prev => prev + finalText);
        setTranscript(prev => prev + finalText);
        onResult?.(finalText, true);
      } else if (interimText) {
        setTranscript(finalTranscript + interimText);
        onResult?.(interimText, false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      isListeningRef.current = false;
      onError?.(event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Restart recognition if still supposed to be listening
      if (isListeningRef.current && continuous) {
        setTimeout(() => {
          if (isListeningRef.current) {
            try {
              recognition.start();
            } catch (error) {
              console.error('Failed to restart recognition:', error);
              isListeningRef.current = false;
            }
          }
        }, 100);
      } else {
        isListeningRef.current = false;
      }
      
      onEnd?.();
    };

    return recognition;
  }, [continuous, interimResults, language, onResult, onError, onStart, onEnd, isSupported, finalTranscript]);

  const start = useCallback(() => {
    if (!isSupported) {
      onError?.('Speech recognition not supported');
      return;
    }

    if (!recognitionRef.current) {
      recognitionRef.current = initializeRecognition();
    }

    if (recognitionRef.current && !isListening) {
      try {
        isListeningRef.current = true;
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start speech recognition:', error);
        isListeningRef.current = false;
        onError?.('Failed to start speech recognition');
      }
    }
  }, [isSupported, initializeRecognition, isListening, onError]);

  const stop = useCallback(() => {
    isListeningRef.current = false;
    
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFinalTranscript('');
    stop();
  }, [stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    transcript,
    interimTranscript,
    finalTranscript,
    isListening,
    isSupported,
    start,
    stop,
    reset
  };
}