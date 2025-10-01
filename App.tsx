import React, { useState, useEffect } from 'react';
import type { LessonPlan, LessonResult, UserStats } from './types';
import LessonPlanner from './components/LessonPlanner';
import VirtualClassroom from './components/VirtualClassroom';
import AuthPage from './components/AuthPage';
import { BookOpen, Sun, Moon, Loader2, LogOut, User } from 'lucide-react';
import { getUserStats, getLessonHistory, saveLessonResult, clearAllHistory, updateUserStats, logoutUser } from './services/apiService';


const App: React.FC = () => {
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonHistory, setLessonHistory] = useState<LessonResult[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(localStorage.getItem('authToken'));
  const [isGuest, setIsGuest] = useState(false);


  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  // Fetch initial data from the API service on mount if authenticated
  useEffect(() => {
    const loadInitialData = async () => {
        if (!authToken) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const [stats, history] = await Promise.all([
                getUserStats(),
                getLessonHistory()
            ]);
            setUserStats(stats);
            setLessonHistory(history);
            setIsGuest(false);
        } catch (error) {
            console.error("Failed to load initial data", error);
            // If token is invalid, log out
            handleLogout();
        } finally {
            setIsLoading(false);
        }
    };
    loadInitialData();
  }, [authToken]);


  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
    setIsGuest(false);
  };
  
  const handleGuestLogin = () => {
    setUserStats({
        xp: 0,
        level: 1,
        streak: 0,
        lastLessonDate: null
    });
    setLessonHistory([]);
    setIsGuest(true);
    setIsLoading(false);
  };

  const handleLogout = () => {
    logoutUser();
    setAuthToken(null);
    setUserStats(null);
    setLessonHistory([]);
    setLessonPlan(null);
    setIsGuest(false);
  };

  const handleLessonPlanGenerated = (plan: LessonPlan) => {
    setLessonPlan(plan);
  };

  const handleEndSession = async (result?: LessonResult) => {
    if (isGuest) {
        setLessonPlan(null);
        alert("Guest progress is not saved. Register for an account to save your progress!");
        return;
    }

    if (result && userStats) {
        setLessonHistory(prevHistory => [result, ...prevHistory]);

        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const lastLesson = userStats.lastLessonDate ? new Date(userStats.lastLessonDate) : null;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        let newStreak = userStats.streak;
        if (lastLesson?.toDateString() === yesterday.toDateString()) {
            newStreak++;
        } else if (lastLesson?.toDateString() !== today.toDateString()) {
            newStreak = 1;
        }

        const newXp = userStats.xp + (result.xpEarned || 0);
        const newLevel = Math.floor(newXp / 100) + 1;
        
        const updatedStats: UserStats = {
            xp: newXp,
            level: newLevel,
            streak: newStreak,
            lastLessonDate: todayString,
        };
        setUserStats(updatedStats);

        try {
            await saveLessonResult(result);
            await updateUserStats(updatedStats);
        } catch (error) {
            console.error("Failed to save session progress:", error);
        }
    }
    setLessonPlan(null);
  };
  
  const handleViewReport = (result: LessonResult) => {
    alert(`Report for ${result.topic}:\nScore: ${result.score}%\nXP Earned: ${result.xpEarned}\nCompleted: ${new Date(result.completedAt).toLocaleString()}`);
  };

  const handleClearHistory = async () => {
    if (isGuest) {
        alert("Guest history is not saved.");
        return;
    }
    if (window.confirm("Are you sure you want to clear your entire lesson history? This action cannot be undone.")) {
        setLessonHistory([]);
        try {
            await clearAllHistory();
        } catch (error) {
            console.error("Failed to clear history:", error);
        }
    }
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            <p className="mt-4 text-lg font-semibold">Loading Your Classroom...</p>
        </div>
    );
  }

  const xpForNextLevel = 100;
  const currentLevelXp = userStats ? userStats.xp % xpForNextLevel : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">AI Virtual Classroom</h1>
          </div>
          <div className="flex items-center space-x-4">
             {userStats && (
                <div className="flex items-center space-x-3 text-sm font-semibold">
                    {isGuest && (
                        <div className="flex items-center space-x-2 text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 px-3 py-1 rounded-full">
                            <User size={14} />
                            <span>Guest Mode</span>
                        </div>
                    )}
                    <div className="text-gray-600 dark:text-gray-300">Level {userStats.level}</div>
                    <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-indigo-500 h-2.5 rounded-full" style={{width: `${(currentLevelXp / xpForNextLevel) * 100}%`}}></div>
                    </div>
                </div>
             )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            {(authToken || isGuest) && (
                 <button
                    onClick={handleLogout}
                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Logout"
                >
                    <LogOut className="h-5 w-5" />
                </button>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-6">
        {!authToken && !isGuest ? (
            <AuthPage onLoginSuccess={handleLoginSuccess} onGuestLogin={handleGuestLogin} />
        ) : lessonPlan ? (
          <VirtualClassroom lessonPlan={lessonPlan} onEndSession={handleEndSession} />
        ) : userStats && (
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