const API_BASE = 'http://localhost:8000/api/v1';

// Toast Notification System
function showToast(message, type='success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button style="background:none; border:none; color:white; cursor:pointer;" onclick="this.parentElement.remove()">✕</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Keep showAlert for backwards compatibility, redirect to showToast
function showAlert(message, type='success') {
    showToast(message, type);
}

// Auth
function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

async function login(username, password) {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if(response.ok) {
            setToken(data.access_token);
            window.location.href = 'dashboard.html';
        } else {
            showToast(data.detail || 'Login failed', 'error');
        }
    } catch(err) {
        showToast('Network error', 'error');
    }
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if(!token) {
        window.location.href = 'index.html';
        return;
    }
    
    const headers = {
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
    
    if(response.status === 401) {
        logout();
        return;
    }
    
    return response;
}
