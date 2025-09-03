export class AnalyticsPage {
    constructor() {
        this.jobFileService = null;
        this.chartInstance = null;
    }

    async render() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
                <!-- Modern Navigation -->
                <nav class="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center py-4">
                            <div class="flex items-center space-x-4">
                                <div class="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-500 bg-clip-text text-transparent">
                                    Q'go Cargo
                                </div>
                                <div class="h-6 w-px bg-gray-300"></div>
                                <span class="text-lg font-semibold text-gray-700">Analytics</span>
                            </div>
                            <div class="flex items-center space-x-6">
                                <a href="#" onclick="navigateToDashboard()" class="text-gray-600 hover:text-green-600 transition-colors font-medium">Dashboard</a>
                                <a href="#" onclick="navigateToJobFile()" class="text-gray-600 hover:text-green-600 transition-colors font-medium">Job Files</a>
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
                            <div class="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center">
                                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                </svg>
                            </div>
                        </div>
                        <h1 class="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">Analytics Dashboard</h1>
                        <p class="mt-2 text-gray-600 text-lg">Monitor your job files performance and analytics</p>
                    </div>

                    <!-- Analytics Content -->
                    <div id="analytics-body" class="space-y-8">
                        <div class="text-center py-12">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
                            <p class="mt-4 text-gray-600">Loading analytics data...</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preview Modal -->
            <div id="preview-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
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
        const checkedJobs = jobFiles.filter(job => job.status === 'checked').length;

        const totalProfit = jobFiles.reduce((sum, job) => sum + (job.totalProfit || 0), 0);
        const totalCost = jobFiles.reduce((sum, job) => sum + (job.totalCost || 0), 0);
        const totalRevenue = jobFiles.reduce((sum, job) => sum + (job.totalSelling || 0), 0);

        // Calculate monthly data
        const monthlyData = {};
        jobFiles.forEach(job => {
            if (job.bd) {
                const month = job.bd.substring(0, 7);
                if (!monthlyData[month]) {
                    monthlyData[month] = { profit: 0, count: 0 };
                }
                monthlyData[month].profit += (job.totalProfit || 0);
                monthlyData[month].count++;
            }
        });

        document.getElementById('analytics-body').innerHTML = `
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Total Jobs</p>
                            <p class="text-2xl font-bold text-gray-900">${totalJobs}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Total Profit</p>
                            <p class="text-2xl font-bold text-green-600">KD ${totalProfit.toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Pending</p>
                            <p class="text-2xl font-bold text-yellow-600">${pendingJobs}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Checked</p>
                            <p class="text-2xl font-bold text-blue-600">${checkedJobs}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-6 hover:shadow-2xl transition-all transform hover:scale-105">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <div class="w-12 h-12 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center">
                                <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                </svg>
                            </div>
                        </div>
                        <div class="ml-4">
                            <p class="text-sm font-medium text-gray-600">Approved</p>
                            <p class="text-2xl font-bold text-green-600">${approvedJobs}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Job Files Table -->
            <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50">
                <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-2xl">
                    <div class="flex justify-between items-center">
                        <h3 class="text-xl font-bold text-gray-800">Recent Job Files</h3>
                        <button onclick="exportToCSV()" class="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-all transform hover:scale-105">
                            Export CSV
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
                            <tr>
                                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Job File No.</th>
                                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Shipper</th>
                                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Consignee</th>
                                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Profit</th>
                                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                                <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${jobFiles.slice(0, 20).map(file => `
                                <tr class="hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 transition-all">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-bold text-purple-600">${file.jfn || 'N/A'}</div>
                                        <div class="text-xs text-gray-500">${file.mawb || 'No MAWB'}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${file.sh || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${file.co || 'N/A'}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-bold text-green-600">KD ${(file.totalProfit || 0).toFixed(2)}</div>
                                        <div class="text-xs text-red-500">Cost: KD ${(file.totalCost || 0).toFixed(2)}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(file.status)}">
                                            ${(file.status || 'pending').charAt(0).toUpperCase() + (file.status || 'pending').slice(1)}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onclick="loadJobFile('${file.id}')" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-1 px-3 rounded-lg transition-all transform hover:scale-105">Load</button>
                                        <button onclick="previewJobFile('${file.id}')" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-1 px-3 rounded-lg transition-all transform hover:scale-105">Preview</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    getStatusColor(status) {
        switch(status) {
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            case 'checked': return 'bg-blue-100 text-blue-800 border-blue-200';
            default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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

        window.exportToCSV = () => {
            const jobFiles = this.jobFileService.getJobFilesCache();
            let csvContent = "data:text/csv;charset=utf-8,Job File No,Shipper,Consignee,Profit,Cost,Revenue,Status,Created By,Date\n";
            
            jobFiles.forEach(job => {
                const rowData = [
                    job.jfn || job.id, 
                    job.sh || 'N/A', 
                    job.co || 'N/A', 
                    (job.totalProfit || 0).toFixed(2), 
                    (job.totalCost || 0).toFixed(2),
                    (job.totalSelling || 0).toFixed(2),
                    job.status || 'pending', 
                    job.createdBy || 'N/A',
                    job.d || 'N/A'
                ];
                const row = rowData.map(d => `"${String(d).replace(/"/g, '""')}"`).join(",");
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "job_files_analytics.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
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
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
    }
}