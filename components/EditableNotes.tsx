import React, { useState, useEffect } from 'react';
import { Textarea, Button } from './ui';

interface EditableNotesProps {
  initialNotes: string;
  onSave: (notes: string) => void;
  isSaving: boolean;
}

const EditableNotes: React.FC<EditableNotesProps> = ({ initialNotes, onSave, isSaving }) => {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  return (
    <div className="flex flex-col h-full">
      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Start typing your notes here..."
        className="flex-1 bg-slate-800 border-slate-700 resize-none"
      />
      <Button onClick={() => onSave(notes)} disabled={isSaving} className="mt-2">
        {isSaving ? 'Saving...' : 'Save Notes'}
      </Button>
    </div>
  );
};

export default EditableNotes;
