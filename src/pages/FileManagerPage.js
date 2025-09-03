export class FileManagerPage {
    constructor() {
        this.jobFileService = null;
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
                                <span class="text-lg font-semibold text-gray-700">File Manager</span>
                            </div>
                            <div class="flex items-center space-x-4">
                                <a href="#" onclick="navigateToDashboard()" class="text-gray-600 hover:text-gray-900">Dashboard</a>
                                <a href="#" onclick="navigateToJobFile()" class="text-gray-600 hover:text-gray-900">Job Files</a>
                                <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </nav>

                <!-- Main Content -->
                <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div class="px-4 py-6 sm:px-0">
                        <div class="text-center mb-8">
                            <h1 class="text-3xl font-bold text-gray-900">File Manager</h1>
                            <p class="mt-2 text-gray-600">Browse and manage your job files</p>
                        </div>

                        <!-- Search and Filter Controls -->
                        <div class="bg-white p-6 rounded-lg shadow mb-6">
                            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div class="md:col-span-2">
                                    <label for="search-bar" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                                    <input type="text" id="search-bar" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Job No, Shipper, etc.">
                                </div>
                                <div>
                                    <label for="filter-status" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select id="filter-status" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                        <option value="">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="checked">Checked</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                                <div>
                                    <label for="filter-date-from" class="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                                    <input type="date" id="filter-date-from" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                </div>
                                <div>
                                    <label for="filter-date-to" class="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                                    <input type="date" id="filter-date-to" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                </div>
                            </div>
                            <div class="mt-4 flex justify-between">
                                <button id="clear-filters-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Clear Filters</button>
                            </div>
                        </div>

                        <!-- Job Files List -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="px-6 py-4 border-b border-gray-200">
                                <h3 class="text-lg font-medium text-gray-900">Job Files</h3>
                            </div>
                            <div id="job-files-list" class="divide-y divide-gray-200">
                                <div class="p-6 text-center">
                                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                    <p class="mt-2 text-gray-600">Loading job files...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async init() {
        const { JobFileService } = await import('../services/JobFileService.js');
        this.jobFileService = new JobFileService(window.app.db);
        
        this.jobFileService.subscribeToJobFiles((jobFiles) => {
            this.displayJobFiles(jobFiles);
        });

        this.setupEventListeners();
    }

    displayJobFiles(files) {
        const list = document.getElementById('job-files-list');
        if (files.length === 0) {
            list.innerHTML = '<div class="p-6 text-center text-gray-500">No job files found.</div>';
            return;
        }

        const html = files.map(docData => {
            const deleteButton = window.app.currentUser.role === 'admin' ? 
                `<button onclick="confirmDelete('${docData.id}')" class="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm">Delete</button>` : '';
            
            const lastUpdated = docData.updatedAt?.toDate ? docData.updatedAt.toDate().toLocaleString() : 'N/A';
            
            const statusColor = {
                'approved': 'bg-green-100 text-green-800',
                'rejected': 'bg-red-100 text-red-800',
                'checked': 'bg-blue-100 text-blue-800',
                'pending': 'bg-yellow-100 text-yellow-800'
            }[docData.status] || 'bg-gray-100 text-gray-800';

            return `
                <div class="p-6 hover:bg-gray-50">
                    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div class="flex-1">
                            <div class="flex items-center gap-3 mb-2">
                                <h4 class="text-lg font-semibold text-indigo-700">${docData.jfn || 'No ID'}</h4>
                                <span class="px-2 py-1 text-xs font-semibold rounded-full ${statusColor}">
                                    ${(docData.status || 'pending').charAt(0).toUpperCase() + (docData.status || 'pending').slice(1)}
                                </span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                                <div><strong>Shipper:</strong> ${docData.sh || 'N/A'}</div>
                                <div><strong>Consignee:</strong> ${docData.co || 'N/A'}</div>
                                <div><strong>MAWB:</strong> ${docData.mawb || 'N/A'}</div>
                                <div><strong>Last Updated:</strong> ${lastUpdated}</div>
                            </div>
                            ${docData.totalProfit ? `
                                <div class="mt-2 text-sm">
                                    <span class="text-green-600 font-semibold">Profit: KD ${docData.totalProfit.toFixed(2)}</span>
                                    <span class="text-gray-500 ml-4">Cost: KD ${(docData.totalCost || 0).toFixed(2)}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <button onclick="previewJobFile('${docData.id}')" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm">Preview</button>
                            <button onclick="loadJobFile('${docData.id}')" class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm">Load</button>
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
    }

    applyFilters() {
        // This would filter the displayed files based on search criteria
        // For now, we'll just reload all files
        if (this.jobFileService) {
            const files = this.jobFileService.getJobFilesCache();
            this.displayJobFiles(files);
        }
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
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold">Job File Preview</h3>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-800 text-3xl">&times;</button>
                </div>
                <div class="max-h-96 overflow-y-auto">
                    <div class="border border-gray-300 p-4 bg-white">
                        <div class="grid grid-cols-12 gap-1 text-sm">
                            <div class="col-span-3 border p-2 font-bold" style="color: #0E639C;">
                                Q'go<span style="color: #4FB8AF;">Cargo</span>
                            </div>
                            <div class="col-span-6 border p-2 text-center font-bold">JOB FILE</div>
                            <div class="col-span-3 border p-2">
                                <div><strong>Date:</strong> ${data.d || ''}</div>
                                <div><strong>P.O. #:</strong> ${data.po || ''}</div>
                            </div>
                            
                            <div class="col-span-12 border p-2"><strong>Job File No.:</strong> ${data.jfn || ''}</div>
                            
                            <div class="col-span-6 border p-2"><strong>Shipper:</strong> ${data.sh || ''}</div>
                            <div class="col-span-6 border p-2"><strong>Consignee:</strong> ${data.co || ''}</div>
                            
                            <div class="col-span-6 border p-2"><strong>MAWB:</strong> ${data.mawb || ''}</div>
                            <div class="col-span-6 border p-2"><strong>HAWB:</strong> ${data.hawb || ''}</div>
                            
                            <div class="col-span-12 border p-2"><strong>Description:</strong> ${data.dsc || ''}</div>
                            
                            <div class="col-span-12 border p-0">
                                <table class="w-full text-xs">
                                    <thead>
                                        <tr class="bg-gray-100">
                                            <th class="border p-2">Description</th>
                                            <th class="border p-2">Cost</th>
                                            <th class="border p-2">Selling</th>
                                            <th class="border p-2">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(data.ch || []).map(c => `
                                            <tr>
                                                <td class="border p-2">${c.l}</td>
                                                <td class="border p-2">${c.c}</td>
                                                <td class="border p-2">${c.s}</td>
                                                <td class="border p-2">${(parseFloat(c.s || 0) - parseFloat(c.c || 0)).toFixed(2)}</td>
                                            </tr>
                                        `).join('')}
                                        <tr class="font-bold bg-gray-100">
                                            <td class="border p-2">TOTAL:</td>
                                            <td class="border p-2">${(data.totalCost || 0).toFixed(2)}</td>
                                            <td class="border p-2">${(data.totalSelling || 0).toFixed(2)}</td>
                                            <td class="border p-2">${(data.totalProfit || 0).toFixed(2)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            <div class="col-span-12 border p-2"><strong>REMARKS:</strong><br>${(data.re || '').replace(/\n/g, '<br>')}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    cleanup() {
        if (this.jobFileService) {
            this.jobFileService.cleanup();
        }
    }
}