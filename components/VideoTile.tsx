import React, { useEffect, useRef } from 'react';
import { MicOff, User, ScreenShare } from 'lucide-react';

interface VideoTileProps {
    stream?: MediaStream | null;
    displayName: string;
    isMuted: boolean;
    isLocal?: boolean;
    isScreenSharing?: boolean;
}

const VideoTile: React.FC<VideoTileProps> = ({ stream, displayName, isMuted, isLocal = false, isScreenSharing = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-slate-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center ring-2 ring-transparent has-[:focus-visible]:ring-violet-500">
            {stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal} // Only mute your own video to prevent feedback
                    className={`w-full h-full object-contain ${isLocal && !isScreenSharing ? 'transform scale-x-[-1]' : ''}`}
                />
            ) : (
                <div className="text-slate-600">
                    <User size={64} />
                </div>
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex justify-between items-center">
                <div className="flex items-center gap-2">
                     {isMuted && <MicOff size={16} className="text-white bg-red-600/80 p-0.5 rounded-full" />}
                    <span className="text-sm font-medium text-white drop-shadow-md">{displayName}</span>
                </div>
                {isScreenSharing && (
                     <div className="flex items-center gap-1 text-xs text-sky-300 bg-sky-900/50 px-2 py-1 rounded-md">
                        <ScreenShare size={14} />
                        <span>Presenting</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoTile;
