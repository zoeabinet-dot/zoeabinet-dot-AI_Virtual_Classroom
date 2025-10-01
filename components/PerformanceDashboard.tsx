import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from 'recharts';
import type { LessonResult } from '../types';
import { LessonStepType } from '../types';
import { Zap } from 'lucide-react';

interface PerformanceDashboardProps {
  lessonResult: LessonResult;
}

const COLORS = ['#10B981', '#EF4444'];
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};


const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ lessonResult }) => {
  const { score, correctAnswers, totalQuizzes, lessonPlan, xpEarned } = lessonResult;
  
  const pieData = [
    { name: 'Correct', value: correctAnswers },
    { name: 'Incorrect', value: totalQuizzes - correctAnswers },
  ];

  const barData = lessonPlan.steps
    .map((step, index) => ({
      name: `Step ${index + 1}`,
      title: step.title,
      duration: step.duration,
    }));
    
  return (
    <div className="mt-6 space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
        <div className="p-4 bg-indigo-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Overall Score</p>
            <p className={`text-5xl font-bold ${score >= 70 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{score}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{correctAnswers} of {totalQuizzes} correct</p>
        </div>
        <div className="p-4 bg-yellow-50 dark:bg-gray-700/50 rounded-lg flex flex-col justify-center">
            <p className="text-lg font-medium text-gray-600 dark:text-gray-400">XP Earned</p>
            <div className="flex items-center justify-center space-x-2">
                <Zap className="h-10 w-10 text-yellow-500" />
                <p className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">+{xpEarned}</p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Great job!</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
            <h4 className="text-lg font-semibold text-center mb-2 text-gray-700 dark:text-gray-300">Quiz Performance</h4>
            <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={pieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                >
                    {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <RechartsTooltip 
                    contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        borderColor: '#4b5563', 
                        borderRadius: '0.5rem',
                        color: '#ffffff'
                    }}
                />
                <Legend iconType='circle' formatter={(value) => <span className="text-gray-800 dark:text-gray-300">{value}</span>}/>
            </PieChart>
            </ResponsiveContainer>
        </div>
        <div>
            <h4 className="text-lg font-semibold text-center mb-2 text-gray-700 dark:text-gray-300">Time Spent per Step (min)</h4>
            <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af' }} />
                <YAxis tick={{ fill: '#9ca3af' }} />
                <RechartsTooltip 
                     contentStyle={{ 
                        backgroundColor: 'rgba(31, 41, 55, 0.8)', 
                        borderColor: '#4b5563', 
                        borderRadius: '0.5rem',
                        color: '#ffffff'
                    }}
                    cursor={{fill: 'rgba(128, 128, 128, 0.1)'}}
                />
                <Legend formatter={(value) => <span className="text-gray-800 dark:text-gray-300">{value}</span>} />
                <Bar dataKey="duration" fill="#8884d8" name="Time (minutes)" />
            </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;