import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TimerProvider } from './context/TimerContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Import page components
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import VoicePage from './pages/VoicePage';
import CameraPage from './pages/CameraPage';
import TDEEOnboardingWizard from './pages/TDEEOnboardingWizard';
import IntervalTimerPage from './pages/IntervalTimerPage';
import TrainerDashboardPage from './pages/TrainerDashboardPage';
import DebugPage from './pages/DebugPage';
import AdminPage from './pages/AdminPage';
import Health from './pages/Health';
import AgentsListPage from './pages/admin/AgentsListPage';
import AgentDetailPage from './pages/admin/AgentDetailPage';
import ShopLensPage from './pages/agents/ShopLensPage';
import FoodLogPage from './pages/log/FoodLogPage';
import AppLayout from './layouts/AppLayout';

function App() {
  // Create onNavigate wrapper for components that still use string-based navigation
  const createOnNavigateWrapper = () => {
    return (page: string, state?: { autoStartMode?: 'takePhoto' | 'videoStream' }) => {
      // This will be handled by React Router navigation in the components themselves
      console.log('Navigation requested:', page, state);
    };
  };

  return (
    <TimerProvider>
      <ErrorBoundary>
        <Toaster position="top-right" />
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage onNavigate={createOnNavigateWrapper()} />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage onNavigate={createOnNavigateWrapper()} />} />
          <Route path="/health" element={<Health />} />

          {/* PROTECTED ROUTES */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="voice" element={<VoicePage />} />
            <Route path="camera" element={<CameraPage />} />
            <Route 
              path="tdee" 
              element={
                <TDEEOnboardingWizard onComplete={() => window.location.href = '/dashboard'} />
              } 
            />
            <Route path="interval-timer" element={<IntervalTimerPage />} />
            <Route path="trainer-dashboard" element={<TrainerDashboardPage userProfile={null} />} />
            <Route path="debug" element={<DebugPage userProfile={null} />} />
            <Route path="admin">
              <Route index element={<AdminPage />} />
              <Route path="agents" element={<AgentsListPage />} />
              <Route path="agents/:agentId" element={<AgentDetailPage />} />
            </Route>
            <Route path="agents">
              <Route index element={<AgentsListPage />} />
              <Route path="shoplens" element={<ShopLensPage />} />
            </Route>
            <Route path="log">
              <Route path="food" element={<FoodLogPage />} />
            </Route>
          </Route>

          {/* FALLBACK */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </TimerProvider>
  );
}

export default App;