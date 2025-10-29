import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader, Input, Button } from '../components/ui';
import CourseSelector from '../components/CourseSelector';
import { type ChatMessage } from '../types';
import { streamChat, generateQuizQuestion } from '../services/geminiService';
import { trackToolUsage } from '../services/personalizationService';
import { startSession, endSession, recordQuizResult, getProductivityReport } from '../services/analyticsService';
import { Bot, User, Send, Mic, Volume2, VolumeX, Lightbulb } from 'lucide-react';

interface Quiz {
    topic: string;
    question: string;
    options: string[];
    correctOptionIndex: number;
    userAnswerIndex?: number;
}

const ChatItem: React.FC<{ message: ChatMessage; onSpeak: (text: string) => void }> = ({ message, onSpeak }) => {
    const isModel = message.role === 'model';
    const text = message.parts.map(part => part.text).join('');

    return (
        <div className={`flex items-start gap-4 my-4 ${isModel ? '' : 'justify-end'}`}>
            {isModel && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                </div>
            )}
            <div className={`flex flex-col gap-2 max-w-xl`}>
                 <div className={`p-4 rounded-2xl ${isModel ? 'bg-slate-800 rounded-tl-none' : 'bg-sky-600 text-white rounded-br-none'}`}>
                    <div className="prose prose-invert prose-sm" style={{ whiteSpace: 'pre-wrap' }}>{text}</div>
                </div>
                {isModel && text && (
                     <button onClick={() => onSpeak(text)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-violet-400 transition-colors self-start ml-2">
                        <Volume2 size={14} /> Listen
                    </button>
                )}
            </div>
             {!isModel && (
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-300" />
                </div>
            )}
        </div>
    );
};


const AiTutor: React.FC = () => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', parts: [{ text: "Hello! I'm your AI Tutor. Analyzing your recent performance..." }] }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
    const [isAutoSpeaking, setIsAutoSpeaking] = useState(() => {
        try {
            return localStorage.getItem('nexusAutoSpeak') === 'true';
        } catch {
            return false;
        }
    });
    
    const recognitionRef = useRef<any | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const proactiveMessageSent = useRef(false);

    useEffect(() => {
        trackToolUsage('tutor');
        let sessionId: string | null = null;
        const start = async () => {
            sessionId = await startSession('tutor', selectedCourse);
        }
        start();

        return () => {
            if (sessionId) {
                endSession(sessionId);
            }
        }
    }, [selectedCourse]);

    useEffect(() => {
        const checkForProactiveMessage = async () => {
            if (proactiveMessageSent.current) return;

            const report = await getProductivityReport();
            let initialPrompt = "Hello! I'm your AI Tutor. What subject are we diving into today?";

            if (report && report.weaknesses && report.weaknesses.length > 0) {
                const weakestTopic = report.weaknesses[0];
                initialPrompt = `Hello! I'm your AI Tutor. I noticed your quiz accuracy in '${weakestTopic.topic}' is around ${weakestTopic.accuracy}%. Would you like to review it? We could try the Feynman Technique, or I can quiz you to practice active recall.`;
            }
            
            setMessages([{ role: 'model', parts: [{ text: initialPrompt }] }]);
            proactiveMessageSent.current = true;
        };

        if (location.state?.technique && location.state?.topic) {
            const { technique, topic } = location.state;
            let initialPrompt = '';

            switch (technique) {
                case 'Active Recall':
                    initialPrompt = `Hello! I'm ready to help you with Active Recall. To test your knowledge on "${topic}", you can either ask me questions, or I can quiz you. How would you like to begin?`;
                    break;
                case 'Feynman Technique':
                    initialPrompt = `Let's use the Feynman Technique for "${topic}". Start by explaining it to me in the simplest way you can. I'll act like a beginner and ask questions to help you find any gaps in your understanding.`;
                    break;
                case 'Spaced Repetition':
                    initialPrompt = `Let's set up a Spaced Repetition plan for "${topic}". Tell me the key facts or concepts you want to remember, and I'll create a quiz schedule to help you review them at optimal intervals for long-term memory. What's the first key point?`;
                    break;
            }

            if (initialPrompt) {
                setMessages([{ role: 'model', parts: [{ text: initialPrompt }] }]);
                navigate(location.pathname, { replace: true, state: {} });
                proactiveMessageSent.current = true;
            }
        } else if (location.state?.noteContent) {
            const { noteContent } = location.state;
            const initialPrompt = `I see you want to study this note:\n\n---\n${noteContent}\n---\n\nWhat would you like to do? We can summarize it, I can quiz you on it, or you can ask me questions.`;
            setMessages([{ role: 'model', parts: [{ text: initialPrompt }] }]);
            navigate(location.pathname, { replace: true, state: {} });
            proactiveMessageSent.current = true;
        } else {
            checkForProactiveMessage();
        }
    }, [location.state, navigate]);


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, quiz]);

    useEffect(() => {
        try {
            localStorage.setItem('nexusAutoSpeak', String(isAutoSpeaking));
        } catch (error) {
            console.error("Failed to save auto-speak setting to localStorage", error);
        }
    }, [isAutoSpeaking]);
    
    const handleSpeak = (text: string) => {
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        speechSynthesis.speak(utterance);
    };

    const handleSend = useCallback(async (messageToSend?: string, isVoiceInput = false) => {
        const currentMessage = messageToSend || input;
        if (!currentMessage.trim() || isLoading) return;
        
        speechSynthesis.cancel();
        
        const newUserMessage: ChatMessage = { role: 'user', parts: [{ text: currentMessage }] };
        const newModelMessage: ChatMessage = { role: 'model', parts: [{ text: '' }] }; // Placeholder for model response
        setMessages(prev => [...prev, newUserMessage, newModelMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);
        setQuiz(null);

        try {
            const stream = await streamChat(currentMessage);
            
            let modelResponse = '';
            for await (const chunk of stream) {
                modelResponse += chunk.text;
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage && lastMessage.role === 'model') {
                        lastMessage.parts = [{ text: modelResponse }];
                    }
                    return newMessages;
                });
            }
            
            setIsLoading(false); // Hide loading indicator once streaming is complete
            
            if (modelResponse && (isAutoSpeaking || isVoiceInput)) {
                handleSpeak(modelResponse);
            }
        } catch (err) {
            console.error(err);
            const errorMsg = 'Sorry, something went wrong. Please try again.';
            setError(errorMsg);
            setMessages(prev => [...prev, { role: 'model', parts: [{ text: errorMsg }] }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, isAutoSpeaking]);

    const handleQuizMe = async () => {
        if (isLoading) return;
        setError(null);
        setIsLoading(true);
        setQuiz(null);
        
        const context = messages.map(m => `${m.role}: ${m.parts.map(p => p.text).join('')}`).join('\n');
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: "Of course! Here's a question for you..." }] }]);

        try {
            const quizJsonString = await generateQuizQuestion(context);
            const parsedQuiz = JSON.parse(quizJsonString);
            setQuiz(parsedQuiz);
        } catch (err) {
            console.error("Failed to generate quiz", err);
            setError("Sorry, I couldn't generate a quiz question right now. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAnswerQuiz = async (selectedIndex: number) => {
        if (!quiz) return;
        
        const isCorrect = selectedIndex === quiz.correctOptionIndex;
        await recordQuizResult(quiz.topic, isCorrect, selectedCourse);
        
        let feedbackMessage = '';
        if (isCorrect) {
            feedbackMessage = `Correct! Well done.`;
        } else {
            feedbackMessage = `Not quite. The correct answer was: "${quiz.options[quiz.correctOptionIndex]}"`;
        }
        
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: feedbackMessage }] }]);
        setQuiz(prev => prev ? { ...prev, userAnswerIndex: selectedIndex } : null);
        setTimeout(() => setQuiz(null), 3000); // Hide quiz after 3 seconds
    };

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn("Speech recognition not supported in this browser.");
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognitionRef.current = recognition;
    }, []);

    const handleListen = () => {
        const recognition = recognitionRef.current;
        if (!recognition) {
            setError("Speech recognition is not available in your browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
            return;
        }
        
        setError(null);

        let finalTranscript = '';
        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + ' ';
                } else {
                    interimTranscript += transcript;
                }
            }
            setInput(finalTranscript + interimTranscript);
        };
        
        recognition.onend = () => {
            setIsListening(false);
            if (finalTranscript.trim()) {
                handleSend(finalTranscript.trim(), true);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === 'no-speech') {
                // User was silent, this is not a fatal error. Just stop listening.
            } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                console.error("Speech recognition permission error", event.error);
                setError("Microphone access denied. Please enable it in your browser settings to use voice input.");
            } else {
                console.error("Speech recognition error", event.error);
                setError(`Speech recognition error: ${event.error}. Please try again.`);
            }
            setIsListening(false);
        };

        setInput('');
        recognition.start();
        setIsListening(true);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-center">
                <PageHeader title="AI Tutor" subtitle="Your personal AI guide for any subject." />
                <CourseSelector selectedCourse={selectedCourse} onCourseChange={setSelectedCourse} />
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-xl p-4 flex flex-col overflow-hidden ring-1 ring-slate-700">
                <div className="flex-1 overflow-y-auto pr-2">
                    {messages.map((msg, index) => <ChatItem key={index} message={msg} onSpeak={handleSpeak} />)}
                    {isLoading && !quiz && (
                        <div className="flex items-start gap-4 my-4">
                             <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center">
                                <Bot className="w-6 h-6 text-white" />
                            </div>
                             <div className="max-w-xl p-4 rounded-2xl bg-slate-800 rounded-tl-none">
                                <div className="loading-dot">
                                    <span className="inline-block w-2 h-2 bg-slate-400 rounded-full"></span>
                                    <span className="inline-block w-2 h-2 bg-slate-400 rounded-full ml-1"></span>
                                    <span className="inline-block w-2 h-2 bg-slate-400 rounded-full ml-1"></span>
                                </div>
                            </div>
                        </div>
                    )}
                     {quiz && (
                        <div className="my-4 p-4 bg-slate-900/50 rounded-xl ring-1 ring-violet-600/50 animate-in fade-in-50">
                            <p className="font-semibold text-slate-200 text-base mb-1">Topic: <span className="capitalize font-light">{quiz.topic}</span></p>
                            <p className="font-bold text-slate-100 text-lg">{quiz.question}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4">
                                {quiz.options.map((option, index) => {
                                    const isSelected = quiz.userAnswerIndex === index;
                                    const isCorrect = quiz.correctOptionIndex === index;
                                    let buttonClass = 'bg-slate-700 hover:bg-slate-600';
                                    if (quiz.userAnswerIndex !== undefined) {
                                       if (isCorrect) buttonClass = 'bg-green-500/80 ring-2 ring-green-400';
                                       else if (isSelected && !isCorrect) buttonClass = 'bg-red-500/80';
                                       else buttonClass = 'bg-slate-800/50 opacity-60';
                                    }
                                    return (
                                        <button 
                                            key={index} 
                                            onClick={() => handleAnswerQuiz(index)} 
                                            disabled={quiz.userAnswerIndex !== undefined}
                                            className={`p-3 text-left text-sm rounded-lg transition-all duration-200 ${buttonClass}`}
                                        >
                                            {option}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                {error && <p className="text-red-400 text-sm text-center my-2">{error}</p>}
                <div className="mt-4 flex items-center gap-2">
                    <Input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="Ask a question or start speaking..."
                        disabled={isLoading || !!quiz}
                        className="flex-1"
                    />
                     <Button 
                        onClick={handleQuizMe}
                        disabled={isLoading || !!quiz}
                        className="px-4 py-3 bg-slate-700 hover:bg-slate-600"
                        aria-label="Quiz me"
                     >
                        <Lightbulb className="w-5 h-5" />
                    </Button>
                     <Button 
                        onClick={handleListen} 
                        disabled={isLoading || !!quiz} 
                        className={`px-4 py-3 ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                        aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    >
                       <Mic className="w-5 h-5" />
                    </Button>
                     <Button
                        onClick={() => setIsAutoSpeaking(prev => !prev)}
                        className={`px-4 py-3 ${isAutoSpeaking ? 'bg-violet-600 hover:bg-violet-700' : 'bg-slate-700 hover:bg-slate-600'}`}
                        aria-label={isAutoSpeaking ? 'Disable automatic speaking' : 'Enable automatic speaking'}
                    >
                       {isAutoSpeaking ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </Button>
                    <Button onClick={() => handleSend()} isLoading={isLoading} disabled={!input.trim() || !!quiz} className="px-4 py-3">
                       {!isLoading && <Send className="w-5 h-5" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AiTutor;