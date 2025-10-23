import React, { useState } from 'react';
import EditableNotes from './EditableNotes';
import FlashcardGenerator from './FlashcardGenerator';
import ResourcePanel from './ResourcePanel';
import { Button } from './ui';

interface ConsolidatedNotesProps {
  // Props for EditableNotes
  initialUserNotes: string;
  onSaveUserNotes: (notes: string) => void;
  isSavingUserNotes: boolean;

  // Props for ResourcePanel
  resources: any[];
  onUploadResource: (file: File) => void;
  onDeleteResource: (fileName: string) => void;
  isUploading: boolean;

  // Props for AI Notes
  aiNotes: string;
  isExtracting: boolean;
  onUploadAINotesClick: () => void;
}

const ConsolidatedNotes: React.FC<ConsolidatedNotesProps> = ({
  initialUserNotes,
  onSaveUserNotes,
  isSavingUserNotes,
  resources,
  onUploadResource,
  onDeleteResource,
  isUploading,
  aiNotes,
  isExtracting,
  onUploadAINotesClick,
}) => {
  const [activeTab, setActiveTab] = useState<'private' | 'shared'>('private');

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-center bg-slate-800 rounded-lg p-1">
        <Button
          onClick={() => setActiveTab('private')}
          className={`w-1/2 ${activeTab === 'private' ? 'bg-violet-600' : 'bg-transparent'}`}
        >
          My Private Notes
        </Button>
        <Button
          onClick={() => setActiveTab('shared')}
          className={`w-1/2 ${activeTab === 'shared' ? 'bg-violet-600' : 'bg-transparent'}`}
        >
          Shared Resources
        </Button>
      </div>

      {activeTab === 'private' && (
        <div className="space-y-4">
          <EditableNotes
            initialNotes={initialUserNotes}
            onSave={onSaveUserNotes}
            isSaving={isSavingUserNotes}
          />
          <FlashcardGenerator notes={initialUserNotes} />
        </div>
      )}

      {activeTab === 'shared' && (
        <div>
          <ResourcePanel
            resources={resources}
            onUpload={onUploadResource}
            onDelete={onDeleteResource}
            isUploading={isUploading}
          />
        </div>
      )}
    </div>
  );
};

export default ConsolidatedNotes;
