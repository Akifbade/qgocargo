// Authentication Module
let currentUser = null;
let userRole = null;

// Initialize Firebase Auth
function initializeAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    userRole = userDoc.data().role || 'user';
                    console.log('User role:', userRole);
                    
                    // Show appropriate interface based on role
                    if (userRole === 'driver') {
                        showDriverDashboard();
                    } else {
                        showMainApp();
                    }
                } else {
                    userRole = 'user';
                    showMainApp();
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
                userRole = 'user';
                showMainApp();
            }
        } else {
            currentUser = null;
            userRole = null;
            showLogin();
        }
    });
}

// Show login screen
function showLogin() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'none';
}

// Show main application
function showMainApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    document.getElementById('driver-dashboard').style.display = 'none';
    
    // Update UI based on role
    updateUIForRole();
    
    // Wait a bit for Firebase auth to fully initialize before loading data
    setTimeout(() => {
        if (window.mainModule && window.mainModule.loadJobFiles) {
            window.mainModule.loadJobFiles();
        }
    }, 1000);
}

// Show driver dashboard
function showDriverDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'block';
    
    if (window.driverModule) {
        window.driverModule.loadDriverDashboard();
    }
}

// Update UI based on user role
function updateUIForRole() {
    const adminElements = document.querySelectorAll('.admin-only');
    const checkerElements = document.querySelectorAll('.checker-only');
    
    adminElements.forEach(el => {
        el.style.display = (userRole === 'admin') ? 'block' : 'none';
    });
    
    checkerElements.forEach(el => {
        el.style.display = (userRole === 'admin' || userRole === 'checker') ? 'block' : 'none';
    });
}

// Login function
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    if (!email || !password) {
        showNotification('Please enter both email and password', 'error');
        return;
    }
    
    try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showNotification('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed: ' + error.message, 'error');
    }
}

// Signup function
async function signup() {
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const name = document.getElementById('signup-name').value;
    
    if (!email || !password || !name) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // Create user document
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: 'user',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Account created successfully!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
        showNotification('Signup failed: ' + error.message, 'error');
    }
}

// Logout function
async function logout() {
    try {
        await firebase.auth().signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed: ' + error.message, 'error');
    }
}

// Toggle between login and signup
function toggleAuthMode() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const toggleText = document.getElementById('auth-toggle');
    
    if (loginForm.style.display === 'none') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        toggleText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign up</a>';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        toggleText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Login</a>';
    }
}

// Export functions for global access
window.authModule = {
    login,
    signup,
    logout,
    toggleAuthMode,
    initializeAuth,
    getCurrentUser: () => currentUser,
    getUserRole: () => userRole
};