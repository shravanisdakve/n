import React, { useState } from 'react';

interface FlashcardProps {
  front: string;
  back: string;
}

const Flashcard: React.FC<FlashcardProps> = ({ front, back }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className="w-full h-48 p-4 rounded-lg bg-slate-700 flex items-center justify-center text-center cursor-pointer transform transition-transform duration-500"
      onClick={() => setIsFlipped(!isFlipped)}
      style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
    >
      <div className="absolute w-full h-full flex items-center justify-center" style={{ backfaceVisibility: 'hidden' }}>
        <p>{front}</p>
      </div>
      <div className="absolute w-full h-full flex items-center justify-center" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <p>{back}</p>
      </div>
    </div>
  );
};

export default Flashcard;
