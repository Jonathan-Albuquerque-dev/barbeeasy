
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isBarberOwner: boolean;
  setupComplete: boolean; // New state to track if Firestore profile exists
  forceUserRefresh: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBarberOwner: false,
  setupComplete: false,
  forceUserRefresh: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBarberOwner, setIsBarberOwner] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

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
      setLoading(true);
      if (user) {
        setUser(user);
        try {
          const barbershopDocRef = doc(db, 'barbershops', user.uid);
          const barbershopDoc = await getDoc(barbershopDocRef);
          
          if (barbershopDoc.exists()) {
            setIsBarberOwner(true);
            setSetupComplete(true);
          } else {
            // User exists in Auth, but not in Firestore. They need to complete the setup.
            setIsBarberOwner(false);
            setSetupComplete(false);
          }
        } catch (error) {
            console.error("Error checking Firestore profile:", error);
            setIsBarberOwner(false);
            setSetupComplete(false);
        }
      } else {
        setUser(null);
        setIsBarberOwner(false);
        setSetupComplete(false); // Or true, depending on desired behavior for logged-out users
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const value = { user, loading, isBarberOwner, setupComplete, forceUserRefresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
