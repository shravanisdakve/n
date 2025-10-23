import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, MessageSquare, Share2, FileText, Code, BrainCircuit, LogOut, BarChart2, Users, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Study Hub', href: '/', icon: LayoutDashboard },
  { name: 'Insights', href: '/insights', icon: BarChart2 },
  { name: 'Notes', href: '/notes', icon: FileText },
  { name: 'AI Tutor', href: '/tutor', icon: MessageSquare },
  { name: 'Study Room', href: '/study-lobby', icon: Users },
  { name: 'Community', href: '/insights?tab=community', icon: Users },
];

const Sidebar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-800/50 p-6 flex flex-col">
      <div className="flex items-center mb-10">
        <div className="p-2 bg-violet-600 rounded-lg">
           <BrainCircuit className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold ml-3 bg-gradient-to-r from-violet-400 to-cyan-400 text-transparent bg-clip-text">
          NexusAI
        </h1>
      </div>
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-violet-600 text-white shadow-lg'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <item.icon className="mr-3 h-5 w-5" aria-hidden="true" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        <div className="p-4 rounded-lg bg-slate-800">
           {currentUser && (
            <div className="flex items-center space-x-3 mb-4">
              <img src={`https://ui-avatars.com/api/?name=${currentUser.displayName}&background=random`} alt="User avatar" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-semibold text-sm text-white truncate">{currentUser.displayName}</p>
                <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                {currentUser.university && <p className="text-xs text-slate-500 truncate">{currentUser.university}</p>}
              </div>
            </div>
           )}
           <button
             onClick={handleLogout}
             className="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 text-slate-300 hover:bg-red-500/20 hover:text-red-400"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </button>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">&copy; 2024 NexusAI. All rights reserved.</p>
      </div>
    </aside>
  );
};

export default Sidebar;