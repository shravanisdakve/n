import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';

// --- FIX: Replaced web links with your local files from the /public folder ---
const tracks = [
  { 
    name: 'Music 1', 
    url: '/music1.mp3' // This path works because music1.mp3 is in /public
  },
  { 
    name: 'Music 2', 
    url: '/music2.mp3' // This path works because music2.mp3 is in /public
  },
  { 
    name: 'Lofi music', 
    url: '/music3.mp3' // This path works because music3.mp3 is in /public
  },
];
// --- END FIX ---

const MusicPlayer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = (index: number) => {
    console.log(`handlePlayPause: Clicked track index=${index}, currentTrackIndex=${currentTrackIndex}`);
    
    if (index === currentTrackIndex) {
      setIsPlaying(prev => !prev);
      console.log(`Toggling play state for index ${index}`);
    } else {
      console.log(`Switching to track index ${index}`);
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
    console.log(`Toggling mute state to ${!isMuted}`);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
        console.log("Audio element ref not found");
        return;
    }

    if (currentTrackIndex !== null && tracks[currentTrackIndex]) {
        const newSrc = tracks[currentTrackIndex].url;
        if (audio.src !== newSrc) {
            console.log(`Setting audio source to: ${newSrc}`);
            audio.src = newSrc;
        }
    } else {
        if (audio.src) {
             console.log("No track selected, clearing src and pausing");
             audio.src = '';
             audio.pause();
        }
        return; 
    }

    if (isPlaying) {
      console.log("Attempting to play...");
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log("Playback started successfully.");
        }).catch(error => {
          console.error("Audio play failed:", error); 
          setIsPlaying(false);
        });
      } else {
          console.log("audio.play() did not return a promise.");
      }
    } else {
      console.log("Pausing audio.");
      audio.pause();
    }

  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
        console.log(`Setting audio muted state to: ${isMuted}`);
        audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  return (
    <div className="absolute bottom-24 right-4 bg-slate-800 rounded-lg shadow-2xl p-4 w-64 ring-1 ring-slate-700 z-30 animate-in fade-in-50 slide-in-from-bottom-5">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-semibold text-white flex items-center gap-2"><Music size={16} /> Study Music</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
      </div>
      <div className="space-y-2">
        {tracks.map((track, index) => (
          <div key={track.name} className={`flex items-center justify-between p-2 rounded transition-colors ${currentTrackIndex === index ? 'bg-violet-900/50' : 'bg-slate-700/50'}`}>
            <span className="text-sm text-slate-200">{track.name}</span>
            <button onClick={() => handlePlayPause(index)} className="p-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-full">
              {currentTrackIndex === index && isPlaying ? <Pause size={14} /> : <Play size={14} />}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700 flex justify-end">
        <button onClick={handleMuteToggle} className="text-slate-400 hover:text-white">
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
      <audio
        ref={audioRef}
        onEnded={() => {
            console.log("Track ended.");
            setIsPlaying(false); 
        }}
        onError={(e) => {
             console.error("Audio Element Error:", e);
        }}
      />
    </div>
  );
};

export default MusicPlayer;