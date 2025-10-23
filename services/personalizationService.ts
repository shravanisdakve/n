import { type Mood } from '../types';
import { db, auth } from '../firebase';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion,
    increment
} from 'firebase/firestore';

export type ToolKey = 'tutor' | 'visualizer' | 'summarizer' | 'code-helper' | 'study-room';

const getUserId = () => auth.currentUser?.uid;

const getUserPreferencesDoc = () => {
    const userId = getUserId();
    if (!userId || !db) throw new Error("User not authenticated or db not initialized");
    return doc(db, `users/${userId}`);
}

export const trackToolUsage = async (tool: ToolKey) => {
    const userId = getUserId();
    if (!userId || !db) return;

    try {
        const userDocRef = getUserPreferencesDoc();
        await updateDoc(userDocRef, {
            [`toolUsage.${tool}`]: increment(1)
        });
    } catch (error) {
        // If the document or field doesn't exist, create it.
        if ((error as any).code === 'not-found') {
            try {
                await setDoc(getUserPreferencesDoc(), { toolUsage: { [tool]: 1 } }, { merge: true });
            } catch (e) {
                console.error("Error setting tool usage: ", e);
            }
        } else {
            console.error("Error tracking tool usage: ", error);
        }
    }
};

export const getMostUsedTool = async (): Promise<string | null> => {
    const userId = getUserId();
    if (!userId || !db) return null;

    try {
        const userDoc = await getDoc(getUserPreferencesDoc());
        if (userDoc.exists()) {
            const data = userDoc.data();
            const toolUsage = data.toolUsage || {};
            const totalUsage = Object.values(toolUsage).reduce((sum: number, count: any) => sum + count, 0);

            if (totalUsage < 3) {
                return null;
            }

            const sortedTools = Object.entries(toolUsage).sort((a: [string, any], b: [string, any]) => b[1] - a[1]);

            if (sortedTools.length > 0 && sortedTools[0][1] > 0) {
                return sortedTools[0][0];
            }
        }
    } catch (error) {
        console.error("Error getting most used tool: ", error);
    }

    return null;
};

export const recordMood = async (mood: Omit<Mood, 'timestamp'>) => {
    const userId = getUserId();
    if (!userId || !db) return;

    try {
        const newMood = { ...mood, timestamp: new Date() };
        await updateDoc(getUserPreferencesDoc(), {
            moods: arrayUnion(newMood)
        });
    } catch (error) {
        if ((error as any).code === 'not-found') {
            try {
                await setDoc(getUserPreferencesDoc(), { moods: [newMood] }, { merge: true });
            } catch (e) {
                console.error("Error setting mood: ", e);
            }
        } else {
            console.error("Error recording mood: ", error);
        }
    }
};

// These functions are simple and don't require backend interaction, so they remain the same.
export const getTimeOfDayGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
        return "Good morning";
    }
    if (hour >= 12 && hour < 18) {
        return "Good afternoon";
    }
    return "Good evening";
};

const breakActivities = [
    "Time for a quick stretch! Reach for the sky.",
    "Hydration check! Grab a glass of water.",
    "Look at something 20 feet away for 20 seconds to rest your eyes.",
    "Stand up and walk around for a minute.",
    "Tidy up one small thing on your desk.",
    "Take a few deep breaths. Inhale, exhale.",
];

export const getBreakActivitySuggestion = (): string => {
    const randomIndex = Math.floor(Math.random() * breakActivities.length);
    return breakActivities[randomIndex];
};