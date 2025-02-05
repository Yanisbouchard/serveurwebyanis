const express = require('express');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 🔐 Gestion des sessions
app.use(session({
    secret: 'secret_key',  // Change cette clé pour plus de sécurité
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Passe à `true` si ton site est en HTTPS
}));

// 🏠 Page d'accueil
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

// 🔹 Vérifier si l'utilisateur est authentifié
app.get('/isAuthenticated', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// 📌 Inscription
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    let users = [];

    if (fs.existsSync('users.json')) {
        users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    }

    // Vérifier si l'utilisateur existe déjà
    if (users.some(u => u.username === username)) {
        return res.status(400).json({ message: "Cet utilisateur existe déjà." });
    }

    users.push({ username, email, password: hashedPassword });
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));

    res.status(201).json({ message: "Inscription réussie !" });
});

// 📌 Connexion
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!fs.existsSync('users.json')) {
        return res.status(401).json({ message: "Aucun utilisateur enregistré." });
    }

    let users = JSON.parse(fs.readFileSync('users.json', 'utf8'));
    const user = users.find(u => u.username === username);

    if (!user) {
        return res.status(401).json({ message: "Identifiants incorrects." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ message: "Identifiants incorrects." });
    }

    req.session.user = username;
    res.status(200).json({ message: "Connexion réussie" });
});

// 📌 Déconnexion
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ message: "Erreur lors de la déconnexion" });
        }
        res.status(200).json({ message: "Déconnexion réussie" });
    });
});

// 🔥 Lancer le serveur
app.listen(3000, () => console.log('Serveur en écoute sur le port 3000'));
