import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Edit, User, MessageSquare, X, BarChart3, Users } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import { ChatManager } from '../utils/chatManager';
import { ChatHistory } from '../types/chat';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types/user';

interface NavigationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (page: string) => void;
  onNewChat?: () => void;
  onLoadChat?: (chatHistory: ChatHistory) => void;
  chatHistories?: ChatHistory[];
  userProfile?: UserProfile | null;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({ 
  isOpen, 
  onClose, 
  onNavigate,
  onNewChat,
  onLoadChat,
  chatHistories = [],
  userProfile
}) => {
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [loadedChatHistories, setLoadedChatHistories] = useState<ChatHistory[]>(chatHistories);
  const { role } = useRole();

  // Load chat histories when sidebar opens
  useEffect(() => {
    if (isOpen && loadedChatHistories.length === 0) {
      loadChatHistories();
    }
  }, [isOpen]);

  const loadChatHistories = async () => {
    setIsLoadingChats(true);
    try {
      const chatState = await ChatManager.loadChatState();
      setLoadedChatHistories(chatState.chatHistories);
    } catch (error) {
      console.error('Error loading chat histories:', error);
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleNewChat = () => {
    onNewChat?.();
    onClose();
  };

  const handleLoadChat = (chatHistory: ChatHistory) => {
    // Load messages for this chat
    const loadChatWithMessages = async () => {
      try {
        const messages = await ChatManager.loadChatMessages(chatHistory.id);
        const chatWithMessages = {
          ...chatHistory,
          messages
        };
        onLoadChat?.(chatWithMessages);
      } catch (error) {
        console.error('Error loading chat messages:', error);
        // Fallback to loading without messages
        onLoadChat?.(chatHistory);
      }
    };

    loadChatWithMessages();
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Top Actions */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <button 
                onClick={handleNewChat}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit size={16} />
                <span className="text-sm font-medium">New chat</span>
              </button>
            </div>
            
            {/* Dashboard Link */}
            <button 
              onClick={() => {
                onNavigate?.('dashboard');
                onClose();
              }}
              className="w-full mt-3 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <BarChart3 size={16} className="text-gray-600" />
              <span className="text-sm font-medium">Dashboard</span>
            </button>
            
            <button 
              onClick={() => {
                onNavigate?.('profile');
                onClose();
              }}
              className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <User size={16} className="text-gray-600" />
              <span className="text-sm font-medium">Profile</span>
            </button>
            
            {/* Trainer Dashboard Link - Role-based visibility */}
            {(userProfile?.role === 'admin' || userProfile?.role === 'trainer') && (
              <button 
                onClick={() => {
                  onNavigate?.('trainer-dashboard');
                  onClose();
                }}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Users size={16} className="text-gray-600" />
                <span className="text-sm font-medium">Client Management</span>
              </button>
            )}
            
            {/* Admin Link - Admin-only visibility */}
            {role === 'admin' && (
              <Link
                to="/admin"
                onClick={onClose}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-sm font-medium">Admin</span>
              </Link>
            )}
            
            {/* Agents Link - Admin-only visibility */}
            {role === 'admin' && (
              <Link
                to="/admin/agents"
                onClick={onClose}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 1v6m0 6v6"/>
                  <path d="M12 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                </svg>
                <span className="text-sm font-medium">Agents</span>
              </Link>
            )}
            
            <button 
              onClick={() => {
                onNavigate?.('interval-timer');
                onClose();
              }}
              className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <span className="text-sm font-medium">Interval Timer</span>
            </button>
            
            <button 
              onClick={() => {
                onNavigate?.('tdee-wizard');
                onClose();
              }}
              className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
              </svg>
              <span className="text-sm font-medium">TDEE Calculator</span>
            </button>
            
            {/* Debug Page Link - Admin only */}
            {role === 'admin' && (
              <button 
                onClick={() => {
                  onNavigate?.('debug');
                  onClose();
                }}
                className="w-full mt-2 flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                  <path d="M12 12v4"/>
                  <path d="M12 8h.01"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                <span className="text-sm font-medium">Debug</span>
              </button>
            )}
          </div>
          
          {/* Chat Histories */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wide">
                Recent Chats
              </h3>
              
              {isLoadingChats ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-gray-500 text-sm">Loading chats...</p>
                </div>
              ) : loadedChatHistories.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare size={32} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No chat history yet</p>
                  <p className="text-gray-400 text-xs">Start a conversation to see it here</p>
                </div>
              ) : (
                <div key="chat-histories-list" className="space-y-1">
                  {loadedChatHistories.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => handleLoadChat(chat)}
                      className="w-full text-left px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start gap-3">
                        <MessageSquare size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{chat.title}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {ChatManager.formatChatDate(chat.lastMessageAt)} • {chat.messages.length} messages
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Sign Out Button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        </div>  
      </div>
    </>
  );
};