import React, { useState, useRef, useEffect } from 'react';
import { PatAvatar } from './PatAvatar';
import { VoiceWaveform } from './VoiceWaveform';
import { ConversationAgentManager } from '../utils/conversationAgents';
import { AnalysedFoodItem } from '../types/food';
import { Folder, Video, Image, Upload, Share, Plus, Mic, X, Camera, RotateCcw, ArrowLeft } from 'lucide-react';
import { fetchFoodMacros } from '../lib/food';
import { useNavigate } from 'react-router-dom';

interface TalkingPatPage2Props {
  initialState?: {
    autoStartMode?: 'takePhoto' | 'videoStream';
  };
}

export const TalkingPatPage2: React.FC<TalkingPatPage2Props> = ({ initialState }) => {
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [caption, setCaption] = useState("Choose how you'd like to share with me");
  const [triggeredAgent, setTriggeredAgent] = useState<string>('');

  // Phase 2: Real-time streaming states
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingItems, setStreamingItems] = useState<AnalysedFoodItem[]>([]);
  const [boundingBoxes, setBoundingBoxes] = useState<Array<{x: number, y: number, w: number, h: number, label: string, conf: number}>>([]);
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [lastFrameTime, setLastFrameTime] = useState(0);

  // Refs for camera elements
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Stop streaming function
  const stopStreaming = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (wsConnection) {
      wsConnection.close();
      setWsConnection(null);
    }
    setIsStreaming(false);
    setStreamingItems([]);
    setBoundingBoxes([]);
    setFrameCount(0);
    setLastFrameTime(0);
  };

  const options = [
    { id: 'video', label: 'Video', icon: Video },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'take', label: 'Take Photo', icon: Video },
    { id: 'screen', label: 'Share Screen', icon: Share },
  ];

  // Initialize camera when component mounts or when take photo is selected
  const initializeCamera = async () => {
    try {
      setCameraError('');
      setCaption('Requesting camera access...');
      
      console.log('Starting camera initialization...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Prefer back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      console.log('Camera stream obtained:', stream);
      streamRef.current = stream;
      
      console.log('Setting video srcObject...');
      videoRef.current!.srcObject = stream;
      
      // Wait for metadata to load before playing
      videoRef.current!.onloadedmetadata = async () => {
        console.log('Video metadata loaded, attempting to play...');
        try {
          await videoRef.current!.play();
          console.log('Video playing successfully');
          setIsCameraActive(true);
          setCaption('Camera ready! Position your food in the frame and tap the camera button to capture.');
        } catch (playError) {
          console.error('Error playing video:', playError);
          if (playError instanceof Error && playError.name === 'NotAllowedError') {
            setCaption('Tap the video to start playback.');
            setCameraError('Video playback requires user interaction. Please tap the video.');
          } else {
            setCaption('Camera access granted but video failed to start. Please try again.');
            setCameraError('Video playback failed. This might be a browser restriction.');
          }
        }
      };
      
      // Add error handler for video element
      videoRef.current!.onerror = (error) => {
        console.error('Video element error:', error);
        setCaption('Video playback error. Please try again.');
        setCameraError('Video element failed to load the stream.');
      };
      
      // Fallback: try to play immediately as well
      try {
        await videoRef.current!.play();
        console.log('Video playing immediately');
        setIsCameraActive(true);
        setCaption('Camera ready! Position your food in the frame and tap the camera button to capture.');
      } catch (playError) {
        if (playError instanceof Error && playError.name === 'NotAllowedError') {
          setCaption('Tap the video to start playback.');
          setCameraError('Video playback requires user interaction. Please tap the video.');
        } else {
          console.log('Immediate play failed, waiting for metadata...', playError);
          // This is expected on some browsers, onloadedmetadata will handle it
        }
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported in this browser.';
      } else {
        errorMessage += 'Please check your camera and try again.';
      }
      
      setCameraError(errorMessage);
      setCaption(errorMessage);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    stopStreaming();
    setIsCameraActive(false);
    setCapturedImage(null);
    setAnalysisResult(null);
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas element not available');
      return;
    }

    setIsAnalyzing(true);
    setCaption('Analyzing your food...');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) {
      console.error('Could not get 2D context from canvas');
      setIsAnalyzing(false);
      setCaption('Failed to capture image. Please try again.');
      return;
    }

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to blob and send for analysis
    canvas.toBlob((blob) => {
      if (blob) {
        // Store captured image as data URL for preview
        const imageDataURL = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageDataURL);
        
        // Send to backend for analysis
        sendImageForAnalysis(blob);
      } else {
        console.error('Failed to create blob from canvas');
        setIsAnalyzing(false);
        setCaption('Failed to capture image. Please try again.');
      }
    }, 'image/jpeg', 0.8);
  };

  // Send image to backend for analysis
  const sendImageForAnalysis = async (imageBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('image', imageBlob, 'meal_photo.jpeg');
      
      // Simulate image analysis delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For Phase 1, we'll use a simple mock recognition and then use OpenAI for macros
      // In future phases, this could be replaced with actual computer vision
      const recognizedFoods = [
        'Grilled Chicken Breast',
        'Brown Rice', 
        'Steamed Broccoli'
      ];
      
      // Pick a random food for demo purposes
      const recognizedFood = recognizedFoods[Math.floor(Math.random() * recognizedFoods.length)];
      
      setCaption(`I see ${recognizedFood}! Let me get the nutrition information...`);
      setIsAnalyzing(false);
      
      // Use OpenAI to get macros for the recognized food
      try {
        const reply = await fetchFoodMacros(recognizedFood);

        if (reply.ok && reply.macros) {
          const macroData = reply.macros;
          
          // Create analysis result for the drawer
          const analysisResult: any = {
            foods: [{
              id: crypto.randomUUID(),
              name: recognizedFood,
              confidence: 0.85,
              grams: 100,
              macros: macroData,
              portionSize: 'M',
              unit: 'piece'
            }],
            totalCalories: macroData.kcal,
            macros: {
              protein: macroData.protein_g,
              carbs: macroData.carbs_g,
              fat: macroData.fat_g
            },
            confidence: 0.85
          };
          
          setAnalysisResult(analysisResult);
        } else {
          // Fallback to manual entry if macro lookup fails
          console.error('fetchFoodMacros error:', reply.error);
          setCaption(`I detected ${recognizedFood}, but couldn't get nutrition info. Please enter manually.`);
        }
      } catch (error) {
        console.error('Error getting macros for recognized food:', error);
        setCaption(`I detected ${recognizedFood}, but couldn't get nutrition info. Please enter manually.`);
      }
      
      // Stop camera and reset states
      stopCamera();
      
    } catch (error) {
      console.error('Analysis error:', error);
      setIsAnalyzing(false);
      setCaption('Sorry, I had trouble analyzing your food. Please try again.');
    }
  };

  // Reset to initial state
  const resetCapture = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setCaption('Camera ready! Position your food in the frame and tap the camera button to capture.');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  const handleOptionSelect = (optionId: string) => {
    setSelectedOption(optionId);
    
    if (optionId === 'take') {
      // Initialize camera for photo capture
      initializeCamera();
    } else {
      // Handle other options (existing logic)
      setIsAnalyzing(true);
      
      // Get the agent context if we came from a "Show me" bubble
      const agentContext = triggeredAgent || 'visual-meal-tracker';
      
      setCaption(`Analyzing with ${ConversationAgentManager.getAgentById(agentContext)?.title || 'Pat'}...`);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setCaption("Perfect setup! I can see you're ready to work out. What exercise are we starting with?");
      }, 2000);
    }
  };

  // Check if we came from a "Show me" bubble (could be passed via navigation state)
  React.useEffect(() => {
    // Set triggered agent based on navigation state
    if (initialState?.autoStartMode === 'takePhoto') {
      setTriggeredAgent('visual-meal-tracker');
    } else if (initialState?.autoStartMode === 'videoStream') {
      setTriggeredAgent('live-workout-trainer');
    } else {
      setTriggeredAgent('visual-meal-tracker');
    }
  }, [initialState]);

  // Auto-start camera based on initial state
  React.useEffect(() => {
    if (initialState?.autoStartMode) {
      if (initialState.autoStartMode === 'takePhoto') {
        handleOptionSelect('take');
      } else if (initialState.autoStartMode === 'videoStream') {
        handleOptionSelect('video');
      }
    }
  }, [initialState]);

  return (
    <div className="h-screen bg-pat-gradient flex flex-col pt-[44px]">
      {/* In-content back button */}
      <div className="absolute top-12 left-4 z-10">
        <button
          onClick={() => navigate('/voice')}
          className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
          aria-label="Back to Voice"
        >
          <ArrowLeft size={24} />
        </button>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-white">
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Camera Feed */}
        {selectedOption === 'take' && (
          <div className="w-full px-4 mb-6">
            <div className="w-full aspect-video border-4 border-green-500 rounded-xl shadow-lg overflow-hidden relative">
              <video 
                ref={videoRef}
                id="pat-camera" 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover ${!isCameraActive ? 'hidden' : ''}`}
              />
              <canvas 
                ref={canvasRef}
                id="pat-canvas" 
                className="hidden" 
              />
            </div>
            
            {/* Camera Controls Below Viewing Area */}
            {isCameraActive && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  onClick={capturePhoto}
                  disabled={isAnalyzing}
                  className="w-16 h-16 bg-white hover:bg-gray-100 disabled:bg-gray-300 rounded-full flex items-center justify-center shadow-lg transition-colors"
                >
                  <Camera size={24} className="text-gray-700" />
                </button>
                
                {(capturedImage || analysisResult) && (
                  <button
                    onClick={resetCapture}
                    className="w-12 h-12 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center shadow-lg transition-colors"
                  >
                    <RotateCcw size={20} className="text-gray-700" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !isCameraActive && (
          <div className="w-full px-4 mb-6">
            <div className="w-full aspect-video border-4 border-green-500 rounded-xl shadow-lg overflow-hidden">
              <img 
                src={capturedImage} 
                alt="Captured meal" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && (
          <div className="w-full mb-6 p-4 bg-green-50 border border-green-200 rounded-xl max-w-md mx-auto">
            <h3 className="font-semibold text-green-900 mb-2">Analysis Results</h3>
            <div className="space-y-2">
              {analysisResult.foods.map((food: any, index: number) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-green-800">{food.name}</span>
                  <span className="text-green-600">{food.grams}g</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-green-200">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-green-900">Total Calories:</span>
                <span className="text-green-700">{analysisResult.totalCalories}</span>
              </div>
              <div className="flex justify-between text-xs text-green-600 mt-1">
                <span>P: {analysisResult.macros.protein}g</span>
                <span>C: {analysisResult.macros.carbs}g</span>
                <span>F: {analysisResult.macros.fat}g</span>
              </div>
            </div>
          </div>
        )}

        {/* Pat Avatar */}
        {(!isCameraActive || isAnalyzing) && (
        <PatAvatar 
          size={128} 
          mood={analysisResult ? 'happy' : 'neutral'}
          isAnalyzing={isAnalyzing}
          className="mb-6"
        />
        )}
        
        <VoiceWaveform 
          isActive={isAnalyzing}
          color="bg-yellow-400"
          className="mb-8"
        />
        
        {/* Option Selection Grid - Only show if camera is not active */}
        {selectedOption === '' && !capturedImage && (
          <div className="grid grid-cols-2 gap-4 mb-8 w-full max-w-sm">
          {options.map((option) => { // eslint-disable-next-line react/jsx-key
            const IconComponent = option.icon;
            return (
              <button
                key={option.id}
                onClick={() => handleOptionSelect(option.id)}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  selectedOption === option.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <IconComponent size={24} className="mx-auto mb-2 text-gray-700" />
                <p className="text-sm font-medium text-gray-900">{option.label}</p>
              </button>
            );
          })}
          </div>
        )}
        
        <p className="text-center font-medium max-w-xs leading-relaxed">
          {caption}
        </p>

        {/* Error Display */}
        {cameraError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg max-w-xs">
            <p className="text-red-800 text-sm text-center">{cameraError}</p>
          </div>
        )}
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 rounded-3xl">
          {/* Back/Cancel Button */}
          <button
            onClick={() => {
              if (selectedOption === 'take' || capturedImage) {
                stopCamera();
                setSelectedOption('');
                setCaption("Choose how you'd like to share with me");
              } else {
                navigate('/voice');
              }
            }}
            className="p-3 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={26} className="text-gray-700" />
          </button>

          <button className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-all">
            <Mic size={26} />
          </button>
        </div>
      </div>
      </div>

    </div>
  );
};