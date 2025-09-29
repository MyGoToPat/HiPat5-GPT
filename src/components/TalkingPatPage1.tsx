import React, { useState, useRef, useEffect } from 'react';
import { Heart, Mic, MicOff, Volume2, VolumeX, MessageCircle, Camera, Utensils, Dumbbell, Calendar, BookOpen, MapPin } from 'lucide-react';
import { PatAvatar } from '../PatAvatar';
import { getSupabase } from '../lib/supabase';
import { PatMood } from '../types/metrics';
import { MetricAlert } from '../types/metrics';
import { ConversationAgentManager } from '../utils/conversationAgents';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNavigate } from 'react-router-dom';
import { runPersonalityPipeline } from '../lib/personality/orchestrator';
import { speak } from '../lib/tts';

export const TalkingPatPage1: React.FC = () => {
  const navigate = useNavigate();

  // Pat's states
  const [patMood, setPatMood] = useState<PatMood>('happy');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [caption, setCaption] = useState("Hi, I'm Pat. I can help with meals, workouts, and planning!");
  const [showConversationBubbles, setShowConversationBubbles] = useState(true);
  const [speechPauseTimer, setSpeechPauseTimer] = useState<NodeJS.Timeout | null>(null);
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Speech recognition hook
  const { startListening, stopListening, transcript, browserSupportsSpeechRecognition } = useSpeechRecognition({
    continuous: true,
    language: 'en-US',
    interimResults: true,
    onStart: () => {
      setCaption("I'm listening... Try saying 'Tell me what you ate' or 'Log my workout'");
    },
    onResult: (transcript, isFinal) => {
      if (isFinal && transcript.trim()) {
        setCaption(`You said: "${transcript.trim()}"`);
        
        // Clear existing timeout
        if (speechTimeoutRef.current) {
          clearTimeout(speechTimeoutRef.current);
        }
        
        // Set new timeout for response (2 seconds after speech ends)
        speechTimeoutRef.current = setTimeout(() => {
          handleSpeechInput(transcript.trim());
        }, 1500); // Reduced timeout for quicker response
      } else if (!isFinal && transcript.trim()) {
        setCaption(`Listening: "${transcript.trim()}"`);
      }
    },
    onEnd: () => {
      // Keep listening active
      if (isListening && !isMuted) {
        setTimeout(() => {
          startListening();
        }, 100);
      }
    },
    onError: (error) => {
      console.error('Speech recognition error:', error);
      setCaption("Sorry, I had trouble hearing you. Try speaking again!");
      setIsListening(false);
    }
  });

  // Toggle listening
  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setIsListening(false);
      setCaption("Click the microphone to start talking");
    } else if (!isMuted) {
      startListening();
      setIsListening(true);
    }
  };

  // Speech synthesis for Pat's responses
  const speakResponse = async (text: string) => {
    if (isMuted || silentMode) return;

    setIsSpeaking(true);
    try {
      await speak(text, { rate: 0.9, pitch: 1.1, volume: 0.8 });
    } catch (error) {
      console.error("Error in speakResponse:", error);
    } finally {
      setIsSpeaking(false);
    }

  };

  // Handle speech input and generate response
  const handleSpeechInput = async (transcript: string) => {
    if (typeof transcript !== 'string') return;
    
    setIsThinking(true);
    setCaption("Let me think about that...");

    try {
      const supabase = getSupabase(); // Assuming getSupabase is available
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCaption("Please log in to use voice features.");
        await speakResponse("Please log in to use voice features.");
        return;
      }

      // Mock userProfile for now, replace with actual fetch if needed
      const userProfile = {
        id: user.id,
        user_id: user.id,
        name: user.email || 'User',
        email: user.email || '',
        beta_user: true, // Example
        role: 'free_user', // Example
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const pipelineResult = await runPersonalityPipeline({
        userMessage: transcript,
        context: {
          userId: user.id,
          userProfile: userProfile,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          today: new Date().toISOString().slice(0, 10),
          audience: 'beginner',
          free: {
            frequency: "building",
            rest: "tracking",
            energy: "logging",
            effort: "measuring"
          }
        }
      });

      // Log the routing decision for voice
      if (pipelineResult.debug?.routerDecision) {
        const { route, target, confidence } = pipelineResult.debug.routerDecision;
        const chosen = chooseTarget(route, target, confidence); // Use the shared chooseTarget
        console.debug("[Pat VoiceRouter]", { route, target, confidence, chosen });
      }

      if (pipelineResult.ok) {
        const responseText = pipelineResult.answer;
        setCaption(responseText);
        await speakResponse(responseText);
      } else {
        const errorResponse = pipelineResult.error || "I'm having trouble processing that right now. Please try again.";
        setCaption(errorResponse);
        await speakResponse(errorResponse);
      }
    } catch (error) {
      console.error('Error in voice pipeline:', error);
      const errorMessage = "I encountered an unexpected error. Please try again.";
      setCaption(errorMessage);
      await speakResponse(errorMessage);
    } finally {
      setIsThinking(false);
    }
  };

  // Handle conversation bubble click
  const handleBubbleClick = async (agentTitle: string) => {
    if (isMuted || silentMode) return;
    
    // Check if this is a camera-requiring agent
    const agent = ConversationAgentManager.findAgentByTitle(agentTitle);
    
    if (agent && (agentTitle.includes('Show me') || agent.requiresCamera)) {
      const response = `Perfect! I'll help you with "${agentTitle}". Opening camera now...`;
      setCaption(response);
      await speakResponse(response);
      
      setTimeout(() => {
        // Determine auto-start mode based on agent
        const autoStartMode = agentTitle.includes('Show me what you ate') ? 'food' : 'general';
        navigate('/camera', { state: { autoStartMode } });
      }, 2000);
      return;
    }
    
    const response = `Great! Let's work on "${agentTitle}". What would you like me to know?`;
    setCaption(response);
    await speakResponse(response);
    
    // Start listening after response
    if (!isListening) {
      setTimeout(() => {
        toggleListening();
      }, 2000);
    }
  };

  // Get conversation agents for bubbles
  const conversationAgents = ConversationAgentManager.getAgents().slice(0, 6);

  // Determine Pat's mood based on states
  const getCurrentPatMood = (): PatMood => {
    if (isThinking) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return 'happy';
  };

  // Update Pat's mood when states change
  useEffect(() => {
    setPatMood(getCurrentPatMood());
  }, [isListening, isSpeaking, isThinking]);

  // Handle mute toggle
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (newMutedState && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Handle silent mode toggle
  const toggleSilentMode = () => {
    const newSilentMode = !silentMode;
    setSilentMode(newSilentMode);
    
    if (newSilentMode) {
      setCaption("Silent mode: I can hear you and will respond with captions only");
      if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } else {
      setCaption("Voice mode: I can hear you and will speak back");
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-red-500" />
          <span className="text-lg font-semibold text-gray-800">Talk to Pat</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSilentMode}
            className={`p-2 rounded-full transition-all duration-200 ${
              silentMode 
                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={silentMode ? "Switch to voice mode" : "Switch to silent mode"}
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-all duration-200 ${
              isMuted 
                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Pat Avatar */}
        <div className="mb-8">
          <PatAvatar 
            mood={patMood}
            size="xl"
            showPulse={isListening || isSpeaking || isThinking}
            className="transition-all duration-300"
          />
        </div>

        {/* Caption */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto shadow-lg border border-gray-200 mb-8">
          <p className="text-center text-gray-800 text-lg leading-relaxed">
            {caption}
          </p>
        </div>

        {/* Voice Controls */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={toggleListening}
            disabled={isMuted || !browserSupportsSpeechRecognition}
            className={`flex items-center justify-center w-16 h-16 rounded-full transition-all duration-200 shadow-lg ${
              isListening
                ? 'bg-green-500 text-white scale-110 shadow-green-200'
                : isMuted
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
            }`}
            title={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
          </button>
        </div>

        {/* Browser Support Warning */}
        {!browserSupportsSpeechRecognition && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md mx-auto mb-8">
            <p className="text-amber-800 text-sm text-center">
              Voice recognition is not supported in this browser. Please try Chrome or Edge for the best experience.
            </p>
          </div>
        )}

        {/* Conversation Bubbles */}
        {showConversationBubbles && (
          <div className="w-full max-w-4xl">
            <h3 className="text-lg font-medium text-gray-700 text-center mb-4">
              Quick conversation starters:
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {conversationAgents.map((agent, index) => (
                <button
                  key={index}
                  onClick={() => handleBubbleClick(agent.title)}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left"
                >
                  <div className="text-blue-500">
                    {agent.title.includes('ate') && <Utensils className="w-5 h-5" />}
                    {agent.title.includes('workout') && <Dumbbell className="w-5 h-5" />}
                    {agent.title.includes('plan') && <Calendar className="w-5 h-5" />}
                    {agent.title.includes('Show me') && <Camera className="w-5 h-5" />}
                    {agent.title.includes('recipe') && <BookOpen className="w-5 h-5" />}
                    {agent.title.includes('find') && <MapPin className="w-5 h-5" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {agent.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};