import { type LeaderboardEntry, type Course } from '../types';
import { auth } from '../firebase';

// --- Mock Database ---
const mockSessions: any[] = [];
const mockPomodoroCycles: any[] = [];
const mockQuizResults: any[] = [];

// --- Session Tracking ---
export const startSession = async (tool: string, courseId: string | null = null): Promise<string | null> => {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;
    
    const sessionId = `mock_session_${Date.now()}`;
    mockSessions.push({
        id: sessionId,
        userId,
        tool,
        courseId,
        startTime: new Date(),
    });
    return sessionId;
};

export const endSession = async (sessionId: string | null) => {
    if (!sessionId) return;
    const session = mockSessions.find(s => s.id === sessionId);
    if (session) {
        session.endTime = new Date();
        session.duration = Math.round((session.endTime.getTime() - session.startTime.getTime()) / 1000);
    }
};

// --- Pomodoro Tracking ---
export const recordPomodoroCycle = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;
    mockPomodoroCycles.push({ userId, timestamp: new Date() });
};

// --- Quiz Tracking ---
export const recordQuizResult = async (topic: string, correct: boolean, courseId: string | null = null) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    mockQuizResults.push({
        userId,
        topic,
        correct,
        courseId,
        timestamp: new Date(),
        user: {
            email: auth.currentUser?.email,
            displayName: auth.currentUser?.displayName,
        }
    });
};

// --- Data Retrieval for UI ---
export const getProductivityReport = async (courseId: string | null = null) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return {
        totalStudyTime: 0, quizAccuracy: 0, totalQuizzes: 0, correctQuizzes: 0,
        strengths: [], weaknesses: [], completedPomodoros: 0, sessions: []
    };

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const userSessions = mockSessions.filter(s => s.userId === userId && s.startTime >= oneWeekAgo && (!courseId || s.courseId === courseId));
    const userQuizzes = mockQuizResults.filter(q => q.userId === userId && q.timestamp >= oneWeekAgo && (!courseId || q.courseId === courseId));
    const userPomodoros = mockPomodoroCycles.filter(p => p.userId === userId && p.timestamp >= oneWeekAgo);
    
    const totalStudyTime = userSessions.reduce((acc, s) => acc + (s.duration || 0), 0);
    const totalQuizzes = userQuizzes.length;
    const correctQuizzes = userQuizzes.filter(q => q.correct).length;
    const quizAccuracy = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

    // --- FIX: Added logic to calculate topic mastery ---
    const topicStats: { [topic: string]: { correct: number, total: number } } = {};
    userQuizzes.forEach(quiz => {
        const normalizedTopic = quiz.topic.trim().toLowerCase();
        if (!topicStats[normalizedTopic]) topicStats[normalizedTopic] = { correct: 0, total: 0 };
        topicStats[normalizedTopic].total++;
        if (quiz.correct) topicStats[normalizedTopic].correct++;
    });

    const topicPerformance = Object.entries(topicStats).map(([topic, stats]) => ({
        topic,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        count: stats.total,
    }));

    const strengths = topicPerformance.filter(t => t.accuracy >= 80 && t.count > 1).sort((a, b) => b.accuracy - a.accuracy).slice(0, 3);
    const weaknesses = topicPerformance.filter(t => t.accuracy < 60 && t.count > 1).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);

    return {
        totalStudyTime,
        quizAccuracy,
        totalQuizzes,
        correctQuizzes,
        strengths, 
        weaknesses,
        completedPomodoros: userPomodoros.length,
        sessions: userSessions,
    };
};

export const getLeaderboardData = async (): Promise<LeaderboardEntry[]> => {
    // For mock purposes, we only have the current user's data
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const totalStudyTime = mockSessions.filter(s => s.userId === userId).reduce((acc, s) => acc + (s.duration || 0), 0);
    const userQuizzes = mockQuizResults.filter(q => q.userId === userId);
    const totalQuizzes = userQuizzes.length;
    const correctQuizzes = userQuizzes.filter(q => q.correct).length;
    const quizScore = totalQuizzes > 0 ? Math.round((correctQuizzes / totalQuizzes) * 100) : 0;

    const leaderBoard: LeaderboardEntry[] = [{
        email: auth.currentUser?.email || '',
        displayName: auth.currentUser?.displayName || 'You',
        studyTime: totalStudyTime,
        quizScore: quizScore,
        quizCount: totalQuizzes,
    }];

    return leaderBoard;
};