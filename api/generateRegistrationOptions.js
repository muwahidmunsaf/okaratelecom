import { generateRegistrationOptions } from '@simplewebauthn/server';

// In-memory store for demo (replace with DB for production)
const challenges = {};

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { userID, userName } = req.body;
  if (!userID || !userName) {
    return res.status(400).json({ error: 'Missing userID or userName' });
  }
  const options = generateRegistrationOptions({
    rpName: 'Okaratelecom',
    rpID: req.headers.host.split(':')[0],
    userID,
    userName,
  });
  challenges[userID] = options.challenge;
  res.status(200).json(options);
} 