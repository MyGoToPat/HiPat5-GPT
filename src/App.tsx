// src/App.tsx — normalized route tree (fixes unterminated JSX + ensures admin-only agents)

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Auth/public pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import Health from './pages/Health';

// App pages
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import VoicePage from './pages/VoicePage';
import ChatPage from './pages/ChatPage';
import CameraPage from './pages/CameraPage';
import TDEEOnboardingWizard from './pages/TDEEOnboardingWizard';
import TrainerDashboardPage from './pages/TrainerDashboardPage';
import AdminPage from './pages/AdminPage';

// Admin/agents
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminGuard from './components/guards/AdminGuard';
import AgentsListPage from './pages/admin/AgentsListPage';
import AgentDetailPage from './pages/admin/AgentDetailPage';
import ShopLensPage from './pages/agents/ShopLensPage';
import WelcomeBetaPage from './pages/WelcomeBetaPage';

import AppLayout from './layouts/AppLayout';

function App() {
  // Wrapper kept for components that still accept string-based onNavigate
  const createOnNavigateWrapper = () => {
    return (_page: string) => {
      // Intentionally no-op here; real navigation handled by React Router in each page
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
        <Route path="/welcome-beta" element={<WelcomeBetaPage />} />

        {/* PROTECTED APP LAYOUT */}
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
            element={<TDEEOnboardingWizard onComplete={() => (window.location.href = '/dashboard')} />}
          />
          <Route path="trainer-dashboard" element={<TrainerDashboardPage userProfile={null} />} />

          {/* ADMIN-ONLY NESTED ROUTES */}
          <Route path="admin">
            <Route index element={<AdminPage />} />
            <Route path="agents" element={<AdminGuard><AgentsListPage /></AdminGuard>} />
            <Route path="agents/shoplens" element={<AdminGuard><ShopLensPage /></AdminGuard>} />
            <Route path="users" element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;