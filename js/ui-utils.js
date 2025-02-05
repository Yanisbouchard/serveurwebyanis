// Toast notifications
const showToast = (message, type = 'info') => {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
};

const createToastContainer = () => {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
};

// Loading spinner
const showSpinner = () => {
    const spinner = document.querySelector('.spinner-overlay');
    if (spinner) {
        spinner.style.display = 'flex';
    }
};

const hideSpinner = () => {
    const spinner = document.querySelector('.spinner-overlay');
    if (spinner) {
        spinner.style.display = 'none';
    }
};

// Form preview
const updatePreview = () => {
    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const priority = document.getElementById('priority').value;
    const email = document.getElementById('email').value;
    const discordPseudo = document.getElementById('discordPseudo').value;

    const previewContent = document.getElementById('previewContent');
    previewContent.innerHTML = `
        <div class="preview-item">
            <span class="preview-label">Titre:</span> ${title}
        </div>
        <div class="preview-item">
            <span class="preview-label">Description:</span> ${description}
        </div>
        <div class="preview-item">
            <span class="preview-label">Catégorie:</span> ${category}
        </div>
        <div class="preview-item">
            <span class="preview-label">Priorité:</span> ${priority}
        </div>
        <div class="preview-item">
            <span class="preview-label">Email:</span> ${email}
        </div>
        <div class="preview-item">
            <span class="preview-label">Pseudo Discord:</span> ${discordPseudo}
        </div>
    `;
};

// Theme toggle
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};

// Initialize theme
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
};

// Form validation
const validateForm = () => {
    const requiredFields = ['title', 'description', 'email'];
    let isValid = true;
    let firstInvalidField = null;

    requiredFields.forEach(field => {
        const element = document.getElementById(field);
        if (!element.value.trim()) {
            element.classList.add('is-invalid');
            isValid = false;
            if (!firstInvalidField) firstInvalidField = element;
        } else {
            element.classList.remove('is-invalid');
        }
    });

    // Email validation
    const email = document.getElementById('email');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.value.trim())) {
        email.classList.add('is-invalid');
        isValid = false;
        if (!firstInvalidField) firstInvalidField = email;
    }

    if (firstInvalidField) {
        firstInvalidField.focus();
        showToast('Veuillez remplir tous les champs requis correctement', 'error');
    }

    return isValid;
};

// Auto-save draft
const saveDraft = () => {
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        category: document.getElementById('category').value,
        priority: document.getElementById('priority').value,
        email: document.getElementById('email').value,
        discordPseudo: document.getElementById('discordPseudo').value
    };
    localStorage.setItem('ticketDraft', JSON.stringify(formData));
};

const loadDraft = () => {
    const draft = localStorage.getItem('ticketDraft');
    if (draft) {
        const formData = JSON.parse(draft);
        Object.keys(formData).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                element.value = formData[key];
            }
        });
        updatePreview();
    }
};

// Initialize all features
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadDraft();

    // Add event listeners for form fields
    const formFields = ['title', 'description', 'category', 'priority', 'email', 'discordPseudo'];
    formFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener('input', () => {
                updatePreview();
                saveDraft();
            });
        }
    });
});
