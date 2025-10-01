
// FIX: Removed erroneous file header that was causing a syntax error.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { LessonPlan, LessonResult, ChatMessage } from '../types';
import { LessonStepType, EngagementLevel } from '../types';
import Whiteboard from './Whiteboard';
import ControlPanel from './ControlPanel';
import ChatPanel from './ChatPanel';
import StudentEngagementMonitor from './StudentEngagementMonitor';
import PerformanceDashboard from './PerformanceDashboard';
import { regenerateStepContent, getAdaptiveSuggestion, generateImage } from '../services/geminiService';
import { speak, stopSpeaking } from '../services/speechService';
import { ThumbsUp } from 'lucide-react';
import SmartWhiteboard from './SmartWhiteboard';

interface VirtualClassroomProps {
  lessonPlan: LessonPlan;
  onEndSession: (result?: LessonResult) => void;
}

const VirtualClassroom: React.FC<VirtualClassroomProps> = ({ lessonPlan, onEndSession }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentLessonPlan, setCurrentLessonPlan] = useState<LessonPlan>(lessonPlan);
  const [quizAnswers, setQuizAnswers] = useState<boolean[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [engagementLevel, setEngagementLevel] = useState<EngagementLevel>(EngagementLevel.HIGH);
  const [isAdapting, setIsAdapting] = useState(false);
  const [lessonFinished, setLessonFinished] = useState(false);
  const [lessonResult, setLessonResult] = useState<LessonResult | null>(null);
  const [suggestionMadeForStep, setSuggestionMadeForStep] = useState<number | null>(null);

  const [isAutoplay, setIsAutoplay] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayProgress, setAutoplayProgress] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const autoplayIntervalRef = useRef<number | null>(null);
  const smartWhiteboardRef = useRef<{ 
    getCanvasState: () => { json: any; image: string }; 
    aiAddText: (text: string, options: any) => void;
    aiAddShape: (shapeType: string, options: any) => void;
    aiAddImage: (imageUrl: string, options: any) => void;
    aiClearCanvas: () => void;
  }>(null);
  
  const currentStep = currentLessonPlan.steps[currentStepIndex];

  const stopAutoplayTimer = () => {
    if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
        autoplayIntervalRef.current = null;
    }
    setAutoplayProgress(0);
  };
  
  const finishLesson = useCallback(() => {
    stopSpeaking();
    setIsAutoplay(false);
    const totalQuizzes = currentLessonPlan.steps.filter(s => s.type === LessonStepType.QUIZ).length;
    const correctAnswers = quizAnswers.filter(Boolean).length;
    const score = totalQuizzes > 0 ? Math.round((correctAnswers / totalQuizzes) * 100) : 100;
    const xpEarned = 10 + (correctAnswers * 10) + (score === 100 ? 20 : 0);

    const result: LessonResult = {
      id: crypto.randomUUID(),
      topic: currentLessonPlan.topic, subject: currentLessonPlan.subject, grade: currentLessonPlan.grade,
      score, correctAnswers, totalQuizzes,
      completedAt: new Date().toISOString(),
      lessonPlan: currentLessonPlan, xpEarned,
    };
    
    setLessonResult(result);
    setLessonFinished(true);
  }, [currentLessonPlan, quizAnswers]);


  const handleNextStep = useCallback(() => {
    setHasInteracted(true);
    stopSpeaking();
    stopAutoplayTimer();
    if (currentStepIndex < currentLessonPlan.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      finishLesson();
    }
  }, [currentStepIndex, currentLessonPlan.steps.length, finishLesson]);

  // Autoplay timer effect
  useEffect(() => {
    if (isAutoplay) {
      const stepDurationSeconds = (currentStep.duration || 1) * 60;
      let secondsElapsed = 0;
      
      autoplayIntervalRef.current = window.setInterval(() => {
        secondsElapsed++;
        setAutoplayProgress((secondsElapsed / stepDurationSeconds) * 100);
        
        if (secondsElapsed >= stepDurationSeconds) {
          handleNextStep();
        }
      }, 1000);
    } else {
      stopAutoplayTimer();
    }

    return () => {
        stopAutoplayTimer();
    };
  }, [isAutoplay, currentStepIndex, currentStep.duration, handleNextStep]);

  // TTS effect
  useEffect(() => {
    if (!isMuted && hasInteracted) {
      let textToSpeak = currentStep.content;
      if (currentStep.type === LessonStepType.QUIZ && currentStep.quizOptions) {
        textToSpeak += ' Your options are: ' + currentStep.quizOptions.map(o => o.option).join(', ');
      }
      speak(textToSpeak, () => {});
    } else {
      stopSpeaking();
    }
    return () => stopSpeaking();
  }, [currentStepIndex, currentStep, isMuted, hasInteracted]);
  
  // Adaptive teaching effect for low engagement
  useEffect(() => {
    const handleLowEngagement = async () => {
        if (engagementLevel === EngagementLevel.LOW && !isAdapting && suggestionMadeForStep !== currentStepIndex) {
            setSuggestionMadeForStep(currentStepIndex);
            stopSpeaking();
            setIsAutoplay(false);

            const suggestionText = await getAdaptiveSuggestion(currentStep.content, engagementLevel);
            
            const suggestionMessage: ChatMessage = {
                sender: 'ai',
                text: suggestionText,
                suggestion: {
                    label: "Yes, let's try another way!",
                    action: 'regenerate',
                }
            };
            setMessages(prev => [...prev, suggestionMessage]);
        }
    };

    const timer = setTimeout(handleLowEngagement, 2000);
    return () => clearTimeout(timer);
  }, [engagementLevel, currentStepIndex, isAdapting, suggestionMadeForStep, currentStep.content]);

  useEffect(() => {
    setSuggestionMadeForStep(null);
  }, [currentStepIndex]);

  const handlePrevStep = () => {
    setHasInteracted(true);
    stopSpeaking();
    stopAutoplayTimer();
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleQuizAnswer = (isCorrect: boolean) => {
    setQuizAnswers(prev => [...prev, isCorrect]);
    setTimeout(() => {
        handleNextStep();
    }, 2000);
  };

  const handleEngagementChange = useCallback((level: EngagementLevel) => {
    setEngagementLevel(level);
  }, []);

  const handleRaiseHand = () => {
    setHasInteracted(true);
    stopSpeaking();
    setIsAutoplay(false);
    setMessages(prev => [...prev, { sender: 'ai', text: "I see you've raised your hand! What's your question?" }]);
  };

  const handleRegenerate = async () => {
    setHasInteracted(true);
    setIsAdapting(true);
    stopSpeaking();
    const newContent = await regenerateStepContent(currentStep, engagementLevel);
    const newSteps = [...currentLessonPlan.steps];
    newSteps[currentStepIndex] = { ...currentStep, content: newContent };
    setCurrentLessonPlan({ ...currentLessonPlan, steps: newSteps });
    setIsAdapting(false);
  };

  const handleSuggestionAction = (action: 'regenerate') => {
    if (action === 'regenerate') {
        setMessages(prev => [...prev, { sender: 'ai', text: "Great! Let's rephrase this..." }]);
        handleRegenerate();
    }
  };

  const handleEndLesson = useCallback(() => {
    setHasInteracted(true);
    finishLesson();
  }, [finishLesson]);
  
  const handleToggleMute = () => {
    setHasInteracted(true);
    setIsMuted(prev => !prev);
  }

  const handleAiAddImage = async (prompt: string, options: any) => {
    if (!smartWhiteboardRef.current) return;
    try {
        const imageUrl = await generateImage(prompt);
        smartWhiteboardRef.current.aiAddImage(imageUrl, options || {});
    } catch(error) {
        console.error("Failed to add AI image to whiteboard:", error);
        setMessages(prev => [...prev, { sender: 'ai', text: "I tried to create an image, but something went wrong. Let's try that again later." }]);
    }
  };

  const handleAiToolCall = (toolCall: { name: string; args: any }) => {
    if (!smartWhiteboardRef.current) return;
    
    switch (toolCall.name) {
      case 'addText':
        smartWhiteboardRef.current.aiAddText(toolCall.args.text, toolCall.args.options || {});
        break;
      case 'addShape':
        smartWhiteboardRef.current.aiAddShape(toolCall.args.shapeType, toolCall.args.options || {});
        break;
      case 'addImage':
        handleAiAddImage(toolCall.args.prompt, toolCall.args.options || {});
        break;
      case 'clearCanvas':
        smartWhiteboardRef.current.aiClearCanvas();
        break;
      default:
        console.warn(`Unknown AI tool called: ${toolCall.name}`);
    }
  };

  const getWhiteboardState = () => {
      if (smartWhiteboardRef.current) {
          return smartWhiteboardRef.current.getCanvasState();
      }
      return null;
  };

  if (lessonFinished && lessonResult) {
    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-fade-in">
            <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Lesson Complete!</h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Here's your performance summary for "{lessonResult.topic}".</p>
            <PerformanceDashboard lessonResult={lessonResult} />
            <div className="mt-8 text-center">
                 <button onClick={() => onEndSession(lessonResult)} className="w-full max-w-xs mx-auto flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    <ThumbsUp className="h-5 w-5" />
                    <span>Finish and Return to Dashboard</span>
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col space-y-6">
          <Whiteboard step={currentStep} onQuizAnswer={handleQuizAnswer} isAdapting={isAdapting} />
           <ControlPanel
                currentStepIndex={currentStepIndex}
                totalSteps={currentLessonPlan.steps.length}
                onNextStep={handleNextStep}
                onPrevStep={handlePrevStep}
                onEndSession={handleEndLesson}
                onRegenerate={handleRegenerate}
                isAdapting={isAdapting}
                isAutoplay={isAutoplay}
                onToggleAutoplay={() => { setHasInteracted(true); setIsAutoplay(prev => !prev); }}
                isMuted={isMuted}
                onToggleMute={handleToggleMute}
                autoplayProgress={autoplayProgress}
            />
          <SmartWhiteboard ref={smartWhiteboardRef} />
        </div>
        <div className="space-y-6">
          <ChatPanel 
            messages={messages} setMessages={setMessages} 
            lessonContext={`${currentLessonPlan.topic} - ${currentStep.title}`}
            onRaiseHand={handleRaiseHand}
            onSuggestionAction={handleSuggestionAction}
            onAiToolCall={handleAiToolCall}
            getWhiteboardState={getWhiteboardState}
           />
          <StudentEngagementMonitor onEngagementChange={handleEngagementChange} />
        </div>
      </div>
    </div>
  );
};

export default VirtualClassroom;
