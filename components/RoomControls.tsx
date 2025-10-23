import React, { useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Phone, Smile, ScreenShare, Music, Share2 } from 'lucide-react';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '🙏'];

interface RoomControlsProps {
    isMuted: boolean;
    isCameraOn: boolean;
    isScreenSharing: boolean;
    mediaReady: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onToggleScreenShare: () => void;
    onHangUp: () => void;
    onReact: (emoji: string) => void;
    onToggleMusic: () => void;
    onShare: () => void;
    roomId: string;
}

const ControlButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string, title: string, disabled?: boolean, "aria-pressed"?: boolean }> = 
({ onClick, children, className = '', title, disabled = false, ...props }) => (
    <button
        onClick={onClick}
        title={title}
        disabled={disabled}
        className={`p-3 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
    >
        {children}
    </button>
);

const RoomControls: React.FC<RoomControlsProps> = (props) => {
    const { isMuted, isCameraOn, isScreenSharing, mediaReady, onToggleMute, onToggleCamera, onToggleScreenShare, onHangUp, onReact, onToggleMusic, onShare, roomId } = props;
    const [showReactions, setShowReactions] = useState(false);

    const handleReactionClick = (emoji: string) => {
        onReact(emoji);
        setShowReactions(false);
    }

    return (
        <div className="bg-slate-900/80 backdrop-blur-sm p-4 flex justify-between items-center relative">
             {showReactions && (
                <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-800/90 p-2 rounded-full flex gap-2 shadow-lg">
                    {EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => handleReactionClick(emoji)} className="text-2xl p-2 hover:bg-slate-700 rounded-full transition-transform transform hover:scale-110">
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
            
            {/* Left Actions */}
            <div className="flex items-center gap-3">
                 <button onClick={onShare} title="Share Room" className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg text-slate-300 hover:text-white transition-colors">
                    <Share2 size={18} />
                    <span className="font-mono text-sm">{roomId}</span>
                </button>
            </div>


            {/* Center: Main Controls */}
            <div className="flex items-center gap-4">
                <ControlButton 
                    onClick={onToggleMute} 
                    disabled={!mediaReady}
                    className={isMuted ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}
                    title={isMuted ? 'Unmute' : 'Mute'}
                    aria-pressed={isMuted}
                >
                    {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                </ControlButton>
                 <ControlButton 
                    onClick={onToggleCamera} 
                    disabled={!mediaReady || isScreenSharing}
                    className={!isCameraOn ? 'bg-red-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}
                    title={isCameraOn ? 'Stop Camera' : 'Start Camera'}
                    aria-pressed={!isCameraOn}
                 >
                    {isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
                </ControlButton>
                 <ControlButton
                    onClick={onToggleScreenShare}
                    disabled={!mediaReady}
                    className={isScreenSharing ? 'bg-violet-600 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}
                    title={isScreenSharing ? 'Stop Presenting' : 'Present Screen'}
                    aria-pressed={isScreenSharing}
                >
                    <ScreenShare size={22} />
                </ControlButton>
                 <ControlButton
                    onClick={() => setShowReactions(p => !p)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200"
                    title="Reactions"
                >
                    <Smile size={22} />
                </ControlButton>
                 <ControlButton
                    onClick={onToggleMusic}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200"
                    title="Study Music"
                >
                    <Music size={22} />
                </ControlButton>
            </div>

            {/* Right: Hang Up */}
            <div>
                 <ControlButton 
                    onClick={onHangUp} 
                    className="bg-red-600 hover:bg-red-700 text-white"
                    title="Leave Room"
                 >
                    <Phone size={22} />
                </ControlButton>
            </div>
        </div>
    );
};

export default RoomControls;