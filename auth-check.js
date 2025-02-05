// Vérifie si l'utilisateur est authentifié
function checkAuth() {
    // Vérifier si l'utilisateur est authentifié
    if (!localStorage.getItem('authenticated')) {
        window.location.href = 'auth.html';
    }
}

// Vérifie l'authentification au chargement de la page
document.addEventListener('DOMContentLoaded', checkAuth);

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('username');
    window.location.href = 'auth.html';
}
