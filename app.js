// ================================
// app.js – App Controller
// ================================

let currentMode = '';
let currentSubject = '';
let questions = [];
let timeLeft = 0;
let timerInterval = null;

// ---------- SCREEN CONTROL ----------
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  document.getElementById(screenId).classList.add('active');
}

// ---------- MODE SELECTION ----------
document.querySelectorAll('.mode-card').forEach(card => {
  card.addEventListener('click', () => {
    currentMode = card.dataset.mode;
    showScreen('subject-screen');
  });
});

// ---------- SUBJECT SELECTION ----------
document.querySelectorAll('.subject-card').forEach(card => {
  card.addEventListener('click', () => {
    currentSubject = card.dataset.subject.toLowerCase();
    startQuiz();
  });
});

// ---------- LOAD QUESTIONS ----------
async function loadQuestions(subject) {
  try {
    const res = await fetch(`./data/${subject}.json`);
    if (!res.ok) throw new Error('Question file not found');
    const data = await res.json();
    return data;
  } catch (err) {
    alert('Failed to load questions');
    console.error(err);
    return [];
  }
}

// ---------- TIMER ----------
function startTimer(minutes) {
  timeLeft = minutes * 60;
  updateTimer();

  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimer();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      submitQuiz();
    }
  }, 1000);
}

function updateTimer() {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  document.getElementById('timer').textContent =
    `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ---------- START QUIZ ----------
async function startQuiz() {
  questions = await loadQuestions(currentSubject);
  if (!questions.length) return;

  document.getElementById('currentSubject').textContent =
    currentSubject.toUpperCase();

  showScreen('quiz-screen');

  initQuiz(questions); // 👈 comes from quiz.js

  if (currentMode === 'exam') {
    startTimer(45);
  }
      }
