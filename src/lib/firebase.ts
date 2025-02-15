
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBw0PucNe-p9nsot2ZTGg4cyrD0TgDC_Ik",
  authDomain: "focus-note-40b4e.firebaseapp.com",
  projectId: "focus-note-40b4e",
  storageBucket: "focus-note-40b4e.appspot.com",
  messagingSenderId: "992811559836",
  appId: "1:992811559836:web:9b143358e56b796c04b659",
  measurementId: "G-HH2MFW6V04"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Add these scopes for Google Drive access
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive.appdata');
provider.setCustomParameters({
  prompt: 'consent',
  access_type: 'offline'
});
