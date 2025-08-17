import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleTileProps {
  title: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  iconColor: string;
  hoverColor: string;
  children: React.ReactNode;
  condensedContent: React.ReactNode;
  className?: string;
}

export const CollapsibleTile: React.FC<CollapsibleTileProps> = ({
  title,
  icon: IconComponent,
  iconColor,
  hoverColor,
  children,
  condensedContent,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-gray-900 rounded-2xl shadow-pat-card border border-gray-800 hover:${hoverColor} transition-all duration-300 cursor-pointer group w-full min-h-[220px] overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-6 pb-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <IconComponent size={20} className={`${iconColor} group-hover:brightness-110 transition-all`} />
          <h3 className="text-lg font-semibold text-white truncate" title={title}>{title}</h3>
        </div>
        
        <button className="p-1 hover:bg-gray-800 rounded-lg transition-colors">
          {isExpanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </button>
      </div>
      
      {/* Content */}
      <div className="px-6 pb-6 w-full overflow-hidden break-words">
        <div className={`transition-all duration-300 ease-in-out ${
          isExpanded ? 'opacity-100' : 'opacity-100'
        }`}>
          {isExpanded ? children : condensedContent}
        </div>
      </div>
      
      {/* Expand/Collapse Animation */}
      <div className={`overflow-hidden transition-all duration-300 ${
        isExpanded ? 'max-h-none' : 'max-h-0'
      }`}>
        {isExpanded && (
          <div className="px-6 pb-6 border-t border-gray-800 pt-4">
            <div className="text-xs text-gray-400 text-center">
              Click header to collapse
            </div>
          </div>
        )}
      </div>
    </div>
  );
};