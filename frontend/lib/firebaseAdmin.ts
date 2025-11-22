import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

let app: admin.app.App | undefined

function initializeFirebaseAdmin() {
  if (app) return app

  if (admin.apps.length) {
    app = admin.app()
    return app
  }

  try {
    const credentials = loadCredentials()
    console.log('[Firebase Admin] Initializing Firebase Admin SDK...')
    
    // Initialize with explicit project ID
    const initOptions: admin.AppOptions = {
      credential: admin.credential.cert(credentials as admin.ServiceAccount)
    }
    
    // Add projectId explicitly if not already set
    // Handle both snake_case (from JSON) and camelCase (from type)
    const projectId = (credentials as any).projectId || (credentials as any).project_id
    if (!initOptions.projectId && projectId) {
      initOptions.projectId = projectId
    }
    
    app = admin.initializeApp(initOptions)
    console.log('[Firebase Admin] Firebase Admin SDK initialized successfully')
    console.log('[Firebase Admin] Project ID:', app.options.projectId || projectId)
    return app
  } catch (error: any) {
    console.error('[Firebase Admin] Failed to initialize:', error.message)
    console.error('[Firebase Admin] Error stack:', error.stack)
    
    // Provide more specific error messages
    if (error.message && error.message.includes('invalid_grant')) {
      console.error('[Firebase Admin] Authentication error: The service account key may be invalid or expired.')
      console.error('[Firebase Admin] Please generate a new private key from Firebase Console.')
    }
    
    throw error
  }
}

function loadCredentials(): admin.ServiceAccount {
  const inline = process.env.FIREBASE_ADMIN_CREDENTIALS
  const filePath =
    process.env.FIREBASE_ADMIN_CREDENTIALS_PATH ||
    (inline && inline.trim().endsWith('.json') ? inline.trim() : undefined)
  
  // Debug logging
  console.log('[Firebase Admin] Loading credentials...')
  console.log('[Firebase Admin] FIREBASE_ADMIN_CREDENTIALS:', inline ? 'SET (hidden)' : 'NOT SET')
  console.log('[Firebase Admin] FIREBASE_ADMIN_CREDENTIALS_PATH:', filePath || 'NOT SET')
  console.log('[Firebase Admin] Process CWD:', process.cwd())

  if (inline && inline.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(inline)
      // Validate that it has required fields
      if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
        throw new Error('Invalid Firebase credentials: missing required fields (project_id, private_key, or client_email)')
      }
      return parsed
    } catch (e: any) {
      throw new Error(`Failed to parse FIREBASE_ADMIN_CREDENTIALS: ${e.message}`)
    }
  }

  if (filePath) {
    // Resolve path - handle both absolute and relative paths
    let resolved: string
    if (path.isAbsolute(filePath)) {
      resolved = filePath
    } else {
      // For relative paths, resolve from process.cwd() (which should be frontend directory in Next.js)
      resolved = path.resolve(process.cwd(), filePath)
      
      // If not found and path starts with ../, also try resolving from project root
      if (!fs.existsSync(resolved) && filePath.startsWith('../')) {
        // Try resolving from one level up (project root)
        const projectRootResolved = path.resolve(process.cwd(), '..', filePath.replace(/^\.\.\//, ''))
        if (fs.existsSync(projectRootResolved)) {
          resolved = projectRootResolved
        }
      }
      
      // Fallback: try relative to frontend directory if we're in project root
      if (!fs.existsSync(resolved)) {
        const frontendResolved = path.resolve(process.cwd(), 'frontend', filePath)
        if (fs.existsSync(frontendResolved)) {
          resolved = frontendResolved
        }
      }
    }
    
    if (!fs.existsSync(resolved)) {
      throw new Error(
        `Firebase credentials file not found at: ${resolved}\n` +
        `  Original path: ${filePath}\n` +
        `  Process CWD: ${process.cwd()}\n` +
        `  Please check FIREBASE_ADMIN_CREDENTIALS_PATH environment variable.`
      )
    }
    
    console.log('[Firebase Admin] Found credentials file at:', resolved)
    
    try {
      const contents = fs.readFileSync(resolved, 'utf8')
      const parsed = JSON.parse(contents)
      // Validate that it has required fields
      if (!parsed.project_id || !parsed.private_key || !parsed.client_email) {
        throw new Error('Invalid Firebase credentials file: missing required fields (project_id, private_key, or client_email)')
      }
      
      // Ensure private_key has proper newlines (replace literal \n with actual newlines if needed)
      // JSON.parse should handle this, but let's be explicit
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        // Check if private key has BEGIN/END markers (should always have them)
        if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
          console.warn('[Firebase Admin] Warning: Private key format may be incorrect')
        }
        // Ensure newlines are actual newlines (JSON.parse should handle \n escapes, but verify)
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n')
      }
      
      console.log('[Firebase Admin] Credentials loaded successfully for project:', parsed.project_id)
      console.log('[Firebase Admin] Service account email:', parsed.client_email)
      return parsed
    } catch (e: any) {
      throw new Error(`Failed to load Firebase credentials from ${resolved}: ${e.message}`)
    }
  }

  throw new Error(
    'Firebase Admin credentials are missing!\n\n' +
    'Please set one of the following environment variables:\n' +
    '  - FIREBASE_ADMIN_CREDENTIALS (JSON string)\n' +
    '  - FIREBASE_ADMIN_CREDENTIALS_PATH (path to service account JSON file)\n\n' +
    'To get your credentials:\n' +
    '  1. Go to Firebase Console → Project Settings → Service Accounts\n' +
    '  2. Click "Generate New Private Key"\n' +
    '  3. Download the JSON file\n' +
    '  4. Set FIREBASE_ADMIN_CREDENTIALS to the JSON content (or use FIREBASE_ADMIN_CREDENTIALS_PATH with the file path)'
  )
}

export function getFirestore() {
  const app = initializeFirebaseAdmin()
  const db = app.firestore()
  
  // Note: Firestore settings can only be called once, before any other operations
  // If you need to configure settings, do it during initialization, not here
  // db.settings() would cause errors on subsequent calls
  
  return db
}

