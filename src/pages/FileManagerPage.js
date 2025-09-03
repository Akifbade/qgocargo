export class FileManagerPage {
    constructor() {
        this.jobFileService = null;
    }

    async render() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
                <!-- Modern Navigation -->
                <nav class="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center py-4">
                            <div class="flex items-center space-x-4">
                                <div class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                                    Q'go Cargo
                                </div>
                                <div class="h-6 w-px bg-gray-300"></div>
                                <span class="text-lg font-semibold text-gray-700">File Manager</span>
                            </div>
                            <div class="flex items-center space-x-6">
                                <a href="#" onclick="navigateToDashboard()" class="text-gray-600 hover:text-purple-600 transition-colors font-medium">Dashboard</a>
                                <a href="#" onclick="navigateToJobFile()" class="text-gray-600 hover:text-purple-600 transition-colors font-medium">Job Files</a>
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        ${window.app.currentUser.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span class="text-sm text-gray-600">${window.app.currentUser.displayName}</span>
                                </div>
                                <button onclick="logout()" class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105">
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <!-- Main Content -->
                <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <!-- Header -->
                    <div class="text-center mb-8">
                        <div class="flex items-center justify-center space-x-4 mb-4">
                            <div class="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                            </div>
                        </div>
                        <h1 class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">File Manager</h1>
                        <p class="mt-2 text-gray-600 text-lg">Browse and manage your job files</p>
                    </div>

                    <!-- Search and Filter Controls -->
                    <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-6 mb-8">
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div class="md:col-span-2">
                                <label for="search-bar" class="block text-sm font-semibold text-gray-700 mb-2">Search</label>
                                <input type="text" id="search-bar" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all" placeholder="Job No, Shipper, Consignee...">
                            </div>
                            <div>
                                <label for="filter-status" class="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                <select id="filter-status" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                                    <option value="">All Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="checked">Checked</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                            <div>
                                <label for="filter-date-from" class="block text-sm font-semibold text-gray-700 mb-2">From Date</label>
                                <input type="date" id="filter-date-from" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="filter-date-to" class="block text-sm font-semibold text-gray-700 mb-2">To Date</label>
                                <input type="date" id="filter-date-to" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                        <div class="mt-6 flex justify-between">
                            <button id="clear-filters-btn" class="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-6 rounded-xl transition-all transform hover:scale-105">
                                Clear Filters
                            </button>
                            ${window.app.currentUser.role === 'admin' ? `
                                <button onclick="openRecycleBin()" class="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-2 px-6 rounded-xl transition-all transform hover:scale-105">
                                    Recycle Bin
                                </button>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Job Files List -->
                    <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50">
                        <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-2xl">
                            <h3 class="text-xl font-bold text-gray-800">Job Files</h3>
                        </div>
                        <div id="job-files-list" class="divide-y divide-gray-200">
                            <div class="p-8 text-center">
                                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                                <p class="mt-4 text-gray-600">Loading job files...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preview Modal -->
            <div id="preview-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                        <h3 class="text-2xl font-bold text-gray-800">Job File Preview</h3>
                        <div class="flex space-x-3">
                            <button onclick="printPreview()" class="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105">
                                Print
                            </button>
                            <button onclick="closePreviewModal()" class="text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                        </div>
                    </div>
                    <div id="preview-body" class="p-6 overflow-y-auto max-h-[calc(90vh-120px)]"></div>
                </div>
            </div>
        `;
    }

    async init() {
        // Import JobFileService dynamically
        const { JobFileService } = await import('../services/JobFileService.js');
        this.jobFileService = new JobFileService(window.app.db);
        
        // Subscribe to job files for real-time updates
        this.jobFileService.subscribeToJobFiles((jobFiles) => {
            this.displayJobFiles(jobFiles);
        });

        this.setupEventListeners();
    }

    displayJobFiles(files) {
        const list = document.getElementById('job-files-list');
        if (files.length === 0) {
            list.innerHTML = '<div class="p-8 text-center text-gray-500">No job files found.</div>';
            return;
        }

        const html = files.map(docData => {
            const deleteButton = window.app.currentUser.role === 'admin' ? 
                `<button onclick="confirmDelete('${docData.id}')" class="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-all transform hover:scale-105">Delete</button>` : '';
            
            const lastUpdated = docData.updatedAt?.toDate ? docData.updatedAt.toDate().toLocaleString() : 'N/A';
            
            const statusColor = {
                'approved': 'bg-green-100 text-green-800 border-green-200',
                'rejected': 'bg-red-100 text-red-800 border-red-200',
                'checked': 'bg-blue-100 text-blue-800 border-blue-200',
                'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200'
            }[docData.status] || 'bg-gray-100 text-gray-800 border-gray-200';

            return `
                <div class="p-6 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 transition-all">
                    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-3">
                                <h4 class="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">${docData.jfn || 'No ID'}</h4>
                                <span class="px-3 py-1 text-sm font-semibold rounded-full border ${statusColor}">
                                    ${(docData.status || 'pending').charAt(0).toUpperCase() + (docData.status || 'pending').slice(1)}
                                </span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                <div class="flex items-center space-x-2">
                                    <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                    </svg>
                                    <span><strong>Shipper:</strong> ${docData.sh || 'N/A'}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    </svg>
                                    <span><strong>Consignee:</strong> ${docData.co || 'N/A'}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                    <span><strong>MAWB:</strong> ${docData.mawb || 'N/A'}</span>
                                </div>
                                <div class="flex items-center space-x-2">
                                    <svg class="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    <span><strong>Updated:</strong> ${lastUpdated}</span>
                                </div>
                            </div>
                            ${docData.totalProfit ? `
                                <div class="mt-3 flex items-center space-x-6 text-sm">
                                    <span class="flex items-center space-x-2">
                                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span class="text-green-600 font-semibold">Profit: KD ${docData.totalProfit.toFixed(2)}</span>
                                    </span>
                                    <span class="flex items-center space-x-2">
                                        <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span class="text-red-600 font-semibold">Cost: KD ${(docData.totalCost || 0).toFixed(2)}</span>
                                    </span>
                                    <span class="flex items-center space-x-2">
                                        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span class="text-blue-600 font-semibold">Revenue: KD ${(docData.totalSelling || 0).toFixed(2)}</span>
                                    </span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex flex-wrap gap-3">
                            <button onclick="previewJobFile('${docData.id}')" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                                </svg>
                                <span>Preview</span>
                            </button>
                            <button onclick="loadJobFile('${docData.id}')" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
                                </svg>
                                <span>Load</span>
                            </button>
                            ${deleteButton}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        list.innerHTML = html;
    }

    setupEventListeners() {
        // Search and filter functionality
        document.getElementById('search-bar').addEventListener('input', () => this.applyFilters());
        document.getElementById('filter-status').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-date-from').addEventListener('change', () => this.applyFilters());
        document.getElementById('filter-date-to').addEventListener('change', () => this.applyFilters());
        document.getElementById('clear-filters-btn').addEventListener('click', () => {
            document.getElementById('search-bar').value = '';
            document.getElementById('filter-status').value = '';
            document.getElementById('filter-date-from').value = '';
            document.getElementById('filter-date-to').value = '';
            this.applyFilters();
        });

        // Global navigation functions
        window.navigateToDashboard = () => window.app.router.navigate('dashboard');
        window.navigateToJobFile = () => window.app.router.navigate('job-file');
        window.logout = async () => {
            await window.app.authService.logout();
        };

        window.loadJobFile = (fileId) => {
            window.app.router.navigate('job-file', { loadFile: fileId });
        };

        window.previewJobFile = async (fileId) => {
            const result = await this.jobFileService.getJobFile(fileId);
            if (result.success) {
                this.showPreviewModal(result.data);
            }
        };

        window.confirmDelete = (docId) => {
            if (window.app.currentUser.role !== 'admin') {
                alert("Only admins can delete files.");
                return;
            }
            
            if (confirm(`Are you sure you want to delete job file "${docId.replace(/_/g, '/')}"?`)) {
                this.deleteJobFile(docId);
            }
        };

        window.closePreviewModal = () => {
            document.getElementById('preview-modal').classList.add('hidden');
        };

        window.printPreview = () => {
            const previewBody = document.getElementById('preview-body').innerHTML;
            const printWindow = window.open('', '', 'height=800,width=1200');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Job File Preview</title>
                        <style>
                            body { padding: 20px; font-family: Arial, sans-serif; }
                            table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                            td, th { border: 1px solid #000; padding: 8px; text-align: left; }
                            .company-header { font-size: 24px; font-weight: bold; color: #0E639C; }
                            .company-header span { color: #4FB8AF; }
                        </style>
                    </head>
                    <body>
                        ${previewBody}
                    </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 750);
        };
    }

    applyFilters() {
        const searchTerm = document.getElementById('search-bar').value.toLowerCase();
        const statusFilter = document.getElementById('filter-status').value;
        const fromDate = document.getElementById('filter-date-from').value;
        const toDate = document.getElementById('filter-date-to').value;

        let filteredFiles = this.jobFileService.getJobFilesCache().filter(file => {
            const searchData = [file.jfn, file.sh, file.co, file.mawb].join(' ').toLowerCase();
            if (searchTerm && !searchData.includes(searchTerm)) {
                return false;
            }
            if (statusFilter && file.status !== statusFilter) {
                return false;
            }
            if (fromDate && file.d < fromDate) {
                return false;
            }
            if (toDate && file.d > toDate) {
                return false;
            }
            return true;
        });

        this.displayJobFiles(filteredFiles);
    }

    async deleteJobFile(docId) {
        const result = await this.jobFileService.deleteJobFile(docId);
        if (result.success) {
            alert("Job file deleted successfully.");
        } else {
            alert(result.error);
        }
    }

    showPreviewModal(data) {
        const previewBody = document.getElementById('preview-body');
        previewBody.innerHTML = this.generatePreviewHTML(data);
        document.getElementById('preview-modal').classList.remove('hidden');
    }

    generatePreviewHTML(data) {
        const totalCost = data.totalCost || 0;
        const totalSelling = data.totalSelling || 0;
        const totalProfit = data.totalProfit || 0;

        return `
            <div class="bg-white border-2 border-gray-300 rounded-lg p-6">
                <table class="w-full border-collapse">
                    <tr>
                        <td colspan="3" class="border border-gray-400 p-4 text-center">
                            <div class="company-header">Q'go<span>Cargo</span></div>
                        </td>
                        <td colspan="3" class="border border-gray-400 p-4 text-center text-2xl font-bold">JOB FILE</td>
                        <td colspan="2" class="border border-gray-400 p-4">
                            <div><strong>Date:</strong> ${data.d || ''}</div>
                            <div><strong>P.O. #:</strong> ${data.po || ''}</div>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="8" class="border border-gray-400 p-4"><strong>Job File No.:</strong> ${data.jfn || ''}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="border border-gray-400 p-4"><strong>Shipper:</strong> ${data.sh || ''}</td>
                        <td colspan="4" class="border border-gray-400 p-4"><strong>Consignee:</strong> ${data.co || ''}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="border border-gray-400 p-4"><strong>MAWB:</strong> ${data.mawb || ''}</td>
                        <td colspan="4" class="border border-gray-400 p-4"><strong>HAWB:</strong> ${data.hawb || ''}</td>
                    </tr>
                    <tr>
                        <td colspan="8" class="border border-gray-400 p-4"><strong>Description:</strong> ${data.dsc || ''}</td>
                    </tr>
                    <tr>
                        <td colspan="8" class="border border-gray-400 p-0">
                            <table class="w-full">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th class="border border-gray-400 p-3 font-bold">Description</th>
                                        <th class="border border-gray-400 p-3 font-bold">Cost</th>
                                        <th class="border border-gray-400 p-3 font-bold">Selling</th>
                                        <th class="border border-gray-400 p-3 font-bold">Profit</th>
                                        <th class="border border-gray-400 p-3 font-bold">Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(data.ch || []).map(c => `
                                        <tr>
                                            <td class="border border-gray-400 p-3">${c.l}</td>
                                            <td class="border border-gray-400 p-3 text-right">${c.c}</td>
                                            <td class="border border-gray-400 p-3 text-right">${c.s}</td>
                                            <td class="border border-gray-400 p-3 text-right">${(parseFloat(c.s || 0) - parseFloat(c.c || 0)).toFixed(2)}</td>
                                            <td class="border border-gray-400 p-3">${c.n || ''}</td>
                                        </tr>
                                    `).join('')}
                                    <tr class="bg-gray-100 font-bold">
                                        <td class="border border-gray-400 p-3">TOTAL:</td>
                                        <td class="border border-gray-400 p-3 text-right text-red-600">${totalCost.toFixed(2)}</td>
                                        <td class="border border-gray-400 p-3 text-right text-blue-600">${totalSelling.toFixed(2)}</td>
                                        <td class="border border-gray-400 p-3 text-right text-green-600">${totalProfit.toFixed(2)}</td>
                                        <td class="border border-gray-400 p-3"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td colspan="8" class="border border-gray-400 p-4"><strong>REMARKS:</strong><br>${(data.re || '').replace(/\n/g, '<br>')}</td>
                    </tr>
                    <tr>
                        <td colspan="2" class="border border-gray-400 p-4"><strong>PREPARED BY:</strong><br>${data.pb || data.createdBy || ''}</td>
                        <td colspan="3" class="border border-gray-400 p-4"><strong>CHECKED BY:</strong><br>${data.checkedBy || 'Pending'}</td>
                        <td colspan="3" class="border border-gray-400 p-4"><strong>APPROVED BY:</strong><br>${data.approvedBy || 'Pending'}</td>
                    </tr>
                </table>
            </div>
        `;
    }

    cleanup() {
        if (this.jobFileService) {
            this.jobFileService.cleanup();
        }
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
    }
}