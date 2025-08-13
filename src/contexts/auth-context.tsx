
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { BarbershopSettings } from '@/lib/data';

interface BarberProfile {
  name: string;
  avatarUrl: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isBarberOwner: boolean;
  setupComplete: boolean;
  barberProfile: BarberProfile | null;
  forceUserRefresh: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBarberOwner: false,
  setupComplete: false,
  barberProfile: null,
  forceUserRefresh: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBarberOwner, setIsBarberOwner] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [barberProfile, setBarberProfile] = useState<BarberProfile | null>(null);

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
            const settings = barbershopDoc.data() as BarbershopSettings;
            setBarberProfile({ name: settings.name, avatarUrl: settings.avatarUrl });
            setIsBarberOwner(true);
            setSetupComplete(true);
          } else {
            setIsBarberOwner(false);
            setSetupComplete(false);
            setBarberProfile(null);
          }
        } catch (error) {
            console.error("Error checking Firestore profile:", error);
            setIsBarberOwner(false);
            setSetupComplete(false);
            setBarberProfile(null);
        }
      } else {
        setUser(null);
        setIsBarberOwner(false);
        setSetupComplete(false);
        setBarberProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const value = { user, loading, isBarberOwner, setupComplete, forceUserRefresh, barberProfile };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
