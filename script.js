// Job File Management System - Complete Application

// Global variables
let currentFileId = null;
let allClients = [];
let currentUser = null;
let userRole = null;
let allJobFiles = [];
let filteredJobFiles = [];
let availableDrivers = [];
let selectedJobFile = null;
let analyticsData = {};
let allUsers = [];
let driverAssignments = [];
let currentAssignment = null;

// Firebase configuration - YOU MUST REPLACE THESE WITH YOUR ACTUAL VALUES
const firebaseConfig = {
    apiKey: "AIzaSyBvOkBwGyRlnfvH5diadeM1aK02nEcOfFg",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef123456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize the application
function initializeApp() {
    initializeAuth();
    setupEventListeners();
    loadClients();
}

// Setup event listeners
function setupEventListeners() {
    const form = document.getElementById('job-file-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveJobFile();
        });
    }
    
    const formInputs = document.querySelectorAll('#job-file-form input, #job-file-form select, #job-file-form textarea');
    formInputs.forEach(input => {
        input.addEventListener('change', autoSave);
    });
}

// Auto-save functionality
let autoSaveTimeout;
function autoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        if (currentFileId) {
            saveJobFile(true);
        }
    }, 2000);
}

// Authentication Functions
function initializeAuth() {
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            try {
                const userDoc = await firebase.firestore().collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    userRole = userDoc.data().role || 'user';
                    
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

function showLogin() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'none';
}

function showMainApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
    document.getElementById('driver-dashboard').style.display = 'none';
    
    updateUIForRole();
    setTimeout(loadJobFiles, 1000);
}

function showDriverDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('driver-dashboard').style.display = 'block';
    
    loadDriverDashboard();
}

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

async function logout() {
    try {
        await firebase.auth().signOut();
        showNotification('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed: ' + error.message, 'error');
    }
}

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

// Main Application Functions
async function loadJobFiles() {
    if (!currentUser) return;
    
    try {
        const snapshot = await firebase.firestore().collection('jobFiles').orderBy('createdAt', 'desc').limit(10).get();
        const jobFiles = [];
        
        snapshot.forEach(doc => {
            jobFiles.push({ id: doc.id, ...doc.data() });
        });
        
        updateRecentFiles(jobFiles);
        
    } catch (error) {
        console.error('Error loading job files:', error);
        if (currentUser) {
            showNotification('Error loading job files', 'error');
        }
    }
}

function updateRecentFiles(jobFiles) {
    console.log('Recent job files:', jobFiles);
}

async function saveJobFile(silent = false) {
    if (!currentUser) {
        showNotification('Please login to save job files', 'error');
        return;
    }
    
    const formData = collectFormData();
    
    try {
        if (currentFileId) {
            await firebase.firestore().collection('jobFiles').doc(currentFileId).update({
                ...formData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            });
            
            if (!silent) {
                showNotification('Job file updated successfully!', 'success');
            }
        } else {
            const docRef = await firebase.firestore().collection('jobFiles').add({
                ...formData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid,
                status: 'pending'
            });
            
            currentFileId = docRef.id;
            
            if (!silent) {
                showNotification('Job file saved successfully!', 'success');
            }
        }
        
        loadJobFiles();
        
    } catch (error) {
        console.error('Error saving job file:', error);
        if (!silent) {
            showNotification('Error saving job file', 'error');
        }
    }
}

function collectFormData() {
    const formData = {};
    
    const fields = [
        'jobFileNo', 'clientName', 'clientEmail', 'clientPhone', 'clientAddress',
        'serviceType', 'priority', 'description', 'remarks', 'totalAmount'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            if (element.type === 'checkbox') {
                formData[field] = element.checked;
            } else {
                formData[field] = element.value;
            }
        }
    });
    
    formData.charges = collectChargesData();
    
    return formData;
}

function collectChargesData() {
    const charges = [];
    const rows = document.querySelectorAll('#charges-table tbody tr');
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 4) {
            charges.push({
                description: inputs[0].value,
                quantity: parseFloat(inputs[1].value) || 0,
                rate: parseFloat(inputs[2].value) || 0,
                amount: parseFloat(inputs[3].value) || 0
            });
        }
    });
    
    return charges;
}

function addChargeRow() {
    const tbody = document.querySelector('#charges-table tbody');
    const row = tbody.insertRow();
    
    row.innerHTML = `
        <td class="table-cell"><input type="text" placeholder="Description" onchange="calculateTotal()"></td>
        <td class="table-cell"><input type="number" placeholder="Qty" min="0" step="0.01" onchange="calculateTotal()"></td>
        <td class="table-cell"><input type="number" placeholder="Rate" min="0" step="0.01" onchange="calculateTotal()"></td>
        <td class="table-cell"><input type="number" placeholder="Amount" readonly></td>
        <td class="table-cell">
            <button onclick="removeChargeRow(this)" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer;">Remove</button>
        </td>
    `;
    
    calculateTotal();
}

function removeChargeRow(button) {
    const row = button.closest('tr');
    row.remove();
    calculateTotal();
}

function calculateTotal() {
    const rows = document.querySelectorAll('#charges-table tbody tr');
    let total = 0;
    
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 4) {
            const quantity = parseFloat(inputs[1].value) || 0;
            const rate = parseFloat(inputs[2].value) || 0;
            const amount = quantity * rate;
            
            inputs[3].value = amount.toFixed(2);
            total += amount;
        }
    });
    
    document.getElementById('totalAmount').value = total.toFixed(2);
}

async function loadClients() {
    try {
        const snapshot = await firebase.firestore().collection('clients').get();
        allClients = [];
        
        snapshot.forEach(doc => {
            allClients.push({ id: doc.id, ...doc.data() });
        });
        
        setupClientAutocomplete();
        
    } catch (error) {
        console.error('Error loading clients:', error);
    }
}

function setupClientAutocomplete() {
    const clientNameInput = document.getElementById('clientName');
    if (!clientNameInput) return;
    
    clientNameInput.addEventListener('input', function() {
        const value = this.value.toLowerCase();
        if (value.length < 2) return;
        
        const matches = allClients.filter(client => 
            client.name && client.name.toLowerCase().includes(value)
        );
        
        showAutocompleteResults(matches, clientNameInput);
    });
}

function showAutocompleteResults(matches, inputElement) {
    const existingSuggestions = document.querySelector('.autocomplete-suggestions');
    if (existingSuggestions) {
        existingSuggestions.remove();
    }
    
    if (matches.length === 0) return;
    
    const suggestions = document.createElement('div');
    suggestions.className = 'autocomplete-suggestions';
    suggestions.style.position = 'absolute';
    suggestions.style.top = inputElement.offsetTop + inputElement.offsetHeight + 'px';
    suggestions.style.left = inputElement.offsetLeft + 'px';
    suggestions.style.width = inputElement.offsetWidth + 'px';
    
    matches.slice(0, 5).forEach(client => {
        const suggestion = document.createElement('div');
        suggestion.className = 'autocomplete-suggestion';
        suggestion.textContent = client.name;
        suggestion.onclick = () => selectClient(client);
        suggestions.appendChild(suggestion);
    });
    
    inputElement.parentNode.appendChild(suggestions);
}

function selectClient(client) {
    document.getElementById('clientName').value = client.name || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientPhone').value = client.phone || '';
    document.getElementById('clientAddress').value = client.address || '';
    
    const suggestions = document.querySelector('.autocomplete-suggestions');
    if (suggestions) {
        suggestions.remove();
    }
}

function newJobFile() {
    currentFileId = null;
    
    document.getElementById('job-file-form').reset();
    
    const tbody = document.querySelector('#charges-table tbody');
    tbody.innerHTML = '';
    
    addChargeRow();
    
    generateJobFileNumber();
    
    showNotification('New job file created', 'success');
}

function generateJobFileNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    
    const jobFileNo = `JF${year}${month}${day}${time}`;
    document.getElementById('jobFileNo').value = jobFileNo;
}

function printJobFile() {
    const printContent = generatePrintContent();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Job File - ${document.getElementById('jobFileNo').value}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 20px; }
                    .field { margin-bottom: 10px; }
                    .label { font-weight: bold; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    @media print { body { margin: 0; } }
                </style>
            </head>
            <body>
                ${printContent}
            </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

function generatePrintContent() {
    const formData = collectFormData();
    
    return `
        <div class="header">
            <h1>Job File</h1>
            <h2>${formData.jobFileNo || 'N/A'}</h2>
        </div>
        
        <div class="section">
            <h3>Client Information</h3>
            <div class="field"><span class="label">Name:</span> ${formData.clientName || 'N/A'}</div>
            <div class="field"><span class="label">Email:</span> ${formData.clientEmail || 'N/A'}</div>
            <div class="field"><span class="label">Phone:</span> ${formData.clientPhone || 'N/A'}</div>
            <div class="field"><span class="label">Address:</span> ${formData.clientAddress || 'N/A'}</div>
        </div>
        
        <div class="section">
            <h3>Service Details</h3>
            <div class="field"><span class="label">Service Type:</span> ${formData.serviceType || 'N/A'}</div>
            <div class="field"><span class="label">Priority:</span> ${formData.priority || 'N/A'}</div>
            <div class="field"><span class="label">Description:</span> ${formData.description || 'N/A'}</div>
        </div>
        
        <div class="section">
            <h3>Charges</h3>
            <table>
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Rate</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${formData.charges.map(charge => `
                        <tr>
                            <td>${charge.description || 'N/A'}</td>
                            <td>${charge.quantity || 0}</td>
                            <td>₹${charge.rate || 0}</td>
                            <td>₹${charge.amount || 0}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div style="text-align: right; font-weight: bold; font-size: 1.2em;">
                Total: ₹${formData.totalAmount || '0'}
            </div>
        </div>
        
        ${formData.remarks ? `
            <div class="section">
                <h3>Remarks</h3>
                <p>${formData.remarks}</p>
            </div>
        ` : ''}
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `show ${type}`;
    
    setTimeout(() => {
        notification.className = '';
    }, 3000);
}

// File Manager Functions
function showFileManager() {
    document.getElementById('file-manager-modal').style.display = 'flex';
    loadAllJobFiles();
}

function hideFileManager() {
    document.getElementById('file-manager-modal').style.display = 'none';
}

async function loadAllJobFiles() {
    try {
        const snapshot = await firebase.firestore().collection('jobFiles').orderBy('createdAt', 'desc').get();
        allJobFiles = [];
        
        snapshot.forEach(doc => {
            allJobFiles.push({ id: doc.id, ...doc.data() });
        });
        
        filteredJobFiles = [...allJobFiles];
        renderJobFilesList();
        
    } catch (error) {
        console.error('Error loading job files:', error);
        showNotification('Error loading job files', 'error');
    }
}

function searchJobFiles() {
    const searchTerm = document.getElementById('file-search').value.toLowerCase();
    
    if (!searchTerm) {
        filteredJobFiles = [...allJobFiles];
    } else {
        filteredJobFiles = allJobFiles.filter(file => 
            (file.jobFileNo && file.jobFileNo.toLowerCase().includes(searchTerm)) ||
            (file.clientName && file.clientName.toLowerCase().includes(searchTerm)) ||
            (file.clientEmail && file.clientEmail.toLowerCase().includes(searchTerm)) ||
            (file.clientPhone && file.clientPhone.toLowerCase().includes(searchTerm))
        );
    }
    
    renderJobFilesList();
}

function filterByStatus() {
    const status = document.getElementById('status-filter').value;
    
    if (status === 'all') {
        filteredJobFiles = [...allJobFiles];
    } else {
        filteredJobFiles = allJobFiles.filter(file => (file.status || 'pending') === status);
    }
    
    renderJobFilesList();
}

function renderJobFilesList() {
    const container = document.getElementById('job-files-list');
    
    if (filteredJobFiles.length === 0) {
        container.innerHTML = '<p>No job files found</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 0.5rem; text-align: left; border: 1px solid #d1d5db;">Job File No.</th>
                    <th style="padding: 0.5rem; text-align: left; border: 1px solid #d1d5db;">Client</th>
                    <th style="padding: 0.5rem; text-align: left; border: 1px solid #d1d5db;">Status</th>
                    <th style="padding: 0.5rem; text-align: left; border: 1px solid #d1d5db;">Amount</th>
                    <th style="padding: 0.5rem; text-align: left; border: 1px solid #d1d5db;">Date</th>
                    <th style="padding: 0.5rem; text-align: left; border: 1px solid #d1d5db;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filteredJobFiles.map(file => `
                    <tr>
                        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">${file.jobFileNo || 'N/A'}</td>
                        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">
                            <div>${file.clientName || 'N/A'}</div>
                            <div style="font-size: 0.8rem; color: #6b7280;">${file.clientEmail || ''}</div>
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">
                            <span style="padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: bold; 
                                background: ${getStatusColor(file.status)}; color: white;">
                                ${(file.status || 'pending').toUpperCase()}
                            </span>
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">₹${file.totalAmount || '0'}</td>
                        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">
                            ${file.createdAt ? file.createdAt.toDate().toLocaleDateString() : 'N/A'}
                        </td>
                        <td style="padding: 0.5rem; border: 1px solid #d1d5db;">
                            <button onclick="loadJobFile('${file.id}')" 
                                    style="background: #3b82f6; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer; margin-right: 0.25rem;">
                                Load
                            </button>
                            <button onclick="deleteJobFile('${file.id}')" 
                                    style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadJobFile(fileId) {
    try {
        const doc = await firebase.firestore().collection('jobFiles').doc(fileId).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            Object.keys(data).forEach(key => {
                const element = document.getElementById(key);
                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = data[key] || false;
                    } else {
                        element.value = data[key] || '';
                    }
                }
            });
            
            if (data.charges && Array.isArray(data.charges)) {
                loadChargesTable(data.charges);
            }
            
            currentFileId = fileId;
            
            hideFileManager();
            showNotification('Job file loaded successfully', 'success');
            
        } else {
            showNotification('Job file not found', 'error');
        }
        
    } catch (error) {
        console.error('Error loading job file:', error);
        showNotification('Error loading job file', 'error');
    }
}

async function deleteJobFile(fileId) {
    if (!confirm('Are you sure you want to delete this job file?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection('jobFiles').doc(fileId).delete();
        showNotification('Job file deleted successfully', 'success');
        loadAllJobFiles();
        
    } catch (error) {
        console.error('Error deleting job file:', error);
        showNotification('Error deleting job file', 'error');
    }
}

function loadChargesTable(charges) {
    const tbody = document.querySelector('#charges-table tbody');
    tbody.innerHTML = '';
    
    charges.forEach(charge => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td class="table-cell"><input type="text" value="${charge.description || ''}" onchange="calculateTotal()"></td>
            <td class="table-cell"><input type="number" value="${charge.quantity || 0}" onchange="calculateTotal()"></td>
            <td class="table-cell"><input type="number" value="${charge.rate || 0}" onchange="calculateTotal()"></td>
            <td class="table-cell"><input type="number" value="${charge.amount || 0}" readonly></td>
            <td class="table-cell">
                <button onclick="removeChargeRow(this)" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer;">Remove</button>
            </td>
        `;
    });
    
    calculateTotal();
}

function getStatusColor(status) {
    const colors = {
        pending: '#fbbf24',
        approved: '#10b981',
        rejected: '#ef4444',
        checked: '#3b82f6'
    };
    return colors[status] || '#6b7280';
}

// Status Update Function
async function updateJobFileStatus(status) {
    if (!currentFileId) {
        showNotification('No job file loaded', 'error');
        return;
    }
    
    if (userRole !== 'admin' && userRole !== 'checker') {
        showNotification('Access denied. Admin or Checker privileges required.', 'error');
        return;
    }
    
    try {
        await firebase.firestore().collection('jobFiles').doc(currentFileId).update({
            status: status,
            statusUpdatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            statusUpdatedBy: currentUser.uid
        });
        
        showNotification(`Job file ${status} successfully!`, 'success');
        
        addStatusStamp(status);
        
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification('Error updating status', 'error');
    }
}

function addStatusStamp(status) {
    const existingStamps = document.querySelectorAll('.stamp');
    existingStamps.forEach(stamp => stamp.remove());
    
    const stamp = document.createElement('div');
    stamp.className = `stamp stamp-${status}`;
    stamp.textContent = status;
    stamp.style.display = 'block';
    
    const container = document.querySelector('.container');
    container.style.position = 'relative';
    container.appendChild(stamp);
}

// Admin Functions (simplified)
function showAdminPanel() {
    if (userRole !== 'admin') {
        showNotification('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    document.getElementById('admin-modal').style.display = 'flex';
    loadUsers();
}

function hideAdminPanel() {
    document.getElementById('admin-modal').style.display = 'none';
}

async function loadUsers() {
    try {
        const snapshot = await firebase.firestore().collection('users').get();
        allUsers = [];
        
        snapshot.forEach(doc => {
            allUsers.push({ id: doc.id, ...doc.data() });
        });
        
        renderUsersList();
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

function renderUsersList() {
    const container = document.getElementById('users-list');
    
    if (allUsers.length === 0) {
        container.innerHTML = '<p>No users found</p>';
        return;
    }
    
    container.innerHTML = `
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Name</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Email</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Role</th>
                    <th style="padding: 0.75rem; text-align: left; border: 1px solid #d1d5db;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${allUsers.map(user => `
                    <tr>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">${user.name || 'N/A'}</td>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">${user.email}</td>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">
                            <select onchange="updateUserRole('${user.id}', this.value)" 
                                    style="padding: 0.25rem; border: 1px solid #d1d5db; border-radius: 0.25rem;">
                                <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                                <option value="checker" ${user.role === 'checker' ? 'selected' : ''}>Checker</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="driver" ${user.role === 'driver' ? 'selected' : ''}>Driver</option>
                            </select>
                        </td>
                        <td style="padding: 0.75rem; border: 1px solid #d1d5db;">
                            <button onclick="deleteUser('${user.id}')" 
                                    style="background: #ef4444; color: white; padding: 0.25rem 0.5rem; border: none; border-radius: 0.25rem; cursor: pointer;">
                                Delete
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function updateUserRole(userId, newRole) {
    try {
        await firebase.firestore().collection('users').doc(userId).update({
            role: newRole,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification(`User role updated to ${newRole}`, 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error updating user role:', error);
        showNotification('Error updating user role', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection('users').doc(userId).delete();
        showNotification('User deleted successfully', 'success');
        loadUsers();
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification('Error deleting user', 'error');
    }
}

async function addNewUser() {
    const name = document.getElementById('new-user-name').value;
    const email = document.getElementById('new-user-email').value;
    const password = document.getElementById('new-user-password').value;
    const role = document.getElementById('new-user-role').value;
    
    if (!name || !email || !password) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    try {
        const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            role: role,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('User created successfully', 'success');
        
        document.getElementById('new-user-name').value = '';
        document.getElementById('new-user-email').value = '';
        document.getElementById('new-user-password').value = '';
        document.getElementById('new-user-role').value = 'user';
        
        loadUsers();
        
    } catch (error) {
        console.error('Error creating user:', error);
        showNotification('Error creating user: ' + error.message, 'error');
    }
}

// Simplified Delivery Functions
function showDeliveryRequest() {
    showNotification('Delivery feature available in full version', 'info');
}

function hideDeliveryRequest() {
    // Placeholder
}

// Simplified Analytics Functions
function showAnalytics() {
    if (userRole !== 'admin') {
        showNotification('Access denied. Admin privileges required.', 'error');
        return;
    }
    showNotification('Analytics feature available in full version', 'info');
}

function hideAnalytics() {
    // Placeholder
}

// Simplified Driver Functions
async function loadDriverDashboard() {
    if (!currentUser) return;
    
    try {
        const snapshot = await firebase.firestore()
            .collection('delivery_requests')
            .where('driverId', '==', currentUser.uid)
            .orderBy('createdAt', 'desc')
            .get();
        
        driverAssignments = [];
        snapshot.forEach(doc => {
            driverAssignments.push({ id: doc.id, ...doc.data() });
        });
        
        renderDriverStats();
        renderDriverAssignments();
        
    } catch (error) {
        console.error('Error loading driver assignments:', error);
        showNotification('Error loading assignments', 'error');
    }
}

function renderDriverStats() {
    const pending = driverAssignments.filter(a => a.status === 'assigned').length;
    const inTransit = driverAssignments.filter(a => a.status === 'in_transit').length;
    const deliveredToday = 0; // Simplified
    const totalDelivered = driverAssignments.filter(a => a.status === 'delivered').length;
    
    document.getElementById('driver-stats').innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">Pending</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${pending}</p>
            </div>
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">In Transit</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${inTransit}</p>
            </div>
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">Delivered Today</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${deliveredToday}</p>
            </div>
            <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 1.5rem; border-radius: 0.5rem; text-align: center;">
                <h3 style="margin: 0 0 0.5rem 0;">Total Delivered</h3>
                <p style="margin: 0; font-size: 2rem; font-weight: bold;">${totalDelivered}</p>
            </div>
        </div>
    `;
}

function renderDriverAssignments() {
    const container = document.getElementById('driver-assignments');
    
    if (driverAssignments.length === 0) {
        container.innerHTML = '<p>No assignments found</p>';
        return;
    }
    
    container.innerHTML = driverAssignments.map(assignment => `
        <div style="background: white; padding: 1.5rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem;">
            <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin: 0 0 0.5rem 0;">Job File: ${assignment.jobFileNo || 'N/A'}</h3>
                    <p style="margin: 0; color: #6b7280;">Client: ${assignment.clientName || 'N/A'}</p>
                </div>
                <span style="padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: bold; 
                    background: ${getDeliveryStatusColor(assignment.status)}; color: white;">
                    ${(assignment.status || 'assigned').toUpperCase()}
                </span>
            </div>
            
            <div style="margin-bottom: 1rem;">
                <p style="margin: 0 0 0.25rem 0;"><strong>Address:</strong> ${assignment.deliveryAddress || 'N/A'}</p>
                <p style="margin: 0 0 0.25rem 0;"><strong>Contact:</strong> ${assignment.deliveryContact || 'N/A'}</p>
            </div>
        </div>
    `).join('');
}

function getDeliveryStatusColor(status) {
    const colors = {
        assigned: '#fbbf24',
        in_transit: '#3b82f6',
        delivered: '#10b981'
    };
    return colors[status] || '#6b7280';
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});