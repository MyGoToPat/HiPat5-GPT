import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface PatAvatarProps {
  size?: number;
  mood?: 'neutral' | 'speaking' | 'listening' | 'thinking' | 'happy' | 'concerned' | 'excited' | 'disappointed' | 'proud' | 'sleepy' | 'energetic';
  className?: string;
  animated?: boolean;
  isListening?: boolean;
  isThinking?: boolean;
  isSpeaking?: boolean;
  isAnalyzing?: boolean;
  interactionType?: 'chat' | 'voice' | 'general';
}

export const PatAvatar: React.FC<PatAvatarProps> = ({ 
  size = 128, 
  mood = 'neutral',
  className = '',
  animated = true,
  isListening = false,
  isThinking = false,
  isSpeaking = false,
  isAnalyzing = false,
  interactionType = 'general'
}) => {
  const [eyeState, setEyeState] = useState<'default' | 'blink' | 'squint' | 'wide' | 'sleepy' | 'thinking'>('default');
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [thinkingDots, setThinkingDots] = useState(0);

  // Override mood based on interaction states
  const getEffectiveMood = () => {
    if (isAnalyzing) return 'thinking';
    if (isThinking) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (isListening) return 'listening';
    return mood;
  };

  const effectiveMood = getEffectiveMood();

  // Get mood-specific colors and animations
  const getMoodStyles = () => {
    // Override with interaction type colors when specified
    if (interactionType === 'chat') {
      return {
        gradient: 'from-blue-600 to-blue-400',
        glow: 'rgba(59, 130, 246, 0.4)',
        eyeShape: 'default',
        pulseSpeed: 1,
        brightness: 1
      };
    }
    
    if (interactionType === 'voice') {
      return {
        gradient: 'from-green-600 to-emerald-500',
        glow: 'rgba(16, 185, 129, 0.4)',
        eyeShape: 'default',
        pulseSpeed: 1.2,
        brightness: 1.05
      };
    }
    
    // Original mood-based styling for 'general' interaction type
    switch (effectiveMood) {
      case 'thinking':
        return {
          gradient: 'from-purple-600 to-indigo-500',
          glow: 'rgba(139, 92, 246, 0.4)',
          eyeShape: 'thinking',
          pulseSpeed: 0.8,
          brightness: 1.1
        };
      case 'happy':
        return {
          gradient: 'from-green-500 to-emerald-400',
          glow: 'rgba(34, 197, 94, 0.4)',
          eyeShape: 'default',
          pulseSpeed: 1.5,
          brightness: 1.2
        };
      case 'excited':
        return {
          gradient: 'from-yellow-500 to-orange-400',
          glow: 'rgba(245, 158, 11, 0.5)',
          eyeShape: 'wide',
          pulseSpeed: 2,
          brightness: 1.3
        };
      case 'concerned':
        return {
          gradient: 'from-orange-500 to-red-400',
          glow: 'rgba(249, 115, 22, 0.4)',
          eyeShape: 'squint',
          pulseSpeed: 0.8,
          brightness: 0.9
        };
      case 'disappointed':
        return {
          gradient: 'from-red-500 to-red-600',
          glow: 'rgba(239, 68, 68, 0.5)',
          eyeShape: 'squint',
          pulseSpeed: 0.5,
          brightness: 0.8
        };
      case 'proud':
        return {
          gradient: 'from-purple-500 to-pink-400',
          glow: 'rgba(168, 85, 247, 0.4)',
          eyeShape: 'default',
          pulseSpeed: 1.2,
          brightness: 1.1
        };
      case 'sleepy':
        return {
          gradient: 'from-indigo-600 to-purple-500',
          glow: 'rgba(99, 102, 241, 0.3)',
          eyeShape: 'sleepy',
          pulseSpeed: 0.6,
          brightness: 0.7
        };
      case 'energetic':
        return {
          gradient: 'from-cyan-500 to-blue-400',
          glow: 'rgba(6, 182, 212, 0.5)',
          eyeShape: 'wide',
          pulseSpeed: 2.5,
          brightness: 1.4
        };
      case 'speaking':
        return {
          gradient: 'from-blue-600 to-blue-400',
          glow: 'rgba(255, 255, 255, 0.6)',
          eyeShape: 'default',
          pulseSpeed: 1.8,
          brightness: 1.1
        };
      case 'listening':
        return {
          gradient: 'from-green-600 to-teal-500',
          glow: 'rgba(16, 185, 129, 0.4)',
          eyeShape: 'default',
          pulseSpeed: 1.2,
          brightness: 1.05
        };
      default: // neutral
        return {
          gradient: 'from-blue-600 to-blue-400',
          glow: 'rgba(255, 255, 255, 0.5)',
          eyeShape: 'default',
          pulseSpeed: 1,
          brightness: 1
        };
    }
  };

  const moodStyles = getMoodStyles();

  // Thinking animation
  useEffect(() => {
    if (effectiveMood === 'thinking') {
      const interval = setInterval(() => {
        setThinkingDots(prev => (prev + 1) % 4);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [effectiveMood]);

  useEffect(() => {
    if (!animated) return;

    let blinkInterval: NodeJS.Timeout;
    let pulseInterval: NodeJS.Timeout;

    // Blinking animation based on mood
    const getBlinkFrequency = () => {
      if (effectiveMood === 'thinking') return 1500;
      if (effectiveMood === 'sleepy') return 2000;
      if (effectiveMood === 'excited') return 400;
      if (effectiveMood === 'listening') return 1200;
      return 800;
    };

    const blinkFrequency = getBlinkFrequency();
    
    blinkInterval = setInterval(() => {
      if (effectiveMood === 'thinking') {
        // Special thinking blink pattern
        setEyeState('thinking');
        setTimeout(() => {
          setEyeState('blink');
          setTimeout(() => {
            setEyeState('thinking');
          }, 100);
        }, Math.random() * blinkFrequency);
      } else {
        setEyeState(moodStyles.eyeShape as any);
        setTimeout(() => {
          setEyeState('blink');
          setTimeout(() => {
            setEyeState(moodStyles.eyeShape as any);
          }, 150);
        }, Math.random() * blinkFrequency);
      }
    }, blinkFrequency + Math.random() * 1000);

    // Pulse animation for glow effect
    if (effectiveMood === 'excited' || effectiveMood === 'energetic' || effectiveMood === 'listening') {
      pulseInterval = setInterval(() => {
        setPulseIntensity(prev => prev === 1 ? 1.5 : 1);
      }, 1000 / moodStyles.pulseSpeed);
    }

    return () => {
      clearInterval(blinkInterval);
      if (pulseInterval) clearInterval(pulseInterval);
    };
  }, [effectiveMood, animated, moodStyles.eyeShape, moodStyles.pulseSpeed]);

  // Get eye dimensions based on state and mood
  const getEyeDimensions = () => {
    const baseWidth = size > 50 ? 16 : 8;
    const baseHeight = size > 50 ? 22 : 12;
    
    switch (eyeState) {
      case 'blink':
        return { width: baseWidth, height: size > 50 ? 4 : 2 };
      case 'squint':
        return { width: baseWidth * 0.8, height: baseHeight * 0.7 };
      case 'wide':
        return { width: baseWidth * 1.2, height: baseHeight * 1.3 };
      case 'sleepy':
        return { width: baseWidth, height: baseHeight * 0.5 };
      case 'thinking':
        return { width: baseWidth * 0.9, height: baseHeight * 0.8 };
      default:
        return { width: baseWidth, height: baseHeight };
    }
  };

  const eyeDimensions = getEyeDimensions();

  // Additional visual elements based on mood
  const renderMoodElements = () => {
    if (effectiveMood === 'thinking') {
      // Thinking dots above Pat's head
      return (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 bg-white rounded-full transition-opacity duration-300 ${
                i <= thinkingDots ? 'opacity-100' : 'opacity-30'
              }`}
            />
          ))}
        </div>
      );
    }

    if (effectiveMood === 'listening') {
      // Sound waves for listening
      return (
        <div className="absolute -right-4 top-1/2 transform -translate-y-1/2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute w-1 bg-green-400 rounded-full animate-pulse"
              style={{
                height: `${8 + i * 4}px`,
                right: `${i * 6}px`,
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      );
    }

    if (effectiveMood === 'happy' || effectiveMood === 'excited') {
      // Sparkles for happy/excited moods
      return (
        <>
          <div 
            className="absolute animate-ping"
            style={{
              top: '20%',
              right: '15%',
              width: size * 0.08,
              height: size * 0.08,
              background: 'white',
              borderRadius: '50%',
              animationDuration: '2s'
            }}
          />
          <div 
            className="absolute animate-ping"
            style={{
              bottom: '25%',
              left: '10%',
              width: size * 0.06,
              height: size * 0.06,
              background: 'white',
              borderRadius: '50%',
              animationDuration: '2.5s',
              animationDelay: '0.5s'
            }}
          />
        </>
      );
    }
    
    if (effectiveMood === 'sleepy') {
      // Z's for sleepy mood
      return (
        <div className="absolute -top-2 -right-2 text-white opacity-70 animate-pulse">
          <span style={{ fontSize: size * 0.15 }}>💤</span>
        </div>
      );
    }

    return null;
  };

  // Get animation classes
  const getAnimationClasses = () => {
    if (effectiveMood === 'listening') return 'animate-pulse';
    if (effectiveMood === 'excited') return 'animate-pulse';
    if (effectiveMood === 'energetic') return 'animate-pulse';
    if (effectiveMood === 'thinking') return 'animate-pulse';
    return '';
  };

  return (
    <div className={`relative ${className}`}>
      <motion.div
        animate={animated ? {
          scale: isThinking ? [1, 1.1, 1] : isSpeaking ? [1, 1.05, 1] : 1,
          rotate: isSpeaking ? [0, 3, -3, 0] : 0,
        } : {}}
        transition={{
          duration: isThinking ? 1.5 : isSpeaking ? 0.5 : 0.3,
          repeat: (isThinking || isSpeaking) ? Infinity : 0,
          ease: "easeInOut"
        }}
        className="relative"
      >
        {/* Thinking pulse glow ring */}
        {isThinking && (
          <motion.div
            className="absolute inset-0 rounded-full bg-blue-500/20"
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.3, 0, 0.3]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        <div 
          className={`relative mx-auto rounded-full bg-gradient-to-br ${moodStyles.gradient} transition-all duration-500 ${getAnimationClasses()}`}
          style={{
            width: size,
            height: size,
            filter: `brightness(${moodStyles.brightness})`,
            boxShadow: size > 50 
              ? `0 0 ${40 * pulseIntensity}px ${6 * pulseIntensity}px ${moodStyles.glow}` 
              : `0 0 ${20 * pulseIntensity}px ${3 * pulseIntensity}px ${moodStyles.glow}`,
            animation: effectiveMood === 'listening' ? 'pulse 2s infinite' : 
                      effectiveMood === 'excited' ? 'pulse 0.8s infinite' :
                      effectiveMood === 'energetic' ? 'pulse 0.6s infinite' :
                      effectiveMood === 'thinking' ? 'pulse 1.5s infinite' : undefined
          }}
        >
        {/* Eyes */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`flex items-center ${size > 50 ? 'gap-9' : 'gap-3'}`}>
            <div 
              className={`bg-white transition-all duration-150 ${
                eyeState === 'blink' || eyeState === 'sleepy' ? 'rounded-full' : 'rounded-lg'
              } ${effectiveMood === 'thinking' ? 'animate-pulse' : ''}`}
              style={{
                width: eyeDimensions.width,
                height: eyeDimensions.height,
              }}
            />
            <div 
              className={`bg-white transition-all duration-150 ${
                eyeState === 'blink' || eyeState === 'sleepy' ? 'rounded-full' : 'rounded-lg'
              } ${effectiveMood === 'thinking' ? 'animate-pulse' : ''}`}
              style={{
                width: eyeDimensions.width,
                height: eyeDimensions.height,
              }}
            />
          </div>
        </div>

        {/* Mood-specific visual elements */}
        {renderMoodElements()}

        {/* Mouth indicator for speaking */}
        {effectiveMood === 'speaking' && (
          <div 
            className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 bg-white/30 rounded-full animate-pulse"
            style={{
              width: size * 0.2,
              height: size * 0.1,
            }}
          />
        )}

        {/* Listening indicator ring */}
        {effectiveMood === 'listening' && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping"
            style={{
              animationDuration: '2s'
            }}
          />
        )}
      </div>

        {/* Status text for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">
            {effectiveMood}
            {isListening && ' (listening)'}
            {isThinking && ' (thinking)'}
            {isSpeaking && ' (speaking)'}
          </div>
        )}
      </motion.div>
    </div>
  );
};