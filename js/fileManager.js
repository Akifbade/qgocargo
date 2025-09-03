// File Manager Module
let allJobFiles = [];
let filteredJobFiles = [];

// Show file manager
function showFileManager() {
    document.getElementById('file-manager-modal').style.display = 'flex';
    loadAllJobFiles();
}

// Hide file manager
function hideFileManager() {
    document.getElementById('file-manager-modal').style.display = 'none';
}

// Load all job files
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

// Search job files
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

// Filter by status
function filterByStatus() {
    const status = document.getElementById('status-filter').value;
    
    if (status === 'all') {
        filteredJobFiles = [...allJobFiles];
    } else {
        filteredJobFiles = allJobFiles.filter(file => (file.status || 'pending') === status);
    }
    
    renderJobFilesList();
}

// Render job files list
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

// Load specific job file
async function loadJobFile(fileId) {
    try {
        const doc = await firebase.firestore().collection('jobFiles').doc(fileId).get();
        
        if (doc.exists) {
            const data = doc.data();
            
            // Populate form fields
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
            
            // Load charges table
            if (data.charges && Array.isArray(data.charges)) {
                loadChargesTable(data.charges);
            }
            
            // Set current file ID for updates
            window.currentFileId = fileId;
            
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

// Delete job file
async function deleteJobFile(fileId) {
    if (!confirm('Are you sure you want to delete this job file?')) {
        return;
    }
    
    try {
        await firebase.firestore().collection('jobFiles').doc(fileId).delete();
        showNotification('Job file deleted successfully', 'success');
        loadAllJobFiles(); // Refresh the list
        
    } catch (error) {
        console.error('Error deleting job file:', error);
        showNotification('Error deleting job file', 'error');
    }
}

// Load charges table
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
    
    // Recalculate total
    if (window.calculateTotal) {
        window.calculateTotal();
    }
}

// Get status color
function getStatusColor(status) {
    const colors = {
        pending: '#fbbf24',
        approved: '#10b981',
        rejected: '#ef4444',
        checked: '#3b82f6'
    };
    return colors[status] || '#6b7280';
}

// Export file manager functions
window.fileManagerModule = {
    showFileManager,
    hideFileManager,
    searchJobFiles,
    filterByStatus,
    loadJobFile,
    deleteJobFile
};