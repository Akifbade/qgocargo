// Delivery Request Module
let availableDrivers = [];
let selectedJobFile = null;

// Show delivery request page
function showDeliveryRequest() {
    document.getElementById('delivery-request-container').style.display = 'block';
    document.getElementById('main-container').style.display = 'none';
    loadApprovedJobFiles();
    loadAvailableDrivers();
}

// Hide delivery request page
function hideDeliveryRequest() {
    document.getElementById('delivery-request-container').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';
}

// Load approved job files for delivery
async function loadApprovedJobFiles() {
    try {
        const snapshot = await firebase.firestore()
            .collection('jobFiles')
            .where('status', '==', 'approved')
            .orderBy('createdAt', 'desc')
            .get();
        
        const jobFiles = [];
        snapshot.forEach(doc => {
            jobFiles.push({ id: doc.id, ...doc.data() });
        });
        
        renderJobFileSearch(jobFiles);
        
    } catch (error) {
        console.error('Error loading approved job files:', error);
        showNotification('Error loading job files', 'error');
    }
}

// Render job file search results
function renderJobFileSearch(jobFiles) {
    const container = document.getElementById('job-file-search-results');
    
    if (jobFiles.length === 0) {
        container.innerHTML = '<p>No approved job files available for delivery</p>';
        return;
    }
    
    container.innerHTML = jobFiles.map(file => `
        <div onclick="selectJobFile('${file.id}')" 
             style="padding: 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; cursor: pointer; margin-bottom: 0.5rem; 
                    ${selectedJobFile?.id === file.id ? 'background: #eff6ff; border-color: #3b82f6;' : 'background: white;'}">
            <div style="font-weight: bold;">${file.jobFileNo || 'N/A'}</div>
            <div style="color: #6b7280; font-size: 0.9rem;">${file.clientName || 'N/A'}</div>
            <div style="color: #6b7280; font-size: 0.8rem;">Amount: ₹${file.totalAmount || '0'}</div>
        </div>
    `).join('');
}

// Search job files
function searchJobFiles() {
    const searchTerm = document.getElementById('job-file-search').value.toLowerCase();
    
    if (!searchTerm) {
        loadApprovedJobFiles();
        return;
    }
    
    firebase.firestore()
        .collection('jobFiles')
        .where('status', '==', 'approved')
        .get()
        .then(snapshot => {
            const jobFiles = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if ((data.jobFileNo && data.jobFileNo.toLowerCase().includes(searchTerm)) ||
                    (data.clientName && data.clientName.toLowerCase().includes(searchTerm))) {
                    jobFiles.push({ id: doc.id, ...data });
                }
            });
            renderJobFileSearch(jobFiles);
        })
        .catch(error => {
            console.error('Error searching job files:', error);
        });
}

// Select job file for delivery
async function selectJobFile(fileId) {
    try {
        const doc = await firebase.firestore().collection('jobFiles').doc(fileId).get();
        if (doc.exists) {
            selectedJobFile = { id: doc.id, ...doc.data() };
            renderJobFileSearch([selectedJobFile]); // Re-render to show selection
            
            // Show step 2
            document.getElementById('delivery-step-1').style.display = 'none';
            document.getElementById('delivery-step-2').style.display = 'block';
            
            // Pre-fill delivery address if available
            if (selectedJobFile.clientAddress) {
                document.getElementById('delivery-address').value = selectedJobFile.clientAddress;
            }
            if (selectedJobFile.clientPhone) {
                document.getElementById('delivery-contact').value = selectedJobFile.clientPhone;
            }
        }
    } catch (error) {
        console.error('Error selecting job file:', error);
        showNotification('Error selecting job file', 'error');
    }
}

// Go to next step
function nextDeliveryStep() {
    const address = document.getElementById('delivery-address').value;
    const contact = document.getElementById('delivery-contact').value;
    const type = document.getElementById('delivery-type').value;
    
    if (!address || !contact) {
        showNotification('Please fill in delivery address and contact', 'error');
        return;
    }
    
    document.getElementById('delivery-step-2').style.display = 'none';
    document.getElementById('delivery-step-3').style.display = 'block';
}

// Go to previous step
function prevDeliveryStep(currentStep) {
    if (currentStep === 2) {
        document.getElementById('delivery-step-2').style.display = 'none';
        document.getElementById('delivery-step-1').style.display = 'block';
    } else if (currentStep === 3) {
        document.getElementById('delivery-step-3').style.display = 'none';
        document.getElementById('delivery-step-2').style.display = 'block';
    }
}

// Load available drivers
async function loadAvailableDrivers() {
    try {
        const snapshot = await firebase.firestore()
            .collection('users')
            .where('role', '==', 'driver')
            .get();
        
        availableDrivers = [];
        snapshot.forEach(doc => {
            availableDrivers.push({ id: doc.id, ...doc.data() });
        });
        
        renderDriverSelection();
        
    } catch (error) {
        console.error('Error loading drivers:', error);
        showNotification('Error loading drivers', 'error');
    }
}

// Render driver selection
function renderDriverSelection() {
    const container = document.getElementById('driver-selection');
    
    if (availableDrivers.length === 0) {
        container.innerHTML = '<p>No drivers available. Please contact admin to add drivers.</p>';
        return;
    }
    
    container.innerHTML = availableDrivers.map(driver => `
        <div onclick="selectDriver('${driver.id}')" 
             style="padding: 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; cursor: pointer; margin-bottom: 0.5rem; background: white;">
            <div style="font-weight: bold;">${driver.name || 'N/A'}</div>
            <div style="color: #6b7280; font-size: 0.9rem;">${driver.email}</div>
            <div style="color: #6b7280; font-size: 0.8rem;">Driver ID: ${driver.id.substring(0, 8)}</div>
        </div>
    `).join('');
}

// Select driver and create delivery request
async function selectDriver(driverId) {
    if (!selectedJobFile) {
        showNotification('No job file selected', 'error');
        return;
    }
    
    const deliveryData = {
        jobFileId: selectedJobFile.id,
        jobFileNo: selectedJobFile.jobFileNo,
        clientName: selectedJobFile.clientName,
        driverId: driverId,
        driverName: availableDrivers.find(d => d.id === driverId)?.name || 'Unknown',
        deliveryAddress: document.getElementById('delivery-address').value,
        deliveryContact: document.getElementById('delivery-contact').value,
        deliveryType: document.getElementById('delivery-type').value,
        scheduledDate: document.getElementById('delivery-date').value,
        scheduledTime: document.getElementById('delivery-time').value,
        specialInstructions: document.getElementById('delivery-instructions').value,
        status: 'assigned',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: window.authModule.getCurrentUser().uid
    };
    
    try {
        await firebase.firestore().collection('delivery_requests').add(deliveryData);
        
        showNotification('Delivery request created successfully!', 'success');
        
        // Reset form
        resetDeliveryForm();
        hideDeliveryRequest();
        
    } catch (error) {
        console.error('Error creating delivery request:', error);
        showNotification('Error creating delivery request', 'error');
    }
}

// Reset delivery form
function resetDeliveryForm() {
    selectedJobFile = null;
    document.getElementById('job-file-search').value = '';
    document.getElementById('delivery-address').value = '';
    document.getElementById('delivery-contact').value = '';
    document.getElementById('delivery-type').value = 'standard';
    document.getElementById('delivery-date').value = '';
    document.getElementById('delivery-time').value = '';
    document.getElementById('delivery-instructions').value = '';
    
    // Reset steps
    document.getElementById('delivery-step-1').style.display = 'block';
    document.getElementById('delivery-step-2').style.display = 'none';
    document.getElementById('delivery-step-3').style.display = 'none';
    
    loadApprovedJobFiles();
}

// Export delivery functions
window.deliveryModule = {
    showDeliveryRequest,
    hideDeliveryRequest,
    searchJobFiles,
    selectJobFile,
    nextDeliveryStep,
    prevDeliveryStep,
    selectDriver
};