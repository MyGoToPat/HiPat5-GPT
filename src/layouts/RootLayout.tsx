import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MainHeader } from '../components/layout/MainHeader';
import { NavigationSidebar } from '../components/NavigationSidebar';
import { MetricAlert } from '../types/metrics';
import { ChatHistory } from '../types/chat';
import { ChatManager } from '../utils/chatManager';
import { getSupabase } from '../lib/supabase';

// Page title mapping based on routes
const getPageTitle = (pathname: string): string => {
  if (pathname.startsWith('/admin/agents/')) return 'Agent Details';
  if (pathname.startsWith('/admin/agents')) return 'Agents';
  if (pathname.startsWith('/admin/users')) return 'User Management';
  if (pathname.startsWith('/admin')) return 'Admin';
  if (pathname.startsWith('/chat')) return 'Chat';
  if (pathname.startsWith('/voice')) return 'Voice';
  if (pathname.startsWith('/camera')) return 'Camera';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/tdee')) return 'TDEE Calculator';
  if (pathname.startsWith('/trainer-dashboard')) return 'Client Management';
  if (pathname.startsWith('/dashboard')) return 'Dashboard';
  return 'PAT';
};

export default function RootLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNavigation, setShowNavigation] = useState(false);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  
  // Mock alerts for header
  const [alerts, setAlerts] = useState<MetricAlert[]>([
    {
      id: '1',
      type: 'consistency_nudge',
      message: 'Keep up the good work!',
      severity: 'info',
      timestamp: new Date(),
      dismissed: false
    }
  ]);

  const pageTitle = getPageTitle(location.pathname);

  // Load chat histories when needed
  useEffect(() => {
    if (showNavigation) {
      const loadChatHistories = async () => {
        try {
          const chatState = await ChatManager.loadChatState();
          setChatHistories(chatState.chatHistories);
        } catch (error) {
          console.error('Error loading chat histories:', error);
        }
      };
      loadChatHistories();
    }
  }, [showNavigation]);

  const handleNavigate = (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => {
    setShowNavigation(false);
    switch (page) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'chat':
        navigate('/chat');
        break;
      case 'voice':
        navigate('/voice');
        break;
      case 'camera':
        navigate('/camera', { state });
        break;
      case 'tdee-wizard':
        navigate('/tdee');
        break;
      case 'trainer-dashboard':
        navigate('/trainer-dashboard');
        break;
      case 'admin':
        navigate('/admin');
        break;
      default:
        navigate('/dashboard');
    }
  };

  const handleNewChat = () => {
    setShowNavigation(false);
    navigate('/chat?new=1');
  };

  const handleLoadChat = (chatHistory: ChatHistory) => {
    setShowNavigation(false);
    navigate(`/chat?t=${encodeURIComponent(chatHistory.id)}`);
  };

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, dismissed: true } : alert
    ));
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <MainHeader 
        title={pageTitle}
        onMenuToggle={() => setShowNavigation(true)}
        alerts={alerts}
        onDismissAlert={handleDismissAlert}
      />
      
      {/* Navigation Sidebar */}
      <NavigationSidebar 
        isOpen={showNavigation} 
        onClose={() => setShowNavigation(false)} 
        onNavigate={handleNavigate}
        onNewChat={handleNewChat}
        onLoadChat={handleLoadChat}
        chatHistories={chatHistories}
        userProfile={null}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pt-11">
        <Outlet />
      </main>
    </div>
  );
}