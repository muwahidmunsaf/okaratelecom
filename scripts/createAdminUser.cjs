// Usage: node scripts/createAdminUser.cjs
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
});

const auth = getAuth();
const db = getFirestore();

async function createAdminUser() {
  const email = 'admin@mail.com';
  const password = 'admin123';
  const name = 'Admin User';
  try {
    // Create user in Firebase Auth
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('User already exists:', userRecord.uid);
    } catch (e) {
      userRecord = await auth.createUser({ email, password, displayName: name });
      console.log('Created new user:', userRecord.uid);
    }
    // Add user to Firestore with role 'admin'
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role: 'admin',
      id: userRecord.uid,
    });
    console.log('Admin user added to Firestore.');
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
}

createAdminUser(); 