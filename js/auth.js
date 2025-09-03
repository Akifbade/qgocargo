// Authentication Module
import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { showMessage, hideLoading, showLoading } from './ui-controller.js';

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeAuthListener();
    }

    initializeAuthListener() {
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            this.handleAuthStateChange(user);
        });
    }

    handleAuthStateChange(user) {
        const authSection = document.getElementById('auth-section');
        const mainApp = document.getElementById('main-app');
        const userInfo = document.getElementById('user-info');
        
        hideLoading();
        
        if (user) {
            authSection.style.display = 'none';
            mainApp.style.display = 'block';
            userInfo.textContent = `Welcome, ${user.displayName || user.email}`;
            
            // Trigger data loading
            window.dataManager?.loadUserData();
        } else {
            authSection.style.display = 'block';
            mainApp.style.display = 'none';
        }
    }

    async signUp(email, password, fullName) {
        try {
            showLoading();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Update user profile with display name
            await updateProfile(userCredential.user, {
                displayName: fullName
            });
            
            showMessage('Account created successfully!', 'success');
            return userCredential.user;
        } catch (error) {
            console.error('Signup error:', error);
            showMessage(this.getErrorMessage(error.code), 'error');
            throw error;
        } finally {
            hideLoading();
        }
    }

    async signIn(email, password) {
        try {
            showLoading();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            showMessage('Logged in successfully!', 'success');
            return userCredential.user;
        } catch (error) {
            console.error('Login error:', error);
            showMessage(this.getErrorMessage(error.code), 'error');
            throw error;
        } finally {
            hideLoading();
        }
    }

    async signOut() {
        try {
            showLoading();
            await signOut(auth);
            showMessage('Logged out successfully!', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            showMessage('Error logging out. Please try again.', 'error');
        } finally {
            hideLoading();
        }
    }

    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Incorrect password.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
            'auth/network-request-failed': 'Network error. Please check your connection.'
        };
        
        return errorMessages[errorCode] || 'An unexpected error occurred. Please try again.';
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }
}

// Create and export auth manager instance
export const authManager = new AuthManager();