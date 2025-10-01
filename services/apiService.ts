import type { UserStats, LessonResult } from '../types';

const API_BASE_URL = '/api'; // This will be proxied to the Django backend

const getAuthToken = (): string | null => localStorage.getItem('authToken');

const apiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = getAuthToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Handle unauthorized access, e.g., redirect to login
            localStorage.removeItem('authToken');
            window.location.reload();
        }
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.detail || errorData.message || 'An API error occurred');
    }

    if (response.status === 204) { // No Content
        return null;
    }

    return response.json();
};

// --- Auth API ---

export const loginUser = async (credentials: {username: string, password: string}):Promise<string> => {
    const data = await apiFetch('/login/', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
    const token = data.token;
    if (token) {
        localStorage.setItem('authToken', token);
    }
    return token;
}

export const registerUser = async (credentials: {username: string, password: string}):Promise<any> => {
    return apiFetch('/register/', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

export const logoutUser = () => {
    localStorage.removeItem('authToken');
}

// --- User Stats API ---

export const getUserStats = async (): Promise<UserStats> => {
  return apiFetch('/stats/');
};

export const updateUserStats = async (stats: UserStats): Promise<void> => {
    return apiFetch('/stats/', {
        method: 'POST',
        body: JSON.stringify(stats),
    });
};

// --- Lesson History API ---

export const getLessonHistory = async (): Promise<LessonResult[]> => {
    return apiFetch('/history/');
};

export const saveLessonResult = async (result: LessonResult): Promise<void> => {
    return apiFetch('/history/', {
        method: 'POST',
        body: JSON.stringify(result)
    });
};

export const clearAllHistory = async (): Promise<void> => {
    return apiFetch('/history/clear/', {
        method: 'POST'
    });
};
