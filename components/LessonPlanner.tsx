import React, { useState } from 'react';
import type { LessonPlan, LessonResult, UserStats } from '../types';
import { generateLessonPlan } from '../services/geminiService';
import { Loader2, Wand2, History, Trash2, BarChart, Flame, Star, TrendingUp } from 'lucide-react';

interface LessonPlannerProps {
  userStats: UserStats;
  onLessonPlanGenerated: (plan: LessonPlan) => void;
  lessonHistory: LessonResult[];
  onViewReport: (result: LessonResult) => void;
  onClearHistory: () => void;
}

const subjects = ["Mathematics", "Science", "History", "English", "Geography"];
const grades = ["1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade", "6th Grade", "7th Grade", "8th Grade"];

const LessonPlanner: React.FC<LessonPlannerProps> = ({ userStats, onLessonPlanGenerated, lessonHistory, onViewReport, onClearHistory }) => {
  const [subject, setSubject] = useState(subjects[1]);
  const [grade, setGrade] = useState(grades[4]);
  const [topic, setTopic] = useState("The Solar System");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const plan = await generateLessonPlan(subject, grade, topic);
      onLessonPlanGenerated(plan);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const xpForNextLevel = 100;
  const currentLevelXp = userStats.xp % xpForNextLevel;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
       <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Your Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Star className="mx-auto h-8 w-8 text-yellow-500 mb-2" />
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{userStats.level}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your Level</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <Flame className="mx-auto h-8 w-8 text-orange-500 mb-2" />
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{userStats.streak}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Day Streak</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <TrendingUp className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{userStats.xp}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total XP</p>
            </div>
        </div>
        <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1 text-center">XP to Next Level: {xpForNextLevel - currentLevelXp}</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-indigo-500 h-2.5 rounded-full" style={{width: `${(currentLevelXp / xpForNextLevel) * 100}%`}}></div>
            </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <Wand2 className="mx-auto h-12 w-12 text-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 dark:text-indigo-400 p-2 rounded-full" />
          <h2 className="mt-4 text-3xl font-bold text-gray-900 dark:text-gray-100">Create a New Lesson</h2>
          <p className="mt-2 text-md text-gray-600 dark:text-gray-400">Tell the AI Teacher what you'd like to learn about today.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subject</label>
            <select id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-gray-900 dark:text-gray-200">
              {subjects.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="grade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Grade Level</label>
            <select id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm text-gray-900 dark:text-gray-200">
              {grades.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Topic</label>
            <input type="text" id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-200" placeholder="e.g., Photosynthesis, The American Revolution"/>
          </div>

          {error && <div className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm">{error}</div>}

          <div>
            <button type="submit" disabled={isLoading || !topic} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-500/50 disabled:cursor-not-allowed transition-colors duration-200">
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                  Generating Lesson...
                </>
              ) : (
                <>
                  <Wand2 className="-ml-1 mr-2 h-5 w-5" />
                  Generate Lesson Plan
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {lessonHistory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <History className="h-6 w-6 text-indigo-500" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Lesson History</h3>
            </div>
            <button onClick={onClearHistory} className="flex items-center space-x-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold">
              <Trash2 size={16} />
              <span>Clear History</span>
            </button>
          </div>
          <ul className="space-y-3">
            {lessonHistory.map(result => (
              <li key={result.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{result.topic}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{result.subject} - {result.grade} - Completed on {new Date(result.completedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className={`font-bold text-lg ${result.score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{result.score}%</div>
                    <button onClick={() => onViewReport(result)} className="flex items-center space-x-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      <BarChart size={16} />
                      <span>View Report</span>
                    </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LessonPlanner;