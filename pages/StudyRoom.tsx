import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type ChatMessage, type StudyRoom as StudyRoomType, type Quiz as SharedQuiz } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    onRoomUpdate,
    onMessagesUpdate,
    onNotesUpdate,
    saveRoomMessages,
    joinRoom,
    leaveRoom,
    saveRoomAINotes,
    saveUserNotes,
    onUserNotesUpdate,
    uploadResource,
    deleteResource,
    onResourcesUpdate,
    onQuizUpdate,
    saveQuiz,
    saveQuizAnswer,
    clearQuiz,
} from '../services/communityService';
import { streamStudyBuddyChat, generateQuizQuestion, extractTextFromFile } from '../services/geminiService';
import { startSession, endSession, recordQuizResult } from '../services/analyticsService';
// --- REMOVED Clock import here ---
import { Bot, User, Send, MessageSquare, Users, Brain, UploadCloud, Lightbulb, FileText, Paperclip, Smile, FolderOpen, AlertTriangle, Info } from 'lucide-react';
// --- END REMOVAL ---
import { Input, Button, Textarea, Spinner } from '../components/ui';
import RoomControls from '../components/RoomControls'; //
import VideoTile from '../components/VideoTile';
import Reactions, { type Reaction } from '../components/Reactions';
import MusicPlayer from '../components/MusicPlayer';
import ShareModal from '../components/ShareModal';
import StudyRoomNotesPanel from '../components/StudyRoomNotesPanel'; // Import the new component


// ... (Helper Types & formatElapsedTime function remain the same) ...
// --- Helper Types & Constants ---
type ActiveTab = 'chat' | 'participants' | 'ai' | 'notes';


interface Quiz {
    topic: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    userAnswerIndex?: number;
}

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '🙏'];
const SYSTEM_EMAIL = 'system@nexus.ai';

const formatElapsedTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = seconds.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');

  if (hours > 0) {
    const paddedHours = hours.toString().padStart(2, '0');
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    return `${paddedMinutes}:${paddedSeconds}`;
  }
};


// --- Main Component ---
const StudyRoom: React.FC = () => {
    // ... (State, Refs, Handlers, Effects all remain the same) ...
     const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [room, setRoom] = useState<StudyRoomType | null>(null);
    const [participants, setParticipants] = useState<{ email: string; displayName: string }[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mediaError, setMediaError] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [isSavingSharedNote, setIsSavingSharedNote] = useState(false); // NEW: Loading state for saving shared note
    const [resources, setResources] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [showMusicPlayer, setShowMusicPlayer] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [allMessages, setAllMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [aiMessages, setAiMessages] = useState<ChatMessage[]>([{ role: 'model', parts: [{ text: "Hello! Upload some notes and I'll help you study." }] }]);
    const [aiInput, setAiInput] = useState('');
    const [notes, setNotes] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [sharedQuiz, setSharedQuiz] = useState<SharedQuiz | null>(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    const [elapsedTime, setElapsedTime] = useState(0); // Time in seconds
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const notesFileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const aiChatEndRef = useRef<HTMLDivElement>(null);
    const prevParticipantsRef = useRef<StudyRoomType['users']>([]);
    const welcomeMessageSent = useRef(false);

    // --- FIX 1: Add a ref for the session ID ---
    const sessionIdRef = useRef<string | null>(null);
    // --- END FIX ---

    // --- NEW: Handler to add a test user ---
    const handleAddTestUser = () => {
        if (!roomId) return;
        const testUser = {
            // Create a slightly unique email/name each time to avoid potential key issues if clicked rapidly
            email: `testuser_${Date.now()}@example.com`,
            displayName: `Test User ${Math.floor(Math.random() * 100)}`
        };
        console.log("Attempting to add test user:", testUser);
        joinRoom(roomId, testUser); // Call the existing joinRoom service function
        // Note: The participant list will update automatically via the onRoomUpdate listener
    };
    // --- END NEW HANDLER ---

    const participantChatMessages = useMemo(() => {
        return allMessages.filter(msg => msg.role === 'user' && msg.user?.email !== SYSTEM_EMAIL);
    }, [allMessages]);

    // --- Chat Handlers ---
    const handleSendChatMessage = async (messageText: string) => {
        if (!messageText.trim() || !roomId || !currentUser) {
            console.log("handleSendChatMessage: Aborting - missing data", { messageText, roomId, currentUser });
            return;
        }

        const newMessage: ChatMessage = {
            role: 'user',
            parts: [{ text: messageText }],
            user: { email: currentUser.email, displayName: currentUser.displayName },
            timestamp: Date.now()
        };
        console.log("handleSendChatMessage: Sending message:", newMessage);
        try {
            await saveRoomMessages(roomId, [newMessage]);
            setChatInput(''); // Clear input AFTER successful save
             console.log("handleSendChatMessage: Message saved, input cleared.");
        } catch (error) {
             console.error("handleSendChatMessage: Error saving message:", error);
        }
    };

     const postSystemMessage = useCallback(async (text: string) => {
        if (!roomId) return;
        const systemMessage: ChatMessage = {
            role: 'model',
            parts: [{ text }],
            user: { displayName: 'Focus Bot', email: SYSTEM_EMAIL },
            timestamp: Date.now()
        };
        await saveRoomMessages(roomId, [systemMessage]);
    }, [roomId]);


    useEffect(() => {
        if (room) {
            const prevEmails = prevParticipantsRef.current.map(p => p.email);
            const currentEmails = room.users.map(p => p.email);

            const newUsers = room.users.filter(p => !prevEmails.includes(p.email) && p.email !== currentUser?.email);
            const leftUsers = prevParticipantsRef.current.filter(p => !currentEmails.includes(p.email));
            if (leftUsers.length > 0) {
                leftUsers.forEach(user => {
                    postSystemMessage(`${user.displayName} has left the room.`);
                });
            }

            prevParticipantsRef.current = room.users;
        }
    }, [room, currentUser, postSystemMessage]);

    // --- Effects for Setup and Teardown ---
    const getMedia = useCallback(async () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            cameraVideoTrackRef.current = stream.getVideoTracks()[0];
            setLocalStream(stream);
            setMediaError(null);
            setIsMuted(false);
            setIsCameraOn(true);
        } catch (err: any) {
            console.error("Error accessing media devices.", err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setMediaError({
                    message: "Permissions denied. Grant camera/mic access in your browser settings to share video.",
                    type: 'info'
                });
            } else {
                let errorMessage = "Could not access camera/microphone. Video features are disabled.";
                if (err.name === 'NotFoundError') {
                    errorMessage = "No camera or microphone found. Video features are unavailable.";
                }
                setMediaError({ message: errorMessage, type: 'error' });
            }
            setLocalStream(null);
            localStreamRef.current = null;
        }
    }, []);

    useEffect(() => {
        getMedia();
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [getMedia]);


    useEffect(() => {
        if (!roomId || !currentUser) return;

        // --- REMOVED: let sessionId: string | null = null; ---

        joinRoom(roomId, currentUser);
        
        // --- FIX 2: Use the sessionIdRef ---
        startSession('study-room', roomId).then(id => {
            sessionIdRef.current = id; // Assign the ID to the ref
            console.log("Study session started:", id);
        });
        // --- END FIX ---

        // --- Start Timer ---
        setElapsedTime(0); // Reset timer on join
        startTimeRef.current = Date.now();
        intervalRef.current = setInterval(() => {
          if (startTimeRef.current) {
            const now = Date.now();
            const elapsed = Math.floor((now - startTimeRef.current) / 1000); // Elapsed seconds
            setElapsedTime(elapsed);
          }
        }, 1000);
        // --- End Start Timer ---

        const unsubRoom = onRoomUpdate(roomId, (updatedRoom) => {
            if (!updatedRoom) {
                console.log("Room not found or deleted, navigating away.");
                navigate('/study-lobby');
                return;
            }
             console.log("Room updated:", updatedRoom);
            setRoom(updatedRoom);
            setParticipants(updatedRoom.users);
        });

        const unsubMessages = onMessagesUpdate(roomId, setAllMessages);
        const unsubNotes = onNotesUpdate(roomId, setNotes);

        const unsubResources = onResourcesUpdate(roomId, setResources);
        const unsubQuiz = onQuizUpdate(roomId, (quiz) => {
            setSharedQuiz(quiz);
             setParticipants(currentParticipants => {
                 if (quiz && quiz.answers.length > 0 && quiz.answers.length === currentParticipants.length) {
                    setShowLeaderboard(true);
                }
                return currentParticipants;
            });

        });

        return () => {
            // --- Stop Timer ---
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            startTimeRef.current = null;
            intervalRef.current = null;
            // --- End Stop Timer ---

            unsubRoom();
            unsubMessages();
            unsubNotes();

            unsubResources();
            unsubQuiz();
            if (currentUser) {
                leaveRoom(roomId, currentUser);
            }

            // --- FIX 2 (cleanup): Use the ref here as well ---
            // This now acts as a fallback if the user closes the tab
            if (sessionIdRef.current) {
                console.log("Ending session from cleanup:", sessionIdRef.current);
                endSession(sessionIdRef.current);
                sessionIdRef.current = null;
            }
            // --- END FIX ---
        };
    }, [roomId, currentUser, navigate]);

    useEffect(() => {
        const timer = setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 0);

        return () => clearTimeout(timer);
    }, [participantChatMessages]);

    useEffect(() => { aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages, sharedQuiz])

    useEffect(() => {
        if (room && room.technique && room.topic && !welcomeMessageSent.current) {
            const welcomeMessage = `Welcome! This room is set up for a "Targeted Learning" session using the ${room.technique} technique on the topic: "${room.topic}". Let's get started!`
            postSystemMessage(welcomeMessage);
            welcomeMessageSent.current = true;
        }
    }, [room, postSystemMessage]);

    // --- Control Handlers ---
    const handleToggleMute = () => {
        localStream?.getAudioTracks().forEach(track => track.enabled = !track.enabled);
        setIsMuted(prev => !prev);
    };

    const handleToggleCamera = () => {
        if (isScreenSharing) return;
        localStream?.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        setIsCameraOn(prev => !prev);
    };

    const handleHangUp = async () => {
        // --- FIX 3: Explicitly end the session on "Leave" button click ---
        if (sessionIdRef.current) {
            console.log("Ending session from HangUp:", sessionIdRef.current);
            await endSession(sessionIdRef.current);
            sessionIdRef.current = null; // Clear ref so cleanup doesn't run it again
        }
        // --- END FIX ---

        if (roomId && currentUser) {
            await leaveRoom(roomId, currentUser);
        }
        localStream?.getTracks().forEach(track => track.stop());
        navigate('/study-lobby');
    };

    const handleToggleScreenShare = async () => {
        if (!localStreamRef.current && !isScreenSharing) {
             setMediaError({ message: "Cannot share screen without media permissions. Please grant access and retry.", type: 'error' });
             return;
        }

        if (isScreenSharing) {
            const screenTrack = localStreamRef.current?.getVideoTracks().find(track => track.label.startsWith('screen'));
            if (screenTrack) {
                screenTrack.stop();
                localStreamRef.current?.removeTrack(screenTrack);
            }

            if (cameraVideoTrackRef.current) {
                try {
                     cameraVideoTrackRef.current.enabled = true;
                     localStreamRef.current?.addTrack(cameraVideoTrackRef.current);
                     setIsCameraOn(true);
                } catch (addTrackError) {
                     console.error("Error re-adding camera track:", addTrackError);
                     await getMedia();
                }
            } else {
                 await getMedia();
            }
            setIsScreenSharing(false);
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
                const screenTrack = screenStream.getVideoTracks()[0];

                screenTrack.onended = () => {
                    if (localStreamRef.current && cameraVideoTrackRef.current) {
                        localStreamRef.current.removeTrack(screenTrack);
                        localStreamRef.current.addTrack(cameraVideoTrackRef.current);
                        setIsScreenSharing(false);
                        setIsCameraOn(true);
                    } else if (localStreamRef.current) {
                         localStreamRef.current.removeTrack(screenTrack);
                         setIsScreenSharing(false);
                    }
                };

                if (localStreamRef.current) {
                    const currentVideoTrack = localStreamRef.current.getVideoTracks()[0];
                     if (currentVideoTrack) {
                        localStreamRef.current.removeTrack(currentVideoTrack);
                     }
                    localStreamRef.current.addTrack(screenTrack);
                    setIsScreenSharing(true);
                    setIsCameraOn(true);
                } else {
                     localStreamRef.current = new MediaStream([screenTrack]);
                     setLocalStream(localStreamRef.current);
                     setIsScreenSharing(true);
                     setIsCameraOn(true);
                }
            } catch (err: any) {
                console.error("Screen sharing failed:", err);
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                    setMediaError({
                        message: "Screen sharing permission was denied. You can grant it from the browser's address bar.",
                        type: 'info'
                    });
                } else {
                    setMediaError({
                        message: "Could not start screen sharing due to an error.",
                        type: 'error'
                    });
                }
            }
        }
    };

    const handleReaction = (emoji: string) => {
        setReactions(prev => [...prev, { id: Date.now(), emoji }]);
    };

    const handleSaveSharedNote = async (content: string) => {
        if (!roomId) return;
        setIsSavingSharedNote(true);
        try {
            await saveRoomAINotes(roomId, content); // Use the service function for shared AI notes
            console.log("Shared note saved.");
        } catch (error) {
            console.error("Failed to save shared note:", error);
            // Optionally show error to user
        } finally {
            setIsSavingSharedNote(false);
        }
    };

    const handleUploadResource = async (file: File) => {
        if (!roomId || !currentUser) return;
        setIsUploading(true);
        await uploadResource(roomId, file, { displayName: currentUser.displayName });
        postSystemMessage(`${currentUser.displayName} uploaded a new resource: ${file.name}`);
        setIsUploading(false);
    };

    const handleDeleteResource = async (fileName: string) => {
        if (!roomId) return;
        await deleteResource(roomId, fileName);
    };

    // --- AI Buddy & Quiz Handlers ---
     const handleSendAiMessage = useCallback(async () => {
        if (!notes || notes.trim() === '' || notes.startsWith("Extracting text from")) {
             setAiMessages(prev => [...prev, { role: 'model', parts: [{ text: "Please upload some notes first using the button above so I have context!" }] }]);
             setAiInput('');
             return;
        }

        if (!aiInput.trim() || isAiLoading) return;

        const currentMessageText = aiInput;
        const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: currentMessageText }] };
        setAiMessages(prev => [...prev, newUserMessage]);
        setAiInput('');
        setIsAiLoading(true);

        console.log("Sending AI message with notes context (length):", notes.length);

        try {
            const stream = await streamStudyBuddyChat(currentMessageText, notes);
            let modelResponse = '';
            let streamedMessageStarted = false;

            for await (const chunk of stream) {
                modelResponse += chunk.text;
                if (!streamedMessageStarted) {
                    streamedMessageStarted = true;
                    setAiMessages(prev => [...prev, { role: 'model', parts: [{ text: modelResponse }] }]);
                } else {
                    setAiMessages(prev => {
                        const newMessages = [...prev];
                        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
                           newMessages[newMessages.length - 1].parts = [{ text: modelResponse }];
                        } else {
                           console.warn("Could not find previous model message to update, adding new one.");
                           return [...prev, { role: 'model', parts: [{ text: modelResponse }] }];
                        }
                        return newMessages;
                    });
                }
            }
             if (!streamedMessageStarted) {
                console.warn("AI stream finished without generating content.");
             }

        } catch (err) {
            console.error("Error calling streamStudyBuddyChat:", err);
            const errorText = err instanceof Error ? err.message : "Sorry, an unexpected error occurred while contacting the AI.";
            setAiMessages(prev => [...prev, { role: 'model', parts: [{ text: `Error: ${errorText}` }] }]);
        } finally {
            setIsAiLoading(false);
        }
    }, [aiInput, isAiLoading, notes]);

    const handleGenerateQuiz = async () => {
        if (isAiLoading || !notes.trim() || !roomId) return;
        setIsAiLoading(true);
        postSystemMessage(`${currentUser?.displayName} is generating a quiz for the group!`);

        try {
            const quizJsonString = await generateQuizQuestion(notes);
            const parsedQuiz = JSON.parse(quizJsonString);
            await saveQuiz(roomId, parsedQuiz);
        } catch (err) {
            postSystemMessage("Sorry, I couldn't generate a quiz. Please try again.");
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleAnswerQuiz = async (selectedIndex: number) => {
        if (!sharedQuiz || !roomId || !currentUser?.email || !currentUser.displayName) return;
        await saveQuizAnswer(roomId, currentUser.email, currentUser.displayName, selectedIndex);
    };

    const handleClearQuiz = async () => {
        if (!roomId) return;
        setShowLeaderboard(false);
        await clearQuiz(roomId);
    };


    const handleNotesFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !roomId) return;

        event.target.value = '';

        const MAX_FILE_SIZE = 4 * 1024 * 1024;
        if (file.size > MAX_FILE_SIZE) {
            setAiMessages([{ role: 'model', parts: [{ text: `File is too large. Please upload a file smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.` }] }]);
            return;
        }

        setIsExtracting(true);
        setNotes(`Extracting text from ${file.name}...`);
        setAiMessages([{ role: 'model', parts: [{ text: "Analyzing your document..." }] }]);

        try {
            const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = reader.result as string;
                    if (!result || !result.includes(',')) {
                        return reject(new Error("Invalid file data"));
                    }
                    const base64 = result.split(',')[1];
                    resolve(base64);
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(file);
            });

            const extracted = await extractTextFromFile(base64Data, file.type);

            await saveRoomAINotes(roomId, extracted);

            setAiMessages([{ role: 'model', parts: [{ text: "Great, I've reviewed the notes. The AI context is now updated for everyone in the room." }] }]);

            await postSystemMessage(`${currentUser?.displayName} updated the study notes with the file: ${file.name}`);

        } catch (err) {
            console.error("File upload and processing failed:", err);
            await saveRoomAINotes(roomId, '');
            setAiMessages([{ role: 'model', parts: [{ text: "Sorry, I couldn't read that file. It might be an unsupported format or corrupted. Please try another one." }] }]);
        } finally {
            setIsExtracting(false);
        }
    };


    // --- Component Return ---
    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-200 p-0 m-[-2rem] relative">
            <Reactions reactions={reactions} />
            {showShareModal && <ShareModal roomId={roomId || ''} onClose={() => setShowShareModal(false)} />}

            {sharedQuiz && (
                <div className="absolute inset-0 bg-slate-900/90 z-20 flex items-center justify-center p-8 backdrop-blur-sm">
                    {showLeaderboard ?
                        <Leaderboard quiz={sharedQuiz} participants={participants} onClear={handleClearQuiz} /> :
                        <QuizDisplay quiz={sharedQuiz} onAnswer={handleAnswerQuiz} currentUser={currentUser} />
                    }
                </div>
            )}


            <div className="flex-1 flex overflow-hidden">
                {/* Main Video Grid */}
                <main className="flex-1 flex flex-col p-4 relative">
                     {/* --- REMOVED Timer Display FROM HERE --- */}

                     {mediaError && (
                        // ... (media error display) ...
                        <div className={`
                            p-3 rounded-lg text-sm mb-4 ring-1 flex justify-between items-center animate-in fade-in-50
                            ${mediaError.type === 'error'
                                ? 'bg-red-900/50 text-red-300 ring-red-700'
                                : 'bg-sky-900/50 text-sky-300 ring-sky-700'
                            }
                        `}>
                            <div className="flex items-center gap-2">
                                {mediaError.type === 'error' ? <AlertTriangle size={18}/> : <Info size={18}/>}
                                <span className="font-medium">{mediaError.message}</span>
                            </div>
                            <button onClick={getMedia} className={`
                                font-semibold text-white rounded-md py-1 px-3 text-xs transition-colors
                                ${mediaError.type === 'error'
                                    ? 'bg-red-600/50 hover:bg-red-600/80'
                                    : 'bg-sky-600/50 hover:bg-sky-600/80'
                                }
                            `}>
                                Retry Access
                            </button>
                        </div>
                    )}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <VideoTile stream={localStream} displayName={currentUser?.displayName || 'You'} isMuted={isMuted} isLocal={true} isScreenSharing={isScreenSharing} />
                        {participants.filter(p => p.email !== currentUser?.email).map(p => (
                             <VideoTile key={p.email} displayName={p.displayName} isMuted={false} />
                        ))}
                    </div>

                </main>

                {/* Side Panel */}
                {/* ... (Side Panel Tabs and Content remain the same) ... */}
                 <aside className="w-96 bg-slate-800/70 flex flex-col h-full">
                    <div className="flex border-b border-slate-700">
                        <TabButton id="chat" activeTab={activeTab} setActiveTab={setActiveTab} icon={MessageSquare} label="Chat" />
                        <TabButton id="ai" activeTab={activeTab} setActiveTab={setActiveTab} icon={Brain} label="AI Buddy" />
                        <TabButton id="notes" activeTab={activeTab} setActiveTab={setActiveTab} icon={FileText} label="Notes" />
                        <TabButton id="participants" activeTab={activeTab} setActiveTab={setActiveTab} icon={Users} label="Participants" count={participants.length} />
                    </div>

                    {activeTab === 'chat' && (
                        <ChatPanel
                            messages={participantChatMessages}
                            input={chatInput}
                            setInput={setChatInput}
                            onSend={handleSendChatMessage}
                            currentUser={currentUser}
                            chatEndRef={chatEndRef}
                        />
                    )}
                    {activeTab === 'participants' && <ParticipantsPanel participants={participants} />}
                    {activeTab === 'ai' && (
                        <AiPanel
                            messages={aiMessages}
                            input={aiInput}
                            setInput={setAiInput}
                            onSend={handleSendAiMessage}
                            notes={notes}
                            isExtracting={isExtracting}
                            onUploadClick={() => notesFileInputRef.current?.click()}
                            onQuizMe={handleGenerateQuiz}
                            sharedQuiz={sharedQuiz}
                            chatEndRef={aiChatEndRef}
                            isLoading={isAiLoading}
                        />
                    )}
                    {activeTab === 'notes' && (
                        <StudyRoomNotesPanel
                            sharedNoteContent={notes} // Pass the shared text content
                            resources={resources} // Pass the list of shared files
                            onSaveSharedNote={handleSaveSharedNote} // Pass the save handler for text
                            onUploadResource={handleUploadResource} // Pass the file upload handler
                            onDeleteResource={handleDeleteResource} // Pass the file delete handler
                            isSavingNote={isSavingSharedNote} // Pass loading state for saving text
                            isUploading={isUploading} // Pass loading state for file upload
                        />
                    )}
                </aside>

            </div>

             <input type="file" ref={notesFileInputRef} onChange={handleNotesFileUpload} accept=".txt,.md,.pdf,.pptx" style={{ display: 'none' }} />

             <RoomControls
                mediaReady={!!localStream}
                isMuted={isMuted}
                isCameraOn={isCameraOn}
                isScreenSharing={isScreenSharing}
                onToggleMute={handleToggleMute}
                onToggleCamera={handleToggleCamera}
                onToggleScreenShare={handleToggleScreenShare}
                onHangUp={handleHangUp}
                onReact={handleReaction}
                onToggleMusic={() => setShowMusicPlayer(p => !p)}
                onShare={() => setShowShareModal(true)}
                roomId={roomId || ''}
                formattedSessionTime={formatElapsedTime(elapsedTime)} // Pass formatted time
                onAddTestUser={handleAddTestUser}
                showMusicPlayer={showMusicPlayer} // Pass showMusicPlayer state
            >
                {showMusicPlayer && <MusicPlayer onClose={() => setShowMusicPlayer(false)} />} {/* Render MusicPlayer as child */}
            </RoomControls>
            {/* --- END FIX --- */}
        </div>
    );
};

// ... (Sub-Components remain the same) ...
// --- QuizDisplay Component ---
const QuizDisplay: React.FC<{ quiz: SharedQuiz, onAnswer: (index: number) => void, currentUser: any }> = ({ quiz, onAnswer, currentUser }) => {
    const userAnswer = quiz.answers.find(a => a.userId === currentUser?.email);

    return (
        <div className="bg-slate-800 p-6 rounded-lg w-full max-w-2xl animate-in fade-in-50">
            <p className="font-semibold text-slate-200 text-base mb-1">Group Quiz: <span className="capitalize font-light">{quiz.topic}</span></p>
            <p className="font-bold text-slate-100 text-lg mb-4">{quiz.question}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quiz.options.map((option, index) => {
                     const isSelected = userAnswer?.answerIndex === index;
                     const isCorrect = quiz.correctOptionIndex === index;
                     let buttonClass = 'bg-slate-700 hover:bg-slate-600';
                     if (userAnswer !== undefined) {
                        if (isSelected) buttonClass = 'bg-sky-700 ring-2 ring-sky-500';
                        else buttonClass = 'bg-slate-800/50 opacity-60';
                     }

                     return (
                        <button
                            key={index}
                            onClick={() => onAnswer(index)}
                            disabled={userAnswer !== undefined}
                            className={`p-3 text-left text-sm rounded-lg transition-all duration-200 ${buttonClass}`}
                        >
                            {option}
                        </button>
                    )
                })}
            </div>
            {userAnswer !== undefined && <p className="text-center text-slate-400 mt-4 text-sm">Waiting for others to answer...</p>}
        </div>
    );
};

// --- Leaderboard Component ---
const Leaderboard: React.FC<{ quiz: SharedQuiz, participants: { email: string; displayName: string }[], onClear: () => void }> = ({ quiz, participants, onClear }) => {
    const scores = participants.map(p => {
        const answer = quiz.answers.find(a => a.userId === p.email);
        const isCorrect = answer?.answerIndex === quiz.correctOptionIndex;
        return {
            displayName: p.displayName,
            score: isCorrect ? 1 : 0,
            answered: !!answer,
        };
    }).sort((a, b) => b.score - a.score);

    return (
        <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md animate-in fade-in-50">
            <h3 className="text-xl font-bold text-center text-white mb-2">Quiz Results!</h3>
             <p className="text-center text-slate-300 mb-1 text-sm">{quiz.question}</p>
             <p className="text-center text-emerald-400 mb-4 text-sm font-medium">Correct Answer: {quiz.options[quiz.correctOptionIndex]}</p>
            <div className="space-y-2">
                {scores.map((player, index) => (
                    <div key={player.displayName} className="flex justify-between items-center bg-slate-700 p-3 rounded-lg">
                        <span className="font-medium">{index + 1}. {player.displayName}</span>
                        <span className={`font-bold ${player.score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {player.answered ? (player.score > 0 ? '+1 Point' : '+0 Points') : 'Did not answer'}
                        </span>
                    </div>
                ))}
            </div>
            <Button onClick={onClear} className="w-full mt-6">Close Results</Button>
        </div>
    );
};

const TabButton: React.FC<{id: ActiveTab, activeTab: ActiveTab, setActiveTab: (tab: ActiveTab) => void, icon: React.ElementType, label: string, count?: number}> = ({ id, activeTab, setActiveTab, icon: Icon, label, count }) => (
    <button onClick={() => setActiveTab(id)} className={`flex-1 flex justify-center items-center gap-2 py-3 text-sm font-medium transition-colors ${activeTab === id ? 'bg-slate-700 text-violet-400' : 'text-slate-400 hover:bg-slate-700/50 hover:text-white'}`}>
        <Icon size={16} /> {label} {count !== undefined && <span className="text-xs bg-slate-600 rounded-full px-1.5">{count}</span>}
    </button>
);

const ChatPanel: React.FC<any> = ({ messages, input, setInput, onSend, currentUser, chatEndRef }) => {
    const [showEmojis, setShowEmojis] = useState(false);

    const handleEmojiSelect = (emoji: string) => {
        setInput(input + emoji);
        setShowEmojis(false);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        onSend(input);
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden p-4">
            <div className="flex-1 overflow-y-auto pr-2">
                {messages.map((msg: ChatMessage, i: number) => (
                     <div key={i} className={`flex items-start gap-2.5 my-3 ${msg.user?.email === currentUser?.email ? 'flex-row-reverse' : ''}`}>
                         <img src={`https://ui-avatars.com/api/?name=${msg.user?.displayName || '?'}&background=random`} alt="avatar" className="w-8 h-8 rounded-full" />
                         <div className={`flex flex-col max-w-[80%] ${msg.user?.email === currentUser?.email ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs text-slate-400 mb-1 px-1">{msg.user?.displayName}</span>
                            <div className={`p-3 rounded-xl text-sm ${msg.user?.email === currentUser?.email ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                {msg.parts[0].text}
                            </div>
                        </div>
                    </div>
                ))}
                 <div ref={chatEndRef}></div>
            </div>
            <div className="mt-auto flex gap-2 relative">
                {showEmojis && (
                    <div className="absolute bottom-14 left-0 bg-slate-900 p-2 rounded-lg grid grid-cols-3 gap-2">
                        {EMOJIS.map(emoji => (
                            <button key={emoji} onClick={() => handleEmojiSelect(emoji)} className="text-2xl p-1 hover:bg-slate-700 rounded">{emoji}</button>
                        ))}
                    </div>
                )}
                <Button onClick={() => setShowEmojis(p => !p)} className="px-3 bg-slate-700 hover:bg-slate-600"><Smile size={16}/></Button>
                <Input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyPress={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="Type a message..."
                    className="flex-1"
                />
                <Button onClick={handleSend} disabled={!input.trim()} className="px-3"><Send size={16}/></Button>
            </div>
        </div>
    );
}

const ParticipantsPanel: React.FC<{participants: { email: string; displayName: string }[]}> = ({ participants }) => (
    <div className="p-4 space-y-3 overflow-y-auto">
        {participants.map(p => (
            <div key={p.email} className="flex items-center gap-3 bg-slate-700/50 p-2 rounded-lg">
                <img src={`https://ui-avatars.com/api/?name=${p.displayName}&background=random`} alt="avatar" className="w-9 h-9 rounded-full"/>
                <span className="font-medium text-slate-200">{p.displayName}</span>
            </div>
        ))}
    </div>
);

const AiPanel: React.FC<any> = ({ messages, input, setInput, onSend, notes, isExtracting, onUploadClick, onQuizMe, chatEndRef, isLoading, sharedQuiz }) => (
    <div className="flex flex-col flex-1 overflow-hidden p-4">
        <div className="relative">
            <Textarea value={notes} placeholder="Upload a file (.txt, .md, .pdf, .pptx) to set the AI context for everyone..." rows={6} className="resize-none bg-slate-700/80" readOnly />
            <Button onClick={onUploadClick} disabled={isExtracting || isLoading} className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500"><UploadCloud size={14} className="mr-1"/> Upload Notes</Button>
            {isExtracting && <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center rounded-md"><Spinner /> <span className="ml-2 text-sm text-slate-300">Extracting text...</span></div>}
        </div>
        <div className="flex-1 overflow-y-auto pr-2 my-4 space-y-3">
             {messages.map((msg: ChatMessage, i: number) => (
                <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'model' ? '' : 'justify-end'}`}>
                    {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0"><Bot size={18}/></div>}
                     <div className={`p-3 rounded-xl text-sm max-w-[85%] ${msg.role === 'model' ? 'bg-slate-700 rounded-bl-none' : 'bg-sky-600 rounded-br-none text-white'}`} style={{ whiteSpace: 'pre-wrap' }}>{msg.parts[0].text}</div>
                </div>
             ))}
              {isLoading && <div className="flex justify-center"><Spinner /></div>}
             <div ref={chatEndRef}></div>
        </div>
        <div className="mt-auto flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && onSend()} placeholder="Ask the AI..." className="flex-1" disabled={isExtracting || !!sharedQuiz || isLoading}/>
            <Button onClick={onQuizMe} disabled={isExtracting || !!sharedQuiz || !notes.trim() || isLoading} className="px-3" title="Generate Group Quiz"><Lightbulb size={16}/></Button>
            <Button onClick={onSend} disabled={!input.trim() || isExtracting || !!sharedQuiz || isLoading} className="px-3"><Send size={16}/></Button>
        </div>
    </div>
);



export default StudyRoom;
