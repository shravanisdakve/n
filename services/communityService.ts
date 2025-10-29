import { type StudyRoom, type ChatMessage, type PomodoroState, type Quiz } from '../types';
import { db, auth, storage } from '../firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    limit,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    Timestamp,
    onSnapshot,
    setDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject, getMetadata } from 'firebase/storage';

// --- MOCK DATABASE ---
const mockRooms: StudyRoom[] = [];

const mockChatMessages: Record<string, ChatMessage[]> = {
    'mock_course_1': [
        { role: 'user', parts: [{ text: 'Welcome to the Introduction to AI community!' }], user: { displayName: 'Alice', email: 'user1' }, timestamp: Date.now() - 3600000 },
        { role: 'user', parts: [{ text: 'Hey everyone, looking forward to discussing the latest AI trends.' }], user: { displayName: 'Bob', email: 'user2' }, timestamp: Date.now() - 1800000 },
        { role: 'user', parts: [{ text: 'Does anyone have good resources for neural networks?' }], user: { displayName: 'Alice', email: 'user1' }, timestamp: Date.now() - 600000 },
    ],
    'mock_course_2': [
        { role: 'user', parts: [{ text: "Hi, I'm struggling with linked lists. Any tips?" }], user: { displayName: 'Charlie', email: 'user3' }, timestamp: Date.now() - 7200000 },
        { role: 'user', parts: [{ text: 'Try visualizing the pointers! It helps a lot.' }], user: { displayName: 'Diana', email: 'user4' }, timestamp: Date.now() - 3600000 },
    ],
};
// --- END MOCK DATABASE ---

// --- Room Management ---

export const getRooms = async (): Promise<StudyRoom[]> => {
    // if (!db) return []; // Firebase disabled, use mock
    console.log("Mock getRooms returning:", mockRooms);
    return Promise.resolve(mockRooms);
};

export const getRoom = async (id: string): Promise<StudyRoom | null> => {
    // if (!db) return null; // Firebase disabled, use mock
    const room = mockRooms.find(r => r.id === id) || null;
    console.log("Mock getRoom returning:", room);
    return Promise.resolve(room);
};

export const addRoom = async (name: string, courseId: string, maxUsers: number, createdBy: string, university: string | undefined, selectedTechnique: string, topic: string): Promise<StudyRoom | null> => {
    console.log("Mocking room creation for:", name);

    // Use the actual creator's info passed in 'createdBy',
    // assume addRoom won't be called without a valid creator email.
    // If you *need* a creator even if logged out, you might need a different approach.
    const creator = {
        email: createdBy, // Use the provided email
        displayName: 'Creator' // Or fetch displayName if available/needed
    };
    // --- END FIX ---


    const mockRoom: StudyRoom = {
        id: `mock_${Date.now()}`,
        name,
        courseId,
        maxUsers,
        createdBy, // Keep track of the original creator email
        university,
        users: [creator], // Start with only the actual creator
        technique: selectedTechnique,
        topic: topic,
    };

    mockRooms.push(mockRoom);
    console.log("Mock room added. Current rooms:", mockRooms);
    return Promise.resolve(mockRoom);
};


export const joinRoom = async (id: string, user: { email: string | null; displayName: string | null; }) => {
    // if (!user.email || !db) return; // Firebase disabled, use mock
    if (!user.email) return;
    
    const room = mockRooms.find(r => r.id === id);
    if (room && !room.users.some(u => u.email === user.email)) {
        room.users.push({ email: user.email, displayName: user.displayName || 'Student' });
        console.log(`Mock user ${user.email} joined room ${id}. Users:`, room.users);
    }
};

export const leaveRoom = async (id: string, user: { email: string | null; displayName: string | null; }) => {
    // if (!user.email || !db) return; // Firebase disabled, use mock
    if (!user.email) return;

    const room = mockRooms.find(r => r.id === id);
    if (room) {
        room.users = room.users.filter(u => u.email !== user.email);
        console.log(`Mock user ${user.email} left room ${id}. Users:`, room.users);
        
        // --- FIX: Comment out this block to prevent Strict Mode from deleting the room ---
        // if (room.users.length === 0) {
        //     const index = mockRooms.findIndex(r => r.id === id);
        //     if (index > -1) {
        //         mockRooms.splice(index, 1);
        //         console.log(`Mock room ${id} was empty and has been deleted.`);
        //     }
        // }
        // --- END FIX ---
    }
};



// --- Message Management (using a subcollection) ---

export const getRoomMessages = async (roomId: string): Promise<ChatMessage[]> => {
    // if (!db) return []; // Firebase disabled, use mock
    // This function is problematic for community chat. Let's fix CourseCommunity.tsx's call.
    // For StudyRoom (which uses onMessagesUpdate), this isn't the primary method.
    return Promise.resolve(mockChatMessages[roomId] || []);
};

export const saveRoomMessages = async (roomId: string, messages: ChatMessage[]) => {
    // if (!db) return; // Firebase disabled, use mock
    if (!mockChatMessages[roomId]) {
        mockChatMessages[roomId] = [];
    }
    // Add timestamp if missing (shouldn't be needed with recent changes but good safety check)
    const messagesWithTimestamp = messages.map(msg => ({ ...msg, timestamp: msg.timestamp || Date.now() }));
    mockChatMessages[roomId].push(...messagesWithTimestamp);
    console.log(`Mock saveRoomMessages: Messages added to room ${roomId}. Current count: ${mockChatMessages[roomId].length}`); // Add log
};

export const sendChatMessage = async (roomId: string, message: ChatMessage) => {
    // if (!db) return; // Firebase disabled, use mock
    if (!mockChatMessages[roomId]) {
        mockChatMessages[roomId] = [];
    }
    const fullMessage: ChatMessage = { ...message, timestamp: Date.now() };
    mockChatMessages[roomId].push(fullMessage);
    console.log(`Mock message sent to ${roomId}:`, fullMessage);
};

// --- Shared AI Notes Management (using a subcollection with a single document) ---

// Mock notes per room
const mockAiNotes: Record<string, string> = {};
const mockUserNotes: Record<string, string> = {};

const getNotesDoc = (roomId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `rooms/${roomId}/notes`, 'shared_notes');
}

export const getRoomAINotes = async (roomId: string): Promise<string> => {
    // if (!db) return ''; // Firebase disabled, use mock
    return Promise.resolve(mockAiNotes[roomId] || '');
};

export const saveRoomAINotes = async (roomId: string, notes: string) => {
    // if (!db) return; // Firebase disabled, use mock
    mockAiNotes[roomId] = notes;
    console.log(`Mock AI notes saved for room ${roomId}`);
    return Promise.resolve();
};

// --- Real-time listeners ---

export const onRoomUpdate = (roomId: string, callback: (room: StudyRoom | null) => void) => {
    // if (!db) return () => {}; // Firebase disabled, use mock
    
    // Simulate initial load
    const room = mockRooms.find(r => r.id === roomId) || null;
    callback(room);
    
    // In a real mock, you might set up an interval to check for changes,
    // but for just loading the room, this is sufficient.
    // The real onSnapshot listener is removed.
    
    console.log(`Mock onRoomUpdate attached for ${roomId}. Found:`, !!room);
    
    return () => {
        // Return an empty unsubscribe function
        console.log(`Mock onRoomUpdate detached for ${roomId}`);
    };
};

export const onMessagesUpdate = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
    // if (!db) return () => {}; // Firebase disabled, use mock

    // Simulate initial load
    const initialMessages = mockChatMessages[roomId] || [];
    console.log(`Mock onMessagesUpdate (${roomId}): Initial load with ${initialMessages.length} messages.`);
    callback(initialMessages);

    // Simulate real-time updates by polling
    const interval = setInterval(() => {
        const currentMessages = mockChatMessages[roomId] || [];
         // console.log(`Mock onMessagesUpdate (${roomId}): Polling, found ${currentMessages.length} messages.`); // Optional: Can be noisy
        callback(currentMessages);
    }, 2000); // Check for new messages every 2 seconds

    console.log(`Mock onMessagesUpdate attached for ${roomId}`);

    return () => {
        clearInterval(interval); // Return a function to clear the interval
        console.log(`Mock onMessagesUpdate detached for ${roomId}`);
    };
};

export const onNotesUpdate = (roomId: string, callback: (notes: string) => void) => {
    // if (!db) return () => {}; // Firebase disabled, use mock
    
    // Simulate initial load
    callback(mockAiNotes[roomId] || '');

    // Simulate real-time updates
    const interval = setInterval(() => {
         callback(mockAiNotes[roomId] || '');
    }, 2000);
    
    console.log(`Mock onNotesUpdate attached for ${roomId}`);

    return () => {
        clearInterval(interval);
        console.log(`Mock onNotesUpdate detached for ${roomId}`);
    };
};

// --- User Notes Management ---

const getUserNotesDoc = (roomId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `rooms/${roomId}/notes`, 'user_notes');
}

export const saveUserNotes = async (roomId: string, notes: string) => {
    // if (!db) return; // Firebase disabled, use mock
    mockUserNotes[roomId] = notes;
    console.log(`Mock user notes saved for room ${roomId}`);
    return Promise.resolve();
};

export const onUserNotesUpdate = (roomId: string, callback: (notes: string) => void) => {
    // if (!db) return () => {}; // Firebase disabled, use mock

    // Simulate initial load
    callback(mockUserNotes[roomId] || '');

    // Simulate real-time updates
    const interval = setInterval(() => {
         callback(mockUserNotes[roomId] || '');
    }, 2000);
    
    console.log(`Mock onUserNotesUpdate attached for ${roomId}`);
    
    return () => {
        clearInterval(interval);
        console.log(`Mock onUserNotesUpdate detached for ${roomId}`);
    };
};

// --- Resource Management ---
// Mock resources
const mockResources: Record<string, any[]> = {};

const getResourcesRef = (roomId: string) => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    return ref(storage, `rooms/${roomId}/resources`);
}

export const uploadResource = async (roomId: string, file: File, user: { displayName: string | null }) => {
    // if (!storage) return; // Firebase disabled, use mock
    
    if (!mockResources[roomId]) {
        mockResources[roomId] = [];
    }
    
    const newResource = {
        name: file.name,
        url: URL.createObjectURL(file), // Create a blob URL for local access
        uploader: user.displayName || 'Unknown',
        timeCreated: new Date().toISOString(),
    };
    
    mockResources[roomId].push(newResource);
    console.log(`Mock resource uploaded to room ${roomId}:`, newResource);
    return Promise.resolve();
};

export const getRoomResources = async (roomId: string) => {
    // if (!storage) return []; // Firebase disabled, use mock
    return Promise.resolve(mockResources[roomId] || []);
};

export const deleteResource = async (roomId: string, fileName: string) => {
    // if (!storage) return; // Firebase disabled, use mock
    if (mockResources[roomId]) {
        mockResources[roomId] = mockResources[roomId].filter(r => r.name !== fileName);
        console.log(`Mock resource deleted from room ${roomId}:`, fileName);
    }
    return Promise.resolve();
};

export const onResourcesUpdate = (roomId: string, callback: (resources: any[]) => void) => {
    // This is a workaround for the lack of a native `onSnapshot` for Storage.
    // In a real app, you'd use Firestore to store metadata and listen to that.
    
    // Initial call
    callback(mockResources[roomId] || []);
    
    const interval = setInterval(async () => {
        callback(mockResources[roomId] || []);
    }, 2000); // Poll every 2 seconds

    console.log(`Mock onResourcesUpdate attached for ${roomId}`);

    return () => {
        clearInterval(interval);
        console.log(`Mock onResourcesUpdate detached for ${roomId}`);
    };
};

// --- Shared Quiz Management ---
const mockQuizzes: Record<string, Quiz | null> = {};

const getQuizDoc = (roomId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `rooms/${roomId}/quiz`, 'current_quiz');
}

export const onQuizUpdate = (roomId: string, callback: (quiz: Quiz | null) => void) => {
    // if (!db) return () => {}; // Firebase disabled, use mock
    
    // Initial call
    callback(mockQuizzes[roomId] || null);
    
    const interval = setInterval(() => {
        callback(mockQuizzes[roomId] || null);
    }, 1000); // Poll every second
    
    console.log(`Mock onQuizUpdate attached for ${roomId}`);
    
    return () => {
        clearInterval(interval);
        console.log(`Mock onQuizUpdate detached for ${roomId}`);
    };
};

export const saveQuiz = async (roomId: string, quizData: Omit<Quiz, 'id' | 'answers'>) => {
    // if (!db) return; // Firebase disabled, use mock
    const quiz: Quiz = {
        ...quizData,
        id: `quiz_${Date.now()}`,
        answers: [],
    };
    mockQuizzes[roomId] = quiz;
    console.log(`Mock quiz saved for room ${roomId}:`, quiz);
    return Promise.resolve();
};

export const saveQuizAnswer = async (roomId: string, userId: string, displayName: string, answerIndex: number) => {
    // if (!db) return; // Firebase disabled, use mock
    const quiz = mockQuizzes[roomId];
    if (quiz && !quiz.answers.some(a => a.userId === userId)) {
        const answer = { userId, displayName, answerIndex, timestamp: Date.now() };
        quiz.answers.push(answer);
        console.log(`Mock quiz answer saved for room ${roomId}:`, answer);
    }
    return Promise.resolve();
};

export const clearQuiz = async (roomId: string) => {
    // if (!db) return; // Firebase disabled, use mock
    mockQuizzes[roomId] = null;
    console.log(`Mock quiz cleared for room ${roomId}`);
    return Promise.resolve();
};
