'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isBarberOwner: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBarberOwner: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBarberOwner, setIsBarberOwner] = useState(false);


  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          setUser(user);
          const barbershopDocRef = doc(db, 'barbershops', user.uid);
          const barbershopDoc = await getDoc(barbershopDocRef);
          setIsBarberOwner(barbershopDoc.exists());
        } else {
          setUser(null);
          setIsBarberOwner(false);
        }
      } catch (error) {
        console.error("Error during auth state change:", error);
        setUser(null);
        setIsBarberOwner(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading, isBarberOwner };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
