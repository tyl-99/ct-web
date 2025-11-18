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

  const credentials = loadCredentials()
  app = admin.initializeApp({
    credential: admin.credential.cert(credentials)
  })
  return app
}

function loadCredentials(): admin.ServiceAccount {
  const inline = process.env.FIREBASE_ADMIN_CREDENTIALS
  const filePath =
    process.env.FIREBASE_ADMIN_CREDENTIALS_PATH ||
    (inline && inline.trim().endsWith('.json') ? inline.trim() : undefined)

  if (inline && inline.trim().startsWith('{')) {
    return JSON.parse(inline)
  }

  if (filePath) {
    const resolved = path.resolve(filePath)
    if (!fs.existsSync(resolved)) {
      throw new Error(`Firebase credentials file not found at ${resolved}`)
    }
    const contents = fs.readFileSync(resolved, 'utf8')
    return JSON.parse(contents)
  }

  throw new Error(
    'Set FIREBASE_ADMIN_CREDENTIALS with JSON or FIREBASE_ADMIN_CREDENTIALS_PATH pointing to the service account file'
  )
}

export function getFirestore() {
  return initializeFirebaseAdmin().firestore()
}

