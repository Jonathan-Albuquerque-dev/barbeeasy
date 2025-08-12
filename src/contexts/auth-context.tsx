
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
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
          const barbershopDocRef = doc(db, 'barbershops', user.uid);
          const barbershopDoc = await getDoc(barbershopDocRef);
          
          if (barbershopDoc.exists()) {
            setUser(user);
            setIsBarberOwner(true);
          } else {
            // User exists in Auth, but not as a barbershop owner in Firestore.
            // This could be a client or an invalid admin account.
            // We sign them out to prevent access to protected admin routes.
            await signOut(auth);
            setUser(null);
            setIsBarberOwner(false);
          }
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
