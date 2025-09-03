import { JobFileService } from '../services/JobFileService.js';
import { ClientService } from '../services/ClientService.js';

export class JobFilePage {
    constructor() {
        this.jobFileService = new JobFileService(window.app.db);
        this.clientService = new ClientService(window.app.db);
        this.chargeDescriptions = [];
        this.currentJobFile = null;
    }

    async render() {
        return `
            <div class="min-h-screen bg-gray-100">
                <!-- Navigation -->
                <nav class="bg-white shadow-sm border-b">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center py-4">
                            <div class="flex items-center space-x-4">
                                <div class="text-2xl font-bold" style="color: #0E639C;">
                                    Q'go<span style="color: #4FB8AF;">Cargo</span>
                                </div>
                                <span class="text-gray-400">|</span>
                                <span class="text-lg font-semibold text-gray-700">Job File Management</span>
                            </div>
                            <div class="flex items-center space-x-4">
                                <a href="#" onclick="navigateToDashboard()" class="text-gray-600 hover:text-gray-900">Dashboard</a>
                                <a href="#" onclick="navigateToFileManager()" class="text-gray-600 hover:text-gray-900">File Manager</a>
                                <span class="text-sm text-gray-600">${window.app.currentUser.displayName} (${window.app.currentUser.role})</span>
                                <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <!-- Main Content -->
                <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div class="bg-white shadow rounded-lg p-6">
                        <!-- Header Section -->
                        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                            <div class="flex items-center">
                                <h1 class="text-3xl sm:text-4xl font-bold text-gray-800">JOB FILE</h1>
                            </div>
                            <div class="text-right w-full sm:w-auto">
                                <div class="flex items-center mb-2">
                                    <label for="date" class="mr-2 font-semibold text-gray-700">Date:</label>
                                    <input type="date" id="date" class="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-40">
                                </div>
                                <div class="flex items-center">
                                    <label for="po-number" class="mr-2 font-semibold text-gray-700">P.O. #:</label>
                                    <input type="text" id="po-number" class="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-40">
                                </div>
                            </div>
                        </header>

                        <!-- Status Banner -->
                        <div id="rejection-banner" class="hidden p-3 mb-4 text-center text-red-800 bg-red-100 rounded-lg">
                            <strong>This job file was rejected.</strong> Reason: <span id="rejection-reason"></span>
                        </div>

                        <!-- Form Fields -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            <div class="lg:col-span-2">
                                <label for="job-file-no" class="block mb-1 font-semibold text-gray-700">Job File No.:</label>
                                <input type="text" id="job-file-no" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Enter a unique ID here...">
                            </div>
                            <div class="flex items-end space-x-8 pb-1">
                                <div>
                                    <span class="font-semibold text-gray-700">Clearance</span>
                                    <div class="mt-2 space-y-1">
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-clearance="Export"> Export</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-clearance="Import"> Import</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-clearance="Clearance"> Clearance</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-clearance="Local Move"> Local Move</label>
                                    </div>
                                </div>
                                <div>
                                    <span class="font-semibold text-gray-700">Product Type</span>
                                    <div class="mt-2 space-y-1">
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-product="Air Freight"> Air Freight</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-product="Sea Freight"> Sea Freight</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-product="Land Freight"> Land Freight</label>
                                        <label class="flex items-center"><input type="checkbox" class="mr-2" data-product="Others"> Others</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Additional Fields -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div><label for="invoice-no" class="block mb-1 font-semibold text-gray-700">Invoice No.:</label><input type="text" id="invoice-no" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="billing-date" class="block mb-1 font-semibold text-gray-700">Billing Date:</label><input type="date" id="billing-date" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="salesman" class="block mb-1 font-semibold text-gray-700">Salesman:</label><input type="text" id="salesman" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div class="relative">
                                <label for="shipper-name" class="block mb-1 font-semibold text-gray-700">Shipper's Name:</label>
                                <input type="text" id="shipper-name" class="w-full border border-gray-300 rounded-md px-3 py-2" autocomplete="off">
                                <div id="shipper-suggestions" class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-40 overflow-y-auto"></div>
                            </div>
                            <div class="relative">
                                <label for="consignee-name" class="block mb-1 font-semibold text-gray-700">Consignee's Name:</label>
                                <input type="text" id="consignee-name" class="w-full border border-gray-300 rounded-md px-3 py-2" autocomplete="off">
                                <div id="consignee-suggestions" class="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg hidden max-h-40 overflow-y-auto"></div>
                            </div>
                        </div>

                        <!-- More form fields... -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                            <div><label for="mawb" class="block mb-1 font-semibold text-gray-700">MAWB / OBL / TCN No.:</label><input type="text" id="mawb" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="hawb" class="block mb-1 font-semibold text-gray-700">HAWB / HBL:</label><input type="text" id="hawb" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="teams-of-shipping" class="block mb-1 font-semibold text-gray-700">Teams of Shipping:</label><input type="text" id="teams-of-shipping" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="origin" class="block mb-1 font-semibold text-gray-700">Origin:</label><input type="text" id="origin" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="no-of-pieces" class="block mb-1 font-semibold text-gray-700">No. of Pieces:</label><input type="text" id="no-of-pieces" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="gross-weight" class="block mb-1 font-semibold text-gray-700">Gross Weight:</label><input type="text" id="gross-weight" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="destination" class="block mb-1 font-semibold text-gray-700">Destination:</label><input type="text" id="destination" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="volume-weight" class="block mb-1 font-semibold text-gray-700">Volume Weight:</label><input type="text" id="volume-weight" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div class="sm:col-span-2">
                                <label for="description" class="block mb-1 font-semibold text-gray-700">Description:</label>
                                <input type="text" id="description" class="w-full border border-gray-300 rounded-md px-3 py-2">
                            </div>
                            <div><label for="carrier" class="block mb-1 font-semibold text-gray-700">Carrier / Shipping Line / Trucking Co:</label><input type="text" id="carrier" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="truck-no" class="block mb-1 font-semibold text-gray-700">Truck No. / Driver's Name:</label><input type="text" id="truck-no" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="vessel-name" class="block mb-1 font-semibold text-gray-700">Vessel's Name:</label><input type="text" id="vessel-name" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="flight-voyage-no" class="block mb-1 font-semibold text-gray-700">Flight / Voyage No.:</label><input type="text" id="flight-voyage-no" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                            <div><label for="container-no" class="block mb-1 font-semibold text-gray-700">Container No.:</label><input type="text" id="container-no" class="w-full border border-gray-300 rounded-md px-3 py-2"></div>
                        </div>

                        <!-- Charges Table -->
                        <div class="flex justify-between items-center mb-2">
                            <h2 class="text-xl font-semibold text-gray-800">Charges</h2>
                            <button onclick="addChargeRow()" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
                                + Add Charge
                            </button>
                        </div>
                        <div class="mb-6 overflow-x-auto border border-gray-200 rounded-lg">
                            <table id="charges-table" class="w-full border-collapse">
                                <thead>
                                    <tr class="bg-gray-100">
                                        <th class="border border-gray-300 p-3 font-semibold w-2/5">Description</th>
                                        <th class="border border-gray-300 p-3 font-semibold">Cost</th>
                                        <th class="border border-gray-300 p-3 font-semibold">Selling</th>
                                        <th class="border border-gray-300 p-3 font-semibold">Profit</th>
                                        <th class="border border-gray-300 p-3 font-semibold">Notes</th>
                                        <th class="border border-gray-300 p-3 font-semibold"></th>
                                    </tr>
                                </thead>
                                <tbody id="charges-table-body">
                                </tbody>
                                <tfoot>
                                    <tr id="total-row" class="bg-gray-100 font-bold">
                                        <td class="border border-gray-300 p-3 text-right">TOTAL:</td>
                                        <td id="total-cost" class="border border-gray-300 p-3 text-right">0.00</td>
                                        <td id="total-selling" class="border border-gray-300 p-3 text-right">0.00</td>
                                        <td id="total-profit" class="border border-gray-300 p-3 text-right">0.00</td>
                                        <td class="border border-gray-300 p-3" colspan="2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <!-- Remarks Section -->
                        <div class="mb-8">
                            <label for="remarks" class="block mb-1 font-semibold text-gray-700">REMARKS:</label>
                            <textarea id="remarks" rows="4" class="w-full border border-gray-300 rounded-md px-3 py-2"></textarea>
                        </div>

                        <!-- Creator/Editor Info -->
                        <div id="file-info" class="text-xs text-gray-500 mb-4 border-t pt-4">
                            <span id="created-by-info"></span>
                            <span id="last-updated-by-info" class="ml-4"></span>
                        </div>

                        <!-- Footer Section -->
                        <footer class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t items-end">
                            <div>
                                <label class="block mb-2 font-semibold text-gray-700">PREPARED BY</label>
                                <input type="text" id="prepared-by" class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100" readonly>
                            </div>
                            <div class="relative">
                                <div id="checked-stamp" class="absolute top-0 right-0 bg-blue-500 text-white px-2 py-1 rounded text-xs font-bold transform rotate-12 hidden">
                                    Checked
                                </div>
                                <label class="block mb-2 font-semibold text-gray-700">CHECKED BY</label>
                                <input type="text" id="checked-by" class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100" readonly>
                                <button id="check-btn" class="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded hidden">
                                    Check Job File
                                </button>
                            </div>
                            <div class="relative">
                                <div id="approved-stamp" class="absolute top-0 right-0 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold transform rotate-12 hidden">
                                    Approved
                                </div>
                                <div id="rejected-stamp" class="absolute top-0 right-0 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold transform rotate-12 hidden">
                                    Rejected
                                </div>
                                <label class="block mb-2 font-semibold text-gray-700">APPROVED BY</label>
                                <input type="text" id="approved-by" class="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100" readonly>
                                <div id="approval-buttons" class="mt-2 w-full flex gap-2 hidden">
                                    <button id="approve-btn" class="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded">Approve</button>
                                    <button id="reject-btn" class="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded">Reject</button>
                                </div>
                            </div>
                        </footer>

                        <!-- Action Buttons -->
                        <div class="text-center mt-10 flex flex-wrap justify-center gap-2 sm:gap-4">
                            <button onclick="saveJobFile()" class="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6a1 1 0 10-2 0v5.586L7.707 10.293z"></path>
                                </svg>
                                <span>Save to DB</span>
                            </button>
                            <button onclick="clearForm()" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.898 0V3a1 1 0 112 0v2.101a7.002 7.002 0 01-11.898 0V3a1 1 0 01-1-1z" clip-rule="evenodd"></path>
                                </svg>
                                <span>New Job</span>
                            </button>
                            <button onclick="printJobFile()" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 flex items-center space-x-2">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2z" clip-rule="evenodd"></path>
                                </svg>
                                <span>Print</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init(params) {
        // Load charge descriptions from localStorage
        const storedDescriptions = localStorage.getItem('chargeDescriptions');
        if (storedDescriptions) {
            this.chargeDescriptions = JSON.parse(storedDescriptions);
        } else {
            this.chargeDescriptions = [
                'Ex-works Charges:', 'Land/Air / Sea Freight:', 'Fuel Security / War Surcharge:', 
                'Formalities:', 'Delivery Order Fee:', 'Transportation Charges:', 
                'Inspection / Computer Print Charges:', 'Handling Charges:', 'Labor / Forklift Charges:', 
                'Documentation Charges:', 'Clearance Charges:', 'Customs Duty:', 
                'Terminal Handling Charges:', 'Legalization Charges:', 'Demurrage Charges:', 
                'Loading / Offloading Charges:', 'Destination Clearance Charges:', 'Packing Charges:', 
                'Port Charges:', 'Other Charges:', 'PAI Approval:', 'Insurance Fee:', 'EPA Charges:'
            ];
            localStorage.setItem('chargeDescriptions', JSON.stringify(this.chargeDescriptions));
        }

        // Initialize form
        this.initializeForm();
        this.setupEventListeners();
        
        // Subscribe to clients for autocomplete
        this.clientService.subscribeToClients((clients) => {
            this.setupAutocomplete(clients);
        });

        // Load specific file if requested
        if (params.loadFile) {
            await this.loadJobFile(params.loadFile);
        }

        // Set current date
        document.getElementById('date').valueAsDate = new Date();
        document.getElementById('prepared-by').value = window.app.currentUser.displayName;
    }

    initializeForm() {
        // Initialize charges table
        for (let i = 0; i < 5; i++) {
            this.addChargeRow();
        }
        this.calculate();
        this.updateUIBasedOnRole();
    }

    updateUIBasedOnRole() {
        const isChecker = ['admin', 'checker'].includes(window.app.currentUser.role);
        const isAdmin = window.app.currentUser.role === 'admin';
        
        document.getElementById('check-btn').style.display = isChecker ? 'block' : 'none';
        document.getElementById('approval-buttons').style.display = isAdmin ? 'flex' : 'none';
    }

    setupEventListeners() {
        // Save button
        window.saveJobFile = async () => {
            const jobData = this.getFormData();
            if (!jobData.jfn) {
                alert('Please enter a Job File No.');
                return;
            }

            const isUpdate = document.getElementById('job-file-no').disabled;
            const result = await this.jobFileService.saveJobFile(jobData, isUpdate);
            
            if (result.success) {
                alert('Job file saved successfully!');
                if (!isUpdate) {
                    document.getElementById('job-file-no').disabled = true;
                }
                await this.loadJobFile(result.docId);
            } else {
                alert(result.error);
            }
        };

        // Clear form
        window.clearForm = () => {
            document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(input => input.value = '');
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
            document.getElementById('job-file-no').disabled = false;
            document.getElementById('charges-table-body').innerHTML = '';
            this.initializeForm();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('prepared-by').value = window.app.currentUser.displayName;
            alert('Form cleared. Ready for a new job file.');
        };

        // Print function
        window.printJobFile = () => {
            window.print();
        };

        // Navigation functions
        window.navigateToDashboard = () => window.app.router.navigate('dashboard');
        window.navigateToFileManager = () => window.app.router.navigate('file-manager');
        window.logout = async () => {
            await window.app.authService.logout();
        };

        // Add charge row function
        window.addChargeRow = (data = {}) => this.addChargeRow(data);

        // Approval functions
        window.checkJobFile = async () => {
            if (!window.app.authService.requireChecker()) return;
            
            const jobFileNo = document.getElementById('job-file-no').value.trim();
            if (!jobFileNo) {
                alert('Please save or load a job file first.');
                return;
            }
            
            const docId = jobFileNo.replace(/\//g, '_');
            const result = await this.jobFileService.updateJobFileStatus(docId, 'checked', {
                checkedBy: window.app.currentUser.displayName,
                checkedAt: new Date()
            });
            
            if (result.success) {
                alert('Job File Checked!');
                await this.loadJobFile(docId);
            } else {
                alert(result.error);
            }
        };

        window.approveJobFile = async () => {
            if (!window.app.authService.requireAdmin()) return;
            
            const jobFileNo = document.getElementById('job-file-no').value.trim();
            if (!jobFileNo) {
                alert('Please save or load a job file first.');
                return;
            }
            
            const docId = jobFileNo.replace(/\//g, '_');
            const result = await this.jobFileService.updateJobFileStatus(docId, 'approved', {
                approvedBy: window.app.currentUser.displayName,
                approvedAt: new Date(),
                rejectionReason: null,
                rejectedBy: null,
                rejectedAt: null
            });
            
            if (result.success) {
                alert('Job File Approved!');
                await this.loadJobFile(docId);
            } else {
                alert(result.error);
            }
        };

        window.rejectJobFile = async () => {
            if (!window.app.authService.requireAdmin()) return;
            
            const reason = prompt('Please provide a reason for rejecting this job file:');
            if (!reason) return;
            
            const jobFileNo = document.getElementById('job-file-no').value.trim();
            if (!jobFileNo) {
                alert('Please save or load a job file first.');
                return;
            }
            
            const docId = jobFileNo.replace(/\//g, '_');
            const result = await this.jobFileService.updateJobFileStatus(docId, 'rejected', {
                rejectedBy: window.app.currentUser.displayName,
                rejectedAt: new Date(),
                rejectionReason: reason
            });
            
            if (result.success) {
                alert('Job File Rejected!');
                await this.loadJobFile(docId);
            } else {
                alert(result.error);
            }
        };

        // Bind approval buttons
        document.getElementById('check-btn').addEventListener('click', window.checkJobFile);
        document.getElementById('approve-btn').addEventListener('click', window.approveJobFile);
        document.getElementById('reject-btn').addEventListener('click', window.rejectJobFile);
    }

    addChargeRow(data = {}) {
        const tableBody = document.getElementById('charges-table-body');
        const newRow = document.createElement('tr');

        newRow.innerHTML = `
            <td class="border border-gray-300 p-2">
                <input type="text" class="description-input w-full border-none p-0 bg-transparent" value="${data.l || ''}" autocomplete="off">
            </td>
            <td class="border border-gray-300 p-2">
                <input type="number" class="cost-input w-full border-none p-0 bg-transparent" value="${data.c || ''}" step="0.01">
            </td>
            <td class="border border-gray-300 p-2">
                <input type="number" class="selling-input w-full border-none p-0 bg-transparent" value="${data.s || ''}" step="0.01">
            </td>
            <td class="border border-gray-300 p-2 profit-output bg-gray-50 text-right">
                ${((data.s || 0) - (data.c || 0)).toFixed(2)}
            </td>
            <td class="border border-gray-300 p-2">
                <input type="text" class="notes-input w-full border-none p-0 bg-transparent" value="${data.n || ''}">
            </td>
            <td class="border border-gray-300 p-2 text-center">
                <button class="text-red-500 hover:text-red-700 font-bold">&times;</button>
            </td>
        `;

        // Add event listeners
        const costInput = newRow.querySelector('.cost-input');
        const sellingInput = newRow.querySelector('.selling-input');
        const deleteButton = newRow.querySelector('button');

        costInput.addEventListener('input', () => this.calculate());
        sellingInput.addEventListener('input', () => this.calculate());
        deleteButton.addEventListener('click', () => {
            newRow.remove();
            this.calculate();
        });

        tableBody.appendChild(newRow);
    }

    calculate() {
        let totalCost = 0, totalSelling = 0, totalProfit = 0;
        
        document.querySelectorAll('#charges-table-body tr').forEach(row => {
            const cost = parseFloat(row.querySelector('.cost-input').value) || 0;
            const selling = parseFloat(row.querySelector('.selling-input').value) || 0;
            const profit = selling - cost;
            
            row.querySelector('.profit-output').textContent = profit.toFixed(2);
            totalCost += cost;
            totalSelling += selling;
            totalProfit += profit;
        });

        document.getElementById('total-cost').textContent = totalCost.toFixed(2);
        document.getElementById('total-selling').textContent = totalSelling.toFixed(2);
        document.getElementById('total-profit').textContent = totalProfit.toFixed(2);
    }

    getFormData() {
        const getVal = id => document.getElementById(id).value || '';
        const getChecked = query => Array.from(document.querySelectorAll(query)).filter(el => el.checked).map(el => el.dataset.clearance || el.dataset.product);

        const charges = [];
        document.querySelectorAll('#charges-table-body tr').forEach(row => {
            const description = row.querySelector('.description-input').value.trim();
            const cost = row.querySelector('.cost-input').value;
            const selling = row.querySelector('.selling-input').value;

            if (description && (cost || selling)) {
                charges.push({
                    l: description,
                    c: cost || '0',
                    s: selling || '0',
                    n: row.querySelector('.notes-input').value || ''
                });
            }
        });

        return {
            d: getVal('date'), po: getVal('po-number'), jfn: getVal('job-file-no'),
            cl: getChecked('[data-clearance]:checked'), pt: getChecked('[data-product]:checked'),
            in: getVal('invoice-no'), bd: getVal('billing-date'), sm: getVal('salesman'),
            sh: getVal('shipper-name'), co: getVal('consignee-name'),
            mawb: getVal('mawb'), hawb: getVal('hawb'), ts: getVal('teams-of-shipping'), or: getVal('origin'),
            pc: getVal('no-of-pieces'), gw: getVal('gross-weight'), de: getVal('destination'), vw: getVal('volume-weight'),
            dsc: getVal('description'), ca: getVal('carrier'), tn: getVal('truck-no'),
            vn: getVal('vessel-name'), fv: getVal('flight-voyage-no'), cn: getVal('container-no'),
            ch: charges,
            re: getVal('remarks'),
            pb: getVal('prepared-by'),
            totalCost: parseFloat(document.getElementById('total-cost').textContent) || 0,
            totalSelling: parseFloat(document.getElementById('total-selling').textContent) || 0,
            totalProfit: parseFloat(document.getElementById('total-profit').textContent) || 0
        };
    }

    async loadJobFile(docId) {
        const result = await this.jobFileService.getJobFile(docId);
        if (result.success) {
            this.populateFormFromData(result.data);
            document.getElementById('job-file-no').disabled = true;
            alert('Job file loaded successfully.');
        } else {
            alert(result.error);
        }
    }

    populateFormFromData(data) {
        const setVal = (id, value) => { 
            const element = document.getElementById(id);
            if (element) element.value = value || ''; 
        };
        const setChecked = (type, values) => {
            document.querySelectorAll(`[data-${type}]`).forEach(el => {
                el.checked = (values || []).includes(el.dataset[type]);
            });
        };

        // Populate all form fields
        setVal('date', data.d); setVal('po-number', data.po); setVal('job-file-no', data.jfn);
        setVal('invoice-no', data.in); setVal('billing-date', data.bd);
        setVal('salesman', data.sm); setVal('shipper-name', data.sh); setVal('consignee-name', data.co);
        setVal('mawb', data.mawb); setVal('hawb', data.hawb); setVal('teams-of-shipping', data.ts);
        setVal('origin', data.or); setVal('no-of-pieces', data.pc); setVal('gross-weight', data.gw);
        setVal('destination', data.de); setVal('volume-weight', data.vw); setVal('description', data.dsc);
        setVal('carrier', data.ca); setVal('truck-no', data.tn); setVal('vessel-name', data.vn);
        setVal('flight-voyage-no', data.fv); setVal('container-no', data.cn);
        setVal('remarks', data.re);
        setVal('prepared-by', data.pb || data.createdBy || '');

        setChecked('clearance', data.cl);
        setChecked('product', data.pt);

        // Populate charges table
        document.getElementById('charges-table-body').innerHTML = '';
        if (data.ch && data.ch.length > 0) {
            data.ch.forEach(charge => this.addChargeRow(charge));
        } else {
            for (let i = 0; i < 5; i++) this.addChargeRow();
        }

        // Update status information
        this.updateStatusDisplay(data);
        this.calculate();
    }

    updateStatusDisplay(data) {
        // Reset all stamps and banners
        document.getElementById('checked-stamp').classList.add('hidden');
        document.getElementById('approved-stamp').classList.add('hidden');
        document.getElementById('rejected-stamp').classList.add('hidden');
        document.getElementById('rejection-banner').classList.add('hidden');

        // Update checked status
        if (data.checkedBy) {
            const checkedDate = data.checkedAt?.toDate ? ` on ${data.checkedAt.toDate().toLocaleDateString()}` : '';
            document.getElementById('checked-by').value = `${data.checkedBy}${checkedDate}`;
            document.getElementById('checked-stamp').classList.remove('hidden');
            document.getElementById('check-btn').style.display = 'none';
        } else {
            document.getElementById('checked-by').value = 'Pending Check';
            if (['admin', 'checker'].includes(window.app.currentUser.role)) {
                document.getElementById('check-btn').style.display = 'block';
            }
        }

        // Update approval status
        if (data.status === 'approved') {
            const approvedDate = data.approvedAt?.toDate ? ` on ${data.approvedAt.toDate().toLocaleDateString()}` : '';
            document.getElementById('approved-by').value = `${data.approvedBy}${approvedDate}`;
            document.getElementById('approved-stamp').classList.remove('hidden');
        } else if (data.status === 'rejected') {
            const rejectedDate = data.rejectedAt?.toDate ? ` on ${data.rejectedAt.toDate().toLocaleDateString()}` : '';
            document.getElementById('approved-by').value = `Rejected by ${data.rejectedBy}${rejectedDate}`;
            document.getElementById('rejected-stamp').classList.remove('hidden');
            document.getElementById('rejection-banner').classList.remove('hidden');
            document.getElementById('rejection-reason').textContent = data.rejectionReason;
        } else {
            document.getElementById('approved-by').value = 'Pending Approval';
            if (window.app.currentUser.role === 'admin' && data.status === 'checked') {
                document.getElementById('approval-buttons').style.display = 'flex';
            }
        }

        // Update file info
        const createdInfo = data.createdBy ? `Created by: ${data.createdBy} on ${data.createdAt?.toDate().toLocaleDateString()}` : '';
        const updatedInfo = data.lastUpdatedBy ? `Last updated by: ${data.lastUpdatedBy} on ${data.updatedAt?.toDate().toLocaleString()}` : '';
        
        document.getElementById('created-by-info').textContent = createdInfo;
        document.getElementById('last-updated-by-info').textContent = updatedInfo;
    }

    setupAutocomplete(clients) {
        this.setupClientAutocomplete('shipper-name', 'shipper-suggestions', 'Shipper', clients);
        this.setupClientAutocomplete('consignee-name', 'consignee-suggestions', 'Consignee', clients);
    }

    setupClientAutocomplete(inputId, suggestionsId, type, clients) {
        const input = document.getElementById(inputId);
        const suggestionsPanel = document.getElementById(suggestionsId);

        input.addEventListener('input', () => {
            const value = input.value.toLowerCase();
            if (value.length < 2) {
                suggestionsPanel.innerHTML = '';
                suggestionsPanel.classList.add('hidden');
                return;
            }

            const filteredClients = clients.filter(client => 
                client.name.toLowerCase().includes(value) && 
                (client.type === type || client.type === 'Both')
            );

            if (filteredClients.length > 0) {
                suggestionsPanel.innerHTML = filteredClients.map(client => 
                    `<div class="p-2 hover:bg-gray-100 cursor-pointer" onclick="selectClient('${inputId}', '${client.name}')">${client.name}</div>`
                ).join('');
                suggestionsPanel.classList.remove('hidden');
            } else {
                suggestionsPanel.classList.add('hidden');
            }
        });

        // Global function for selecting client
        window.selectClient = (inputId, clientName) => {
            document.getElementById(inputId).value = clientName;
            document.getElementById(inputId.replace('-name', '-suggestions')).classList.add('hidden');
        };
    }

    cleanup() {
        if (this.jobFileService) {
            this.jobFileService.cleanup();
        }
        if (this.clientService) {
            this.clientService.cleanup();
        }
    }
}