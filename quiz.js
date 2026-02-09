// ============================================
// quiz.js — Quiz Engine
// ============================================

let currentQuestionIndex = 0;
let userAnswers = [];
let quizQuestions = [];

// ============================================
// INIT QUIZ
// ============================================

function initQuiz(data) {
    quizQuestions = data;
    currentQuestionIndex = 0;
    userAnswers = new Array(data.length).fill(null);

    displayQuestion();
    updateNav();
}

// ============================================
// DISPLAY QUESTION
// ============================================

function displayQuestion() {
    const q = quizQuestions[currentQuestionIndex];

    document.getElementById('currentQuestion').textContent =
        currentQuestionIndex + 1;

    document.getElementById('questionSubject').textContent =
        q.subjectDisplay;

    document.getElementById('questionText').textContent = q.question;

    // Passage
    const passageBox = document.getElementById('passageContainer');
    if (q.passage) {
        passageBox.style.display = 'block';
        document.getElementById('passageText').textContent = q.passage;
    } else {
        passageBox.style.display = 'none';
    }

    // Options
    const box = document.getElementById('optionsContainer');
    box.innerHTML = '';

    q.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;

        if (userAnswers[currentQuestionIndex] === i) {
            btn.classList.add('selected');
        }

        btn.onclick = () => selectAnswer(i);
        box.appendChild(btn);
    });
}

// ============================================
// ANSWER
// ============================================

function selectAnswer(index) {
    userAnswers[currentQuestionIndex] = index;
    displayQuestion();
}

// ============================================
// NAVIGATION
// ============================================

function nextQuestion() {
    if (currentQuestionIndex < quizQuestions.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
        updateNav();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
        updateNav();
    }
}

function updateNav() {
    document.getElementById('prevBtn').disabled = currentQuestionIndex === 0;
    document.getElementById('nextBtn').disabled =
        currentQuestionIndex === quizQuestions.length - 1;
}

// ============================================
// SUBMIT
// ============================================

function submitQuiz() {
    let correct = 0;

    quizQuestions.forEach((q, i) => {
        const correctIndex =
            typeof q.answer === 'string'
                ? q.answer.charCodeAt(0) - 65
                : q.answer;

        if (userAnswers[i] === correctIndex) correct++;
    });

    document.getElementById('finalScore').textContent =
        `${Math.round((correct / quizQuestions.length) * 100)}%`;

    showScreen('result-screen');
}
