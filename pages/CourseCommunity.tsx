import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getCourse } from '../services/courseService';
import { 
  onMessagesUpdate, sendChatMessage, onResourcesUpdate, uploadResource, deleteResource, getRooms 
} from '../services/communityService';
import { type Course, type ChatMessage, type StudyRoom } from '../types';
import { Input, Button, Spinner } from '../components/ui';
import { MessageSquare, Paperclip, Send, Trash2, Users, ArrowRight, BookOpen, UploadCloud } from 'lucide-react';

const CourseCommunity: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [course, setCourse] = useState<Course | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [resources, setResources] = useState<any[]>([]);
  const [activeRooms, setActiveRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      if (courseId) {
        const fetchedCourse = await getCourse(courseId);
        setCourse(fetchedCourse);

        // Fetch active rooms
        const allRooms = await getRooms();
        const filteredRooms = allRooms.filter(room => room.courseId === courseId);
        setActiveRooms(filteredRooms);
      }
      setLoading(false);
    };
    fetchData();
  }, [courseId]);

  // Real-time messages (mocking with polling)
  useEffect(() => {
    if (!courseId) return;
    const fetchAndSetMessages = async () => {
      const fetchedMessages = await getRoomMessages(courseId);
      setMessages(fetchedMessages);
    };

    fetchAndSetMessages(); // Initial fetch

    const interval = setInterval(fetchAndSetMessages, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [courseId]);

  // Real-time resources
  useEffect(() => {
    if (!courseId) return;
    const unsubscribe = onResourcesUpdate(courseId, (fetchedResources) => {
      setResources(fetchedResources);
    });
    return () => unsubscribe();
  }, [courseId]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && currentUser?.uid && currentUser.displayName && courseId) {
      const message: Omit<ChatMessage, 'timestamp'> = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName,
        text: newMessage.trim(),
      };
      await sendChatMessage(courseId, message);
      setNewMessage('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && currentUser?.displayName && courseId) {
      const file = e.target.files[0];
      await uploadResource(courseId, file, { displayName: currentUser.displayName });
    }
  };

  const handleDeleteResource = async (fileName: string) => {
    if (courseId) {
      await deleteResource(courseId, fileName);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-8 text-center">
        <h1 className="text-3xl font-bold text-slate-100">Course Not Found</h1>
        <p className="text-slate-400">The community for course ID "{courseId}" could not be found.</p>
        <Button onClick={() => navigate('/insights')}>Back to Insights</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-slate-100 flex items-center">
        <BookOpen className="w-8 h-8 mr-3 text-violet-400" /> {course.name} Community
      </h1>
      <p className="text-slate-400">Connect with peers, share resources, and find study partners for {course.name}.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Chat and Resources */}
        <div className="lg:col-span-2 space-y-6">
          {/* Persistent Chat */}
          <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700 h-[500px] flex flex-col">
            <h2 className="text-xl font-bold text-slate-100 flex items-center mb-4">
              <MessageSquare className="w-6 h-6 mr-3 text-sky-400" /> Community Chat
            </h2>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.length === 0 ? (
                <p className="text-slate-400 text-center">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${msg.senderName}&background=random`}
                      alt="avatar" 
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{msg.senderName}</p>
                      <p className="text-slate-300 text-sm">{msg.text}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 text-sm"
              />
              <Button type="submit" className="px-3 py-2 text-sm">
                <Send size={16} className="mr-2" /> Send
              </Button>
            </form>
          </div>

          {/* Persistent File Sharing */}
          <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h2 className="text-xl font-bold text-slate-100 flex items-center mb-4">
              <Paperclip className="w-6 h-6 mr-3 text-amber-400" /> Shared Resources
            </h2>
            <div className="space-y-3">
              {resources.length === 0 ? (
                <p className="text-slate-400 text-center">No resources shared yet. Be the first to upload one!</p>
              ) : (
                resources.map((resource, index) => (
                  <div key={index} className="group flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                    <a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 text-slate-300 hover:text-white transition-colors">
                      <Paperclip size={18} />
                      <span>{resource.name}</span>
                      <span className="text-xs text-slate-500">({resource.uploader})</span>
                    </a>
                    <button
                      onClick={() => handleDeleteResource(resource.name)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4">
              <label htmlFor="file-upload" className="w-full flex items-center justify-center px-4 py-2 border border-dashed border-slate-600 rounded-md text-slate-400 hover:text-white hover:border-violet-500 transition-colors cursor-pointer">
                <UploadCloud size={18} className="mr-2" /> Upload Resource
              </label>
              <input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        </div>

        {/* Right Column: Active Study Rooms */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
            <h2 className="text-xl font-bold text-slate-100 flex items-center mb-4">
              <Users className="w-6 h-6 mr-3 text-emerald-400" /> Active Study Rooms
            </h2>
            <div className="space-y-3">
              {activeRooms.length === 0 ? (
                <p className="text-slate-400 text-center">No active study rooms for {course.name}.</p>
              ) : (
                activeRooms.map(room => (
                  <div key={room.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-white">{room.name}</h3>
                      <p className="text-sm text-slate-400">{room.users.length} / {room.maxUsers} students</p>
                    </div>
                    <Button onClick={() => navigate(`/study-room/${room.id}`)} disabled={room.users.length >= room.maxUsers} className="py-1.5 px-3 text-sm">
                      Join <ArrowRight size={14} className="ml-1"/>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCommunity;