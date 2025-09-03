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
    chargeDescriptions: [
        'Ex-works Charges:', 'Land/Air / Sea Freight:', 'Fuel Security / War Surcharge:', 
        'Formalities:', 'Delivery Order Fee:', 'Transportation Charges:', 
        'Inspection / Computer Print Charges:', 'Handling Charges:', 'Labor / Forklift Charges:', 
        'Documentation Charges:', 'Clearance Charges:', 'Customs Duty:', 
        'Terminal Handling Charges:', 'Legalization Charges:', 'Demurrage Charges:', 
        'Loading / Offloading Charges:', 'Destination Clearance Charges:', 'Packing Charges:', 
        'Port Charges:', 'Other Charges:', 'PAI Approval:', 'Insurance Fee:', 'EPA Charges:'
    ]
};

// Initialize charge descriptions from localStorage
function initializeChargeDescriptions() {
    const storedDescriptions = localStorage.getItem('chargeDescriptions');
    if (storedDescriptions) {
        window.app.chargeDescriptions = JSON.parse(storedDescriptions);
    } else {
        localStorage.setItem('chargeDescriptions', JSON.stringify(window.app.chargeDescriptions));
    }
}

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

// Initialize router
router.init();