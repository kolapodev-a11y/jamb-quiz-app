// ============================================
// JAMB Quiz App - Main Application Logic (FIXED)
// ============================================

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentMode = '';
let isSingleSubjectMode = false;
let selectedSubjects = ['english'];
let quizData = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let quizStartTime = null;
let timerInterval = null;
let totalTimeSeconds = 0;
let stats = { totalQuizzes: 0, scores: [], bestScore: 0 };
let deferredPrompt;

// ============================================
// PWA INSTALLATION
// ============================================
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

// ============================================
// INITIALIZATION
// ============================================
function initApp() {
    loadStats();
    displayStats();
    setupEventListeners();
}

function setupEventListeners() {
  // Click handler for subject cards
  document.querySelectorAll('.subject-card').forEach(card => {
    card.addEventListener('click', function (e) {
      // Don't trigger if clicking the checkbox directly
      if (e.target.closest('input[type="checkbox"]')) return;

      const cb = this.querySelector('.subject-checkbox');
      if (cb && !cb.disabled) cb.click();
    });
  });

  // Change handler for checkboxes
  document.querySelectorAll('.subject-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', function (e) {
      const card = this.closest('.subject-card');
      if (!card) return;

      const subject = card.dataset.subject;

      if (isSingleSubjectMode) {
        // Single subject: uncheck all others
        if (this.checked) {
          document.querySelectorAll('.subject-checkbox').forEach(cb => {
            if (cb !== this) {
              cb.checked = false;
              cb.closest('.subject-card')?.classList.remove('selected');
            }
          });
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }

      } else {
        // Multi-subject: allow max 3 subjects besides English

        // Count ONLY non-English checked boxes (English is compulsory and already checked)
        const otherSelectedCount = Array.from(
          document.querySelectorAll('.subject-checkbox:checked')
        ).filter(cb => cb.closest('.subject-card')?.dataset.subject !== 'english').length;

        // If user is trying to check a non-English subject that would exceed 3
        if (subject !== 'english' && this.checked && otherSelectedCount > 3) {
          // Undo the check
          this.checked = false;
          card.classList.remove('selected');
          alert('You can only select 3 subjects besides English.');
          updateSelectedCount(); // keep UI in sync
          return;
        }

        card.classList.toggle('selected', this.checked);
      }

      updateSelectedCount();
    });
  });
}


// =============================================
// UTILITY FUNCTIONS
// ============================================
// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
    const shuffled = [...array]; // Create a copy
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ============================================
// SCREEN NAVIGATION
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.add('active');
}

function goHome() {
    showScreen('home-screen');
    resetQuiz();
}

// ============================================
// MODE SELECTION
// ============================================
function selectMode(mode, singleSubject = false) {
    currentMode = mode;
    isSingleSubjectMode = singleSubject;
    showScreen('subject-screen');
    
    const info = document.getElementById('modeInfo');
    const note = document.querySelector('.subject-note');
    const englishCard = document.querySelector('.subject-card[data-subject="english"]');
    const englishCheckbox = englishCard?.querySelector('input[type="checkbox"]');
    const compulsoryBadge = englishCard?.querySelector('.compulsory-badge');
    
    if (singleSubject) {
        // Single Subject Mode: English becomes selectable like any other subject
        if (englishCard) {
            englishCard.style.display = 'block';
            englishCard.classList.remove('compulsory');
            englishCard.classList.remove('selected');
        }
        if (englishCheckbox) {
            englishCheckbox.disabled = false;
            englishCheckbox.checked = false;
        }
        if (compulsoryBadge) {
            compulsoryBadge.style.display = 'none';
        }
        
        // Update UI text
        if (info) {
            info.textContent = mode === 'test' 
                ? '📝 Single Subject Test: 20 questions (14 minutes)' 
                : '🎯 Single Subject Exam: 40 questions (27 minutes)';
        }
        if (note) {
            note.innerHTML = '<p>📌 Select <strong>ONE</strong> subject to practice.</p>';
        }
        selectedSubjects = [];
        
    } else {
        // Multi Subject Mode: English is compulsory
        if (englishCard) {
            englishCard.style.display = 'block';
            englishCard.classList.add('compulsory');
            englishCard.classList.add('selected');
        }
        if (englishCheckbox) {
            englishCheckbox.disabled = true;
            englishCheckbox.checked = true;
        }
        if (compulsoryBadge) {
            compulsoryBadge.style.display = 'block';
        }
        
        if (info) {
            info.textContent = mode === 'test' 
                ? '📝 Test Mode: 10 questions per subject (26 minutes)' 
                : '🎯 Exam Mode: 60 English + 40 per other subject (2 hours)';
        }
        if (note) {
            note.innerHTML = '<p>📌 English is <strong>compulsory</strong>. Select 3 more subjects.</p>';
        }
        selectedSubjects = ['english'];
    }
    
    // Reset all other subject selections
    document.querySelectorAll('.subject-card').forEach(card => {
        if (card !== englishCard) {
            card.classList.remove('selected');
            const cb = card.querySelector('.subject-checkbox');
            if (cb) cb.checked = false;
        }
    });
    
    updateSelectedCount();
}

// ============================================
// SUBJECT SELECTION
// ============================================
function updateSelectedCount() {
    const checkboxes = document.querySelectorAll('.subject-checkbox:checked');
    
    if (isSingleSubjectMode) {
        // Single subject: only checked subjects
        selectedSubjects = Array.from(checkboxes)
            .map(cb => cb.closest('.subject-card')?.dataset.subject)
            .filter(s => s);
    } else {
        // Multi subject: English + up to 3 others
        const otherSubjects = Array.from(checkboxes)
            .map(cb => cb.closest('.subject-card')?.dataset.subject)
            .filter(s => s && s !== 'english');
        selectedSubjects = ['english', ...otherSubjects.slice(0, 3)];
    }
    
    const countEl = document.getElementById('selectedCount');
    const maxCount = document.getElementById('maxCount');
    
    if (countEl) countEl.textContent = selectedSubjects.length;
    if (maxCount) maxCount.textContent = isSingleSubjectMode ? 1 : 4;
    
    const btn = document.getElementById('startQuizBtn');
    if (btn) {
        const expectedCount = isSingleSubjectMode ? 1 : 4;
        const enabled = selectedSubjects.length === expectedCount;
        btn.disabled = !enabled;
        btn.style.opacity = enabled ? '1' : '0.5';
        btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
}

// ============================================
// QUIZ INITIALIZATION
// ============================================
async function startQuiz() {
    const expectedCount = isSingleSubjectMode ? 1 : 4;
    const modeName = isSingleSubjectMode ? '1 subject' : '4 subjects (English + 3 others)';
    
    if (selectedSubjects.length !== expectedCount) {
        alert(`Please select exactly ${modeName}`);
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

// ============================================
// QUESTION LOADING
// ============================================
async function loadQuestions() {
    quizData = [];
    const basePath = window.location.pathname.includes('/jamb-quiz-app') ? '/jamb-quiz-app' : '';
    
    for (const subject of selectedSubjects) {
        try {
            const response = await fetch(`${basePath}/data/${subject}.json`);
            
            if (!response.ok) {
                console.error(`Failed to load ${subject}.json:`, response.status);
                continue;
            }
            
            const data = await response.json();
            let allQuestions = data.questions || [];
            
            // Flatten nested passage questions FIRST
            allQuestions = flattenPassageQuestions(allQuestions, subject);
            
            // Convert letter answers to indices
            allQuestions = allQuestions.map(q => {
                const answerMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                return {
                    ...q,
                    correctAnswer: answerMap[q.answer] ?? 0,
                    subject,
                    subjectDisplay: subject.charAt(0).toUpperCase() + subject.slice(1)
                };
            });
            
            // Handle question selection based on mode and subject
            let questionsToAdd = [];
            
            if (subject === 'english') {
                if (isSingleSubjectMode) {
                    // Single subject mode: NO PASSAGES
                    const count = currentMode === 'test' ? 20 : 40;
                    const nonPassageQuestions = allQuestions.filter(q => !q.passage && q.type !== 'passage');
                    questionsToAdd = shuffleArray(nonPassageQuestions).slice(0, count);
                    
                } else if (currentMode === 'test') {
                    // Multi-subject test mode: NO PASSAGES
                    const nonPassageQuestions = allQuestions.filter(q => !q.passage && q.type !== 'passage');
                    questionsToAdd = shuffleArray(nonPassageQuestions).slice(0, 10);
                    
                } else {
                    // Multi-subject exam mode: 1 random passage (10Q) + 50 independent questions
                    const passageQuestions = allQuestions.filter(q => q.passage || q.type === 'passage');
                    const nonPassageQuestions = allQuestions.filter(q => !q.passage && q.type !== 'passage');
                    
                    // Group passage questions by passage text to get complete passages
                    const passageGroups = {};
                    passageQuestions.forEach(q => {
                        const key = q.passage || 'unknown';
                        if (!passageGroups[key]) passageGroups[key] = [];
                        passageGroups[key].push(q);
                    });
                    
                    // Convert to array of passage groups and select one randomly
                    const passageGroupsArray = Object.values(passageGroups).filter(group => group.length === 10);
                    
                    let selectedPassage = [];
                    if (passageGroupsArray.length > 0) {
                        // Select one random passage (should have 10 questions)
                        const randomIndex = Math.floor(Math.random() * passageGroupsArray.length);
                        selectedPassage = passageGroupsArray[randomIndex];
                    }
                    
                    // Select 50 random independent questions
                    const selectedNonPassage = shuffleArray(nonPassageQuestions).slice(0, 50);
                    
                    // Combine: passage questions first, then independent questions
                    questionsToAdd = [...selectedPassage, ...selectedNonPassage];
                    
                    console.log(`✅ English Exam: ${selectedPassage.length} passage questions + ${selectedNonPassage.length} independent = ${questionsToAdd.length} total`);
                }
            } else {
                // Non-English subjects
                let count;
                if (isSingleSubjectMode) {
                    count = currentMode === 'test' ? 20 : 40;
                } else {
                    count = currentMode === 'test' ? 10 : 40;
                }
                questionsToAdd = shuffleArray(allQuestions).slice(0, count);
            }
            
            quizData.push(...questionsToAdd);
            
        } catch (error) {
            console.error(`Error loading ${subject}:`, error);
            alert(`Failed to load ${subject} questions. Check console for details.`);
        }
    }
    
    const totalEl = document.getElementById('totalQuestions');
    if (totalEl) totalEl.textContent = quizData.length;
    
    console.log(`✅ Loaded ${quizData.length} questions from ${selectedSubjects.join(', ')}`);
}

// Flatten nested passage questions properly
function flattenPassageQuestions(questions, subject) {
    const flattened = [];
    
    for (const item of questions) {
        // Check if this is a passage container with nested questions
        if (item.type === 'passage' && item.questions && Array.isArray(item.questions)) {
            // This is a passage with nested questions
            const passage = item.passage;
            item.questions.forEach((subQ, idx) => {
                flattened.push({
                    ...subQ,
                    passage: passage,
                    type: 'passage',
                    _isPassageStart: idx === 0,
                    subject: subject
                });
            });
        } else {
            // Regular question or passage question without nesting
            flattened.push(item);
        }
    }
    
    return flattened;
}

// ============================================
// TIMER FUNCTIONS
// ============================================
function startTimer() {
    if (isSingleSubjectMode) {
        // Single subject: 14min test, 27min exam
        totalTimeSeconds = currentMode === 'test' ? 840 : 1620;
    } else {
        // Multi subject: 26min test, 2hrs exam
        totalTimeSeconds = currentMode === 'test' ? 1560 : 7200;
    }
    
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
    
    // Warning color when < 2 minutes
    if (remaining < 120) {
        el.style.color = '#ef4444';
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================
// STATISTICS MANAGEMENT
// ============================================
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

// ============================================
// RESET & RETAKE
// ============================================
function resetQuiz() {
    stopTimer();
    currentQuestionIndex = 0;
    userAnswers = [];
    quizData = [];
    quizStartTime = null;
    isSingleSubjectMode = false;
}

function retakeQuiz() {
    resetQuiz();
    showScreen('subject-screen');
}


// ============================================
// APP INITIALIZATION ON LOAD
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
        }


