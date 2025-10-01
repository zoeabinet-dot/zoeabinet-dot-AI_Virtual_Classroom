export enum LessonStepType {
  LECTURE = 'lecture',
  IMAGE = 'image',
  QUIZ = 'quiz',
  ACTIVITY = 'activity'
}

export interface QuizOption {
  option: string;
  isCorrect: boolean;
}

export interface LessonStep {
  title: string;
  type: LessonStepType;
  content: string; // For LECTURE, prompt for IMAGE, question for QUIZ, instructions for ACTIVITY
  duration: number; // in minutes
  quizOptions?: QuizOption[];
}

export interface LessonPlan {
  subject: string;
  grade: string;
  topic: string;
  learningObjectives: string[];
  steps: LessonStep[];
}

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
}

export enum EngagementLevel {
    HIGH = 'High',
    MEDIUM = 'Medium',
    LOW = 'Low'
}

export type BehaviorEventType = 'positive' | 'neutral' | 'distracted';

export interface BehavioralEvent {
    type: BehaviorEventType;
    description: string;
    timestamp: number;
    icon: string; // e.g., 'Smile', 'AlertCircle'
}

export interface LessonResult {
  id: string;
  topic: string;
  subject: string;
  grade: string;
  score: number;
  correctAnswers: number;
  totalQuizzes: number;
  completedAt: string;
  lessonPlan: LessonPlan;
  xpEarned: number;
}

export interface UserStats {
    xp: number;
    level: number;
    streak: number;
    lastLessonDate: string | null;
}