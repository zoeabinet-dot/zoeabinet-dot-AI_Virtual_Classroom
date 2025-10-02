// FIX: Removed erroneous file markers that were causing syntax errors.
import React from 'react';
import { ChevronLeft, ChevronRight, XCircle, Volume2, VolumeX, Sparkles, RefreshCw, Play, Pause } from 'lucide-react';

interface ControlPanelProps {
  currentStepIndex: number;
  totalSteps: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onEndSession: () => void;
  onRegenerate: () => void;
  isAdapting: boolean;
  isAutoplay: boolean;
  onToggleAutoplay: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  autoplayProgress: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  currentStepIndex,
  totalSteps,
  onPrevStep,
  onNextStep,
  onEndSession,
  onRegenerate,
  isAdapting,
  isAutoplay,
  onToggleAutoplay,
  isMuted,
  onToggleMute,
  autoplayProgress
}) => {
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 space-y-3 h-[98px] flex flex-col justify-center">
      <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={onPrevStep}
            disabled={isFirstStep}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous Step"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 w-20 text-center">
            Step {currentStepIndex + 1} / {totalSteps}
          </span>
          <button
            onClick={onNextStep}
            disabled={isLastStep && !isAutoplay}
            className="p-3 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next Step"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
           <button onClick={onToggleMute} className={`p-3 rounded-full transition-colors ${!isMuted ? 'bg-indigo-200 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
            </button>
             <button onClick={onToggleAutoplay} className={`p-3 rounded-full transition-colors ${isAutoplay ? 'bg-green-200 dark:bg-green-900 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                {isAutoplay ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
            </button>
             <button onClick={onRegenerate} disabled={isAdapting} className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900 disabled:opacity-50">
                <RefreshCw className="h-6 w-6" />
            </button>
        </div>
        
        <button
          onClick={onEndSession}
          className="px-4 py-2 flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow-md transition-colors"
          aria-label="End Lesson"
        >
          <XCircle className="h-5 w-5" />
          <span>End Lesson</span>
        </button>
      </div>
      {isAutoplay && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 absolute bottom-4 left-0 right-0 px-4">
          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `calc(100% - 2rem) * ${autoplayProgress / 100}`, transition: autoplayProgress > 0 ? 'width 1s linear' : 'none', marginLeft: '1rem', marginRight: '1rem' }}></div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;
