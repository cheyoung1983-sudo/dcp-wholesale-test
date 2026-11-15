import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import fileConfig from '../firebase-applet-config.json';

/**
 * Firebase client config comes from env vars (placeholders live in
 * firebase-applet-config.json). Never commit real project identifiers.
 */
function readFirebaseConfig(): FirebaseOptions & { firestoreDatabaseId?: string } {
  const file = fileConfig as unknown as Record<string, unknown>
  const envOr = (envName: string, fileKey: string, placeholderPrefixes: string[] = ['YOUR_']) => {
    const fromEnv = (process.env[envName] || '').trim()
    if (fromEnv) return fromEnv
    const fromFile = String(file[fileKey] ?? '').trim()
    if (fromFile && !placeholderPrefixes.some((p) => fromFile.startsWith(p))) return fromFile
    return ''
  }
  return {
    apiKey: envOr('NEXT_PUBLIC_FIREBASE_API_KEY', 'apiKey'),
    authDomain: envOr('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'authDomain'),
    projectId: envOr('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'projectId'),
    storageBucket: envOr('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'storageBucket'),
    messagingSenderId: envOr('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'),
    appId: envOr('NEXT_PUBLIC_FIREBASE_APP_ID', 'appId'),
    measurementId: envOr('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', 'measurementId') || undefined,
    firestoreDatabaseId: envOr('NEXT_PUBLIC_FIRESTORE_DATABASE_ID', 'firestoreDatabaseId'),
  }
}

export const firebaseConfig = readFirebaseConfig()

type FirebaseConfig = ReturnType<typeof readFirebaseConfig>

function isFirebaseConfigured(cfg: FirebaseConfig): boolean {
  const key = (cfg.apiKey || '').trim()
  return Boolean(key) && !key.startsWith('YOUR_')
}

let app: ReturnType<typeof initializeApp> | undefined
let _db: ReturnType<typeof getFirestore> | undefined
let _auth: ReturnType<typeof getAuth> | undefined
let _googleProvider: GoogleAuthProvider | undefined

function ensureFirebase() {
  if (app && _db && _auth && _googleProvider) return
  const cfg = readFirebaseConfig()
  if (!isFirebaseConfigured(cfg)) {
    throw new Error('Firebase is not configured. Set NEXT_PUBLIC_FIREBASE_API_KEY (and the other NEXT_PUBLIC_FIREBASE_* / NEXT_PUBLIC_FIRESTORE_DATABASE_ID values) for a test project.')
  }
  app = initializeApp(cfg)
  _db = cfg.firestoreDatabaseId ? getFirestore(app, cfg.firestoreDatabaseId) : getFirestore(app)
  _auth = getAuth(app)
  _googleProvider = new GoogleAuthProvider()
}

/** Lazy Firestore handle so `next build` can collect pages without live Firebase credentials. */
export const db = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_target, prop) {
    ensureFirebase()
    const value = (_db as any)[prop]
    return typeof value === 'function' ? value.bind(_db) : value
  },
})

/** Lazy Auth handle so `next build` can collect pages without live Firebase credentials. */
export const auth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_target, prop) {
    ensureFirebase()
    const value = (_auth as any)[prop]
    return typeof value === 'function' ? value.bind(_auth) : value
  },
})

/** Lazy Google provider; created on first use. */
export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_target, prop) {
    ensureFirebase()
    const value = (_googleProvider as any)[prop]
    return typeof value === 'function' ? value.bind(_googleProvider) : value
  },
})

/**
 * Validates the Firestore connection and handles "offline" errors.
 */
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'))
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("[Firebase] Client is offline. Please check your connection.")
    }
  }
}

/**
 * Standardized Google Sign-In helper.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider)
    return result.user
  } catch (error) {
    console.error("[Firebase Auth] Google sign-in failed:", error)
    throw error
  }
}
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string
  operationType: OperationType
  path: string | null
  authInfo: {
    userId?: string | null
    email?: string | null
    emailVerified?: boolean | null
    isAnonymous?: boolean | null
    tenantId?: string | null
    providerInfo?: {
      providerId?: string | null
      email?: string | null
    }[]
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo))
  throw new Error(JSON.stringify(errInfo))
}
