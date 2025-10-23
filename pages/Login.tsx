import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../components/ui';

const taglines = [
    "Unlock your smarter study session.",
    "Let's pick up where you left off.",
    "Your AI-powered study partner awaits.",
    "Log in to continue your progress."
];

const Login: React.FC = () => {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const tagline = useMemo(() => taglines[Math.floor(Math.random() * taglines.length)], []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
        setError('Please fill in all fields.');
        return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-slate-800/50 rounded-xl ring-1 ring-slate-700">
      <div className="text-center">
        <div className="inline-flex items-center justify-center mb-6">
          <div className="p-2 bg-violet-600 rounded-lg">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold ml-3 bg-gradient-to-r from-violet-400 to-cyan-400 text-transparent bg-clip-text">
            NexusAI
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-white">Welcome Back!</h2>
        <p className="mt-2 text-slate-400">{tagline}</p>
      </div>
      
      {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md">{error}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
            />
        </div>
        <div>
            <label htmlFor="password-login" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
                <Input
                    id="password-login"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
        </div>
        
        <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-violet-400 hover:text-violet-300">
                Forgot Password?
            </Link>
        </div>

        <Button type="submit" isLoading={loading} className="w-full">
         Log In
        </Button>
      </form>

      <p className="text-sm text-center text-slate-400">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-violet-400 hover:text-violet-300">
          Sign up
        </Link>
      </p>
    </div>
  );
};

export default Login;