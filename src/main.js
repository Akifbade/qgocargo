import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { AuthService } from './services/AuthService.js';
import { Router } from './utils/Router.js';
import { firebaseConfig } from './config/firebase.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize services
const authService = new AuthService(auth, db);
const router = new Router();

// Global app state
window.app = {
    auth,
    db,
    authService,
    router,
    currentUser: null
};

// Authentication state listener
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userData = await authService.getCurrentUserData(user.uid);
            if (userData && userData.status === 'active') {
                window.app.currentUser = { uid: user.uid, email: user.email, ...userData };
                router.navigate('dashboard');
            } else {
                router.navigate('login');
            }
        } catch (error) {
            console.error('Error getting user data:', error);
            router.navigate('login');
        }
    } else {
        window.app.currentUser = null;
        router.navigate('login');
    }
});

// Initialize router
router.init();