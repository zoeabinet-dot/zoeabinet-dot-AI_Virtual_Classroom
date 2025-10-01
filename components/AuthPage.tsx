import React, { useState } from 'react';
import { loginUser, registerUser } from '../services/apiService';
import { Loader2, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';

interface AuthPageProps {
    onLoginSuccess: (token: string) => void;
    onGuestLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, onGuestLogin }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!isLoginView && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isLoginView) {
                const token = await loginUser({ username, password });
                onLoginSuccess(token);
            } else {
                await registerUser({ username, password });
                setSuccessMessage("Registration successful! Please log in.");
                setIsLoginView(true);
                setUsername('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {isLoginView ? 'Welcome Back!' : 'Create Your Account'}
                </h2>
                <p className="mt-2 text-md text-gray-600 dark:text-gray-400">
                    {isLoginView ? 'Log in to continue your learning journey.' : 'Join the classroom of the future.'}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                    <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-200" />
                </div>
                
                <div>
                    <div className="flex justify-between items-center">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                        {isLoginView && (
                            <a href="#" onClick={(e) => { e.preventDefault(); alert('Password reset functionality coming soon!'); }} className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                                Forgot password?
                            </a>
                        )}
                    </div>
                    <div className="relative mt-1">
                        <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-200" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            {showPassword ? <EyeOff size={20}/> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {!isLoginView && (
                    <div>
                        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm Password</label>
                         <div className="relative mt-1">
                            <input type={showConfirmPassword ? 'text' : 'password'} id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-gray-200" />
                             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                {showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>
                )}


                {error && <div className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md text-sm">{error}</div>}
                {successMessage && <div className="text-green-500 bg-green-100 dark:bg-green-900/50 p-3 rounded-md text-sm">{successMessage}</div>}


                <div>
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-500/50 disabled:cursor-not-allowed transition-colors duration-200">
                        {isLoading ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : (
                            isLoginView ? (
                                <>
                                    <LogIn className="-ml-1 mr-2 h-5 w-5" /> Log In
                                </>
                             ) : (
                                <>
                                    <UserPlus className="-ml-1 mr-2 h-5 w-5" /> Register
                                </>
                            )
                        )}
                    </button>
                </div>
            </form>

             <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                {isLoginView ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => { setIsLoginView(!isLoginView); setError(null); setSuccessMessage(null); }} className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1">
                    {isLoginView ? "Register here" : "Log in here"}
                </button>
            </p>
            
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or</span>
                    </div>
                </div>
                <div className="mt-6">
                     <button onClick={onGuestLogin} className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Continue as a Guest
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;