import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail 
} from 'firebase/auth';
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs, 
    serverTimestamp 
} from 'firebase/firestore';

export class AuthService {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
    }

    async login(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async register(email, password, displayName) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            
            // Check if this is the first user (admin)
            const usersCollectionRef = collection(this.db, 'users');
            const userQuerySnapshot = await getDocs(usersCollectionRef);
            const isFirstUser = userQuerySnapshot.size === 0;

            const newUser = {
                email: email,
                displayName: displayName,
                role: isFirstUser ? 'admin' : 'user',
                status: isFirstUser ? 'active' : 'inactive',
                createdAt: serverTimestamp()
            };

            await setDoc(doc(this.db, 'users', userCredential.user.uid), newUser);
            
            if (!isFirstUser) {
                await signOut(this.auth);
                return { success: true, needsApproval: true };
            }
            
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await signOut(this.auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(this.auth, email);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getCurrentUserData(uid) {
        try {
            const userDocRef = doc(this.db, 'users', uid);
            const userDoc = await getDoc(userDocRef);
            return userDoc.exists() ? userDoc.data() : null;
        } catch (error) {
            console.error('Error getting user data:', error);
            return null;
        }
    }

    requireAuth() {
        if (!window.app.currentUser) {
            window.app.router.navigate('login');
            return false;
        }
        return true;
    }

    requireRole(role) {
        if (!this.requireAuth()) return false;
        if (window.app.currentUser.role !== role && role !== 'user') {
            alert('Access denied. Insufficient permissions.');
            return false;
        }
        return true;
    }

    requireAdmin() {
        return this.requireRole('admin');
    }

    requireChecker() {
        if (!this.requireAuth()) return false;
        if (!['admin', 'checker'].includes(window.app.currentUser.role)) {
            alert('Access denied. Checker or admin role required.');
            return false;
        }
        return true;
    }
}