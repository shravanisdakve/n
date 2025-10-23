import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';

const tracks = [
  { name: 'Lofi Chill', url: 'https://cdn.pixabay.com/audio/2022/10/18/audio_7313085160.mp3' },
  { name: 'Ambient Focus', url: 'https://cdn.pixabay.com/audio/2024/05/20/audio_213459c55b.mp3' },
  { name: 'Classical Study', url: 'https://cdn.pixabay.com/audio/2022/11/17/audio_85d80d283e.mp3' },
];

const MusicPlayer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Declarative handler for play/pause state
  const handlePlayPause = (index: number) => {
    if (index === currentTrackIndex) {
      setIsPlaying(prev => !prev);
    } else {
      setCurrentTrackIndex(index);
      setIsPlaying(true);
    }
  };

  // Mute toggle handler
  const handleMuteToggle = () => {
    setIsMuted(prev => !prev);
  };
  
  // Effect to control audio playback based on state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const playAudio = () => {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          console.error("Audio play failed", error);
          setIsPlaying(false); // Reset state if play fails
        });
      }
    };

    if (isPlaying && currentTrackIndex !== null) {
      const currentSrc = tracks[currentTrackIndex].url;
      
      if (audio.src !== currentSrc) {
        audio.src = currentSrc;
        // The `loadeddata` event is fired when the media is ready to be played.
        audio.addEventListener('loadeddata', playAudio);
        audio.load(); // Explicitly load the new source
      } else {
        playAudio(); // If src is the same, just play.
      }
      
      // Cleanup function to remove the event listener on re-render or unmount
      return () => {
        audio.removeEventListener('loadeddata', playAudio);
      };

    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrackIndex]);

  // Effect to control mute state
  useEffect(() => {
      if (audioRef.current) {
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
      {/* A single audio element is always in the DOM, controlled by the ref and effects */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        muted={isMuted}
      />
    </div>
  );
};

export default MusicPlayer;