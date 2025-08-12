import React, { useState, useEffect } from 'react';
import { PatAvatar } from './PatAvatar';
import { VoiceWaveform } from './VoiceWaveform';
import { AppBar } from './AppBar';
import { NavigationSidebar } from './NavigationSidebar';
import { ConversationAgentManager } from '../utils/conversationAgents';
import { AgentSession } from '../types/agents';

interface TalkingPatPage3Props {
  onNavigate: (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => void;
}

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
}

export const TalkingPatPage3: React.FC<TalkingPatPage3Props> = ({ onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Passive listening mode active. I\'m monitoring for agent triggers...',
      timestamp: new Date(),
      isUser: false
    }
  ]);
  const [isListening, setIsListening] = useState(true);
  const [showNavigation, setShowNavigation] = useState(false);
  const [activeAgentSession, setActiveAgentSession] = useState<AgentSession | null>(null);
  const [silentMode, setSilentMode] = useState(false);
  const [showConversationBubbles, setShowConversationBubbles] = useState(true);

  // Get conversation starters
  const conversationStarters = ConversationAgentManager.getAgents().slice(0, 4);

  const handleBubbleClick = (agentTitle: string) => {
    setShowConversationBubbles(false);
    
    // Check if this is a "Show me" action that requires camera
    const agent = ConversationAgentManager.getAgents().find(a => a.title === agentTitle);
    
    if (agent && (agentTitle.includes('Show me') || agent.requiresCamera)) {
      // Immediately trigger camera and navigate to camera page
      setTimeout(() => {
        // Determine auto-start mode based on agent
        const autoStartMode = agentTitle.includes('eating') ? 'takePhoto' : 'videoStream';
        onNavigate('camera', { autoStartMode });
      }, 500);
      
      const cameraMessage: Message = {
        id: Date.now().toString(),
        text: `Camera activating for "${agentTitle}"...`,
        timestamp: new Date(),
        isUser: false
      };
      
      setMessages(prev => [...prev, cameraMessage]);
      return;
    }
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: agentTitle,
      timestamp: new Date(),
      isUser: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Simulate agent response
    setTimeout(() => {
      const agentResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `Perfect! I'm ready to help with "${agentTitle}". Please continue speaking...`,
        timestamp: new Date(),
        isUser: false
      };
      setMessages(prev => [...prev, agentResponse]);
    }, 1000);
  };

  useEffect(() => {
    // Simulate continuous listening and responses
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        // Simulate agent-triggered responses
        const agentResponses = [
          "I heard you mention food - would you like me to log your meal?",
          "It sounds like you had a great workout! Should I track that for you?",
          "I'm listening for meal planning requests if you need suggestions.",
          "Feel free to say 'Tell me what you ate' or 'Log my workout' anytime."
        ];
        
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: agentResponses[Math.floor(Math.random() * agentResponses.length)],
          timestamp: new Date(),
          isUser: false
        }]);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen bg-pat-gradient flex flex-col">
      <NavigationSidebar 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
        onNavigate={onNavigate}
        onNewChat={() => onNavigate('chat')}
      />
      
      <AppBar 
        title="PAT" 
        onBack={() => onNavigate('voice')}
        onMenu={() => setShowNavigation(true)}
        showBack
      />
      
      <div className="flex-1 flex flex-col text-white">
        <div className="flex flex-col items-center justify-center py-8 relative">
          {/* Conversation Bubbles - Above Avatar */}
          {showConversationBubbles && (
            <div className="absolute top-0 left-4 right-4 z-10">
              <div key="conversation-bubbles-list" className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
                {conversationStarters.map((agent, index) => (
                  <button
                    key={agent.id}
                    onClick={() => handleBubbleClick(agent.title)}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-medium transition-all duration-300 transform hover:scale-105 shadow-lg animate-fade-in"
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
          
          <PatAvatar 
            size={128} 
            mood="listening"
            isListening={isListening}
            className="mb-4"
          />
          
          <VoiceWaveform 
            isActive={isListening}
            barCount={5}
            color="bg-yellow-400"
            className="mb-6"
          />
          
          <p className="text-center text-white/70 text-sm italic max-w-xs">
            {showConversationBubbles 
              ? "Tap a bubble above or speak naturally..." 
              : "Listening... Try 'Tell me what you ate', 'Log my workout', or 'Need a meal idea?'"
            }
          </p>
        </div>
        
        <div className="flex-1 px-6 pb-6">
          <div className="max-h-96 overflow-y-auto space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-3 rounded-xl max-w-xs ${
                  message.isUser
                    ? 'bg-blue-600 text-white ml-auto'
                    : 'bg-white/20 text-white backdrop-blur-sm'
                }`}
              >
                <p className="text-sm">{message.text}</p>
                <p className="text-xs opacity-70 mt-1">
                  {message.timestamp.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </p>
              </div>
            ))}
          </div>
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