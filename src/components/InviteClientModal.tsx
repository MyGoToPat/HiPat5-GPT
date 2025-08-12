import React, { useState } from 'react';
import { X, Mail, Link, Copy, RefreshCw, Send, Check, AlertCircle, Users, Clock, UserCheck, UserX } from 'lucide-react';

interface PendingInvite {
  id: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  sentAt: Date;
  expiresAt: Date;
  remindersSent: number;
}

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSent?: (email: string) => void;
}

export const InviteClientModal: React.FC<InviteClientModalProps> = ({
  isOpen,
  onClose,
  onInviteSent
}) => {
  const [activeTab, setActiveTab] = useState<'email' | 'link' | 'pending'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('https://hipat.app/invite/abc123def456');
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState('');

  // Mock pending invites data
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([
    {
      id: '1',
      email: 'john.doe@example.com',
      status: 'pending',
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      remindersSent: 1
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      status: 'accepted',
      sentAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      expiresAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Expired (accepted)
      remindersSent: 0
    },
    {
      id: '3',
      email: 'bob.wilson@example.com',
      status: 'declined',
      sentAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), // 4 days from now
      remindersSent: 0
    },
    {
      id: '4',
      email: 'alice.brown@example.com',
      status: 'expired',
      sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Expired 3 days ago
      remindersSent: 2
    }
  ]);

  const handleSendInvite = async () => {
    if (typeof emailInput !== 'string' || !emailInput.trim()) {
      setError('Please enter an email address');
      return;
    }

    if (!isValidEmail(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check if email already has pending invite
    const existingInvite = pendingInvites.find(
      invite => typeof invite.email === 'string' && typeof emailInput === 'string' && 
      invite.email.toLowerCase() === emailInput.toLowerCase() && 
      invite.status === 'pending'
    );

    if (existingInvite) {
      setError('An invitation has already been sent to this email address');
      return;
    }

    setIsLoading(true);
    setError('');

    // TODO: Replace with actual API call
    setTimeout(() => {
      const newInvite: PendingInvite = {
        id: Date.now().toString(),
        email: emailInput.trim(),
        status: 'pending',
        sentAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        remindersSent: 0
      };

      setPendingInvites(prev => [newInvite, ...prev]);
      setEmailSent(true);
      setEmailInput('');
      setIsLoading(false);
      onInviteSent?.(emailInput.trim());

      // TODO: Show success toast
      console.log('Invite sent to:', emailInput);

      // Reset success state after 3 seconds
      setTimeout(() => {
        setEmailSent(false);
      }, 3000);
    }, 1500);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      // TODO: Show success toast
      console.log('Invite link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleRegenerateLink = () => {
    // TODO: Replace with actual API call
    const newLink = `https://hipat.app/invite/${generateRandomId()}`;
    setInviteLink(newLink);
    console.log('New invite link generated:', newLink);
    // TODO: Show success toast
  };

  const handleResendInvite = (inviteId: string) => {
    setPendingInvites(prev => prev.map(invite => 
      invite.id === inviteId 
        ? { 
            ...invite, 
            remindersSent: invite.remindersSent + 1,
            sentAt: new Date()
          }
        : invite
    ));
    // TODO: Send reminder email via API
    console.log('Reminder sent for invite:', inviteId);
    // TODO: Show success toast
  };

  const handleCancelInvite = (inviteId: string) => {
    setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
    // TODO: Cancel invite via API
    console.log('Invite cancelled:', inviteId);
    // TODO: Show success toast
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const generateRandomId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const getStatusBadge = (status: PendingInvite['status']) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      accepted: 'bg-green-100 text-green-800 border-green-200',
      declined: 'bg-red-100 text-red-800 border-red-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200'
    };

    const icons = {
      pending: Clock,
      accepted: UserCheck,
      declined: UserX,
      expired: AlertCircle
    };

    const IconComponent = icons[status];

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        <IconComponent size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    }
  };

  const formatExpiresIn = (date: Date): string => {
    const now = new Date();
    const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 0) {
      return 'Expired';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours left`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} left`;
    }
  };

  const tabs = [
    { id: 'email', label: 'Send by Email', icon: Mail },
    { id: 'link', label: 'Invite Link', icon: Link },
    { id: 'pending', label: 'Pending Invites', icon: Users }
  ];

  const pendingCount = pendingInvites.filter(invite => invite.status === 'pending').length;

  if (!isOpen) return null;

  const renderEmailTab = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h4 className="font-medium text-blue-900 mb-2">Invite by Email</h4>
        <p className="text-sm text-blue-700">
          Send a personalized invitation email to your client. They'll receive a secure link to join your training program.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Email Address
          </label>
          <div className="relative">
            <Mail size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setError('');
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendInvite()}
              placeholder="client@example.com"
              className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                error 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleSendInvite}
          disabled={isLoading || !emailInput.trim()}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending Invitation...
            </>
          ) : emailSent ? (
            <>
              <Check size={20} />
              Invitation Sent!
            </>
          ) : (
            <>
              <Send size={20} />
              Send Invitation
            </>
          )}
        </button>

        {emailSent && (
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-800">
              <Check size={16} />
              <span className="font-medium">Invitation sent successfully!</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your client will receive an email with instructions to join your training program.
            </p>
          </div>
        )}
      </div>

      {/* Preview of invitation email */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h5 className="font-medium text-gray-900 mb-3">Email Preview</h5>
        <div className="bg-white p-4 rounded border text-sm">
          <div className="border-b pb-2 mb-3">
            <p className="font-medium">Subject: You're invited to join HiPat Training</p>
            <p className="text-gray-600">From: trainer@hipat.app</p>
          </div>
          <div className="space-y-2 text-gray-700">
            <p>Hi there,</p>
            <p>You've been invited to join HiPat as a client. Your trainer is ready to help you achieve your fitness goals with personalized AI-powered coaching.</p>
            <p>Click the link below to get started:</p>
            <p className="text-blue-600 underline">[Secure Invitation Link]</p>
            <p>This invitation expires in 7 days.</p>
            <p>Best regards,<br />The HiPat Team</p>
          </div>
        </div>
      </div>

      {/* TODO Comment */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>TODO:</strong> Implement email sending via backend API with customizable email templates
        </p>
      </div>
    </div>
  );

  const renderLinkTab = () => (
    <div className="space-y-6">
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-2">Shareable Invite Link</h4>
        <p className="text-sm text-purple-700">
          Generate a secure link that you can share directly with your client via any messaging platform.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Invite Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700 font-mono text-sm"
              />
            </div>
            <button
              onClick={handleCopyLink}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                linkCopied
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {linkCopied ? (
                <Check size={20} />
              ) : (
                <Copy size={20} />
              )}
            </button>
          </div>
          {linkCopied && (
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <Check size={14} />
              Link copied to clipboard!
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRegenerateLink}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={16} />
            Regenerate Link
          </button>
        </div>
      </div>

      {/* Link Settings */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h5 className="font-medium text-gray-900 mb-4">Link Settings</h5>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Link Expiration</p>
              <p className="text-sm text-gray-600">Automatically expire the link after a set time</p>
            </div>
            <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="never">Never</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Single Use</p>
              <p className="text-sm text-gray-600">Link becomes invalid after first use</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Require Email Verification</p>
              <p className="text-sm text-gray-600">Client must verify email before accessing</p>
            </div>
            <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors">
              <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Link Analytics */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h5 className="font-medium text-gray-900 mb-4">Link Analytics</h5>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">12</p>
            <p className="text-sm text-gray-600">Total Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">3</p>
            <p className="text-sm text-gray-600">Conversions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">25%</p>
            <p className="text-sm text-gray-600">Success Rate</p>
          </div>
        </div>
      </div>

      {/* TODO Comment */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>TODO:</strong> Implement link generation, analytics tracking, and security settings via backend API
        </p>
      </div>
    </div>
  );

  const renderPendingTab = () => (
    <div className="space-y-6">
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-orange-900 mb-2">Pending Invitations</h4>
            <p className="text-sm text-orange-700">
              Track and manage all sent invitations. You can resend reminders or cancel pending invites.
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-900">{pendingCount}</p>
            <p className="text-sm text-orange-700">Pending</p>
          </div>
        </div>
      </div>

      {pendingInvites.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <Users size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations sent</h3>
          <p className="text-gray-600 mb-6">
            Start by sending your first client invitation using the Email or Link tabs.
          </p>
          <button
            onClick={() => setActiveTab('email')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            Send First Invitation
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h5 className="font-medium text-gray-900">All Invitations</h5>
          </div>
          
          <div className="divide-y divide-gray-200">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="p-6 hover:bg-gray-50 transition-colors"> // eslint-disable-next-line react/jsx-key
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-gray-900">{invite.email}</p>
                      {getStatusBadge(invite.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <p className="font-medium text-gray-700">Sent</p>
                        <p>{formatTimeAgo(invite.sentAt)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Expires</p>
                        <p className={invite.status === 'expired' ? 'text-red-600' : ''}>
                          {formatExpiresIn(invite.expiresAt)}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Reminders</p>
                        <p>{invite.remindersSent} sent</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {invite.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResendInvite(invite.id)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => handleCancelInvite(invite.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    
                    {invite.status === 'expired' && (
                      <button
                        onClick={() => handleResendInvite(invite.id)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                      >
                        Resend
                      </button>
                    )}
                    
                    {(invite.status === 'accepted' || invite.status === 'declined') && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                        {invite.status === 'accepted' ? 'Joined' : 'Declined'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {pendingInvites.filter(invite => invite.status === 'pending').length > 1 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {pendingCount} pending invitation{pendingCount !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                Resend All
              </button>
              <button className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors">
                Cancel All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TODO Comment */}
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <p className="text-sm text-green-800">
          <strong>TODO:</strong> Implement invitation status tracking, reminder scheduling, and bulk actions via backend API
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Invite New Client</h2>
            <p className="text-gray-600 mt-1">Send an invitation to add a new client to your training program</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent size={16} />
                  {tab.label}
                  {tab.id === 'pending' && pendingCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'email' && renderEmailTab()}
          {activeTab === 'link' && renderLinkTab()}
          {activeTab === 'pending' && renderPendingTab()}
        </div>
      </div>
    </>
  );
};