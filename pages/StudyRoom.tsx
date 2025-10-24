import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { type ChatMessage, type StudyRoom as StudyRoomType, type Quiz as SharedQuiz } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
    onRoomUpdate,
    onMessagesUpdate,
    onNotesUpdate,
    saveRoomMessages, // Keep this if using mock for chat
    joinRoom,
    leaveRoom,
    saveRoomAINotes,
    // updateRoomPomodoroState, // Remove this import
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
// Remove Timer, Play, Pause, RefreshCw from lucide imports
import { Bot, User, Send, MessageSquare, Users, Brain, UploadCloud, Lightbulb, FileText, Paperclip, Smile, FolderOpen, AlertTriangle, Info } from 'lucide-react';
import { Input, Button, Textarea, Spinner } from '../components/ui';
import RoomControls from '../components/RoomControls';
import VideoTile from '../components/VideoTile';
import Reactions, { type Reaction } from '../components/Reactions';
import MusicPlayer from '../components/MusicPlayer';
import ShareModal from '../components/ShareModal';
import EditableNotes from '../components/EditableNotes';
import FlashcardGenerator from '../components/FlashcardGenerator';
import ConsolidatedNotes from '../components/ConsolidatedNotes';

// --- Helper Types & Constants ---
// Remove 'timer' from ActiveTab type
type ActiveTab = 'chat' | 'participants' | 'ai' | 'notes';
// Remove FOCUS_DURATION and BREAK_DURATION constants
// const FOCUS_DURATION = 25 * 60;
// const BREAK_DURATION = 5 * 60;

interface Quiz {
    topic: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    userAnswerIndex?: number;
}

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '🙏'];

// --- Main Component ---
const StudyRoom: React.FC = () => {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [room, setRoom] = useState<StudyRoomType | null>(null);
    const [participants, setParticipants] = useState<{ email: string; displayName: string }[]>([]);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [mediaError, setMediaError] = useState<{ message: string; type: 'error' | 'info' } | null>(null);
    const cameraVideoTrackRef = useRef<MediaStreamTrack | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
    const [userNotes, setUserNotes] = useState('');
    const [isSavingUserNotes, setIsSavingUserNotes] = useState(false);
    const [resources, setResources] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    
    // Feature states
    const [reactions, setReactions] = useState<Reaction[]>([]);
    const [showMusicPlayer, setShowMusicPlayer] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    // Group Chat State
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');

    // AI Buddy State
    const [aiMessages, setAiMessages] = useState<ChatMessage[]>([{ role: 'model', parts: [{ text: "Hello! Upload some notes and I'll help you study." }] }]);
    const [aiInput, setAiInput] = useState('');
    const [notes, setNotes] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [quiz, setQuiz] = useState<Quiz | null>(null);

    // Shared Quiz State
    const [sharedQuiz, setSharedQuiz] = useState<SharedQuiz | null>(null);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    // Remove Pomodoro Timer State
    // const [timeLeft, setTimeLeft] = useState(FOCUS_DURATION);
    
    const notesFileInputRef = useRef<HTMLInputElement>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const aiChatEndRef = useRef<HTMLDivElement>(null);
    const prevParticipantsRef = useRef<StudyRoomType['users']>([]);
    const welcomeMessageSent = useRef(false);

    // --- Chat Handlers ---
    const handleSendChatMessage = async (messageText: string) => {
    if (!messageText.trim() || !roomId || !currentUser) {
        console.log("handleSendChatMessage: Aborting - missing data", { messageText, roomId, currentUser }); // Add detailed log
        return;
    }

    const newMessage: ChatMessage = {
        role: 'user',
        parts: [{ text: messageText }],
        user: { email: currentUser.email, displayName: currentUser.displayName },
        timestamp: Date.now()
    };
    console.log("handleSendChatMessage: Sending message:", newMessage); // Add log
    try {
        await saveRoomMessages(roomId, [newMessage]);
        setChatInput(''); // Clear input AFTER successful save
         console.log("handleSendChatMessage: Message saved, input cleared."); // Add log
    } catch (error) {
         console.error("handleSendChatMessage: Error saving message:", error); // Log errors
    }
};

    // --- FIX: Moved postSystemMessage definition BEFORE the useEffect that uses it ---
     const postSystemMessage = useCallback(async (text: string) => {
        // System messages are disabled per user request.
    }, [roomId]);
    // --- END FIX ---


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
    }, [room, currentUser, postSystemMessage]); // Added postSystemMessage to dependency array

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

        let sessionId: string | null = null;

        joinRoom(roomId, currentUser);
        startSession('study-room', roomId).then(id => sessionId = id);

        const unsubRoom = onRoomUpdate(roomId, (updatedRoom) => {
            if (!updatedRoom) {
                console.log("Room not found or deleted, navigating away."); // Add log
                navigate('/study-lobby');
                return;
            }
             console.log("Room updated:", updatedRoom); // Add log
            setRoom(updatedRoom);
            setParticipants(updatedRoom.users);
        });

        const unsubMessages = onMessagesUpdate(roomId, setChatMessages);
        const unsubNotes = onNotesUpdate(roomId, setNotes);
        const unsubUserNotes = onUserNotesUpdate(roomId, setUserNotes);
        const unsubResources = onResourcesUpdate(roomId, setResources);
        const unsubQuiz = onQuizUpdate(roomId, (quiz) => {
            setSharedQuiz(quiz);
            // Check participants state directly here, not the potentially stale closure value
            setParticipants(currentParticipants => {
                 if (quiz && quiz.answers.length > 0 && quiz.answers.length === currentParticipants.length) {
                    setShowLeaderboard(true);
                }
                return currentParticipants; // Return the current state
            });

        });

        return () => {
            unsubRoom();
            unsubMessages();
            unsubNotes();
            unsubUserNotes();
            unsubResources();
            unsubQuiz();
            if (currentUser) {
                leaveRoom(roomId, currentUser);
            }
            if (sessionId) {
                endSession(sessionId);
            }
        };
    }, [roomId, currentUser, navigate]); // Removed participants from dependency array here
    
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);
    useEffect(() => { aiChatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [aiMessages, quiz]);

    useEffect(() => {
        // Now this effect can safely call postSystemMessage
        if (room && room.technique && room.topic && !welcomeMessageSent.current) {
            const welcomeMessage = `Welcome! This room is set up for a "Targeted Learning" session using the ${room.technique} technique on the topic: "${room.topic}". Let's get started!`
            postSystemMessage(welcomeMessage);
            welcomeMessageSent.current = true;
        }
    }, [room, postSystemMessage]); // Added postSystemMessage here too

    // --- Remove Pomodoro Timer Effect ---
    // useEffect(() => {
    //     // ... effect content removed ...
    // }, [room?.pomodoro]); // Remove dependencies related to timer if they were here

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
            localStream?.getVideoTracks()[0].stop();
            if (cameraVideoTrackRef.current) {
                localStream?.removeTrack(localStream.getVideoTracks()[0]);
                localStream?.addTrack(cameraVideoTrackRef.current);
            }
            setIsScreenSharing(false);
        } else {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                const screenTrack = screenStream.getVideoTracks()[0];
                
                screenTrack.onended = () => {
                    if (localStream && cameraVideoTrackRef.current) {
                       localStream.removeTrack(screenTrack);
                       localStream.addTrack(cameraVideoTrackRef.current);
                       setIsScreenSharing(false);
                    }
                };

                if (localStream) {
                    localStream.removeTrack(localStream.getVideoTracks()[0]);
                    localStream.addTrack(screenTrack);
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

    const handleSaveUserNotes = async (notes: string) => {
        if (!roomId) return;
        setIsSavingUserNotes(true);
        await saveUserNotes(roomId, notes);
        setIsSavingUserNotes(false);
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



    // --- Remove Pomodoro Handlers ---
    // const handleStartTimer = async () => { /* ... removed ... */ };
    // const handleStopTimer = async () => { /* ... removed ... */ };
    // const handleResetTimer = async () => { /* ... removed ... */ };
    // const handleTimerEnd = async () => { /* ... removed ... */ };

    // --- AI Buddy & Quiz Handlers ---
    // --- AI Buddy & Quiz Handlers ---
     const handleSendAiMessage = useCallback(async () => {
        // Add check for notes content
        if (!notes || notes.trim() === '' || notes.startsWith("Extracting text from")) {
             setAiMessages(prev => [...prev, { role: 'model', parts: [{ text: "Please upload some notes first using the button above so I have context!" }] }]);
             setAiInput(''); // Clear input after showing the message
             return;
        }

        if (!aiInput.trim() || isAiLoading) return;
        
        const currentMessageText = aiInput; // Capture input before clearing
        const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: currentMessageText }] };
        setAiMessages(prev => [...prev, newUserMessage]);
        setAiInput(''); // Clear input immediately
        setIsAiLoading(true);

        // --- Log the notes context being sent ---
        console.log("Sending AI message with notes context (length):", notes.length);
        // console.log("Notes Content:", notes.substring(0, 200) + "..."); // Optional: log start of notes

        try {
            const stream = await streamStudyBuddyChat(currentMessageText, notes); // Use captured input
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
                        // Ensure the last message exists and is from the model before updating
                        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
                           newMessages[newMessages.length - 1].parts = [{ text: modelResponse }];
                        } else {
                            // This case handles potential rapid state updates or unexpected scenarios
                           console.warn("Could not find previous model message to update, adding new one.");
                           return [...prev, { role: 'model', parts: [{ text: modelResponse }] }];
                        }
                        return newMessages;
                    });
                }
            }
            // Add a check in case the stream finished without starting (e.g., empty response)
             if (!streamedMessageStarted) {
                console.warn("AI stream finished without generating content.");
             }

        } catch (err) {
            console.error("Error calling streamStudyBuddyChat:", err); // Log the specific error
            // --- Improve Error Display ---
            const errorText = err instanceof Error ? err.message : "Sorry, an unexpected error occurred while contacting the AI.";
            setAiMessages(prev => [...prev, { role: 'model', parts: [{ text: `Error: ${errorText}` }] }]);
        } finally {
            setIsAiLoading(false);
        }
    }, [aiInput, isAiLoading, notes, roomId]); // Added roomId to dependencies as it's used i
    
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

        // Reset input to allow re-uploading the same file
        event.target.value = '';

        const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4 MB
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
            await saveRoomAINotes(roomId, ''); // Clear notes on failure
            setAiMessages([{ role: 'model', parts: [{ text: "Sorry, I couldn't read that file. It might be an unsupported format or corrupted. Please try another one." }] }]);
        } finally {
            setIsExtracting(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-900 text-slate-200 p-0 m-[-2rem] relative">
            <Reactions reactions={reactions} />
            {showMusicPlayer && <MusicPlayer onClose={() => setShowMusicPlayer(false)} />}
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
                <main className="flex-1 flex flex-col p-4">
                     {mediaError && (
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
                <aside className="w-96 bg-slate-800/70 flex flex-col h-full">
                    <div className="flex border-b border-slate-700">
                        <TabButton id="chat" activeTab={activeTab} setActiveTab={setActiveTab} icon={MessageSquare} label="Chat" />
                        <TabButton id="ai" activeTab={activeTab} setActiveTab={setActiveTab} icon={Brain} label="AI Buddy" />
                        <TabButton id="notes" activeTab={activeTab} setActiveTab={setActiveTab} icon={FileText} label="Notes" />
                        <TabButton id="participants" activeTab={activeTab} setActiveTab={setActiveTab} icon={Users} label="Participants" count={participants.length} />
                    </div>
                    
                    {activeTab === 'chat' && (
                        <ChatPanel
                            messages={chatMessages}
                            input={chatInput}
                            setInput={setChatInput}
                            onSend={handleSendChatMessage}
                            currentUser={currentUser}
                            chatEndRef={chatEndRef}
                        />
                    )}
                    {activeTab === 'ai' && (
                        <AiPanel
                            messages={aiMessages}
                            input={aiInput}
                            setInput={setAiInput}
                            onSend={handleSendAiMessage}
                            notes={notes}
                            isExtracting={isExtracting}
                            onUploadClick={() => notesFileInputRef.current?.click()}
                            // quiz={quiz} // Remove this if quiz state is local to AiChat
                            // onAnswerQuiz={handleAnswerQuiz} // Remove this if quiz state is local to AiChat
                            // onQuizMe={handleQuizMe} // Remove this if quiz state is local to AiChat
                             onQuizMe={handleGenerateQuiz} // Keep this if generating group quiz
                             sharedQuiz={sharedQuiz} // Pass shared quiz state
                            chatEndRef={aiChatEndRef}
                            isLoading={isAiLoading}
                        />
                    )}
                    {activeTab === 'notes' && (
                        <ConsolidatedNotes
                            initialUserNotes={userNotes}
                            onSaveUserNotes={handleSaveUserNotes}
                            isSaving={isSavingUserNotes}
                            resources={resources}
                            onUploadResource={handleUploadResource}
                            onDeleteResource={handleDeleteResource}
                            isUploading={isUploading}
                            aiNotes={notes}
                            isExtracting={isExtracting}
                            onUploadAINotesClick={() => notesFileInputRef.current?.click()}
                        />
                    )}
                    {activeTab === 'participants' && <ParticipantsPanel participants={participants} />}
                </aside>
            </div>
            
             <input type="file" ref={notesFileInputRef} onChange={handleNotesFileUpload} accept=".txt,.md,.pdf,.pptx" style={{ display: 'none' }} />

            {/* Bottom Controls */}
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
            />
        </div>
    );
};

// --- Sub-Components for Panels ---

const QuizDisplay: React.FC<{ quiz: SharedQuiz, onAnswer: (index: number) => void, currentUser: any }> = ({ quiz, onAnswer, currentUser }) => {
    const hasAnswered = quiz.answers.some(a => a.userId === currentUser?.email);

    return (
        <div className="w-full max-w-2xl bg-slate-800 rounded-2xl p-8 ring-1 ring-violet-600 shadow-2xl shadow-violet-500/20 animate-in fade-in-50 zoom-in-95">
            <p className="text-sm font-semibold text-violet-400 uppercase tracking-wider">Group Quiz</p>
            <h2 className="text-2xl font-bold text-white mt-2 mb-6">{quiz.question}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quiz.options.map((option, index) => (
                    <button 
                        key={index} 
                        onClick={() => onAnswer(index)} 
                        disabled={hasAnswered}
                        className={`p-4 text-left rounded-lg transition-all duration-200 text-base 
                            ${hasAnswered ? 'bg-slate-700/50 opacity-70' : 'bg-slate-700 hover:bg-violet-600 hover:ring-2 hover:ring-violet-400'}`}>
                        {option}
                    </button>
                ))}
            </div>
            {hasAnswered && <p className="text-center mt-6 text-sky-300">Your answer is locked in! Waiting for others...</p>}
        </div>
    );
};

const Leaderboard: React.FC<{ quiz: SharedQuiz, participants: any[], onClear: () => void }> = ({ quiz, participants, onClear }) => {
    const scores = participants.map(p => {
        const answer = quiz.answers.find(a => a.userId === p.email);
        const isCorrect = answer ? answer.answerIndex === quiz.correctOptionIndex : false;
        return { ...p, score: isCorrect ? 1 : 0 };
    }).sort((a, b) => b.score - a.score);

    return (
        <div className="w-full max-w-md bg-slate-800 rounded-2xl p-8 ring-1 ring-violet-600 shadow-2xl shadow-violet-500/20 animate-in fade-in-50 zoom-in-95">
            <h2 className="text-2xl font-bold text-center text-white mb-2">Quiz Over!</h2>
            <p className="text-center text-slate-400 mb-6">Here are the results:</p>
            <div className="space-y-3">
                {scores.map((p, index) => (
                    <div key={p.email} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-400 w-6 text-center">{index + 1}</span>
                            <img src={`https://ui-avatars.com/api/?name=${p.displayName}&background=random`} alt="avatar" className="w-9 h-9 rounded-full"/>
                            <span className="font-medium text-slate-200">{p.displayName}</span>
                        </div>
                        <span className={`font-bold text-lg ${p.score > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {p.score > 0 ? 'Correct' : 'Incorrect'}
                        </span>
                    </div>
                ))}
            </div>
            <Button onClick={onClear} className="w-full mt-8">Close</Button>
        </div>
    );
};

// --- Sub-Components for Panels ---

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

    return (
        <div className="flex flex-col flex-1 overflow-hidden p-4">
            <div className="flex-1 overflow-y-auto pr-2">
                {messages.map((msg: ChatMessage, i: number) => (
                    <div key={i} className={`flex items-start gap-2.5 my-3 ${msg.user?.email === currentUser?.email ? 'flex-row-reverse' : ''}`}>
                         <img src={`https://ui-avatars.com/api/?name=${msg.user?.displayName || '?'}&background=random`} alt="avatar" className="w-8 h-8 rounded-full" />
                         <div className={`flex flex-col max-w-[80%] ${msg.user?.email === currentUser?.email ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs text-slate-400 mb-1 px-1">{msg.user?.displayName} {msg.user?.email === 'system@nexus.ai' && '🤖'}</span>
                            <div className={`p-3 rounded-xl text-sm ${msg.user?.email === currentUser?.email ? 'bg-sky-600 text-white rounded-br-none' : 'bg-slate-700 rounded-bl-none'} ${msg.user?.email === 'system@nexus.ai' && 'bg-violet-900/50 italic'}`}>
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
                                    onKeyPress={e => e.key === 'Enter' && !e.shiftKey && onSend(input)} // Added !e.shiftKey to prevent sending on Shift+Enter
                                    placeholder="Type a message..."
                                    className="flex-1"
                                />
                                <Button onClick={() => onSend(input)} disabled={!input.trim()} className="px-3"><Send size={16}/></Button>            </div>
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
            <Textarea value={notes} placeholder="Upload a file to set the AI context for everyone..." rows={6} className="resize-none bg-slate-700/80" readOnly />
            <Button onClick={onUploadClick} disabled={isExtracting} className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500"><UploadCloud size={14} className="mr-1"/> Upload</Button>
            {isExtracting && <div className="absolute inset-0 bg-slate-800/80 flex items-center justify-center rounded-md"><Spinner /></div>}
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
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && onSend()} placeholder="Ask the AI..." className="flex-1" disabled={isExtracting || !!sharedQuiz}/>
            <Button onClick={onQuizMe} disabled={isExtracting || !!sharedQuiz || !notes.trim()} className="px-3" title="Generate Group Quiz"><Lightbulb size={16}/></Button>
            <Button onClick={onSend} disabled={!input.trim() || isExtracting || !!sharedQuiz} className="px-3"><Send size={16}/></Button>
        </div>
    </div>
);

// --- Remove FocusTimerPanel Component Definition ---
// const formatTime = (seconds: number) => { /* ... removed ... */ };
// const FocusTimerPanel: React.FC<{ /* ... props removed ... */ }> = ({ /* ... params removed ... */ }) => {
//     /* ... component content removed ... */
// };


export default StudyRoom;