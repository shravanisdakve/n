import React, { useState } from 'react';
import { Modal, Button, Input } from './ui';
import { User, Users, Briefcase, ArrowLeft, MessageSquare, Brain, Timer, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { addRoom } from '../services/communityService';
import { useAuth } from '../contexts/AuthContext';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalStep = 'selectMode' | 'selectTechnique' | 'configureRoom';
type RoomMode = 'Group' | 'College';

const techniques = [
    { name: 'Active Recall', description: 'Test your memory to strengthen it.', icon: Brain },
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

    const handleModeSelect = (mode: RoomMode) => {
        setSelectedMode(mode);
        setModalStep('selectTechnique');
    };

    const handleTechniqueSelect = () => {
        setModalStep('configureRoom');
    };

    const handleCreateRoom = async (mode: RoomMode, maxUsers: number) => {
        if (!currentUser?.email || isCreatingRoom) {
            return;
        }
        setIsCreatingRoom(true);

        const roomName = `${currentUser.displayName}'s ${mode} Room`;
        const newRoom = await addRoom(roomName, 'general', maxUsers, currentUser.email, currentUser.university, selectedTechnique, topic);
        
        if (newRoom) {
            navigate(`/study-room/${newRoom.id}`);
        }
        handleClose();
        setIsCreatingRoom(false);
    };
    
    const handleClose = () => {
        onClose();
        // Reset state when modal is closed to ensure it opens on step 1 next time
        setTimeout(() => {
            setModalStep('selectMode');
            setSelectedMode(null);
            setUserLimit(5);
        }, 300); // Delay to allow modal close animation
    };

    const renderSelectMode = () => (
        <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">Choose a mode that best fits your study session.</p>



            <Button onClick={() => handleModeSelect('Group')} className="w-full flex justify-start items-center p-4 h-auto bg-slate-700 hover:bg-slate-600">
                <Users className="w-5 h-5 mr-4 text-sky-400" />
                <div>
                    <p className="font-semibold text-left">Group Mode</p>
                    <p className="font-normal text-xs text-slate-400 text-left">Collaborate with up to 5 friends</p>
                </div>
            </Button>

            <Button onClick={() => handleModeSelect('College')} className="w-full flex justify-start items-center p-4 h-auto bg-slate-700 hover:bg-slate-600">
                <Briefcase className="w-5 h-5 mr-4 text-amber-400" />
                <div>
                    <p className="font-semibold text-left">College Mode</p>
                    <p className="font-normal text-xs text-slate-400 text-left">Connect with others from the same course/university</p>
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
                 <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2"><Target /> Targeted Learning</h3>
                 <p className="text-sm text-slate-400">Choose a technique to focus your session.</p>
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
                placeholder="Enter your topic (e.g., Photosynthesis)"
            />
            
            <Button onClick={handleTechniqueSelect} disabled={!topic.trim()} className="w-full" isLoading={isCreatingRoom}>
                Next
            </Button>
        </div>
    );


    const renderConfigureRoom = () => (
         <div className="space-y-6">
             <button onClick={() => setModalStep('selectTechnique')} className="flex items-center text-sm text-slate-400 hover:text-white">
                <ArrowLeft size={16} className="mr-1" /> Back to techniques
            </button>
            <div className="text-center">
                 <h3 className="text-lg font-bold text-white">{selectedMode} Mode</h3>
                 <p className="text-sm text-slate-400">Set the maximum number of participants for your room.</p>
            </div>
           
            <div>
                <label className="block text-center text-4xl font-bold text-white mb-4">{userLimit}</label>
                <input
                    type="range"
                    min="2"
                    max="5"
                    value={userLimit}
                    onChange={(e) => setUserLimit(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
                 <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>2</span>
                    <span>5</span>
                </div>
            </div>

            <Button onClick={() => handleCreateRoom(selectedMode!, userLimit)} className="w-full" isLoading={isCreatingRoom}>
                Create and Join Room
            </Button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Create a New Study Room">
            {modalStep === 'selectMode' && renderSelectMode()}
            {modalStep === 'selectTechnique' && renderSelectTechnique()}
            {modalStep === 'configureRoom' && renderConfigureRoom()}
        </Modal>
    );
};

export default CreateRoomModal;