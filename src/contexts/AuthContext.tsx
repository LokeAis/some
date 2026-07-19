import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, deleteUser, reauthenticateWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import { deleteAllUserData } from '../lib/db';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  /** GDPR art. 17: slettar alt brukardata i Firestore og deretter sjølve kontoen. Kastar ved feil. */
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      let role = 'user';
      if (currentUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          try {
            const userData: Record<string, any> = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              role: 'user', // Default role
              createdAt: serverTimestamp()
            };
            if (currentUser.displayName) {
              userData.displayName = currentUser.displayName;
            }
            await setDoc(userRef, userData);
          } catch (error) {
            console.error("Error creating user document:", error);
          }
        } else {
          role = userSnap.data().role || 'user';
        }
      }
      setUser(currentUser);
      setIsAdmin(role === 'admin');
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const clearLocalAppData = (includeApiKey = false) => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('some_') || key.startsWith('draft_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (includeApiKey) localStorage.removeItem('gemini_api_key');
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      clearLocalAppData();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const deleteAccount = async () => {
    const current = auth.currentUser;
    if (!current) throw new Error('Du er ikkje innlogga.');

    // Slett data FØRST – feilar dette, skal kontoen bli ståande så brukaren kan prøve igjen.
    await deleteAllUserData(current.uid);

    try {
      await deleteUser(current);
    } catch (error: any) {
      // Firebase krev fersk innlogging for kontosletting – reautentiser og prøv igjen.
      if (error?.code === 'auth/requires-recent-login') {
        await reauthenticateWithPopup(current, googleProvider);
        await deleteUser(current);
      } else {
        throw error;
      }
    }
    clearLocalAppData(true);
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signIn, logOut, deleteAccount }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
