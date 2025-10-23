

import React from 'react';
import { HashRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import StudyHub from './pages/Dashboard';
import AiTutor from './pages/AiChat';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudyRoom from './pages/StudyRoom';
import StudyLobby from './pages/StudyLobby';
import Insights from './pages/Insights';
import Notes from './pages/Notes';
import CourseCommunity from './pages/CourseCommunity';
import { useAuth } from './contexts/AuthContext';
import { Spinner } from './components/ui';


const AuthLayout: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-900">
    <Outlet />
  </div>
);

const MainLayout: React.FC = () => (
  <div className="flex h-screen bg-slate-900 text-slate-200">
    <Sidebar />
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 sm:p-6 lg:p-8 h-full">
        <Outlet />
      </div>
    </main>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return currentUser ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
       <div className="w-full h-screen flex items-center justify-center bg-slate-900">
        <Spinner />
      </div>
    )
  }

  return (
    <HashRouter>
      <Routes>
        {currentUser ? (
          <Route 
            path="/*" 
            element={
              <MainLayout />
            }
          >
            <Route index element={<StudyHub />} />
            <Route path="tutor" element={<AiTutor />} />
            <Route path="study-lobby" element={<StudyLobby />} />
            <Route path="study-room/:id" element={<StudyRoom />} />
            <Route path="insights" element={<Insights />} />
            <Route path="notes" element={<Notes />} />
            <Route path="community/:courseId" element={<CourseCommunity />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        ) : (
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>
        )}
      </Routes>
    </HashRouter>
  );
};

export default App;