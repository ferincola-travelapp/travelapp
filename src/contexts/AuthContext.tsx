"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { UserRole, OfficialBusinessUnit } from "@/lib/permissions";

// ---------------------------------------------------------
// Types
// ---------------------------------------------------------
export type { UserRole };

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  allowedUnits?: OfficialBusinessUnit[];
  allowedSectors?: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  /** true only while Firebase is resolving the initial auth state */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

/**
 * Derives a UserRole from the Firebase User object.
 * Extend this logic once you add custom claims or Firestore role docs.
 * Currently we default every authenticated user to 'admin' for the MVP.
 */
function deriveRole(user: User): UserRole {
  // Lista de correos con permisos de Super Administrador Global
  const superAdminEmails = ["fernando@travelapp.ar", "ferincola@gmail.com"];
  
  if (user.email && superAdminEmails.includes(user.email.toLowerCase())) {
    return "super_admin";
  }
  
  // Por defecto, cualquier otro usuario ingresa como operator
  return "operator";
}

function toAuthUser(firebaseUser: User): AuthUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    role: deriveRole(firebaseUser),
  };
}

import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ---------------------------------------------------------
// Context
// ---------------------------------------------------------
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicialización instantánea desde caché local para evitar pantalla de login en móviles
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("travelapp_session_user");
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (e) {
        console.warn("Error reading cached user session:", e);
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configurar persistencia permanente en el navegador / PWA (tipo Uber / DiDi)
    if (typeof window !== "undefined") {
      setPersistence(auth, browserLocalPersistence).catch((err) => {
        console.warn("Could not set local persistence:", err);
      });
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let role = deriveRole(firebaseUser);
        let active = true;
        let displayName = firebaseUser.displayName || 'Usuario';
        let allowedUnits: OfficialBusinessUnit[] = [];
        let allowedSectors: string[] = [];
        
        try {
          const q = query(collection(db, 'staff_users'), where('email', '==', firebaseUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const data = snap.docs[0].data();
            // Mantener super_admin si está en la lista maestra, salvo que en Firestore sea explícitamente otro
            if (role !== 'super_admin' || data.role === 'super_admin') {
              role = data.role || role;
            }
            active = data.active !== undefined ? data.active : true;
            displayName = data.name || displayName;
            allowedUnits = Array.isArray(data.allowedUnits) ? data.allowedUnits : [];
            allowedSectors = Array.isArray(data.allowedSectors) ? data.allowedSectors : [];
          }
        } catch (err) {
          console.error("Error looking up user profile in Firestore:", err);
        }

        if (!active) {
          await signOut(auth);
          setUser(null);
          localStorage.removeItem("travelapp_session_user");
          document.cookie = "ta_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
          alert("Tu cuenta ha sido desactivada por el administrador.");
        } else {
          const authUserData: AuthUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName,
            role,
            allowedUnits,
            allowedSectors,
          };
          setUser(authUserData);
          // Persistir en localStorage y cookie de 1 año
          localStorage.setItem("travelapp_session_user", JSON.stringify(authUserData));
          document.cookie = "ta_session=1; path=/; max-age=31536000; SameSite=Lax";
        }
      } else {
        setUser(null);
        localStorage.removeItem("travelapp_session_user");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
    } catch (err: any) {
      // Auto-registro inicial del administrador master (fernando@travelapp.ar) si la cuenta no existe en Firebase Auth aún
      const isMasterAdmin = normalizedEmail === "fernando@travelapp.ar" || normalizedEmail === "ferincola@gmail.com";
      if (isMasterAdmin && (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential")) {
        try {
          const { createUserWithEmailAndPassword } = await import("firebase/auth");
          await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        } catch (createErr) {
          throw err;
        }
      } else {
        throw err;
      }
    }
    // Cookie de sesión de 1 año (31536000 segundos) para que el teléfono no vuelva a pedir login
    document.cookie = "ta_session=1; path=/; max-age=31536000; SameSite=Lax";
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    localStorage.removeItem("travelapp_session_user");
    // Clear session cookie so middleware redirects unauthenticated requests
    document.cookie = "ta_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------
// Hook
// ---------------------------------------------------------
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return context;
}
