import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addGoal, getGoals, updateGoal, deleteGoal, Goal } from '../services/goalService';
import { Input, Button } from './ui';
import { PlusCircle, Trash2, CheckCircle } from 'lucide-react';

const GoalsWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  useEffect(() => {
    const fetchGoals = async () => {
      if (currentUser?.uid) {
        const fetchedGoals = await getGoals(currentUser.uid);
        setGoals(fetchedGoals);
      }
    };
    fetchGoals();
  }, [currentUser]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalTitle.trim() && currentUser?.uid) {
      const newGoal = await addGoal({
        userId: currentUser.uid,
        title: newGoalTitle.trim(),
        status: 'In Progress',
      });
      if (newGoal) {
        setGoals((prev) => [...prev, newGoal]);
        setNewGoalTitle('');
      }
    }
  };

  const handleToggleGoalStatus = async (goal: Goal) => {
    const newStatus = goal.status === 'In Progress' ? 'Completed' : 'In Progress';
    await updateGoal(goal.id, { status: newStatus });
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goal.id ? { ...g, status: newStatus } : g
      )
    );
  };

  const handleDeleteGoal = async (id: string) => {
    await deleteGoal(id);
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  };

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 ring-1 ring-slate-700">
      <h3 className="text-xl font-bold text-slate-100 flex items-center mb-4">
        <CheckCircle className="w-6 h-6 mr-3 text-emerald-400" /> Today's Focus
      </h3>
      <form onSubmit={handleAddGoal} className="flex gap-2 mb-4">
        <Input
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          placeholder="Add a new goal (e.g., Finish Chapter 3)"
          className="text-sm"
        />
        <Button type="submit" className="px-3 py-2 text-sm">
          <PlusCircle size={16} className="mr-2" /> Add
        </Button>
      </form>
      <div className="space-y-2">
        {goals.length === 0 ? (
          <p className="text-slate-400 text-center">No goals set for today. Add one to get started!</p>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="group flex items-center justify-between bg-slate-800 p-3 rounded-lg"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={goal.status === 'Completed'}
                  onChange={() => handleToggleGoalStatus(goal)}
                  className="form-checkbox h-4 w-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 mr-3 accent-violet-500"
                />
                <span
                  className={`font-medium ${goal.status === 'Completed' ? 'line-through text-slate-500' : 'text-slate-300'}`}
                >
                  {goal.title}
                </span>
              </div>
              <button
                onClick={() => handleDeleteGoal(goal.id)}
                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GoalsWidget;