import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { firebaseConfig } from './firebaseConfig';

// Inicializa la app de Firebase (idempotente: evita doble init con HMR).
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Convierte un User de Firebase Auth al payload que espera AuthContext
 * (mismo shape que GoogleUserPayload) para reutilizar la lógica de roles/onboarding.
 */
export function mapFirebaseUserToPayload(u: User) {
  return {
    email: u.email || '',
    name: u.displayName || u.email?.split('@')[0] || '',
    picture: u.photoURL || '',
    sub: u.uid,
    email_verified: u.emailVerified,
  };
}

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const signOutUser = () => signOut(auth);

export const sendResetEmail = (email: string) => sendPasswordResetEmail(auth, email);

export const onAuthChange = (cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);

/** Traduce los códigos de error de Firebase Auth a mensajes en español. */
export function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Correo electrónico no válido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use':
      return 'Ese correo ya está registrado. Inicia sesión.';
    case 'auth/weak-password':
      return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/operation-not-allowed':
      return 'Este método de acceso no está habilitado aún.';
    case 'auth/unauthorized-domain':
      return 'Este dominio no está autorizado para Google.';
    case 'auth/popup-closed-by-user':
      return 'Cerraste la ventana de Google. Intenta de nuevo.';
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana emergente de Google.';
    case 'auth/account-exists-with-different-credential':
      return 'Ya existe una cuenta con ese correo por otro método.';
    case 'auth/network-request-failed':
      return 'Sin conexión. Revisa tu internet.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento.';
    default:
      return 'No se pudo completar el acceso. Intenta de nuevo.';
  }
}
