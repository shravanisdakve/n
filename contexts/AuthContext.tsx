import React, { useContext, useState, useEffect, createContext, ReactNode } from 'react';

interface User {
  uid: string;
  displayName: string | null;
  email: string | null;
  university?: string;
}

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signup: (displayName: string, email: string, university: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for a user session
    const timer = setTimeout(() => {
      // To test the logged-in state, you can uncomment the following lines:
      // setCurrentUser({
      //   uid: 'mock-uid',
      //   displayName: 'Mock User',
      //   email: 'user@example.com',
      // });
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const signup = async (displayName: string, email: string, university: string, password: string) => {
    setLoading(true);
    // Mock signup
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser({
      uid: 'mock-uid',
      displayName,
      email,
      university,
    });
    setLoading(false);
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    // Mock login
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser({
      uid: 'mock-uid',
      displayName: email.split('@')[0] || 'Mock User',
      email,
    });
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    setLoading(false);
  };

  const updateUserProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser({ ...currentUser, ...updates });
    setLoading(false);
  };

  const value = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    updateUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};