"use client";
import { createContext, useContext, useState, useEffect } from 'react';

interface User {
  _id: string;
  fullName: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;  // Added isLoading
  token: string | null;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  isLoading: true,  // Added isLoading with default value
  token: null,
  checkAuth: async () => false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);  // Added isLoading state

  const checkAuth = async () => {
    setIsLoading(true);  // Set loading when starting auth check
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!storedToken || !storedUser) {
      logout();
      setIsLoading(false);
      return false;
    }

    try {
      // Verify token with backend
      const response = await fetch('https://learnfast-bwdo.onrender.com/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${storedToken}`
        }
      });

      if (!response.ok) {
        logout();
        setIsLoading(false);
        return false;
      }

      const data = await response.json();
      setUser(data.user);
      setToken(storedToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Auth check error:', error);
      logout();
      setIsLoading(false);
      return false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setToken(storedToken);
          setIsAuthenticated(true);
          await checkAuth(); // Verify with backend
        } catch (error) {
          console.error('Init auth error:', error);
          logout();
        }
      } else {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (userData: User, newToken: string) => {
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
    setIsLoading(false);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLoading(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated, 
      isLoading,  // Added isLoading to provider value
      token,
      checkAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};