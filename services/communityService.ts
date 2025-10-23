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

const mockChatMessages: Record<string, ChatMessage[]> = {
    'mock_course_1': [
        { senderId: 'user1', senderName: 'Alice', text: 'Welcome to the Introduction to AI community!', timestamp: Timestamp.fromDate(new Date(Date.now() - 3600000)) },
        { senderId: 'user2', senderName: 'Bob', text: 'Hey everyone, looking forward to discussing the latest AI trends.', timestamp: Timestamp.fromDate(new Date(Date.now() - 1800000)) },
        { senderId: 'user1', senderName: 'Alice', text: 'Does anyone have good resources for neural networks?', timestamp: Timestamp.fromDate(new Date(Date.now() - 600000)) },
    ],
    'mock_course_2': [
        { senderId: 'user3', senderName: 'Charlie', text: "Hi, I'm struggling with linked lists. Any tips?", timestamp: Timestamp.fromDate(new Date(Date.now() - 7200000)) },
        { senderId: 'user4', senderName: 'Diana', text: 'Try visualizing the pointers! It helps a lot.', timestamp: Timestamp.fromDate(new Date(Date.now() - 3600000)) },
    ],
};

// --- Room Management ---

export const getRooms = async (): Promise<StudyRoom[]> => {
    if (!db) return [];
    try {
        const roomsCollection = collection(db, 'rooms');
        const snapshot = await getDocs(roomsCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudyRoom));
    } catch (error) {
        console.error("Error getting rooms: ", error);
        return [];
    }
};

export const getRoom = async (id: string): Promise<StudyRoom | null> => {
    if (!db) return null;
    try {
        const roomDoc = doc(db, 'rooms', id);
        const snapshot = await getDoc(roomDoc);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as StudyRoom;
        }
        return null;
    } catch (error) {
        console.error("Error getting room: ", error);
        return null;
    }
};

export const addRoom = async (name: string, courseId: string, maxUsers: number, createdBy: string, university: string | undefined, selectedTechnique: string, topic: string): Promise<StudyRoom | null> => {
    // Mock implementation since Firebase is disabled.
    // This simulates creating a room and returns a mock room object.
    console.log("Mocking room creation for:", name);
    
    // The user who is creating the room
    const creator = {
        email: auth.currentUser?.email || 'test@example.com',
        displayName: auth.currentUser?.displayName || 'Test User'
    };

    const mockRoom: StudyRoom = {
        id: `mock_${Date.now()}`, // Generate a unique mock ID
        name,
        courseId,
        maxUsers,
        createdBy,
        university,
        users: [creator], // Add the creator to the room
        pomodoro: {
            state: 'stopped',
            mode: 'focus',
            startTime: 0,
        },
        technique: selectedTechnique,
        topic: topic,
    };
    
    // We use Promise.resolve to simulate an async operation
    return Promise.resolve(mockRoom);
};

export const joinRoom = async (id: string, user: { email: string | null; displayName: string | null; }) => {
    if (!user.email || !db) return;
    try {
        const roomDoc = doc(db, 'rooms', id);
        await updateDoc(roomDoc, {
            users: arrayUnion({ email: user.email, displayName: user.displayName || 'Student' })
        });
    } catch (error) {
        console.error("Error joining room: ", error);
    }
};

export const leaveRoom = async (id: string, user: { email: string | null; displayName: string | null; }) => {
    if (!user.email || !db) return;
    try {
        const roomDoc = doc(db, 'rooms', id);
        await updateDoc(roomDoc, {
            users: arrayRemove({ email: user.email, displayName: user.displayName || 'Student' })
        });
        // Optional: Add a Cloud Function to delete empty rooms.
    } catch (error) {
        console.error("Error leaving room: ", error);
    }
};

export const updateRoomPomodoroState = async (roomId: string, pomodoroState: PomodoroState) => {
    if (!db) return;
    try {
        const roomDoc = doc(db, 'rooms', roomId);
        await updateDoc(roomDoc, { pomodoro: pomodoroState });
    } catch (error) {
        console.error("Error updating pomodoro state: ", error);
    }
};

// --- Message Management (using a subcollection) ---

export const getRoomMessages = async (roomId: string): Promise<ChatMessage[]> => {
    // if (!db) return []; // Firebase disabled, use mock
    return Promise.resolve(mockChatMessages[roomId] || []);
};

export const saveRoomMessages = async (roomId: string, messages: ChatMessage[]) => {
    // This function is deprecated in favor of sendChatMessage for mock
    console.warn("saveRoomMessages is deprecated for mock. Use sendChatMessage.");
};

export const sendChatMessage = async (roomId: string, message: Omit<ChatMessage, 'timestamp'>) => {
    // if (!db) return; // Firebase disabled, use mock
    if (!mockChatMessages[roomId]) {
        mockChatMessages[roomId] = [];
    }
    const fullMessage: ChatMessage = { ...message, timestamp: Timestamp.fromDate(new Date()) };
    mockChatMessages[roomId].push(fullMessage);
    // Simulate real-time update for any active listeners
    // In a real app, this would trigger onSnapshot listeners
    console.log(`Mock message sent to ${roomId}:`, fullMessage);
};

// --- Shared AI Notes Management (using a subcollection with a single document) ---

const getNotesDoc = (roomId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `rooms/${roomId}/notes`, 'shared_notes');
}

export const getRoomAINotes = async (roomId: string): Promise<string> => {
    if (!db) return '';
    try {
        const notesDoc = await getDoc(getNotesDoc(roomId));
        return notesDoc.exists() ? notesDoc.data().content : '';
    } catch (error) {
        console.error("Error getting AI notes: ", error);
        return '';
    }
};

export const saveRoomAINotes = async (roomId: string, notes: string) => {
    if (!db) return;
    try {
        await setDoc(getNotesDoc(roomId), { content: notes, lastUpdated: serverTimestamp() });
    } catch (error) {
        console.error("Error saving AI notes: ", error);
    }
};

// --- Real-time listeners ---

export const onRoomUpdate = (roomId: string, callback: (room: StudyRoom | null) => void) => {
    if (!db) return () => {};
    const roomDoc = doc(db, 'rooms', roomId);
    return onSnapshot(roomDoc, (snapshot) => {
        if (snapshot.exists()) {
            callback({ id: snapshot.id, ...snapshot.data() } as StudyRoom);
        } else {
            callback(null);
        }
    });
};

export const onMessagesUpdate = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
    // if (!db) return () => {}; // Firebase disabled, use mock
    // Simulate initial load
    callback(mockChatMessages[roomId] || []);

    // For mock, we don't have a real-time listener. The component will poll getRoomMessages.
    return () => {}; // Return an empty unsubscribe function
};

export const onNotesUpdate = (roomId: string, callback: (notes: string) => void) => {
    if (!db) return () => {};
    return onSnapshot(getNotesDoc(roomId), (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data().content || '');
        }
    });
};

// --- User Notes Management ---

const getUserNotesDoc = (roomId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `rooms/${roomId}/notes`, 'user_notes');
}

export const saveUserNotes = async (roomId: string, notes: string) => {
    if (!db) return;
    try {
        await setDoc(getUserNotesDoc(roomId), { content: notes, lastUpdated: serverTimestamp() });
    } catch (error) {
        console.error("Error saving user notes: ", error);
    }
};

export const onUserNotesUpdate = (roomId: string, callback: (notes: string) => void) => {
    if (!db) return () => {};
    return onSnapshot(getUserNotesDoc(roomId), (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data().content || '');
        }
    });
};

// --- Resource Management ---

const getResourcesRef = (roomId: string) => {
    if (!storage) throw new Error("Firebase Storage not initialized");
    return ref(storage, `rooms/${roomId}/resources`);
}

export const uploadResource = async (roomId: string, file: File, user: { displayName: string | null }) => {
    if (!storage) return;
    const resourceRef = ref(getResourcesRef(roomId), file.name);
    await uploadBytes(resourceRef, file, { customMetadata: { uploader: user.displayName || 'Unknown' } });
};

export const getRoomResources = async (roomId: string) => {
    if (!storage) return [];
    try {
        const resourcesRef = getResourcesRef(roomId);
        const res = await listAll(resourcesRef);
        const resources = await Promise.all(res.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);
            return { name: itemRef.name, url, uploader: metadata.customMetadata?.uploader, timeCreated: metadata.timeCreated };
        }));
        return resources;
    } catch (error) {
        console.error("Error getting resources: ", error);
        return [];
    }
};

export const deleteResource = async (roomId: string, fileName: string) => {
    if (!storage) return;
    const resourceRef = ref(getResourcesRef(roomId), fileName);
    await deleteObject(resourceRef);
};

export const onResourcesUpdate = (roomId: string, callback: (resources: any[]) => void) => {
    // This is a workaround for the lack of a native `onSnapshot` for Storage.
    // In a real app, you'd use Firestore to store metadata and listen to that.
    const interval = setInterval(async () => {
        const resources = await getRoomResources(roomId);
        callback(resources);
    }, 5000); // Poll every 5 seconds

    // Initial call
    getRoomResources(roomId).then(callback);

    return () => clearInterval(interval);
};

// --- Shared Quiz Management ---

const getQuizDoc = (roomId: string) => {
    if (!db) throw new Error("Firestore not initialized");
    return doc(db, `rooms/${roomId}/quiz`, 'current_quiz');
}

export const onQuizUpdate = (roomId: string, callback: (quiz: Quiz | null) => void) => {
    if (!db) return () => {};
    return onSnapshot(getQuizDoc(roomId), (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.data() as Quiz);
        } else {
            callback(null);
        }
    });
};

export const saveQuiz = async (roomId: string, quizData: Omit<Quiz, 'id' | 'answers'>) => {
    if (!db) return;
    const quiz: Quiz = {
        ...quizData,
        id: `quiz_${Date.now()}`,
        answers: [],
    };
    await setDoc(getQuizDoc(roomId), quiz);
};

export const saveQuizAnswer = async (roomId: string, userId: string, displayName: string, answerIndex: number) => {
    if (!db) return;
    const answer = { userId, displayName, answerIndex, timestamp: serverTimestamp() };
    await updateDoc(getQuizDoc(roomId), {
        answers: arrayUnion(answer)
    });
};

export const clearQuiz = async (roomId: string) => {
    if (!db) return;
    await deleteDoc(getQuizDoc(roomId));
};
