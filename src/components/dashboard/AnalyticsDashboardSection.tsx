import React, { useState } from 'react';
import { BarChart3, Users, UserCheck, AlertTriangle, TrendingUp, TrendingDown, Download, Filter, Calendar, Trophy, Target, Zap, Clock, ChevronUp, ChevronDown, FileText, Mail, ExternalLink } from 'lucide-react';
import { DataSourceBadge } from '../../lib/devDataSourceBadge';

interface AnalyticsOverview {
  totalClients: number;
  activeClients: number;
  clientsAtRisk: number;
  overallEngagement: number;
  trends: {
    totalClients: number;
    activeClients: number;
    clientsAtRisk: number;
    overallEngagement: number;
  };
}

interface ChartData {
  label: string;
  value: number;
  change?: number;
  color: string;
}

interface ClientLeaderboard {
  id: string;
  name: string;
  avatar: string;
  metric: string;
  value: number;
  change: number;
  rank: number;
}

interface AnalyticsAlert {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  description: string;
  count: number;
  timestamp: Date;
}

interface ExportOption {
  id: string;
  label: string;
  format: 'PDF' | 'CSV' | 'Excel';
  description: string;
}

export const AnalyticsDashboardSection: React.FC = () => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [selectedMetric, setSelectedMetric] = useState<'workouts' | 'meals' | 'goals' | 'engagement'>('workouts');
  const [showExportModal, setShowExportModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  // Mock analytics data
  const analyticsOverview: AnalyticsOverview = {
    totalClients: 47,
    activeClients: 38,
    clientsAtRisk: 6,
    overallEngagement: 82,
    trends: {
      totalClients: 12,
      activeClients: 8,
      clientsAtRisk: -15,
      overallEngagement: 5
    }
  };

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  // Mock chart data for different metrics
  const chartData: { [key: string]: ChartData[] } = {
    workouts: [
      { label: 'Week 1', value: 156, change: 12, color: 'bg-orange-500' },
      { label: 'Week 2', value: 142, change: -9, color: 'bg-orange-500' },
      { label: 'Week 3', value: 178, change: 25, color: 'bg-orange-500' },
      { label: 'Week 4', value: 165, change: -7, color: 'bg-orange-500' },
      { label: 'Week 5', value: 189, change: 15, color: 'bg-orange-500' },
      { label: 'Week 6', value: 201, change: 6, color: 'bg-orange-500' },
      { label: 'Week 7', value: 195, change: -3, color: 'bg-orange-500' }
    ],
    meals: [
      { label: 'Week 1', value: 324, change: 8, color: 'bg-green-500' },
      { label: 'Week 2', value: 298, change: -8, color: 'bg-green-500' },
      { label: 'Week 3', value: 356, change: 19, color: 'bg-green-500' },
      { label: 'Week 4', value: 342, change: -4, color: 'bg-green-500' },
      { label: 'Week 5', value: 378, change: 11, color: 'bg-green-500' },
      { label: 'Week 6', value: 389, change: 3, color: 'bg-green-500' },
      { label: 'Week 7', value: 401, change: 3, color: 'bg-green-500' }
    ],
    goals: [
      { label: 'Week 1', value: 67, change: 5, color: 'bg-purple-500' },
      { label: 'Week 2', value: 72, change: 7, color: 'bg-purple-500' },
      { label: 'Week 3', value: 78, change: 8, color: 'bg-purple-500' },
      { label: 'Week 4', value: 75, change: -4, color: 'bg-purple-500' },
      { label: 'Week 5', value: 82, change: 9, color: 'bg-purple-500' },
      { label: 'Week 6', value: 85, change: 4, color: 'bg-purple-500' },
      { label: 'Week 7', value: 88, change: 4, color: 'bg-purple-500' }
    ],
    engagement: [
      { label: 'Week 1', value: 78, change: 2, color: 'bg-blue-500' },
      { label: 'Week 2', value: 82, change: 5, color: 'bg-blue-500' },
      { label: 'Week 3', value: 79, change: -4, color: 'bg-blue-500' },
      { label: 'Week 4', value: 85, change: 8, color: 'bg-blue-500' },
      { label: 'Week 5', value: 88, change: 4, color: 'bg-blue-500' },
      { label: 'Week 6', value: 84, change: -5, color: 'bg-blue-500' },
      { label: 'Week 7', value: 91, change: 8, color: 'bg-blue-500' }
    ]
  };

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  // Mock client leaderboard data
  const clientLeaderboard: ClientLeaderboard[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      avatar: 'SJ',
      metric: 'Workout Streak',
      value: 28,
      change: 12,
      rank: 1
    },
    {
      id: '2',
      name: 'Michael Chen',
      avatar: 'MC',
      metric: 'Goal Completion',
      value: 95,
      change: 8,
      rank: 2
    },
    {
      id: '3',
      name: 'Lisa Park',
      avatar: 'LP',
      metric: 'Consistency Score',
      value: 92,
      change: 5,
      rank: 3
    },
    {
      id: '4',
      name: 'David Thompson',
      avatar: 'DT',
      metric: 'Protein Target',
      value: 88,
      change: -2,
      rank: 4
    },
    {
      id: '5',
      name: 'Emily Rodriguez',
      avatar: 'ER',
      metric: 'Sleep Quality',
      value: 85,
      change: 15,
      rank: 5
    }
  ];

  // TODO: MOCK_DATA_REMOVE (HiPat cleanup)
  // Mock analytics alerts
  const analyticsAlerts: AnalyticsAlert[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Clients Missing Workouts',
      description: 'clients missed 2+ workouts this week',
      count: 8,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      id: '2',
      type: 'info',
      title: 'Low Meal Logging',
      description: 'clients logged <3 meals yesterday',
      count: 12,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000)
    },
    {
      id: '3',
      type: 'success',
      title: 'Goal Achievements',
      description: 'clients reached their weekly goals',
      count: 15,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000)
    },
    {
      id: '4',
      type: 'warning',
      title: 'Engagement Drop',
      description: 'clients show decreased app usage',
      count: 5,
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    }
  ];

  // Export options
  const exportOptions: ExportOption[] = [
    {
      id: 'client-progress',
      label: 'Client Progress Report',
      format: 'PDF',
      description: 'Comprehensive progress report for all clients'
    },
    {
      id: 'workout-analytics',
      label: 'Workout Analytics',
      format: 'CSV',
      description: 'Detailed workout data and statistics'
    },
    {
      id: 'nutrition-summary',
      label: 'Nutrition Summary',
      format: 'Excel',
      description: 'Meal logging and nutrition adherence data'
    },
    {
      id: 'engagement-metrics',
      label: 'Engagement Metrics',
      format: 'PDF',
      description: 'Client engagement and app usage statistics'
    }
  ];

  const handleExport = (optionId: string) => {
    setIsLoading(true);
    // TODO: Replace with actual export API call
    setTimeout(() => {
      setIsLoading(false);
      setShowExportModal(false);
      // TODO: Show success toast
      console.log('Export started for:', optionId);
    }, 2000);
  };

  const getMaxValue = (data: ChartData[]) => {
    return Math.max(...data.map(d => d.value));
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp size={16} className="text-green-500" />;
    if (change < 0) return <TrendingDown size={16} className="text-red-500" />;
    return <div className="w-4 h-4" />;
  };

  const getAlertIcon = (type: AnalyticsAlert['type']) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'success':
        return <Trophy size={16} className="text-green-500" />;
      default:
        return <BarChart3 size={16} className="text-blue-500" />;
    }
  };

  const getAlertColor = (type: AnalyticsAlert['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return `${Math.floor(diffInHours / 24)}d ago`;
    }
  };

  return (
    <div className="space-y-8" style={{ position: 'relative' }}>
      <DataSourceBadge source="mock" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Track client progress and engagement metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users size={24} className="text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(analyticsOverview.trends.totalClients)}
              <span className={analyticsOverview.trends.totalClients > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(analyticsOverview.trends.totalClients)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{analyticsOverview.totalClients}</p>
            <p className="text-gray-600 text-sm">Total Clients</p>
            <p className="text-xs text-gray-500 mt-1">Last 7 days trend</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <UserCheck size={24} className="text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(analyticsOverview.trends.activeClients)}
              <span className={analyticsOverview.trends.activeClients > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(analyticsOverview.trends.activeClients)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{analyticsOverview.activeClients}</p>
            <p className="text-gray-600 text-sm">Active Clients</p>
            <p className="text-xs text-gray-500 mt-1">Engaged this week</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(analyticsOverview.trends.clientsAtRisk)}
              <span className={analyticsOverview.trends.clientsAtRisk < 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(analyticsOverview.trends.clientsAtRisk)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{analyticsOverview.clientsAtRisk}</p>
            <p className="text-gray-600 text-sm">Clients at Risk</p>
            <p className="text-xs text-gray-500 mt-1">Need attention</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Target size={24} className="text-purple-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              {getTrendIcon(analyticsOverview.trends.overallEngagement)}
              <span className={analyticsOverview.trends.overallEngagement > 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(analyticsOverview.trends.overallEngagement)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{analyticsOverview.overallEngagement}%</p>
            <p className="text-gray-600 text-sm">Overall Engagement</p>
            <p className="text-xs text-gray-500 mt-1">Average across all clients</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Main Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Trend Analysis</h3>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="workouts">Workouts</option>
                <option value="meals">Meals</option>
                <option value="goals">Goal Completion</option>
                <option value="engagement">Engagement</option>
              </select>
            </div>
          </div>

          {/* TODO: Replace with charting library when backend is ready */}
          <div className="h-64">
            <div className="flex items-end justify-between h-full gap-2">
              {chartData[selectedMetric].map((data, index) => {
                const maxValue = getMaxValue(chartData[selectedMetric]);
                const height = (data.value / maxValue) * 100;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      <div 
                        className={`w-full ${data.color} rounded-t-sm transition-all duration-500 hover:brightness-110 cursor-pointer relative group`}
                        style={{ height: `${height * 2}px` }}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {data.label}: {data.value}
                          {data.change && (
                            <span className={data.change > 0 ? 'text-green-300' : 'text-red-300'}>
                              {' '}({data.change > 0 ? '+' : ''}{data.change}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-left">
                      {data.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>TODO:</strong> Replace with charting library (Chart.js, Recharts, etc.) when backend is ready
            </p>
          </div>
        </div>

        {/* Client Leaderboard */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Top Performers</h3>
            <select className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="streak">Workout Streak</option>
              <option value="goals">Goal Completion</option>
              <option value="consistency">Consistency</option>
              <option value="engagement">Engagement</option>
            </select>
          </div>

          <div className="space-y-4">
            {clientLeaderboard.map((client, index) => (
              <div key={client.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-blue-500'
                  }`}>
                    {index < 3 ? '★' : client.rank}
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {client.avatar}
                  </div>
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{client.name}</p>
                  <p className="text-sm text-gray-600">{client.metric}</p>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-gray-900">{client.value}{client.metric.includes('Score') || client.metric.includes('Target') ? '%' : ''}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {getTrendIcon(client.change)}
                    <span className={client.change > 0 ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(client.change)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm transition-colors">
            View Full Leaderboard
          </button>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Alerts</h3>
          <button className="text-blue-600 hover:text-blue-700 text-sm">
            View All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {analyticsAlerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-lg border ${getAlertColor(alert.type)}`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <span className="px-2 py-0.5 bg-white bg-opacity-50 rounded-full text-xs font-bold">
                      {alert.count}
                    </span>
                  </div>
                  <p className="text-sm opacity-80">{alert.count} {alert.description}</p>
                  <p className="text-xs opacity-60 mt-2">{formatTimeAgo(alert.timestamp)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Analytics Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Summary */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-orange-500" />
                <span className="text-sm text-gray-600">Total Workouts</span>
              </div>
              <span className="font-bold text-gray-900">195</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-green-500" />
                <span className="text-sm text-gray-600">Meals Logged</span>
              </div>
              <span className="font-bold text-gray-900">401</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy size={16} className="text-purple-500" />
                <span className="text-sm text-gray-600">Goals Achieved</span>
              </div>
              <span className="font-bold text-gray-900">88%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-blue-500" />
                <span className="text-sm text-gray-600">Avg Session</span>
              </div>
              <span className="font-bold text-gray-900">12m</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <Mail size={16} className="text-blue-500" />
              <span className="text-sm text-gray-700">Send Weekly Report</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <AlertTriangle size={16} className="text-yellow-500" />
              <span className="text-sm text-gray-700">Review At-Risk Clients</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <BarChart3 size={16} className="text-purple-500" />
              <span className="text-sm text-gray-700">Generate Custom Report</span>
            </button>
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors">
              <ExternalLink size={16} className="text-green-500" />
              <span className="text-sm text-gray-700">Export All Data</span>
            </button>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <TrendingUp size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">Client engagement is up 15% this month</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">6 clients need nutrition guidance</p>
            </div>
            <div className="flex items-start gap-2">
              <Trophy size={14} className="text-purple-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">Best performing day: Tuesday</p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowExportModal(false)} />
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-50 w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Export Analytics Data</h3>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-600" />
                </button>
              </div>
              <p className="text-gray-600 mt-1">Choose the type of report you'd like to export</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exportOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleExport(option.id)}
                    disabled={isLoading}
                    className="p-4 text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{option.label}</h4>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {option.format}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </button>
                ))}
              </div>

              {isLoading && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-blue-800 font-medium">Generating export...</span>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">This may take a few moments</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <Calendar size={14} className="inline mr-1" />
                  Date range: {selectedTimeframe === '7d' ? 'Last 7 days' : selectedTimeframe === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TODO Comments for Backend Integration */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
        <h3 className="font-medium text-blue-900 mb-3">Backend Integration TODOs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
          <div>
            <h4 className="font-medium mb-2">API Endpoints Needed:</h4>
            <ul className="space-y-1 text-xs">
              <li>• GET /api/analytics/overview</li>
              <li>• GET /api/analytics/charts/{'metric'}</li>
              <li>• GET /api/analytics/leaderboard</li>
              <li>• GET /api/analytics/alerts</li>
              <li>• POST /api/analytics/export</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Features to Implement:</h4>
            <ul className="space-y-1 text-xs">
              <li>• Real-time data updates</li>
              <li>• Custom date range selection</li>
              <li>• Advanced filtering options</li>
              <li>• Automated alert system</li>
              <li>• Scheduled report generation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};