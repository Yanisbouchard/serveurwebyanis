// Fonction pour vérifier l'authentification
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.replace('/auth.html');
        return false;
    }
    return true;
}

// Fonction de déconnexion
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.replace('/auth.html');
}

// Mise à jour du nom d'utilisateur
function updateUsername() {
    const username = localStorage.getItem('username');
    const usernameElement = document.getElementById('username');
    if (username && usernameElement) {
        usernameElement.textContent = username;
    }
}

// Vérification initiale
if (checkAuth()) {
    updateUsername();
}
