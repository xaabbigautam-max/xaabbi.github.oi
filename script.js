// ============================================
// Firebase Configuration
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDYex9rqZxHz0-uoytIOmdIsI5Uwb_TRTw",
  authDomain: "work-management-ls.firebaseapp.com",
  databaseURL: "https://work-management-ls-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "work-management-ls",
  storageBucket: "work-management-ls.firebasestorage.app",
  messagingSenderId: "322143885128",
  appId: "1:322143885128:web:218cca78bceca9788a457d"
};

// ============================================
// Global Variables
// ============================================
let firebaseApp, auth, db;
let isOnline = navigator.onLine;
let isFirebaseInitialized = false;
let currentUser = null;
let tasks = {};
let employees = {};
let isAdmin = false;
let isSystemAdmin = false;
let currentUserEmail = "";
let currentUserName = "";

// Hardcoded credentials
const teamMembers = {
    'subash@teamlead.com': { name: 'Subash Rai', password: 'Subash@866', zone: 'Downtown', role: 'team', department: 'Landscaping', is_active: true, is_hardcoded: true },
    'pawan@teamlead.com': { name: 'Pawan Koirala', password: 'Pawan@592', zone: 'Areesh/Green Team/PODs Indoor', role: 'team', department: 'Maintenance', is_active: true, is_hardcoded: true },
    'sujan@teamlead.com': { name: 'Sujan Subedi', password: 'Sujan@576', zone: 'MUD IP', role: 'team', department: 'Irrigation', is_active: true, is_hardcoded: true },
    'saroj@teamlead.com': { name: 'Saroj Pokhrel', password: 'Saroj@511', zone: 'PODs/VIP/RC/gate 5', role: 'team', department: 'VIP Services', is_active: true, is_hardcoded: true },
    'taraknath@teamlead.com': { name: 'Taraknath Sharma', password: 'Tarak@593', zone: 'Golf Landscaping', role: 'team', department: 'Golf Course', is_active: true, is_hardcoded: true },
    'ghadindra@teamlead.com': { name: 'Ghadindra Chaulagain', password: 'Ghadin@570', zone: 'Irrigation MUD/IP/POD/GATE 5', role: 'team', department: 'Irrigation', is_active: true, is_hardcoded: true },
    'shambhu@teamlead.com': { name: 'Shambhu Kumar Sah', password: 'Shambhu@506', zone: 'Irrigation Areesh/Downtown', role: 'team', department: 'Irrigation', is_active: true, is_hardcoded: true },
    'sunil@teamlead.com': { name: 'Sunil Kumar Sah Sudi', password: 'Sunil@583', zone: 'Palm Trees', role: 'team', department: 'Irrigation', is_active: true, is_hardcoded: true }
};

const adminCredentials = {
    'admin@landscape.com': { password: 'Landscape@2025', name: 'System Admin', role: 'system_admin', is_active: true, is_hardcoded: true },
    'victor@landscape.com': { password: 'Vic123', name: 'Victor AM', role: 'admin', is_active: true, is_hardcoded: true },
    'james@landscape.com': { password: 'Manager2025', name: 'James Manager', role: 'admin', is_active: true, is_hardcoded: true },
    'mike@landscape.com': { password: 'Michael123', name: 'Mike AM', role: 'admin', is_active: true, is_hardcoded: true },
    'chhabi@landscape.com': { password: 'Admin@2025', name: 'Chhabi Admin', role: 'system_admin', is_active: true, is_hardcoded: true }
};

const allCredentials = { ...teamMembers, ...adminCredentials };

// ============================================
// Initialize App
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log("Landscaping Task Manager Initializing...");
    
    // Setup network listeners first
    setupNetworkListeners();
    
    // Load Firebase scripts
    await loadFirebaseScripts();
    
    // Initialize Firebase
    await initializeFirebase();
    
    // Setup service worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered:', registration);
        } catch (error) {
            console.log('SW registration failed:', error);
        }
    }
    
    // Load local data
    loadLocalData();
    
    // Update UI
    updateSyncStatus();
    updateStats();
    
    console.log("App initialized. Firebase:", isFirebaseInitialized ? "CONNECTED" : "NOT CONNECTED");
});

// ============================================
// Load Firebase Scripts
// ============================================
async function loadFirebaseScripts() {
    return new Promise((resolve, reject) => {
        if (typeof firebase !== 'undefined') {
            console.log("Firebase already loaded");
            resolve();
            return;
        }
        
        console.log("Loading Firebase SDK...");
        
        const script1 = document.createElement('script');
        script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        
        script1.onload = () => {
            console.log("Firebase App loaded");
            
            const script2 = document.createElement('script');
            script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
            
            script2.onload = () => {
                console.log("Firebase Database loaded");
                resolve();
            };
            
            script2.onerror = reject;
            document.head.appendChild(script2);
        };
        
        script1.onerror = reject;
        document.head.appendChild(script1);
        
        setTimeout(() => {
            if (typeof firebase === 'undefined') {
                console.warn("Firebase loading timeout - running offline");
                resolve();
            }
        }, 10000);
    });
}

// ============================================
// Initialize Firebase
// ============================================
async function initializeFirebase() {
    try {
        console.log("Initializing Firebase...");
        
        if (typeof firebase === 'undefined') {
            throw new Error("Firebase SDK not available");
        }
        
        if (!firebase.apps.length) {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log("Firebase App initialized");
        } else {
            firebaseApp = firebase.app();
            console.log("Firebase App already initialized");
        }
        
        db = firebase.database();
        console.log("Firebase Database initialized");
        
        // Test connection
        const testRef = db.ref('.info/connected');
        testRef.on('value', (snapshot) => {
            const connected = snapshot.val();
            isFirebaseInitialized = connected;
            console.log("Firebase connection:", connected ? "CONNECTED" : "DISCONNECTED");
            
            if (connected) {
                console.log("SUCCESS: Firebase connected!");
                showNotification("Connected to server - Real-time sync active", "success");
                
                // Start listening for data
                startFirebaseListeners();
                
                // Sync local data
                syncLocalData();
            } else {
                console.log("Firebase disconnected");
                showNotification("Server disconnected - Using local data", "warning");
            }
            
            updateSyncStatus();
        });
        
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        isFirebaseInitialized = false;
        showNotification("Running in offline mode. Data saved locally.", "warning");
        updateSyncStatus();
    }
}

// ============================================
// Start Firebase Listeners
// ============================================
function startFirebaseListeners() {
    if (!db) return;
    
    console.log("Starting Firebase listeners...");
    
    // Listen for tasks
    db.ref('tasks').on('value', (snapshot) => {
        const firebaseTasks = snapshot.val() || {};
        console.log(`Tasks updated: ${Object.keys(firebaseTasks).length} tasks`);
        
        tasks = firebaseTasks;
        
        // Save to localStorage
        try {
            localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        } catch (e) {
            console.warn("Could not save tasks to localStorage:", e);
        }
        
        // Update UI
        updateUI();
        updateStats();
        
        // Trigger event for pages
        window.dispatchEvent(new CustomEvent('taskUpdate'));
    });
    
    // Listen for employees
    db.ref('employees').on('value', (snapshot) => {
        const firebaseEmployees = snapshot.val() || {};
        console.log(`Employees updated: ${Object.keys(firebaseEmployees).length} employees`);
        
        employees = firebaseEmployees;
        
        // Save to localStorage
        try {
            localStorage.setItem('greenfield_employees', JSON.stringify(employees));
        } catch (e) {
            console.warn("Could not save employees to localStorage:", e);
        }
        
        // Trigger event for pages
        window.dispatchEvent(new CustomEvent('employeeUpdate'));
    });
}

// ============================================
// Sync Local Data
// ============================================
function syncLocalData() {
    if (!isFirebaseInitialized || !db) return;
    
    console.log("Syncing local data with Firebase...");
    
    // Load local tasks
    const localTasks = JSON.parse(localStorage.getItem('greenfield_tasks') || '{}');
    
    // Upload any local tasks that aren't in Firebase
    Object.entries(localTasks).forEach(([taskId, task]) => {
        if (!tasks[taskId]) {
            console.log("Uploading local task to Firebase:", taskId);
            db.ref(`tasks/${taskId}`).set(task)
                .then(() => console.log("Task synced:", taskId))
                .catch(err => console.error("Sync error:", err));
        }
    });
}

// ============================================
// Load Local Data
// ============================================
function loadLocalData() {
    try {
        // Load tasks
        const savedTasks = localStorage.getItem('greenfield_tasks');
        if (savedTasks) {
            tasks = JSON.parse(savedTasks);
        }
        
        // Load employees
        const savedEmployees = localStorage.getItem('greenfield_employees');
        if (savedEmployees) {
            employees = JSON.parse(savedEmployees);
        }
        
        // Load user
        const savedUser = localStorage.getItem('greenfield_user');
        if (savedUser) {
            const userData = JSON.parse(savedUser);
            currentUserEmail = userData.email;
            currentUserName = userData.name;
            isAdmin = userData.isAdmin || false;
            isSystemAdmin = userData.isSystemAdmin || false;
        }
    } catch (error) {
        console.error("Error loading local data:", error);
    }
}

// ============================================
// Network Handling
// ============================================
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log("Device online");
        isOnline = true;
        showNotification("Back online", "success");
        updateSyncStatus();
        
        // Try to reconnect Firebase
        if (!isFirebaseInitialized) {
            initializeFirebase();
        }
    });
    
    window.addEventListener('offline', () => {
        console.log("Device offline");
        isOnline = false;
        showNotification("You are offline", "warning");
        updateSyncStatus();
    });
}

// ============================================
// Update Sync Status
// ============================================
function updateSyncStatus() {
    const elements = document.querySelectorAll('#syncStatusText, #connectionStatus');
    
    elements.forEach(element => {
        if (isOnline && isFirebaseInitialized) {
            element.innerHTML = '<i class="fas fa-wifi"></i> Online - Live Sync';
            element.style.color = '#4caf50';
            if (element.title) element.title = "Connected to server - Real-time sync active";
        } else if (isOnline && !isFirebaseInitialized) {
            element.innerHTML = '<i class="fas fa-wifi"></i> Online - No Server';
            element.style.color = '#ff9800';
            if (element.title) element.title = "Connected to internet but server unavailable";
        } else {
            element.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline';
            element.style.color = '#c62828';
            if (element.title) element.title = "No internet connection";
        }
    });
    
    // Update connection banner
    updateConnectionBanner();
}

// ============================================
// Update Connection Banner
// ============================================
function updateConnectionBanner() {
    const banner = document.getElementById('connectionBanner');
    if (!banner) return;
    
    if (isFirebaseInitialized) {
        banner.style.display = 'none';
    } else if (isOnline) {
        banner.style.display = 'block';
        banner.style.background = '#ff9800';
        const messageElement = document.getElementById('connectionMessage');
        if (messageElement) {
            messageElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Not connected to server - Using local data';
        }
    } else {
        banner.style.display = 'block';
        banner.style.background = '#666';
        const messageElement = document.getElementById('connectionMessage');
        if (messageElement) {
            messageElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline - No internet connection';
        }
    }
}

// ============================================
// Task Management Functions
// ============================================
async function addTask(description, zone, photoFile = null, options = {}) {
    try {
        if (!currentUserEmail) {
            showNotification("Please login first", "error");
            return false;
        }
        
        if (!description || !zone) {
            showNotification("Please fill all required fields", "error");
            return false;
        }
        
        const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        let photoBase64 = null;
        
        // Handle photo
        if (photoFile) {
            photoBase64 = await convertImageToBase64(photoFile);
        }
        
        const userData = JSON.parse(localStorage.getItem('greenfield_user') || '{}');
        const isAdminTask = isAdmin || options.is_admin_request;
        
        const taskData = {
            id: taskId,
            description: description.trim(),
            zone: zone,
            requested_by: currentUserEmail,
            requested_by_name: currentUserName || userData.name || 'Unknown',
            requested_at: new Date().toISOString(),
            status: isAdminTask ? 'approved' : 'pending',
            is_admin_request: isAdminTask,
            needs_approval: !isAdminTask,
            photoBase64: photoBase64,
            last_updated: Date.now(),
            department: userData.department || 'Not specified',
            assigned_to: options.assigned_to || null,
            assigned_to_name: options.assigned_to_name || null,
            is_assigned: !!options.assigned_to,
            is_urgent: options.is_urgent || false,
            priority: options.is_urgent ? 'urgent' : 'normal',
            assigned_by: options.assigned_to ? currentUserName : null,
            assigned_at: options.assigned_to ? new Date().toISOString() : null,
            due_date: options.due_date || null,
            created_by_admin: isAdminTask,
            visible_to_all: true,
            created_at: new Date().toISOString(),
            ...options
        };
        
        console.log("Creating task:", taskId);
        
        // Save locally first
        const localTasks = JSON.parse(localStorage.getItem('greenfield_tasks') || '{}');
        localTasks[taskId] = taskData;
        localStorage.setItem('greenfield_tasks', JSON.stringify(localTasks));
        tasks[taskId] = taskData;
        
        // Try to save to Firebase
        if (isFirebaseInitialized && db) {
            try {
                await db.ref(`tasks/${taskId}`).set(taskData);
                console.log("Task saved to Firebase");
                showNotification(`Task ${isAdminTask ? 'created' : 'submitted'}! Synced to all devices.`, "success");
                return true;
            } catch (firebaseError) {
                console.error("Firebase save error:", firebaseError);
                showNotification("Task saved locally. Will sync when server is available.", "warning");
                return true;
            }
        } else {
            showNotification("Task saved locally. Will sync when server is available.", "warning");
            return true;
        }
        
    } catch (error) {
        console.error("Error adding task:", error);
        showNotification("Failed to add task: " + error.message, "error");
        return false;
    }
}

// ============================================
// Admin Task Functions
// ============================================
async function createAdminTask(description, zone, photoFile = null, employeeEmail = null) {
    const options = {
        is_admin_request: true,
        needs_approval: false,
        assigned_to: employeeEmail || null,
        is_urgent: false
    };
    
    if (employeeEmail) {
        // Get employee name
        const allEmps = await getAllEmployees();
        const employee = allEmps[employeeEmail];
        if (employee) {
            options.assigned_to_name = employee.name;
        }
    }
    
    return addTask(description, zone, photoFile, options);
}

async function createUrgentTask(description, zone, photoFile = null, employeeEmail = null) {
    const options = {
        is_admin_request: true,
        needs_approval: false,
        assigned_to: employeeEmail || null,
        is_urgent: true
    };
    
    if (employeeEmail) {
        // Get employee name
        const allEmps = await getAllEmployees();
        const employee = allEmps[employeeEmail];
        if (employee) {
            options.assigned_to_name = employee.name;
        }
    }
    
    return addTask(description, zone, photoFile, options);
}

async function assignTask(taskId, employeeEmail, dueDate = null) {
    try {
        if (!taskId || !employeeEmail) {
            showNotification("Missing task ID or employee email", "error");
            return false;
        }
        
        // Get task
        const task = tasks[taskId];
        if (!task) {
            showNotification("Task not found", "error");
            return false;
        }
        
        // Get employee name
        const allEmps = await getAllEmployees();
        const employee = allEmps[employeeEmail];
        if (!employee) {
            showNotification("Employee not found", "error");
            return false;
        }
        
        // Update task
        const updates = {
            assigned_to: employeeEmail,
            assigned_to_name: employee.name,
            assigned_by: currentUserName,
            assigned_at: new Date().toISOString(),
            is_assigned: true,
            due_date: dueDate || null,
            last_updated: Date.now()
        };
        
        // Update locally
        Object.assign(task, updates);
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        // Update Firebase
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).update(updates);
            showNotification("Task assigned successfully! Synced to all devices.", "success");
        } else {
            showNotification("Task assigned locally. Will sync when server is available.", "warning");
        }
        
        // Trigger update
        window.dispatchEvent(new CustomEvent('taskUpdate'));
        return true;
        
    } catch (error) {
        console.error("Error assigning task:", error);
        showNotification("Error: " + error.message, "error");
        return false;
    }
}

async function approveTask(taskId, note = "") {
    try {
        const task = tasks[taskId];
        if (!task) {
            showNotification("Task not found", "error");
            return false;
        }
        
        const updates = {
            status: 'approved',
            approved_by: currentUserEmail,
            approved_by_name: currentUserName,
            approved_at: new Date().toISOString(),
            approval_note: note || null,
            last_updated: Date.now()
        };
        
        // Update locally
        Object.assign(task, updates);
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        // Update Firebase
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).update(updates);
            showNotification("Task approved! Synced to all devices.", "success");
        } else {
            showNotification("Task approved locally. Will sync when server is available.", "warning");
        }
        
        window.dispatchEvent(new CustomEvent('taskUpdate'));
        return true;
        
    } catch (error) {
        console.error("Error approving task:", error);
        showNotification("Error: " + error.message, "error");
        return false;
    }
}

async function rejectTask(taskId, reason = "") {
    try {
        const task = tasks[taskId];
        if (!task) {
            showNotification("Task not found", "error");
            return false;
        }
        
        const updates = {
            status: 'rejected',
            rejected_by: currentUserEmail,
            rejected_by_name: currentUserName,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason || null,
            last_updated: Date.now()
        };
        
        // Update locally
        Object.assign(task, updates);
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        // Update Firebase
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).update(updates);
            showNotification("Task rejected! Synced to all devices.", "success");
        } else {
            showNotification("Task rejected locally. Will sync when server is available.", "warning");
        }
        
        window.dispatchEvent(new CustomEvent('taskUpdate'));
        return true;
        
    } catch (error) {
        console.error("Error rejecting task:", error);
        showNotification("Error: " + error.message, "error");
        return false;
    }
}

async function markTaskComplete(taskId) {
    try {
        const task = tasks[taskId];
        if (!task) {
            showNotification("Task not found", "error");
            return false;
        }
        
        const updates = {
            status: 'completed',
            completed_by: currentUserEmail,
            completed_by_name: currentUserName,
            completed_at: new Date().toISOString(),
            last_updated: Date.now()
        };
        
        // Update locally
        Object.assign(task, updates);
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        // Update Firebase
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).update(updates);
            showNotification("Task marked as complete! Synced to all devices.", "success");
        } else {
            showNotification("Task completed locally. Will sync when server is available.", "warning");
        }
        
        window.dispatchEvent(new CustomEvent('taskUpdate'));
        return true;
        
    } catch (error) {
        console.error("Error completing task:", error);
        showNotification("Error: " + error.message, "error");
        return false;
    }
}

async function deleteTask(taskId) {
    try {
        if (!confirm("Are you sure you want to delete this task?")) {
            return false;
        }
        
        // Delete locally
        delete tasks[taskId];
        localStorage.setItem('greenfield_tasks', JSON.stringify(tasks));
        
        // Delete from Firebase
        if (isFirebaseInitialized && db) {
            await db.ref(`tasks/${taskId}`).remove();
            showNotification("Task deleted! Synced to all devices.", "success");
        } else {
            showNotification("Task deleted locally. Will sync when server is available.", "warning");
        }
        
        window.dispatchEvent(new CustomEvent('taskUpdate'));
        return true;
        
    } catch (error) {
        console.error("Error deleting task:", error);
        showNotification("Error: " + error.message, "error");
        return false;
    }
}

// ============================================
// Employee Management Functions
// ============================================
async function getAllEmployees() {
    try {
        const allEmps = { ...employees, ...allCredentials };
        return allEmps;
    } catch (error) {
        console.error("Error getting employees:", error);
        return { ...allCredentials };
    }
}

async function addEmployee(employeeData) {
    try {
        const { email, name, password, department, zone, role } = employeeData;
        
        if (!email || !name || !password) {
            showNotification("Please fill all required fields", "error");
            return false;
        }
        
        if (!validateEmail(email)) {
            showNotification("Please enter a valid email address", "error");
            return false;
        }
        
        const lowerEmail = email.toLowerCase();
        
        // Check if employee already exists
        const allEmps = await getAllEmployees();
        if (allEmps[lowerEmail]) {
            showNotification("Employee with this email already exists", "error");
            return false;
        }
        
        const employee = {
            name: name,
            email: lowerEmail,
            password: password,
            department: department || 'Not specified',
            zone: zone || 'Not assigned',
            role: role || 'team',
            is_active: true,
            created_at: new Date().toISOString(),
            created_by: currentUserName || 'System'
        };
        
        // Save to localStorage
        employees[lowerEmail] = employee;
        localStorage.setItem('greenfield_employees', JSON.stringify(employees));
        
        // Save to Firebase
        if (isFirebaseInitialized && db) {
            await db.ref(`employees/${lowerEmail}`).set(employee);
            showNotification("Employee added successfully! Synced to all devices.", "success");
        } else {
            showNotification("Employee added locally. Will sync when server is available.", "warning");
        }
        
        window.dispatchEvent(new CustomEvent('employeeUpdate'));
        return true;
        
    } catch (error) {
        console.error("Error adding employee:", error);
        showNotification("Error: " + error.message, "error");
        return false;
    }
}

// ============================================
// Utility Functions
// ============================================
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showNotification(message, type = 'info') {
    // Remove old notifications
    document.querySelectorAll('.notification').forEach(n => {
        if (n.parentElement) n.parentElement.removeChild(n);
    });
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 
                          type === 'success' ? 'check-circle' : 
                          type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.parentElement.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

function updateStats() {
    const taskArray = Object.values(tasks || {});
    const stats = {
        'totalTasks': taskArray.length,
        'pendingTasks': taskArray.filter(t => t.status === 'pending').length,
        'approvedTasks': taskArray.filter(t => t.status === 'approved').length,
        'completedTasks': taskArray.filter(t => t.status === 'completed').length,
        'needsApprovalTasks': taskArray.filter(t => t.needs_approval && t.status === 'pending').length,
        'urgentTasks': taskArray.filter(t => t.is_urgent).length
    };
    
    Object.entries(stats).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    });
}

function updateUI() {
    const page = window.location.pathname.split('/').pop();
    
    if (page === 'team.html' && typeof window.renderCurrentTab === 'function') {
        window.renderCurrentTab();
    } else if (page === 'admin.html') {
        if (typeof window.updateAdminDashboard === 'function') window.updateAdminDashboard();
        if (typeof window.renderApprovalTasks === 'function') window.renderApprovalTasks();
        if (typeof window.filterTasks === 'function') window.filterTasks();
    }
}

function getAllTasks() {
    return Object.values(tasks || {});
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function getStatusIcon(status) {
    switch(status) {
        case 'pending': return 'clock';
        case 'approved': return 'check-circle';
        case 'completed': return 'flag-checkered';
        case 'cancelled': return 'times-circle';
        case 'rejected': return 'ban';
        default: return 'question-circle';
    }
}

// ============================================
// Login Functions
// ============================================
async function teamLogin(email, password) {
    try {
        const lowerEmail = email.toLowerCase().trim();
        
        if (teamMembers[lowerEmail]) {
            if (teamMembers[lowerEmail].password === password) {
                return loginSuccess(teamMembers[lowerEmail].name, lowerEmail, false, false, teamMembers[lowerEmail]);
            }
        }
        
        // Check Firebase if connected
        if (isFirebaseInitialized && db) {
            const snapshot = await db.ref(`employees/${lowerEmail}`).once('value');
            const employee = snapshot.val();
            
            if (employee && employee.password === password && employee.role === 'team') {
                return loginSuccess(employee.name, lowerEmail, false, false, employee);
            }
        }
        
        showNotification("Invalid credentials", "error");
        return false;
    } catch (error) {
        showNotification("Login failed", "error");
        return false;
    }
}

async function adminLogin(email, password) {
    try {
        const lowerEmail = email.toLowerCase().trim();
        
        if (adminCredentials[lowerEmail]) {
            if (adminCredentials[lowerEmail].password === password) {
                const admin = adminCredentials[lowerEmail];
                return loginSuccess(admin.name, lowerEmail, true, admin.role === 'system_admin', admin);
            }
        }
        
        // Check Firebase if connected
        if (isFirebaseInitialized && db) {
            const snapshot = await db.ref(`employees/${lowerEmail}`).once('value');
            const employee = snapshot.val();
            
            if (employee && employee.password === password && (employee.role === 'admin' || employee.role === 'system_admin')) {
                return loginSuccess(employee.name, lowerEmail, true, employee.role === 'system_admin', employee);
            }
        }
        
        showNotification("Invalid admin credentials", "error");
        return false;
    } catch (error) {
        showNotification("Login failed", "error");
        return false;
    }
}

function loginSuccess(name, email, isAdminFlag, isSystemAdminFlag, userData) {
    currentUser = name;
    currentUserEmail = email;
    currentUserName = name;
    isAdmin = isAdminFlag;
    isSystemAdmin = isSystemAdminFlag;
    
    const userInfo = {
        name: name,
        email: email,
        isAdmin: isAdminFlag,
        isSystemAdmin: isSystemAdminFlag,
        zone: userData.zone || '',
        department: userData.department || '',
        role: userData.role || (isAdminFlag ? 'admin' : 'team'),
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('greenfield_user', JSON.stringify(userInfo));
    
    showNotification(`Welcome ${name}!`, "success");
    
    // Start Firebase listeners if connected
    if (isFirebaseInitialized) {
        startFirebaseListeners();
    }
    
    // Redirect
    setTimeout(() => {
        if (isAdminFlag) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'team.html';
        }
    }, 500);
    
    return true;
}

function logout() {
    localStorage.removeItem('greenfield_user');
    currentUser = null;
    currentUserEmail = "";
    currentUserName = "";
    isAdmin = false;
    isSystemAdmin = false;
    
    showNotification("Logged out", "info");
    setTimeout(() => window.location.href = 'index.html', 1000);
}

function retryFirebaseConnection() {
    showNotification("Attempting to connect to server...", "info");
    
    if (typeof initializeFirebase === 'function') {
        initializeFirebase().then(() => {
            if (isFirebaseInitialized) {
                showNotification("Connected to server!", "success");
                updateConnectionBanner();
            }
        });
    }
}

// ============================================
// Export Functions
// ============================================
window.teamLogin = teamLogin;
window.adminLogin = adminLogin;
window.addTask = addTask;
window.createAdminTask = createAdminTask;
window.createUrgentTask = createUrgentTask;
window.assignTask = assignTask;
window.approveTask = approveTask;
window.rejectTask = rejectTask;
window.markTaskComplete = markTaskComplete;
window.deleteTask = deleteTask;
window.getAllTasks = getAllTasks;
window.getAllEmployees = getAllEmployees;
window.addEmployee = addEmployee;
window.showNotification = showNotification;
window.updateSyncStatus = updateSyncStatus;
window.updateStats = updateStats;
window.logout = logout;
window.retryFirebaseConnection = retryFirebaseConnection;
window.validateEmail = validateEmail;
window.getStatusIcon = getStatusIcon;

// Auto update sync status
setInterval(updateSyncStatus, 5000);
setInterval(updateConnectionBanner, 3000);