
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isBarberOwner: boolean;
  forceUserRefresh: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBarberOwner: false,
  forceUserRefresh: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBarberOwner, setIsBarberOwner] = useState(false);

  const auth = getAuth(app);

  const forceUserRefresh = useCallback(async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
          await currentUser.reload();
          setUser({ ...currentUser });
      }
  }, [auth]);

  useEffect(() => {
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
  }, [auth]);

  const value = { user, loading, isBarberOwner, forceUserRefresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
