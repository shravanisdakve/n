import React, { useState } from 'react';
import { X, Clipboard, Check } from 'lucide-react';

interface ShareModalProps {
  roomId: string;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ roomId, onClose }) => {
  const [copied, setCopied] = useState(false);
  const shareText = `Join my NexusAI study room! ID: ${roomId}`;
  const encodedText = encodeURIComponent(shareText);

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm m-4 ring-1 ring-slate-700 animate-in fade-in-50 zoom-in-95" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Share Room</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-slate-700 p-2 rounded-lg">
            <input type="text" readOnly value={roomId} className="bg-transparent flex-1 font-mono text-slate-200 focus:outline-none" />
            <button onClick={handleCopy} className="px-3 py-1.5 text-sm bg-violet-600 hover:bg-violet-500 rounded text-white">
              {copied ? <Check size={16} /> : <Clipboard size={16} />}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center">Or share on social media:</p>
          <div className="flex justify-center gap-4">
            <a href={`https://wa.me/?text=${encodedText}`} target="_blank" rel="noopener noreferrer" title="Share on WhatsApp" className="p-3 bg-green-500 hover:bg-green-600 transition-colors rounded-full text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.387 1.876 6.269l.16.271-1.023 3.744 3.815-1.004.29.174z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
