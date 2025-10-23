import React, { useState } from 'react';
import { Button, Spinner } from './ui';
import Flashcard from './Flashcard';
import { generateFlashcards as generateFlashcardsApi } from '../services/geminiService';

interface FlashcardGeneratorProps {
  notes: string;
}

interface FlashcardData {
  front: string;
  back: string;
}

const FlashcardGenerator: React.FC<FlashcardGeneratorProps> = ({ notes }) => {
  const [flashcards, setFlashcards] = useState<FlashcardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateFlashcards = async () => {
    if (!notes.trim()) {
      setError('Please write some notes first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const generated = await generateFlashcardsApi(notes);
      setFlashcards(JSON.parse(generated));
    } catch (err) {
      setError('Failed to generate flashcards. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button onClick={handleGenerateFlashcards} disabled={isLoading}>
        {isLoading ? <><Spinner size="sm" className="mr-2" /> Generating...</> : 'Generate Flashcards from Notes'}
      </Button>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="space-y-2">
        {flashcards.map((card, index) => (
          <Flashcard key={index} front={card.front} back={card.back} />
        ))}
      </div>
    </div>
  );
};

export default FlashcardGenerator;
