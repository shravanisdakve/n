import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import { NavLink, useNavigate } from 'react-router-dom';
// --- FIX: Added Modal, Input, Button, Spinner ---
import { Modal, Input, Button, Spinner } from './ui'; // Import necessary UI components
// --- END FIX ---
import { useAuth } from '../contexts/AuthContext';
// --- FIX: Added Edit3 icon ---
import { LayoutDashboard, MessageSquare, Share2, FileText, Code, BrainCircuit, LogOut, BarChart2, Users, ClipboardList, Edit3 } from 'lucide-react';
// --- END FIX ---


// --- FIX: Define ProfileEditModal here (or import if moved to separate file) ---
interface ProfileEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentName: string;
    onSave: (newName: string) => Promise<void>;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ isOpen, onClose, currentName, onSave }) => {
    const [newName, setNewName] = useState(currentName);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setNewName(currentName);
            setError(null);
        }
    }, [isOpen, currentName]);

    const handleSave = async () => {
        if (!newName.trim() || newName === currentName) {
            onClose();
            return;
        }
        setIsSaving(true);
        setError(null);
        try {
            await onSave(newName.trim());
            onClose();
        } catch (err) {
            console.error("Profile save failed:", err);
            setError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
            <div className="space-y-4">
                <div>
                    <label htmlFor="displayNameSidebar" className="block text-sm font-medium text-slate-300 mb-1">
                        Display Name
                    </label>
                    <Input
                        id="displayNameSidebar" // Use unique ID if needed
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter your display name"
                        disabled={isSaving}
                    />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        isLoading={isSaving}
                        disabled={!newName.trim() || newName === currentName || isSaving}
                    >
                        Save Changes
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
// --- END ProfileEditModal definition ---


const navigation = [
  { name: 'Study Hub', href: '/', icon: LayoutDashboard },
  { name: 'Insights', href: '/insights', icon: BarChart2 },
  { name: 'Notes', href: '/notes', icon: FileText },
  { name: 'AI Tutor', href: '/tutor', icon: MessageSquare },
  { name: 'Study Room', href: '/study-lobby', icon: Users },
//   { name: 'Community', href: '/insights?tab=community', icon: Users }, // Assuming Community page removed/merged
];

const Sidebar: React.FC = () => {
  // --- FIX: Added updateUserProfile and modal state ---
  const { currentUser, logout, updateUserProfile } = useAuth(); // Get updateUserProfile
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // Add modal state
  // --- END FIX ---
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout(); // Use mock signOut
      navigate('/login');
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // --- FIX: Added save handler ---
  const handleProfileSave = async (newName: string) => {
      if (!updateUserProfile) {
           console.error("updateUserProfile function is not available from AuthContext!");
           // Handle error appropriately, maybe show a message
           throw new Error("Profile update function not loaded."); // Throw to show error in modal
      }
      try {
          await updateUserProfile({ displayName: newName });
          // Optional: Show a success message if needed
      } catch (error) {
           // Error is logged in context, modal will show message from thrown error
           throw error; // Re-throw for modal
      }
  };
  // --- END FIX ---


  return (
    <> {/* Added Fragment to wrap sidebar and modal */}
        <aside className="w-64 flex-shrink-0 bg-slate-800/50 p-6 flex flex-col ring-1 ring-slate-700"> {/* Added ring */}
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
                <div className="p-4 rounded-lg bg-slate-800 ring-1 ring-slate-700"> {/* Added ring */}
                {currentUser && (
                    <div className="flex items-center space-x-3 mb-4">
                        <img src={`https://ui-avatars.com/api/?name=${currentUser.displayName || 'User'}&background=random`} alt="User avatar" className="w-10 h-10 rounded-full" />
                        <div className="flex-1 overflow-hidden"> {/* Ensure text truncates */}
                            <p className="font-semibold text-sm text-white truncate">{currentUser.displayName || 'User'}</p>
                            <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                            {/* Removed university display as it wasn't part of mock user */}
                            {/* {currentUser.university && <p className="text-xs text-slate-500 truncate">{currentUser.university}</p>} */}
                        </div>
                        {/* --- FIX: Added Edit Button --- */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 text-slate-400 hover:text-white"
                            onClick={() => setIsProfileModalOpen(true)}
                            title="Edit Profile"
                        >
                            <Edit3 size={16} />
                        </Button>
                        {/* --- END FIX --- */}
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 text-slate-300 hover:bg-red-500/20 hover:text-red-400" // Centered text
                    >
                    <LogOut className="mr-2 h-5 w-5" /> {/* Adjusted margin */}
                    Logout
                    </button>
                </div>
                <p className="text-center text-xs text-slate-500 mt-4">&copy; 2024 NexusAI. All rights reserved.</p>
            </div>
        </aside>

        {/* --- FIX: Render the Profile Edit Modal --- */}
        {currentUser && (
            <ProfileEditModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                currentName={currentUser.displayName || ''}
                onSave={handleProfileSave}
            />
        )}
        {/* --- END FIX --- */}
    </>
  );
};

export default Sidebar;