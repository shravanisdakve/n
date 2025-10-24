import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext'; //
import { getCourses, addCourse } from '../services/courseService'; //
import { getNotes, addTextNote, uploadNoteFile, deleteNote, getFlashcards, addFlashcards, updateFlashcard, updateNoteContent } from '../services/notesService'; //
import { type Note, type Course, type Flashcard as FlashcardType } from '../types'; //
import { PageHeader, Button, Input, Textarea, Select, Modal, Spinner } from '../components/ui'; //
import { PlusCircle, Trash2, Upload, FileText, BookOpen, Layers, X, Brain, Edit, Save, ArrowLeft, Download, Eye, EyeOff } from 'lucide-react';
import { generateFlashcards, extractTextFromFile } from '../services/geminiService'; //
import { useNavigate } from 'react-router-dom';
import Flashcard from '../components/Flashcard'; //

// Helper function
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


const Notes: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth(); //

  // --- State Management ---
  const [courses, setCourses] = useState<Course[]>([]); //
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [notes, setNotes] = useState<Note[]>([]); //
  const [activeNote, setActiveNote] = useState<Note | null>(null); //
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const [flashcards, setFlashcards] = useState<FlashcardType[]>([]); //

  const [activeTab, setActiveTab] = useState<'notes' | 'flashcards'>('notes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Loading state for note-based generation
  const [isFileGenerating, setIsFileGenerating] = useState(false); // Loading state for file-based generation
  const [isSingleGenerating, setIsSingleGenerating] = useState<string | null>(null); // Track which note ID is generating

  // --- Data Fetching Effects ---
  useEffect(() => {
    if (currentUser) { //
      getCourses().then(setCourses); //
    }
  }, [currentUser]); //

  useEffect(() => {
    if (selectedCourse) {
      setActiveNote(null);
      setIsEditingNote(false);
      getNotes(selectedCourse).then(setNotes); //
      getFlashcards(selectedCourse).then(setFlashcards); //
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
      const newCourse = await addCourse(courseName); //
      if (newCourse) {
        setCourses(prev => [...prev, newCourse]);
        setSelectedCourse(newCourse.id); //
      }
    }
  };

  const reloadNotes = () => {
    if (selectedCourse) {
      getNotes(selectedCourse).then(setNotes); //
    }
  };
   const reloadFlashcards = () => {
      if (selectedCourse) {
          getFlashcards(selectedCourse).then(setFlashcards); //
      }
   };

  const handleSelectNote = (note: Note) => { //
    setActiveNote(note);
    setEditedContent(note.content || ''); //
    setIsEditingNote(false);
  };

  const handleDeleteNote = async (e: React.MouseEvent, noteId: string) => { //
    e.stopPropagation(); // Prevent note selection
    if (!selectedCourse || !window.confirm("Are you sure you want to delete this note?")) return;

    const noteToDelete = notes.find(n => n.id === noteId); //
    if (noteToDelete) {
      await deleteNote(selectedCourse, noteToDelete); //
      reloadNotes();
      if (activeNote?.id === noteId) { //
        setActiveNote(null);
      }
    }
  };

  const handleSaveNoteEdit = async () => {
    if (!activeNote || !selectedCourse) return;

    try {
        await updateNoteContent(selectedCourse, activeNote.id, editedContent); //
        console.log("Saved note:", activeNote.id, "with content:", editedContent); //
        setActiveNote(prev => prev ? { ...prev, content: editedContent } : null); //
        setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, content: editedContent } : n)); //
        setIsEditingNote(false);
    } catch (error) {
        console.error("Failed to save note edit:", error);
        alert("Failed to save your changes. Please try again.");
    }
  };

  const handleGenerateFromNotes = async () => {
    if (!selectedCourse || notes.length === 0 || isGenerating || isFileGenerating || isSingleGenerating) return;

    setIsGenerating(true);
    const validNotesContent = notes
        .filter(n => n.content && n.content !== "[Text extraction pending or failed]") //
        .map(n => n.content);

    if (validNotesContent.length === 0) {
      alert("No text content found in your notes to generate flashcards from.");
      setIsGenerating(false);
      return;
    }
    const content = validNotesContent.join('\n\n');

    try {
        console.log("Generating flashcards from combined notes content length:", content.length);
        const flashcardsJson = await generateFlashcards(content); //
        const newFlashcards = JSON.parse(flashcardsJson).map((f: any) => ({ ...f, id: `mock_flashcard_${Date.now()}_${Math.random()}`, bucket: 1, lastReview: Date.now() })); //
        await addFlashcards(selectedCourse, newFlashcards); //
        reloadFlashcards();
        alert(`Successfully generated ${newFlashcards.length} flashcards from notes!`);
    } catch (error) {
        console.error("Failed to generate or parse flashcards from notes:", error);
        alert("Failed to generate flashcards from notes. Please try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerateFromFile = async (file: File | null) => {
    if (!file || !selectedCourse || isGenerating || isFileGenerating || isSingleGenerating) return;

    setIsFileGenerating(true);
    let extractedContent = '';
    try {
        const base64Data = await fileToBase64(file);
        extractedContent = await extractTextFromFile(base64Data, file.type); //
        console.log(`Extracted ${extractedContent.length} characters from ${file.name}`);

        if (!extractedContent || extractedContent.trim().length === 0) {
            alert(`Could not extract any text from ${file.name}. Flashcard generation cancelled.`);
            setIsFileGenerating(false);
            return;
        }

        console.log(`Generating flashcards from extracted text (length: ${extractedContent.length})`);
        const flashcardsJson = await generateFlashcards(extractedContent); //
        const newFlashcards = JSON.parse(flashcardsJson).map((f: any) => ({ ...f, id: `mock_flashcard_${Date.now()}_${Math.random()}`, bucket: 1, lastReview: Date.now() })); //

        await addFlashcards(selectedCourse, newFlashcards); //
        reloadFlashcards();
        alert(`Successfully generated ${newFlashcards.length} flashcards from the file ${file.name}!`);

    } catch (error) {
        console.error(`Failed process file ${file.name} for flashcards:`, error);
        alert(`Failed to generate flashcards from the file ${file.name}. Please try again.`);
    } finally {
        setIsFileGenerating(false);
    }
  };

  // --- NEW: Handler for generating flashcards from a single note ---
  const handleGenerateSingleNoteFlashcards = async (e: React.MouseEvent, note: Note) => { //
    e.stopPropagation(); // Prevent note selection
    if (!note.content || note.content === "[Text extraction pending or failed]" || !selectedCourse || isGenerating || isFileGenerating || isSingleGenerating) { //
        alert("This note doesn't have any text content to generate flashcards from.");
        return;
    }

    setIsSingleGenerating(note.id); //
    try {
        console.log(`Generating flashcards from single note '${note.title}' (length: ${note.content.length})`); //
        const flashcardsJson = await generateFlashcards(note.content); //
        const newFlashcards = JSON.parse(flashcardsJson).map((f: any) => ({ ...f, id: `mock_flashcard_${Date.now()}_${Math.random()}`, bucket: 1, lastReview: Date.now() })); //

        await addFlashcards(selectedCourse, newFlashcards); //
        reloadFlashcards();
        alert(`Successfully generated ${newFlashcards.length} flashcards from the note '${note.title}'!`); //
        setActiveTab('flashcards'); // Switch to flashcards tab after generation

    } catch (error) {
        console.error(`Failed to generate flashcards from note ${note.id}:`, error); //
        alert(`Failed to generate flashcards from the note '${note.title}'. Please try again.`); //
    } finally {
        setIsSingleGenerating(null);
    }
  };


  return (
    <div className="space-y-6 h-full flex flex-col">
      <PageHeader title="Notes & Resources" subtitle="Manage your notes, files, and flashcards for each course." /> {/* */}

      {/* --- Course Selector --- */}
      <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 mr-2 text-violet-400" />
          <Select //
            value={selectedCourse}
            onChange={e => setSelectedCourse(e.target.value)}
            className="w-full md:w-1/3"
          >
            <option value="">Select a Course</option>
            {courses.map(course =>
              <option key={course.id} value={course.id}>{course.name}</option>
            )}
          </Select>
          <Button onClick={handleAddCourse} className="p-2.5"><PlusCircle size={16} /></Button> {/* */}
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
              isSingleGenerating={isSingleGenerating} // Pass loading state down
              onSelectNote={handleSelectNote}
              onDeleteNote={handleDeleteNote}
              onSaveEdit={handleSaveNoteEdit}
              onEditClick={() => setIsEditingNote(true)}
              onContentChange={setEditedContent}
              onAddNoteClick={() => setIsModalOpen(true)}
              onGenerateSingleNoteFlashcards={handleGenerateSingleNoteFlashcards} // Pass handler down
            />
          )}

          {activeTab === 'flashcards' && (
            <FlashcardsView
              flashcards={flashcards}
              onGenerateFromNotes={handleGenerateFromNotes}
              onGenerateFromFile={handleGenerateFromFile}
              isGenerating={isGenerating}
              isFileGenerating={isFileGenerating}
              courseId={selectedCourse}
              onUpdateCard={async (card, correct) => {
                const newBucket = correct ? Math.min(card.bucket + 1, 4) : 1;
                await updateFlashcard(selectedCourse, card.id, { bucket: newBucket, lastReview: Date.now() });
                reloadFlashcards();
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

// --- NotesView Sub-Component (UPDATED) ---
const NotesView: React.FC<any> = ({
  notes, activeNote, isEditingNote, editedContent, isSingleGenerating, // Added isSingleGenerating
  onSelectNote, onDeleteNote, onSaveEdit, onEditClick, onContentChange, onAddNoteClick, onGenerateSingleNoteFlashcards // Added onGenerateSingleNoteFlashcards
}) => {
  const navigate = useNavigate();
  const [showPdfPreview, setShowPdfPreview] = useState(false);

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
          {notes.map((note: Note) => { //
            const isGeneratingThis = isSingleGenerating === note.id; // Check if this specific note is generating //
            const hasContent = note.content && note.content !== "[Text extraction pending or failed]"; // Check for valid content //

            return (
              <button
                key={note.id} //
                onClick={() => onSelectNote(note)}
                className={`w-full text-left p-3 rounded-lg group flex justify-between items-start ${activeNote?.id === note.id ? 'bg-violet-900/50' : 'hover:bg-slate-700/50' //
                }`}
              >
                {/* Note Title and Icon */}
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText size={16} className={`flex-shrink-0 ${note.fileUrl ? "text-sky-400" : "text-slate-400"}`} /> {/* */}
                  <span className="font-medium text-slate-200 truncate">{note.title}</span> {/* */}
                </div>
                {/* Action Buttons (Generate Flashcard, Delete) */}
                <div className="flex-shrink-0 flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                   {hasContent && ( // Only show generate button if there's content
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto hover:bg-violet-500/30"
                        title="Generate Flashcards from this note"
                        onClick={(e) => onGenerateSingleNoteFlashcards(e, note)}
                        disabled={isGeneratingThis || isSingleGenerating} // Disable if this or any other is generating
                      >
                         {isGeneratingThis ? <Spinner size="sm"/> : <Layers size={14} className="text-violet-400"/>}
                      </Button>
                   )}
                   <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-auto hover:bg-red-500/30"
                      title="Delete Note"
                      onClick={(e) => onDeleteNote(e, note.id)} //
                      disabled={isGeneratingThis || isSingleGenerating} // Disable while generating
                    >
                      <Trash2 size={14} className="text-red-400"/>
                   </Button>
                </div>
              </button>
            )
          })}
          {notes.length === 0 && <p className="text-center text-slate-400 p-4 text-sm">No notes yet.</p>}
        </div>
      </div>

      {/* Right Column: Content Viewer */}
      {/* ... (rest of NotesView remains the same) ... */}
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
              await uploadNoteFile(courseId, title || file.name, file); //
          } else if (noteType === 'text') {
              await addTextNote(courseId, title, content); //
          }
          onNoteAdded(); // Refresh the notes list
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
      <Modal isOpen={isOpen} onClose={onClose} title="Add New Note or Resource"> {/* */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center bg-slate-700 rounded-lg p-1">
            <Button type="button" onClick={() => setNoteType('text')} className={`w-1/2 ${noteType === 'text' ? 'bg-violet-600' : 'bg-transparent'}`}> {/* */}
              Text Note
            </Button>
            <Button type="button" onClick={() => setNoteType('file')} className={`w-1/2 ${noteType === 'file' ? 'bg-violet-600' : 'bg-transparent'}`}> {/* */}
              Upload File
            </Button>
          </div>

          <Input //
            placeholder="Title (required)"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />

          {noteType === 'text' && (
            <Textarea //
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
                    {file ? file.name : <><span className="font-semibold">Click to upload</span> or drag and drop</>}</p>
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

          <Button type="submit" isLoading={isSubmitting} className="w-full" disabled={isSubmitting || (noteType === 'file' && !file) || !title.trim()}> {/* */}
            {isSubmitting ? 'Adding...' : 'Add Resource'}
          </Button>
        </form>
      </Modal>
    );
  };

// --- FlashcardsView Sub-Component ---
const FlashcardsView: React.FC<{ 
    flashcards: FlashcardType[],
    onGenerateFromNotes: () => void,
    onGenerateFromFile: (file: File | null) => void,
    isGenerating: boolean,
    isFileGenerating: boolean,
    courseId: string,
    onUpdateCard: (card: FlashcardType, correct: boolean) => void
}> = ({
  flashcards, onGenerateFromNotes, onGenerateFromFile, isGenerating, isFileGenerating, courseId, onUpdateCard
}) => {
  const [reviewFlashcards, setReviewFlashcards] = useState<FlashcardType[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onGenerateFromFile(file);
    }
    // Reset file input to allow uploading the same file again
    if (event.target) {
        event.target.value = '';
    }
  };

  const startReview = () => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const reviewable = flashcards.filter(f => {
        if (!f.lastReview || !f.bucket) return true; //
        const daysSinceReview = (now - f.lastReview) / oneDay; //
        if (f.bucket === 1) return daysSinceReview >= 1; //
        if (f.bucket === 2) return daysSinceReview >= 3; //
        if (f.bucket === 3) return daysSinceReview >= 7; //
        if (f.bucket === 4) return daysSinceReview >= 14; //
        return daysSinceReview >= 30;
    });
    setReviewFlashcards(reviewable);
    setIsReviewing(true);
  };


  return (
    <div className="p-6 overflow-y-auto">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        accept=".txt,.md,.pdf,.pptx"
      />

      <div className="flex gap-4 mb-6">
        {/* Button to generate from existing notes */}
        <Button onClick={onGenerateFromNotes} disabled={isGenerating || isFileGenerating} isLoading={isGenerating}> {/* */}
          Generate from All Notes
        </Button>
        {/* Button to trigger file upload and generation */}
        <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || isFileGenerating}
            isLoading={isFileGenerating}
            variant="secondary" // Use a different style maybe
        > {/* */}
          <Upload size={16} className="mr-2" /> Generate from File
        </Button>
        {/* Review button */}
        <Button onClick={startReview} variant="outline" disabled={flashcards.length === 0 || isGenerating || isFileGenerating}> {/* */}
          Review Due Cards
        </Button>
      </div>

      <h3 className="text-lg font-bold text-slate-200 mb-4">All Flashcards ({flashcards.length})</h3>
      {flashcards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flashcards.map((card) => ( //
            <Flashcard key={card.id} front={card.front} back={card.back} /> //
          ))}
        </div>
      ) : (
        <p className="text-slate-400">No flashcards generated yet. Use the buttons above to create some!</p>
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
const FlashcardPlayer: React.FC<{ flashcards: FlashcardType[], onComplete: () => void, onUpdateCard: (card: FlashcardType, correct: boolean) => void }> = ({ flashcards, onComplete, onUpdateCard }) => { //
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
                    <Button onClick={onComplete} className="mt-4">Close</Button> {/* */}
                </div>
            </div>
        )
    }

    const card = flashcards[currentIndex]; //

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
                        <p className="text-2xl text-white">{card.front}</p> {/* */}
                    </div>
                    {/* Back */}
                    <div className="absolute w-full h-full bg-sky-600 rounded-lg flex items-center justify-center p-8 text-center rotate-y-180 backface-hidden">
                        <p className="text-2xl text-white">{card.back}</p> {/* */}
                    </div>
                </div>
            </div>
            
            <p className="text-slate-300 mt-4 text-sm">Card {currentIndex + 1} of {flashcards.length}</p>

            <div className="absolute bottom-10 flex gap-4">
                {!isFlipped ? (
                    <Button onClick={() => setIsFlipped(true)} className="px-10 py-3 text-lg">Flip</Button> //
                ) : (
                    <>
                        <Button onClick={() => handleNext(false)} className="bg-red-600 hover:bg-red-700 px-8 py-3 text-lg">Incorrect</Button> {/* */}
                        <Button onClick={() => handleNext(true)} className="bg-green-600 hover:bg-green-700 px-8 py-3 text-lg">Correct</Button> {/* */}
                    </>
                )}
            </div>
        </div>
    )
}

export default Notes;
