// ============================================
// app.js — App + Subject + Loader Logic
// ============================================

let currentMode = '';
let selectedSubjects = ['english']; // English compulsory
let quizData = [];
let quizStartTime = null;
let timerInterval = null;
let totalTimeSeconds = 0;

// ============================================
// INIT
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Mode buttons
    document.querySelectorAll('[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
            selectMode(btn.dataset.mode);
        });
    });

    // Subject cards (excluding English)
    document.querySelectorAll('.subject-checkbox').forEach(cb => {
        cb.addEventListener('change', updateSelectedCount);
    });

    // Start quiz
    document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
}

// ============================================
// SCREEN NAV
// ============================================

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// ============================================
// MODE
// ============================================

function selectMode(mode) {
    currentMode = mode;
    showScreen('subject-screen');
}

// ============================================
// SUBJECT SELECTION (STRICT)
// ============================================

function updateSelectedCount() {
    const checked = document.querySelectorAll('.subject-checkbox:checked');

    if (checked.length > 3) {
        this.checked = false;
        alert('You can only select 3 subjects besides English');
        return;
    }

    const others = [];
    checked.forEach(cb => {
        others.push(cb.dataset.subject);
    });

    selectedSubjects = ['english', ...others];

    document.getElementById('selectedCount').textContent = selectedSubjects.length;

    const startBtn = document.getElementById('startQuizBtn');
    const valid = selectedSubjects.length === 4;

    startBtn.disabled = !valid;
    startBtn.style.opacity = valid ? '1' : '0.5';
}

// ============================================
// START QUIZ
// ============================================

async function startQuiz() {
    if (selectedSubjects.length !== 4) {
        alert('Select English + 3 other subjects');
        return;
    }

    quizData = [];
    await loadQuestions();

    if (!quizData.length) {
        alert('Questions not loaded');
        return;
    }

    showScreen('quiz-screen');
    startTimer();

    initQuiz(quizData); // 👈 from quiz.js
}

// ============================================
// LOAD QUESTIONS (GitHub-safe)
// ============================================

async function loadQuestions() {
    try {
        for (const subject of selectedSubjects) {
            const count =
                currentMode === 'test'
                    ? 10
                    : subject === 'english'
                    ? 60
                    : 40;

            const res = await fetch(`./data/${subject}.json`);
            if (!res.ok) continue;

            const data = await res.json();
            const questions = data.questions || [];

            const selected = shuffleArray(questions).slice(0, count);
            selected.forEach(q => {
                quizData.push({
                    ...q,
                    subject,
                    subjectDisplay: capitalizeFirst(subject)
                });
            });
        }

        document.getElementById('totalQuestions').textContent = quizData.length;
    } catch (err) {
        console.error(err);
    }
}

// ============================================
// TIMER
// ============================================

function startTimer() {
    totalTimeSeconds = currentMode === 'exam' ? 120 * 60 : 26 * 60;
    quizStartTime = Date.now();

    timerInterval = setInterval(updateTimer, 1000);
    updateTimer();
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    const remaining = totalTimeSeconds - elapsed;

    if (remaining <= 0) {
        clearInterval(timerInterval);
        submitQuiz();
        return;
    }

    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    document.getElementById('timeDisplay').textContent =
        `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ============================================
// HELPERS
// ============================================

function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
