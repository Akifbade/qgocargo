// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, query, where, serverTimestamp, getDocs, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Global variables ---
let db, auth;
let currentUser = null;
let jobFilesCache = [];
let clientsCache = [];
let chargeDescriptions = [];
let analyticsDataCache = null;
let currentFilteredJobs = [];
let fileIdToReject = null; 
let profitChartInstance = null;
let selectedJobForDelivery = null;
let selectedDriver = null;
let deliveryRequests = [];
let signaturePad = null;

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAAulR2nJQm-4QtNyEqKTnnDPw-iKW92Mc",
    authDomain: "my-job-file-system.firebaseapp.com",
    projectId: "my-job-file-system",
    storageBucket: "my-job-file-system.appspot.com",
    messagingSenderId: "145307873304",
    appId: "1:145307873304:web:d661ea6ec118801b4a136d",
    measurementId: "G-8EHX5K7YHL"
};

// --- Firebase Initialization ---
async function initializeFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                let userDoc = await getDoc(userDocRef);
                
                if (!userDoc.exists()) {
                    const usersCollectionRef = collection(db, 'users');
                    const userQuerySnapshot = await getDocs(usersCollectionRef);
                    const isFirstUser = userQuerySnapshot.size === 0;

                    const newUser = {
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        role: isFirstUser ? 'admin' : 'user',
                        status: isFirstUser ? 'active' : 'inactive',
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userDocRef, newUser);
                    userDoc = await getDoc(userDocRef);
                }
                
                currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
                
                if (currentUser.status === 'inactive') {
                    showLogin();
                    document.getElementById('approval-message').style.display = 'block';
                    signOut(auth);
                    return;
                }
                
                console.log("User logged in:", currentUser);
                
                if (currentUser.role === 'driver') {
                    showDriverDashboard();
                } else {
                    showApp();
                    loadJobFiles();
                    loadClients();
                }
                loadDeliveryRequests();
            } else {
                currentUser = null;
                console.log("User logged out");
                showLogin();
            }
        });

    } catch (error) {
        console.error("Firebase initialization failed:", error);
        showNotification("Could not connect to the database.", true);
    }
}

// --- Function to handle public view from QR code ---
async function initializeFirebaseAndShowPublicView(jobId) {
    try {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        await showPublicJobView(jobId);
    } catch (error) {
        console.error("Error initializing Firebase for public view:", error);
        document.body.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100">Could not load job file. Database connection failed.</div>`;
    } finally {
        hideLoader();
    }
}

async function showPublicJobView(jobId) {
    try {
        const docId = jobId.replace(/\//g, '_');
        const docRef = doc(db, 'jobfiles', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const publicViewHtml = getPrintViewHtml(data, true); 
            
            const publicViewContainer = document.getElementById('public-view-container');
            publicViewContainer.innerHTML = publicViewHtml;
        } else {
            document.body.innerHTML = `<div class="p-4 text-center text-yellow-700 bg-yellow-100">Job File with ID "${jobId}" not found.</div>`;
        }
    } catch (error) {
        console.error("Error fetching public job file:", error);
        document.body.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100">Error loading job file.</div>`;
    }
}

// --- Authentication Logic ---
async function handleSignUp(email, password, displayName) {
    showLoader();
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        showNotification("Account created! Please wait for admin approval.", false);
        await signOut(auth);
        toggleAuthView(true);
    } catch (error) {
        console.error("Sign up error:", error);
        showNotification(error.message, true);
    }
    hideLoader();
}

async function handleLogin(email, password) {
    showLoader();
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        console.error("Login error:", error);
        let message = "Login failed. Please check your email and password.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "Incorrect email or password. Please try again or reset your password.";
        }
        showNotification(message, true);
    }
    hideLoader();
}

async function handleForgotPassword() {
    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
        showNotification("Please enter your email address.", true);
        return;
    }
    showLoader();
    try {
        await sendPasswordResetEmail(auth, email);
        hideLoader();
        closeModal('forgot-password-modal');
        showNotification("Password reset link sent! Check your email inbox.", false);
    } catch (error) {
        hideLoader();
        console.error("Password reset error:", error);
        let message = "Could not send reset link. Please try again.";
        if(error.code === 'auth/user-not-found'){
            message = "No account found with this email address.";
        }
        showNotification(message, true);
    }
}

function handleLogout() {
    signOut(auth);
}

// --- Data Handling (Firestore) ---
async function saveJobFile() {
    if (!db) { showNotification("Database not connected.", true); return; }
    
    const jobFileNoInput = document.getElementById('job-file-no');
    const jobFileNo = jobFileNoInput.value.trim();
    const isUpdating = jobFileNoInput.disabled;

    const invoiceNo = document.getElementById('invoice-no').value.trim();
    const mawbNo = document.getElementById('mawb').value.trim();

    if (!jobFileNo) { 
        showNotification("Please enter a Job File No.", true); 
        return; 
    }
    
    showLoader();
    const docId = jobFileNo.replace(/\//g, '_');

    const checks = [];
    if (!isUpdating) {
         checks.push({ field: 'jfn', value: jobFileNo, label: 'Job File No.' });
    }
    if (invoiceNo) checks.push({ field: 'in', value: invoiceNo, label: 'Invoice No.' });
    if (mawbNo) checks.push({ field: 'mawb', value: mawbNo, label: 'MAWB No.' });

    for (const check of checks) {
        try {
            const q = query(collection(db, 'jobfiles'), where(check.field, '==', check.value));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                if (isUpdating) {
                    for (const foundDoc of querySnapshot.docs) {
                        if (foundDoc.id !== docId) {
                            hideLoader();
                            showNotification(`Duplicate ${check.label} "${check.value}" found in job file: ${foundDoc.data().jfn}`, true);
                            return;
                        }
                    }
                } else {
                    hideLoader();
                    showNotification(`Duplicate ${check.label} "${check.value}" already exists in job file: ${querySnapshot.docs[0].data().jfn}`, true);
                    return;
                }
            }
        } catch (error) { 
            hideLoader();
            console.error("Error checking for duplicates:", error);
            showNotification("Could not verify uniqueness. Please try again.", true);
            return;
        }
    }

    const data = getFormData();
    data.totalCost = parseFloat(document.getElementById('total-cost').textContent) || 0;
    data.totalSelling = parseFloat(document.getElementById('total-selling').textContent) || 0;
    data.totalProfit = parseFloat(document.getElementById('total-profit').textContent) || 0;
    
    try {
        const docRef = doc(db, 'jobfiles', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const existingData = docSnap.data();
            data.lastUpdatedBy = currentUser.displayName;
            data.updatedAt = serverTimestamp();

            if (existingData.status === 'approved' || existingData.status === 'checked') {
                data.status = 'pending';
                data.checkedBy = null;
                data.checkedAt = null;
                data.approvedBy = null;
                data.approvedAt = null;
                data.rejectionReason = null;
                data.rejectedBy = null;
                data.rejectedAt = null;
                showNotification("File modified. Re-approval is now required.", false);
            }
            await setDoc(docRef, data, { merge: true });
        } else {
            data.createdBy = currentUser.displayName;
            data.createdAt = serverTimestamp();
            data.lastUpdatedBy = currentUser.displayName;
            data.updatedAt = serverTimestamp();
            data.status = 'pending';
            await setDoc(docRef, data);
        }
        
        hideLoader();
        showNotification("Job file saved successfully!");
        loadJobFileById(docId);

    } catch (error) {
        hideLoader();
        console.error("Error saving document: ", error);
        showNotification("Error saving job file.", true);
    }
}

async function checkJobFile(docId = null) {
    if (!currentUser || !['admin', 'checker'].includes(currentUser.role)) {
        showNotification("You do not have permission to check files.", true);
        return;
    }

    let fileId = docId;
    if (!fileId) {
        const jobFileNo = document.getElementById('job-file-no').value.trim();
        if (!jobFileNo) {
            showNotification("Please save or load a job file first.", true);
            return;
        }
        fileId = jobFileNo.replace(/\//g, '_');
    }
    
    showLoader();
    const checkData = {
        checkedBy: currentUser.displayName,
        checkedAt: serverTimestamp(),
        status: 'checked'
    };
    
    try {
        const docRef = doc(db, 'jobfiles', fileId);
        await setDoc(docRef, checkData, { merge: true });
        
        if (!docId) {
            const updatedDoc = await getDoc(docRef);
            populateFormFromData(updatedDoc.data());
        } else {
            refreshOpenModals();
        }
        
        hideLoader();
        showNotification("Job File Checked!");

    } catch (error) {
        hideLoader();
        console.error("Error checking document: ", error);
        showNotification("Error checking job file.", true);
    }
}

async function uncheckJobFile(docId) {
    if (!currentUser || !['admin', 'checker'].includes(currentUser.role)) {
        showNotification("You do not have permission to uncheck files.", true);
        return;
    }
    showLoader();
    const uncheckData = {
        checkedBy: null,
        checkedAt: null,
        status: 'pending'
    };
    try {
        const docRef = doc(db, 'jobfiles', docId);
        await setDoc(docRef, uncheckData, { merge: true });
        hideLoader();
        showNotification("Job File Unchecked!");
        refreshOpenModals();
    } catch (error) {
        hideLoader();
        console.error("Error unchecking document: ", error);
        showNotification("Error unchecking job file.", true);
    }
}

async function approveJobFile(docId = null) {
    if (currentUser.role !== 'admin') {
        showNotification("Only admins can approve job files.", true);
        return;
    }
    
    let fileId = docId;
    if (!fileId) {
        const jobFileNo = document.getElementById('job-file-no').value.trim();
         if (!jobFileNo) {
            showNotification("Please save or load a job file first.", true);
            return;
        }
        fileId = jobFileNo.replace(/\//g, '_');
    }

    showLoader();
    const approvalData = {
        approvedBy: currentUser.displayName,
        approvedAt: serverTimestamp(),
        status: 'approved',
        rejectionReason: null,
        rejectedBy: null,
        rejectedAt: null
    };
    
    try {
        const docRef = doc(db, 'jobfiles', fileId);
        await setDoc(docRef, approvalData, { merge: true });

        if (!docId) {
            const updatedDoc = await getDoc(docRef);
            populateFormFromData(updatedDoc.data());
        } else {
            refreshOpenModals();
        }

        hideLoader();
        showNotification("Job File Approved!");

    } catch (error) {
        hideLoader();
        console.error("Error approving document: ", error);
        showNotification("Error approving job file.", true);
    }
}

function promptForRejection(docId) {
    fileIdToReject = docId;
    openModal('reject-reason-modal', true);
}

async function rejectJobFile() {
    const reason = document.getElementById('rejection-reason-input').value.trim();
    if (!reason) {
        showNotification("Rejection reason is required.", true);
        return;
    }

    const docId = fileIdToReject || document.getElementById('job-file-no').value.replace(/\//g, '_');
    if (!docId) {
         showNotification("No file selected for rejection.", true);
         return;
    }

    showLoader();
    const rejectionData = {
        rejectedBy: currentUser.displayName,
        rejectedAt: serverTimestamp(),
        rejectionReason: reason,
        status: 'rejected'
    };

    try {
        const docRef = doc(db, 'jobfiles', docId);
        await setDoc(docRef, rejectionData, { merge: true });
        
        if (fileIdToReject) {
            refreshOpenModals();
        } else {
            const updatedDoc = await getDoc(docRef);
            populateFormFromData(updatedDoc.data());
        }
        
        hideLoader();
        closeModal('reject-reason-modal');
        document.getElementById('rejection-reason-input').value = '';
        fileIdToReject = null;
        showNotification("Job File Rejected!");
    } catch (error) {
        hideLoader();
        console.error("Error rejecting document: ", error);
        showNotification("Error rejecting job file.", true);
    }
}

function loadJobFiles() {
    if (!db) return;
    const jobFilesCollection = collection(db, 'jobfiles');
    const q = query(jobFilesCollection);

    onSnapshot(q, (querySnapshot) => {
        jobFilesCache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const sortedDocs = [...jobFilesCache].sort((a,b) => (b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0) - (a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0));
        
        displayJobFiles(sortedDocs);
        updateStatusSummary('status-summary-main', jobFilesCache);

    }, (error) => {
        console.error("Error fetching job files: ", error);
        showNotification("Error loading job files.", true);
    });
}

function displayJobFiles(files) {
    const list = document.getElementById('job-files-list');
    if (files.length === 0) {
         list.innerHTML = `<p class="text-gray-500 text-center p-4">No job files match the current filters.</p>`;
         return;
    }
    let filesHtml = '';
    files.forEach((docData) => {
        const deleteButton = currentUser.role === 'admin' ? `<button onclick="confirmDelete('${docData.id}')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm">Delete</button>` : '';
        const lastUpdated = docData.updatedAt?.toDate ? docData.updatedAt.toDate().toLocaleString() : 'N/A';
        
        const searchTerm = [docData.jfn, docData.sh, docData.co].join(' ').toLowerCase();

        filesHtml += `
            <div class="job-file-item border p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center bg-gray-50 hover:bg-gray-100 gap-2" 
                 data-search-term="${searchTerm}">
                <div class="text-center sm:text-left">
                    <p class="font-bold text-indigo-700">${docData.jfn || 'No ID'}</p>
                    <p class="text-sm text-gray-600">Shipper: ${docData.sh || 'N/A'} | Consignee: ${docData.co || 'N/A'}</p>
                    <p class="text-xs text-gray-400">Last Updated: ${lastUpdated}</p>
                </div>
                <div class="space-x-2 flex-shrink-0">
                    <button onclick="previewJobFileById('${docData.id}')" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded text-sm">Preview</button>
                    <button onclick="loadJobFileById('${docData.id}')" class="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm">Load</button>
                    ${deleteButton}
                </div>
            </div>
        `;
    });
    list.innerHTML = filesHtml;
}

function logUserActivity(jobFileNo) {
    if (!currentUser) return;

    const logEntry = {
        user: currentUser.displayName,
        file: jobFileNo,
        timestamp: new Date().toISOString()
    };

    let logs = [];
    try {
        const storedLogs = localStorage.getItem('userActivityLog');
        if (storedLogs) {
            logs = JSON.parse(storedLogs);
        }
    } catch (e) {
        console.error("Error parsing user activity log from localStorage", e);
        logs = [];
    }

    logs.unshift(logEntry);

    if (logs.length > 200) {
        logs.splice(200);
    }

    localStorage.setItem('userActivityLog', JSON.stringify(logs));
}

function openUserActivityLog() {
    const logBody = document.getElementById('activity-log-body');
    let logs = [];
    try {
        const storedLogs = localStorage.getItem('userActivityLog');
        if (storedLogs) {
            logs = JSON.parse(storedLogs);
        }
    } catch (e) {
        console.error("Error parsing user activity log from localStorage", e);
    }

    if (logs.length === 0) {
        logBody.innerHTML = '<tr><td colspan="3" class="table-cell text-center p-4">No user activity recorded yet.</td></tr>';
    } else {
        logBody.innerHTML = logs.map(entry => `
            <tr class="border-b">
                <td class="table-cell">${entry.user || 'Unknown'}</td>
                <td class="table-cell font-medium">${entry.file || 'N/A'}</td>
                <td class="table-cell text-gray-600">${new Date(entry.timestamp).toLocaleString()}</td>
            </tr>
        `).join('');
    }

    openModal('activity-log-modal');
}


async function loadJobFileById(docId) {
    showLoader();
    try {
        const docRef = doc(db, 'jobfiles', docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const fileData = docSnap.data();
            populateFormFromData(fileData);
            
            logUserActivity(fileData.jfn);
            
            document.getElementById('job-file-no').disabled = true;
            closeAllModals();
            showNotification("Job file loaded successfully.");
        } else {
            showNotification("Document not found.", true);
        }
        hideLoader();
    } catch (error) {
        hideLoader();
        console.error("Error loading document:", error);
        showNotification("Error loading job file.", true);
    }
}

async function previewJobFileById(docId) {
    showLoader();
    try {
        const docRef = doc(db, 'jobfiles', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const previewBody = document.getElementById('preview-body');
            previewBody.innerHTML = getPrintViewHtml(data, false); 
            
            const qrContainer = previewBody.querySelector('.qrcode-container');
            if (qrContainer && data.jfn) {
                qrContainer.innerHTML = '';
                const baseUrl = window.location.href.split('?')[0];
                const qrText = `${baseUrl}?jobId=${encodeURIComponent(data.jfn)}`;
                new QRCode(qrContainer, {
                    text: qrText,
                    width: 96,
                    height: 96,
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
            
            openModal('preview-modal', true); // Pass true to keep parent modals open
        } else {
            showNotification("Document not found.", true);
        }
        hideLoader();
    } catch (error) {
        hideLoader();
        console.error("Error previewing document:", error);
        showNotification("Error previewing job file.", true);
    }
}

async function moveToRecycleBin(docId) {
    showLoader();
    try {
        const docRef = doc(db, 'jobfiles', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const dataToMove = docSnap.data();
            dataToMove.deletedAt = serverTimestamp();
            dataToMove.deletedBy = currentUser.displayName;
            
            const deletedDocRef = doc(db, 'deleted_jobfiles', docId);
            await setDoc(deletedDocRef, dataToMove);
            await deleteDoc(docRef);
            
            showNotification("Job file moved to recycle bin.");
        } else {
            throw new Error("Document not found in main collection.");
        }
    } catch (error) {
        console.error("Error moving to recycle bin:", error);
        showNotification("Error deleting job file.", true);
    } finally {
        hideLoader();
    }
}

function confirmDelete(docId, type = 'jobfile') {
     if (currentUser.role !== 'admin') {
         showNotification("Only admins can delete files.", true);
         return;
     }
    const modal = document.getElementById('confirm-modal');
    let message = '';
    let onOk;

    if (type === 'jobfile') {
        modal.querySelector('#confirm-title').textContent = 'Confirm Job File Deletion';
        message = `Are you sure you want to move job file "${docId.replace(/_/g, '/')}" to the recycle bin?`;
        onOk = () => moveToRecycleBin(docId);
    } else if (type === 'client') {
        modal.querySelector('#confirm-title').textContent = 'Confirm Client Deletion';
        const client = clientsCache.find(c => c.id === clientId);
        message = `Are you sure you want to delete the client "${client?.name || 'this client'}"? This action cannot be undone.`;
        onOk = () => deleteClient(docId);
    }

    modal.querySelector('#confirm-message').innerHTML = message;
    modal.querySelector('#confirm-ok').className = 'bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded';
    openModal('confirm-modal', true);

    const okButton = modal.querySelector('#confirm-ok');
    const cancelButton = modal.querySelector('#confirm-cancel');

    const handleOkClick = () => {
        onOk();
        closeConfirm();
    };
    const closeConfirm = () => {
        closeModal('confirm-modal');
        okButton.removeEventListener('click', handleOkClick);
    };
    
    okButton.addEventListener('click', handleOkClick, { once: true });
    cancelButton.addEventListener('click', closeConfirm, { once: true });
}

// --- Analytics Dashboard Logic ---
function openAnalyticsDashboard() {
    const dateType = document.getElementById('analytics-date-type')?.value || 'bd';
    filterAnalyticsByTimeframe('all', dateType);
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('analytics-container').style.display = 'block';
    window.scrollTo(0, 0);
}

function filterAnalyticsByTimeframe(timeframe, dateType = 'bd') {
    currentFilteredJobs = jobFilesCache;
    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;

    if (timeframe !== 'all') {
        currentFilteredJobs = jobFilesCache.filter(job => {
            const dateField = dateType === 'bd' ? job.bd : job.d;
            if (!dateField) return false;
            const jobDate = new Date(dateField);
            if (timeframe === 'thisYear') {
                return jobDate.getFullYear() === currentYear;
            }
            if (timeframe === 'lastYear') {
                return jobDate.getFullYear() === lastYear;
            }
            if (timeframe.includes('-')) { // Monthly filter like '2025-01'
                const [year, month] = timeframe.split('-').map(Number);
                return jobDate.getFullYear() === year && jobDate.getMonth() === month - 1;
            }
            return true;
        });
    }
    calculateAndDisplayAnalytics(currentFilteredJobs);
}


function calculateAndDisplayAnalytics(jobs) {
    const body = document.getElementById('analytics-body');
     if (jobs.length === 0) {
         body.innerHTML = `
         <!-- Timeframe Filters -->
        <div class="space-y-3">
            <div class="flex items-center justify-center gap-4">
                 <label for="analytics-date-type" class="text-sm font-medium">Report Date Type:</label>
                 <select id="analytics-date-type" class="input-field w-auto">
                    <option value="bd">Billing Date</option>
                    <option value="d">Opening Date</option>
                </select>
            </div>
            <div class="flex justify-center flex-wrap gap-2">
                <button data-timeframe="all" class="timeframe-btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">All Time</button>
                <button data-timeframe="thisYear" class="timeframe-btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">This Year</button>
                <button data-timeframe="lastYear" class="timeframe-btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">Last Year</button>
            </div>
        </div>
         <p class="text-center text-gray-500 mt-8">No data available for the selected period.</p>`;
         
        document.querySelectorAll('.timeframe-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const timeframe = e.target.dataset.timeframe;
                const dateType = document.getElementById('analytics-date-type').value;
                filterAnalyticsByTimeframe(timeframe, dateType);
            });
        });
         document.getElementById('analytics-date-type').addEventListener('change', (e) => {
             const activeTimeframeButton = document.querySelector('.timeframe-btn.bg-indigo-700') || document.querySelector('[data-timeframe="all"]');
             filterAnalyticsByTimeframe(activeTimeframeButton.dataset.timeframe, e.target.value);
         });
         return;
     }

    let totalJobs = jobs.length;
    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    const profitByFile = [];
    const profitByShipper = {};
    const profitByConsignee = {};
    const monthlyStatsByBilling = {};
    const monthlyStatsByOpening = {};
    const profitByUser = {};
    const profitBySalesman = {};

    jobs.forEach(job => {
        const profit = job.totalProfit || 0;
        const revenue = job.totalSelling || 0;
        const cost = job.totalCost || 0;
        const creator = job.createdBy || 'Unknown';
        const salesman = job.sm || 'N/A';
        let status = 'Pending Check';
        if (job.status === 'rejected') status = 'Rejected';
        else if (job.status === 'approved') status = 'Approved';
        else if (job.status === 'checked') status = 'Checked';

        totalRevenue += revenue;
        totalCost += cost;
        totalProfit += profit;

        profitByFile.push({ id: job.id, jfn: job.jfn, shipper: job.sh, consignee: job.co, profit: profit, status: status, date: job.updatedAt?.toDate() || new Date(0), cost: cost, dsc: job.dsc, mawb: job.mawb, createdBy: creator });

        if (job.sh) {
            profitByShipper[job.sh] = (profitByShipper[job.sh] || 0) + profit;
        }
        if (job.co) {
            profitByConsignee[job.co] = (profitByConsignee[job.co] || 0) + profit;
        }
        if (job.bd) {
            const month = job.bd.substring(0, 7);
            if (!monthlyStatsByBilling[month]) {
                monthlyStatsByBilling[month] = { profit: 0, count: 0, jobs: [] };
            }
            monthlyStatsByBilling[month].profit += profit;
            monthlyStatsByBilling[month].count++;
            monthlyStatsByBilling[month].jobs.push(job);
        }
        if (job.d) {
            const month = job.d.substring(0, 7);
            if (!monthlyStatsByOpening[month]) {
                monthlyStatsByOpening[month] = { profit: 0, count: 0, jobs: [] };
            }
            monthlyStatsByOpening[month].profit += profit;
            monthlyStatsByOpening[month].count++;
            monthlyStatsByOpening[month].jobs.push(job);
        }
        
        if (!profitByUser[creator]) {
            profitByUser[creator] = { count: 0, profit: 0, jobs: [] };
        }
        profitByUser[creator].count++;
        profitByUser[creator].profit += profit;
        profitByUser[creator].jobs.push(job);

        if (salesman !== 'N/A') {
            if (!profitBySalesman[salesman]) {
                profitBySalesman[salesman] = { count: 0, profit: 0, jobs: [] };
            }
            profitBySalesman[salesman].count++;
            profitBySalesman[salesman].profit += profit;
            profitBySalesman[salesman].jobs.push(job);
        }
    });

    analyticsDataCache = {
        totalJobs, totalRevenue, totalCost, totalProfit, profitByFile,
        profitByShipper: Object.entries(profitByShipper).sort((a, b) => b[1] - a[1]),
        profitByConsignee: Object.entries(profitByConsignee).sort((a, b) => b[1] - a[1]),
        monthlyStatsByBilling: Object.entries(monthlyStatsByBilling).sort((a, b) => a[0].localeCompare(b[0])),
        monthlyStatsByOpening: Object.entries(monthlyStatsByOpening).sort((a, b) => a[0].localeCompare(b[0])),
        profitByUser: Object.entries(profitByUser).sort((a, b) => b[1].profit - a[1].profit),
        profitBySalesman: Object.entries(profitBySalesman).sort((a, b) => b[1].profit - a[1].profit)
    };

    displayAnalytics(analyticsDataCache);
}

function closeAnalyticsDashboard() {
    document.getElementById('analytics-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
}

function renderProfitChart(data, monthlyReportType) {
    if (profitChartInstance) {
        profitChartInstance.destroy();
    }

    const ctx = document.getElementById('profit-chart')?.getContext('2d');
    if (!ctx) return;
    
    const monthlyStats = monthlyReportType === 'billing' ? data.monthlyStatsByBilling : data.monthlyStatsByOpening;
    
    let year;
    if (currentFilteredJobs.length > 0) {
         const dateField = monthlyReportType === 'billing' ? currentFilteredJobs[0].bd : currentFilteredJobs[0].d;
         if(dateField) year = new Date(dateField).getFullYear();
    }
    if (!year) year = new Date().getFullYear();


    const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const profits = Array(12).fill(0);
    
    monthlyStats.forEach(([monthStr, stats]) => {
        const [statYear, statMonth] = monthStr.split('-').map(Number);
        if (statYear === year) {
            profits[statMonth - 1] = stats.profit;
        }
    });

    const maxProfit = Math.max(...profits.map(p => Math.abs(p)));

    const backgroundColors = profits.map(p => {
        if (p === 0) return 'rgba(201, 203, 207, 0.6)';
        const alpha = Math.max(0.2, Math.abs(p) / (maxProfit || 1));
        return p > 0 ? `rgba(75, 192, 192, ${alpha})` : `rgba(255, 99, 132, ${alpha})`;
    });

    profitChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Monthly Profit for ${year}`,
                data: profits,
                backgroundColor: backgroundColors,
                borderColor: backgroundColors.map(c => c.replace('0.6', '1').replace('0.2','1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value, index, values) {
                            return 'KD ' + value;
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                     callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += 'KD ' + context.parsed.y.toFixed(2);
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


function displayAnalytics(data, sortBy = 'profit-desc', searchTerm = '', monthlyReportType = 'billing') {
    const body = document.getElementById('analytics-body');
    
    let filteredFiles = data.profitByFile;

    if (searchTerm) {
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        filteredFiles = data.profitByFile.filter(file => 
            (file.jfn || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (file.shipper || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (file.consignee || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (file.mawb || '').toLowerCase().includes(lowerCaseSearchTerm) ||
            (file.createdBy || '').toLowerCase().includes(lowerCaseSearchTerm)
        );
    }
    
    const monthlyStats = monthlyReportType === 'billing' ? data.monthlyStatsByBilling : data.monthlyStatsByOpening;
    const monthlyReportTitle = monthlyReportType === 'billing' ? 'Profit By Month (Billing Date)' : 'Profit By Month (Opening Date)';

    const now = new Date();
    const currentYear = now.getFullYear();
    const lastYear = currentYear - 1;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    let monthButtons = '';
    for(let i=0; i < 12; i++) {
        const monthStr = `${currentYear}-${String(i + 1).padStart(2, '0')}`;
        monthButtons += `<button data-timeframe="${monthStr}" class="timeframe-btn bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-1 px-3 rounded text-sm">${months[i]}</button>`;
    }


    const sortedFiles = [...filteredFiles];
    if (sortBy === 'profit-desc') {
        sortedFiles.sort((a, b) => b.profit - a.profit);
    } else if (sortBy === 'date-desc') {
        sortedFiles.sort((a, b) => b.date - a.date);
    } else if (sortBy === 'status') {
        const statusOrder = { 'Pending Check': 1, 'Checked': 2, 'Approved': 3, 'Rejected': 4 };
        sortedFiles.sort((a, b) => (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99));
    } else if (sortBy === 'user') {
        sortedFiles.sort((a, b) => (a.createdBy || '').localeCompare(b.createdBy || ''));
    }

    body.innerHTML = `
        <!-- Timeframe Filters -->
        <div class="space-y-3">
            <div class="flex items-center justify-center gap-4">
                 <label for="analytics-date-type" class="text-sm font-medium">Report Date Type:</label>
                 <select id="analytics-date-type" class="input-field w-auto">
                    <option value="bd" ${monthlyReportType === 'bd' ? 'selected' : ''}>Billing Date</option>
                    <option value="d" ${monthlyReportType === 'd' ? 'selected' : ''}>Opening Date</option>
                </select>
            </div>
            <div class="flex justify-center flex-wrap gap-2">
                <button data-timeframe="all" class="timeframe-btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">All Time</button>
                <button data-timeframe="thisYear" class="timeframe-btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">This Year</button>
                <button data-timeframe="lastYear" class="timeframe-btn bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded">Last Year</button>
            </div>
            <div class="flex justify-center flex-wrap gap-1">
                ${monthButtons}
            </div>
        </div>
        <!-- Overall Summary -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center mt-6">
            <div class="bg-gray-100 p-4 rounded-lg"><p class="text-sm text-gray-600">Total Jobs</p><p class="text-2xl font-bold">${data.totalJobs}</p></div>
            <div class="bg-blue-100 p-4 rounded-lg"><p class="text-sm text-blue-800">Total Revenue</p><p class="text-2xl font-bold text-blue-900">KD ${data.totalRevenue.toFixed(2)}</p></div>
            <div class="bg-red-100 p-4 rounded-lg"><p class="text-sm text-red-800">Total Cost</p><p class="text-2xl font-bold text-red-900">KD ${data.totalCost.toFixed(2)}</p></div>
            <div class="bg-green-100 p-4 rounded-lg"><p class="text-sm text-green-800">Total Profit</p><p class="text-2xl font-bold text-green-900">KD ${data.totalProfit.toFixed(2)}</p></div>
        </div>
         <!-- Profit Chart -->
         <div class="bg-white p-4 rounded-lg shadow-sm">
            <div style="position: relative; height:300px;">
                <canvas id="profit-chart"></canvas>
            </div>
        </div>

        <!-- Detailed Breakdowns -->
        <div id="analytics-tables" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
                <h4 class="text-lg font-semibold mb-2">Top Profitable Shippers</h4>
                <div class="overflow-x-auto"><table class="analytics-table w-full"><thead><tr><th>Shipper</th><th>Total Profit</th></tr></thead>
                <tbody>${data.profitByShipper.slice(0, 5).map(([name, profit]) => `<tr><td>${name}</td><td>KD ${profit.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>
            </div>
            <div>
                <h4 class="text-lg font-semibold mb-2">Top Profitable Consignees</h4>
                <div class="overflow-x-auto"><table class="analytics-table w-full"><thead><tr><th>Consignee</th><th>Total Profit</th></tr></thead>
                <tbody>${data.profitByConsignee.slice(0, 5).map(([name, profit]) => `<tr><td>${name}</td><td>KD ${profit.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>
            </div>
             <div>
                <h4 class="text-lg font-semibold mb-2">Top Salesmen by Profit</h4>
                <div class="overflow-x-auto"><table class="analytics-table w-full"><thead><tr><th>Salesman</th><th>Files</th><th>Profit</th><th>Actions</th></tr></thead>
                <tbody>${data.profitBySalesman.slice(0, 5).map(([name, stats]) => `<tr><td>${name}</td><td>${stats.count}</td><td>KD ${stats.profit.toFixed(2)}</td><td><button data-action="view-salesman-jobs" data-salesman="${name}" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded text-xs">View Jobs</button></td></tr>`).join('')}</tbody></table></div>
            </div>
            <div class="lg:col-span-3">
                 <h4 class="text-lg font-semibold mb-2">${monthlyReportTitle}</h4>
                <div class="overflow-x-auto"><table class="analytics-table w-full"><thead><tr><th>Month</th><th>Total Jobs</th><th>Total Profit / Loss</th><th>Actions</th></tr></thead>
                <tbody>${monthlyStats.map(([month, stats]) => `<tr><td>${month}</td><td>${stats.count}</td><td>KD ${stats.profit.toFixed(2)}</td><td><button data-action="view-monthly-jobs" data-month="${month}" data-datetype="${monthlyReportType}" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded text-xs">View Jobs</button></td></tr>`).join('')}</tbody></table></div>
            </div>
             <div class="lg:col-span-3">
                <h4 class="text-lg font-semibold mb-2">Top Users by Profit</h4>
                <div class="overflow-x-auto"><table class="analytics-table w-full"><thead><tr><th>User</th><th>Files</th><th>Profit</th><th>Actions</th></tr></thead>
                <tbody>${data.profitByUser.map(([name, stats]) => `<tr><td>${name}</td><td>${stats.count}</td><td>KD ${stats.profit.toFixed(2)}</td><td><button data-action="view-user-jobs" data-user="${name}" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-1 px-2 rounded text-xs">View Jobs</button></td></tr>`).join('')}</tbody></table></div>
            </div>
        </div>

        <!-- Profit by Job File -->
        <div>
            <div class="flex flex-col sm:flex-row justify-between items-center mb-2 gap-2">
                <h4 class="text-lg font-semibold">Job File Details</h4>
                <div class="flex items-center gap-2 flex-grow">
                    <input type="text" id="analytics-search-bar" class="input-field w-full sm:w-auto flex-grow" placeholder="Search files..." value="${searchTerm}">
                    <label for="sort-analytics" class="text-sm ml-4 mr-2">Sort by:</label>
                    <select id="sort-analytics" class="input-field w-auto inline-block text-sm">
                        <option value="profit-desc" ${sortBy === 'profit-desc' ? 'selected' : ''}>Profit (High to Low)</option>
                        <option value="date-desc" ${sortBy === 'date-desc' ? 'selected' : ''}>Date (Newest First)</option>
                        <option value="status" ${sortBy === 'status' ? 'selected' : ''}>Status</option>
                        <option value="user" ${sortBy === 'user' ? 'selected' : ''}>User</option>
                    </select>
                    <button onclick="downloadAnalyticsCsv()" class="bg-gray-700 hover:bg-gray-800 text-white font-bold py-1 px-3 rounded text-sm">CSV</button>
                </div>
            </div>
            <div class="max-h-96 overflow-y-auto">
                <table class="analytics-table w-full text-sm">
                    <thead><tr><th>Job Details</th><th>Cost / Profit</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>${sortedFiles.length > 0 ? sortedFiles.map(file => `
                        <tr>
                            <td>
                                <p class="font-bold">${file.jfn || file.id}</p>
                                <p class="text-xs">Shipper: ${file.shipper || 'N/A'}</p>
                                <p class="text-xs">Consignee: ${file.consignee || 'N/A'}</p>
                                <p class="text-xs text-gray-600">AWB/MAWB: ${file.mawb || 'N/A'}</p>
                                <p class="text-xs text-gray-600">Desc: ${file.dsc || 'N/A'}</p>
                                <p class="text-xs font-bold mt-1">Created by: ${file.createdBy || 'N/A'}</p>
                            </td>
                            <td>
                                <p class="font-bold text-green-600">KD ${file.profit.toFixed(2)}</p>
                                <p class="text-xs text-red-600">Cost: KD ${file.cost.toFixed(2)}</p>
                            </td>
                            <td>${file.status}</td>
                            <td class="space-x-1">
                                <button onclick="previewJobFileById('${file.id}')" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-2 rounded text-xs">Preview</button>
                                <button onclick="loadJobFileById('${file.id}')" class="bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-2 rounded text-xs">Load</button>
                                ${currentUser.role === 'admin' ? `<button onclick="confirmDelete('${file.id}')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-2 rounded text-xs">Delete</button>` : ''}
                            </td>
                        </tr>`).join('') : `<tr><td colspan="4" class="text-center py-4">No files match your search.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    renderProfitChart(data, monthlyReportType);

    document.getElementById('analytics-search-bar').addEventListener('input', (e) => {
        displayAnalytics(analyticsDataCache, document.getElementById('sort-analytics').value, e.target.value, document.getElementById('analytics-date-type').value);
    });
    document.getElementById('sort-analytics').addEventListener('change', (e) => {
         displayAnalytics(analyticsDataCache, e.target.value, document.getElementById('analytics-search-bar').value, document.getElementById('analytics-date-type').value);
    });
     document.getElementById('analytics-date-type').addEventListener('change', (e) => {
         const activeTimeframeButton = document.querySelector('.timeframe-btn.bg-indigo-700') || document.querySelector('[data-timeframe="all"]');
         filterAnalyticsByTimeframe(activeTimeframeButton.dataset.timeframe, e.target.value);
     });

    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
             document.querySelectorAll('.timeframe-btn').forEach(b => {
                b.classList.remove('bg-indigo-700', 'text-white');
                if(!b.classList.contains('bg-gray-200')) {
                   b.classList.add('bg-indigo-500');
                }
             });
             e.target.classList.remove('bg-indigo-500', 'bg-gray-200');
             e.target.classList.add('bg-indigo-700', 'text-white');
            const timeframe = e.target.dataset.timeframe;
            const dateType = document.getElementById('analytics-date-type').value;
            filterAnalyticsByTimeframe(timeframe, dateType);
        });
    });

    document.getElementById('analytics-tables').addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'BUTTON' && target.dataset.action) {
            const action = target.dataset.action;
            if (action === 'view-user-jobs') {
                showUserJobs(target.dataset.user);
            } else if (action === 'view-monthly-jobs') {
                showMonthlyJobs(target.dataset.month, target.dataset.datetype);
            } else if (action === 'view-salesman-jobs') {
                showSalesmanJobs(target.dataset.salesman);
            }
        }
    });

}

function sortAnalyticsTable(sortBy) {
    const searchTerm = document.getElementById('analytics-search-bar').value;
    displayAnalytics(analyticsDataCache, sortBy, searchTerm, document.getElementById('analytics-date-type').value);
}

function downloadAnalyticsCsv() {
    let csvContent = "data:text/csv;charset=utf-8,Job File ID,Shipper,Consignee,Profit,Status,Cost,Description,AWB/MAWB,Created By\n";
    const sortedFiles = [...analyticsDataCache.profitByFile].sort((a,b) => (b.profit || 0) - (a.profit || 0));

    sortedFiles.forEach(job => {
        const rowData = [job.jfn, job.shipper || 'N/A', job.consignee || 'N/A', (job.profit || 0).toFixed(2), job.status, (job.cost || 0).toFixed(2), job.dsc || 'N/A', job.mawb || 'N/A', job.createdBy || 'N/A'];
        const row = rowData.map(d => `"${String(d).replace(/"/g, '""')}"`).join(",");
        csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "job_file_analytics.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Admin Panel & Backup/Restore Logic ---
async function openAdminPanel() {
    if (currentUser.role !== 'admin') {
        showNotification("Access denied.", true);
        return;
    }
    showLoader();
    const usersCollectionRef = collection(db, 'users');
    const userQuerySnapshot = await getDocs(usersCollectionRef);
    const userListDiv = document.getElementById('user-list');
    let userListHtml = '';

    userQuerySnapshot.forEach(doc => {
        const userData = doc.data();
        const userId = doc.id;
        const isDisabled = userId === currentUser.uid;
        userListHtml += `
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center p-2 border-b">
                <input type="text" data-uid="${userId}" class="display-name-input input-field col-span-1" value="${userData.displayName}" ${isDisabled ? 'disabled' : ''}>
                <select data-uid="${userId}" class="role-select input-field col-span-1" ${isDisabled ? 'disabled' : ''}>
                    <option value="user" ${userData.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="checker" ${userData.role === 'checker' ? 'selected' : ''}>Checker</option>
                    <option value="admin" ${userData.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
                <select data-uid="${userId}" class="status-select input-field col-span-1" ${isDisabled ? 'disabled' : ''}>
                    <option value="active" ${userData.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="inactive" ${userData.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        `;
    });
    userListDiv.innerHTML = userListHtml;
    hideLoader();
    openModal('admin-panel-modal');
}

async function saveUserChanges() {
    showLoader();
    const batch = writeBatch(db);
    const userRows = document.querySelectorAll('#user-list > div');
    
    userRows.forEach(row => {
        const nameInput = row.querySelector('.display-name-input');
        if (nameInput.disabled) return;

        const roleSelect = row.querySelector('.role-select');
        const statusSelect = row.querySelector('.status-select');
        const uid = nameInput.dataset.uid;
        
        const userDocRef = doc(db, 'users', uid);
        batch.update(userDocRef, { 
            displayName: nameInput.value,
            role: roleSelect.value,
            status: statusSelect.value
        });
    });

    try {
        await batch.commit();
        hideLoader();
        showNotification("User details updated successfully!");
        closeModal('admin-panel-modal');
    } catch (error) {
        hideLoader();
        console.error("Error updating roles: ", error);
        showNotification("Failed to update user details.", true);
    }
}

async function backupAllData() {
    if (currentUser.role !== 'admin') {
        showNotification("Access denied. Only admins can perform backups.", true);
        return;
    }
    showLoader();
    try {
        const jobFilesQuery = query(collection(db, 'jobfiles'));
        const usersQuery = query(collection(db, 'users'));

        const jobFilesSnapshot = await getDocs(jobFilesQuery);
        const usersSnapshot = await getDocs(usersQuery);

        const jobfilesData = jobFilesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const backupData = {
            version: "1.0",
            createdAt: new Date().toISOString(),
            data: {
                jobfiles: jobfilesData,
                users: usersData
            }
        };

        const jsonString = JSON.stringify(backupData, (key, value) => {
            if (value && typeof value.toDate === 'function') {
                return value.toDate().toISOString();
            }
            return value;
        }, 2);

        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        link.download = `qgo-cargo-backup-${date}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        showNotification("Backup created and download started successfully.");

    } catch (error) {
        console.error("Backup failed:", error);
        showNotification("An error occurred during backup.", true);
    } finally {
        hideLoader();
    }
}

async function handleRestoreFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (currentUser.role !== 'admin') {
        showNotification("Access denied. Only admins can restore data.", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const content = e.target.result;
        try {
            const backupData = JSON.parse(content);

            if (!backupData.data || !backupData.data.jobfiles || !backupData.data.users) {
                showNotification("Invalid backup file format.", true);
                return;
            }

            const jobFileCount = backupData.data.jobfiles.length;
            const userCount = backupData.data.users.length;

            const modal = document.getElementById('confirm-modal');
            modal.querySelector('#confirm-title').textContent = 'Confirm Data Restore';
            modal.querySelector('#confirm-message').innerHTML = `
                <p>You are about to restore <b>${jobFileCount} job files</b> and <b>${userCount} users</b> from the selected file.</p>
                <p class="mt-2">This will <b class="underline">overwrite any existing data</b> with the content from the backup file. Documents not in the backup file will not be affected.</p>
                <p class="mt-2 text-red-600 font-bold">This action cannot be undone. Are you sure you want to proceed?</p>
            `;
            modal.querySelector('#confirm-ok').className = 'bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded';
            openModal('confirm-modal');

            const okButton = modal.querySelector('#confirm-ok');
            const cancelButton = modal.querySelector('#confirm-cancel');

            const onOk = async () => {
                closeConfirm();
                showLoader();
                try {
                    const restoreBatch = writeBatch(db);
                    
                    backupData.data.jobfiles.forEach(jobFile => {
                        const docRef = doc(db, 'jobfiles', jobFile.id);
                        const { id, ...dataToRestore } = jobFile;
                        restoreBatch.set(docRef, dataToRestore);
                    });

                    backupData.data.users.forEach(user => {
                        const docRef = doc(db, 'users', user.id);
                        const { id, ...dataToRestore } = user;
                        restoreBatch.set(docRef, dataToRestore);
                    });

                    await restoreBatch.commit();
                    showNotification("Data restored successfully! The page will now reload.");
                    setTimeout(() => window.location.reload(), 2000);

                } catch (error) {
                    console.error("Restore failed:", error);
                    showNotification("An error occurred during restore. Data may be partially restored.", true);
                } finally {
                    hideLoader();
                }
            };

            const closeConfirm = () => {
                closeModal('confirm-modal');
                okButton.removeEventListener('click', onOk);
            };

            okButton.addEventListener('click', onOk, { once: true });
            cancelButton.addEventListener('click', closeConfirm, { once: true });

        } catch (error) {
            console.error("Error reading restore file:", error);
            showNotification("Failed to read or parse the backup file. Please ensure it's a valid JSON backup.", true);
        } finally {
            event.target.value = '';
        }
    };

    reader.readAsText(file);
}


// --- UI Functions ---
function showLogin() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('analytics-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'none';
    document.getElementById('delivery-request-page').style.display = 'none';
}

function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    document.getElementById('analytics-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'none';
    document.getElementById('delivery-request-page').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    document.getElementById('user-display-name').textContent = currentUser.displayName;
    document.getElementById('user-role').textContent = currentUser.role;

    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.checker-only').forEach(el => el.style.display = 'none');
    
    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
        document.querySelectorAll('.checker-only').forEach(el => el.style.display = 'block');
        document.getElementById('checker-info-banner').style.display = 'block';
    } else if (currentUser.role === 'checker') {
        document.querySelectorAll('.checker-only').forEach(el => el.style.display = 'block');
        document.getElementById('checker-info-banner').style.display = 'block';
    }
    
    clearForm();
}

function showDriverDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'none';
    document.getElementById('analytics-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'block';
    document.getElementById('delivery-request-page').style.display = 'none';
    loadDriverAssignments();
}

// --- Delivery Request System ---
function openDeliveryRequest() {
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('delivery-request-page').style.display = 'block';
    loadApprovedJobFiles();
}

function closeDeliveryRequest() {
    document.getElementById('delivery-request-page').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    resetDeliveryForm();
}

function resetDeliveryForm() {
    document.getElementById('delivery-step-2').classList.add('hidden');
    document.getElementById('delivery-step-3').classList.add('hidden');
    document.getElementById('delivery-job-search').value = '';
    document.getElementById('delivery-job-results').innerHTML = '';
    selectedJobForDelivery = null;
    selectedDriver = null;
}

function loadApprovedJobFiles() {
    const approvedJobs = jobFilesCache.filter(job => job.status === 'approved');
    displayJobFilesForDelivery(approvedJobs);
}

function displayJobFilesForDelivery(jobs) {
    const resultsDiv = document.getElementById('delivery-job-results');
    if (jobs.length === 0) {
        resultsDiv.innerHTML = '<p class="text-gray-500 text-center p-4">No approved job files found.</p>';
        return;
    }

    resultsDiv.innerHTML = jobs.map(job => `
        <div class="border p-3 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer" onclick="selectJobForDelivery('${job.id}')">
            <div class="flex justify-between items-center">
                <div>
                    <p class="font-bold text-indigo-700">${job.jfn || 'No ID'}</p>
                    <p class="text-sm text-gray-600">Shipper: ${job.sh || 'N/A'}</p>
                    <p class="text-sm text-gray-600">Consignee: ${job.co || 'N/A'}</p>
                    <p class="text-xs text-gray-500">MAWB: ${job.mawb || 'N/A'}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-medium">Destination: ${job.de || 'N/A'}</p>
                    <p class="text-xs text-gray-500">Pieces: ${job.pc || 'N/A'}</p>
                </div>
            </div>
        </div>
    `).join('');
}

function selectJobForDelivery(jobId) {
    selectedJobForDelivery = jobFilesCache.find(job => job.id === jobId);
    if (selectedJobForDelivery) {
        document.getElementById('selected-job-info').innerHTML = `
            <h4 class="font-bold text-lg mb-2">Selected Job File: ${selectedJobForDelivery.jfn}</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Shipper:</strong> ${selectedJobForDelivery.sh || 'N/A'}</div>
                <div><strong>Consignee:</strong> ${selectedJobForDelivery.co || 'N/A'}</div>
                <div><strong>Destination:</strong> ${selectedJobForDelivery.de || 'N/A'}</div>
                <div><strong>Pieces:</strong> ${selectedJobForDelivery.pc || 'N/A'}</div>
            </div>
        `;
        document.getElementById('delivery-step-2').classList.remove('hidden');
    }
}

// Firebase configuration
const firebaseConfig = {
    // Your Firebase config will be here
    // This is a placeholder - replace with your actual config
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global variables for backward compatibility
let currentFileId = null;