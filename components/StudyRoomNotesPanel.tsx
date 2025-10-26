import React, { useState, useEffect, useMemo } from 'react';
import { Button, Textarea, Spinner } from './ui';
// Note type might not be strictly needed if we use DisplayItem consistently
// import { Note } from '../types';
import { FileText, Paperclip, Trash2, Edit, Save, Download, Eye, EyeOff, Upload, Info } from 'lucide-react';
// Removed useNavigate as AI Tutor button isn't included here for simplicity

// Combined type for display
interface DisplayItem {
    id: string;
    title: string;
    type: 'shared-text' | 'file';
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    // Add optional properties from resource if needed, like uploader
    uploader?: string;
}

interface StudyRoomNotesPanelProps {
    sharedNoteContent: string;
    resources: any[]; // Consider defining a proper Resource type later
    onSaveSharedNote: (content: string) => Promise<void>;
    onUploadResource: (file: File) => void;
    onDeleteResource: (fileName: string) => void;
    isSavingNote: boolean;
    isUploading: boolean;
}

const StudyRoomNotesPanel: React.FC<StudyRoomNotesPanelProps> = ({
    sharedNoteContent,
    resources,
    onSaveSharedNote,
    onUploadResource,
    onDeleteResource,
    isSavingNote,
    isUploading
}) => {
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [activeItem, setActiveItem] = useState<DisplayItem | null>(null);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [showPdfPreview, setShowPdfPreview] = useState(false);

    // Combine shared note and resources into a single list
    const displayItems: DisplayItem[] = useMemo(() => {
        const items: DisplayItem[] = [];
        // Always include the shared text note entry, even if empty, for selection
        items.push({
            id: 'shared-text-note',
            title: 'Shared Study Notes',
            type: 'shared-text',
            content: sharedNoteContent
        });

        resources.forEach(res => {
            // Basic check for necessary properties
            if (res && res.name && res.url) {
                items.push({
                    id: res.name, // Use name as unique ID for files in this context
                    title: res.name,
                    type: 'file',
                    fileUrl: res.url,
                    fileName: res.name,
                    fileType: res.mimeType || 'application/octet-stream', // Use provided or guess
                    uploader: res.uploader || 'Unknown'
                });
            } else {
                 console.warn("Skipping invalid resource item:", res);
            }
        });
        return items;
    }, [sharedNoteContent, resources]);

    // Effect to update edited content or select first item
     useEffect(() => {
        // If there's no active item, select the first one (usually Shared Notes)
        if (!activeItem && displayItems.length > 0) {
            setActiveItem(displayItems[0]);
            if (displayItems[0].type === 'shared-text') {
                 setEditedContent(displayItems[0].content || '');
            }
            setIsEditingNote(false);
        }
        // If the active item is the shared note and we are NOT editing, sync content
        else if (activeItem?.id === 'shared-text-note' && !isEditingNote) {
            setEditedContent(sharedNoteContent);
        }
        // If the activeItem is removed from displayItems (e.g., deleted file), deselect it
        else if (activeItem && !displayItems.some(item => item.id === activeItem.id)) {
             setActiveItem(null);
             setIsEditingNote(false);
        }

    }, [sharedNoteContent, activeItem, isEditingNote, displayItems]); // Added displayItems

    // Reset preview when active item changes
     useEffect(() => {
        setShowPdfPreview(false);
     }, [activeItem]);


    const handleSelect = (item: DisplayItem) => {
        // Prevent re-selecting if already saving/loading something else
        if (isSavingNote || isUploading) return;

        setActiveItem(item);
        if (item.type === 'shared-text') {
            setEditedContent(item.content || '');
            setIsEditingNote(false); // Default to view mode on select
        } else {
             setIsEditingNote(false); // Ensure editing is off for files
        }
    };

    const handleSaveEdit = async () => {
        await onSaveSharedNote(editedContent);
        setIsEditingNote(false);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          onUploadResource(file);
          event.target.value = '';
        }
      };

    const handleDownloadFile = (item: DisplayItem) => {
      if (item.type === 'file' && item.fileUrl) {
           const link = document.createElement('a');
           link.href = item.fileUrl;
           link.download = item.fileName || item.title;
           document.body.appendChild(link);
           link.click();
           document.body.removeChild(link);
      }
    };


    return (
        <div className="flex flex-1 overflow-hidden h-full text-sm"> {/* Reduced base text size */}
            {/* --- Notes/Files List --- */}
            <div className="w-2/5 border-r border-slate-700 flex flex-col h-full bg-slate-800/50"> {/* Slightly wider list */}
                <div className="p-3 border-b border-slate-700">
                    {/* File Upload Input (Hidden) */}
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
                     {/* Upload Button */}
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full text-xs py-2"> {/* Smaller button */}
                        {isUploading ? <><Spinner size="sm" className="mr-2" /> Uploading...</> : <><Upload size={14} className="mr-2" /> Upload File</>}
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {displayItems.length === 0 && (
                        <p className="text-center text-slate-400 p-4 text-xs">No shared notes or files.</p> // Smaller text
                    )}
                    {displayItems.map(item => (
                        // Use div for better structure, handle click/keyboard
                        <div
                            key={item.id}
                            onClick={() => handleSelect(item)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelect(item)}
                            className={`w-full text-left p-3 border-b border-slate-700/50 transition-colors group flex justify-between items-start cursor-pointer ${activeItem?.id === item.id ? 'bg-slate-700' : 'hover:bg-slate-600/50'}`} // Subtle hover, different active bg
                        >
                            <div className="flex items-center gap-2 overflow-hidden mr-2"> {/* Added margin */}
                                {item.type === 'shared-text'
                                    ? <FileText size={16} className="flex-shrink-0 text-slate-400" />
                                    : <Paperclip size={16} className="flex-shrink-0 text-sky-400" />
                                }
                                <span className="font-medium text-slate-200 truncate">{item.title}</span>
                            </div>
                            {/* Delete Button for Files Only */}
                            {item.type === 'file' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-auto text-red-500 hover:bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" // Ensure it doesn't wrap
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(`Delete file "${item.fileName}"?`)) {
                                            onDeleteResource(item.fileName!);
                                            if(activeItem?.id === item.id) setActiveItem(null);
                                        }
                                    }}
                                    title={`Delete ${item.fileName}`}
                                >
                                    <Trash2 size={14} />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* --- Active Item Panel --- */}
            <div className="flex-1 w-3/5 flex flex-col overflow-hidden h-full bg-slate-800"> {/* Explicit width */}
                {activeItem ? (
                    <div className="flex-1 flex flex-col h-full overflow-hidden"> {/* Use overflow-hidden */}
                        {/* --- Toolbar --- */}
                        <div className="flex justify-between items-center p-3 border-b border-slate-700 bg-slate-800 flex-shrink-0"> {/* Reduced padding */}
                            <h3 className="text-base font-semibold text-white truncate mr-4">{activeItem.title}</h3> {/* Adjusted size */}
                            <div className="flex items-center gap-1 flex-shrink-0"> {/* Reduced gap */}
                                {/* Download Button (for files) */}
                                {activeItem.type === 'file' && (
                                    <Button
                                        variant="ghost"
                                        size="sm" // Smaller button
                                        onClick={() => handleDownloadFile(activeItem)}
                                        className="p-1.5 text-slate-400 hover:text-white" // Adjusted padding
                                        aria-label="Download file"
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </Button>
                                )}
                                {/* Edit/Save Buttons (for text note) */}
                                {activeItem.type === 'shared-text' && (
                                    isEditingNote ? (
                                        <Button onClick={handleSaveEdit} isLoading={isSavingNote} size="sm" className="px-2 py-1 text-xs"> {/* Smaller button */}
                                            <Save size={14} className="mr-1" /> Save
                                        </Button>
                                    ) : (
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditingNote(true)} className="p-1.5 text-slate-400 hover:text-white" aria-label="Edit note" title="Edit"> {/* Adjusted padding */}
                                            <Edit size={16} />
                                        </Button>
                                    )
                                )}
                            </div>
                        </div>

                        {/* --- Content Display --- */}
                         {/* Added overflow-y-auto here for content scroll */}
                        <div className="p-4 flex-1 overflow-y-auto">
                            {activeItem.type === 'shared-text' ? (
                                isEditingNote ? (
                                    <Textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        className="w-full h-full min-h-[calc(100vh-200px)] p-0 bg-slate-800 border-none focus:ring-0 text-sm resize-none" // Adjusted styles
                                        placeholder="Start writing shared notes..."
                                    />
                                ) : (
                                    // Use prose for better text formatting, ensure whitespace wrapping
                                    <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap">{editedContent || <p className="text-slate-400 italic">Shared notes are empty. Click 'Edit' to start.</p>}</div>
                                )
                            ) : (
                                // File Display Area
                                 <div>
                                      {/* PDF Preview Logic */}
                                     {activeItem.fileType === 'application/pdf' && activeItem.fileUrl ? (
                                         <div className="mt-2"> {/* Reduced margin */}
                                            {!showPdfPreview ? (
                                                <div className="flex items-center gap-2 bg-slate-700 p-3 rounded-lg ring-1 ring-slate-600">
                                                    <FileText size={18} className="text-sky-400 flex-shrink-0" />
                                                    <span className="font-medium text-slate-200 truncate flex-1">{activeItem.fileName}</span>
                                                    <Button onClick={() => setShowPdfPreview(true)} variant="outline" size="sm" className="text-xs"> {/* Smaller button */}
                                                    <Eye size={14} className="mr-1"/> Preview
                                                    </Button>
                                                </div>
                                                ) : (
                                                <div>
                                                    <Button onClick={() => setShowPdfPreview(false)} variant="ghost" size="sm" className="mb-2 text-xs"> {/* Smaller button */}
                                                        <EyeOff size={14} className="mr-1"/> Close Preview
                                                    </Button>
                                                    <div className="w-full h-[65vh] rounded-lg overflow-hidden ring-1 ring-slate-700"> {/* Adjusted height */}
                                                        <iframe
                                                            src={`${activeItem.fileUrl}#view=fitH`} // Add view parameter
                                                            title={activeItem.title}
                                                            width="100%"
                                                            height="100%"
                                                            className="border-none" // Remove iframe border
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                     ) : (
                                         // Nicer "Preview not available" message
                                         <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-700/50 rounded-lg mt-4 h-40 ring-1 ring-slate-600">
                                             <Info size={24} className="text-slate-400 mb-2"/>
                                            <p className="font-semibold text-slate-300">Preview not available</p>
                                            <p className="text-xs text-slate-400 mt-1">Use the download button in the header to view this file type.</p>
                                         </div>
                                     )}
                                 </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-slate-500 text-sm">Select an item to view or edit</p> {/* Adjusted text */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudyRoomNotesPanel;