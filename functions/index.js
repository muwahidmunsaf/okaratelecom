const functions = require("firebase-functions");
const admin = require("firebase-admin");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");

admin.initializeApp();
const db = admin.firestore();

exports.generateRegistrationOptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const user = context.auth;
  const options = generateRegistrationOptions({
    rpName: "Okaratelecom",
    rpID: "localhost", // Use your domain in production
    userID: user.uid,
    userName: user.token.email,
  });
  await db.collection("users").doc(user.uid).set({ currentChallenge: options.challenge }, { merge: true });
  return options;
});

exports.verifyRegistration = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const user = context.auth;
  const { attestationResponse } = data;
  const userDoc = await db.collection("users").doc(user.uid).get();
  const expectedChallenge = userDoc.data().currentChallenge;
  const verification = await verifyRegistrationResponse({
    response: attestationResponse,
    expectedChallenge,
    expectedOrigin: "http://localhost:5173", // Use your domain in production
    expectedRPID: "localhost", // Use your domain in production
  });
  if (verification.verified) {
    await db.collection("credentials").doc(user.uid).set({
      credential: verification.registrationInfo,
    });
  }
  return { verified: verification.verified };
});

exports.generateAuthenticationOptions = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const user = context.auth;
  const credDoc = await db.collection("credentials").doc(user.uid).get();
  if (!credDoc.exists) throw new functions.https.HttpsError("not-found", "No credential registered");
  const options = generateAuthenticationOptions({
    allowCredentials: [
      {
        id: credDoc.data().credential.credentialID,
        type: "public-key",
      },
    ],
    userVerification: "required",
    rpID: "localhost", // Use your domain in production
  });
  await db.collection("users").doc(user.uid).set({ currentChallenge: options.challenge }, { merge: true });
  return options;
});

exports.verifyAuthentication = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  const user = context.auth;
  const { assertionResponse } = data;
  const userDoc = await db.collection("users").doc(user.uid).get();
  const credDoc = await db.collection("credentials").doc(user.uid).get();
  const expectedChallenge = userDoc.data().currentChallenge;
  const verification = await verifyAuthenticationResponse({
    response: assertionResponse,
    expectedChallenge,
    expectedOrigin: "http://localhost:5173", // Use your domain in production
    expectedRPID: "localhost", // Use your domain in production
    authenticator: credDoc.data().credential,
  });
  return { verified: verification.verified };
});

exports.helloWorld = functions.https.onCall((data, context) => {
  return { message: 'Hello from Firebase!' };
});
