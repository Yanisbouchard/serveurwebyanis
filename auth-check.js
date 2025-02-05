// Vérifie si l'utilisateur est authentifié
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/auth.html';
        return;
    }
}

// Vérifie l'authentification au chargement de la page
// document.addEventListener('DOMContentLoaded', checkAuth);

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/auth.html';
}

// Ne pas vérifier automatiquement au chargement de la page
// car index.html a déjà sa propre vérification
