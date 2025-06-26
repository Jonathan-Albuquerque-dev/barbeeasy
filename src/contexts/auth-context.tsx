'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { app, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, collection, getDocs, limit, query } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isBarberOwner: boolean;
  barbershopId: string | null; // The ID of the barbershop this user belongs to
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isBarberOwner: false,
  barbershopId: null,
});

// This is a simplification for a single-tenant app.
// In a multi-tenant app, the barbershop ID would come from the URL or session.
async function getTheBarbershopId() {
    const q = query(collection(db, "barbershops"), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    return null;
}


export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBarberOwner, setIsBarberOwner] = useState(false);
  const [barbershopId, setBarbershopId] = useState<string | null>(null);


  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Set user immediately for faster UI response
        setUser(user);
        // Check if user is a barbershop owner
        const barbershopDocRef = doc(db, 'barbershops', user.uid);
        const barbershopDoc = await getDoc(barbershopDocRef);
        if (barbershopDoc.exists()) {
            setIsBarberOwner(true);
            setBarbershopId(user.uid);
        } else {
            // If not an owner, they must be a client.
            // Find the barbershop they belong to.
            setIsBarberOwner(false);
            const id = await getTheBarbershopId();
            setBarbershopId(id);
        }
      } else {
        setUser(null);
        setIsBarberOwner(false);
        setBarbershopId(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, loading, isBarberOwner, barbershopId };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
