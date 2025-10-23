import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, query, where, doc } from 'firebase/firestore';

export interface Goal {
  id: string;
  userId: string;
  title: string;
  status: 'In Progress' | 'Completed';
}

// Since we are not using Firebase, we'll use a mock service.
const goals: Goal[] = [];

export const getGoals = async (userId: string): Promise<Goal[]> => {
    return Promise.resolve(goals.filter(goal => goal.userId === userId));
};

export const addGoal = async (goal: Omit<Goal, 'id'>): Promise<Goal | null> => {
    const newGoal = { id: `mock_goal_${Date.now()}`, ...goal };
    goals.push(newGoal);
    return Promise.resolve(newGoal);
};

export const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const index = goals.findIndex(g => g.id === id);
    if (index !== -1) {
        goals[index] = { ...goals[index], ...updates };
    }
};

export const deleteGoal = async (id: string) => {
    const index = goals.findIndex(g => g.id === id);
    if (index !== -1) {
        goals.splice(index, 1);
    }
};