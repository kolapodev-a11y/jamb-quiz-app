// ============================================
// JAMB Quiz App - Main Application Logic
// ============================================

let currentMode = '';
let selectedSubjects = ['english']; // English is always selected
let quizData = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = null;
let timerInterval = null;
let totalTimeSeconds = 0;
let stats = {
    totalQuizzes: 0,
    scores: [],
    bestScore: 0
};

// PWA Installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn').style.display = 'block';
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response: ${outcome}`);
        deferredPrompt = null;
        document.getElementById('installBtn').style.display = 'none';
    }
});

// ============================================
// Initialize App
// ============================================

function initApp() {
    loadStats();
    displayStats();
    setupEventListeners();
}

function setupEventListeners() {
    // Handle card clicks → delegate to checkbox (for non-compulsory)
    document.querySelectorAll('.subject-card:not(.compulsory)').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('input[type="checkbox"]')) return;
            const cb = this.querySelector('.subject-checkbox');
            if (cb) cb.click();
        });
    });

    // Single, clean event listener for checkboxes
    document.querySelectorAll('.subject-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const card = this.closest('.subject-card');
            if (!card) return;

            const isChecked = this.checked;
            const selectedNonCompulsory = document.querySelectorAll('.subject-checkbox:checked').length;

            // Enforce max 3 extra subjects
            if (isChecked && selectedNonCompulsory > 3) {
                this.checked = false;
                alert('You can only select 3 subjects besides English.');
                return;
            }

            // Update UI
            card.classList.toggle('selected', isChecked);
            updateSelectedCount();
        });
    });
}

// ============================================
// Screen Navigation
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function goHome() {
    showScreen('home-screen');
    resetQuiz();
}

// ============================================
// Mode Selection
// ============================================

function selectMode(mode) {
    currentMode = mode;
    showScreen('subject-screen');
    
    const modeInfo = document.getElementById('modeInfo');
    if (mode === 'test') {
        modeInfo.textContent = '📝 Test Mode: 10 questions per subject';
    } else {
        modeInfo.textContent = '🎯 Exam Mode: 60 English + 40 questions per other subject';
    }
}

// ============================================
// Subject Selection & Count
// ============================================

function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.subject-checkbox:checked');
    const count = selectedCheckboxes.length + 1; // +1 for English

    // Build list: always start with English, then others
    const otherSubjects = [];
    selectedCheckboxes.forEach(cb => {
        const card = cb.closest('.subject-card');
        if (card && card.dataset.subject && card.dataset.subject !== 'english') {
            otherSubjects.push(card.dataset.subject);
        }
    });

    // Ensure max 3 others
    if (otherSubjects.length > 3) {
        otherSubjects.length = 3;
        alert('You can only select 3 subjects besides English.');
    }

    selectedSubjects = ['english', ...otherSubjects];

    // Update counter
    document.getElementById('selectedCount').textContent = selectedSubjects.length;

    // Enable Start button
    const startBtn = document.getElementById('startQuizBtn');
    if (startBtn) {
        const shouldEnable = (selectedSubjects.length === 4);
        startBtn.disabled = !shouldEnable;
        startBtn.style.opacity = shouldEnable ? '1' : '0.5';
    }
}

// ============================================
// Start Quiz
// ============================================

async function startQuiz() {
    // 🔒 Ensure English is first and exactly 4 subjects
    const uniqueSubjects = ['english'];
    for (const s of selectedSubjects) {
        if (s !== 'english' && !uniqueSubjects.includes(s)) {
            uniqueSubjects.push(s);
        }
    }
    selectedSubjects = uniqueSubjects.slice(0, 4);

    if (selectedSubjects.length !== 4) {
        alert('Please select exactly 4 subjects (English + 3 others)');
        return;
    }

    // Load questions
    await loadQuestions();

    if (quizData.length === 0) {
        alert('Failed to load questions. Please check that JSON files are available.');
        return;
    }

    // Initialize quiz state
    currentQuestionIndex = 0;
    userAnswers = new Array(quizData.length).fill(null);
    quizStartTime = Date.now();

    // Show quiz screen FIRST so DOM elements exist
    showScreen('quiz-screen');

    // Start timer AFTER screen is active
    startTimer();

    // Display first question
    displayQuestion();
    updateQuizNavigation();
}

// ============================================
// Load Questions
// ============================================

async function loadQuestions() {
    quizData = [];
    
    try {
        for (const subject of selectedSubjects) {
            const questionsCount = currentMode === 'test' ? 10 : 
                                  (subject === 'english' ? 60 : 40);
            
            const response = await fetch(`data/${subject}.json`);
            if (!response.ok) {
                console.error(`❌ Failed to load ${subject}.json`);
                continue;
            }
            
            const data = await response.json();
            const allQuestions = data.questions || [];
            
            if (allQuestions.length === 0) {
                console.warn(`⚠️ ${subject}.json has no questions!`);
                continue;
            }

            const selectedQuestions = getRandomQuestions(allQuestions, questionsCount);
            
            selectedQuestions.forEach(q => {
                quizData.push({
                    ...q,
                    subject: subject,
                    subjectDisplay: capitalizeFirst(subject)
                });
            });
        }

        document.getElementById('totalQuestions').textContent = quizData.length;
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

function getRandomQuestions(questions, count) {
    const shuffled = shuffleArray([...questions]);
    return shuffled.slice(0, Math.min(count, shuffled.length));
}

function shuffleArray(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ============================================
// Timer (Countdown)
// ============================================

function startTimer() {
    // Set total time based on mode
    if (currentMode === 'exam') {
        totalTimeSeconds = 120 * 60; // 120 minutes
    } else {
        totalTimeSeconds = 26 * 60;  // 26 minutes
    }

    quizStartTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
    updateTimer(); // initial display
}

function updateTimer() {
    const timeEl = document.getElementById('timeDisplay');
    if (!timeEl) return; // safety: element not in DOM yet

    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    let remaining = totalTimeSeconds - elapsed;

    if (remaining <= 0) {
        remaining = 0;
        stopTimer();
        alert("Time's up! Quiz submitted automatically.");
        submitQuiz();
        return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;

    timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// Statistics
// ============================================

function loadStats() {
    const saved = localStorage.getItem('jambQuizStats');
    if (saved) {
        stats = JSON.parse(saved);
    }
}

function saveStats() {
    localStorage.setItem('jambQuizStats', JSON.stringify(stats));
}

function displayStats() {
    document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
    
    const avgScore = stats.scores.length > 0 
        ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length)
        : 0;
    document.getElementById('avgScore').textContent = avgScore + '%';
    
    document.getElementById('bestScore').textContent = (stats.bestScore || 0) + '%';
}

function updateStats(score) {
    stats.totalQuizzes++;
    stats.scores.push(score);
    if (score > stats.bestScore) {
        stats.bestScore = score;
    }
    saveStats();
    displayStats();
}

// ============================================
// Reset Quiz
// ============================================

function resetQuiz() {
    stopTimer();
    currentQuestionIndex = 0;
    userAnswers = [];
    quizData = [];
    quizStartTime = null;
}

function retakeQuiz() {
    resetQuiz();
    showScreen('subject-screen');
}

// ============================================
// Utility Functions
// ============================================

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}