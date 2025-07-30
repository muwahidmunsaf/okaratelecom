import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { AttendanceStatus } from '../types';
import { generateRegistrationOptions, verifyRegistration, generateAuthenticationOptions, verifyAuthentication } from '../services/webAuthnService';
import { Modal } from '../components/ui/Modal';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Simple WebAuthn fingerprint/biometric prompt (browser support required)
async function biometricAuth() {
  if (window.PublicKeyCredential) {
    try {
      // This is a placeholder for a real WebAuthn flow
      // In production, you should use a proper WebAuthn library and server-side challenge
      await navigator.credentials.get({ publicKey: { challenge: new Uint8Array(32), timeout: 60000, userVerification: 'required' } });
      return true;
    } catch (e) {
      return false;
    }
  }
  return false;
}

const today = new Date().toISOString().split('T')[0];
const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const AttendanceMark: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'authing' | 'registering'>('idle');
  const [message, setMessage] = useState('');
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAttendance = async () => {
      if (!user) return;
      const q = query(
        collection(db, 'attendance'),
        where('employeeId', '==', user.id),
        where('date', '==', today)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setAlreadyMarked(true);
        setMessage('You have already marked attendance for today.');
      }
    };
    checkAttendance();
  }, [user]);

  useEffect(() => {
    const checkCredential = async () => {
      if (!user) return;
      const credDoc = await getDoc(doc(db, 'credentials', user.id));
      setIsRegistered(credDoc.exists());
    };
    checkCredential();
  }, [user]);

  // WebAuthn Registration
  const handleRegister = async () => {
    setStatus('registering');
    setMessage('Starting biometric registration...');
    const auth = getAuth();
    console.log('Current Firebase user:', auth.currentUser);
    if (!auth.currentUser) {
      setMessage('You must be logged in to register your biometric. Please log in again.');
      setStatus('idle');
      return;
    }
    try {
      const regOptionsRes: any = await generateRegistrationOptions();
      const regOptions = regOptionsRes.data;
      // @ts-ignore
      const cred = await navigator.credentials.create({ publicKey: regOptions }) as PublicKeyCredential;
      const attestationResponse = {
        id: cred.id,
        rawId: arrayBufferToBase64(cred.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64(cred.response.clientDataJSON),
          attestationObject: arrayBufferToBase64((cred.response as AuthenticatorAttestationResponse).attestationObject),
        },
        type: cred.type,
        clientExtensionResults: cred.getClientExtensionResults(),
      };
      const verifyRes: any = await verifyRegistration({ attestationResponse });
      if (verifyRes.data.verified) {
        setIsRegistered(true);
        setShowRegisterModal(false);
        setMessage('Biometric registered successfully!');
      } else {
        setMessage('Biometric registration failed.');
      }
    } catch (e) {
      setMessage('Biometric registration error.');
    }
    setStatus('idle');
  };

  // WebAuthn Authentication
  const handleMarkAttendance = async () => {
    setStatus('authing');
    setMessage('Authenticating...');
    try {
      const authOptionsRes: any = await generateAuthenticationOptions();
      const authOptions = authOptionsRes.data;
      // @ts-ignore
      const assertion = await navigator.credentials.get({ publicKey: authOptions }) as PublicKeyCredential;
      const assertionResponse = {
        id: assertion.id,
        rawId: arrayBufferToBase64(assertion.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64(assertion.response.clientDataJSON),
          authenticatorData: arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).authenticatorData),
          signature: arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).signature),
          userHandle: (assertion.response as AuthenticatorAssertionResponse).userHandle ? arrayBufferToBase64((assertion.response as AuthenticatorAssertionResponse).userHandle!) : null,
        },
        type: assertion.type,
        clientExtensionResults: assertion.getClientExtensionResults(),
      };
      const verifyRes: any = await verifyAuthentication({ assertionResponse });
      if (!verifyRes.data.verified) {
        setStatus('error');
        setMessage('Biometric authentication failed.');
        return;
      }
      await addDoc(collection(db, 'attendance'), {
        employeeId: user?.id,
        date: today,
        clockIn: now,
        status: AttendanceStatus.PRESENT,
      });
      setStatus('success');
      setMessage('Attendance marked successfully!');
      setAlreadyMarked(true);
    } catch (e) {
      setStatus('error');
      setMessage('Biometric authentication error.');
    }
  };

  // Helper to convert ArrayBuffer to base64
  function arrayBufferToBase64(buffer: ArrayBuffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-brand-light">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Mark Attendance</h1>
        {isRegistered === false && (
          <>
            <button
              className="bg-brand-primary text-white px-6 py-3 rounded text-lg font-semibold mb-4"
              onClick={() => setShowRegisterModal(true)}
              disabled={status === 'registering'}
            >
              Register Biometric
            </button>
            <Modal isOpen={showRegisterModal} onClose={() => setShowRegisterModal(false)} title="Register Biometric">
              <div className="mb-4">Register your fingerprint or face for secure attendance marking.</div>
              <button
                className="bg-brand-primary text-white px-6 py-2 rounded text-lg font-semibold"
                onClick={handleRegister}
                disabled={status === 'registering'}
              >
                {status === 'registering' ? 'Registering...' : 'Register Now'}
              </button>
              {message && <div className="mt-4 text-red-600">{message}</div>}
            </Modal>
          </>
        )}
        {isRegistered && (
          <button
            className="bg-brand-primary text-white px-6 py-3 rounded text-lg font-semibold disabled:opacity-50"
            onClick={handleMarkAttendance}
            disabled={status === 'authing' || status === 'success' || alreadyMarked}
          >
            {alreadyMarked ? 'Attendance Marked' : status === 'authing' ? 'Authenticating...' : 'Mark Attendance'}
          </button>
        )}
        {message && isRegistered && <div className={`mt-4 ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>}
      </div>
    </div>
  );
};

export default AttendanceMark; 