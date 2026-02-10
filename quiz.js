// ============================================
// JAMB Quiz App - Quiz Logic (FIXED)
// ============================================

let currentDisplayedPassage = "";
let isKatexReady = false;

// Wait for KaTeX to load
window.addEventListener('load', () => {
    const checkKatex = setInterval(() => {
        if (typeof renderMathInElement === 'function') {
            isKatexReady = true;
            clearInterval(checkKatex);
            console.log('✅ KaTeX loaded');
        }
    }, 100);
    
    setTimeout(() => {
        if (!isKatexReady) {
            console.warn('⚠️ KaTeX failed to load');
            clearInterval(checkKatex);
        }
    }, 5000);
});

// KaTeX Rendering
function renderLatexInElement(el) {
    if (!el || !isKatexReady) return;
    try {
        renderMathInElement(el, {
            delimiters: [
                { left: "$$", right: "$$", display: true },
                { left: "$", right: "$", display: false }
            ],
            throwOnError: false
        });
    } catch (e) {
        console.error('KaTeX render error:', e);
    }
}

// Bold text formatter
function formatBoldStars(text) {
    if (typeof text !== 'string') return text || '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// ✅ FIXED: Display Question with Proper Passage Handling
function displayQuestion() {
    if (currentQuestionIndex >= quizData.length) {
        console.error('Question index out of bounds');
        return;
    }
    
    const q = quizData[currentQuestionIndex];
    
    // Update UI
    const currentQEl = document.getElementById('currentQuestion');
    const qNumEl = document.getElementById('qNumber');
    const subjectEl = document.getElementById('currentSubject');
    
    if (currentQEl) currentQEl.textContent = currentQuestionIndex + 1;
    if (qNumEl) qNumEl.textContent = currentQuestionIndex + 1;
    if (subjectEl) subjectEl.textContent = q.subjectDisplay || capitalizeFirst(q.subject);
    
    // ✅ FIXED: Passage handling
    const passageBox = document.getElementById('passageBox');
    if (passageBox) {
        if (q.passage) {
            // Update passage if it's the first question of this passage
            if (q._isPassageStart) {
                currentDisplayedPassage = q.passage;
            }
            passageBox.style.display = 'block';
            passageBox.innerHTML = `<h3>📖 Comprehension Passage</h3><p>${formatBoldStars(currentDisplayedPassage)}</p>`;
        } else {
            passageBox.style.display = 'none';
            currentDisplayedPassage = '';
        }
    }
    
    // Render question text
    const qTextEl = document.getElementById('questionText');
    if (qTextEl) {
        qTextEl.innerHTML = formatBoldStars(q.question || 'Question text missing');
        renderLatexInElement(qTextEl);
    }
    
    // Progress bar
    const progressFill = document.getElementById('progressFill');
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
    
    // ✅ FIXED: Render options with validation
    const container = document.getElementById('optionsContainer');
    if (container) {
        container.innerHTML = '';
        const options = q.options || [];
        
        if (options.length === 0) {
            container.innerHTML = '<p style="color: red; padding: 20px; text-align: center;">⚠️ No options available for this question</p>';
            console.error('Missing options for question:', q);
        } else {
            options.forEach((opt, i) => {
                const div = document.createElement('div');
                div.className = `option ${userAnswers[currentQuestionIndex] === i ? 'selected' : ''}`;
                div.dataset.index = i;
                div.innerHTML = `
                    <div class="option-label">${['A','B','C','D'][i]}</div>
                    <div class="option-text">${formatBoldStars(opt)}</div>
                `;
                div.addEventListener('click', () => selectOption(i));
                container.appendChild(div);
                renderLatexInElement(div);
            });
        }
    }
    
    updateNavigationButtons();
    updateQuizNavigation();
}

// Option Selection
function selectOption(index) {
    document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
    const selected = document.querySelector(`.option[data-index="${index}"]`);
    if (selected) selected.classList.add('selected');
    
    userAnswers[currentQuestionIndex] = index;
    updateQuizNavigation();
}

// Navigation
function nextQuestion() {
    if (currentQuestionIndex < quizData.length - 1) {
        currentQuestionIndex++;
        displayQuestion();
    }
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayQuestion();
    }
}

function updateNavigationButtons() {
    const prev = document.getElementById('prevBtn');
    const next = document.getElementById('nextBtn');
    const submit = document.getElementById('submitBtn');
    
    if (prev) {
        prev.disabled = currentQuestionIndex === 0;
        prev.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
    }
    
    if (currentQuestionIndex === quizData.length - 1) {
        if (next) next.style.display = 'none';
        if (submit) submit.style.display = 'block';
    } else {
        if (next) next.style.display = 'block';
        if (submit) submit.style.display = 'none';
    }
}

// Question Navigator
function updateQuizNavigation() {
    const grid = document.getElementById('navGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    let currentSubject = '';
    
    quizData.forEach((q, i) => {
        if (q.subject !== currentSubject) {
            currentSubject = q.subject;
            const header = document.createElement('div');
            header.className = 'nav-subject-header';
            header.textContent = q.subjectDisplay || capitalizeFirst(q.subject);
            grid.appendChild(header);
        }
        
        const item = document.createElement('div');
        const classes = ['nav-item'];
        if (userAnswers[i] !== null) classes.push('answered');
        if (i === currentQuestionIndex) classes.push('current');
        item.className = classes.join(' ');
        item.textContent = i + 1;
        item.addEventListener('click', () => jumpToQuestion(i));
        grid.appendChild(item);
    });
}

function jumpToQuestion(index) {
    if (index >= 0 && index < quizData.length) {
        currentQuestionIndex = index;
        displayQuestion();
    }
}

function toggleNavigator() {
    const nav = document.getElementById('navGrid');
    if (nav) nav.classList.toggle('active');
}

// Submit & Results
function submitQuiz() {
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0) {
        if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
            return;
        }
    }
    
    stopTimer();
    calculateResults();
    showScreen('results-screen');
}

function calculateResults() {
    let correct = 0, wrong = 0, unanswered = 0;
    const subjectScores = {};
    
    quizData.forEach((q, i) => {
        const userAns = userAnswers[i];
        const correctAns = q.correctAnswer;
        
        if (!subjectScores[q.subject]) {
            subjectScores[q.subject] = { 
                name: q.subjectDisplay || capitalizeFirst(q.subject), 
                correct: 0, 
                total: 0 
            };
        }
        subjectScores[q.subject].total++;
        
        if (userAns === null) {
            unanswered++;
        } else if (userAns === correctAns) {
            correct++;
            subjectScores[q.subject].correct++;
        } else {
            wrong++;
        }
    });
    
    const pct = quizData.length > 0 ? Math.round((correct / quizData.length) * 100) : 0;
    updateStats(pct);
    displayResults(correct, wrong, unanswered, pct, subjectScores);
}

function displayResults(correct, wrong, unanswered, pct, subjectScores) {
    const scoreEl = document.getElementById('scorePercentage');
    if (scoreEl) scoreEl.textContent = `${pct}%`;
    
    const circ = 2 * Math.PI * 90;
    const circleEl = document.getElementById('scoreCircle');
    if (circleEl) {
        circleEl.style.strokeDashoffset = circ - (pct / 100) * circ;
    }
    
    const correctEl = document.getElementById('correctCount');
    const wrongEl = document.getElementById('wrongCount');
    const unansweredEl = document.getElementById('unansweredCount');
    
    if (correctEl) correctEl.textContent = correct;
    if (wrongEl) wrongEl.textContent = wrong;
    if (unansweredEl) unansweredEl.textContent = unanswered;
    
    const breakdown = document.getElementById('subjectBreakdown');
    if (breakdown) {
        breakdown.innerHTML = '<h3>📊 Subject Breakdown</h3>';
        Object.values(subjectScores).forEach(s => {
            const div = document.createElement('div');
            div.className = 'subject-result';
            const percentage = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            div.innerHTML = `
                <span class="subject-result-name">${s.name}</span>
                <span class="subject-result-score">${s.correct}/${s.total} (${percentage}%)</span>
            `;
            breakdown.appendChild(div);
        });
    }
}

// Review Screen
function reviewAnswers() {
    showScreen('review-screen');
    displayReview();
}

function backToResults() {
    showScreen('results-screen');
}

function displayReview() {
    const container = document.getElementById('reviewContainer');
    if (!container) return;
    
    container.innerHTML = '';
    let correct = 0, wrong = 0, unanswered = 0;
    
    quizData.forEach((q, i) => {
        const userAns = userAnswers[i];
        const correctAns = q.correctAnswer;
        let status = '', cls = '';
        
        if (userAns === null) {
            status = '⭕ Unanswered';
            cls = 'unanswered';
            unanswered++;
        } else if (userAns === correctAns) {
            status = '✅ Correct';
            cls = 'correct';
            correct++;
        } else {
            status = '❌ Wrong';
            cls = 'wrong';
            wrong++;
        }
        
        const item = document.createElement('div');
        item.className = `review-item ${cls}`;
        item.dataset.filter = cls;
        
        let optsHTML = '';
        (q.options || []).forEach((opt, idx) => {
            let optCls = 'review-option';
            let marker = '';
            
            if (idx === correctAns) {
                optCls += ' correct-answer';
                marker = ' ✅ Correct answer';
            }
            if (idx === userAns) {
                optCls += ' user-answer';
                if (idx !== correctAns) marker = ' ❌ Your wrong answer';
                else marker = ' ✅ Your correct answer';
            }
            
            optsHTML += `
                <div class="${optCls}">
                    <strong>${['A','B','C','D'][idx]}.</strong> 
                    ${formatBoldStars(opt)}
                    ${marker}
                </div>
            `;
        });
        
        item.innerHTML = `
            <div class="review-header">
                <div class="review-question-number">Question ${i+1} - ${q.subjectDisplay || capitalizeFirst(q.subject)}</div>
                <div class="review-status ${cls}">${status}</div>
            </div>
            <div class="review-question">${formatBoldStars(q.question)}</div>
            <div class="review-options">${optsHTML}</div>
        `;
        
        container.appendChild(item);
        renderLatexInElement(item);
    });
    
    const filterAll = document.getElementById('filterAll');
    const filterCorrect = document.getElementById('filterCorrect');
    const filterWrong = document.getElementById('filterWrong');
    const filterUnanswered = document.getElementById('filterUnanswered');
    
    if (filterAll) filterAll.textContent = quizData.length;
    if (filterCorrect) filterCorrect.textContent = correct;
    if (filterWrong) filterWrong.textContent = wrong;
    if (filterUnanswered) filterUnanswered.textContent = unanswered;
}

function filterReview(filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const clicked = event?.target?.closest('.filter-btn');
    if (clicked) clicked.classList.add('active');
    
    document.querySelectorAll('.review-item').forEach(item => {
        if (filter === 'all') {
            item.classList.remove('hidden');
        } else {
            item.classList.toggle('hidden', item.dataset.filter !== filter);
        }
    });
}

// Utilities
function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
                }
        
