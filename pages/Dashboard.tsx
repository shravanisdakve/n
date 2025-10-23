
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Modal, Button, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { type Course, type Mood as MoodType } from '../types';
import { getTimeOfDayGreeting, getMostUsedTool, getBreakActivitySuggestion, recordMood } from '../services/personalizationService';
import { getProductivityReport, recordPomodoroCycle } from '../services/analyticsService';
import { getCourses, addCourse, deleteCourse } from '../services/courseService';
import GoalsWidget from '../components/GoalsWidget';
import { 
    MessageSquare, Share2, FileText, Code, ArrowRight,
    Target, Lightbulb, Timer, Zap, BookOpen,
    Play, Pause, RefreshCw, PlusCircle, Trash2, User, Users, Star,
    BarChart, Clock, Brain, TrendingUp, TrendingDown, Edit3, Repeat
} from 'lucide-react';

const formatSeconds = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;
    return result.trim() || '0m';
};


const ProductivityInsights: React.FC = () => {
    const [report, setReport] = useState<Awaited<ReturnType<typeof getProductivityReport>> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            setIsLoading(true);
            const fetchedReport = await getProductivityReport();
            setReport(fetchedReport);
            setIsLoading(false);
        };
        fetchReport();
    }, []);

    if (isLoading) {
        return (
            <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 text-center">
                <p className="text-slate-400">Loading weekly snapshot...</p>
            </div>
        );
    }

    if (!report) return null;
    
    const hasData = report.totalStudyTime > 0 || report.totalQuizzes > 0;

    return (
      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
        <h3 className="text-xl font-bold text-slate-100 flex items-center mb-4">
            <BarChart className="w-6 h-6 mr-3 text-violet-400" /> Weekly Snapshot
        </h3>
        {!hasData ? (
             <p className="text-center text-slate-400 py-4">Start a study session or take a quiz to see your insights here.</p>
        ) : (
        <div className="space-y-4">
             <div className="flex justify-between items-center text-sm bg-slate-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                    <Clock size={16} className="text-slate-400" />
                    <span className="font-medium text-slate-300">Total Study Time</span>
                </div>
                <span className="font-mono text-white">{formatSeconds(report.totalStudyTime)}</span>
            </div>
             <div className="flex justify-between items-center text-sm bg-slate-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                    <Brain size={16} className="text-slate-400" />
                    <span className="font-medium text-slate-300">Quiz Accuracy</span>
                </div>
                <span className="font-mono text-white">{report.quizAccuracy}%</span>
            </div>
        </div>
        )}
        <Link to="/insights">
            <Button className="w-full mt-6 text-sm">View Detailed Insights</Button>
        </Link>
      </div>
    );
};

const MyCourses: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [newCourseName, setNewCourseName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoading(true);
            console.log("MyCourses: Fetching courses...");
            const fetchedCourses = await getCourses();
            console.log("MyCourses: Fetched courses:", fetchedCourses);
            setCourses(fetchedCourses);
            setIsLoading(false);
        };
        fetchCourses();
    }, []);

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        if(newCourseName.trim()) {
            console.log("MyCourses: Adding course:", newCourseName);
            const newCourse = await addCourse(newCourseName.trim());
            if (newCourse) {
                console.log("MyCourses: Added course:", newCourse);
                setCourses(prev => [...prev, newCourse]);
            }
            setNewCourseName('');
            setIsAdding(false);
        }
    }
    
    const handleDeleteCourse = async (id: string) => {
        console.log("MyCourses: Deleting course:", id);
        await deleteCourse(id);
        setCourses(prev => prev.filter(c => c.id !== id));
        console.log("MyCourses: Deleted course:", id);
    }

    return (
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h3 className="text-xl font-bold text-slate-100 flex items-center mb-4">
                <BookOpen className="w-6 h-6 mr-3 text-violet-400" /> My Courses
            </h3>
            <div className="space-y-2">
                {isLoading && <p className="text-slate-400 text-center">Loading courses...</p>}
                {!isLoading && courses.length === 0 && !isAdding && (
                    <div className="text-center py-4">
                        <p className="text-slate-400 mb-4">You haven't added any courses yet. Add one to get started!</p>
                    </div>
                )}
                {courses.map(course => (
                    <Link to="/notes" state={{ courseId: course.id }} key={course.id} className="group flex items-center justify-between bg-slate-800 p-3 rounded-lg hover:bg-slate-700 transition-colors">
                        <div className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: course.color }}></span>
                            <span className="font-medium text-slate-300">{course.name}</span>
                        </div>
                        <button onClick={(e) => { e.preventDefault(); handleDeleteCourse(course.id); }} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={16} />
                        </button>
                    </Link>
                ))}
            </div>
            {isAdding ? (
                <form onSubmit={handleAddCourse} className="mt-4 flex gap-2">
                    <Input 
                        value={newCourseName}
                        onChange={(e) => setNewCourseName(e.target.value)}
                        placeholder="e.g., Organic Chemistry"
                        className="text-sm"
                        autoFocus
                    />
                    <Button type="submit" className="px-3 py-2 text-sm">Add</Button>
                </form>
            ) : (
                <Button onClick={() => setIsAdding(true)} className="w-full mt-4 bg-slate-700/50 hover:bg-slate-700 text-sm shadow-none">
                    <PlusCircle size={16} className="mr-2" />
                    Add Course
                </Button>
            )}
        </div>
    );
}

const MoodCheckin: React.FC<{ onMoodSelect: () => void }> = ({ onMoodSelect }) => {
    const moods = [
        { emoji: '😊', label: 'Happy' },
        { emoji: '🤯', label: 'Overwhelmed' },
        { emoji: '🔥', label: 'Focused' },
        { emoji: '😴', label: 'Tired' },
        { emoji: '🤔', label: 'Curious' },
    ];
    const [selected, setSelected] = useState<string | null>(null);

    const handleMoodSelect = async (mood: Omit<MoodType, 'timestamp'>) => {
        await recordMood(mood);
        setSelected(mood.label);
        sessionStorage.setItem('moodCheckedIn', 'true');
        setTimeout(() => {
            setSelected(null);
            onMoodSelect();
        }, 2000); // Reset after 2s
    };
    
    if (selected) {
        return (
             <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 text-center">
                 <p>Thanks for sharing! Keep up the great work.</p>
             </div>
        )
    }

    return (
        <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h3 className="text-xl font-bold text-slate-100 mb-4 text-center">How are you feeling?</h3>
            <div className="flex justify-around">
                {moods.map(mood => (
                    <button 
                        key={mood.label} 
                        onClick={() => handleMoodSelect(mood)}
                        className="flex flex-col items-center gap-2 text-slate-400 hover:text-white transition-transform transform hover:scale-110"
                        title={mood.label}
                    >
                        <span className="text-3xl">{mood.emoji}</span>
                        <span className="text-xs font-medium">{mood.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


const tools = [
  { key: 'tutor', name: 'AI Tutor', href: '/tutor', description: 'Practice concepts with your AI tutor.', icon: MessageSquare, color: 'text-sky-400', bgColor: 'bg-sky-900/50' },
  { key: 'summaries', name: 'Summaries Generator', href: '/notes', description: 'Generate summaries from your notes.', icon: FileText, color: 'text-emerald-400', bgColor: 'bg-emerald-900/50' },
  { key: 'quizzes', name: 'Quizzes & Practice', href: '/insights', description: 'Test your knowledge with practice quizzes.', icon: Brain, color: 'text-rose-400', bgColor: 'bg-rose-900/50' },
];

const ToolCard: React.FC<typeof tools[0]> = ({ name, href, description, icon: Icon, color, bgColor }) => {
    const handleToolClick = () => {
        if (name === 'AI Tutor') {
            localStorage.setItem('lastAITutorSession', JSON.stringify({ name, href }));
        }
    };

    return (
        <Link to={href} onClick={handleToolClick} className="group block p-6 bg-slate-800 rounded-xl hover:bg-slate-700/80 transition-all duration-300 ring-1 ring-slate-700 hover:ring-violet-500">
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
        {tools.map(tool => <ToolCard key={tool.name} {...tool} />)}
    </div>
);




const taglines = [
    "Ready to make today a productive one?",
    "Let's get started on your goals.",
    "Your central hub for accelerated learning. Let's get started."
];

const StudyHub: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [mostUsedToolKey, setMostUsedToolKey] = useState<string | null>(null);
  const [showMoodCheckin, setShowMoodCheckin] = useState(true);
  const [lastAITutorSession, setLastAITutorSession] = useState<{ name: string; href: string } | null>(null);
  
  useEffect(() => {
    const fetchMostUsedTool = async () => {
        const toolKey = await getMostUsedTool();
        setMostUsedToolKey(toolKey);
    };
    fetchMostUsedTool();

    if (sessionStorage.getItem('moodCheckedIn')) {
        setShowMoodCheckin(false);
    }

    const storedSession = localStorage.getItem('lastAITutorSession');
    if (storedSession) {
        setLastAITutorSession(JSON.parse(storedSession));
    }
  }, []);

  const handleMoodSelected = () => {
      setShowMoodCheckin(false);
  }

  const greeting = getTimeOfDayGreeting();
  const mostUsedTool = tools.find(t => t.key === mostUsedToolKey);
  const firstName = currentUser?.displayName?.split(' ')[0] || 'Student';
  const tagline = useMemo(() => taglines[Math.floor(Math.random() * taglines.length)], []);

  return (
    <div className="space-y-8">
      <PageHeader title={`${greeting}, ${firstName}!`} subtitle={tagline} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
             
            <div>
                 {lastAITutorSession && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center"><Repeat className="w-6 h-6 mr-3 text-blue-400" /> Resume Last Activity</h2>
                        <Link to={lastAITutorSession.href} className="group block p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl hover:bg-slate-700/80 transition-all duration-300 ring-2 ring-blue-500 shadow-lg shadow-blue-500/10">
                            <div className="flex items-center space-x-4">
                                <div className={`p-3 rounded-lg bg-blue-900/50`}>
                                    <MessageSquare className={`w-6 h-6 text-blue-400`} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-100">Resume your AI Tutor session on {lastAITutorSession.name}</h3>
                                    <p className="mt-1 text-sm text-slate-400">Click to jump back in!</p>
                                </div>
                                <ArrowRight className="ml-auto w-5 h-5 text-slate-400 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-blue-400" />
                            </div>
                        </Link>
                    </div>
                )}
                 {mostUsedTool && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-100 mb-4 flex items-center"><Star className="w-6 h-6 mr-3 text-yellow-400" /> Quick Access</h2>
                        <Link to={mostUsedTool.href} className="group block p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl hover:bg-slate-700/80 transition-all duration-300 ring-2 ring-violet-500 shadow-lg shadow-violet-500/10">
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

        <div className="space-y-8">
          <GoalsWidget />
          {showMoodCheckin && <MoodCheckin onMoodSelect={handleMoodSelected} />}
          <ProductivityInsights />
          <MyCourses />
        </div>
      </div>
    </div>
  );
};

export default StudyHub;