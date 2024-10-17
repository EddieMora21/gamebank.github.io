const player = document.getElementById("player");
const option1 = document.getElementById("option1");
const option2 = document.getElementById("option2");
const questionDisplay = document.getElementById("question");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const gameArea = document.getElementById("gameArea");
const difficultySelection = document.getElementById("difficultySelection");
// Al principio, ocultamos la selección de dificultad y el juego
document.getElementById('difficultySelection').style.display = 'none';
document.getElementById('gameContainer').style.display = 'none';

let score = 0;
let isGameOver = false;
let gameSpeed = 2; // Reducimos la velocidad para que las opciones bajen más lentamente en modo fácil
let originalGameSpeed; // Variable para guardar la velocidad original
let currentQuestionIndex = 0;
let vibrateTimeout;
let lives = 0; // Vidas del jugador
let isPaused = false; // Bandera para verificar si el juego está en pausa
const maxGameSpeed = 2; // Nunca más rápido que esta velocidad
const minGameSpeed = 1; // Velocidad más lenta si la pregunta es larga
let animationFrameId;
let selectedCategory = ""; // Variable para almacenar la categoría seleccionada
let filteredQuestions = []; // Preguntas filtradas según la categoría
let shuffledQuestions = []; // Lista de preguntas barajadas
let userAnswers = []; // Declarar la variable para almacenar las respuestas del usuario



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

// Definir las dificultades
const difficulties = {
    easy: {
        gameSpeed: 2,
        lives: 10, 
        displayLives: true
    },
    normal: {
        gameSpeed: 3,
        lives: 3, 
        displayLives: true
    },
    hard: {
        gameSpeed: 4,
        lives: 1, 
        displayLives: true
    }
};


function loadQuestionsFromFirebase(category, callback) {
    const db = firebase.database();
    db.ref(`questions/${category}`).once('value')
        .then(snapshot => {
            const questionsData = snapshot.val();
            if (questionsData) {
                // Convertir los datos en un array
                filteredQuestions = Object.values(questionsData);
                callback();
            } else {
                Swal.fire({
                    title: 'No hay preguntas disponibles',
                    text: `No hay preguntas en la categoría "${category}". Por favor, selecciona otra categoría.`,
                    icon: 'error',
                    confirmButtonText: 'Aceptar'
                }).then(() => {
                    // Mostrar de nuevo la selección de categoría
                    document.getElementById('categorySelection').style.display = "block";
                });
            }
        })
        .catch(error => {
            console.error('Error al cargar las preguntas:', error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudieron cargar las preguntas. Por favor, inténtalo de nuevo más tarde.',
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
        });
}



// Función para barajar las preguntas al inicio
function shuffleQuestions() {
    shuffledQuestions = [...filteredQuestions]; // Copiar el array de preguntas filtradas
    for (let i = shuffledQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
    }
}


// Ajustar dinámicamente las posiciones de las opciones según el tamaño de la pantalla
function setOptionPositions() {
    const screenWidth = window.innerWidth;

    if (screenWidth <= 600) {
        // Para pantallas de teléfonos
        option1.style.left = "25%"; 
        option2.style.left = "75%";
    } else if (screenWidth <= 1024) {
        // Para pantallas de tablets
        option1.style.left = "30vw"; 
        option2.style.left = "50vw";
    } else {
        // Para pantallas más grandes (escritorios)
        option1.style.left = "30%"; 
        option2.style.left = "60%";
    }
}

// Llamar a la función al cargar la página o cuando se cambie el tamaño de la ventana
window.addEventListener('resize', setOptionPositions);
setOptionPositions(); // Llamada inicial



// Cuando el usuario selecciona una categoría, ocultamos la selección de categoría y mostramos la de dificultad
function selectCategory(category) {
    selectedCategory = category;

    // Ocultar la selección de categoría
    document.getElementById('categorySelection').style.display = "none";

    // Mostrar mensaje de carga (si es necesario)
    Swal.fire({
        title: 'Cargando preguntas...',
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    // Cargar las preguntas desde Firebase (si es necesario)
    loadQuestionsFromFirebase(selectedCategory, () => {
        Swal.close(); // Cerrar el mensaje de carga
        // Mostrar la selección de dificultad
        document.getElementById('difficultySelection').style.display = "block";
    });
}

// Cuando el usuario selecciona una dificultad, iniciamos el juego
function selectDifficulty(difficulty) {
    const { gameSpeed: speed, lives: playerLives, displayLives } = difficulties[difficulty];
    gameSpeed = speed;
    originalGameSpeed = speed;
    lives = playerLives;

    // Mostrar o esconder el contador de vidas
    if (displayLives) {
        livesDisplay.style.display = "block";
        livesDisplay.textContent = `Vidas: ${lives}`;
    } else {
        livesDisplay.style.display = "none";
    }

    // Barajar las preguntas filtradas
    shuffleQuestions();

    // Mostrar la puntuación y el contenedor del juego
    document.getElementById('gameContainer').style.display = "flex";

    // Ocultar la selección de dificultad
    document.getElementById('difficultySelection').style.display = "none";

    // Iniciar el juego
    generateQuestion();
    gameLoop();
}




// Generar la pregunta actual
// Generar la pregunta actual y registrar la respuesta seleccionada por el usuario
function generateQuestion() {
    if (currentQuestionIndex >= shuffledQuestions.length) {
        endGame();
        return;
    }

    const question = shuffledQuestions[currentQuestionIndex];
    questionDisplay.textContent = question.question;

    // Ajustar la velocidad si la pregunta es mayor a 40 caracteres
    if (question.question.length > 10) {
        gameSpeed = originalGameSpeed / 2;
    } else {
        gameSpeed = originalGameSpeed;
    }

    // Obtener las opciones correctamente
    const optionsObj = question.options;
    const options = [optionsObj.option1, optionsObj.option2];

    const randomPosition = Math.random() < 0.5;
    option1.textContent = randomPosition ? options[0] : options[1];
    option2.textContent = randomPosition ? options[1] : options[0];
    option1.style.top = "0px";
    option2.style.top = "0px";

    // Escuchar clic en las opciones para registrar la respuesta
    option1.addEventListener('click', () => {
        userAnswers[currentQuestionIndex] = option1.textContent; // Registrar la respuesta
        checkAnswer();
        currentQuestionIndex++;
        generateQuestion(); // Generar la siguiente pregunta
    });

    option2.addEventListener('click', () => {
        userAnswers[currentQuestionIndex] = option2.textContent; // Registrar la respuesta
        checkAnswer();
        currentQuestionIndex++;
        generateQuestion(); // Generar la siguiente pregunta
    });

    setOptionPositions();
}


// Movimiento del personaje usando las teclas de flechas
function control(e) {
    const playerLeft = parseInt(window.getComputedStyle(player).getPropertyValue("left"));
    const playerWidth = player.offsetWidth;
    const gameWidth = gameArea.offsetWidth;

    // Mover a la derecha cuando se presiona la flecha derecha
    if (e.key === "ArrowRight" && playerLeft < gameWidth - playerWidth) {
        player.style.left = playerLeft + playerWidth + "px";
    }

    // Mover a la izquierda cuando se presiona la flecha izquierda
    if (e.key === "ArrowLeft" && playerLeft > 0) {
        player.style.left = playerLeft - playerWidth + "px";
    }
}

// Función que termina el juego
// Almacenar las preguntas incorrectas y los puntos del usuario en Firebase
// Almacenar las preguntas incorrectas y los puntos del usuario en Firebase
function endGame() {
    isGameOver = true;

    // Lista para almacenar las preguntas incorrectas
    let incorrectAnswers = [];

    shuffledQuestions.forEach((question, index) => {
        let userAnswer = userAnswers[index]; // Declarar como let para permitir reasignación
    
        // Validar que userAnswer no sea undefined
        if (userAnswer === undefined) {
            userAnswer = "Sin respuesta"; // Asignar un valor por defecto si no hay respuesta
        }
    
        // Comparar la respuesta del usuario con la correcta
        if (userAnswer !== question.correct) {
            incorrectAnswers.push({
                question: question.question,
                correctAnswer: question.correct,
                yourAnswer: userAnswer
            });
        }
    });

    // Obtén el nombre de usuario guardado en localStorage
    const userName = localStorage.getItem('userName');

    // Conéctate a la base de datos de Firebase
    const db = firebase.database();
    const historyRef = db.ref(`historial/${userName}`).push(); // Cada intento es un nuevo nodo

    // Almacena la fecha, puntaje y preguntas incorrectas
    historyRef.set({
        date: new Date().toISOString(),
        score: score,
        incorrectAnswers: incorrectAnswers
    }).then(() => {
        // Alerta de finalización del juego
        Swal.fire({
            title: '¡Juego terminado!',
            text: `Puntuación final: ${score}`,
            icon: 'success',
            confirmButtonText: 'Ver Historial'
        }).then(() => {
            window.location.href = 'historial.html'; // Redirigir al historial después de finalizar
        });
    });
}


// Mover las opciones hacia el personaje con la velocidad ajustada
function moveOptions() {
    let option1Top = parseInt(window.getComputedStyle(option1).getPropertyValue("top"));
    let option2Top = parseInt(window.getComputedStyle(option2).getPropertyValue("top"));
    const gameAreaHeight = gameArea.offsetHeight;

    if (option1Top >= gameAreaHeight || option2Top >= gameAreaHeight) {
        checkAnswer();
        currentQuestionIndex++;
        generateQuestion();
    } else {
        option1.style.top = option1Top + gameSpeed + "px";
        option2.style.top = option2Top + gameSpeed + "px";
    }
}

// Verificar si el jugador pasó por la respuesta correcta
function checkAnswer() {
    const playerRect = player.getBoundingClientRect();
    const option1Rect = option1.getBoundingClientRect();
    const option2Rect = option2.getBoundingClientRect();

    const correctAnswer = shuffledQuestions[currentQuestionIndex].correct;
    let hitCorrect = false;
    let selectedAnswer = null;

    // Verificar si el jugador ha tocado la opción 1
    if (
        playerRect.left < option1Rect.left + option1Rect.width &&
        playerRect.left + playerRect.width > option1Rect.left
    ) {
        selectedAnswer = option1.textContent; // Registrar la respuesta seleccionada
        if (selectedAnswer === correctAnswer) {
            hitCorrect = true;
            score++;
            triggerJump();
        }
    } 
    // Verificar si el jugador ha tocado la opción 2
    else if (
        playerRect.left < option2Rect.left + option2Rect.width &&
        playerRect.left + playerRect.width > option2Rect.left
    ) {
        selectedAnswer = option2.textContent; // Registrar la respuesta seleccionada
        if (selectedAnswer === correctAnswer) {
            hitCorrect = true;
            score++;
            triggerJump();
        }
    }

    // Si el jugador no ha acertado
    if (!hitCorrect) {
        score = Math.max(0, score - 1);
        if (lives > 0) {
            lives--;
            livesDisplay.textContent = `Vidas: ${lives}`;
            if (lives === 0) {
                endGame();
            }
        }
        triggerVibration();
    }

    // Registrar la respuesta seleccionada por el jugador, incluso si fue incorrecta
    userAnswers[currentQuestionIndex] = selectedAnswer || "Sin respuesta";

    // Actualizar la puntuación en pantalla
    scoreDisplay.textContent = `Puntuación: ${score}`;
}


// Control táctil: Mover el jugador según la posición del toque
function handleTouchMove(e) {
    e.preventDefault(); // Evita el desplazamiento de la página
    const touchX = e.touches[0].clientX;
    const gameAreaRect = gameArea.getBoundingClientRect();
    const playerWidth = player.offsetWidth;
    const newLeft = touchX - gameAreaRect.left - playerWidth / 2;

    if (newLeft >= 0 && newLeft <= gameAreaRect.width - playerWidth) {
        player.style.left = `${newLeft}px`;
    }
}




// Efecto de salto
function triggerJump() {
    player.classList.add("jump"); // Añadir la clase de salto

    setTimeout(() => {
        player.classList.remove("jump"); // Eliminar el efecto después del salto
    }, 500); // El tiempo debe coincidir con la duración de la animación
}

// Efecto de vibración
function triggerVibration() {
    player.classList.add("vibrate"); // Añadir clase de vibración

    clearTimeout(vibrateTimeout);
    vibrateTimeout = setTimeout(() => {
        player.classList.remove("vibrate"); // Eliminar el efecto de vibración
    }, 300);
}



function pauseGame() {
    if (!isPaused) {
        isPaused = true;
        cancelAnimationFrame(animationFrameId);
        document.getElementById('pauseButton').style.display = 'none';
        document.getElementById('resumeButton').style.display = 'block';
    }
}

function resumeGame() {
    if (isPaused) {
        isPaused = false;
        document.getElementById('pauseButton').style.display = 'block';
        document.getElementById('resumeButton').style.display = 'none';
        gameLoop();
    }
}

function gameLoop() {
    if (!isGameOver && !isPaused) {
        moveOptions();
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

// Descargar las preguntas en PDF desde Firebase con páginas automáticas y ajuste de líneas
function downloadQuestionsPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yOffset = 20; // Posición vertical inicial
    const lineHeight = 10; // Altura de cada línea de texto
    const pageHeight = doc.internal.pageSize.height; // Altura de la página
    const pageWidth = doc.internal.pageSize.width; // Ancho de la página
    const marginLeft = 10; // Margen izquierdo
    const maxLineWidth = pageWidth - marginLeft * 2; // Ancho máximo para el texto

    doc.setFontSize(14);
    doc.text("Preguntas del Juego", marginLeft, yOffset);
    yOffset += 10;

    filteredQuestions.forEach((question, index) => {
        const questionText = `${index + 1}. ${question.question}`;

        // Dividir el texto si es muy largo para ajustarse al ancho de la página
        const splitText = doc.splitTextToSize(questionText, maxLineWidth);

        // Comprobar si el texto actual necesita más espacio del disponible en la página
        if (yOffset + splitText.length * lineHeight > pageHeight - 10) {
            doc.addPage();
            yOffset = 20; // Restablecer el margen superior
        }

        // Escribir el texto dividido
        doc.text(splitText, marginLeft, yOffset);
        yOffset += splitText.length * lineHeight; // Ajustar el yOffset en función de las líneas ocupadas
    });

    doc.save("preguntas-juego.pdf");
}

// Descargar las respuestas correctas en PDF desde Firebase con ajuste de líneas
function downloadAnswersPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let yOffset = 20; // Posición vertical inicial
    const lineHeight = 10; // Altura de cada línea de texto
    const pageHeight = doc.internal.pageSize.height; // Altura de la página
    const pageWidth = doc.internal.pageSize.width; // Ancho de la página
    const marginLeft = 10; // Margen izquierdo
    const maxLineWidth = pageWidth - marginLeft * 2; // Ancho máximo para el texto

    doc.setFontSize(14);
    doc.text("Respuestas Correctas del Juego", marginLeft, yOffset);
    yOffset += 10;

    filteredQuestions.forEach((question, index) => {
        const questionText = `${index + 1}. Pregunta: ${question.question}`;
        const answerText = `  Respuesta correcta: ${question.correct}`;

        // Dividir el texto de la pregunta y respuesta si es muy largo
        const splitQuestionText = doc.splitTextToSize(questionText, maxLineWidth);
        const splitAnswerText = doc.splitTextToSize(answerText, maxLineWidth);

        // Comprobar si el texto actual necesita más espacio del disponible en la página
        if (yOffset + (splitQuestionText.length + splitAnswerText.length) * lineHeight > pageHeight - 10) {
            doc.addPage();
            yOffset = 20; // Restablecer el margen superior
        }

        // Escribir el texto dividido de la pregunta
        doc.text(splitQuestionText, marginLeft, yOffset);
        yOffset += splitQuestionText.length * lineHeight;

        // Escribir el texto dividido de la respuesta
        doc.text(splitAnswerText, marginLeft, yOffset);
        yOffset += splitAnswerText.length * lineHeight + 10; // Dejar más espacio entre preguntas
    });

    doc.save("respuestas-correctas-juego.pdf");
}



// Asignar los eventos a los botones
document.getElementById("downloadQuestions").addEventListener("click", downloadQuestionsPDF);
document.getElementById("downloadAnswers").addEventListener("click", downloadAnswersPDF);


// Asignar eventos a los botones de pausa y reanudar
document.getElementById('pauseButton').addEventListener('click', pauseGame);
document.getElementById('resumeButton').addEventListener('click', resumeGame);

// Asignar eventos a los botones de categoría

document.getElementById("Temas de clase").addEventListener("click", () => selectCategory("Temas de clase"));


// Iniciar el juego seleccionando dificultad
document.getElementById("easy").addEventListener("click", () => selectDifficulty("easy"));
document.getElementById("normal").addEventListener("click", () => selectDifficulty("normal"));
document.getElementById("hard").addEventListener("click", () => selectDifficulty("hard"));

// Asignar eventos de toque
gameArea.addEventListener("touchmove", handleTouchMove, { passive: false });


document.addEventListener("keydown", control);
