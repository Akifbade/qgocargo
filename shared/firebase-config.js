// Shared Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

// Your Firebase configuration (replace with your actual config)
const firebaseConfig = {
    // Add your Firebase configuration here
    // apiKey: "your-api-key",
    // authDomain: "your-project.firebaseapp.com",
    // projectId: "your-project-id",
    // storageBucket: "your-project.appspot.com",
    // messagingSenderId: "123456789",
    // appId: "your-app-id"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Make Firebase services available globally
window.firebaseApp = app;
window.firebaseDb = db;
window.firebaseAuth = auth;
window.firebaseStorage = storage;

export { app, db, auth, storage };