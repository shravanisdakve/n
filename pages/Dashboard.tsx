import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// --- REMOVE Modal, Input imports if no longer needed here ---
import { PageHeader, Button } from '../components/ui';
// --- END REMOVE ---
import { useAuth } from '../contexts/AuthContext';
import { type Course, type Mood as MoodType } from '../types';
import { getTimeOfDayGreeting, getMostUsedTool, getBreakActivitySuggestion, recordMood } from '../services/personalizationService';
import { getProductivityReport, recordPomodoroCycle } from '../services/analyticsService';
import { getCourses, addCourse, deleteCourse } from '../services/courseService';
import GoalsWidget from '../components/GoalsWidget';
// --- REMOVE Edit3 import ---
import {
    MessageSquare, Share2, FileText, Code, ArrowRight,
    Target, Lightbulb, Timer, Zap, BookOpen,
    Play, Pause, RefreshCw, PlusCircle, Trash2, User, Users, Star,
    BarChart, Clock, Brain, TrendingUp, TrendingDown, Repeat // Removed Edit3
} from 'lucide-react';
// --- END REMOVE ---

// --- (ProductivityInsights, MyCourses, MoodCheckin components - No changes needed) ---
// Define or import these components if they are not already in this file
const ProductivityInsights: React.FC = () => { /* ... component implementation ... */ return <div className="bg-slate-800/50 p-4 rounded-xl ring-1 ring-slate-700">Productivity Insights Placeholder</div>; };
const MyCourses: React.FC = () => { /* ... component implementation ... */ return <div className="bg-slate-800/50 p-4 rounded-xl ring-1 ring-slate-700">My Courses Placeholder</div>; };
const MoodCheckin: React.FC<{onMoodSelect:()=>void}> = ({onMoodSelect}) => { /* ... component implementation ... */ return <div className="bg-slate-800/50 p-4 rounded-xl ring-1 ring-slate-700">Mood Check-in Placeholder</div>; };
const formatSeconds = (seconds: number) => `${Math.floor(seconds / 60)}m ${seconds % 60}s`; // Example formatter

const tools = [
  { key: 'tutor', name: 'AI Tutor', href: '/tutor', description: 'Practice concepts with your AI tutor.', icon: MessageSquare, color: 'text-sky-400', bgColor: 'bg-sky-900/50' },
  { key: 'summaries', name: 'Summaries Generator', href: '/notes', description: 'Generate summaries from your notes.', icon: FileText, color: 'text-emerald-400', bgColor: 'bg-emerald-900/50' },
  { key: 'quizzes', name: 'Quizzes & Practice', href: '/insights', description: 'Test your knowledge with practice quizzes.', icon: Brain, color: 'text-rose-400', bgColor: 'bg-rose-900/50' },
];

interface ToolCardProps {
    name: string;
    href: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    key: string;
}
const ToolCard: React.FC<ToolCardProps> = ({ name, href, description, icon: Icon, color, bgColor }) => {
    return (
        <Link to={href} className="group block p-6 bg-slate-800 rounded-xl hover:bg-slate-700/80 transition-all duration-300 ring-1 ring-slate-700 hover:ring-violet-500">
            <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-lg ${bgColor}`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-slate-100">{name}</h3>
            </div>
            <p className="mt-3 text-sm text-slate-400">{description}</p>
            <div className="mt-4 flex items-center text-sm font-semibold text-violet-400 group-hover:text-violet-300">
                <span>Start Session</span>
                <ArrowRight className="ml-2 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
        </Link>
    );
};

const ToolsGrid: React.FC = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {tools.map(tool => <ToolCard key={tool.key} {...tool} />)}
    </div>
);

const taglines = [
    "Ready to make today a productive one?",
    "Let's get started on your goals.",
    "Your central hub for accelerated learning. Let's get started."
];

const StudyHub: React.FC = () => {
  // --- REMOVE updateUserProfile import if only used for modal ---
  const { currentUser } = useAuth();
  // --- END REMOVE ---
  const navigate = useNavigate();
  const [mostUsedToolKey, setMostUsedToolKey] = useState<string | null>(null);
  const [showMoodCheckin, setShowMoodCheckin] = useState(true);
  // --- REMOVE state for profile modal ---
  // const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  // --- END REMOVE ---

  useEffect(() => {
    // ... (fetch logic remains) ...
    const fetchMostUsedTool = async () => {
        const toolKey = await getMostUsedTool();
        setMostUsedToolKey(toolKey);
    };
    fetchMostUsedTool();

    if (sessionStorage.getItem('moodCheckedIn')) {
        setShowMoodCheckin(false);
    }
  }, []);

  const handleMoodSelected = () => {
      setShowMoodCheckin(false);
  }

  // --- REMOVE save handler for profile ---
  // const handleProfileSave = async (newName: string) => { ... };
  // --- END REMOVE ---


  const greeting = getTimeOfDayGreeting();
  const mostUsedTool = tools.find(t => t.key === mostUsedToolKey);
  const firstName = currentUser?.displayName?.split(' ')[0] || 'User';
  const tagline = useMemo(() => taglines[Math.floor(Math.random() * taglines.length)], []);

  return (
    <div className="space-y-8">
        {/* --- REMOVED Edit button wrapper div --- */}
        <PageHeader title={`${greeting}, ${firstName}!`} subtitle={tagline} />
        {/* --- END REMOVE --- */}


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ... (Rest of the Dashboard layout remains the same) ... */}
        {/* Study Room block */}
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 text-center">
                <h2 className="text-2xl font-bold text-slate-100 mb-2 flex items-center justify-center">
                    <Zap className="w-6 h-6 mr-3 text-yellow-400" />
                    Enter a Study Room
                </h2>
                <p className="text-slate-400 mb-6 max-w-xl mx-auto">Create or join a room to collaborate with friends, chat with an AI study buddy, and hold each other accountable.</p>
                <Button onClick={() => navigate('/study-lobby')} className="px-8 py-4 text-lg">
                    <Users className="w-5 h-5 mr-2" />
                    Go to Study Lobby
                </Button>
            </div>

             {/* Quick Access & Tools */}
            <div>
                {mostUsedTool && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center"><Star className="w-6 h-6 mr-3 text-yellow-400" /> Quick Access</h2>
                        <Link to={mostUsedTool.href} className="group block p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl hover:bg-slate-700/80 transition-all duration-300 ring-2 ring-violet-500 shadow-lg shadow-violet-500/10">
                            {/* ... Tool card content ... */}
                             <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-lg ${mostUsedTool.bgColor}`}>
                                    <mostUsedTool.icon className={`w-6 h-6 ${mostUsedTool.color}`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-100">{mostUsedTool.name}</h3>
                                    <p className="mt-1 text-sm text-slate-400">{mostUsedTool.description}</p>
                                </div>
                                <ArrowRight className="ml-auto w-5 h-5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-violet-400" />
                            </div>
                        </Link>
                    </div>
                )}
                <h2 className="text-2xl font-bold text-slate-100 mb-4">Your AI Toolkit</h2>
                <ToolsGrid />
            </div>
        </div>

        {/* Right Sidebar Widgets */}
         <div className="space-y-8">
          <GoalsWidget />
          {showMoodCheckin && <MoodCheckin onMoodSelect={handleMoodSelected} />}
          <ProductivityInsights />
          <MyCourses />
        </div>
      </div>

      {/* --- REMOVED Profile Edit Modal rendering --- */}
      {/* {currentUser && ( <ProfileEditModal ... /> )} */}
      {/* --- END REMOVE --- */}

    </div>
  );
};

// --- (Other components like ProductivityInsights, MyCourses etc. remain) ---

export default StudyHub;