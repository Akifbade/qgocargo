export class AnalyticsPage {
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
                                <span class="text-lg font-semibold text-gray-700">Analytics</span>
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
                            <h1 class="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                            <p class="mt-2 text-gray-600">Monitor your job files performance and analytics</p>
                        </div>

                        <!-- Analytics Content -->
                        <div id="analytics-body" class="space-y-6">
                            <div class="text-center py-12">
                                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                                <p class="mt-4 text-gray-600">Loading analytics data...</p>
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
            this.displayAnalytics(jobFiles);
        });

        this.setupEventListeners();
    }

    displayAnalytics(jobFiles) {
        const totalJobs = jobFiles.length;
        const approvedJobs = jobFiles.filter(job => job.status === 'approved').length;
        const pendingJobs = jobFiles.filter(job => job.status === 'pending' || !job.status).length;
        const rejectedJobs = jobFiles.filter(job => job.status === 'rejected').length;

        const totalProfit = jobFiles.reduce((sum, job) => sum + (job.totalProfit || 0), 0);
        const totalCost = jobFiles.reduce((sum, job) => sum + (job.totalCost || 0), 0);
        const totalRevenue = jobFiles.reduce((sum, job) => sum + (job.totalSelling || 0), 0);

        document.getElementById('analytics-body').innerHTML = `
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">Total Job Files</dt>
                                    <dd class="text-lg font-medium text-gray-900">${totalJobs}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">Total Profit</dt>
                                    <dd class="text-lg font-medium text-gray-900">KD ${totalProfit.toFixed(2)}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">Pending Files</dt>
                                    <dd class="text-lg font-medium text-gray-900">${pendingJobs}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-white overflow-hidden shadow rounded-lg">
                    <div class="p-5">
                        <div class="flex items-center">
                            <div class="flex-shrink-0">
                                <div class="w-8 h-8 bg-green-600 rounded-md flex items-center justify-center">
                                    <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                            </div>
                            <div class="ml-5 w-0 flex-1">
                                <dl>
                                    <dt class="text-sm font-medium text-gray-500 truncate">Approved Files</dt>
                                    <dd class="text-lg font-medium text-gray-900">${approvedJobs}</dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Job Files Table -->
            <div class="bg-white shadow rounded-lg">
                <div class="px-4 py-5 sm:p-6">
                    <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Job Files</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job File No.</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipper</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Consignee</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${jobFiles.slice(0, 10).map(file => `
                                    <tr>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${file.jfn || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${file.sh || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${file.co || 'N/A'}</td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">KD ${(file.totalProfit || 0).toFixed(2)}</td>
                                        <td class="px-6 py-4 whitespace-nowrap">
                                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(file.status)}">
                                                ${(file.status || 'pending').charAt(0).toUpperCase() + (file.status || 'pending').slice(1)}
                                            </span>
                                        </td>
                                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button onclick="loadJobFile('${file.id}')" class="text-indigo-600 hover:text-indigo-900 mr-2">Load</button>
                                            <button onclick="previewJobFile('${file.id}')" class="text-blue-600 hover:text-blue-900">Preview</button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusColor(status) {
        switch(status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'checked': return 'bg-blue-100 text-blue-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    }

    setupEventListeners() {
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