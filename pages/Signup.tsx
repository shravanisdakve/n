import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BrainCircuit, Eye, EyeOff } from 'lucide-react';
import { Button, Input } from '../components/ui';

const Signup: React.FC = () => {
  const { signup } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
    }

    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$/;
    if (!passwordRegex.test(password)) {
        setError("Password must be at least 8 characters long and include at least one number and one special character.");
        return;
    }

    if (!agreedToTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy.');
        return;
    }

    if (!displayName || !email || !password || !university) {
        setError('Please fill in all fields.');
        return;
    }
    setError('');
    setLoading(true);
    try {
      await signup(displayName, email, university, password);
      navigate('/');
    } catch (err: any) {
      setError('Failed to create an account. Please try again.');
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
        <h2 className="text-2xl font-bold text-white">Create your Account</h2>
        <p className="mt-2 text-slate-400">Join NexusAI to supercharge your studies.</p>
      </div>
      
      {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-3 rounded-md">{error}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                required
                disabled={loading}
            />
        </div>
        <div>
            <label htmlFor="university" className="block text-sm font-medium text-slate-300 mb-2">University Name</label>
            <Input
                id="university"
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="State University"
                required
                disabled={loading}
            />
        </div>
        <div>
            <label htmlFor="email-signup" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <Input
                id="email-signup"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
            />
        </div>
        <div>
            <label htmlFor="password-signup" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <div className="relative">
                <Input
                    id="password-signup"
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
            <p className="text-xs text-slate-500 mt-2">Must be at least 8 characters and include a number and a special character.</p>
        </div>
        <div>
            <label htmlFor="confirm-password-signup" className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
            <div className="relative">
                <Input
                    id="confirm-password-signup"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                />
                <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            </div>
        </div>

        <div className="flex items-center">
            <input
                id="terms"
                name="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-slate-400">
                I agree to the{' '}
                <Link to="/terms" className="font-medium text-violet-400 hover:text-violet-300">
                    Terms of Service
                </Link>{' '}
                and{' '}
                <Link to="/privacy" className="font-medium text-violet-400 hover:text-violet-300">
                    Privacy Policy
                </Link>
                .
            </label>
        </div>

        <Button type="submit" isLoading={loading} disabled={loading || !agreedToTerms} className="w-full">
          Create Account
        </Button>
      </form>

      <p className="text-sm text-center text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-violet-400 hover:text-violet-300">
          Log in
        </Link>
      </p>
    </div>
  );
};

export default Signup;