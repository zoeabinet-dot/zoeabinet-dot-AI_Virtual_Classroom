import React, { useState, useEffect } from 'react';
import { LessonStep, LessonStepType, QuizOption } from '../types';
import { generateImage } from '../services/geminiService';
import { Loader2, Lightbulb, CheckCircle, XCircle, FileQuestion, Activity, BrainCircuit } from 'lucide-react';

interface WhiteboardProps {
  step: LessonStep;
  onQuizAnswer: (isCorrect: boolean) => void;
  isAdapting: boolean;
}

const stepIcons: { [key in LessonStepType]: React.ReactElement } = {
  [LessonStepType.LECTURE]: <Lightbulb className="h-6 w-6 text-blue-500" />,
  [LessonStepType.IMAGE]: <FileQuestion className="h-6 w-6 text-green-500" />,
  [LessonStepType.QUIZ]: <FileQuestion className="h-6 w-6 text-purple-500" />,
  [LessonStepType.ACTIVITY]: <Activity className="h-6 w-6 text-orange-500" />,
};

const formatContent = (text: string) => {
    const lines = text.split('\n');
    let inList = false;
    const processedLines = lines.map(line => {
        if (line.trim() === '') return '<br />';
        if (line.startsWith('### ')) return `<h3>${line.substring(4)}</h3>`;
        
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        if (line.match(/^(\s*(\*|-)\s+)/)) {
            let listItem = `<li>${line.replace(/^(\s*(\*|-)\s+)/, '')}</li>`;
            if (!inList) {
                inList = true;
                return `<ul>` + listItem;
            }
            return listItem;
        } else {
            if (inList) {
                inList = false;
                return `</ul>` + `<p>${line}</p>`;
            }
            return `<p>${line}</p>`;
        }
    });

    if (inList) {
        processedLines.push('</ul>');
    }

    const htmlContent = processedLines.join('')
      .replace(/<p><br \/><\/p>/g, '<br />')
      .replace(/<p><\/p>/g, '') 
      .replace(/---/g, '<hr class="my-4"/>')
      .replace(/lesson generally covers:/i, '');

    return { __html: htmlContent };
};

const Whiteboard: React.FC<WhiteboardProps> = ({ step, onQuizAnswer, isAdapting }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<QuizOption | null>(null);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    if (step.type === LessonStepType.IMAGE) {
      const fetchImage = async () => {
        setIsLoading(true);
        setError(null);
        setImageUrl(null);
        try {
          const url = await generateImage(step.content);
          setImageUrl(url);
        } catch (err: any) {
          setError(err.message || 'Failed to load image.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchImage();
    }
    setAnswered(false);
    setSelectedOption(null);
  }, [step]);

  const handleOptionClick = (option: QuizOption) => {
    if (answered) return;
    setSelectedOption(option);
    setAnswered(true);
    onQuizAnswer(option.isCorrect);
  };

  const getOptionClasses = (option: QuizOption) => {
    if (!answered) {
      return "border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/50";
    }
    if (option.isCorrect) {
      return "border-green-500 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300";
    }
    if (option === selectedOption && !option.isCorrect) {
      return "border-red-500 bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300";
    }
    return "border-gray-300 dark:border-gray-700 opacity-60";
  };

  const renderContent = () => {
    switch (step.type) {
      case LessonStepType.IMAGE:
        return (
          <div className="flex flex-col items-center justify-center">
            {isLoading && <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />}
            {error && <p className="text-red-500">{error}</p>}
            {imageUrl && <img src={imageUrl} alt={step.content} className="rounded-lg object-contain max-h-full w-full" />}
            <p className="text-center text-gray-500 dark:text-gray-400 mt-2 text-sm italic">{step.content}</p>
          </div>
        );
      case LessonStepType.QUIZ:
        return (
          <div>
            <p className="text-lg font-semibold mb-4">{step.content}</p>
            <div className="space-y-3">
              {step.quizOptions?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  disabled={answered}
                  className={`w-full text-left p-4 border rounded-lg transition-all flex items-center justify-between ${getOptionClasses(option)}`}
                >
                  <span>{option.option}</span>
                  {answered && option.isCorrect && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {answered && selectedOption === option && !option.isCorrect && <XCircle className="h-5 w-5 text-red-600" />}
                </button>
              ))}
            </div>
            {answered && (
              <div className={`mt-4 text-center font-bold ${selectedOption?.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {selectedOption?.isCorrect ? "Correct! Well done!" : "Not quite, the correct answer is marked in green."}
              </div>
            )}
          </div>
        );
      case LessonStepType.LECTURE:
      case LessonStepType.ACTIVITY:
      default:
        return <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={formatContent(step.content)} />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 h-[524px] relative flex flex-col">
       <div className="flex-shrink-0 flex items-center space-x-3 mb-4 pb-4 border-b dark:border-gray-700">
        {stepIcons[step.type]}
        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{step.title}</h3>
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">{step.duration} min</span>
      </div>
      <div className={`flex-grow overflow-y-auto pr-2 -mr-4 ${isAdapting ? 'opacity-20 blur-sm transition-all' : ''}`}>
        {renderContent()}
      </div>
      {isAdapting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex flex-col items-center justify-center space-y-4 rounded-xl">
          <BrainCircuit className="h-16 w-16 text-indigo-500 animate-pulse" />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">Rethinking the approach...</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">The AI Teacher is preparing a new explanation!</p>
        </div>
      )}
    </div>
  );
};

export default Whiteboard;