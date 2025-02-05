document.addEventListener('DOMContentLoaded', async function () {
    // 🔍 Vérifier si l'utilisateur est déjà connecté
    try {
        const response = await fetch('/isAuthenticated');
        const data = await response.json();

        if (!data.authenticated && window.location.pathname !== "/auth.html") {
            window.location.href = "/auth.html"; // 🔄 Rediriger si non connecté
        } else if (data.authenticated && window.location.pathname === "/auth.html") {
            window.location.href = "/home.html"; // ✅ Rediriger vers home si connecté
        }
    } catch (error) {
        console.error("Erreur lors de la vérification d'authentification :", error);
    }

    // 🔹 Gestion de l'inscription
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            alert(data.message);
            if (response.ok) window.location.href = "/auth.html";
        });
    }

    // 🔹 Gestion de la connexion
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value;
            const password = document.getElementById('loginPassword').value;

            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            alert(data.message);
            if (response.ok) window.location.href = "/home.html";
        });
    }

    // 🔹 Déconnexion
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async function () {
            await fetch('/logout', { method: 'POST' });
            window.location.href = "/auth.html";
        });
    }
});
