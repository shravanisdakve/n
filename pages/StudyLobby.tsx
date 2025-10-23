import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, Button, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, PlusCircle, Users } from 'lucide-react';
import CreateRoomModal from '../components/CreateRoomModal'; // Import the new modal
import { getRooms } from '../services/communityService';
import { getCourses } from '../services/courseService';
import { type StudyRoom, type Course } from '../types';

const StudyLobby: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [joinId, setJoinId] = useState('');
    const [error, setError] = useState('');
    const [isCreateModalOpen, setCreateModalOpen] = useState(false); // State for the modal
    const [rooms, setRooms] = useState<StudyRoom[]>([]);
    const [filteredRooms, setFilteredRooms] = useState<StudyRoom[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const location = useLocation();

    useEffect(() => {
        const fetchRooms = async () => {
            const allRooms = await getRooms();
            const allCourses = await getCourses();
            setRooms(allRooms);
            setCourses(allCourses);

            const topic = location.state?.topic;
            if (topic) {
                const courseIds = allCourses.filter(c => c.name.toLowerCase().includes(topic.toLowerCase())).map(c => c.id);
                const filtered = allRooms.filter(r => courseIds.includes(r.courseId));
                setFilteredRooms(filtered);
            } else {
                setFilteredRooms(allRooms);
            }
        };
        fetchRooms();
    }, [location.state]);

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinId.trim()) {
            navigate(`/study-room/${joinId.trim()}`);
        }
    };

    return (
        <>
            <CreateRoomModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />
            <div className="flex flex-col items-center justify-center h-full">
                <div className="w-full max-w-2xl text-center">
                    <Users size={48} className="mx-auto text-violet-400 mb-4" />
                    <PageHeader title="Study Room" subtitle="Collaborate with friends in a real-time video room with a shared AI assistant." />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                        {/* Create Room Card */}
                        <div className="bg-slate-800/50 p-8 rounded-xl ring-1 ring-slate-700 flex flex-col items-center text-center">
                            <h3 className="text-2xl font-bold text-white mb-3">Create a New Room</h3>
                            <p className="text-slate-400 mb-6 flex-1">Start a private session and invite your friends to join you.</p>
                            <Button onClick={() => setCreateModalOpen(true)} className="w-full text-lg py-3">
                                <PlusCircle size={20} className="mr-2" /> Create Room
                            </Button>
                        </div>

                        {/* Join Room Card */}
                        <div className="bg-slate-800/50 p-8 rounded-xl ring-1 ring-slate-700 flex flex-col items-center text-center">
                            <h3 className="text-2xl font-bold text-white mb-3">Join a Room</h3>
                            <p className="text-slate-400 mb-6 flex-1">Enter the ID of an existing room to join the study session.</p>
                            <form onSubmit={handleJoinRoom} className="w-full flex gap-2">
                                <Input
                                    type="text"
                                    value={joinId}
                                    onChange={(e) => setJoinId(e.target.value)}
                                    placeholder="Enter Room ID"
                                    className="text-center"
                                />
                                <Button type="submit" className="px-4">
                                    <ArrowRight size={20} />
                                </Button>
                            </form>
                        </div>
                    </div>

                    {error && <p className="text-red-400 mt-6">{error}</p>}

                    <div className="mt-12">
                        <h3 className="text-2xl font-bold text-white mb-4">Public Study Rooms</h3>
                        <div className="space-y-4">
                            {filteredRooms.map(room => (
                                <div key={room.id} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-white">{room.name}</h4>
                                        <p className="text-sm text-slate-400">{courses.find(c => c.id === room.courseId)?.name}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Users size={16} />
                                            <span>{room.users.length} / {room.maxUsers}</span>
                                        </div>
                                        <Button onClick={() => navigate(`/study-room/${room.id}`)} disabled={room.users.length >= room.maxUsers} className="py-2 px-4 text-sm">
                                            Join <ArrowRight size={14} className="ml-1"/>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {filteredRooms.length === 0 && (
                                <p className="text-slate-400 text-center py-8">No public rooms available for this topic.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default StudyLobby;