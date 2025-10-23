import { type Note, type Flashcard } from '../types';

// Mock database with localStorage persistence
const getMockNotes = (courseId: string): Note[] => {
    try {
        const notes = localStorage.getItem(`mockNotes_${courseId}`);
        return notes ? JSON.parse(notes) : [];
    } catch (error) {
        console.error("Error reading notes from localStorage", error);
        return [];
    }
};

const setMockNotes = (courseId: string, notes: Note[]) => {
    try {
        localStorage.setItem(`mockNotes_${courseId}`, JSON.stringify(notes));
    } catch (error) {
        console.error("Error saving notes to localStorage", error);
    }
};

const getMockFlashcards = (courseId: string): Flashcard[] => {
    try {
        const flashcards = localStorage.getItem(`mockFlashcards_${courseId}`);
        return flashcards ? JSON.parse(flashcards) : [];
    } catch (error) {
        console.error("Error reading flashcards from localStorage", error);
        return [];
    }
};

const setMockFlashcards = (courseId: string, flashcards: Flashcard[]) => {
    try {
        localStorage.setItem(`mockFlashcards_${courseId}`, JSON.stringify(flashcards));
    } catch (error) {
        console.error("Error saving flashcards to localStorage", error);
    }
};

export const getNotes = async (courseId: string): Promise<Note[]> => {
    console.log("Fetching notes from mock service...");
    return Promise.resolve(getMockNotes(courseId));
};

export const addTextNote = async (courseId: string, title: string, content: string): Promise<Note | null> => {
    console.log("Adding text note to mock service:", title);
    const mockNotes = getMockNotes(courseId);
    const newNote: Note = {
        id: `mock_note_${Date.now()}`,
        courseId,
        title,
        content,
        createdAt: Date.now(),
    };
    const updatedNotes = [...mockNotes, newNote];
    setMockNotes(courseId, updatedNotes);
    console.log("Added text note to mock service:", newNote);
    return Promise.resolve(newNote);
};

export const uploadNoteFile = async (courseId: string, title: string, file: File): Promise<Note | null> => {
    console.log("Uploading note file to mock service:", title);
    const mockNotes = getMockNotes(courseId);
    const newNote: Note = {
        id: `mock_note_${Date.now()}`,
        courseId,
        title,
        fileName: file.name,
        fileType: file.type,
        fileUrl: URL.createObjectURL(file),
        createdAt: Date.now(),
    };
    const updatedNotes = [...mockNotes, newNote];
    setMockNotes(courseId, updatedNotes);
    console.log("Uploaded note file to mock service:", newNote);
    return Promise.resolve(newNote);
};

export const deleteNote = async (courseId: string, note: Note): Promise<void> => {
    console.log("Deleting note from mock service:", note.id);
    const mockNotes = getMockNotes(courseId);
    const updatedNotes = mockNotes.filter(n => n.id !== note.id);
    setMockNotes(courseId, updatedNotes);
    console.log("Deleted note from mock service:", note.id);
    return Promise.resolve();
};

// --- Flashcard Management ---

export const getFlashcards = async (courseId: string): Promise<Flashcard[]> => {
    console.log("Fetching flashcards from mock service...");
    return Promise.resolve(getMockFlashcards(courseId));
};

export const addFlashcards = async (courseId: string, flashcards: Omit<Flashcard, 'id'>[]): Promise<void> => {
    console.log("Adding flashcards to mock service...");
    const mockFlashcards = getMockFlashcards(courseId);
    const newFlashcards = flashcards.map(f => ({ ...f, id: `mock_flashcard_${Date.now()}` }));
    const updatedFlashcards = [...mockFlashcards, ...newFlashcards];
    setMockFlashcards(courseId, updatedFlashcards);
    console.log("Added flashcards to mock service:", newFlashcards);
    return Promise.resolve();
};

export const updateFlashcard = async (courseId: string, flashcardId: string, updates: Partial<Flashcard>): Promise<void> => {
    console.log("Updating flashcard in mock service:", flashcardId);
    const mockFlashcards = getMockFlashcards(courseId);
    const updatedFlashcards = mockFlashcards.map(f => f.id === flashcardId ? { ...f, ...updates } : f);
    setMockFlashcards(courseId, updatedFlashcards);
    console.log("Updated flashcard in mock service:", flashcardId);
    return Promise.resolve();
};

export const deleteFlashcard = async (courseId: string, flashcardId: string): Promise<void> => {
    console.log("Deleting flashcard from mock service:", flashcardId);
    const mockFlashcards = getMockFlashcards(courseId);
    const updatedFlashcards = mockFlashcards.filter(f => f.id !== flashcardId);
    setMockFlashcards(courseId, updatedFlashcards);
    console.log("Deleted flashcard from mock service:", flashcardId);
    return Promise.resolve();
};
