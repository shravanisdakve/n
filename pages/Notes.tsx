import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCourses } from '../services/courseService';
import { getNotes, addTextNote, uploadNoteFile, deleteNote, getFlashcards, addFlashcards, updateFlashcard } from '../services/notesService';
import { type Note, type Course, type Flashcard } from '../types';
import { PageHeader, Button, Input, Textarea, Select } from '../components/ui';
import { PlusCircle, Trash2, Upload, FileText, BookOpen, Layers, X } from 'lucide-react';
import { generateFlashcards } from '../services/geminiService';

import { Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { addCourse } from '../services/courseService';

const Notes: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [reviewFlashcards, setReviewFlashcards] = useState<Flashcard[]>([]);

  useEffect(() => {
    if (currentUser) {
      getCourses().then(setCourses);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedCourse) {
      getNotes(selectedCourse).then(setNotes);
      getFlashcards(selectedCourse).then(setFlashcards);
    }
  }, [selectedCourse]);

  const handleAddCourse = async () => {
    const courseName = prompt("Enter the name of the new course:");
    if (courseName) {
      const newCourse = await addCourse(courseName);
      if (newCourse) {
        setCourses(prev => [...prev, newCourse]);
        setSelectedCourse(newCourse.id);
      }
    }
  };

  const handleAddNote = async () => {
    if (!selectedCourse) return;

    if (newFile) {
      await uploadNoteFile(selectedCourse, newNote.title, newFile);
    } else {
      await addTextNote(selectedCourse, newNote.title, newNote.content);
    }

    setNewNote({ title: '', content: '' });
    setNewFile(null);
    setIsAdding(false);
    getNotes(selectedCourse).then(setNotes);
  };

  const handleDeleteNote = async (note: Note) => {
    if (!selectedCourse) return;
    await deleteNote(selectedCourse, note);
    getNotes(selectedCourse).then(setNotes);
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedCourse || notes.length === 0) return;

    const content = notes.map(n => n.content).join('\n\n');
    const flashcardsJson = await generateFlashcards(content);
    const newFlashcards = JSON.parse(flashcardsJson).map((f: any) => ({ ...f, bucket: 1, lastReview: Date.now() }));
    
    await addFlashcards(selectedCourse, newFlashcards);
    getFlashcards(selectedCourse).then(setFlashcards);
  };

  const startReview = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const reviewable = flashcards.filter(f => {
        const daysSinceReview = (now - f.lastReview) / oneDay;
        if (f.bucket === 1) return daysSinceReview >= 1;
        if (f.bucket === 2) return daysSinceReview >= 3;
        if (f.bucket === 3) return daysSinceReview >= 7;
        if (f.bucket === 4) return daysSinceReview >= 14;
        return false;
    });
    setReviewFlashcards(reviewable);
    setShowFlashcards(true);
  };

  const handleUpdateFlashcard = async (flashcard: Flashcard, correct: boolean) => {
    if (!selectedCourse) return;

    const newBucket = correct ? Math.min(flashcard.bucket + 1, 4) : 1;
    const updates = { bucket: newBucket, lastReview: Date.now() };

    await updateFlashcard(selectedCourse, flashcard.id, updates);
    getFlashcards(selectedCourse).then(setFlashcards);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Notes & Resources" subtitle="Manage your notes, doubts, and uploaded resources for each course." />

      <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
        <div className="flex items-center mb-4">
            <BookOpen className="w-6 h-6 mr-3 text-violet-400" />
            <Select
              value={selectedCourse}
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full md:w-1/3"
            >
              <option value="">Select a Course</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </Select>
            <Button onClick={handleAddCourse} className="ml-2"><PlusCircle size={16} /></Button>
        </div>

        {selectedCourse && (
            <>
                <Button onClick={() => setIsAdding(!isAdding)} className="mb-4">
                <PlusCircle size={16} className="mr-2" />
                {isAdding ? 'Cancel' : 'Add Note/Resource'}
                </Button>

                {isAdding && (
                <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
                    <Input
                    placeholder="Title"
                    value={newNote.title}
                    onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                    />
                    <Textarea
                    placeholder="Write your note or doubt here..."
                    value={newNote.content}
                    onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                    />
                    <div className="flex items-center justify-between">
                        <label htmlFor="file-upload" className="flex items-center cursor-pointer text-sm text-slate-400 hover:text-white">
                            <Upload size={16} className="mr-2" />
                            {newFile ? newFile.name : 'Upload a file'}
                        </label>
                        <input id="file-upload" type="file" className="hidden" onChange={e => setNewFile(e.target.files ? e.target.files[0] : null)} />
                    </div>
                    <Button onClick={handleAddNote}>Add</Button>
                </div>
                )}

                <div className="mt-4 space-y-2">
                {notes.map(note => (
                    <div key={note.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg">
                    <div>
                        <p className="font-bold">{note.title}</p>
                        {note.content && <p className="text-sm text-slate-400">{note.content}</p>}
                        {note.fileUrl && (
                        <a href={note.fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-violet-400 hover:underline flex items-center">
                            <FileText size={16} className="mr-2" />
                            {note.fileName}
                        </a>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => navigate('/tutor', { state: { noteContent: note.content } })}>
                            <Brain size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(note)}>
                            <Trash2 size={16} />
                        </Button>
                    </div>
                    </div>
                ))}
                </div>

                <div className="mt-8">
                    <h3 className="text-lg font-bold flex items-center mb-4">
                        <Layers className="w-6 h-6 mr-3 text-sky-400" />
                        Flashcards
                    </h3>
                    {flashcards.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <p>{flashcards.length} flashcards available.</p>
                            <Button onClick={startReview}>Review Flashcards</Button>
                        </div>
                    ) : (
                        <p className="text-slate-400">No flashcards generated for this course yet.</p>
                    )}
                    <Button onClick={handleGenerateFlashcards} className="mt-4">Generate Flashcards from Notes</Button>
                </div>
            </>
        )}
      </div>

      {showFlashcards && (
        <FlashcardPlayer 
            flashcards={reviewFlashcards} 
            onComplete={() => setShowFlashcards(false)} 
            onUpdateCard={handleUpdateFlashcard} 
        />
      )}
    </div>
  );
};

const FlashcardPlayer: React.FC<{ flashcards: Flashcard[], onComplete: () => void, onUpdateCard: (card: Flashcard, correct: boolean) => void }> = ({ flashcards, onComplete, onUpdateCard }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = (correct: boolean) => {
        onUpdateCard(flashcards[currentIndex], correct);
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        } else {
            onComplete();
        }
    };

    if (flashcards.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-slate-800 p-8 rounded-lg text-center">
                    <p>No flashcards to review today!</p>
                    <Button onClick={onComplete} className="mt-4">Close</Button>
                </div>
            </div>
        )
    }

    const card = flashcards[currentIndex];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="relative w-[500px] h-[300px]">
                <button onClick={onComplete} className="absolute -top-10 right-0 text-white"><X /></button>
                <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    <div className="absolute w-full h-full bg-slate-700 rounded-lg flex items-center justify-center p-8 text-center backface-hidden">
                        <p className="text-2xl">{card.front}</p>
                    </div>
                    <div className="absolute w-full h-full bg-sky-600 rounded-lg flex items-center justify-center p-8 text-center rotate-y-180 backface-hidden">
                        <p className="text-2xl">{card.back}</p>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-10 flex gap-4">
                {!isFlipped ? (
                    <Button onClick={() => setIsFlipped(true)}>Flip</Button>
                ) : (
                    <>
                        <Button onClick={() => handleNext(false)} className="bg-red-600 hover:bg-red-700">Incorrect</Button>
                        <Button onClick={() => handleNext(true)} className="bg-green-600 hover:bg-green-700">Correct</Button>
                    </>
                )}
            </div>
        </div>
    )
}

export default Notes;
