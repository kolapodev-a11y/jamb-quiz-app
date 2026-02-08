
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
    //================ load question ======================///
async function loadQuestions() {
    quizData = [];
    const failedSubjects = [];
    
    try {
        for (const subject of selectedSubjects) {
            const questionsCount = currentMode === 'test' ? 10 : 
                                  (subject === 'english' ? 60 : 40);
            
            // Try absolute path first, then relative
            const url = `/data/${subject}.json`;
            
            console.log(`📥 Loading: ${url}`);
            
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (!data.questions || !Array.isArray(data.questions)) {
                    throw new Error('Invalid JSON structure: missing questions array');
                }
                
                if (data.questions.length === 0) {
                    console.warn(`⚠️ ${subject}.json has no questions`);
                    failedSubjects.push(subject);
                    continue;
                }

                const selectedQuestions = getRandomQuestions(data.questions, questionsCount);
                
                selectedQuestions.forEach(q => {
                    quizData.push({
                        ...q,
                        subject: subject,
                        subjectDisplay: capitalizeFirst(subject)
                    });
                });
                
                console.log(`✅ Loaded ${subject}: ${selectedQuestions.length} questions`);
                
            } catch (fetchError) {
                console.error(`❌ Failed to load ${subject}:`, fetchError);
                failedSubjects.push(subject);
            }
        }

        if (quizData.length === 0) {
            throw new Error('No questions loaded from any subject');
        }
        
        if (failedSubjects.length > 0) {
            alert(`⚠️ Warning: Failed to load ${failedSubjects.join(', ')}. Quiz will continue with available subjects.`);
        }

        document.getElementById('totalQuestions').textContent = quizData.length;
        
    } catch (error) {
        console.error('💥 Critical error:', error);
        alert(`Failed to load quiz questions. Please check your internet connection and try again.\n\nError: ${error.message}`);
        throw error;
    }
}
    ///// Random questions//////////

function getRandomQuestions(questions, count) {
    const flatQuestions = [];
    
    // Flatten passages and independent questions
    questions.forEach(item => {
        if (item.type === 'passage' && item.questions) {
            // Add passage context to each sub-question
            item.questions.forEach(subQ => {
                flatQuestions.push({
                    ...subQ,
                    passage: item.passage,
                    type: 'passage'
                });
            });
        } else if (item.type === 'independent' || !item.type) {
            flatQuestions.push({
                ...item,
                type: 'independent'
            });
        }
    });
    
    const shuffled = shuffleArray(flatQuestions);
    return shuffled.slice(0, Math.min(count, shuffled.length));
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
