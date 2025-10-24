import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/contexts/AuthContext.tsx]
import { getCourses, addCourse } from '../services/courseService'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/courseService.ts]
import { getNotes, addTextNote, uploadNoteFile, deleteNote, getFlashcards, addFlashcards, updateFlashcard, updateNoteContent, deleteFlashcard } from '../services/notesService'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
import { type Note, type Course, type Flashcard as FlashcardType } from '../types'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
import { PageHeader, Button, Input, Textarea, Select, Modal } from '../components/ui'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx]
import { PlusCircle, Trash2, Upload, FileText, BookOpen, Layers, X, Brain, Edit, Save, ArrowLeft, Download, Eye, EyeOff } from 'lucide-react';
import { generateFlashcards } from '../services/geminiService'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/geminiService.ts]
import { useNavigate } from 'react-router-dom';
import Flashcard from '../components/Flashcard'; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/Flashcard.tsx]

const Notes: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/contexts/AuthContext.tsx]

  // --- State Management ---
  const [courses, setCourses] = useState<Course[]>([]); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
  const [activeNote, setActiveNote] = useState<Note | null>(null); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]

  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Data Fetching Effects ---
  useEffect(() => {
    if (currentUser) { // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/contexts/AuthContext.tsx]
      getCourses().then(setCourses); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/courseService.ts]
    }
  }, [currentUser]); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/contexts/AuthContext.tsx]

  useEffect(() => {
    if (selectedCourse) {
      setActiveNote(null);
      setIsEditingNote(false);
      getNotes(selectedCourse).then(setNotes); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
      getFlashcards(selectedCourse).then(setFlashcards); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
    } else {
        setNotes([]);
        setFlashcards([]);
        setActiveNote(null);
    }
  }, [selectedCourse]);

  // --- Handlers ---
  const handleAddCourse = async () => {
    const courseName = prompt("Enter the name of the new course:");
    if (courseName) {
      const newCourse = await addCourse(courseName); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/courseService.ts]
      if (newCourse) {
        setCourses(prev => [...prev, newCourse]);
        setSelectedCourse(newCourse.id); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
      }
    }
  };

  const reloadNotes = () => {
    if (selectedCourse) {
      getNotes(selectedCourse).then(setNotes); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
    }
  };

  const handleSelectNote = (note: Note) => { // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
    setActiveNote(note);
    setEditedContent(note.content || ''); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
    setIsEditingNote(false);
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => { // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
    e.stopPropagation();
    if (!selectedCourse || !window.confirm("Are you sure you want to delete this note?")) return;

    const noteToDelete = notes.find(n => n.id === noteId); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
    if (noteToDelete) {
      await deleteNote(selectedCourse, noteToDelete); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
      reloadNotes();
      if (activeNote?.id === noteId) { // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        setActiveNote(null);
      }
    }
  };

  const handleSaveNoteEdit = async () => {
    if (!activeNote || !selectedCourse) return;

    try {
        await updateNoteContent(selectedCourse, activeNote.id, editedContent); // Call the service
        console.log("Saved note:", activeNote.id, "with content:", editedContent); //

        // Update local state after successful save
        setActiveNote(prev => prev ? { ...prev, content: editedContent } : null); //
        setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: editedContent } : n)); //
        setIsEditingNote(false);
    } catch (error) {
        console.error("Failed to save note edit:", error);
        alert("Failed to save your changes. Please try again.");
    }
  };

  // --- UPDATED handleGenerateFlashcards ---
  const handleGenerateFlashcards = async () => {
    if (!selectedCourse || notes.length === 0) return;

    // Filter notes to include only those with actual content (not null, empty, or the placeholder message)
    const validNotesContent = notes
        .filter(n => n.content && n.content !== "[Text extraction pending or failed]") // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        .map(n => n.content); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]

    if (validNotesContent.length === 0) {
      alert("No text content found in your notes (including uploaded files) to generate flashcards from. Please add text notes or upload files with extractable text.");
      return;
    }

    const content = validNotesContent.join('\n\n');

    try {
        console.log("Generating flashcards from content length:", content.length);
        const flashcardsJson = await generateFlashcards(content); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/geminiService.ts]
        const newFlashcards = JSON.parse(flashcardsJson).map((f: any) => ({ ...f, id: `mock_flashcard_${Date.now()}_${Math.random()}`, bucket: 1, lastReview: Date.now() })); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        await addFlashcards(selectedCourse, newFlashcards); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
        getFlashcards(selectedCourse).then(setFlashcards); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
        alert(`Successfully generated ${newFlashcards.length} flashcards!`);
    } catch (error) {
        console.error("Failed to generate or parse flashcards:", error);
        alert("Failed to generate flashcards. The AI might have had trouble understanding the combined content, or there was a network issue. Please try again.");
    }
  };
  // --- END UPDATE ---


  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Notes & Resources" subtitle="Manage your notes, files, and flashcards for each course." /> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}

      {/* --- Course Selector --- */}
      <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 mr-2 text-violet-400" />
          <Select // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx]
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="w-full md:w-1/3"
          >
            <option value="">Select a Course</option>
            {courses.map(course =>
              <option key={course.id} value={course.id}>{course.name}</option>
            )}
          </Select>
          <Button onClick={handleAddCourse} className="p-2.5"><PlusCircle size={16} /></Button> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
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
        onNoteAdded={reloadNotes}
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
  const [showPdfPreview, setShowPdfPreview] = useState(false); // State for PDF preview toggle

  // Reset PDF preview when active note changes
  useEffect(() => {
    setShowPdfPreview(false);
  }, [activeNote]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Column: Note List */}
      <div className="w-1/3 border-r border-slate-700 overflow-y-auto">
        <div className="p-3 border-b border-slate-700">
          <Button onClick={onAddNoteClick} className="w-full"> {/* */}
            <PlusCircle size={16} className="mr-2" /> Add Note/File
          </Button>
        </div>
        <div className="space-y-1 p-2">
          {notes.map((note: Note) => ( //
            <button
              key={note.id} //
              onClick={() => onSelectNote(note)}
              className={`w-full text-left p-3 rounded-lg group flex justify-between items-start ${activeNote?.id === note.id ? 'bg-violet-900/50' : 'hover:bg-slate-700/50' //
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={16} className={`flex-shrink-0 ${note.fileUrl ? "text-sky-400" : "text-slate-400"}`} /> {/* */}
                <span className="font-medium text-slate-200 truncate">{note.title}</span> {/* */}
              </div>
              <button onClick={(e) => onDeleteNote(e, note.id)} className="flex-shrink-0 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2"> {/* */}
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
              <h2 className="text-2xl font-bold text-white">{activeNote.title}</h2> {/* */}
              <div className="flex gap-2">
                {activeNote.content && ( //
                  isEditingNote ? (
                    <Button onClick={onSaveEdit} className="p-2.5"><Save size={16} /></Button> //
                  ) : (
                    <Button onClick={onEditClick} className="p-2.5" variant="ghost"><Edit size={16} /></Button> //
                  )
                )}
                {activeNote.content && ( //
                  <Button onClick={() => navigate('/tutor', { state: { noteContent: activeNote.content } })} className="p-2.5" variant="ghost" title="Study with AI"> {/* */}
                    <Brain size={16} />
                  </Button>
                )}
                 {/* Show download for all file types */}
                 {activeNote.fileUrl && ( //
                     <a href={activeNote.fileUrl} download={activeNote.fileName} title="Download File"> {/* */}
                        <Button className="p-2.5" variant="ghost"> {/* */}
                            <Download size={16} />
                        </Button>
                    </a>
                 )}
              </div>
            </div>

            {/* --- Text Content Handling --- */}
            {activeNote.content && activeNote.content !== "[Text extraction pending or failed]" ? ( //
              isEditingNote ? (
                <Textarea //
                  value={editedContent}
                  onChange={e => onContentChange(e.target.value)}
                  className="min-h-[400px] text-base"
                />
              ) : (
                <div
                  className="prose prose-invert prose-lg max-w-none"
                  style={{ whiteSpace: 'pre-wrap' }}
                >
                  {activeNote.content} {/* */}
                </div>
              )
            ) : null}
             {/* Show message if text extraction failed for a file note */}
            {activeNote.fileUrl && activeNote.content === "[Text extraction pending or failed]" && ( //
                 <p className="text-amber-400 text-sm bg-amber-900/30 p-3 rounded-md">Could not automatically extract text from this file. You can still download it using the icon above.</p>
            )}

            {/* --- File Handling (PDF Preview or Info) --- */}
            {activeNote.fileUrl && activeNote.fileType === 'application/pdf' && ( //
              <div className="mt-4">
                {!showPdfPreview ? (
                  // Show Preview Button
                  <div className="flex items-center gap-2 bg-slate-700 p-3 rounded-lg">
                     <FileText size={20} className="text-sky-400 flex-shrink-0" />
                     <span className="font-medium text-slate-200 truncate flex-1">{activeNote.fileName}</span> {/* */}
                     <Button onClick={() => setShowPdfPreview(true)} variant="outline" size="sm"> {/* */}
                       <Eye size={16} className="mr-1"/> Preview
                     </Button>
                  </div>
                ) : (
                  // Show PDF Preview Iframe
                  <div>
                    <Button onClick={() => setShowPdfPreview(false)} variant="ghost" size="sm" className="mb-2"> {/* */}
                        <EyeOff size={16} className="mr-1"/> Close Preview
                    </Button>
                    <div className="w-full h-[600px] rounded-lg overflow-hidden ring-1 ring-slate-700">
                      <iframe
                        src={activeNote.fileUrl} //
                        title={activeNote.title} //
                        width="100%"
                        height="100%"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Show info for non-PDF files */}
             {activeNote.fileUrl && activeNote.fileType !== 'application/pdf' && ( //
                <div className="flex items-center gap-2 bg-slate-700 p-3 rounded-lg mt-4">
                   <FileText size={20} className="text-slate-400 flex-shrink-0" />
                   <span className="font-medium text-slate-200 truncate flex-1">{activeNote.fileName}</span> {/* */}
                   <span className="text-sm text-slate-500"> (Click download icon above)</span>
                </div>
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
    try {
        if (noteType === 'file' && file) {
            await uploadNoteFile(courseId, title || file.name, file); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
        } else if (noteType === 'text') {
            await addTextNote(courseId, title, content); // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/services/notesService.ts]
        }
        onNoteAdded();
    } catch (error) {
        console.error("Failed to add note:", error);
        alert("Failed to add the note. Please try again.");
    } finally {
        setIsSubmitting(false);
        // Reset local state *before* closing to avoid flicker
        setTitle('');
        setContent('');
        setFile(null);
        setNoteType('text');
        onClose();
    }
  };

  // Reset internal state when the modal is closed externally
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setContent('');
      setFile(null);
      setNoteType('text');
      setIsSubmitting(false);
    }
  }, [isOpen]);


  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Note or Resource"> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex justify-center bg-slate-700 rounded-lg p-1">
          <Button type="button" onClick={() => setNoteType('text')} className={`w-1/2 ${noteType === 'text' ? 'bg-violet-600' : 'bg-transparent'}`}> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
            Text Note
          </Button>
          <Button type="button" onClick={() => setNoteType('file')} className={`w-1/2 ${noteType === 'file' ? 'bg-violet-600' : 'bg-transparent'}`}> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
            Upload File
          </Button>
        </div>

        <Input // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
          placeholder="Title (required)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
        />

        {noteType === 'text' && (
          <Textarea // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
            placeholder="Write your note or doubt here..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
          />
        )}

        {noteType === 'file' && (
          <div className="flex items-center justify-center w-full">
            <label htmlFor="modal-file-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload size={24} className="text-slate-400 mb-2" />
                <p className="mb-2 text-sm text-slate-400 text-center px-2">
                  {file ? file.name : <><span className="font-semibold">Click to upload</span> or drag and drop</>}
                </p>
                <p className="text-xs text-slate-500">PDF, TXT, MD, PPTX</p>
              </div>
              <input
                id="modal-file-upload"
                type="file"
                className="hidden"
                onChange={e => setFile(e.target.files ? e.target.files[0] : null)}
                accept=".txt,.md,.pdf,.pptx"
              />
            </label>
          </div>
        )}

        <Button type="submit" isLoading={isSubmitting} className="w-full" disabled={isSubmitting || (noteType === 'file' && !file) || !title.trim()}> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
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
        if (!f.lastReview || !f.bucket) return true; // Review if data is missing or invalid // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        const daysSinceReview = (now - f.lastReview) / oneDay; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        if (f.bucket === 1) return daysSinceReview >= 1; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        if (f.bucket === 2) return daysSinceReview >= 3; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        if (f.bucket === 3) return daysSinceReview >= 7; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        if (f.bucket === 4) return daysSinceReview >= 14; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
        return daysSinceReview >= 30; // Default for bucket 5+ (adjust as needed)
    });
    setReviewFlashcards(reviewable);
    setIsReviewing(true);
  };


  const handleDeleteFlashcard = async (cardId: string) => {
    if (!courseId || !window.confirm("Delete this flashcard?")) return;
    await deleteFlashcard(courseId, cardId);
    getFlashcards(courseId).then(setFlashcards); // Refresh list
  };


  return (
    <div className="p-6 overflow-y-auto">
      <div className="flex gap-4 mb-6">
        <Button onClick={onGenerate}>Generate Flashcards from Notes</Button> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
        <Button onClick={startReview} variant="outline" disabled={flashcards.length === 0}> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
          Review Due Cards
        </Button>
      </div>

      <h3 className="text-lg font-bold text-slate-200 mb-4">All Flashcards ({flashcards.length})</h3>
      {flashcards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((card) => ( // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
            <div key={card.id} className="relative group"> {/* Add a wrapper */}
              <Flashcard front={card.front} back={card.back} /> {/* */}
              {/* Add buttons (visible on hover) */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                {/* Add Edit button later if needed */}
                <Button variant="ghost" size="sm" onClick={() => handleDeleteFlashcard(card.id)} className="p-1 h-auto bg-slate-800/50 hover:bg-red-500/50"> {/* */}
                  <Trash2 size={14} className="text-red-400"/>
                </Button>
              </div>
            </div>
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
const FlashcardPlayer: React.FC<{ flashcards: FlashcardType[], onComplete: () => void, onUpdateCard: (card: FlashcardType, correct: boolean) => void }> = ({ flashcards, onComplete, onUpdateCard }) => { // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = (correct: boolean) => {
        onUpdateCard(flashcards[currentIndex], correct);
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        } else {
            onComplete(); // Close after the last card
        }
    };


    if (flashcards.length === 0) {
        return (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in-50" onClick={onComplete}>
                <div className="bg-slate-800 p-8 rounded-lg text-center" onClick={e => e.stopPropagation()}>
                    <p className="text-xl text-white">No flashcards are due for review today!</p>
                    <p className="text-slate-400 mb-6">Check back later or review all cards from the main page.</p>
                    <Button onClick={onComplete} className="mt-4">Close</Button> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
                </div>
            </div>
        )
    }

    const card = flashcards[currentIndex]; // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts]

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
                        <p className="text-2xl text-white">{card.front}</p> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts] */}
                    </div>
                    {/* Back */}
                    <div className="absolute w-full h-full bg-sky-600 rounded-lg flex items-center justify-center p-8 text-center rotate-y-180 backface-hidden">
                        <p className="text-2xl text-white">{card.back}</p> {/* [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/types.ts] */}
                    </div>
                </div>
            </div>
            
            <p className="text-slate-300 mt-4 text-sm">Card {currentIndex + 1} of {flashcards.length}</p>

            <div className="absolute bottom-10 flex gap-4">
                {!isFlipped ? (
                    <Button onClick={() => setIsFlipped(true)} className="px-10 py-3 text-lg">Flip</Button> // [cite: shravanisdakve/n/n-0cefof51e73d0aad0fb684c0d3dedc4ae85410c6/components/ui.tsx] */}
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
