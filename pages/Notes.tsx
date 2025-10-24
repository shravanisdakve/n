import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getCourses, addCourse } from '../services/courseService';
import { getNotes, addTextNote, uploadNoteFile, deleteNote, getFlashcards, addFlashcards, updateFlashcard } from '../services/notesService';
import { type Note, type Course, type Flashcard as FlashcardType } from '../types';
import { PageHeader, Button, Input, Textarea, Select, Modal } from '../components/ui';
import { PlusCircle, Trash2, Upload, FileText, BookOpen, Layers, X, Brain, Edit, Save, ArrowLeft } from 'lucide-react';
import { generateFlashcards } from '../services/geminiService';
import { useNavigate } from 'react-router-dom';
import Flashcard from '../components/Flashcard'; // We'll use this for the flashcard tab

const Notes: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // --- State Management ---
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  
  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]);
  
  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // --- Data Fetching Effects ---
  useEffect(() => {
    if (currentUser) {
      getCourses().then(setCourses);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedCourse) {
      // Reset views when course changes
      setActiveNote(null);
      setIsEditingNote(false);
      
      // Fetch data for new course
      getNotes(selectedCourse).then(setNotes);
      getFlashcards(selectedCourse).then(setFlashcards);
    }
  }, [selectedCourse]);

  // --- Handlers ---
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

  const reloadNotes = () => {
    if (selectedCourse) {
      getNotes(selectedCourse).then(setNotes);
    }
  };
  
  const handleSelectNote = (note: Note) => {
    setActiveNote(note);
    setEditedContent(note.content || '');
    setIsEditingNote(false);
  };
  
  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation(); // Prevent handleSelectNote from firing
    if (!selectedCourse || !window.confirm("Are you sure you want to delete this note?")) return;
    
    const noteToDelete = notes.find(n => n.id === noteId);
    if (noteToDelete) {
      await deleteNote(selectedCourse, noteToDelete);
      reloadNotes();
      if (activeNote?.id === noteId) {
        setActiveNote(null);
      }
    }
  };
  
  const handleSaveNoteEdit = async () => {
    if (!activeNote || !selectedCourse) return;
    
    // This requires updating your notesService and Note type to support content updates.
    // For now, we'll just optimistically update the state.
    // In a real app: await updateNoteContent(selectedCourse, activeNote.id, editedContent);
    
    console.log("Simulating save for note:", activeNote.id, "with content:", editedContent);
    
    // Optimistic update in UI
    setActiveNote(prev => prev ? { ...prev, content: editedContent } : null);
    setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: editedContent } : n));
    setIsEditingNote(false);
  };

  const handleGenerateFlashcards = async () => {
    if (!selectedCourse || notes.length === 0) return;

    const content = notes.map(n => n.content).join('\n\n');
    const flashcardsJson = await generateFlashcards(content);
    const newFlashcards = JSON.parse(flashcardsJson).map((f: any) => ({ ...f, bucket: 1, lastReview: Date.now() }));
    
    await addFlashcards(selectedCourse, newFlashcards);
    getFlashcards(selectedCourse).then(setFlashcards);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Notes & Resources" subtitle="Manage your notes, files, and flashcards for each course." />

      {/* --- Course Selector --- */}
      <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 mr-2 text-violet-400" />
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
          <Button onClick={handleAddCourse} className="p-2.5"><PlusCircle size={16} /></Button>
      </div>

      {selectedCourse ? (
        <div className="flex-1 flex flex-col bg-slate-800/50 rounded-xl ring-1 ring-slate-700 overflow-hidden">
          {/* --- Tabs --- */}
          <div className="flex border-b border-slate-700">
            <TabButton 
              icon={BookOpen} 
              label="My Notes" 
              isActive={activeTab === 'notes'}
              onClick={() => setActiveTab('notes')} 
            />
            <TabButton 
              icon={Layers} 
              label={`Flashcards (${flashcards.length})`}
              isActive={activeTab === 'flashcards'}
              onClick={() => setActiveTab('flashcards')} 
            />
          </div>

          {/* --- Content Area --- */}
          {activeTab === 'notes' && (
            <NotesView
              notes={notes}
              activeNote={activeNote}
              isEditingNote={isEditingNote}
              editedContent={editedContent}
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              onSaveEdit={handleSaveNoteEdit}
              onEditClick={() => setIsEditingNote(true)}
              onContentChange={setEditedContent}
              onAddNoteClick={() => setIsModalOpen(true)}
            />
          )}
          
          {activeTab === 'flashcards' && (
            <FlashcardsView
              flashcards={flashcards}
              onGenerate={handleGenerateFlashcards}
              courseId={selectedCourse}
              onUpdateCard={async (card, correct) => {
                const newBucket = correct ? Math.min(card.bucket + 1, 4) : 1;
                await updateFlashcard(selectedCourse, card.id, { bucket: newBucket, lastReview: Date.now() });
                getFlashcards(selectedCourse).then(setFlashcards);
              }}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-800/50 rounded-xl ring-1 ring-slate-700">
          <p className="text-slate-400">Please select a course to view your notes.</p>
        </div>
      )}

      {/* --- Add Note Modal --- */}
      <AddNoteModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courseId={selectedCourse}
        onNoteAdded={() => reloadNotes()}
      />
    </div>
  );
};

// --- TabButton Component ---
const TabButton: React.FC<{icon: React.ElementType, label: string, isActive: boolean, onClick: () => void}> = ({ icon: Icon, label, isActive, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-colors ${isActive 
      ? 'text-violet-400 border-b-2 border-violet-400' 
      : 'text-slate-400 hover:text-white'
    }`}
  >
    <Icon size={18} /> {label}
  </button>
);

// --- NotesView Sub-Component ---
const NotesView: React.FC<any> = ({
  notes, activeNote, isEditingNote, editedContent, 
  onSelectNote, onDeleteNote, onSaveEdit, onEditClick, onContentChange, onAddNoteClick
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Column: Note List */}
      <div className="w-1/3 border-r border-slate-700 overflow-y-auto">
        <div className="p-3 border-b border-slate-700">
          <Button onClick={onAddNoteClick} className="w-full">
            <PlusCircle size={16} className="mr-2" /> Add Note/File
          </Button>
        </div>
        <div className="space-y-1 p-2">
          {notes.map((note: Note) => (
            <button
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`w-full text-left p-3 rounded-lg group flex justify-between items-start ${activeNote?.id === note.id ? 'bg-violet-900/50' : 'hover:bg-slate-700/50'}`}
            >
              <div className="flex items-center gap-2">
                <FileText size={16} className={note.fileUrl ? "text-sky-400" : "text-slate-400"} />
                <span className="font-medium text-slate-200 truncate">{note.title}</span>
              </div>
              <button onClick={(e) => onDeleteNote(e, note.id)} className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={16} />
              </button>
            </button>
          ))}
          {notes.length === 0 && <p className="text-center text-slate-400 p-4 text-sm">No notes yet.</p>}
        </div>
      </div>

      {/* Right Column: Content Viewer */}
      <div className="w-2/3 overflow-y-auto p-6">
        {activeNote ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">{activeNote.title}</h2>
              <div className="flex gap-2">
                {isEditingNote ? (
                  <Button onClick={onSaveEdit} className="p-2.5"><Save size={16} /></Button>
                ) : (
                  <Button onClick={onEditClick} className="p-2.5" variant="ghost"><Edit size={16} /></Button>
                )}
                <Button onClick={() => navigate('/tutor', { state: { noteContent: activeNote.content } })} className="p-2.5" variant="ghost" title="Study with AI">
                  <Brain size={16} />
                </Button>
              </div>
            </div>
            
            {activeNote.content ? (
              isEditingNote ? (
                <Textarea 
                  value={editedContent}
                  onChange={e => onContentChange(e.target.value)}
                  className="min-h-[400px] text-base"
                />
              ) : (
                <div 
                  className="prose prose-invert prose-lg max-w-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {activeNote.content}
                </div>
              )
            ) : null}

            {activeNote.fileUrl && (
              <a 
                href={activeNote.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 bg-slate-700 p-3 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <FileText size={20} className="text-sky-400" />
                <span className="font-medium text-slate-200">{activeNote.fileName}</span>
              </a>
            )}
            
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <p><ArrowLeft size={16} className="inline mr-2" /> Select a note to view or edit</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- AddNoteModal Sub-Component ---
const AddNoteModal: React.FC<{isOpen: boolean, onClose: () => void, courseId: string, onNoteAdded: () => void}> = ({
  isOpen, onClose, courseId, onNoteAdded
}) => {
  const [noteType, setNoteType] = useState<'text' | 'file'>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setIsSubmitting(true);
    if (noteType === 'file' && file) {
      await uploadNoteFile(courseId, title || file.name, file);
    } else if (noteType === 'text') {
      await addTextNote(courseId, title, content);
    }

    // Reset form and close
    setIsSubmitting(false);
    setTitle('');
    setContent('');
    setFile(null);
    setNoteType('text');
    onNoteAdded();
    onClose();
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Note or Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center bg-slate-700 rounded-lg p-1">
          <Button type="button" onClick={() => setNoteType('text')} className={`w-1/2 ${noteType === 'text' ? 'bg-violet-600' : 'bg-transparent'}`}>
            Text Note
          </Button>
          <Button type="button" onClick={() => setNoteType('file')} className={`w-1/2 ${noteType === 'file' ? 'bg-violet-600' : 'bg-transparent'}`}>
            Upload File
          </Button>
        </div>
        
        <Input
          placeholder="Title (required)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />
        
        {noteType === 'text' && (
          <Textarea
            placeholder="Write your note or doubt here..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
          />
        )}
        
        {noteType === 'file' && (
          <div className="flex items-center justify-center w-full">
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload size={24} className="text-slate-400 mb-2" />
                <p className="mb-2 text-sm text-slate-400">
                  {file ? file.name : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
                </p>
              </div>
              <input id="file-upload" type="file" className="hidden" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} />
            </label>
          </div>
        )}
        
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          {isSubmitting ? 'Adding...' : 'Add Resource'}
        </Button>
      </form>
    </Modal>
  );
};

// --- FlashcardsView Sub-Component ---
const FlashcardsView: React.FC<{flashcards: FlashcardType[], onGenerate: () => void, courseId: string, onUpdateCard: (card: FlashcardType, correct: boolean) => void}> = ({
  flashcards, onGenerate, courseId, onUpdateCard
}) => {
  const [reviewFlashcards, setReviewFlashcards] = useState<FlashcardType[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  
  const startReview = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const reviewable = flashcards.filter(f => {
        const daysSinceReview = (now - f.lastReview) / oneDay;
        // Simple spaced repetition logic
        if (f.bucket === 1) return daysSinceReview >= 1;
        if (f.bucket === 2) return daysSinceReview >= 3;
        if (f.bucket === 3) return daysSinceReview >= 7;
        if (f.bucket === 4) return daysSinceReview >= 14;
        return false;
    });
    setReviewFlashcards(reviewable);
    setIsReviewing(true);
  };
  
  return (
    <div className="p-6 overflow-y-auto">
      <div className="flex gap-4 mb-6">
        <Button onClick={onGenerate}>Generate Flashcards from Notes</Button>
        <Button onClick={startReview} variant="outline" disabled={flashcards.length === 0}>
          Review Due Cards
        </Button>
      </div>
      
      <h3 className="text-lg font-bold text-slate-200 mb-4">All Flashcards ({flashcards.length})</h3>
      {flashcards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((card) => (
            <Flashcard key={card.id} front={card.front} back={card.back} />
          ))}
        </div>
      ) : (
        <p className="text-slate-400">No flashcards generated yet. Use your notes to create some!</p>
      )}
      
      {isReviewing && (
        <FlashcardPlayer 
          flashcards={reviewFlashcards}
          onComplete={() => setIsReviewing(false)}
          onUpdateCard={onUpdateCard}
        />
      )}
    </div>
  );
};

// --- FlashcardPlayer Sub-Component ---
const FlashcardPlayer: React.FC<{ flashcards: FlashcardType[], onComplete: () => void, onUpdateCard: (card: FlashcardType, correct: boolean) => void }> = ({ flashcards, onComplete, onUpdateCard }) => {
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
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in-50" onClick={onComplete}>
                <div className="bg-slate-800 p-8 rounded-lg text-center" onClick={e => e.stopPropagation()}>
                    <p className="text-xl text-white">No flashcards are due for review today!</p>
                    <p className="text-slate-400 mb-6">Check back later or review all cards from the main page.</p>
                    <Button onClick={onComplete} className="mt-4">Close</Button>
                </div>
            </div>
        )
    }

    const card = flashcards[currentIndex];

    return (
        <div className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 animate-in fade-in-50">
            <button onClick={onComplete} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
            <div 
              className="relative w-full max-w-2xl h-80"
              style={{ perspective: '1000px' }}
            >
                <div 
                  className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                >
                    {/* Front */}
                    <div className="absolute w-full h-full bg-slate-700 rounded-lg flex items-center justify-center p-8 text-center backface-hidden">
                        <p className="text-2xl text-white">{card.front}</p>
                    </div>
                    {/* Back */}
                    <div className="absolute w-full h-full bg-sky-600 rounded-lg flex items-center justify-center p-8 text-center rotate-y-180 backface-hidden">
                        <p className="text-2xl text-white">{card.back}</p>
                    </div>
                </div>
            </div>
            
            <p className="text-slate-300 mt-4 text-sm">Card {currentIndex + 1} of {flashcards.length}</p>

            <div className="absolute bottom-10 flex gap-4">
                {!isFlipped ? (
                    <Button onClick={() => setIsFlipped(true)} className="px-10 py-3 text-lg">Flip</Button>
                ) : (
                    <>
                        <Button onClick={() => handleNext(false)} className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg">Incorrect</Button>
                        <Button onClick={() => handleNext(true)} className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg">Correct</Button>
                    </>
                )}
            </div>
        </div>
    )
}

export default Notes;