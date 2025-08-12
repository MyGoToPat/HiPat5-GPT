import React, { useState } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle, TrendingUp } from 'lucide-react';
import { MetricAlert } from '../../types/metrics';

interface AlertCenterProps {
  alerts: MetricAlert[];
  onDismissAlert: (alertId: string) => void;
  className?: string;
}

export const AlertCenter: React.FC<AlertCenterProps> = ({ alerts, onDismissAlert, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadAlerts = alerts.filter(alert => !alert.dismissed);
  const recentAlerts = alerts.slice(0, 5);

  const getAlertIcon = (type: MetricAlert['type']) => {
    switch (type) {
      case 'pr_achieved':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'consistency_nudge':
        return <TrendingUp size={16} className="text-blue-400" />;
      case 'fatigue_flag':
      case 'overreaching':
        return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'sleep_debt':
      case 'circadian_drift':
        return <AlertTriangle size={16} className="text-purple-400" />;
      case 'protein_insufficient':
        return <Info size={16} className="text-orange-400" />;
      default:
        return <Info size={16} className="text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: MetricAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-500/10';
      case 'warning':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'info':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Alert Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Bell size={20} className="text-gray-300" />
        {unreadAlerts.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">
              {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
            </span>
          </div>
        )}
      </button>

      {/* Alert Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Alert Panel */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Alerts</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
              {unreadAlerts.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {unreadAlerts.length} unread alert{unreadAlerts.length !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            <div className="max-h-80 overflow-y-auto">
              {recentAlerts.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell size={32} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No alerts</p>
                  <p className="text-gray-500 text-sm">You're all caught up!</p>
                </div>
              ) : ( // eslint-disable-next-line react/jsx-key
                <div className="p-2">
                  {recentAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 mb-2 rounded-lg border ${getSeverityColor(alert.severity)} ${
                        alert.dismissed ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getAlertIcon(alert.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium mb-1">
                            {alert.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                        
                        {!alert.dismissed && (
                          <button
                            onClick={() => onDismissAlert(alert.id)}
                            className="flex-shrink-0 p-1 hover:bg-gray-700 rounded transition-colors"
                          >
                            <X size={14} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {recentAlerts.length > 0 && (
              <div className="p-3 border-t border-gray-700">
                <button className="w-full text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  View All Alerts
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};