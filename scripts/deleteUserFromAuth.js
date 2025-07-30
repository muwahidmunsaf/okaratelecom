// Usage: node scripts/deleteUserFromAuth.js <email>
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp({
  credential: applicationDefault(),
});

const auth = getAuth();

async function deleteUserFromAuth(email) {
  try {
    const userRecord = await auth.getUserByEmail(email);
    await auth.deleteUser(userRecord.uid);
    console.log(`User ${email} deleted from Firebase Auth successfully.`);
  } catch (error) {
    console.error('Error deleting user from Firebase Auth:', error);
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Usage: node scripts/deleteUserFromAuth.js <email>');
  process.exit(1);
}

deleteUserFromAuth(email); 