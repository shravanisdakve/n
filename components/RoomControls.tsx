import React from 'react';
import { Button } from './ui';
// --- FIX: Add UserPlus icon ---
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, Smile, Music, Share2, Clock, UserPlus } from 'lucide-react';
// --- END FIX ---


interface RoomControlsProps {
  mediaReady: boolean;
  isMuted: boolean;
  isCameraOn: boolean;
  isScreenSharing: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onHangUp: () => void;
  onReact: (emoji: string) => void;
  onToggleMusic: () => void;
  onShare: () => void;
  roomId: string;
  formattedSessionTime: string;
  showMusicPlayer: boolean; // NEW: Prop to control MusicPlayer visibility
  children?: React.ReactNode; // NEW: To render the MusicPlayer as a child
  // --- FIX: Added onAddTestUser prop ---
  onAddTestUser: () => void;
  // --- END FIX ---
}

const EMOJIS = ['👍', '❤️', '😂', '🎉', '🤔', '🙏'];

const RoomControls: React.FC<RoomControlsProps> = ({
  mediaReady,
  isMuted,
  isCameraOn,
  isScreenSharing,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onHangUp,
  onReact,
  onToggleMusic,
  onShare,
  roomId,
  formattedSessionTime,
  onAddTestUser, // Destructure the new prop
  showMusicPlayer, // Destructure new prop
  children // Destructure new prop
}) => {
  const [showReactions, setShowReactions] = React.useState(false);

  return (
    <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 flex justify-between items-center ring-1 ring-slate-700">
      {/* Left Group (Placeholder/Empty or Add Test User Button) */}
      <div className="w-1/3">
         {/* --- FIX: Added Add Test User Button (for development) --- */}
         {/* Conditionally render based on environment if needed, otherwise always show */}
         {process.env.NODE_ENV === 'development' && (
             <Button
                onClick={onAddTestUser}
                variant="outline"
                size="sm"
                className="text-xs"
                title="Add a mock user to the room for testing"
             >
                 <UserPlus size={14} className="mr-1" /> Add Test User
             </Button>
         )}
         {/* --- END FIX --- */}
      </div>

      {/* Center Group (Main Controls) */}
      <div className="flex justify-center items-center gap-3 w-1/3 relative">
         {/* ... (Mute, Camera, ScreenShare, Reactions, Music, Share buttons remain the same) ... */}
         {/* Mute/Unmute */}
        <Button
          onClick={onToggleMute}
          disabled={!mediaReady}
          className={`p-3 rounded-full ${isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </Button>

        {/* Camera On/Off */}
        <Button
          onClick={onToggleCamera}
          disabled={!mediaReady || isScreenSharing} // Disable camera toggle during screen share
          className={`p-3 rounded-full ${!isCameraOn || isScreenSharing ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {isCameraOn && !isScreenSharing ? <Video size={20} /> : <VideoOff size={20} />}
        </Button>

        {/* Screen Share On/Off */}
        <Button
          onClick={onToggleScreenShare}
          disabled={!mediaReady && !isScreenSharing} // Allow stopping share even if media fails later
          className={`p-3 rounded-full ${isScreenSharing ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}`}
          aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
        >
          {isScreenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
        </Button>

         {/* Reactions Button */}
        <div className="relative">
             <Button
                onClick={() => setShowReactions(prev => !prev)}
                className="p-3 rounded-full bg-slate-700 hover:bg-slate-600"
                aria-label="React"
            >
                <Smile size={20} />
            </Button>
            {showReactions && (
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-800 p-2 rounded-lg shadow-lg flex gap-2">
                    {EMOJIS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => {
                                onReact(emoji);
                                setShowReactions(false);
                            }}
                            className="text-2xl p-1 hover:bg-slate-700 rounded transition-transform duration-100 hover:scale-125"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Music Player Toggle */}
        <div className="relative">
            <Button
            onClick={onToggleMusic}
            className="p-3 rounded-full bg-slate-700 hover:bg-slate-600"
            aria-label="Toggle Music Player"
            >
            <Music size={20} />
            </Button>
            {showMusicPlayer && children} {/* Render children (MusicPlayer) here */}
        </div>

        {/* Share Room Button */}
        <Button
          onClick={onShare}
          className="p-3 rounded-full bg-slate-700 hover:bg-slate-600"
          aria-label="Share Room"
        >
          <Share2 size={20} />
        </Button>
      </div>

      {/* Right Group (Timer & Leave) */}
      <div className="flex justify-end items-center gap-4 w-1/3">
        {/* Session Timer */}
        <div className="flex items-center gap-2 text-sm font-mono text-slate-300 bg-slate-700/50 px-3 py-1 rounded-full">
            <Clock size={14} className="text-violet-400"/>
            <span>{formattedSessionTime}</span>
        </div>

        {/* Leave Room Button */}
        <Button
          onClick={onHangUp}
          className="bg-red-600 hover:bg-red-700 px-4 py-2"
          aria-label="Leave room"
        >
          <PhoneOff size={20} className="mr-2" /> Leave Room
        </Button>
      </div>
    </div>
  );
};

export default RoomControls;
