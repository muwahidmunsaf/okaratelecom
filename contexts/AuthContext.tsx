
import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { User, Role } from '../types';
import { auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to fetch user role from Firestore
  const fetchUserRole = async (uid: string): Promise<Role | undefined> => {
    console.log('fetchUserRole called with uid:', uid); // Debug log
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      console.log('userDoc exists:', userDoc.exists()); // Debug log
      
      if (!userDoc.exists()) {
        console.log('User document does not exist'); // Debug log
        return undefined;
      }
      
      const userData = userDoc.data();
      console.log('userData from Firestore:', userData); // Debug log
      const roleString = userData.role;
      
      console.log('Firestore role string:', roleString); // Debug log
      
      // Convert string to Role enum
      if (roleString === 'Admin') {
        console.log('Converting to Role.ADMIN'); // Debug log
        return Role.ADMIN;
      }
      if (roleString === 'Supervisor') {
        console.log('Converting to Role.SUPERVISOR'); // Debug log
        return Role.SUPERVISOR;
      }
      if (roleString === 'Employee') {
        console.log('Converting to Role.EMPLOYEE'); // Debug log
        return Role.EMPLOYEE;
      }
      
      console.log('No role match found for:', roleString); // Debug log
      return undefined;
    } catch (error) {
      console.error('Error fetching user role:', error); // Debug log
      return undefined;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('Auth state changed:', firebaseUser?.email); // Debug log
      
      if (firebaseUser) {
        const role = await fetchUserRole(firebaseUser.uid);
        const userObj = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email || '',
          email: firebaseUser.email || '',
          role,
        };
        console.log('Setting user with role:', userObj); // Debug log
        setUser(userObj);
      } else {
        console.log('No user found, setting user to null'); // Debug log
        setUser(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('Login called with email:', email); // Debug log
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase Auth successful, uid:', cred.user.uid); // Debug log
      
      const role = await fetchUserRole(cred.user.uid);
      console.log('Role fetched:', role); // Debug log
      
      const userObj = {
        id: cred.user.uid,
        name: cred.user.displayName || cred.user.email || '',
        email: cred.user.email || '',
        role,
      };
      console.log('Setting user with role:', userObj); // Debug log
      setUser(userObj);
      return true;
    } catch (error) {
      console.error('Login error:', error); // Debug log
      setUser(null);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
  }, []);

  // Don't render children until auth state is determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-light">
        <div className="text-center">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-brand-primary">Inteltech UAE</h1>
            <p className="text-sm text-gray-600">(Client Contracts)</p>
            <p className="text-lg text-brand-secondary mt-2">Pro Suite</p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
          </div>
          <p className="text-gray-600 mt-4">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};