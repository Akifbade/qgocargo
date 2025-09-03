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
    currentUser: null,
    chargeDescriptions: []
};

// Initialize charge descriptions from localStorage or defaults
function initializeChargeDescriptions() {
    const storedDescriptions = localStorage.getItem('chargeDescriptions');
    if (storedDescriptions) {
        window.app.chargeDescriptions = JSON.parse(storedDescriptions);
    } else {
        window.app.chargeDescriptions = [
            'Ex-works Charges:', 'Land/Air / Sea Freight:', 'Fuel Security / War Surcharge:', 
            'Formalities:', 'Delivery Order Fee:', 'Transportation Charges:', 
            'Inspection / Computer Print Charges:', 'Handling Charges:', 'Labor / Forklift Charges:', 
            'Documentation Charges:', 'Clearance Charges:', 'Customs Duty:', 
            'Terminal Handling Charges:', 'Legalization Charges:', 'Demurrage Charges:', 
            'Loading / Offloading Charges:', 'Destination Clearance Charges:', 'Packing Charges:', 
            'Port Charges:', 'Other Charges:', 'PAI Approval:', 'Insurance Fee:', 'EPA Charges:'
        ];
        localStorage.setItem('chargeDescriptions', JSON.stringify(window.app.chargeDescriptions));
    }
}

// Initialize charge descriptions
initializeChargeDescriptions();

// Authentication state listener
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? 'User logged in' : 'No user');
    
    if (user) {
        try {
            const userData = await authService.getCurrentUserData(user.uid);
            if (userData && userData.status === 'active') {
                window.app.currentUser = { uid: user.uid, email: user.email, ...userData };
                router.navigate('dashboard');
            } else {
                console.log('User inactive or not found, redirecting to login');
                router.navigate('login');
            }
        } catch (error) {
            console.error('Error getting user data:', error);
            router.navigate('login');
        }
    } else {
        console.log('No user found, showing login');
        window.app.currentUser = null;
        router.navigate('login');
    }
});

// Immediate fallback for GitHub Pages deployment
let authInitialized = false;

// Set a flag when auth state changes
const originalOnAuthStateChanged = onAuthStateChanged;
onAuthStateChanged(auth, (user) => {
    authInitialized = true;
    // Call the original handler
    return originalOnAuthStateChanged(auth, async (user) => {
        console.log('Auth state changed:', user ? 'User logged in' : 'No user');
        
        if (user) {
            try {
                const userData = await authService.getCurrentUserData(user.uid);
                if (userData && userData.status === 'active') {
                    window.app.currentUser = { uid: user.uid, email: user.email, ...userData };
                    router.navigate('dashboard');
                } else {
                    console.log('User inactive or not found, redirecting to login');
                    router.navigate('login');
                }
            } catch (error) {
                console.error('Error getting user data:', error);
                router.navigate('login');
            }
        } else {
            console.log('No user found, showing login');
            window.app.currentUser = null;
            router.navigate('login');
        }
    })(user);
});

// Multiple fallback strategies for GitHub Pages
setTimeout(() => {
    if (!authInitialized) {
        console.log('Firebase auth not initialized after 1 second, forcing login');
        router.navigate('login');
    }
}, 1000);

setTimeout(() => {
    if (!window.app.currentUser && !document.querySelector('#email-address')) {
        console.log('Fallback: Forcing navigation to login after 2 seconds');
        router.navigate('login');
    }
}, 2000);

// Emergency fallback - always show login if still loading after 3 seconds
setTimeout(() => {
    const appContent = document.getElementById('app').innerHTML;
    if (appContent.includes('Loading Management System') || appContent.includes('Loading...')) {
        console.log('Emergency fallback: Still loading after 3 seconds, forcing login');
        router.navigate('login');
    }
}, 3000);

// Initialize router
router.init();