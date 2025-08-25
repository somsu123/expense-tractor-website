// DOM Elements
const addExpenseBtn = document.getElementById('addExpenseBtn');
const expenseModal = new bootstrap.Modal(document.getElementById('expenseModal'));
const expenseForm = document.getElementById('expenseForm');
const transactionTypeRadios = document.querySelectorAll('input[name="type"]');
const amountInput = document.getElementById('amount');
const descriptionInput = document.getElementById('description');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const notesInput = document.getElementById('notes');
const recentTransactionsTbody = document.getElementById('recentTransactions');
const logoutBtn = document.getElementById('logoutBtn');
const userNameElement = document.querySelector('.user-name');
const userEmailElement = document.querySelector('.user-email');

// State
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let editingId = null;

// Categories
const categories = [
    { id: 'food', name: 'Food & Drinks', icon: 'bi-cup-hot', color: '#ff6b6b' },
    { id: 'shopping', name: 'Shopping', icon: 'bi-bag', color: '#4cc9f0' },
    { id: 'transportation', name: 'Transportation', icon: 'bi-car-front', color: '#7209b7' },
    { id: 'bills', name: 'Bills & Utilities', icon: 'bi-lightning', color: '#4361ee' },
    { id: 'entertainment', name: 'Entertainment', icon: 'bi-controller', color: '#f72585' },
    { id: 'health', name: 'Health & Fitness', icon: 'bi-heart-pulse', color: '#4cc9f0' },
    { id: 'education', name: 'Education', icon: 'bi-book', color: '#4895ef' },
    { id: 'salary', name: 'Salary', icon: 'bi-cash-stack', color: '#2ecc71' },
    { id: 'other', name: 'Other', icon: 'bi-three-dots', color: '#95a5a6' },
];

// Initialize the application
function init() {
    // Check if auth module is available
    if (!window.authModule) {
        console.error('Auth module not found');
        return;
    }

    // Check if user is authenticated
    if (window.authModule.isAuthenticated()) {
        // User is authenticated, initialize the app
        initializeApp();
    } else {
        // If not authenticated, show auth overlay
        const authOverlay = document.getElementById('authOverlay');
        if (authOverlay) authOverlay.classList.add('active');
        
        // Listen for authentication changes
        document.addEventListener('authStateChanged', () => {
            if (window.authModule.isAuthenticated()) {
                initializeApp();
            }
        });
    }
}

// Initialize the main application after authentication
function initializeApp() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Update user info in the UI
    updateUserInfo();
    
    // Load transactions
    loadTransactions();
    
    // Update summary
    updateSummary();
    
    // Initialize charts
    initCharts();
    
    // Add event listeners
    addEventListeners();
}

// Update user information in the UI
function updateUserInfo() {
    const user = window.authModule.getCurrentUser();
    if (user) {
        // Update sidebar user info
        if (userNameElement) userNameElement.textContent = user.name || 'User';
        if (userEmailElement) userEmailElement.textContent = user.email || '';
        
        // Update profile dropdown
        const dropdownUserName = document.getElementById('dropdownUserName');
        const dropdownUserEmail = document.getElementById('dropdownUserEmail');
        const userAvatar = document.getElementById('userAvatar');
        const dropdownUserAvatar = document.getElementById('dropdownUserAvatar');
        
        if (dropdownUserName) dropdownUserName.textContent = user.name || 'User';
        if (dropdownUserEmail) dropdownUserEmail.textContent = user.email || '';
        
        // Set avatar with first letter of the name
        const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';
        const colors = ['#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#4895ef', '#560bad', '#7209b7', '#b5179e', '#f72585'];
        const colorIndex = Math.abs(hashCode(user.email || 'user')) % colors.length;
        const bgColor = colors[colorIndex];
        
        if (userAvatar) {
            userAvatar.textContent = firstLetter;
            userAvatar.style.backgroundColor = bgColor;
        }
        
        if (dropdownUserAvatar) {
            dropdownUserAvatar.textContent = firstLetter;
            dropdownUserAvatar.style.backgroundColor = bgColor;
        }
    }
}

// Simple string hash function
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

// Add event listeners
function addEventListeners() {
    // Logout buttons (both in sidebar and profile dropdown)
    const logoutButtons = document.querySelectorAll('#logoutBtn, .logout-btn');
    logoutButtons.forEach(button => {
        button.addEventListener('click', handleLogout);
    });
    // Add expense button
    addExpenseBtn.addEventListener('click', () => {
        editingId = null;
        expenseForm.reset();
        document.getElementById('expenseModalLabel').textContent = 'Add New Transaction';
        expenseModal.show();
    });
    
    // Form submission
    expenseForm.addEventListener('submit', handleFormSubmit);
    
    // Transaction type toggle
    transactionTypeRadios.forEach(radio => {
        radio.addEventListener('change', updateFormForTransactionType);
    });
    
    // Search functionality
    document.querySelector('.search-bar input').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        filterTransactions(searchTerm);
    });
    
    // Navigation
    document.querySelectorAll('.nav-links li').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    const transaction = {
        id: editingId || Date.now().toString(),
        type: document.querySelector('input[name="type"]:checked').value,
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value.trim(),
        category: categorySelect.value,
        date: dateInput.value,
        notes: notesInput.value.trim(),
        createdAt: new Date().toISOString()
    };
    
    if (editingId) {
        // Update existing transaction
        const index = transactions.findIndex(t => t.id === editingId);
        if (index !== -1) {
            transactions[index] = transaction;
        }
    } else {
        // Add new transaction
        transactions.unshift(transaction);
    }
    
    // Save to localStorage
    saveTransactions();
    
    // Update UI
    loadTransactions();
    updateSummary();
    updateCharts();
    
    // Close modal and reset form
    expenseModal.hide();
    expenseForm.reset();
    
    // Show success message
    showAlert('Transaction saved successfully!', 'success');
}

// Update form based on transaction type
function updateFormForTransactionType() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const incomeCategories = ['salary', 'other'];
    
    // Update category options based on transaction type
    categorySelect.innerHTML = '<option value="" disabled selected>Select a category</option>';
    
    const filteredCategories = type === 'income' 
        ? categories.filter(cat => incomeCategories.includes(cat.id))
        : categories.filter(cat => !incomeCategories.includes(cat.id));
    
    filteredCategories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categorySelect.appendChild(option);
    });
}

// Load transactions into the table
function loadTransactions() {
    // Sort transactions by date (newest first)
    const sortedTransactions = [...transactions].sort((a, b) => 
        new Date(b.date) - new Date(a.date)
    );
    
    // Show only the 5 most recent transactions in the dashboard
    const recentTransactions = sortedTransactions.slice(0, 5);
    
    recentTransactionsTbody.innerHTML = '';
    
    if (recentTransactions.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="5" class="text-center py-4 text-muted">
                No transactions yet. Click the "Add Expense" button to get started.
            </td>
        `;
        recentTransactionsTbody.appendChild(row);
        return;
    }
    
    recentTransactions.forEach(transaction => {
        const category = categories.find(cat => cat.id === transaction.category);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center">
                    <div class="category-icon me-2" style="background-color: ${category ? category.color + '20' : '#f8f9fa'}; color: ${category ? category.color : '#6c757d'}">
                        <i class="bi ${category ? category.icon : 'bi-question-circle'}"></i>
                    </div>
                    <div>
                        <div class="fw-medium">${transaction.description}</div>
                        <small class="text-muted">${formatDate(transaction.date)}</small>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge" style="background-color: ${category ? category.color + '20' : '#f8f9fa'}; color: ${category ? category.color : '#6c757d'}">
                    ${category ? category.name : 'Uncategorized'}
                </span>
            </td>
            <td>${formatDate(transaction.date, 'short')}</td>
            <td class="fw-bold ${transaction.type === 'income' ? 'text-success' : 'text-danger'}">
                ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
            </td>
            <td>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${transaction.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${transaction.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        recentTransactionsTbody.appendChild(row);
    });
    
    // Add event listeners to edit and delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', handleEdit);
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', handleDelete);
    });
}

// Handle edit transaction
function handleEdit(e) {
    const id = e.currentTarget.getAttribute('data-id');
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction) {
        editingId = id;
        
        // Set form values
        document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
        updateFormForTransactionType();
        
        // Small delay to ensure category options are updated
        setTimeout(() => {
            amountInput.value = transaction.amount;
            descriptionInput.value = transaction.description;
            categorySelect.value = transaction.category;
            dateInput.value = transaction.date;
            notesInput.value = transaction.notes || '';
            
            // Update modal title
            document.getElementById('expenseModalLabel').textContent = 'Edit Transaction';
            
            // Show modal
            expenseModal.show();
        }, 100);
    }
}

// Handle delete transaction
function handleDelete(e) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        const id = e.currentTarget.getAttribute('data-id');
        transactions = transactions.filter(t => t.id !== id);
        saveTransactions();
        loadTransactions();
        updateSummary();
        updateCharts();
        showAlert('Transaction deleted successfully!', 'success');
    }
}

// Filter transactions by search term
function filterTransactions(searchTerm) {
    const rows = document.querySelectorAll('#recentTransactions tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

// Update summary cards
function updateSummary() {
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpense;
    const savings = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    
    document.getElementById('totalIncome').textContent = totalIncome.toFixed(2);
    document.getElementById('totalExpense').textContent = totalExpense.toFixed(2);
    document.getElementById('totalBalance').textContent = balance.toFixed(2);
    document.getElementById('savings').textContent = savings.toFixed(1);
}

// Initialize charts
function initCharts() {
    // Expense Chart
    const expenseCtx = document.getElementById('expenseChart').getContext('2d');
    window.expenseChart = new Chart(expenseCtx, {
        type: 'line',
        data: {
            labels: getLastNDays(7),
            datasets: [
                {
                    label: 'Expenses',
                    data: Array(7).fill(0),
                    borderColor: '#f72585',
                    backgroundColor: 'rgba(247, 37, 133, 0.1)',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Income',
                    data: Array(7).fill(0),
                    borderColor: '#4cc9f0',
                    backgroundColor: 'rgba(76, 201, 240, 0.1)',
                    tension: 0.3,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    window.categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                }
            }
        }
    });
    
    // Initial chart update
    updateCharts();
}

// Update charts with transaction data
function updateCharts() {
    // Update expense chart
    const last7Days = getLastNDays(7);
    const expenseData = Array(7).fill(0);
    const incomeData = Array(7).fill(0);
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayIndex = last7Days.indexOf(dateStr);
        
        if (dayIndex !== -1) {
            if (transaction.type === 'expense') {
                expenseData[dayIndex] += transaction.amount;
            } else {
                incomeData[dayIndex] += transaction.amount;
            }
        }
    });
    
    window.expenseChart.data.datasets[0].data = expenseData;
    window.expenseChart.data.datasets[1].data = incomeData;
    window.expenseChart.update();
    
    // Update category chart
    const categoryData = {};
    const categoryColors = [];
    
    transactions
        .filter(t => t.type === 'expense')
        .forEach(transaction => {
            const category = categories.find(cat => cat.id === transaction.category) || { id: 'other', name: 'Other', color: '#95a5a6' };
            if (!categoryData[category.id]) {
                categoryData[category.id] = 0;
            }
            categoryData[category.id] += transaction.amount;
        });
    
    const sortedCategories = Object.entries(categoryData)
        .map(([id, amount]) => {
            const category = categories.find(cat => cat.id === id) || { id: 'other', name: 'Other', color: '#95a5a6' };
            return {
                id,
                name: category.name,
                amount,
                color: category.color
            };
        })
        .sort((a, b) => b.amount - a.amount);
    
    window.categoryChart.data.labels = sortedCategories.map(cat => cat.name);
    window.categoryChart.data.datasets[0].data = sortedCategories.map(cat => cat.amount);
    window.categoryChart.data.datasets[0].backgroundColor = sortedCategories.map(cat => cat.color);
    window.categoryChart.update();
}

// Handle navigation
function handleNavigation(e) {
    e.preventDefault();
    
    // Update active state
    document.querySelectorAll('.nav-links li').forEach(item => {
        item.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
    
    // Show the corresponding section
    const sectionId = e.currentTarget.getAttribute('data-section');
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');
}

// Save transactions to localStorage
function saveTransactions() {
    if (window.authModule && window.authModule.isAuthenticated()) {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }
}

// Handle user logout
function handleLogout() {
    if (window.authModule) {
        window.authModule.logoutUser();
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // In a real app, you might want to implement a proper alert/notification system
    alert(`${type.toUpperCase()}: ${message}`);
}

// Format date
function formatDate(dateString, format = 'long') {
    const options = format === 'long' 
        ? { year: 'numeric', month: 'long', day: 'numeric' }
        : { month: 'short', day: 'numeric' };
    
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Get last N days for chart labels
function getLastNDays(n) {
    const result = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        result.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return result;
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    init();
    
    // Add logout button event listener if it exists
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Handle navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
});
