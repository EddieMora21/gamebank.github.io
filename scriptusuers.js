
const firebaseConfig = {
    apiKey: "AIzaSyCvJyyeK8ARXgRYNMhtJqP1CPnVFmKpTG8",
    authDomain: "juego-del-bac.firebaseapp.com",
    projectId: "juego-del-bac",
    storageBucket: "juego-del-bac.appspot.com",
    messagingSenderId: "587231273517",
    appId: "1:587231273517:web:48f777505565ee1fd04ea4"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.database(); // Conexión a la base de datos
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('error-message');

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const userName = document.getElementById('name').value;

    // Guardar el nombre en localStorage para usarlo en otras páginas
    localStorage.setItem('userName', userName);

    // Validar el nombre de usuario con la base de datos
    db.ref('users').once('value', (snapshot) => {
        const users = snapshot.val();
        let userFound = false;

        for (let userId in users) {
            if (users[userId].name === userName) {
                userFound = true;
                window.location.href = 'game.html'; // Redirigir al juego si el login es exitoso
                break;
            }
        }

        if (!userFound) {
            errorMessage.textContent = "Usuario no encontrado.";
            errorMessage.style.display = 'block';
        }
    });
});

