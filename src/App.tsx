import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Import page components
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import VoicePage from './pages/VoicePage';
import ChatPage from './pages/ChatPage';
import CameraPage from './pages/CameraPage';
import TDEEOnboardingWizard from './pages/TDEEOnboardingWizard';
import TrainerDashboardPage from './pages/TrainerDashboardPage';
import AdminPage from './pages/AdminPage';
import Health from './pages/Health';
import AdminGuard from './components/guards/AdminGuard';
import AgentsListPage from './pages/admin/AgentsListPage';
import AgentDetailPage from './pages/admin/AgentDetailPage';
import ShopLensPage from './pages/agents/ShopLensPage';
import AppLayout from './layouts/AppLayout';

function App() {
  // Create onNavigate wrapper for components that still use string-based navigation
  const createOnNavigateWrapper = () => {
    return (page: string) => {
      // This will be handled by React Router navigation in the components themselves
      console.log('Navigation requested:', page);
    };
  };

  return (
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
          <Route path="camera" element={<CameraPage />} />
          <Route path="voice" element={<VoicePage />} />
          <Route 
            path="tdee" 
            element={
              <TDEEOnboardingWizard onComplete={() => window.location.href = '/dashboard'} />
            } 
          />
          <Route path="trainer-dashboard" element={<TrainerDashboardPage userProfile={null} />} />
          <Route path="admin">
            <Route index element={<AdminPage />} />
            <Route path="agents" element={<AdminGuard><AgentsListPage /></AdminGuard>} />
            <Route path="agents/:agentId" element={<AdminGuard><AgentDetailPage /></AdminGuard>} />
            <Route path="agents/shoplens" element={<AdminGuard><ShopLensPage /></AdminGuard>} />
          </Route>
  )
}