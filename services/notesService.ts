import { type Note, type Flashcard } from '../types';
import { extractTextFromFile, summarizeAudioFromBase64 } from './geminiService';

// Helper function to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            if (!result || !result.includes(',')) {
                return reject(new Error("Invalid file data for base64 conversion"));
            }
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

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
    let extractedContent = "[Text extraction pending or failed]"; // Default content

    try {
      const base64Data = await fileToBase64(file);
      
      // Check if it's an audio file
      if (file.type.startsWith('audio/')) {
        console.log(`Summarizing audio file ${file.name}...`);
        extractedContent = await summarizeAudioFromBase64(base64Data, file.type);
        console.log(`Extracted ${extractedContent.length} characters from audio: ${file.name}`);
      
      // Otherwise, treat as document (PDF, PPTX, TXT)
      } else {
        console.log(`Extracting text from document ${file.name}...`);
        extractedContent = await extractTextFromFile(base64Data, file.type);
        console.log(`Extracted ${extractedContent.length} characters from document: ${file.name}`);
      }

    } catch (error) {
      console.error(`Failed to extract text from ${file.name}:`, error);
      // Keep the default content message if extraction fails
    }

    const newNote: Note = {
        id: `mock_note_${Date.now()}_${Math.random()}`,
        courseId,
        title,
        content: extractedContent, // Store extracted text here
        fileName: file.name,
        fileType: file.type,
        fileUrl: URL.createObjectURL(file), // Still store URL for preview/download
        createdAt: Date.now(),
    };
    const updatedNotes = [...mockNotes, newNote];
    setMockNotes(courseId, updatedNotes);
    console.log("Uploaded note file to mock service (with extracted text):", newNote);
    return Promise.resolve(newNote);
};

export const updateNoteContent = async (courseId: string, noteId: string, newContent: string): Promise<void> => {
    console.log("Updating note content in mock service:", noteId);
    const mockNotes = getMockNotes(courseId);
    const updatedNotes = mockNotes.map(n =>
        n.id === noteId ? { ...n, content: newContent } : n
    );
    setMockNotes(courseId, updatedNotes);
    console.log("Updated note content in mock service:", noteId);
    return Promise.resolve();
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

export const addFlashcards = async (courseId: string, flashcards: Flashcard[]): Promise<void> => {
    console.log("Adding flashcards to mock service...");
    const mockFlashcards = getMockFlashcards(courseId);
    // const newFlashcards = flashcards.map(f => ({ ...f, id: `mock_flashcard_${Date.now()}` })); // <-- This was the bug
    const updatedFlashcards = [...mockFlashcards, ...flashcards]; // <-- Use the flashcards (with their good IDs) directly
    setMockFlashcards(courseId, updatedFlashcards);
    console.log("Added flashcards to mock service:", flashcards);
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
