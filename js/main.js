// Main Application Module
let currentFileId = null;
let allClients = [];

// Initialize the application
function initializeApp() {
    // Initialize Firebase modules
    if (window.authModule) {
        window.authModule.initializeAuth();
    }
    
    // Initialize driver module
    if (window.driverModule) {
        window.driverModule.initializeDriverModule();
    }
    
    // Set up event listeners
    setupEventListeners();
    
    // Load initial data
    loadClients();
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    const form = document.getElementById('job-file-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            saveJobFile();
        });
    }
    
    // Auto-save functionality
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
            saveJobFile(true); // Silent save
        }
    }, 2000);
}

// Load job files
async function loadJobFiles() {
    const currentUser = window.authModule.getCurrentUser();
    if (!currentUser) {
        console.log('User not authenticated, skipping job files load');
        return;
    }
    
    // Double-check Firebase auth state
    const firebaseUser = firebase.auth().currentUser;
    if (!firebaseUser) {
        console.log('Firebase user not ready, retrying...');
        setTimeout(loadJobFiles, 500);
        return;
    }
    
    try {
        const snapshot = await firebase.firestore().collection('jobFiles').orderBy('createdAt', 'desc').limit(10).get();
        const jobFiles = [];
        
        snapshot.forEach(doc => {
            jobFiles.push({ id: doc.id, ...doc.data() });
        });
        
        // Update recent files dropdown or display
        updateRecentFiles(jobFiles);
        
    } catch (error) {
        console.error('Error loading job files:', error);
        // Only show notification if user is authenticated
        if (currentUser) {
            showNotification('Error loading job files: ' + error.message, 'error');
        }
    }
}

// Update recent files display
function updateRecentFiles(jobFiles) {
    // This can be implemented to show recent files in a dropdown or sidebar
    console.log('Recent job files:', jobFiles);
}

// Save job file
async function saveJobFile(silent = false) {
    const currentUser = window.authModule.getCurrentUser();
    if (!currentUser) {
        showNotification('Please login to save job files', 'error');
        return;
    }
    
    // Collect form data
    const formData = collectFormData();
    
    try {
        if (currentFileId) {
            // Update existing file
            await firebase.firestore().collection('jobFiles').doc(currentFileId).update({
                ...formData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: currentUser.uid
            });
            
            if (!silent) {
                showNotification('Job file updated successfully!', 'success');
            }
        } else {
            // Create new file
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
        
        // Refresh job files list
        loadJobFiles();
        
    } catch (error) {
        console.error('Error saving job file:', error);
        if (!silent) {
            showNotification('Error saving job file', 'error');
        }
    }
}

// Collect form data
function collectFormData() {
    const formData = {};
    
    // Basic form fields
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
    
    // Collect charges table data
    formData.charges = collectChargesData();
    
    return formData;
}

// Collect charges data
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

// Add charge row
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

// Remove charge row
function removeChargeRow(button) {
    const row = button.closest('tr');
    row.remove();
    calculateTotal();
}

// Calculate total
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

// Load clients for autocomplete
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

// Setup client autocomplete
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

// Show autocomplete results
function showAutocompleteResults(matches, inputElement) {
    // Remove existing suggestions
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

// Select client from autocomplete
function selectClient(client) {
    document.getElementById('clientName').value = client.name || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientPhone').value = client.phone || '';
    document.getElementById('clientAddress').value = client.address || '';
    
    // Remove suggestions
    const suggestions = document.querySelector('.autocomplete-suggestions');
    if (suggestions) {
        suggestions.remove();
    }
}

// New job file
function newJobFile() {
    currentFileId = null;
    
    // Clear form
    document.getElementById('job-file-form').reset();
    
    // Clear charges table
    const tbody = document.querySelector('#charges-table tbody');
    tbody.innerHTML = '';
    
    // Add one empty row
    addChargeRow();
    
    // Generate new job file number
    generateJobFileNumber();
    
    showNotification('New job file created', 'success');
}

// Generate job file number
function generateJobFileNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    
    const jobFileNo = `JF${year}${month}${day}${time}`;
    document.getElementById('jobFileNo').value = jobFileNo;
}

// Print job file
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

// Generate print content
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

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    notification.textContent = message;
    notification.className = `show ${type}`;
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        notification.className = '';
    }, 3000);
}

// Export main functions for global access
window.mainModule = {
    initializeApp,
    loadJobFiles,
    saveJobFile,
    newJobFile,
    printJobFile,
    addChargeRow,
    removeChargeRow,
    calculateTotal,
    showNotification
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.mainModule.initializeApp();
});