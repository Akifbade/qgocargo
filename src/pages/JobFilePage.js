import { JobFileService } from '../services/JobFileService.js';
import { ClientService } from '../services/ClientService.js';

export class JobFilePage {
    constructor() {
        this.jobFileService = new JobFileService(window.app.db);
        this.clientService = new ClientService(window.app.db);
        this.saveTimeout = null;
        this.memoryInterval = null;
        this.boundSaveHandler = null;
        this.chargeDescriptions = [];
        this.currentJobFile = null;
        this.saveTimeout = null;
    }

    async render() {
        return `
            <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                <!-- Modern Navigation -->
                <nav class="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center py-4">
                            <div class="flex items-center space-x-4">
                                <div class="text-3xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
                                    Q'go Cargo
                                </div>
                                <div class="h-6 w-px bg-gray-300"></div>
                                <span class="text-lg font-semibold text-gray-700">Job File Management</span>
                            </div>
                            <div class="flex items-center space-x-6">
                                <a href="#" onclick="navigateToDashboard()" class="text-gray-600 hover:text-blue-600 transition-colors font-medium">Dashboard</a>
                                <a href="#" onclick="navigateToFileManager()" class="text-gray-600 hover:text-blue-600 transition-colors font-medium">File Manager</a>
                                <div class="flex items-center space-x-3">
                                    <div class="w-8 h-8 bg-gradient-to-r from-blue-500 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                        ${window.app.currentUser.displayName.charAt(0).toUpperCase()}
                                    </div>
                                    <span class="text-sm text-gray-600">${window.app.currentUser.displayName} (${window.app.currentUser.role})</span>
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
                    <!-- Header Card -->
                    <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-8 mb-8">
                        <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                            <div class="flex items-center space-x-4">
                                <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center">
                                    <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                    </svg>
                                </div>
                                <div>
                                    <h1 class="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Job File</h1>
                                    <p class="text-gray-600 mt-1">Create and manage job files</p>
                                </div>
                            </div>
                            <div class="flex flex-col sm:flex-row gap-4">
                                <div class="flex items-center space-x-3">
                                    <label for="date" class="text-sm font-semibold text-gray-700">Date:</label>
                                    <input type="date" id="date" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                </div>
                                <div class="flex items-center space-x-3">
                                    <label for="po-number" class="text-sm font-semibold text-gray-700">P.O. #:</label>
                                    <input type="text" id="po-number" class="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Status Banner -->
                    <div id="rejection-banner" class="hidden mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                        <div class="flex">
                            <div class="flex-shrink-0">
                                <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                                </svg>
                            </div>
                            <div class="ml-3">
                                <p class="text-sm text-red-700">
                                    <strong>This job file was rejected.</strong> Reason: <span id="rejection-reason"></span>
                                </p>
                            </div>
                        </div>
                    </div>

                    <!-- Form Memory Indicator -->
                    <div id="memory-indicator" class="hidden mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-lg">
                        <div class="flex items-center justify-between">
                            <div class="flex">
                                <div class="flex-shrink-0">
                                    <svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                </div>
                                <div class="ml-3">
                                    <p class="text-sm text-blue-700">
                                        <strong>Unsaved changes detected.</strong> Your form data is being automatically saved.
                                    </p>
                                </div>
                            </div>
                            <button onclick="clearMemory()" class="text-blue-600 hover:text-blue-800 text-sm font-medium">Clear</button>
                        </div>
                    </div>

                    <!-- Main Form Card -->
                    <div class="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 p-8">
                        <!-- Job File Number Section -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <div class="lg:col-span-2">
                                <label for="job-file-no" class="block text-sm font-semibold text-gray-700 mb-2">Job File No.</label>
                                <input type="text" id="job-file-no" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg font-medium" placeholder="Enter unique job file number...">
                            </div>
                            <div class="flex items-end space-x-8">
                                <div class="space-y-3">
                                    <span class="block text-sm font-semibold text-gray-700">Clearance Type</span>
                                    <div class="space-y-2">
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-clearance="Export">
                                            <span class="text-sm text-gray-700">Export</span>
                                        </label>
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-clearance="Import">
                                            <span class="text-sm text-gray-700">Import</span>
                                        </label>
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-clearance="Clearance">
                                            <span class="text-sm text-gray-700">Clearance</span>
                                        </label>
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-clearance="Local Move">
                                            <span class="text-sm text-gray-700">Local Move</span>
                                        </label>
                                    </div>
                                </div>
                                <div class="space-y-3">
                                    <span class="block text-sm font-semibold text-gray-700">Product Type</span>
                                    <div class="space-y-2">
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-product="Air Freight">
                                            <span class="text-sm text-gray-700">Air Freight</span>
                                        </label>
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-product="Sea Freight">
                                            <span class="text-sm text-gray-700">Sea Freight</span>
                                        </label>
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-product="Land Freight">
                                            <span class="text-sm text-gray-700">Land Freight</span>
                                        </label>
                                        <label class="flex items-center space-x-2 cursor-pointer">
                                            <input type="checkbox" class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" data-product="Others">
                                            <span class="text-sm text-gray-700">Others</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Additional Fields -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div>
                                <label for="invoice-no" class="block text-sm font-semibold text-gray-700 mb-2">Invoice No.</label>
                                <input type="text" id="invoice-no" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="billing-date" class="block text-sm font-semibold text-gray-700 mb-2">Billing Date</label>
                                <input type="date" id="billing-date" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="salesman" class="block text-sm font-semibold text-gray-700 mb-2">Salesman</label>
                                <input type="text" id="salesman" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>

                        <!-- Shipper and Consignee -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div class="relative">
                                <label for="shipper-name" class="block text-sm font-semibold text-gray-700 mb-2">Shipper's Name</label>
                                <input type="text" id="shipper-name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" autocomplete="off">
                                <div id="shipper-suggestions" class="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg hidden max-h-40 overflow-y-auto mt-1"></div>
                            </div>
                            <div class="relative">
                                <label for="consignee-name" class="block text-sm font-semibold text-gray-700 mb-2">Consignee's Name</label>
                                <input type="text" id="consignee-name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" autocomplete="off">
                                <div id="consignee-suggestions" class="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg hidden max-h-40 overflow-y-auto mt-1"></div>
                            </div>
                        </div>

                        <!-- Shipping Details -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div>
                                <label for="mawb" class="block text-sm font-semibold text-gray-700 mb-2">MAWB / OBL / TCN No.</label>
                                <input type="text" id="mawb" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="hawb" class="block text-sm font-semibold text-gray-700 mb-2">HAWB / HBL</label>
                                <input type="text" id="hawb" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="teams-of-shipping" class="block text-sm font-semibold text-gray-700 mb-2">Teams of Shipping</label>
                                <input type="text" id="teams-of-shipping" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="origin" class="block text-sm font-semibold text-gray-700 mb-2">Origin</label>
                                <input type="text" id="origin" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="no-of-pieces" class="block text-sm font-semibold text-gray-700 mb-2">No. of Pieces</label>
                                <input type="text" id="no-of-pieces" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="gross-weight" class="block text-sm font-semibold text-gray-700 mb-2">Gross Weight</label>
                                <input type="text" id="gross-weight" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="destination" class="block text-sm font-semibold text-gray-700 mb-2">Destination</label>
                                <input type="text" id="destination" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="volume-weight" class="block text-sm font-semibold text-gray-700 mb-2">Volume Weight</label>
                                <input type="text" id="volume-weight" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>

                        <!-- More Details -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <div class="sm:col-span-2">
                                <label for="description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                <input type="text" id="description" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="carrier" class="block text-sm font-semibold text-gray-700 mb-2">Carrier / Shipping Line</label>
                                <input type="text" id="carrier" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="truck-no" class="block text-sm font-semibold text-gray-700 mb-2">Truck No. / Driver</label>
                                <input type="text" id="truck-no" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="vessel-name" class="block text-sm font-semibold text-gray-700 mb-2">Vessel's Name</label>
                                <input type="text" id="vessel-name" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="flight-voyage-no" class="block text-sm font-semibold text-gray-700 mb-2">Flight / Voyage No.</label>
                                <input type="text" id="flight-voyage-no" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                            <div>
                                <label for="container-no" class="block text-sm font-semibold text-gray-700 mb-2">Container No.</label>
                                <input type="text" id="container-no" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                            </div>
                        </div>

                        <!-- Charges Section -->
                        <div class="mb-8">
                            <div class="flex justify-between items-center mb-4">
                                <h2 class="text-2xl font-bold text-gray-800">Charges</h2>
                                <button onclick="addChargeRow()" class="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg">
                                    + Add Charge
                                </button>
                            </div>
                            <div class="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-200">
                                <table id="charges-table" class="w-full">
                                    <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
                                        <tr>
                                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Description</th>
                                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Cost</th>
                                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Selling</th>
                                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Profit</th>
                                            <th class="px-6 py-4 text-left text-sm font-semibold text-gray-700 border-b border-gray-200">Notes</th>
                                            <th class="px-6 py-4 text-center text-sm font-semibold text-gray-700 border-b border-gray-200">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody id="charges-table-body">
                                    </tbody>
                                    <tfoot class="bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <tr class="font-bold text-lg">
                                            <td class="px-6 py-4 text-right border-t-2 border-gray-300">TOTAL:</td>
                                            <td id="total-cost" class="px-6 py-4 text-right border-t-2 border-gray-300 text-red-600">0.00</td>
                                            <td id="total-selling" class="px-6 py-4 text-right border-t-2 border-gray-300 text-blue-600">0.00</td>
                                            <td id="total-profit" class="px-6 py-4 text-right border-t-2 border-gray-300 text-green-600">0.00</td>
                                            <td class="px-6 py-4 border-t-2 border-gray-300" colspan="2"></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <!-- Remarks Section -->
                        <div class="mb-8">
                            <label for="remarks" class="block text-sm font-semibold text-gray-700 mb-2">Remarks</label>
                            <textarea id="remarks" rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"></textarea>
                        </div>

                        <!-- File Info -->
                        <div id="file-info" class="text-sm text-gray-500 mb-6 p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500">
                            <div id="created-by-info" class="mb-1"></div>
                            <div id="last-updated-by-info"></div>
                        </div>

                        <!-- Approval Section -->
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                            <div class="bg-gray-50 p-6 rounded-xl">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">PREPARED BY</label>
                                <input type="text" id="prepared-by" class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100" readonly>
                            </div>
                            <div class="bg-gray-50 p-6 rounded-xl relative">
                                <div id="checked-stamp" class="absolute -top-2 -right-2 bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold transform rotate-12 hidden shadow-lg">
                                    ✓ Checked
                                </div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">CHECKED BY</label>
                                <input type="text" id="checked-by" class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 mb-3" readonly>
                                <button id="check-btn" class="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-105 shadow-lg hidden">
                                    Check Job File
                                </button>
                            </div>
                            <div class="bg-gray-50 p-6 rounded-xl relative">
                                <div id="approved-stamp" class="absolute -top-2 -right-2 bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-bold transform rotate-12 hidden shadow-lg">
                                    ✓ Approved
                                </div>
                                <div id="rejected-stamp" class="absolute -top-2 -right-2 bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-bold transform rotate-12 hidden shadow-lg">
                                    ✗ Rejected
                                </div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">APPROVED BY</label>
                                <input type="text" id="approved-by" class="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-100 mb-3" readonly>
                                <div id="approval-buttons" class="flex gap-2 hidden">
                                    <button id="approve-btn" class="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-105 shadow-lg">
                                        Approve
                                    </button>
                                    <button id="reject-btn" class="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-4 rounded-xl transition-all transform hover:scale-105 shadow-lg">
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex flex-wrap justify-center gap-4">
                            <button onclick="navigateToFileManager()" class="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                                </svg>
                                <span>Browse Files</span>
                            </button>
                            <button onclick="saveJobFile()" class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
                                </svg>
                                <span>Save to Database</span>
                            </button>
                            <button onclick="clearForm()" class="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
                                </svg>
                                <span>New Job</span>
                            </button>
                            <button onclick="printJobFile()" class="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center space-x-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                                </svg>
                                <span>Print</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Preview Modal -->
            <div id="preview-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                    <div class="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
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

            <!-- Notification Toast -->
            <div id="notification" class="fixed bottom-6 right-6 transform translate-x-full transition-transform duration-300 z-50">
                <div class="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 max-w-sm">
                    <div class="flex items-center space-x-3">
                        <div id="notification-icon" class="flex-shrink-0"></div>
                        <div id="notification-message" class="text-sm font-medium text-gray-800"></div>
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
        this.setupFormMemory();
        
        // Store bound handler reference for cleanup
        this.boundSaveHandler = () => this.saveFormToMemory();
        
        // Subscribe to clients for autocomplete
        this.clientService.subscribeToClients((clients) => {
            this.setupAutocomplete(clients);
        });

        // Load specific file if requested
        if (params.loadFile) {
            await this.loadJobFile(params.loadFile);
        } else {
            // Set current date and prepared by if not loading a file
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('prepared-by').value = window.app.currentUser.displayName;
            
            // Try to restore from memory
            this.loadFormFromMemory();
        }
    }

    initializeForm() {
        // Initialize charges table with 5 empty rows
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

    setupFormMemory() {
        // Save form data every 10 seconds
        this.memoryInterval = setInterval(() => {
            this.saveFormToMemory();
        }, 10000);

        // Save on input changes
        if (this.boundSaveHandler) {
            document.addEventListener('input', this.boundSaveHandler);
        }

        // Save on input changes with debounce
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea')) {
                this.showMemoryIndicator();
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveFormToMemory();
                }, 2000);
            }
        });

        // Save on checkbox changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                this.showMemoryIndicator();
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveFormToMemory();
                }, 2000);
            }
        });
    }

    showMemoryIndicator() {
        // Check if we're still on the job file page
        const indicator = document.getElementById('memory-indicator');
        if (!indicator) {
            return;
        }
        
        indicator.classList.remove('hidden');
        setTimeout(() => {
            indicator.classList.add('hidden');
        }, 3000);
    }

    saveFormToMemory() {
        // Check if we're still on the job file page
        if (!document.getElementById('job-file-no')) {
            return;
        }
        
        try {
            const formData = this.getFormData();
            localStorage.setItem('jobFileFormData', JSON.stringify({
                ...formData,
                savedAt: new Date().toISOString()
            }));
        } catch (error) {
            console.error('Error saving form to memory:', error);
        }
    }

    loadFormFromMemory() {
        try {
            const savedData = localStorage.getItem('jobFileFormData');
            if (savedData) {
                const data = JSON.parse(savedData);
                const savedAt = new Date(data.savedAt);
                const now = new Date();
                const hoursDiff = (now - savedAt) / (1000 * 60 * 60);
                
                // Only restore if saved within last 24 hours
                if (hoursDiff < 24) {
                    setTimeout(() => {
                        if (confirm('Found unsaved form data from ' + savedAt.toLocaleString() + '. Would you like to restore it?')) {
                            this.populateFormFromData(data);
                            this.showNotification('Form data restored successfully!', 'success');
                        } else {
                            localStorage.removeItem('jobFileFormData');
                        }
                    }, 1000);
                } else {
                    localStorage.removeItem('jobFileFormData');
                }
            }
        } catch (error) {
            console.error('Error loading form from memory:', error);
        }
    }

    setupEventListeners() {
        // Save button
        window.saveJobFile = async () => {
            const jobData = this.getFormData();
            if (!jobData.jfn) {
                this.showNotification('Please enter a Job File No.', 'error');
                return;
            }

            const isUpdate = document.getElementById('job-file-no').disabled;
            const result = await this.jobFileService.saveJobFile(jobData, isUpdate);
            
            if (result.success) {
                this.showNotification('Job file saved successfully!', 'success');
                if (!isUpdate) {
                    document.getElementById('job-file-no').disabled = true;
                }
                await this.loadJobFile(result.docId);
                // Clear memory after successful save
                localStorage.removeItem('jobFileFormData');
            } else {
                this.showNotification(result.error, 'error');
            }
        };

        // Clear form
        window.clearForm = () => {
            // Clear localStorage memory
            localStorage.removeItem('jobFileFormData');
            
            document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(input => input.value = '');
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
            document.getElementById('job-file-no').disabled = false;
            document.getElementById('charges-table-body').innerHTML = '';
            this.initializeForm();
            document.getElementById('date').valueAsDate = new Date();
            document.getElementById('prepared-by').value = window.app.currentUser.displayName;
            this.showNotification('Form cleared. Ready for a new job file.', 'success');
        };

        // Clear memory function
        window.clearMemory = () => {
            localStorage.removeItem('jobFileFormData');
            document.getElementById('memory-indicator').classList.add('hidden');
            this.showNotification('Form memory cleared.', 'success');
        };

        // Print function
        window.printJobFile = () => {
            const data = this.getFormData();
            this.printJobFileData(data);
        };

        // Navigation functions
        window.navigateToDashboard = () => window.app.router.navigate('dashboard');
        window.navigateToFileManager = () => window.app.router.navigate('file-manager');
        window.logout = async () => {
            await window.app.authService.logout();
        };

        // Add charge row function
        window.addChargeRow = (data = {}) => this.addChargeRow(data);

        // Preview and close functions
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
                            table { border-collapse: collapse; width: 100%; }
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

        // Approval functions
        window.checkJobFile = async () => {
            if (!window.app.authService.requireChecker()) return;
            
            const jobFileNo = document.getElementById('job-file-no').value.trim();
            if (!jobFileNo) {
                this.showNotification('Please save or load a job file first.', 'error');
                return;
            }
            
            const docId = jobFileNo.replace(/\//g, '_');
            const result = await this.jobFileService.updateJobFileStatus(docId, 'checked', {
                checkedBy: window.app.currentUser.displayName,
                checkedAt: new Date()
            });
            
            if (result.success) {
                this.showNotification('Job File Checked!', 'success');
                await this.loadJobFile(docId);
            } else {
                this.showNotification(result.error, 'error');
            }
        };

        window.approveJobFile = async () => {
            if (!window.app.authService.requireAdmin()) return;
            
            const jobFileNo = document.getElementById('job-file-no').value.trim();
            if (!jobFileNo) {
                this.showNotification('Please save or load a job file first.', 'error');
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
                this.showNotification('Job File Approved!', 'success');
                await this.loadJobFile(docId);
            } else {
                this.showNotification(result.error, 'error');
            }
        };

        window.rejectJobFile = async () => {
            if (!window.app.authService.requireAdmin()) return;
            
            const reason = prompt('Please provide a reason for rejecting this job file:');
            if (!reason) return;
            
            const jobFileNo = document.getElementById('job-file-no').value.trim();
            if (!jobFileNo) {
                this.showNotification('Please save or load a job file first.', 'error');
                return;
            }
            
            const docId = jobFileNo.replace(/\//g, '_');
            const result = await this.jobFileService.updateJobFileStatus(docId, 'rejected', {
                rejectedBy: window.app.currentUser.displayName,
                rejectedAt: new Date(),
                rejectionReason: reason
            });
            
            if (result.success) {
                this.showNotification('Job File Rejected!', 'success');
                await this.loadJobFile(docId);
            } else {
                this.showNotification(result.error, 'error');
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
        newRow.className = 'hover:bg-gray-50 transition-colors';

        newRow.innerHTML = `
            <td class="px-6 py-4 border-b border-gray-200">
                <input type="text" class="description-input w-full border-none p-0 bg-transparent focus:outline-none" value="${data.l || ''}" autocomplete="off" placeholder="Enter charge description...">
            </td>
            <td class="px-6 py-4 border-b border-gray-200">
                <input type="number" class="cost-input w-full border-none p-0 bg-transparent focus:outline-none text-right" value="${data.c || ''}" step="0.01" placeholder="0.00">
            </td>
            <td class="px-6 py-4 border-b border-gray-200">
                <input type="number" class="selling-input w-full border-none p-0 bg-transparent focus:outline-none text-right" value="${data.s || ''}" step="0.01" placeholder="0.00">
            </td>
            <td class="px-6 py-4 border-b border-gray-200 profit-output bg-gray-50 text-right font-semibold">
                ${((data.s || 0) - (data.c || 0)).toFixed(2)}
            </td>
            <td class="px-6 py-4 border-b border-gray-200">
                <input type="text" class="notes-input w-full border-none p-0 bg-transparent focus:outline-none" value="${data.n || ''}" placeholder="Notes...">
            </td>
            <td class="px-6 py-4 border-b border-gray-200 text-center">
                <button class="text-red-500 hover:text-red-700 font-bold text-xl transition-colors">&times;</button>
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
            this.showNotification('Job file loaded successfully.', 'success');
            // Clear memory after loading
            localStorage.removeItem('jobFileFormData');
        } else {
            this.showNotification(result.error, 'error');
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
                    `<div class="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0" onclick="selectClient('${inputId}', '${client.name}')">${client.name}</div>`
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

    printJobFileData(data) {
        const printContent = this.generatePrintHTML(data);
        const printWindow = window.open('', '', 'height=800,width=1200');
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 750);
    }

    generatePrintHTML(data) {
        const totalCost = data.totalCost || 0;
        const totalSelling = data.totalSelling || 0;
        const totalProfit = data.totalProfit || 0;

        return `
            <html>
                <head>
                    <title>Job File - ${data.jfn}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        table { border-collapse: collapse; width: 100%; margin: 10px 0; }
                        td, th { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
                        .header { font-size: 24px; font-weight: bold; text-align: center; }
                        .company { color: #0E639C; }
                        .company span { color: #4FB8AF; }
                        .field-label { font-weight: bold; }
                        .total-row { background-color: #f0f0f0; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <table>
                        <tr>
                            <td colspan="3" class="company header">Q'go<span>Cargo</span></td>
                            <td colspan="3" class="header">JOB FILE</td>
                            <td colspan="2">
                                <div><strong>Date:</strong> ${data.d || ''}</div>
                                <div><strong>P.O. #:</strong> ${data.po || ''}</div>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="8"><strong>Job File No.:</strong> ${data.jfn || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="4"><strong>Shipper:</strong> ${data.sh || ''}</td>
                            <td colspan="4"><strong>Consignee:</strong> ${data.co || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="4"><strong>MAWB:</strong> ${data.mawb || ''}</td>
                            <td colspan="4"><strong>HAWB:</strong> ${data.hawb || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="8"><strong>Description:</strong> ${data.dsc || ''}</td>
                        </tr>
                        <tr>
                            <td colspan="8">
                                <table style="width: 100%; margin: 0;">
                                    <thead>
                                        <tr style="background-color: #f0f0f0;">
                                            <th>Description</th>
                                            <th>Cost</th>
                                            <th>Selling</th>
                                            <th>Profit</th>
                                            <th>Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(data.ch || []).map(c => `
                                            <tr>
                                                <td>${c.l}</td>
                                                <td>${c.c}</td>
                                                <td>${c.s}</td>
                                                <td>${(parseFloat(c.s || 0) - parseFloat(c.c || 0)).toFixed(2)}</td>
                                                <td>${c.n || ''}</td>
                                            </tr>
                                        `).join('')}
                                        <tr class="total-row">
                                            <td><strong>TOTAL:</strong></td>
                                            <td><strong>${totalCost.toFixed(2)}</strong></td>
                                            <td><strong>${totalSelling.toFixed(2)}</strong></td>
                                            <td><strong>${totalProfit.toFixed(2)}</strong></td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td colspan="8"><strong>REMARKS:</strong><br>${(data.re || '').replace(/\n/g, '<br>')}</td>
                        </tr>
                        <tr>
                            <td colspan="2"><strong>PREPARED BY:</strong><br>${data.pb || ''}</td>
                            <td colspan="3"><strong>CHECKED BY:</strong><br>${data.checkedBy || 'Pending'}</td>
                            <td colspan="3"><strong>APPROVED BY:</strong><br>${data.approvedBy || 'Pending'}</td>
                        </tr>
                    </table>
                </body>
            </html>
        `;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icon = document.getElementById('notification-icon');
        const messageEl = document.getElementById('notification-message');

        // Set icon based on type
        if (type === 'success') {
            icon.innerHTML = '<div class="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>';
        } else if (type === 'error') {
            icon.innerHTML = '<div class="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>';
        } else {
            icon.innerHTML = '<div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center"><svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>';
        }

        messageEl.textContent = message;
        
        // Show notification
        notification.classList.remove('translate-x-full');
        
        // Hide after 4 seconds
        setTimeout(() => {
            notification.classList.add('translate-x-full');
        }, 4000);
    }

    cleanup() {
        // Clear intervals and timeouts
        if (this.memoryInterval) {
            clearInterval(this.memoryInterval);
            this.memoryInterval = null;
        }
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        
        // Remove event listeners
        if (this.boundSaveHandler) {
            document.removeEventListener('input', this.boundSaveHandler);
            this.boundSaveHandler = null;
        }
        
        // Cleanup services
        if (this.jobFileService) {
            this.jobFileService.cleanup();
        }
        if (this.clientService) {
            this.clientService.cleanup();
        }
    }
}