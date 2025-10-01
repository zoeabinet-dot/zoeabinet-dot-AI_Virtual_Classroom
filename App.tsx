import React, { useState, useEffect } from 'react';
import type { LessonPlan, LessonResult, UserStats } from './types';
import LessonPlanner from './components/LessonPlanner';
import VirtualClassroom from './components/VirtualClassroom';
import { BookOpen, Zap, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  const [lessonHistory, setLessonHistory] = useState<LessonResult[]>(() => {
    try {
      const savedHistory = localStorage.getItem('lessonHistory');
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error("Failed to parse lesson history from localStorage", error);
      return [];
    }
  });

  const [userStats, setUserStats] = useState<UserStats>(() => {
    try {
        const savedStats = localStorage.getItem('userStats');
        if (savedStats) {
            return JSON.parse(savedStats);
        }
    } catch (error) {
        console.error("Failed to parse user stats from localStorage", error);
    }
    return { xp: 0, level: 1, streak: 0, lastLessonDate: null };
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('lessonHistory', JSON.stringify(lessonHistory));
    } catch (error) {
      console.error("Failed to save lesson history to localStorage", error);
    }
  }, [lessonHistory]);

  useEffect(() => {
    try {
        localStorage.setItem('userStats', JSON.stringify(userStats));
    } catch (error) {
        console.error("Failed to save user stats to localStorage", error);
    }
  }, [userStats]);


  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLessonPlanGenerated = (plan: LessonPlan) => {
    setLessonPlan(plan);
  };

  const handleEndSession = (result?: LessonResult) => {
    if (result) {
        setLessonHistory(prevHistory => [result, ...prevHistory]);

        // Update User Stats
        const today = new Date().toDateString();
        const lastLesson = userStats.lastLessonDate ? new Date(userStats.lastLessonDate) : null;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = userStats.streak;
        if (lastLesson?.toDateString() === yesterday.toDateString()) {
            newStreak++; // Continued streak
        } else if (lastLesson?.toDateString() !== today) {
            newStreak = 1; // New or broken streak
        }

        const newXp = userStats.xp + (result.xpEarned || 0);
        const newLevel = Math.floor(newXp / 100) + 1;
        
        setUserStats({
            xp: newXp,
            level: newLevel,
            streak: newStreak,
            lastLessonDate: today,
        });
    }
    setLessonPlan(null);
  };
  
  const handleViewReport = (result: LessonResult) => {
    alert(`Report for ${result.topic}:\nScore: ${result.score}%\nXP Earned: ${result.xpEarned}\nCompleted: ${new Date(result.completedAt).toLocaleString()}`);
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear your entire lesson history? This action cannot be undone.")) {
        setLessonHistory([]);
    }
  };

  const xpForNextLevel = 100;
  const currentLevelXp = userStats.xp % xpForNextLevel;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Virtual Classroom</h1>
          </div>
          <div className="flex items-center space-x-4">
             <div className="flex items-center space-x-3 text-sm font-semibold">
                <div className="text-gray-600 dark:text-gray-300">Level {userStats.level}</div>
                <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{width: `${(currentLevelXp / xpForNextLevel) * 100}%`}}></div>
                </div>
             </div>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {lessonPlan ? (
          <VirtualClassroom lessonPlan={lessonPlan} onEndSession={handleEndSession} />
        ) : (
          <LessonPlanner 
            userStats={userStats}
            onLessonPlanGenerated={handleLessonPlanGenerated} 
            lessonHistory={lessonHistory}
            onViewReport={handleViewReport}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>
    </div>
  );
};

export default App;