// ============================================
// JAMB Quiz App - Main Application Logic
// ============================================

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
    const btn = document.getElementById('installBtn');
    if (btn) btn.style.display = 'block';
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
    document.querySelectorAll('.subject-card:not(.compulsory)').forEach(card => {
        card.addEventListener('click', function(e) {
            if (e.target.closest('input[type="checkbox"]')) return;
            const cb = this.querySelector('.subject-checkbox');
            if (cb) cb.click();
        });
    });

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
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function goHome() {
    showScreen('home-screen');
    resetQuiz();
}

// Mode Selection
function selectMode(mode) {
    currentMode = mode;
    showScreen('subject-screen');
    const info = document.getElementById('modeInfo');
    if (info) {
        info.textContent = mode === 'test' 
            ? '📝 Test Mode: 10 questions per subject' 
            : '🎯 Exam Mode: 60 English + 40 questions per other subject';
    }
}

// Subject Selection
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.subject-checkbox:checked');
    const otherSubjects = Array.from(checkboxes)
        .map(cb => cb.closest('.subject-card')?.dataset.subject)
        .filter(s => s && s !== 'english');
    
    selectedSubjects = ['english', ...otherSubjects.slice(0, 3)];
    const countEl = document.getElementById('selectedCount');
    if (countEl) countEl.textContent = selectedSubjects.length;
    
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

    const btn = document.getElementById('startQuizBtn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Loading Questions...';
    }

    await loadQuestions();
    
    if (btn) {
        btn.disabled = false;
        btn.textContent = 'Start Quiz →';
    }

    if (quizData.length === 0) {
        alert('Failed to load questions. Please check your connection and try again.');
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

// ✅ FIXED: Load Questions with proper preprocessing
async function loadQuestions() {
    quizData = [];
    const basePath = window.location.pathname.includes('/jamb-quiz-app') ? '/jamb-quiz-app' : '';
    
    for (const subject of selectedSubjects) {
        try {
            const count = currentMode === 'test' ? 10 : (subject === 'english' ? 60 : 40);
            const response = await fetch(`${basePath}/data/${subject}.json`);
            
            if (!response.ok) {
                console.error(`Failed to load ${subject}.json:`, response.status);
                continue;
            }
            
            const data = await response.json();
            let questions = data.questions || [];
            
            // ✅ FIX 1: Convert letter answers to numeric indices
            questions = questions.map(q => {
                const answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                return {
                    ...q,
                    correctAnswer: answerMap[q.answer] ?? 0, // Convert "B" → 1
                    subject,
                    subjectDisplay: subject.charAt(0).toUpperCase() + subject.slice(1)
                };
            });
            
            // ✅ FIX 2: Preprocess English passages
            if (subject === 'english') {
                questions = preprocessEnglishPassages(questions);
            }
            
            // Slice to required count
            quizData.push(...questions.slice(0, count));
            
        } catch (error) {
            console.error(`Error loading ${subject}:`, error);
            alert(`Failed to load ${subject} questions. Check console for details.`);
        }
    }
    
    const totalEl = document.getElementById('totalQuestions');
    if (totalEl) totalEl.textContent = quizData.length;
    
    console.log(`✅ Loaded ${quizData.length} questions from ${selectedSubjects.length} subjects`);
}

// ✅ FIX 3: English Passage Preprocessor
function preprocessEnglishPassages(questions) {
    let currentPassage = null;
    
    return questions.map((q, index) => {
        // Detect passage-based questions
        if (q.type === 'passage' && q.passage) {
            currentPassage = q.passage;
            q._passageText = currentPassage;
            q._isPassageStart = true;
        } else if (q.passage && q.passage !== currentPassage) {
            // New passage started
            currentPassage = q.passage;
            q._passageText = currentPassage;
            q._isPassageStart = true;
        } else if (currentPassage && q.type === 'passage') {
            // Continuation of current passage
            q._passageText = currentPassage;
            q._isPassageStart = false;
        }
        
        // Handle nested questions in passage objects
        if (q.questions && Array.isArray(q.questions)) {
            return q.questions.map((subQ, subIdx) => ({
                ...subQ,
                _passageText: q.passage || currentPassage,
                _isPassageStart: subIdx === 0,
                subject: 'english',
                subjectDisplay: 'English',
                correctAnswer: { 'A': 0, 'B': 1, 'C': 2, 'D': 3 }[subQ.answer] ?? 0
            }));
        }
        
        return q;
    }).flat(); // Flatten nested arrays
}

// Timer (Countdown)
function startTimer() {
    totalTimeSeconds = currentMode === 'exam' ? 7200 : 1560; // 2hrs or 26min
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
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Statistics
function loadStats() {
    try {
        const saved = localStorage.getItem('jambQuizStats');
        if (saved) stats = JSON.parse(saved);
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

function saveStats() {
    try {
        localStorage.setItem('jambQuizStats', JSON.stringify(stats));
    } catch (e) {
        console.error('Failed to save stats:', e);
    }
}

function displayStats() {
    const totalEl = document.getElementById('totalQuizzes');
    if (totalEl) totalEl.textContent = stats.totalQuizzes || 0;
    
    const avgEl = document.getElementById('avgScore');
    if (avgEl) {
        const avg = stats.scores.length 
            ? Math.round(stats.scores.reduce((a,b) => a+b, 0) / stats.scores.length) 
            : 0;
        avgEl.textContent = `${avg}%`;
    }
    
    const bestEl = document.getElementById('bestScore');
    if (bestEl) bestEl.textContent = `${stats.bestScore || 0}%`;
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

// Initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
    
