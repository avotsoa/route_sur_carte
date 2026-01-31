const admin = require('firebase-admin');

let firebaseApp = null;
let isFirebaseAvailable = false;

const initializeFirebase = () => {
  try {
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_PRIVATE_KEY && 
        process.env.FIREBASE_CLIENT_EMAIL) {
      
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      isFirebaseAvailable = true;
      console.log('✅ Firebase initialized successfully');
    } else {
      console.log('⚠️ Firebase credentials not provided, using local database only');
    }
  } catch (error) {
    console.error('❌ Firebase initialization error:', error.message);
    isFirebaseAvailable = false;
  }
};

initializeFirebase();

const verifyFirebaseToken = async (idToken) => {
  if (!isFirebaseAvailable) {
    return null;
  }
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Firebase token verification error:', error.message);
    return null;
  }
};

const createFirebaseUser = async (email, password) => {
  if (!isFirebaseAvailable) {
    return null;
  }
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
    });
    return userRecord;
  } catch (error) {
    throw error;
  }
};

const updateFirebaseUser = async (uid, data) => {
  if (!isFirebaseAvailable) {
    return null;
  }
  try {
    const userRecord = await admin.auth().updateUser(uid, data);
    return userRecord;
  } catch (error) {
    throw error;
  }
};

const deleteFirebaseUser = async (uid) => {
  if (!isFirebaseAvailable) {
    return null;
  }
  try {
    await admin.auth().deleteUser(uid);
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  admin,
  firebaseApp,
  isFirebaseAvailable: () => isFirebaseAvailable,
  verifyFirebaseToken,
  createFirebaseUser,
  updateFirebaseUser,
  deleteFirebaseUser,
};
