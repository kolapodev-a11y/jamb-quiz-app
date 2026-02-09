// ================================
// quiz.js – Quiz Engine
// ================================

let quizQuestions = [];
let currentIndex = 0;
let userAnswers = [];

// ---------- INIT ----------
function initQuiz(questions) {
  quizQuestions = questions;
  currentIndex = 0;
  userAnswers = new Array(questions.length).fill(null);
  renderQuestion();
}

// ---------- RENDER ----------
function renderQuestion() {
  const q = quizQuestions[currentIndex];

  document.getElementById('questionText').textContent =
    `${currentIndex + 1}. ${q.question}`;

  const passageBox = document.getElementById('passageBox');
  passageBox.style.display = q.passage ? 'block' : 'none';
  passageBox.textContent = q.passage || '';

  const optionsBox = document.getElementById('optionsBox');
  optionsBox.innerHTML = '';

  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt;

    if (userAnswers[currentIndex] === idx) {
      btn.classList.add('selected');
    }

    btn.onclick = () => {
      userAnswers[currentIndex] = idx;
      renderQuestion();
    };

    optionsBox.appendChild(btn);
  });

  updateNavButtons();
}

// ---------- NAV ----------
function nextQuestion() {
  if (currentIndex < quizQuestions.length - 1) {
    currentIndex++;
    renderQuestion();
  }
}

function prevQuestion() {
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}

function updateNavButtons() {
  document.getElementById('prevBtn').disabled = currentIndex === 0;
  document.getElementById('nextBtn').disabled =
    currentIndex === quizQuestions.length - 1;
}

// ---------- SUBMIT ----------
function submitQuiz() {
  let score = 0;

  quizQuestions.forEach((q, i) => {
    if (userAnswers[i] === q.answer) score++;
  });

  document.getElementById('scoreText').textContent =
    `You scored ${score} out of ${quizQuestions.length}`;

  showScreen('results-screen'); // 👈 from app.js
}
