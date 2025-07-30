import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebaseConfig';

// Set region to match your deployed functions
const functions = getFunctions(app, 'us-central1');

export const generateRegistrationOptions = httpsCallable(functions, 'generateRegistrationOptions');
export const verifyRegistration = httpsCallable(functions, 'verifyRegistration');
export const generateAuthenticationOptions = httpsCallable(functions, 'generateAuthenticationOptions');
export const verifyAuthentication = httpsCallable(functions, 'verifyAuthentication'); 