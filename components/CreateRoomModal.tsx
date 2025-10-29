import React, { useState, useEffect } from 'react';
// --- FIX: Import Select component and Course type ---
import { Modal, Button, Input, Select } from './ui';
import { type Course } from '../types'; // Import Course type
// --- END FIX ---
import { User, Users, Briefcase, ArrowLeft, MessageSquare, Brain, Timer, Target, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addRoom } from '../services/communityService';
// --- FIX: Import getCourses service ---
import { getCourses } from '../services/courseService';
// --- END FIX ---
import { useAuth } from '../contexts/AuthContext';


interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'selectMode' | 'selectTechnique' | 'configureRoom';
type RoomMode = 'Group' | 'College';

const techniques = [
    { name: 'Pomodoro Technique', description: 'Use a timer to break down work into focused intervals.', icon: Timer },
    { name: 'Feynman Technique', description: 'Explain it simply to find your knowledge gaps.', icon: MessageSquare },
    { name: 'Spaced Repetition', description: 'Review at increasing intervals for long-term retention.', icon: Timer }
];

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [modalStep, setModalStep] = useState<ModalStep>('selectMode');
    const [selectedMode, setSelectedMode] = useState<RoomMode | null>(null);
    const [userLimit, setUserLimit] = useState(5);
    const [selectedTechnique, setSelectedTechnique] = useState(techniques[0].name);
    const [topic, setTopic] = useState('');
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    // --- FIX: Add state for courses and selected courseId ---
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseId, setCourseId] = useState<string | null>(null); // Use null for "General" option
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    // --- END FIX ---


    useEffect(() => {
        if (selectedMode === 'College') {
            setUserLimit(10);
        } else {
            setUserLimit(5);
        }
    }, [selectedMode]);

    // --- FIX: Fetch courses when modal opens or college mode is selected ---
     useEffect(() => {
        const fetchCourses = async () => {
            setIsLoadingCourses(true);
            try {
                const fetchedCourses = await getCourses();
                setCourses(fetchedCourses);
            } catch (error) {
                 console.error("Failed to fetch courses for modal:", error);
            } finally {
                 setIsLoadingCourses(false);
            }
        };

        // Fetch courses if the modal is open, needed for the dropdown
        if (isOpen) {
             fetchCourses();
        }

     }, [isOpen]); // Re-fetch if modal re-opens
     // --- END FIX ---

    const handleModeSelect = (mode: RoomMode) => {
        setSelectedMode(mode);
        setModalStep('selectTechnique');
    };

    const handleTechniqueSelect = () => {
        setModalStep('configureRoom');
    };

    const handleCreateRoom = async () => {
        if (!currentUser?.email || isCreatingRoom || !selectedMode) {
            return;
        }
        setIsCreatingRoom(true);

        // --- FIX: Refine courseId logic and validation ---
        let finalCourseId: string;
        if (selectedMode === 'College') {
            if (!courseId) { // Check if courseId state is null/empty
                alert("Please select a course for College Mode, or choose 'General / University Wide'.");
                setIsCreatingRoom(false);
                return;
            }
             finalCourseId = courseId; // Use the selected courseId from state
        } else {
            finalCourseId = 'general'; // Default for Group mode
        }
        // --- END FIX ---


        const roomName = `${currentUser.displayName}'s ${selectedMode} Room${topic ? ` (${topic})` : ''}`;

        const newRoom = await addRoom(roomName, finalCourseId, userLimit, currentUser.email, currentUser.university, selectedTechnique, topic);

        if (newRoom) {
            navigate(`/study-room/${newRoom.id}`);
        }
        // handleClose will reset state after navigation
        handleClose();
    };

    const handleClose = () => {
        onClose();
        setTimeout(() => {
            setModalStep('selectMode');
            setSelectedMode(null);
            setUserLimit(5);
            setSelectedTechnique(techniques[0].name);
            setTopic('');
            setIsCreatingRoom(false);
            setCourseId(null); // Reset course selection
            setCourses([]); // Clear courses list
            setIsLoadingCourses(false);
        }, 300);
    };

    // ... (renderSelectMode and renderSelectTechnique remain the same) ...
     const renderSelectMode = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">Choose a mode that best fits your study session.</p>

            <Button onClick={() => handleModeSelect('Group')} className="w-full flex justify-start items-center p-4 h-auto bg-slate-700 hover:bg-slate-600">
                <Users className="w-5 h-5 mr-4 text-sky-400" />
                <div>
                    <p className="font-semibold text-left">Group Study</p>
                    <p className="font-normal text-xs text-slate-400 text-left">Collaborate with a small, private group (2-5 friends)</p>
                </div>
            </Button>

            <Button onClick={() => handleModeSelect('College')} className="w-full flex justify-start items-center p-4 h-auto bg-slate-700 hover:bg-slate-600">
                <Building className="w-5 h-5 mr-4 text-amber-400" /> {/* Changed Icon */}
                <div>
                    <p className="font-semibold text-left">College / Course Room</p>
                    <p className="font-normal text-xs text-slate-400 text-left">Join or create a larger room based on your course (up to 60)</p>
                </div>
            </Button>
        </div>
    );

     const renderSelectTechnique = () => (
        <div className="space-y-4">
            <button onClick={() => setModalStep('selectMode')} className="flex items-center text-sm text-slate-400 hover:text-white">
                <ArrowLeft size={16} className="mr-1" /> Back to modes
            </button>
             <div className="text-center">
                 <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2"><Target /> Targeted Learning ({selectedMode})</h3>
                 <p className="text-sm text-slate-400">Optionally choose a technique and topic to focus your session.</p>
            </div>

            <div className="space-y-2">
                {techniques.map(tech => (
                    <button
                        key={tech.name}
                        onClick={() => setSelectedTechnique(tech.name)}
                        className={`w-full p-3 rounded-lg text-left transition-all duration-200 ring-2 ${selectedTechnique === tech.name ? 'bg-slate-700 ring-violet-500' : 'bg-slate-800 ring-transparent hover:ring-slate-600'}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <tech.icon className="w-4 h-4 text-slate-300" />
                            <h4 className="font-semibold text-sm text-slate-100">{tech.name}</h4>
                        </div>
                        <p className="text-xs text-slate-400">{tech.description}</p>
                    </button>
                ))}
            </div>

            <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter study topic (e.g., Photosynthesis)"
                required // Make topic required
            />

            <Button onClick={handleTechniqueSelect} disabled={!topic.trim()} className="w-full">
                Configure Room
            </Button>
        </div>
    );


    const renderConfigureRoom = () => {
        const maxLimit = selectedMode === 'College' ? 60 : 5;
        const minLimit = 2;

         return (
             <div className="space-y-6">
                 <button onClick={() => setModalStep('selectTechnique')} className="flex items-center text-sm text-slate-400 hover:text-white">
                    <ArrowLeft size={16} className="mr-1" /> Back to topic & technique
                </button>
                <div className="text-center">
                     <h3 className="text-lg font-bold text-white">{selectedMode} Mode Settings</h3>
                     <p className="text-sm text-slate-400">Set the maximum number of participants.</p>
                </div>

                {/* Participant Limit Slider */}
                <div>
                    <label className="block text-center text-4xl font-bold text-white mb-4">{userLimit}</label>
                    <input
                        type="range"
                        min={minLimit}
                        max={maxLimit}
                        value={userLimit}
                        onChange={(e) => setUserLimit(parseInt(e.target.value, 10))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                    />
                     <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>{minLimit}</span>
                        <span>{maxLimit}</span>
                    </div>
                </div>

                {/* --- FIX: Add Course Selection Dropdown for College Mode --- */}
                 {selectedMode === 'College' && (
                     <div>
                         <label htmlFor="course-select" className="block text-sm font-medium text-slate-300 mb-2">Select Course</label>
                         <Select
                             id="course-select"
                             value={courseId ?? ''} // Use empty string for the default option
                             onChange={(e) => setCourseId(e.target.value || null)} // Set to null if default is selected
                             disabled={isLoadingCourses}
                         >
                            {/* Add a default/general option */}
                             <option value="">General / University Wide</option>
                             {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                         </Select>
                         {isLoadingCourses && <p className="text-xs text-slate-400 mt-1">Loading courses...</p>}
                     </div>
                 )}
                 {/* --- END FIX --- */}

                <Button onClick={handleCreateRoom} className="w-full" isLoading={isCreatingRoom}>
                    Create and Join Room
                </Button>
            </div>
        );
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create a New Study Room">
            {modalStep === 'selectMode' && renderSelectMode()}
            {modalStep === 'selectTechnique' && renderSelectTechnique()}
            {modalStep === 'configureRoom' && renderConfigureRoom()}
        </Modal>
    );
};

export default CreateRoomModal;