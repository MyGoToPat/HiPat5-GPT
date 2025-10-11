import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PatAvatar } from './PatAvatar';
import { VoiceWaveform } from './VoiceWaveform';
import { TDEEPromptBubble } from './TDEEPromptBubble';
import ThinkingAvatar from './common/ThinkingAvatar';
import { Plus, Mic, Folder, Camera, Image, ArrowUp, Check, X } from 'lucide-react';
import { FoodVerificationScreen } from './FoodVerificationScreen';
import { MealSuccessTransition } from './MealSuccessTransition';
import { fetchFoodMacros, processMealWithTMWYA } from '../lib/food';
import type { AnalysisResult, NormalizedMealData } from '../types/food';
import { PatMoodCalculator, UserMetrics } from '../utils/patMoodCalculator';
import { MetricAlert } from '../types/metrics';
import { FoodEntry } from '../types/food';
import { FoodLogDrawer } from './FoodLogDrawer';
import { ConversationAgentManager } from '../utils/conversationAgents';
import { AgentSession } from '../types/agents';
import { ChatManager } from '../utils/chatManager';
import { ChatHistory, ChatMessage, ChatState } from '../types/chat';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { callChat } from '../lib/chat';
import { callChatStreaming } from '../lib/streamingChat';
import { classifyFoodMessage, type ClassificationResult } from '../lib/personality/foodClassifier';
import { saveMeal as saveMealAction } from '../lib/meals/saveMeal';
import type { SaveMealInput, SaveMealResult } from '../lib/meals/saveMeal';
import { inferMealSlot } from '../lib/meals/inferMealSlot';
import { trackFirstChatMessage } from '../lib/analytics';
import { updateDailyActivitySummary, checkAndAwardAchievements } from '../lib/supabase';
import {
  getThread,
  upsertThread,
  makeTitleFrom,
  newThreadId,
  type ChatThread
} from '../lib/history';
import toast from 'react-hot-toast';
import { getSupabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../hooks/useRole';
import { isPrivileged } from '../utils/rbac';
import { AnimatePresence } from 'framer-motion';

export const ChatPat: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get current user role for chat access gating
  const { role: currentUserRole, loading: roleLoading } = useRole();
  
  // Thread management
  const [threadId, setThreadId] = useState<string>(() => newThreadId());
  const [isSending, setIsSending] = useState(false);
  
  // Load initial chat state from localStorage
  const [chatState, setChatState] = useState<ChatState>({
    currentMessages: ChatManager.getInitialMessages(),
    chatHistories: [],
    activeChatId: null
  });
  const [messages, setMessages] = useState<ChatMessage[]>(chatState.currentMessages);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoggingActivity, setIsLoggingActivity] = useState(false);
  const [activeAgentSession, setActiveAgentSession] = useState<AgentSession | null>(null);
  const [silentMode, setSilentMode] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [showTDEEBubble, setShowTDEEBubble] = useState(false);

  // Swarm 2.1: Ephemeral cache for "log" follow-up with TTL
  const [lastQuestionItems, setLastQuestionItems] = useState<any[] | null>(null);
  const lastSetRef = useRef<number>(0);
  const TTL_MS = 10 * 60 * 1000; // 10 minutes

  // Helper to get cached items if still valid
  const getCachedItems = () =>
    lastQuestionItems && Date.now() - lastSetRef.current < TTL_MS
      ? lastQuestionItems
      : null;

  // Inline confirmation banner for food logging
  const [inlineConfirmation, setInlineConfirmation] = useState<{
    show: boolean;
    message?: string;
  }>({ show: false });

  // Food verification screen state
  const [showFoodVerificationScreen, setShowFoodVerificationScreen] = useState(false);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzingFood, setIsAnalyzingFood] = useState(false);

  // Extract food phrases from meal text
  const extractFoodPhrase = (text: string): string[] => {
    // Clean the input
    const cleaned = text.toLowerCase().trim();
    
    // Extract food phrase after common meal indicators
    let foodPhrase = cleaned;
    const mealIndicators = ['i ate', 'i had', 'ate', 'had', 'for breakfast', 'for lunch', 'for dinner'];
    
    for (const indicator of mealIndicators) {
      if (cleaned.includes(indicator)) {
        const parts = cleaned.split(indicator);
        if (parts.length > 1) {
          foodPhrase = parts[1].trim();
          break;
        }
      }
    }
    
    // Split on common separators for multiple items
    const separators = [' with ', ' and ', ', ', ' & '];
    let items = [foodPhrase];
    
    for (const sep of separators) {
      const newItems: string[] = [];
      for (const item of items) {
        if (item.includes(sep)) {
          newItems.push(...item.split(sep).map(s => s.trim()));
        } else {
          newItems.push(item);
        }
      }
      items = newItems;
    }
    
    // Filter out empty items and common non-food words
    return items
      .filter(item => item.length > 0)
      .filter(item => !['a', 'an', 'the', 'some'].includes(item.trim()));
  };

  // Load chat state on mount
  useEffect(() => {
    // Handle URL params for thread loading
    const newParam = searchParams.get('new');
    const threadParam = searchParams.get('t');

    if (newParam === '1') {
      // Start new chat
      const newId = newThreadId();
      setThreadId(newId);
      setMessages(ChatManager.getInitialMessages());
      setActiveChatId(null);
      setIsLoadingChat(false);
      return;
    }

    if (threadParam) {
      // Load existing thread
      const thread = getThread(threadParam);
      if (thread) {
        setThreadId(thread.id);
        // Convert ChatThread messages to ChatMessage format
        const convertedMessages: ChatMessage[] = thread.messages.map((msg, index) => ({
          id: `${thread.id}-${index}`,
          text: msg.content,
          timestamp: new Date(thread.updatedAt),
          isUser: msg.role === 'user'
        }));
        setMessages(convertedMessages);
        setActiveChatId(thread.id);
        setIsLoadingChat(false);
        return;
      }
    }

    // Default: load chat state with session management
    const loadInitialChatState = async () => {
      try {
        const supabase = getSupabase();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Store userId in state for chat message persistence
          setUserId(user.id);

          // Check TDEE completion status
          const { getUserContextFlags } = await import('../lib/personality/contextChecker');
          const contextFlags = await getUserContextFlags(user.id);
          setShowTDEEBubble(!contextFlags.hasTDEE);

          // Load or create active session
          const session = await ChatManager.ensureActiveSession(user.id);
          setActiveChatId(session.id);
          setThreadId(session.id);

          // Load session messages
          const chatStateData = await ChatManager.loadChatState(user.id);
          setChatState(chatStateData);
          setMessages(chatStateData.currentMessages);
        } else {
          // Not logged in, use default
          setMessages(ChatManager.getInitialMessages());
        }
      } catch (error) {
        console.error('Error loading chat state:', error);
      } finally {
        setIsLoadingChat(false);
      }
    };

    loadInitialChatState();
  }, [searchParams]);

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

  // Helper function to infer meal slot based on current time
  const inferMealSlot = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'unknown' => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 16) return 'lunch';
    if (hour >= 16 && hour < 22) return 'dinner';
    return 'snack';
  };


  // Helper function to detect FOOD LOGGING (not questions about food)
  const isMealText = (input: string): boolean => {
    const lowerInput = input.toLowerCase();

    // CRITICAL: Only trigger food logging for STATEMENTS about eating, NOT QUESTIONS
    const foodLoggingTriggers = [
      'i ate', 'i had', 'just ate', 'just had',
      'ate a', 'ate an', 'had a', 'had an',
      'log meal', 'log food', 'track meal', 'track food'
    ];

    // Exclude questions - these should go to Pat as normal chat
    const questionPhrases = [
      'tell me', 'what are', 'how many', 'macros for', 'calories in',
      'what is', 'can you tell', 'give me', 'show me'
    ];

    const hasLoggingTrigger = foodLoggingTriggers.some(trigger => lowerInput.includes(trigger));
    const hasQuestionPhrase = questionPhrases.some(phrase => lowerInput.includes(phrase));

    // Only log food if it's a logging statement AND NOT a question
    const shouldLogFood = hasLoggingTrigger && !hasQuestionPhrase;

    console.log('[ChatPat] isMealText check:', {
      input: lowerInput.substring(0, 50),
      hasLoggingTrigger,
      hasQuestionPhrase,
      shouldLogFood
    });

    return shouldLogFood;
  };

  // Success transition state
  const [showSuccessTransition, setShowSuccessTransition] = useState(false);
  const [successMealData, setSuccessMealData] = useState<{ kcal: number; items: number } | null>(null);

  // Food verification screen handlers
  const handleConfirmVerification = async (normalizedMeal: NormalizedMealData) => {
    try {
      setIsLoggingActivity(true);
      const result = await saveMealAction(normalizedMeal);

      if (result.ok) {
        const totals = normalizedMeal.mealLog.totals;

        // Close verification screen
        setShowFoodVerificationScreen(false);
        setCurrentAnalysisResult(null);

        // Show success transition
        setSuccessMealData({
          kcal: Math.round(totals.kcal),
          items: normalizedMeal.mealItems.length
        });
        setShowSuccessTransition(true);

        // Haptic feedback on mobile
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        // Auto-redirect to dashboard after 2 seconds
        setTimeout(() => {
          setShowSuccessTransition(false);
          setSuccessMealData(null);
          navigate('/dashboard', {
            state: {
              mealJustLogged: true,
              mealCalories: totals.kcal,
              mealItems: normalizedMeal.mealItems.length
            }
          });
        }, 2000);

      } else {
        toast.error(result.error || 'Failed to save meal');
        setIsLoggingActivity(false);
      }
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Failed to save meal');
      setIsLoggingActivity(false);
    }
  };

  const handleCancelVerification = () => {
    setShowFoodVerificationScreen(false);
    setCurrentAnalysisResult(null);
  };

  const handleEditManually = () => {
    setShowFoodVerificationScreen(false);
    setCurrentAnalysisResult(null);
    // Could add manual food entry logic here
  };

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

  // Get intelligent conversation starters - only show working features
  const workingAgentIds = ['meal-tracker', 'visual-meal-tracker'];
  const starterChips = ConversationAgentManager.getAgents()
    .filter(agent => workingAgentIds.includes(agent.id))
    .map(agent => agent.title);

  const plusMenuOptions = [
    { id: 'take', label: 'Take a picture', icon: Camera },
    { id: 'photo', label: 'Photo', icon: Image },
    { id: 'log-food', label: 'Log Food', icon: Folder },
    { id: 'file', label: 'File', icon: Folder },
  ];

  const handleSendMessage = () => {
    if (inputText.trim()) {
      // Check for "log" command to log previous macro discussion
      const lowerInput = inputText.toLowerCase().trim();

      // Detect "log" commands including subset logging like "log the prime rib and eggs"
      const logPattern = /^log(?:\s+(?:the\s+)?(.+))?$/i;
      const logMatch = lowerInput.match(logPattern);

      if (logMatch) {
        // Find the last UNCONSUMED Pat response with macro data
        const lastPatMessage = [...messages].reverse().find(m =>
          !m.isUser &&
          m.meta?.macros?.items &&
          !m.meta?.consumed // Only use unconsumed payloads
        );

        if (lastPatMessage) {
          const macroPayload = lastPatMessage.meta.macros;

          // Mark payload as consumed to prevent double-logging
          lastPatMessage.meta.consumed = true;

          // Check if subset logging (e.g., "log the prime rib and eggs")
          const subset = logMatch[1];

          if (subset) {
            // Parse subset request - handle "X and Y", "X, Y", etc.
            const requestedItems = subset
              .toLowerCase()
              .split(/\s+(?:and|,)\s+|\s*,\s*/)
              .map(s => s.replace(/^the\s+/, '').trim())
              .filter(Boolean);

            // Match requested items to canonical names (fuzzy match)
            const matchedItems = macroPayload.items.filter((item: any) => {
              const itemNameLower = item.name.toLowerCase();
              return requestedItems.some(requested =>
                itemNameLower.includes(requested) || requested.includes(itemNameLower)
              );
            });

            if (matchedItems.length > 0) {
              const foodText = matchedItems.map((item: any) => item.name).join(', ');
              handleMealTextInput(`I ate ${foodText}`);
              return;
            } else {
              toast.error(`Could not find "${subset}" in the recent macro discussion.`);
              return;
            }
          } else {
            // Log all items
            const foodItems = macroPayload.items.map((item: any) => item.name);
            const foodText = foodItems.join(', ');
            handleMealTextInput(`I ate ${foodText}`);
            return;
          }
        }
        // If no macro data found, let Pat know
        toast.error('No recent macro discussion to log. Ask me about food first!');
        return;
      }

      // Check for meal-related text before processing chat
      if (isMealText(inputText)) {
        handleMealTextInput(inputText);
        return;
      }

      setIsSending(true);
      setIsThinking(true);
      setStatusText('Thinking...');
      
      // Check if input triggers a specific agent
      
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        text: inputText,
        timestamp: new Date(),
        isUser: true
      };

      // Add thinking indicator immediately below user message
      const thinkingMessage: ChatMessage = {
        id: `thinking-${Date.now()}`,
        text: '✨ Thinking...',
        timestamp: new Date(),
        isUser: false
      };

      setMessages(prev => [...prev, newMessage, thinkingMessage]);
      setInputText('');
      setIsTyping(false);
      
      // Save user message to database
      const saveUserMessage = async () => {
        try {
          if (!userId) {
            console.error('CRITICAL: userId is undefined, cannot save chat message');
            toast.error('Chat history not saving - please refresh');
            return;
          }

          await ChatManager.saveMessage(
            userId,
            threadId,
            newMessage.text,
            'user'
          );
        } catch (error) {
          console.error('Failed to save user message:', error);
        }
      };
      saveUserMessage();

      // Handle agent-specific responses
      setTimeout(() => {
        setIsThinking(false);
        setIsSpeaking(true);
        setStatusText('Responding...');
        
        // Get AI response
        const getAIResponse = async () => {
          try {
            // Prepare conversation history for chat API
            const conversationHistory = [...messages, newMessage].map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.text
            }));
            
            // Check user context for Pat's awareness (TDEE, first-time user, etc.)
            let contextMessage = '';
            try {
              const user = await getSupabase().auth.getUser();
              if (user.data.user) {
                const { getUserContextFlags, buildContextMessage, updateUserChatContext } = await import('../lib/personality/contextChecker');
                const contextFlags = await getUserContextFlags(user.data.user.id);
                contextMessage = buildContextMessage(contextFlags);

                // Update chat count in background (non-blocking)
                updateUserChatContext(user.data.user.id).catch(err =>
                  console.warn('Failed to update chat context:', err)
                );
              }
            } catch (ctxError) {
              console.warn('Context check failed, continuing without context:', ctxError);
            }

            // Use new personality pipeline if available
            try {
              const { runPersonalityPipeline } = await import('../lib/personality/orchestrator');
              const user = await getSupabase().auth.getUser();

              if (user.data.user) {
                // Get user profile for permission checks
                const { getUserProfile } = await import('../lib/supabase');
                const userProfile = await getUserProfile(user.data.user.id);

                if (userProfile) {
                  // FOOD CLASSIFICATION & LOGGING (before orchestrator)
                  // Simplified 3-class system: food_mention, food_question, general
                  try {
                    const classification = await classifyFoodMessage(newMessage.text, {
                      userId: user.data.user.id
                    });

                    // If food_mention detected, log meal immediately
                    if (classification.type === 'food_mention' && classification.items && classification.items.length > 0) {
                      console.log('[ChatPat] Food mention detected, logging meal...');

                      const saveResult = await saveMealAction({
                        userId: user.data.user.id,
                        messageId: newMessage.id,  // Link to chat message
                        items: classification.items,
                        mealSlot: inferMealSlot(),
                        timestamp: new Date().toISOString(),
                        clientConfidence: classification.confidence
                      });

                      if (saveResult.ok && saveResult.totals) {
                        // Show inline confirmation banner
                        const confirmationMsg = `Logged ${saveResult.itemsCount} item(s) · ${Math.round(saveResult.totals.kcal)} kcal · ${Math.round(saveResult.totals.protein_g)}P/${Math.round(saveResult.totals.fat_g)}F/${Math.round(saveResult.totals.carbs_g)}C/${Math.round(saveResult.totals.fiber_g)}Fib · KPIs updated`;

                        setInlineConfirmation({
                          show: true,
                          message: confirmationMsg
                        });

                        // Auto-hide after 3 seconds
                        setTimeout(() => {
                          setInlineConfirmation({ show: false });
                        }, 3000);

                        console.log('[ChatPat] Meal logged successfully:', {
                          mealLogId: saveResult.mealLogId,
                          items: saveResult.itemsCount,
                          totals: saveResult.totals
                        });
                      } else {
                        console.error('[ChatPat] Failed to save meal:', saveResult.error);
                      }
                    } else if (classification.type === 'food_question') {
                      console.log('[ChatPat] Food question detected, answering only (no logging)');
                    } else {
                      console.log('[ChatPat] General message, proceeding normally');
                    }
                  } catch (classifyError) {
                    console.warn('[ChatPat] Food classification failed, continuing with normal chat:', classifyError);
                  }

                  // Inject context message into the pipeline
                  const userMessageWithContext = contextMessage
                    ? `${contextMessage}\n\nUser message: ${newMessage.text}`
                    : newMessage.text;

                  // Extract first name from display_name or name
                  const firstName = userProfile.display_name ||
                    (userProfile.name ? userProfile.name.split(' ')[0] : 'there');

                  // Calculate TDEE age in days
                  const tdeeAge = userProfile.last_tdee_update
                    ? Math.floor((Date.now() - new Date(userProfile.last_tdee_update).getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  const pipelineResult = await runPersonalityPipeline({
                    userMessage: userMessageWithContext,
                    context: {
                      userId: user.data.user.id,
                      userProfile: {
                        ...userProfile,
                        trial_ends: (userProfile as any).trial_ends || null,
                        role: userProfile.role || 'free_user'
                      },
                      // User-specific context for natural conversation
                      firstName: firstName,
                      fullName: userProfile.name || 'User',
                      chatCount: userProfile.chat_count || 0,
                      isFirstTimeChat: !userProfile.chat_count || userProfile.chat_count === 0,
                      hasTDEE: userProfile.has_completed_tdee || false,
                      tdeeAge: tdeeAge,
                      lastTDEEUpdate: userProfile.last_tdee_update || null,
                      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                      today: new Date().toISOString().slice(0, 10),
                      audience: 'beginner',
                      free: {
                        // Add basic metrics if available
                        frequency: "building",
                        rest: "tracking",
                        energy: "logging",
                        effort: "measuring"
                      },
                      // Swarm 2.1: Pass lastQuestionItems for "log that" intent
                      lastQuestionItems: lastQuestionItems
                    }
                  });

                  if (pipelineResult.ok) {
                    let responseText = pipelineResult.answer;

                    // Swarm 2.1: Sync lastQuestionItems from orchestrator with TTL
                    if (pipelineResult.lastQuestionItems !== undefined) {
                      setLastQuestionItems(pipelineResult.lastQuestionItems);
                      lastSetRef.current = Date.now(); // Update timestamp
                    }

                    // Pat's response already includes "Log" for macro responses
                    // Do NOT add extra instructions

                    const patResponse: ChatMessage = {
                      id: (Date.now() + 1).toString(),
                      text: responseText,
                      timestamp: new Date(),
                      isUser: false
                    };

                    // Remove thinking message and add actual response
                    setMessages(prev => prev.filter(m => !m.id.startsWith('thinking-')).concat(patResponse));
                    
                    // Continue with existing save logic...
                    const finalMessages = [...messages, newMessage, patResponse];
                    const messagesForSave = finalMessages.map(msg => ({
                      role: msg.isUser ? 'user' : 'assistant',
                      content: msg.text
                    }));
                    
                    const threadToSave: ChatThread = {
                      id: threadId,
                      title: makeTitleFrom(messagesForSave),
                      updatedAt: Date.now(),
                      messages: messagesForSave
                    };
                    upsertThread(threadToSave);
                    
                    try {
                      if (!userId) {
                        console.error('CRITICAL: userId is undefined, cannot save AI response');
                        return;
                      }
                      await ChatManager.saveMessage(
                        userId,
                        threadId,
                        patResponse.text,
                        'pat',
                        pipelineResult.meta
                      );
                    } catch (error) {
                      console.error('Error saving AI response:', error);
                    }
                    
                    // Track first chat message if applicable
                    if (messages.length === 1) {
                      try {
                        detectAndLogWorkout(inputText);
                        if (user.data.user) {
                          trackFirstChatMessage(user.data.user.id);
                        }
                      } catch (error) {
                        console.error('Error tracking first chat:', error);
                      }
                    }
                    
                    setTimeout(() => {
                      setIsSpeaking(false);
                      setIsSending(false);
                      setStatusText('');
                    }, responseText.length * 50);
                    
                    return;
                  }
                }
              }
            } catch (importError) {
              console.warn('New personality pipeline not available, falling back to direct chat:', importError);
            }
            
            // Fallback to existing chat logic with streaming
            // Inject context into the last user message if we have it
            let payload = conversationHistory.slice(-10);
            if (contextMessage && payload.length > 0) {
              const lastIdx = payload.length - 1;
              if (payload[lastIdx].role === 'user') {
                payload[lastIdx] = {
                  ...payload[lastIdx],
                  content: `${contextMessage}\n\nUser message: ${payload[lastIdx].content}`
                };
              }
            }
            console.log("[chat:req]", { messages: payload });

            // Create an empty message for streaming
            const streamingMessageId = (Date.now() + 1).toString();
            let streamingText = '';

            const patResponse: ChatMessage = {
              id: streamingMessageId,
              text: '',
              timestamp: new Date(),
              isUser: false
            };

            // Remove thinking message and add empty streaming message
            setMessages(prev => prev.filter(m => !m.id.startsWith('thinking-')).concat(patResponse));

            // Use streaming for real-time typing effect
            await callChatStreaming({
              messages: payload,
              onToken: (token: string) => {
                streamingText += token;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === streamingMessageId
                      ? { ...msg, text: streamingText }
                      : msg
                  )
                );
              },
              onComplete: (fullText: string) => {
                console.log("[chat:res] Streaming complete");
                streamingText = fullText;

                // Pat's response already includes "Log" for macro responses
                // Do NOT add extra instructions

                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === streamingMessageId
                      ? { ...msg, text: fullText }
                      : msg
                  )
                );
                setIsSending(false);
                setIsThinking(false);
                setIsSpeaking(false);
                setStatusText('');
              },
              onError: (error: string) => {
                console.error('Streaming error:', error);
                toast.error(error.includes('429') ? "Pat is busy right now. Please try again later." : error);

                // Remove the empty message on error
                setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));
                setIsSending(false);
                setIsThinking(false);
                setIsSpeaking(false);
                setStatusText('');
                return;
              }
            });

            // Update the reference for saving
            const finalStreamingResponse = {
              ...patResponse,
              text: streamingText || "I'm here to help! How can I assist you today?"
            };

            // Save thread after successful assistant reply
            const finalMessages = [...messages, newMessage, finalStreamingResponse];
            const messagesForSave = finalMessages.map(msg => ({
              role: msg.isUser ? 'user' : 'assistant',
              content: msg.text
            }));
            
            // Save to local history
            const threadToSave: ChatThread = {
              id: threadId,
              title: makeTitleFrom(messagesForSave),
              updatedAt: Date.now(),
              messages: messagesForSave
            };
            upsertThread(threadToSave);
            
            // Save AI response to database
            try {
              if (!userId) {
                console.error('CRITICAL: userId is undefined, cannot save AI response');
                return;
              }

              await ChatManager.saveMessage(
                userId,
                threadId,
                finalStreamingResponse.text,
                'pat'
              );
            } catch (error) {
              console.error('Failed to save AI response:', error);
            }

            // Track first chat message
            if (messages.length === 1) { // Only initial greeting before this
              try {
                // Check if message indicates workout or activity logging
                detectAndLogWorkout(inputText);

                const supabase = getSupabase();
                const user = await supabase.auth.getUser();
                if (user.data.user) {
                  trackFirstChatMessage(user.data.user.id);
                }
              } catch (error) {
                console.error('Error tracking first chat:', error);
              }
            }
            
            // Note: Speaking and sending state already handled in streaming callbacks
            
          } catch (error) {
            console.error('Error getting AI response:', error);
            
            // Handle specific error types with appropriate messaging
            const errorMessage = String(error?.message || error);
            if (errorMessage.includes('openai-chat 429')) {
              toast.error("Pat is busy right now. Please try again later.");
            } else {
              toast.error('Chat failed');
            }
            
            const errorResponse: ChatMessage = {
              id: (Date.now() + 1).toString(),
              text: 'I\'m experiencing some technical difficulties. Please try your message again.',
              timestamp: new Date(),
              isUser: false
            };
            
            setMessages(prev => [...prev, errorResponse]);
            
            // Ensure all loading states are cleared
            setTimeout(() => {
              setIsSpeaking(false);
              setIsSending(false);
              setIsThinking(false);
            }, 100);
          }
        };

        getAIResponse();
      }, 1000);
    }
  };

  // Handle meal-related text input
  const handleMealTextInput = async (input: string) => {
    try {
      setIsAnalyzingFood(true);
      setStatusText('Analyzing your meal...');

      // Get authenticated user
      const user = await getSupabase().auth.getUser();
      if (!user.data.user) {
        toast.error('Please log in to track meals');
        setIsAnalyzingFood(false);
        setStatusText('');
        return;
      }
      const userId = user.data.user.id;

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: input,
        timestamp: new Date(),
        isUser: true
      };
      setMessages(prev => [...prev, userMessage]);
      setInputText('');

      // Process meal using TMWYA agents through personality orchestrator
      setStatusText('Searching for nutrition data...');
      console.log('[ChatPat] Processing meal with TMWYA:', { input, userId });
      const result = await processMealWithTMWYA(input, userId, 'text');
      console.log('[ChatPat] TMWYA result:', result);

      // Check if Pat needs clarification
      if (result.ok && result.needsClarification && result.clarificationPrompt) {
        setStatusText('');
        console.log('[ChatPat] Needs clarification:', result.clarificationPrompt);

        // Add Pat's clarification question as a message
        const clarificationMessage: ChatMessage = {
          id: Date.now().toString(),
          text: result.clarificationPrompt,
          timestamp: new Date(),
          isUser: false
        };

        setMessages(prev => [...prev, clarificationMessage]);
        setIsSpeaking(false);
        setIsSending(false);
        return; // Wait for user's clarification response
      }

      if (result.ok && result.analysisResult && result.analysisResult.items.length > 0) {
        // Show verification screen with results
        setStatusText('');
        console.log('[ChatPat] Showing verification screen');
        setCurrentAnalysisResult(result.analysisResult);
        setShowFoodVerificationScreen(true);
      } else {
        // Fallback to normal chat if processing fails
        const errorMsg = result.error || 'Could not process meal input';
        console.error('[ChatPat] TMWYA failed:', errorMsg, result);
        toast.error(errorMsg);

        // Continue with normal chat processing
        setIsSending(true);
        setIsThinking(true);

        setTimeout(() => {
          setIsThinking(false);
          setIsSpeaking(true);

          const fallbackResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: "I couldn't process that meal input. You can try describing it differently or use the camera to take a photo.",
            timestamp: new Date(),
            isUser: false
          };

          setMessages(prev => [...prev, fallbackResponse]);

          setTimeout(() => {
            setIsSpeaking(false);
            setIsSending(false);
          }, 2000);
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing meal text:', error);
      toast.error('Error processing food information');
      setStatusText('');
    } finally {
      setIsAnalyzingFood(false);
      setStatusText('');
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
      
      if (title === "Tell me what you ate") {
        // Trigger TMWYA food logging flow by asking user for food input
        userMessage = "What did you eat?";
      } else if (title.startsWith("Show me")) {
        // "Show me what you're eating" -> Open camera
        const restOfTitle = title.substring(8).toLowerCase(); // Remove "Show me "
        userMessage = `How do I show you ${restOfTitle}?`;
      } else if (title === "Need a meal idea?") {
        userMessage = "Can you suggest a meal idea?";
      } else if (title === "Find nearby restaurants") {
        userMessage = "Can you find nearby restaurants?";
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
             navigate('/camera', { state: { autoStartMode } });
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
        // Reset thread ID for new chat
        const newId = newThreadId();
        setThreadId(newId);
        
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
        const newId = newThreadId();
        setThreadId(newId);
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
        // Update thread ID
        setThreadId(chatHistory.id);
        
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
        setIsLoggingActivity(true);
        const user = await getSupabase().auth.getUser();
        if (!user.data.user) {
          console.error('No authenticated user');
          return;
        }

        // Step 1: Insert food log
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
          toast.error('Failed to save food entry');
          return;
        }

        // Step 2: Update daily activity summary
        await getSupabase().rpc('update_daily_activity_summary', {
          p_user_id: user.data.user.id,
          p_activity_date: new Date().toISOString().slice(0, 10)
        });

        // Step 3: Check and award achievements
        const { data: newAchievements } = await getSupabase().rpc('check_and_award_achievements', {
          user_id: user.data.user.id
        });

        if (newAchievements && newAchievements > 0) {
          toast.success(`🏆 ${newAchievements} new achievement${newAchievements > 1 ? 's' : ''} earned!`);
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
        toast.error('Failed to process food entry');
      } finally {
        setIsLoggingActivity(false);
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

  // Function to handle workout logging
  const handleLogWorkout = async (workoutData: {
    type: string;
    duration: number;
    volume?: number;
    rpe?: number;
    notes?: string;
  }) => {
    try {
      setIsLoggingActivity(true);
      const user = await getSupabase().auth.getUser();
      if (!user.data.user) {
        console.error('No authenticated user');
        return;
      }

      const supabase = getSupabase();
      const userId = user.data.user.id;
      const activityDate = new Date().toISOString().slice(0, 10);

      // Step 1: Insert workout log
      const { error: insertError } = await supabase
        .from('workout_logs')
        .insert({
          user_id: userId,
          workout_date: activityDate,
          duration_minutes: workoutData.duration,
          workout_type: workoutData.type,
          volume_lbs: workoutData.volume,
          avg_rpe: workoutData.rpe,
          notes: workoutData.notes
        });

      if (insertError) {
        console.error('Error saving workout:', insertError);
        toast.error('Failed to save workout');
        return;
      }

      // Step 2: Update daily activity summary
      await updateDailyActivitySummary(userId, activityDate);

      // Step 3: Check and award achievements
      const newAchievements = await checkAndAwardAchievements(userId);

      if (newAchievements > 0) {
        toast.success(`🏆 ${newAchievements} new achievement${newAchievements > 1 ? 's' : ''} earned!`);
      }

      // Step 4: Refresh header metrics would happen here if ProfilePage was mounted
      // For now, just log the successful workflow
      console.log('Workout logged successfully - metrics will refresh on next page load');

      // Add success message to chat
      const workoutMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Workout logged: ${workoutData.type} for ${workoutData.duration} minutes${workoutData.volume ? `, ${workoutData.volume} lbs volume` : ''}${workoutData.rpe ? `, RPE ${workoutData.rpe}` : ''}`,
        timestamp: new Date(),
        isUser: false
      };
      
      setMessages(prev => [...prev, workoutMessage]);

    } catch (error) {
      console.error('Error logging workout:', error);
      toast.error('Failed to process workout entry');
    } finally {
      setIsLoggingActivity(false);
    }
  };

  // Example usage in handleSendMessage for workout detection
  const detectAndLogWorkout = (message: string) => {
    const workoutKeywords = ['workout', 'exercise', 'gym', 'training', 'lifted', 'ran', 'cardio'];
    const hasWorkoutKeyword = workoutKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    if (hasWorkoutKeyword) {
      // Simple pattern matching for demonstration
      // In production, you'd use more sophisticated NLP
      const durationMatch = message.match(/(\d+)\s*(minutes?|mins?|hours?)/i);
      const duration = durationMatch ? parseInt(durationMatch[1]) * (durationMatch[2].toLowerCase().includes('hour') ? 60 : 1) : 30;
      
      const typeMatch = message.match(/(cardio|strength|resistance|running|lifting|weights)/i);
      const type = typeMatch ? typeMatch[1].toLowerCase() : 'resistance';

      handleLogWorkout({
        type,
        duration,
        notes: message
      });
    }
  };
  // Show loading state while determining user role
  if (roleLoading) {
    return (
      <div className="h-screen bg-pat-gradient text-white flex items-center justify-center pt-[44px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading chat permissions...</p>
        </div>
      </div>
    );
  }

  // Gate chat access for non-privileged users
  if (!isPrivileged(currentUserRole)) {
    return (
      <div className="h-screen bg-pat-gradient text-white flex items-center justify-center pt-[44px]">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">!</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-white mb-4">Chat Access Restricted</h2>
          <p className="text-white/80 leading-relaxed">
            Chat limited to Admins and Beta users during testing.
          </p>
          <div className="mt-6 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
            <p className="text-white/70 text-sm">
              Contact your administrator for access or wait for general availability.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show Success Transition (after meal logged)
  if (showSuccessTransition && successMealData) {
    return (
      <MealSuccessTransition
        kcal={successMealData.kcal}
        items={successMealData.items}
        onSkip={() => {
          setShowSuccessTransition(false);
          setSuccessMealData(null);
          navigate('/dashboard', {
            state: {
              mealJustLogged: true,
              mealCalories: successMealData.kcal,
              mealItems: successMealData.items
            }
          });
        }}
      />
    );
  }

  // Show Food Verification Screen if active
  if (showFoodVerificationScreen && currentAnalysisResult) {
    return (
      <FoodVerificationScreen
        analysisResult={currentAnalysisResult}
        onConfirm={handleConfirmVerification}
        onCancel={handleCancelVerification}
        onEditManually={handleEditManually}
        isLoading={isAnalyzingFood}
      />
    );
  }

  if (isLoadingChat) {
    return (
      <div className="h-screen bg-pat-gradient text-white flex items-center justify-center pt-[44px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-pat-gradient text-white flex flex-col pt-[44px]">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* TDEE Prompt Bubble - Always visible at top until completed */}
          <AnimatePresence>
            {showTDEEBubble && (
              <div className="mb-6">
                <TDEEPromptBubble
                  onClick={() => {
                    navigate('/tdee');
                  }}
                />
              </div>
            )}
          </AnimatePresence>

          {/* Always show conversation bubble prompts for available features */}
          {!isTyping && starterChips.length > 0 && (
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
          
          <div className={`space-y-6 transition-opacity duration-300 ${isTyping || messages.length > 1 ? 'opacity-100' : 'opacity-0'}`}>
            {messages.map((message, index) => (
              <div key={message.id}>
                <div
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-sm lg:max-w-2xl px-5 py-4 rounded-2xl ${
                      message.isUser
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-100'
                    }`}
                    style={{ maxWidth: message.isUser ? '480px' : '700px' }}
                  >
                    <p className="message-bubble text-base leading-relaxed whitespace-pre-line" style={{ lineHeight: '1.6' }}>{message.text}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Inline Confirmation Banner (shows after last user message if food was logged) */}
                {message.isUser && index === messages.length - 1 && inlineConfirmation.show && (
                  <div className="flex justify-end mt-2">
                    <div
                      className="max-w-sm lg:max-w-2xl px-4 py-2 rounded-xl bg-green-600/90 text-white text-sm animate-fade-in"
                      style={{ maxWidth: '480px' }}
                    >
                      <p className="leading-relaxed">{inlineConfirmation.message}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {/* Status Indicator */}
            {(isSending || isAnalyzingFood || statusText || isThinking) && (
              <div className="flex justify-start">
                <div className="max-w-sm lg:max-w-2xl px-5 py-4 rounded-2xl bg-gray-800 text-gray-100" style={{ maxWidth: '700px' }}>
                  <ThinkingAvatar className="" label={statusText || 'Pat is thinking...'} />
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
                          // TODO: Implement food logging flow
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
                             navigate('/camera', { state: { autoStartMode } });
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
                     onClick={() => navigate('/voice')}
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
    </div>
  );
};