const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Servir les fichiers statiques
app.use(express.static(__dirname));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/videos', express.static(path.join(__dirname, 'videos')));

app.use('/api', express.static(__dirname));

// Configuration GLPI
const GLPI_URL = 'http://192.168.1.99/apirest.php';
const GLPI_APP_TOKEN = 'b6nTVpU5EozXxiaewWYzFeLdsJbNeOd93VGmS5Ze'; // Token pour le support
const GLPI_SERVER_TOKEN = 'RTKgUoGmzmkYDlXfEWxPo8BqwTo0jVjprGPK2PFp'; // Token pour les demandes de serveur
let GLPI_SESSION_TOKEN = null;
let GLPI_SERVER_SESSION_TOKEN = null;

// Fonction pour initialiser la session GLPI avec plus de logging
async function initGLPISession(isServerRequest = false) {
    try {
        const token = isServerRequest ? GLPI_SERVER_TOKEN : GLPI_APP_TOKEN;
        console.log('Tentative de connexion GLPI avec token:', token);
        
        const response = await axios.get(`${GLPI_URL}/initSession`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from('glpi:glpi').toString('base64')}`,
                'App-Token': token
            }
        });

        console.log('Session GLPI initialisée:', response.data);
        return response.data.session_token;
    } catch (error) {
        console.error('Erreur initSession GLPI:', {
            message: error.message,
            url: error.config?.url,
            headers: error.config?.headers,
            response: error.response?.data
        });
        throw error;
    }
}

// Fonction pour créer un ticket GLPI
async function createGLPITicket(ticketData) {
    try {
        // Initialiser une nouvelle session à chaque fois
        const sessionToken = await initGLPISession();
        console.log('Session GLPI initialisée pour le ticket');

        const config = {
            method: 'post',
            url: `${GLPI_URL}/Ticket`,
            headers: {
                'Content-Type': 'application/json',
                'Session-Token': sessionToken,
                'App-Token': GLPI_APP_TOKEN
            },
            data: {
                input: {
                    ...ticketData,
                    _users_id_recipient: 2, // ID de l'utilisateur GLPI
                    entities_id: 0 // Entité racine
                }
            }
        };

        console.log('Configuration de la requête ticket:', {
            url: config.url,
            method: config.method,
            headers: {
                'Content-Type': config.headers['Content-Type'],
                'App-Token': 'xxxxx', // Masqué pour la sécurité
                'Session-Token': 'xxxxx' // Masqué pour la sécurité
            },
            data: config.data
        });

        const response = await axios(config);
        console.log('Réponse création ticket:', response.data);
        return response.data;
    } catch (error) {
        console.error('Erreur détaillée création ticket:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url
        });
        throw error;
    }
}

// Chemin vers le fichier des utilisateurs
const USERS_FILE = path.join(__dirname, 'users.json');

// Fonction pour lire les utilisateurs
async function readUsers() {
    try {
        const data = await fsPromises.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // Si le fichier n'existe pas, retourner un tableau vide
        if (error.code === 'ENOENT') {
            return [];
        }
        throw error;
    }
}

// Fonction pour écrire les utilisateurs
async function writeUsers(users) {
    await fsPromises.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

// Route d'inscription
app.post('/api/register', async (req, res) => {
    console.log('Requête d\'inscription reçue:', req.body);
    try {
        const { username, email, password } = req.body;

        // Validation des données
        if (!username || !email || !password) {
            console.log('Données manquantes:', { username: !!username, email: !!email, password: !!password });
            return res.status(400).json({ message: 'Tous les champs sont requis' });
        }

        // Lecture des utilisateurs existants
        const users = await readUsers();
        console.log('Nombre d\'utilisateurs existants:', users.length);

        // Vérification si l'utilisateur existe déjà
        if (users.some(user => user.username === username)) {
            console.log('Nom d\'utilisateur déjà pris:', username);
            return res.status(400).json({ message: 'Ce nom d\'utilisateur est déjà pris' });
        }

        if (users.some(user => user.email === email)) {
            console.log('Email déjà utilisé:', email);
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }

        // Hashage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Ajout du nouvel utilisateur
        users.push({
            username,
            email,
            password: hashedPassword
        });

        // Sauvegarde des utilisateurs
        await writeUsers(users);
        console.log('Nouvel utilisateur enregistré:', username);

        res.status(201).json({ message: 'Inscription réussie' });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
});

// Route de connexion
app.post('/api/login', async (req, res) => {
    console.log('Requête de connexion reçue:', { username: req.body.username });
    try {
        const { username, password } = req.body;

        // Validation des données
        if (!username || !password) {
            console.log('Données manquantes:', { username: !!username, password: !!password });
            return res.status(400).json({ message: 'Tous les champs sont requis' });
        }

        // Lecture des utilisateurs
        const users = await readUsers();
        console.log('Nombre d\'utilisateurs trouvés:', users.length);

        // Recherche de l'utilisateur
        const user = users.find(u => u.username === username);

        if (!user) {
            console.log('Utilisateur non trouvé:', username);
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }

        // Vérification du mot de passe
        const validPassword = await bcrypt.compare(password, user.password);
        console.log('Résultat de la vérification du mot de passe:', validPassword);

        if (!validPassword) {
            console.log('Mot de passe incorrect pour:', username);
            return res.status(401).json({ message: 'Identifiants incorrects' });
        }

        console.log('Connexion réussie pour:', username);
        res.json({ message: 'Connexion réussie' });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
});

// Route pour créer un ticket de support
app.post('/api/create-ticket', async (req, res) => {
    try {
        const { title, description, category, priority, email, discordPseudo } = req.body;

        // Initialisation de la session GLPI si nécessaire
        if (!GLPI_SESSION_TOKEN) {
            GLPI_SESSION_TOKEN = await initGLPISession(false);
        }

        // Création du ticket
        const ticketData = {
            name: title,
            content: `${description}\n\nContact:\nEmail: ${email}\nDiscord: ${discordPseudo || 'Non spécifié'}`,
            type: category === 'incident' ? 1 : 2,
            priority: parseInt(priority),
            urgency: parseInt(priority),
            impact: parseInt(priority),
            _users_id_requester: email
        };

        const ticketResponse = await createGLPITicket(ticketData);

        console.log('Ticket créé:', ticketResponse);
        res.json({ 
            success: true, 
            ticketId: ticketResponse.id,
            message: 'Votre demande de support a été enregistrée. Notre équipe la traitera dès que possible.'
        });
    } catch (error) {
        console.error('Erreur lors de la création du ticket:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la création du ticket',
            error: error.message
        });
    }
});

// Route pour voir les tickets de support (temporaire)
app.get('/api/support-tickets', async (req, res) => {
    try {
        let tickets = [];
        if (fs.existsSync('support_tickets.json')) {
            const data = await fsPromises.readFile('support_tickets.json', 'utf8');
            tickets = JSON.parse(data);
        }
        res.json(tickets);
    } catch (error) {
        console.error('Erreur lors de la lecture des tickets:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la lecture des tickets',
            error: error.message
        });
    }
});

// Route de test pour la connexion GLPI
app.get('/api/test-glpi', async (req, res) => {
    try {
        const sessionToken = await initGLPISession(false);
        res.json({ 
            success: true, 
            message: 'Connexion à GLPI réussie',
            sessionToken: sessionToken
        });
    } catch (error) {
        res.status(500).json({ 
            success: false,
            message: 'Erreur de connexion à GLPI',
            error: error.message
        });
    }
});

// Route de test simple pour vérifier l'accès au serveur GLPI
app.get('/api/test-glpi-server', async (req, res) => {
    try {
        // Test simple pour vérifier si le serveur est accessible
        const response = await axios.get('http://192.168.1.99/glpi/apirest.php/initSession', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from('glpi:glpi').toString('base64')}`,
                'App-Token': GLPI_APP_TOKEN
            }
        });
        
        console.log('Test GLPI response:', response.data);
        res.json({ status: 'success', message: 'GLPI server is accessible', data: response.data });
    } catch (error) {
        console.error('Erreur test GLPI:', error.message);
        res.status(500).json({ 
            status: 'error', 
            message: 'GLPI server is not accessible',
            error: error.message,
            details: {
                url: error.config?.url,
                headers: error.config?.headers,
                response: error.response?.data
            }
        });
    }
});

// Route pour récupérer les tickets
app.get('/api/tickets', async (req, res) => {
    try {
        // Utiliser les identifiants par défaut pour la récupération des tickets
        const sessionToken = await initGLPISession(false);
        
        const ticketsResponse = await axios({
            method: 'get',
            url: `${GLPI_URL}/Ticket`,
            headers: {
                'Content-Type': 'application/json',
                'Session-Token': sessionToken,
                'App-Token': GLPI_APP_TOKEN
            }
        });

        await axios({
            method: 'get',
            url: `${GLPI_URL}/killSession`,
            headers: {
                'Session-Token': sessionToken,
                'App-Token': GLPI_APP_TOKEN
            }
        });

        res.json(ticketsResponse.data);

    } catch (error) {
        console.error('Erreur lors de la récupération des tickets:', error.response ? error.response.data : error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erreur lors de la récupération des tickets',
            error: error.response ? error.response.data : error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth.html'));
});

app.post('/api/send-email', (req, res) => {
    const { to, subject, text } = req.body;

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'yaniscraft52@gmail.com',
            pass: 'ulel opdn alqh pjne'
        }
    });

    const mailOptions = {
        from: 'yaniscraft52@gmail.com',
        to: to,
        subject: subject,
        text: text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error(error);
            res.status(500).send('Erreur lors de l\'envoi de l\'email');
        } else {
            res.status(200).send('Email envoyé avec succès : ' + info.response);
        }
    });
});

// Rediriger toutes les requêtes non authentifiées vers la page d'authentification
app.get('*', (req, res, next) => {
    // Liste des chemins qui ne nécessitent pas d'authentification
    const publicPaths = ['/auth', '/auth.html', '/login', '/register', '/css/', '/js/', '/images/'];
    
    // Vérifier si le chemin actuel est public
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    
    if (!isPublicPath && req.path !== '/index.html' && !req.path.endsWith('.js') && !req.path.endsWith('.css')) {
        res.redirect('/auth.html');
    } else {
        next();
    }
});

// Gestion des demandes de serveur
app.post('/demandeserveur/submit-server-request', async (req, res) => {
    console.log('Nouvelle demande reçue:', req.body);
    
    try {
        const { 
            discord,
            email,
            game,
            ram,
            cpu,
            players,
            needs,
            deadline
        } = req.body;

        console.log('Données extraites:', {
            discord, email, game, ram, cpu, players, needs, deadline
        });

        // Validation des champs obligatoires
        if (!discord || !email || !game || !deadline) {
            console.log('Validation échouée:', {
                discord: !!discord,
                email: !!email,
                game: !!game,
                deadline: !!deadline
            });
            return res.status(400).json({ message: 'Les champs Discord, Email, Jeu et Date sont obligatoires.' });
        }

        // Créer le ticket GLPI
        const ticketData = {
            name: `Demande de serveur - ${game}`,
            content: `
                Discord: ${discord}
                Email: ${email}
                Jeu: ${game}
                RAM: ${ram || 'Non spécifié'} Go
                CPU: ${cpu || 'Non spécifié'} cœurs
                Nombre de joueurs: ${players || 'Non spécifié'}
                Besoins spécifiques: ${needs || 'Aucun'}
                Date souhaitée: ${deadline}
            `,
            type: 2, // Demande
            status: 1, // Nouveau
            priority: 3, // Moyenne
            urgency: 3, // Moyenne
            impact: 3, // Moyenne
            itilcategories_id: 1 // Catégorie par défaut
        };

        console.log('Tentative de création du ticket GLPI avec les données:', ticketData);
        const ticket = await createGLPITicket(ticketData);
        console.log('Ticket GLPI créé avec succès:', ticket);

        res.status(200).json({ 
            message: 'Demande de serveur enregistrée avec succès', 
            ticketId: ticket.id 
        });
    } catch (error) {
        console.error('Erreur lors de la création du ticket:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({ 
            message: 'Une erreur est survenue lors du traitement de votre demande',
            error: error.message 
        });
    }
});

// Route pour obtenir toutes les demandes (pour l'interface admin)
app.get('/api/server-requests', async (req, res) => {
    try {
        let requests = [];
        if (fs.existsSync('server_requests.json')) {
            const data = await fsPromises.readFile('server_requests.json', 'utf8');
            requests = JSON.parse(data);
        }
        res.json(requests);
    } catch (error) {
        console.error('Erreur lors de la lecture des demandes:', error);
        res.status(500).json({ message: 'Erreur lors de la lecture des demandes' });
    }
});

// Route pour mettre à jour le statut d'une demande
app.put('/api/server-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        let requests = [];
        if (fs.existsSync('server_requests.json')) {
            const data = await fsPromises.readFile('server_requests.json', 'utf8');
            requests = JSON.parse(data);
            const requestIndex = requests.findIndex(r => r.id === parseInt(id));

            if (requestIndex !== -1) {
                requests[requestIndex].status = status;
                await fsPromises.writeFile('server_requests.json', JSON.stringify(requests, null, 2));
                res.json({ message: 'Statut mis à jour avec succès' });
            } else {
                res.status(404).json({ message: 'Demande non trouvée' });
            }
        } else {
            res.status(404).json({ message: 'Aucune demande trouvée' });
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
    }
});

// Route de test GLPI
app.get('/test-glpi', async (req, res) => {
    try {
        console.log('Test de connexion GLPI...');
        console.log('URL GLPI:', GLPI_URL);
        
        const response = await axios.get(`${GLPI_URL}/initSession`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from('glpi:glpi').toString('base64')}`,
                'App-Token': GLPI_APP_TOKEN
            }
        });

        console.log('Réponse GLPI:', response.data);
        res.json({
            success: true,
            message: 'Connexion GLPI réussie',
            data: response.data
        });
    } catch (error) {
        console.error('Erreur de connexion GLPI:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url,
            headers: error.config?.headers
        });
        res.status(500).json({
            success: false,
            message: 'Erreur de connexion GLPI',
            error: {
                message: error.message,
                response: error.response?.data
            }
        });
    }
});

const PORT = process.env.PORT || 3000;
try {
    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
        console.log('Dossier courant:', __dirname);
    });

    server.on('error', (error) => {
        console.error('Erreur du serveur:', error);
        process.exit(1);
    });
} catch (error) {
    console.error('Erreur au démarrage du serveur:', error);
    process.exit(1);
}
