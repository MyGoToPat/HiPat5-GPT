import React, { useState, useEffect, useRef } from 'react';
import { PatAvatar } from './PatAvatar';
import { VoiceWaveform } from './VoiceWaveform';
import { Video, Mic, Volume2, VolumeX, Keyboard, Speaker, ArrowLeft } from 'lucide-react';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { MetricAlert } from '../types/metrics';
import { ConversationAgentManager } from '../utils/conversationAgents';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNavigate } from 'react-router-dom';

export const TalkingPatPage1: React.FC = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [caption, setCaption] = useState("Hi, I'm Pat. I can help with meals, workouts, and planning!");
  const [showConversationBubbles, setShowConversationBubbles] = useState(true);
  const [speechPauseTimer, setSpeechPauseTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Speech recognition hook
  const speechRecognition = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    onStart: () => {
      setCaption("I'm listening... Try saying 'Tell me what you ate' or 'Log my workout'");
    },
    onResult: (transcript, isFinal) => {
      if (isFinal && transcript.trim()) {
        setLastSpeechTime(Date.now());
        setCaption(`You said: "${transcript.trim()}"`);
        
        // Clear existing timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }

        // Set new timeout for response (2 seconds after speech ends)
        speechTimeoutRef.current = setTimeout(() => {
          handleSpeechInput(transcript.trim());
        }, 2000);
      } else if (!isFinal && transcript.trim()) {
        setCaption(`Listening: "${transcript.trim()}"`);
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
      setCaption("Sorry, I had trouble hearing you. Try again!");
    },
    onEnd: () => {
      if (!isListening) {
        setCaption("Hi, I'm Pat. I can help with meals, workouts, and planning!");
      }
    }
  });

  // Mock user metrics for mood calculation
  const userMetrics: UserMetrics = {
    workoutStreak: 2,
    sleepQuality: 68,
    proteinTarget: 75,
    lastWorkout: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ago
    missedWorkouts: 2,
    recentPRs: 0,
    consistencyScore: 65
  };

  const mockAlerts: MetricAlert[] = [
    {
      id: '1',
      type: 'consistency_nudge',
      message: 'You missed your last workout',
      severity: 'warning',
      timestamp: new Date(),
      dismissed: false
    }
  ];

  // Get conversation starters - only show working features
  const workingAgentIds = ['meal-tracker', 'visual-meal-tracker'];
  const conversationStarters = ConversationAgentManager.getAgents()
    .filter(agent => workingAgentIds.includes(agent.id));

  // Calculate Pat's mood
  const getPatMood = () => {
    return PatMoodCalculator.calculateMood(userMetrics, mockAlerts);
  };

  // Speech synthesis for Pat's responses
  const speakResponse = (text: string) => {
    if (isMuted || silentMode) return;

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);
    }
  };

  // Handle speech input and generate response
  const handleSpeechInput = (transcript: string) => {
    if (typeof transcript !== 'string') return;
    
    setIsThinking(true);
    setCaption("Let me think about that...");

    // Check for agent triggers
    const triggeredAgent = ConversationAgentManager.findAgentByTrigger(transcript);

    setTimeout(() => {
      setIsThinking(false);
      
      let response = "";
      
      if (triggeredAgent) {
        if (triggeredAgent.requiresCamera) {
          response = `Great! I'll help you with ${triggeredAgent.title}. Let me open the camera for you.`;
          setTimeout(() => {
            navigate('/camera');
          }, 2000);
        } else {
          response = ConversationAgentManager.generateMealTrackingResponse(transcript);
        }
      } else if (transcript.toLowerCase().includes('hello') || transcript.toLowerCase().includes('hi')) {
        response = "Hello! I'm Pat, your personal AI assistant. I can help you track meals, log workouts, and plan your health goals!";
      } else if (transcript.toLowerCase().includes('help')) {
        response = "I can help you with many things! Try saying 'Tell me what you ate', 'Log my workout', or 'Need a meal idea?'";
      } else {
        response = "I heard you! I'm still learning, but I can help with meal tracking, workout logging, and health planning. What would you like to do?";
      }

      setCaption(response);
      speakResponse(response);
    }, 1500); // Thinking time
  };

  // Handle conversation bubble click
  const handleBubbleClick = (agentTitle: string) => {
    setShowConversationBubbles(false);
    setIsThinking(true);
    setCaption("Let me help you with that...");
    
    // Check if this is a "Show me" action that requires camera
    const agent = ConversationAgentManager.getAgents().find(a => a.title === agentTitle);
    
    setTimeout(() => {
      setIsThinking(false);
      
      if (agent && (agentTitle.includes('Show me') || agent.requiresCamera)) {
        const response = `Perfect! I'll help you with "${agentTitle}". Opening camera now...`;
        setCaption(response);
        speakResponse(response);
        
        setTimeout(() => {
          // Determine auto-start mode based on agent
          const autoStartMode = agentTitle.includes('eating') ? 'takePhoto' : 'videoStream';
          navigate('/camera', { state: { autoStartMode } });
        }, 2000);
        return;
      }
      
      const response = `Great! Let's work on "${agentTitle}". What would you like me to know?`;
      setCaption(response);
      speakResponse(response);
      
      // Start listening after response
      if (!isListening) {
        toggleListening();
      }
    }, 1500); // Thinking time
  };

  const toggleListening = () => {
    const newListeningState = !isListening;
    setIsListening(newListeningState);
    
    if (newListeningState) {
      setShowConversationBubbles(false);
      
      if (speechRecognition.isSupported) {
        speechRecognition.start();
      } else {
        setCaption("Speech recognition is not supported in your browser.");
      }
    } else {
      setShowConversationBubbles(true);
      setCaption("Hi, I'm Pat. I can help with meals, workouts, and planning!");
      
      speechRecognition.stop();
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState && isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleSilentMode = () => {
    const newSilentMode = !silentMode;
    setSilentMode(newSilentMode);
    
    if (newSilentMode) {
      setCaption("Silent mode: I can hear you and will respond with captions only");
      if (isSpeaking) {
        speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } else {
      if (isListening) {
        setCaption("I'm listening... Try saying 'Tell me what you ate' or 'Log my workout'");
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="h-screen bg-pat-gradient flex flex-col w-full overflow-x-hidden pt-[44px]">
      <div className="flex-1 flex flex-col px-6 text-white overflow-hidden">

        {/* Pat Avatar - Positioned Higher */}
        <div className="flex flex-col items-center mt-8 mb-6 flex-shrink-0">
          <PatAvatar 
            size={128} 
            mood={getPatMood()}
            isListening={isListening && speechRecognition.isListening}
            isThinking={isThinking}
            isSpeaking={isSpeaking}
            interactionType="voice"
            className="mb-6"
          />
          
          <VoiceWaveform 
            isActive={isSpeaking || (isListening && speechRecognition.isListening)}
            className="mb-8"
          />
        </div>

        {/* Main Caption */}
        <div className="text-center max-w-xs mx-auto text-white flex-shrink-0">
          <p className="font-medium leading-relaxed">
            {caption}
          </p>
          
          {/* Status Indicators */}
          <div className="mt-3 flex items-center justify-center gap-4 text-sm">
            {isMuted && (
              <div className="flex items-center gap-1 text-red-600">
                <VolumeX size={16} />
                <span className="text-red-300">Muted</span>
              </div>
            )}
            
            {silentMode && (
              <div className="flex items-center gap-1 text-purple-600">
                <Speaker size={16} />
                <span className="text-purple-300">Silent Mode</span>
              </div>
            )}
            
            {isListening && speechRecognition.isListening && (
              <div className="flex items-center gap-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-300">Listening</span>
              </div>
            )}
            
            {isThinking && (
              <div className="flex items-center gap-1 text-purple-600">
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-1 h-1 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-purple-300">Thinking</span>
              </div>
            )}
            
            {isSpeaking && (
              <div className="flex items-center gap-1 text-blue-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-300">Speaking</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Conversation Bubbles - Above Bottom Navigation */}
        {showConversationBubbles && !isListening && (
          <div className="mt-auto pb-4 px-4 flex-shrink-0">
            <div key="conversation-starters-list" className="flex gap-3 overflow-x-auto desktop-scrollbar pb-2">
            {conversationStarters.map((agent, index) => (
              <button
                key={agent.id}
                onClick={() => handleBubbleClick(agent.title)}
                className="px-4 py-2 bg-white hover:bg-gray-100 text-blue-600 rounded-full text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg animate-fade-in whitespace-nowrap flex-shrink-0"
                style={{
                  animationDelay: `${index * 0.1}s`,
                  animationFillMode: 'both'
                }}
              >
                {agent.icon} {agent.title}
              </button>
            ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-3xl">
          <button 
            onClick={() => navigate('/camera')}
            className="p-3 hover:bg-white/20 rounded-full transition-colors"
          >
            <Video size={26} className="text-gray-600" />
          </button>
          
          <button 
            onClick={toggleMute}
            className={`p-3 rounded-full transition-colors ${
              isMuted 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'hover:bg-white/20 text-gray-600'
            }`}
          >
            {isMuted ? <VolumeX size={26} /> : <Volume2 size={26} />}
          </button>
          
          <button 
            onClick={toggleSilentMode}
            className={`p-3 rounded-full transition-colors relative group ${
              silentMode 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'hover:bg-white/20 text-gray-600'
            }`}
          >
            <Speaker size={26} />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {silentMode ? 'Exit Silent Mode' : 'Silent Mode'}
            </div>
          </button>
          
          {/* Pat Avatar for Voice Interaction */}
          <button 
            onClick={toggleListening}
            className={`hover:opacity-80 transition-all duration-300 relative group min-h-[44px] min-w-[44px] ${
              isListening ? 'ring-2 ring-green-500 rounded-full' : ''
            }`}
          >
            <PatAvatar 
              size={40} 
              mood={getPatMood()} 
             isListening={isListening && speechRecognition.isListening}
              isThinking={isThinking}
              isSpeaking={isSpeaking}
              interactionType="voice"
            />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {isListening ? 'Stop Listening' : 'Start Voice Chat'}
            </div>
          </button>
          
          {/* Keyboard Icon for Text Chat */}
          <button 
            onClick={() => navigate('/chat')}
            className="p-3 hover:bg-white/20 rounded-full transition-colors relative group"
          >
            <Keyboard size={26} className="text-gray-600" />
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              Chat with Pat
            </div>
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};