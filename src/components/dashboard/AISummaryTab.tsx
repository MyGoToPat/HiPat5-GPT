import React, { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Lightbulb, Target, Zap, Moon, Activity, RefreshCw, MessageSquare, ThumbsUp, ThumbsDown, MoreHorizontal } from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'achievement' | 'concern' | 'recommendation' | 'pattern' | 'prediction';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  category: 'nutrition' | 'fitness' | 'sleep' | 'overall';
  timestamp: Date;
  actionable: boolean;
  data?: {
    metric?: string;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
    timeframe?: string;
  };
}

interface ProactiveSuggestion {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  category: 'workout' | 'nutrition' | 'recovery' | 'motivation';
  urgency: 'immediate' | 'this_week' | 'next_week';
  estimatedImpact: 'high' | 'medium' | 'low';
  implementationDifficulty: 'easy' | 'moderate' | 'challenging';
}

interface PatPersonality {
  tone: 'professional' | 'friendly' | 'motivational' | 'analytical';
  verbosity: 'concise' | 'detailed' | 'comprehensive';
  focus: 'data_driven' | 'holistic' | 'goal_oriented';
}

interface AISummaryTabProps {
  clientId: string;
  onPersonalityChange?: (personality: PatPersonality) => void;
}

export const AISummaryTab: React.FC<AISummaryTabProps> = ({
  clientId,
  onPersonalityChange
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<string | null>(null);
  const [patPersonality, setPatPersonality] = useState<PatPersonality>({
    tone: 'friendly',
    verbosity: 'detailed',
    focus: 'holistic'
  });

  // Mock AI insights data
  const [insights, setInsights] = useState<AIInsight[]>([
    {
      id: '1',
      type: 'achievement',
      title: 'Consistency Breakthrough',
      description: 'Client has maintained a 12-day workout streak, their longest this year. This represents a 40% improvement in consistency compared to last month.',
      confidence: 95,
      priority: 'high',
      category: 'fitness',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      actionable: true,
      data: {
        metric: 'workout_streak',
        change: 40,
        trend: 'up',
        timeframe: '30_days'
      }
    },
    {
      id: '2',
      type: 'concern',
      title: 'Protein Intake Declining',
      description: 'Protein intake has dropped 15% over the past week, averaging 145g vs target of 180g. This could impact recovery and muscle protein synthesis.',
      confidence: 88,
      priority: 'medium',
      category: 'nutrition',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      actionable: true,
      data: {
        metric: 'protein_intake',
        change: -15,
        trend: 'down',
        timeframe: '7_days'
      }
    },
    {
      id: '3',
      type: 'pattern',
      title: 'Sleep-Performance Correlation',
      description: 'Strong correlation detected: workouts following 7.5+ hours of sleep show 23% higher volume and 18% better RPE scores.',
      confidence: 92,
      priority: 'medium',
      category: 'sleep',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      actionable: true,
      data: {
        metric: 'sleep_performance',
        change: 23,
        trend: 'up',
        timeframe: '30_days'
      }
    },
    {
      id: '4',
      type: 'recommendation',
      title: 'Optimize Tuesday Workouts',
      description: 'Tuesday workouts consistently underperform (avg RPE 8.2 vs 7.1 other days). Consider adjusting Monday recovery or Tuesday workout intensity.',
      confidence: 85,
      priority: 'low',
      category: 'fitness',
      timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
      actionable: true,
      data: {
        metric: 'tuesday_performance',
        change: -16,
        trend: 'down',
        timeframe: '60_days'
      }
    },
    {
      id: '5',
      type: 'prediction',
      title: 'Goal Achievement Forecast',
      description: 'Based on current trajectory, client is 87% likely to achieve their 6-month strength goals. Maintaining current consistency is key.',
      confidence: 79,
      priority: 'high',
      category: 'overall',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      actionable: false,
      data: {
        metric: 'goal_achievement',
        change: 87,
        trend: 'up',
        timeframe: '180_days'
      }
    }
  ]);

  // Mock proactive suggestions
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([
    {
      id: '1',
      title: 'Add Post-Workout Protein Shake',
      description: 'Implement a 25g whey protein shake within 30 minutes post-workout to bridge the protein gap.',
      reasoning: 'Current protein intake is 19% below target. Post-workout timing can maximize muscle protein synthesis.',
      category: 'nutrition',
      urgency: 'this_week',
      estimatedImpact: 'high',
      implementationDifficulty: 'easy'
    },
    {
      id: '2',
      title: 'Introduce Deload Week',
      description: 'Schedule a deload week with 60% intensity to prevent overreaching and optimize recovery.',
      reasoning: 'RPE has been consistently above 8.5 for 3 weeks. Recovery markers suggest accumulated fatigue.',
      category: 'workout',
      urgency: 'next_week',
      estimatedImpact: 'high',
      implementationDifficulty: 'moderate'
    },
    {
      id: '3',
      title: 'Optimize Sleep Environment',
      description: 'Implement sleep hygiene protocol: room temperature 65-68°F, blackout curtains, blue light filters.',
      reasoning: 'Sleep quality variance is high (±18%). Environmental optimization could improve consistency.',
      category: 'recovery',
      urgency: 'this_week',
      estimatedImpact: 'medium',
      implementationDifficulty: 'easy'
    },
    {
      id: '4',
      title: 'Celebrate Consistency Milestone',
      description: 'Acknowledge the 12-day streak achievement and set next milestone at 21 days.',
      reasoning: 'Positive reinforcement at consistency milestones increases adherence by 34% on average.',
      category: 'motivation',
      urgency: 'immediate',
      estimatedImpact: 'medium',
      implementationDifficulty: 'easy'
    }
  ]);

  const handleGenerateInsights = async () => {
    setIsGenerating(true);
    // TODO: Replace with actual AI API call
    setTimeout(() => {
      setIsGenerating(false);
      // TODO: Add new insights to the list
      console.log('Generated new AI insights');
    }, 3000);
  };

  const handlePersonalityChange = (field: keyof PatPersonality, value: string) => {
    const newPersonality = { ...patPersonality, [field]: value };
    setPatPersonality(newPersonality);
    onPersonalityChange?.(newPersonality);
  };

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'achievement':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'concern':
        return <AlertTriangle size={20} className="text-red-500" />;
      case 'recommendation':
        return <Lightbulb size={20} className="text-yellow-500" />;
      case 'pattern':
        return <TrendingUp size={20} className="text-blue-500" />;
      case 'prediction':
        return <Target size={20} className="text-purple-500" />;
    }
  };

  const getInsightColor = (type: AIInsight['type']) => {
    switch (type) {
      case 'achievement':
        return 'bg-green-50 border-green-200';
      case 'concern':
        return 'bg-red-50 border-red-200';
      case 'recommendation':
        return 'bg-yellow-50 border-yellow-200';
      case 'pattern':
        return 'bg-blue-50 border-blue-200';
      case 'prediction':
        return 'bg-purple-50 border-purple-200';
    }
  };

  const getPriorityBadge = (priority: AIInsight['priority']) => {
    const styles = {
      high: 'bg-red-100 text-red-800 border-red-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[priority]}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const getCategoryIcon = (category: AIInsight['category']) => {
    switch (category) {
      case 'nutrition':
        return <Zap size={14} className="text-green-500" />;
      case 'fitness':
        return <Activity size={14} className="text-orange-500" />;
      case 'sleep':
        return <Moon size={14} className="text-indigo-500" />;
      case 'overall':
        return <Target size={14} className="text-purple-500" />;
    }
  };

  const getUrgencyColor = (urgency: ProactiveSuggestion['urgency']) => {
    switch (urgency) {
      case 'immediate':
        return 'bg-red-100 text-red-800';
      case 'this_week':
        return 'bg-yellow-100 text-yellow-800';
      case 'next_week':
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getImpactColor = (impact: ProactiveSuggestion['estimatedImpact']) => {
    switch (impact) {
      case 'high':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
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
    <div className="space-y-6">
      {/* Header with Pat Personality Controls */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Brain size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Pat's AI Summary</h3>
              <p className="text-gray-600 text-sm">Intelligent insights and proactive recommendations</p>
            </div>
          </div>
          <button
            onClick={handleGenerateInsights}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            {isGenerating ? 'Analyzing...' : 'Refresh Insights'}
          </button>
        </div>

        {/* Pat Personality Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Communication Tone</label>
            <select
              value={patPersonality.tone}
              onChange={(e) => handlePersonalityChange('tone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="motivational">Motivational</option>
              <option value="analytical">Analytical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Detail Level</label>
            <select
              value={patPersonality.verbosity}
              onChange={(e) => handlePersonalityChange('verbosity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Analysis Focus</label>
            <select
              value={patPersonality.focus}
              onChange={(e) => handlePersonalityChange('focus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="data_driven">Data-Driven</option>
              <option value="holistic">Holistic</option>
              <option value="goal_oriented">Goal-Oriented</option>
            </select>
          </div>
        </div>
      </div>

      {/* AI Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Recent Insights</h4>
          
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getInsightColor(insight.type)} ${
                selectedInsight === insight.id ? 'ring-2 ring-purple-500' : ''
              }`}
              onClick={() => setSelectedInsight(selectedInsight === insight.id ? null : insight.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h5 className="font-medium text-gray-900">{insight.title}</h5>
                      {getPriorityBadge(insight.priority)}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed mb-3">
                      {insight.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(insight.category)}
                          <span className="capitalize">{insight.category}</span>
                        </div>
                        <span>•</span>
                        <span>{insight.confidence}% confidence</span>
                        <span>•</span>
                        <span>{formatTimeAgo(insight.timestamp)}</span>
                      </div>
                      
                      {insight.data?.change && (
                        <div className={`flex items-center gap-1 text-xs font-medium ${
                          insight.data.change > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {insight.data.change > 0 ? (
                            <TrendingUp size={12} />
                          ) : (
                            <TrendingDown size={12} />
                          )}
                          {Math.abs(insight.data.change)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors">
                  <MoreHorizontal size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Expanded Details */}
              {selectedInsight === insight.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {insight.data && (
                    <div className="bg-white bg-opacity-50 p-3 rounded-lg">
                      <h6 className="font-medium text-gray-900 mb-2">Data Details</h6>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-600">Metric:</span>
                          <span className="ml-2 font-medium">{insight.data.metric?.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Timeframe:</span>
                          <span className="ml-2 font-medium">{insight.data.timeframe?.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {insight.actionable && (
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors">
                        <MessageSquare size={14} />
                        Discuss with Client
                      </button>
                      <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors">
                        <ThumbsUp size={14} className="text-gray-400" />
                      </button>
                      <button className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors">
                        <ThumbsDown size={14} className="text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Proactive Suggestions */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Proactive Suggestions</h4>
          
          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h5 className="font-medium text-gray-900">{suggestion.title}</h5>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getUrgencyColor(suggestion.urgency)}`}>
                    {suggestion.urgency.replace('_', ' ')}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImpactColor(suggestion.estimatedImpact)}`}>
                    {suggestion.estimatedImpact} impact
                  </span>
                </div>
              </div>
              
              <p className="text-gray-700 text-sm mb-3 leading-relaxed">
                {suggestion.description}
              </p>
              
              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                <h6 className="font-medium text-gray-900 text-xs mb-1">Reasoning</h6>
                <p className="text-gray-600 text-xs leading-relaxed">
                  {suggestion.reasoning}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="capitalize">{suggestion.category}</span>
                  <span>•</span>
                  <span className="capitalize">{suggestion.implementationDifficulty} to implement</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors">
                    Implement
                  </button>
                  <button className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded text-xs transition-colors">
                    Later
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pat's Analysis Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h4 className="font-medium text-blue-900">Pat's Overall Assessment</h4>
            <p className="text-blue-700 text-sm">Generated based on current personality settings</p>
          </div>
        </div>
        
        <div className="bg-white bg-opacity-50 p-4 rounded-lg">
          <p className="text-blue-900 leading-relaxed">
            {patPersonality.tone === 'friendly' ? "Hey there! " : patPersonality.tone === 'motivational' ? "Great work! " : ""}
            Your client is showing excellent progress with their 12-day workout streak - that's a real breakthrough! 
            {patPersonality.verbosity === 'detailed' || patPersonality.verbosity === 'comprehensive' ? 
              " I've noticed some patterns that could help optimize their results even further. The correlation between sleep and workout performance is particularly strong, and addressing the protein intake dip could really accelerate their progress." : 
              " Focus on protein intake and sleep optimization for best results."
            }
            {patPersonality.focus === 'goal_oriented' ? " They're 87% likely to hit their 6-month goals if they maintain this momentum!" : ""}
          </p>
        </div>
      </div>

      {/* TODO Comments */}
      <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-medium text-purple-900 mb-3">AI Integration TODOs</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-800">
          <div>
            <h5 className="font-medium mb-2">Backend Requirements:</h5>
            <ul className="space-y-1 text-xs">
              <li>• AI/ML model integration for pattern detection</li>
              <li>• Real-time data analysis pipeline</li>
              <li>• Confidence scoring algorithms</li>
              <li>• Personalization engine for Pat's personality</li>
              <li>• Feedback loop for insight accuracy</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Features to Implement:</h5>
            <ul className="space-y-1 text-xs">
              <li>• Natural language generation for insights</li>
              <li>• Predictive analytics for goal achievement</li>
              <li>• Automated suggestion prioritization</li>
              <li>• Client-specific insight customization</li>
              <li>• Integration with conversation agents</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};