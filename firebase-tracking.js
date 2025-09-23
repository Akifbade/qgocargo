// QGO Cargo - Global Firebase Usage Tracking
// Add this script to ALL system files (jobfile.html, pod.html, wh.html, backup.html)

// Firebase Configuration - SAME AS DASHBOARD
const firebaseConfig = {
    apiKey: "AIzaSyAAulR2nJQm-4QtNyEqKTnnDPw-iKW92Mc",
    authDomain: "my-job-file-system.firebaseapp.com",
    projectId: "my-job-file-system",
    storageBucket: "my-job-file-system.appspot.com",
    messagingSenderId: "145307873304",
    appId: "1:145307873304:web:d661ea6ec118801b4a136d",
    measurementId: "G-8EHX5K7YHL"
};

// Initialize Firebase
let db = null;
function initFirebaseTracking() {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        db = firebase.firestore();
        console.log('Firebase tracking initialized');
    } catch (error) {
        console.error('Firebase tracking initialization failed:', error);
    }
}

// Global usage tracking function
async function trackUsage(systemName) {
    console.log(`🔥 Tracking usage for: ${systemName}`);
    
    if (!db) {
        console.log('Firebase not available for tracking');
        return;
    }

    try {
        const usageRef = db.collection('usage').doc('global');
        
        await db.runTransaction(async (transaction) => {
            const doc = await transaction.get(usageRef);
            
            if (doc.exists) {
                const data = doc.data();
                const currentCount = data[systemName]?.count || 0;
                
                const updates = {
                    [`${systemName}.count`]: currentCount + 1,
                    [`${systemName}.lastAccess`]: new Date(),
                    lastUpdated: new Date()
                };
                
                transaction.update(usageRef, updates);
                console.log(`✅ GLOBAL TRACKING: ${systemName} usage count: ${currentCount + 1}`);
            } else {
                // Create initial document
                const initialData = {
                    totalSystems: 6,
                    dashboard: { count: 0, lastAccess: new Date() },
                    jobfile: { count: systemName === 'jobfile' ? 1 : 0, lastAccess: new Date() },
                    pod: { count: systemName === 'pod' ? 1 : 0, lastAccess: new Date() },
                    backup: { count: systemName === 'backup' ? 1 : 0, lastAccess: new Date() },
                    wh: { count: systemName === 'wh' ? 1 : 0, lastAccess: new Date() },
                    admin: { count: 0, lastAccess: new Date() },
                    lastUpdated: new Date(),
                    version: '2.0'
                };
                
                transaction.set(usageRef, initialData);
                console.log(`✅ CREATED & TRACKED: ${systemName} initial usage`);
            }
        });
        
    } catch (error) {
        console.error(`Firebase tracking error for ${systemName}:`, error);
        
        // Try alternative collection
        try {
            const altRef = db.collection('globalStats').doc('usage');
            await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(altRef);
                
                if (doc.exists) {
                    const data = doc.data();
                    const currentCount = data[systemName]?.count || 0;
                    
                    const updates = {
                        [`${systemName}.count`]: currentCount + 1,
                        [`${systemName}.lastAccess`]: new Date(),
                        lastUpdated: new Date()
                    };
                    
                    transaction.update(altRef, updates);
                    console.log(`✅ GLOBAL TRACKING (ALT): ${systemName} tracked`);
                }
            });
        } catch (altError) {
            console.error(`All Firebase tracking failed for ${systemName}`);
        }
    }
}

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', () => {
    // Determine system name from filename or set manually
    const currentPage = window.location.pathname.toLowerCase();
    let systemName = 'unknown';
    
    if (currentPage.includes('jobfile')) systemName = 'jobfile';
    else if (currentPage.includes('pod')) systemName = 'pod';
    else if (currentPage.includes('backup')) systemName = 'backup';
    else if (currentPage.includes('wh')) systemName = 'wh';
    
    // Initialize Firebase
    initFirebaseTracking();
    
    // Track usage after 1 second to ensure Firebase is ready
    setTimeout(() => {
        if (systemName !== 'unknown') {
            trackUsage(systemName);
        }
    }, 1000);
});

// Manual tracking function for custom triggers
window.trackSystemUsage = function(systemName) {
    trackUsage(systemName);
};
