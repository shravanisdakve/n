import React, { useState, useEffect } from 'react';

export interface Reaction {
  id: number;
  emoji: string;
}

const Reactions: React.FC<{ reactions: Reaction[] }> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {reactions.map((reaction) => (
        <FlyingEmoji key={reaction.id} emoji={reaction.emoji} />
      ))}
    </div>
  );
};

const FlyingEmoji: React.FC<{ emoji: string }> = ({ emoji }) => {
  const [position, setPosition] = useState({
    left: `${Math.random() * 80 + 10}%`,
    bottom: '-10%',
    opacity: 1,
  });

  useEffect(() => {
    const floatUp = setTimeout(() => {
      setPosition((p) => ({ ...p, bottom: '110%' }));
    }, 50);

    const fadeOut = setTimeout(() => {
       setPosition((p) => ({ ...p, opacity: 0 }));
    }, 2500);


    return () => {
        clearTimeout(floatUp);
        clearTimeout(fadeOut);
    };
  }, []);

  return (
    <span
      className="absolute text-4xl transition-all duration-[4000ms] ease-out"
      style={{ ...position, transform: `translateX(-50%) rotate(${Math.random() * 60 - 30}deg)` }}
    >
      {emoji}
    </span>
  );
};

export default Reactions;
