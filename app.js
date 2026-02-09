// ============================================
// JAMB Quiz App - Main Application Logic
// ============================================
// Fix GitHub Pages base path
if (location.pathname.startsWith('/')) {
    const path = location.pathname.split('/')[1];
    if (path) {
        // If deployed to a subdirectory (e.g., /jamb-quiz-app/)
        const base = `/${path}`;
        const scripts = document.querySelectorAll('script[src], link[href]');
        scripts.forEach(el => {
            if (el.src) el.src = el.src.replace(base, '');
            if (el.href) el.href = el.href.replace(base, '');
        });
    }
}

let currentMode = '';
let selectedSubjects = ['english'];
let quizData = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = null;
let timerInterval = null;
let totalTimeSeconds = 0;
let stats = { totalQuizzes: 0, scores: [], bestScore: 0 };
let deferredPrompt;

// PWA Installation
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('installBtn')?.style.display = 'block';
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

// Initialize App
function initApp() {
    loadStats();
    displayStats();
    setupEventListeners();
}

function setupEventListeners() {
    // Card clicks → checkbox
    document.querySelectorAll('.subject-card:not(.compulsory)').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('input[type="checkbox"]')) return;
            const cb = this.querySelector('.subject-checkbox');
            if (cb) cb.click();
        });
    });

    // Checkbox change handler
    document.querySelectorAll('.subject-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const card = this.closest('.subject-card');
            if (!card) return;
            const isChecked = this.checked;
            const selectedCount = document.querySelectorAll('.subject-checkbox:checked').length;
            
            if (isChecked && selectedCount > 3) {
                this.checked = false;
                alert('You can only select 3 subjects besides English.');
                return;
            }
            card.classList.toggle('selected', isChecked);
            updateSelectedCount();
        });
    });
}

// Screen Navigation
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId)?.classList.add('active');
}

function goHome() {
    showScreen('home-screen');
    resetQuiz();
}

// Mode Selection
function selectMode(mode) {
    currentMode = mode;
    showScreen('subject-screen');
    document.getElementById('modeInfo').textContent = 
        mode === 'test' ? '📝 Test Mode: 10 questions per subject' : '🎯 Exam Mode: 60 English + 40 questions per other subject';
}

// Subject Selection
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.subject-checkbox:checked');
    const otherSubjects = Array.from(checkboxes)
        .map(cb => cb.closest('.subject-card')?.dataset.subject)
        .filter(s => s && s !== 'english');
    
    selectedSubjects = ['english', ...otherSubjects.slice(0, 3)];
    document.getElementById('selectedCount').textContent = selectedSubjects.length;
    
    const btn = document.getElementById('startQuizBtn');
    if (btn) {
        const enabled = selectedSubjects.length === 4;
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.5';
    }
}

// Start Quiz
async function startQuiz() {
    if (selectedSubjects.length !== 4) {
        alert('Please select exactly 4 subjects (English + 3 others)');
        return;
    }

    await loadQuestions();
    if (quizData.length === 0) {
        alert('Failed to load questions. Please check your internet connection.');
        return;
    }

    currentQuestionIndex = 0;
    userAnswers = new Array(quizData.length).fill(null);
    quizStartTime = Date.now();
    showScreen('quiz-screen');
    startTimer();
    displayQuestion();
    updateQuizNavigation();
}

// Load Questions
async function loadQuestions() {
    quizData = [];
    for (const subject of selectedSubjects) {
        const count = currentMode === 'test' ? 10 : (subject === 'english' ? 60 : 40);
        try {const basePath = location.pathname.startsWith('/jamb-quiz-app') ? '/jamb-quiz-app' : '';
        const response = await fetch(`${basePath}/data/${subject}.json`);
            if (!response.ok) throw new Error(`Failed to load ${subject}.json`);
            const data = await response.json();
            const questions = (data.questions || []).slice(0, count);
            quizData.push(...questions.map(q => ({
                ...q,
                subject,
                subjectDisplay: subject.charAt(0).toUpperCase() + subject.slice(1)
            })));
        } catch (e) {
            console.error(`Error loading ${subject}:`, e);
        }
    }
    document.getElementById('totalQuestions').textContent = quizData.length;
}

// Timer (Countdown)
function startTimer() {
    totalTimeSeconds = currentMode === 'exam' ? 7200 : 1560; // 120min / 26min
    quizStartTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const el = document.getElementById('timeDisplay');
    if (!el) return;
    
    const elapsed = Math.floor((Date.now() - quizStartTime) / 1000);
    let remaining = totalTimeSeconds - elapsed;
    
    if (remaining <= 0) {
        remaining = 0;
        stopTimer();
        if (confirm("Time's up! Submit quiz now?")) submitQuiz();
        return;
    }
    
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
}

// Statistics
function loadStats() {
    const saved = localStorage.getItem('jambQuizStats');
    if (saved) stats = JSON.parse(saved);
}

function saveStats() {
    localStorage.setItem('jambQuizStats', JSON.stringify(stats));
}

function displayStats() {
    document.getElementById('totalQuizzes').textContent = stats.totalQuizzes || 0;
    const avg = stats.scores.length ? Math.round(stats.scores.reduce((a,b)=>a+b)/stats.scores.length) : 0;
    document.getElementById('avgScore').textContent = `${avg}%`;
    document.getElementById('bestScore').textContent = `${stats.bestScore || 0}%`;
}

function updateStats(score) {
    stats.totalQuizzes++;
    stats.scores.push(score);
    if (score > stats.bestScore) stats.bestScore = score;
    saveStats();
    displayStats();
}

// Reset
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

// Initialize
document.addEventListener('DOMContentLoaded', initApp);

// Service Worker Registration (only if supported)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .catch(err => console.log('SW registration failed:', err));
    });
            }
