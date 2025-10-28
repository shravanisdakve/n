// In pages/Insights.tsx
import React, { useState, useEffect } from 'react';
import { PageHeader, Spinner } from '../components/ui';
// --- ADD ---
import { Sparkles } from 'lucide-react';
import { getStudySuggestions } from '../services/geminiService';
import { getAnalyticsSummary } from '../services/analyticsService'; // Assuming you have a function like this
import { useAuth } from '../contexts/AuthContext';
// --- END ADD ---

// ... (Your existing charts and components)

// --- ADD THIS NEW COMPONENT ---
const WeeklyAiSummary: React.FC = () => {
  const { currentUser } = useAuth();
  const [suggestion, setSuggestion] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!currentUser) return;

      setIsLoading(true);
      try {
        // 1. Get your analytics data
        // This is a mock implementation. You'd replace this with your actual analytics service.
        const mockAnalyticsData = {
          userId: currentUser.uid,
          totalStudyTime: 3600, // in seconds
          quizScores: [
            { course: 'Math', avg: 65 },
            { course: 'History', avg: 90 },
          ],
          moods: { '😊': 2, '🤔': 5, '😥': 1 },
        };
        
        const reportJson = JSON.stringify(mockAnalyticsData);
        
        // 2. Call the AI service
        const aiSuggestion = await getStudySuggestions(reportJson);
        setSuggestion(aiSuggestion);

      } catch (error) {
        console.error("Error fetching AI summary:", error);
        setSuggestion("Couldn't generate your weekly summary. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [currentUser]);

  return (
    <div className="bg-slate-800/50 p-6 rounded-xl ring-1 ring-slate-700">
      <h3 className="text-xl font-bold text-slate-100 flex items-center mb-4">
        <Sparkles className="w-6 h-6 mr-3 text-sky-400" />
        Your AI-Powered Weekly Report
      </h3>
      {isLoading ? (
        <div className="flex justify-center items-center h-20">
          <Spinner />
        </div>
      ) : (
        <p className="text-slate-300 whitespace-pre-wrap">{suggestion}</p>
      )}
    </div>
  );
};
// --- END ADD ---


const Insights: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="Track your progress, mood, and study habits over time." />
      
      {/* --- ADD THIS --- */}
      <WeeklyAiSummary />
      {/* --- END ADD --- */}

      {/* ... (Rest of your charts and analytics components) ... */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimeSpentChart />
        <MoodTrackerChart />
      </div> */}
    </div>
  );
};

export default Insights;