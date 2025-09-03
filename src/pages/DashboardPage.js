export class DashboardPage {
    constructor() {
        this.jobFileService = null;
    }

    async render() {
        return `
            <div class="min-h-screen bg-gray-100">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center py-4">
                            <div class="flex items-center">
                                <div class="text-2xl font-bold" style="color: #0E639C;">
                                    Q'go<span style="color: #4FB8AF;">Cargo</span>
                                </div>
                            </div>
                            <div class="flex items-center space-x-4">
                                <span class="text-sm text-gray-600">Welcome, ${window.app.currentUser.displayName}</span>
                                <button onclick="logout()" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md text-sm">
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                    <div class="px-4 py-6 sm:px-0">
                        <div class="text-center mb-8">
                            <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
                            <p class="mt-2 text-gray-600">Manage your job files and system operations</p>
                        </div>

                        <!-- Quick Stats -->
                        <div id="stats-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                                                <dd class="text-lg font-medium text-gray-900" id="totalJobs">Loading...</dd>
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
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Approved Files</dt>
                                                <dd class="text-lg font-medium text-gray-900" id="approvedJobs">Loading...</dd>
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
                                                <dd class="text-lg font-medium text-gray-900" id="pendingJobs">Loading...</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white overflow-hidden shadow rounded-lg">
                                <div class="p-5">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Rejected Files</dt>
                                                <dd class="text-lg font-medium text-gray-900" id="rejectedJobs">Loading...</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Quick Actions Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onclick="navigateToJobFile()">
                                <div class="p-6">
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
                                                <dt class="text-sm font-medium text-gray-500 truncate">Job File Management</dt>
                                                <dd class="text-lg font-medium text-gray-900">Create & Manage</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onclick="navigateToAnalytics()">
                                <div class="p-6">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Analytics</dt>
                                                <dd class="text-lg font-medium text-gray-900">View Reports</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onclick="navigateToFileManager()">
                                <div class="p-6">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.586l.293.293a1 1 0 001.414 0L10.414 12l-1.293 1.293a1 1 0 000 1.414l.293.293V16a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">File Manager</dt>
                                                <dd class="text-lg font-medium text-gray-900">Browse Files</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onclick="navigateToClients()">
                                <div class="p-6">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Client Management</dt>
                                                <dd class="text-lg font-medium text-gray-900">Manage Clients</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            ${window.app.currentUser.role === 'admin' ? `
                            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onclick="navigateToAdmin()">
                                <div class="p-6">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Admin Panel</dt>
                                                <dd class="text-lg font-medium text-gray-900">System Settings</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            ` : ''}

                            <div class="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer" onclick="navigateToActivityLog()">
                                <div class="p-6">
                                    <div class="flex items-center">
                                        <div class="flex-shrink-0">
                                            <div class="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                                                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                                                </svg>
                                            </div>
                                        </div>
                                        <div class="ml-5 w-0 flex-1">
                                            <dl>
                                                <dt class="text-sm font-medium text-gray-500 truncate">Activity Log</dt>
                                                <dd class="text-lg font-medium text-gray-900">View Activity</dd>
                                            </dl>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Job Files -->
                        <div class="bg-white shadow rounded-lg">
                            <div class="px-4 py-5 sm:p-6">
                                <h3 class="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Job Files</h3>
                                <div id="recent-files" class="space-y-3">
                                    <div class="text-center py-4">
                                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                                        <p class="mt-2 text-gray-600">Loading recent files...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    async init() {
        // Import JobFileService dynamically
        const { JobFileService } = await import('../services/JobFileService.js');
        this.jobFileService = new JobFileService(window.app.db);
        
        // Subscribe to job files for real-time updates
        this.jobFileService.subscribeToJobFiles((jobFiles) => {
            this.updateStats(jobFiles);
            this.displayRecentFiles(jobFiles.slice(0, 5));
        });

        this.setupEventListeners();
    }

    updateStats(jobFiles) {
        const totalJobs = jobFiles.length;
        const approvedJobs = jobFiles.filter(job => job.status === 'approved').length;
        const pendingJobs = jobFiles.filter(job => job.status === 'pending' || !job.status).length;
        const rejectedJobs = jobFiles.filter(job => job.status === 'rejected').length;

        document.getElementById('totalJobs').textContent = totalJobs;
        document.getElementById('approvedJobs').textContent = approvedJobs;
        document.getElementById('pendingJobs').textContent = pendingJobs;
        document.getElementById('rejectedJobs').textContent = rejectedJobs;
    }

    displayRecentFiles(files) {
        const container = document.getElementById('recent-files');
        
        if (files.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">No job files found.</p>';
            return;
        }

        const html = files.map(file => {
            const statusColor = {
                'approved': 'bg-green-100 text-green-800',
                'rejected': 'bg-red-100 text-red-800',
                'checked': 'bg-blue-100 text-blue-800',
                'pending': 'bg-yellow-100 text-yellow-800'
            }[file.status] || 'bg-gray-100 text-gray-800';

            const lastUpdated = file.updatedAt?.toDate ? file.updatedAt.toDate().toLocaleDateString() : 'N/A';

            return `
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div class="flex-1">
                        <div class="flex items-center gap-3">
                            <h4 class="text-sm font-medium text-gray-900">${file.jfn || 'No ID'}</h4>
                            <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}">
                                ${(file.status || 'pending').charAt(0).toUpperCase() + (file.status || 'pending').slice(1)}
                            </span>
                        </div>
                        <p class="text-sm text-gray-500">
                            ${file.sh || 'No shipper'} → ${file.co || 'No consignee'}
                        </p>
                        <p class="text-xs text-gray-400">Updated: ${lastUpdated}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="loadJobFile('${file.id}')" class="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                            Open
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    setupEventListeners() {
        // Global navigation functions
        window.navigateToJobFile = () => window.app.router.navigate('job-file');
        window.navigateToAnalytics = () => window.app.router.navigate('analytics');
        window.navigateToFileManager = () => window.app.router.navigate('file-manager');
        window.navigateToClients = () => window.app.router.navigate('clients');
        window.navigateToAdmin = () => window.app.router.navigate('admin');
        window.navigateToActivityLog = () => window.app.router.navigate('activity-log');
        
        window.loadJobFile = (fileId) => {
            window.app.router.navigate('job-file', { loadFile: fileId });
        };

        window.logout = async () => {
            const result = await window.app.authService.logout();
            if (result.success) {
                window.app.router.navigate('login');
            }
        };
    }

    cleanup() {
        if (this.jobFileService) {
            this.jobFileService.cleanup();
        }
    }
}