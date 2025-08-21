import React, { useState, useRef, useEffect } from 'react';
import { AppBar } from './AppBar';
import { PatAvatar } from './PatAvatar';
import { NavigationSidebar } from './NavigationSidebar';
import { VoiceWaveform } from './VoiceWaveform';
import { Plus, Mic, Send, Folder, Camera, Image, Upload, Share, ArrowUp, Check, X } from 'lucide-react';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { MetricAlert } from '../types/metrics';
import { FoodEntry } from '../types/food';
import { FoodLogDrawer } from './FoodLogDrawer';
import { ConversationAgentManager } from '../utils/conversationAgents';
import { AgentSession } from '../types/agents';
import { ChatManager } from '../utils/chatManager';
import { ChatHistory, ChatMessage, ChatState } from '../types/chat';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { callChat, type ChatMessage as EdgeChatMessage } from '../lib/chat';
import { trackFirstChatMessage } from '../lib/analytics';

interface ChatPatProps {
  onNavigate: (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => void;
}

export const ChatPat: React.FC<ChatPatProps> = ({ onNavigate }) => {
  // Load initial chat state from localStorage
  const [chatState, setChatState] = useState<ChatState>({
    currentMessages: ChatManager.getInitialMessages(),
    chatHistories: [],
    activeChatId: null
  });
  const [messages, setMessages] = useState<ChatMessage[]>(chatState.currentMessages);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [activeAgentSession, setActiveAgentSession] = useState<AgentSession | null>(null);
  const [silentMode, setSilentMode] = useState(false);
  const [showFoodLogDrawer, setShowFoodLogDrawer] = useState(false);

  // Load chat state on mount
  useEffect(() => {
    const loadInitialChatState = async () => {
      try {
        const state = await ChatManager.loadChatState();
        setChatState(state);
        setMessages(state.currentMessages);
      } catch (error) {
        console.error('Error loading chat state:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadInitialChatState();
  }, []);

  // Speech recognition hook for dictation
  const speechRecognition = useSpeechRecognition({
    continuous: true,
    interimResults: true,
    onResult: (transcript, isFinal) => {
      setInputText(transcript);
      if (isFinal && transcript.trim()) {
        // Auto-submit after a brief pause
        setTimeout(() => {
          if (isDictating && transcript.trim()) {
            handleSendMessage();
            stopDictation();
          }
        }, 1500);
      }
    },
    onError: (error) => {
      console.error('Dictation error:', error);
      setIsDictating(false);
    }
  });

  // Use ref to track current dictation state for speech recognition callbacks
  const isDictatingRef = useRef(isDictating);

  // Keep ref in sync with state
  useEffect(() => {
    isDictatingRef.current = isDictating;
  }, [isDictating]);

  // Mock user metrics and alerts for mood calculation
  const userMetrics: UserMetrics = {
    workoutStreak: 3,
    sleepQuality: 75,
    proteinTarget: 90,
    lastWorkout: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000), // 12 hours ago
    missedWorkouts: 1,
    recentPRs: 0,
    consistencyScore: 72
  };

  const mockAlerts: MetricAlert[] = [
    {
      id: '1',
      type: 'consistency_nudge',
      message: 'Keep up the good work!',
      severity: 'info',
      timestamp: new Date(),
      dismissed: false
    }
  ];

  // Calculate Pat's mood based on conversation state and metrics
  const getPatMood = () => {
    return PatMoodCalculator.calculateMood(userMetrics, mockAlerts);
  };

  // Get intelligent conversation starters from agents
  const starterChips = ConversationAgentManager.getAgents()
    .slice(0, 5)
    .map(agent => agent.title);

  const plusMenuOptions = [
    { id: 'take', label: 'Take a picture', icon: Camera },
    { id: 'photo', label: 'Photo', icon: Image },
    { id: 'log-food', label: 'Log Food', icon: Folder },
    { id: 'file', label: 'File', icon: Folder },
  ];

  const handleSendMessage = () => {
    if (inputText.trim()) {
      setIsSending(true);
      setIsThinking(true);
      
      // Check if input triggers a specific agent
      const triggeredAgent = ConversationAgentManager.findAgentByTrigger(inputText);
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: inputText,
        timestamp: new Date(),
        isUser: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
      setIsTyping(false);
      
      // Save user message to database
      const saveUserMessage = async () => {
        try {
          const newChatId = await ChatManager.saveMessage(activeChatId, newMessage);
          if (newChatId && !activeChatId) {
            setActiveChatId(newChatId);
          }
        } catch (error) {
          console.error('Error saving user message:', error);
        }
      };
      saveUserMessage();

      // Handle agent-specific responses
      setTimeout(() => {
        setIsThinking(false);
        setIsSpeaking(true);
        
        // Get AI response
        const getAIResponse = async () => {
          try {
            // Prepare conversation history for OpenAI
            const conversationHistory: EdgeChatMessage[] = [...messages, newMessage].map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.text
            }));
            
            const payload = conversationHistory.slice(-10);
            console.log("[chat:req]", { messages: payload });
            const reply = await callChat(payload);
            console.log("[chat:res]", reply);

            if (!reply.ok) {
              console.error('callChat error:', reply.error);
              toast.error(reply.error || 'Chat failed');
              setIsSending(false);
              setIsThinking(false);
              setIsSpeaking(false);
              return;
            }
            
            const responseText = reply.content || "I'm here to help! How can I assist you today?";
            
            const patResponse: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: responseText,
              timestamp: new Date(),
              isUser: false
            };
            
            setMessages(prev => [...prev, patResponse]);
            
            // Save AI response to database
            try {
              const newChatId = await ChatManager.saveMessage(activeChatId, patResponse);
              if (newChatId && !activeChatId) {
                setActiveChatId(newChatId);
              }
            } catch (error) {
              console.error('Error saving AI response:', error);
            }

            // Track first chat message
            if (messages.length === 1) { // Only initial greeting before this
              try {
                const supabase = getSupabase();
                const user = await supabase.auth.getUser();
                if (user.data.user) {
                  trackFirstChatMessage(user.data.user.id);
                }
              } catch (error) {
                console.error('Error tracking first chat:', error);
              }
            }
            
            // Simulate speaking duration
            setTimeout(() => {
              setIsSpeaking(false);
              setIsSending(false);
            }, responseText.length * 50);
            
          } catch (error) {
            console.error('Error getting AI response:', error);
            
            toast.error('Chat failed');
            
            const errorResponse: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: 'I\'m a bit busy right now. Please try again in a moment.',
              timestamp: new Date(),
              isUser: false
            };
            
            setMessages(prev => [...prev, errorResponse]);
            setIsSpeaking(false);
            setIsSending(false);
            setIsThinking(false);
          }
        };

        getAIResponse();
      }, 1000);
    }
  };

  const handleChipClick = (chipText: string) => {
    setIsThinking(true);
    
    // Check if input triggers a specific agent
    const triggeredAgent = ConversationAgentManager.findAgentByTrigger(chipText);
    
    // Generate dynamic user message based on agent title
    let userMessage = chipText; // Default fallback
    
    if (triggeredAgent) {
      const title = triggeredAgent.title;
      
      if (title.startsWith("Tell me")) {
        // "Tell me what you ate" -> "How do I tell you what I ate?"
        const restOfTitle = title.substring(8).toLowerCase(); // Remove "Tell me "
        userMessage = `How do I tell you ${restOfTitle}?`;
      } else if (title.startsWith("Show me")) {
        // "Show me what you're eating" -> "How do I show you what I'm eating?"
        const restOfTitle = title.substring(8).toLowerCase(); // Remove "Show me "
        userMessage = `How do I show you ${restOfTitle}?`;
      } else if (title === "Need a meal idea?") {
        userMessage = "How do I get a meal idea?";
      } else if (title === "Find nearby restaurants") {
        userMessage = "How do I find nearby restaurants?";
      }
      // For any other cases, userMessage remains as chipText (default)
    }
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: userMessage,
      timestamp: new Date(),
      isUser: true
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    // Handle agent-specific responses
    setTimeout(() => {
      setIsThinking(false);
      setIsSpeaking(true);
      
      let responseText = "";
      
      if (triggeredAgent) {
        // Start agent session
        const session = ConversationAgentManager.startAgentSession(triggeredAgent.id);
        setActiveAgentSession(session);
        
        // Generate contextual response based on the user's question
        if (userMessage.includes("tell you")) {
          responseText = "You can tell me by typing here, pressing the mic button to speak, or clicking on my face at the bottom to start a voice conversation!";
        } else if (userMessage.includes("show you")) {
          responseText = "You can show me by using the camera! Click the camera button or I'll guide you to the camera view.";
        } else if (userMessage.includes("meal idea")) {
          responseText = "I can suggest meals based on your preferences and goals! Just tell me what you're in the mood for or any dietary restrictions.";
        } else if (userMessage.includes("find nearby restaurants")) {
          responseText = "I can help you find restaurants that match your nutritional goals! I'll need your location and any preferences you have.";
        } else {
          responseText = "I'm here to help! You can interact with me through voice, text, or camera depending on what you need.";
        }
        
        // Handle camera requirement
        if (triggeredAgent.requiresCamera) {
          setTimeout(() => {
            const cameraResponse: ChatMessage = {
              id: (Date.now() + 2).toString(),
              text: ConversationAgentManager.generateCameraResponse(triggeredAgent.id),
              timestamp: new Date(),
              isUser: false
            };
            setMessages(prev => [...prev, cameraResponse]);
            
            // Auto-open camera with appropriate mode
            const autoStartMode = triggeredAgent.id.includes('meal') || triggeredAgent.id.includes('eating') ? 'takePhoto' : 'videoStream';
            onNavigate('camera', { autoStartMode });
          }, 2000);
        }
      } else {
        // Default responses
        const responses = [
          "I understand. Let me help you with that.",
          "Great! I've logged that information for you.",
          "I can see your progress is improving. Keep it up!",
          "Let me check your schedule and get back to you."
        ];
        responseText = responses[Math.floor(Math.random() * responses.length)];
      }
      
      const patResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        timestamp: new Date(),
        isUser: false
      };
      
      setMessages(prev => [...prev, patResponse]);
      
      // Simulate speaking duration
      setTimeout(() => {
        setIsSpeaking(false);
      }, responseText.length * 50);
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputText(value);
    setIsTyping(value.trim().length > 0);
  };

  const startDictation = () => {
    setIsDictating(true);
    setInputText('');
    setIsTyping(false);
    
    if (speechRecognition.isSupported) {
      speechRecognition.start();
    } else {
      alert('Speech recognition not supported in this browser');
      setIsDictating(false);
    }
  };

  const stopDictation = () => {
    setIsDictating(false);
    speechRecognition.stop();
  };

  const submitDictation = () => {
    if (inputText.trim()) {
      handleSendMessage();
    }
    stopDictation();
  };

  const cancelDictation = () => {
    setInputText('');
    speechRecognition.reset();
    stopDictation();
  };

  const handleNewChat = () => {
    const saveAndStartNewChat = async () => {
      try {
        // Save current chat to history if it has meaningful content
        if (messages.length > 1) {
          const savedChat = await ChatManager.saveNewChat(messages);
          if (savedChat) {
            setChatState(prev => ({
              ...prev,
              chatHistories: [savedChat, ...prev.chatHistories]
            }));
          }
        }
        
        // Reset to new chat
        const initialMessages = ChatManager.getInitialMessages();
        setMessages(initialMessages);
        setActiveChatId(null);
        
      } catch (error) {
        console.error('Error starting new chat:', error);
        // Still reset UI even if save failed
        const initialMessages = ChatManager.getInitialMessages();
        setMessages(initialMessages);
        setActiveChatId(null);
      }
    };

    saveAndStartNewChat();
    
    // Reset other states
    setActiveAgentSession(null);
    setSilentMode(false);
    setInputText('');
    setIsTyping(false);
  };

  const handleLoadChat = (chatHistory: ChatHistory) => {
    const loadSelectedChat = async () => {
      try {
        setIsLoadingChat(true);
        
        // Save current chat first if it has content
        if (messages.length > 1) {
          const savedChat = await ChatManager.saveNewChat(messages);
          if (savedChat) {
            setChatState(prev => ({
              ...prev,
              chatHistories: [savedChat, ...prev.chatHistories.filter(h => h.id !== savedChat.id)]
            }));
          }
        }
        
        // Load messages for selected chat
        const chatMessages = await ChatManager.loadChatMessages(chatHistory.id);
        
        // Update state
        setMessages(chatMessages);
        setActiveChatId(chatHistory.id);
        
      } catch (error) {
        console.error('Error loading chat:', error);
        // Fallback to showing the chat history's cached messages if available
        if (chatHistory.messages && chatHistory.messages.length > 0) {
          setMessages(chatHistory.messages);
          setActiveChatId(chatHistory.id);
        }
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadSelectedChat();
    
    // Reset other states
    setActiveAgentSession(null);
    setSilentMode(false);
    setInputText('');
    setIsTyping(false);
  };

  const handleSaveFoodEntry = (entry: FoodEntry) => {
    const saveFoodEntry = async () => {
      try {
        const user = await getSupabase().auth.getUser();
        if (!user.data.user) {
          console.error('No authenticated user');
          return;
        }

        const { error } = await getSupabase()
          .from('food_logs')
          .insert({
            user_id: user.data.user.id,
            food_name: entry.foodName,
            grams: entry.grams,
            source_db: entry.sourceDb,
            macros: entry.macros
          });

        if (error) {
          console.error('Error saving food entry:', error);
          // TODO: Show error toast to user
          return;
        }

        // Track first food log
        const { data: existingLogs } = await getSupabase()
          .from('food_logs')
          .select('id')
          .eq('user_id', user.data.user.id)
          .limit(1);

        if (!existingLogs || existingLogs.length === 1) {
          trackFirstFoodLog(user.data.user.id, entry.foodName);
        }

        console.log('Food entry saved successfully:', entry);
      } catch (error) {
        console.error('Error in handleSaveFoodEntry:', error);
      }
    };

    saveFoodEntry();
    
    // Add a message to the chat showing the logged food
    const foodMessage: ChatMessage = {
      id: Date.now().toString(),
      text: `Logged: ${entry.foodName} (${entry.grams}g) - ${entry.macros.kcal} calories, ${entry.macros.protein}g protein`,
      timestamp: new Date(),
      isUser: false
    };
    
    setMessages(prev => [...prev, foodMessage]);
  };

  if (isLoadingChat) {
    return (
      <div className="h-screen bg-pat-gradient text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-pat-gradient text-white flex flex-col">
      <NavigationSidebar 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
        onNavigate={onNavigate}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        chatHistories={chatState.chatHistories}
        userProfile={null}
      />
      
      <AppBar 
        title="PAT" 
        onMenu={() => setShowNavigation(true)}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 1 && !isTyping && (
            <div className={`mb-6 transition-opacity duration-300 ${isTyping ? 'opacity-0' : 'opacity-100'}`}>
              <div className="flex flex-wrap gap-2 mb-4">
                {starterChips.map((chip, index) => (
                  <button
                    key={index}
                    onClick={() => handleChipClick(chip)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-sm transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className={`space-y-4 transition-opacity duration-300 ${isTyping || messages.length > 1 ? 'opacity-100' : 'opacity-0'}`}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-100'
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
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isSending && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl bg-gray-800 text-gray-100">
                  <p className="text-sm text-gray-400">Pat is thinking...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-800">
          {showPlusMenu && (
            <div className="mb-4 p-4 bg-gray-800 rounded-2xl">
              {/* Agent Session Indicator */}
              {activeAgentSession && (
                <div className="mb-4 p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-300 text-sm font-medium">
                        {ConversationAgentManager.getAgentById(activeAgentSession.agentId)?.icon} 
                        {ConversationAgentManager.getAgentById(activeAgentSession.agentId)?.title}
                      </span>
                      {silentMode && (
                        <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          Silent Mode
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {ConversationAgentManager.getAgentById(activeAgentSession.agentId)?.supportsSilentMode && (
                        <button
                          onClick={() => setSilentMode(!silentMode)}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                        >
                          {silentMode ? '🔇' : '🔊'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          ConversationAgentManager.endAgentSession(activeAgentSession.sessionId);
                          setActiveAgentSession(null);
                          setSilentMode(false);
                        }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-3">
                {plusMenuOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => {
                        setShowPlusMenu(false);
                        
                        // Handle food logging
                        if (option.id === 'log-food') {
                          setShowFoodLogDrawer(true);
                          return;
                        }
                        
                        // Handle camera actions for specific agents
                        if (option.id === 'take' && activeAgentSession) {
                          const agent = ConversationAgentManager.getAgentById(activeAgentSession.agentId);
                          if (agent?.requiresCamera) {
                            // Simulate camera activation
                            const cameraMessage: ChatMessage = {
                              id: Date.now().toString(),
                              text: ConversationAgentManager.generateCameraResponse(agent.id),
                              timestamp: new Date(),
                              isUser: false
                            };
                            setMessages(prev => [...prev, cameraMessage]);
                            
                            // Auto-open camera with appropriate mode
                            const autoStartMode = agent.id.includes('meal') || agent.id.includes('eating') ? 'takePhoto' : 'videoStream';
                            onNavigate('camera', { autoStartMode });
                          }
                        }
                      }}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                    >
                      <IconComponent size={20} className="mx-auto mb-1" />
                      <p className="text-xs">{option.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="p-3 bg-gray-800 rounded-2xl mb-4">
            <div className="relative">
              {isDictating ? (
                <div className="flex flex-col items-center justify-center py-2 text-white">
                  <VoiceWaveform isActive={true} barCount={7} className="mb-2" />
                  <p className="text-sm text-white/70">{inputText || "Listening..."}</p>
                </div>
              ) : (
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask me anything"
                  className="w-full bg-transparent text-white placeholder-white/50 outline-none text-base"
                />
              )}
            </div>
          </div>
          
          {isDictating && !inputText && (
            <div className="flex items-center justify-center gap-4 mb-4">
              <button
                onClick={cancelDictation}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPlusMenu(!showPlusMenu)}
                className={`p-3 hover:bg-gray-700 rounded-full transition-colors ${isDictating ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isDictating}
              >
                <Plus size={24} />
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={isDictating ? stopDictation : startDictation}
                className={`p-3 rounded-full transition-colors ${
                  isDictating 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <Mic size={24} />
              </button>
              
              <div className="relative">
                {isDictating ? (
                  <button
                    onClick={submitDictation}
                    disabled={isSending}
                    className="w-10 h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-all duration-300"
                  >
                    <Check size={20} className="text-white" />
                  </button>
                ) : isTyping ? (
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending}
                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-all duration-300 transform"
                  >
                    <ArrowUp size={20} className="text-white" />
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('voice')}
                    className="hover:opacity-80 transition-all duration-300 relative group"
                  >
                    <PatAvatar 
                      size={40} 
                      mood={getPatMood()} 
                      isListening={isDictating}
                      isThinking={isThinking}
                      isSpeaking={isSpeaking}
                    />
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Voice Chat
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Food Log Drawer */}
      <FoodLogDrawer 
        isOpen={showFoodLogDrawer}
        onClose={() => setShowFoodLogDrawer(false)}
        onSaveFood={handleSaveFoodEntry}
      />
    </div>
  );
};