import React, { useState, useRef } from 'react';
import { Button, Spinner } from './ui';
import { UploadCloud, FileText, Download, Trash2 } from 'lucide-react';

interface Resource {
  name: string;
  url: string;
  uploader: string;
  timeCreated: string;
}

interface ResourcePanelProps {
  resources: Resource[];
  onUpload: (file: File) => void;
  onDelete: (fileName: string) => void;
  isUploading: boolean;
}

const ResourcePanel: React.FC<ResourcePanelProps> = ({ resources, onUpload, onDelete, isUploading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      event.target.value = ''; // Reset file input
    }
  };

  return (
    <div className="p-4">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
        {isUploading ? <><Spinner size="sm" className="mr-2" /> Uploading...</> : <><UploadCloud size={16} className="mr-2" /> Upload Resource</>}
      </Button>

      <div className="mt-4 space-y-2">
        {resources.map(resource => (
          <div key={resource.name} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-lg">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-200">{resource.name}</p>
                <p className="text-xs text-slate-400">Uploader: {resource.uploader}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a href={resource.url} target="_blank" rel="noopener noreferrer" download>
                <Button variant="ghost" size="sm" title="Download">
                  <Download size={16} />
                </Button>
              </a>
              <Button variant="ghost" size="sm" title="Delete" onClick={() => onDelete(resource.name)}>
                <Trash2 size={16} className="text-red-500" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResourcePanel;
