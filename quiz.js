// ============================================
// JAMB Quiz App - Quiz Logic
// ============================================

let currentDisplayedPassage = "";

// KaTeX Rendering (retry-safe)
function renderLatexInElement(el) {
    if (!el || typeof renderMathInElement !== 'function') return;
    renderMathInElement(el, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
        ],
        throwOnError: false
    });
}

// Bold text formatter
function formatBoldStars(text) {
    return typeof text === 'string' ? text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') : text;
}

// Display Question
function displayQuestion() {
    if (currentQuestionIndex >= quizData.length) return;
    const q = quizData[currentQuestionIndex];
    
    // Update UI
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    document.getElementById('qNumber').textContent = currentQuestionIndex + 1;
    document.getElementById('currentSubject').textContent = q.subjectDisplay || capitalizeFirst(q.subject);
    
    // Handle English passages
    const passageBox = document.getElementById('passageBox');
    if (q.subject === 'english' && q._passageText) {
        if (q._isPassageStart) currentDisplayedPassage = q._passageText;
        passageBox.style.display = 'block';
        passageBox.innerHTML = `<h3>Comprehension Passage</h3><p>${formatBoldStars(currentDisplayedPassage)}</p>`;
    } else {
        passageBox.style.display = 'none';
        currentDisplayedPassage = '';
    }
    
    // Render question
    const qTextEl = document.getElementById('questionText');
    qTextEl.innerHTML = formatBoldStars(q.question || '');
    renderLatexInElement(qTextEl);
    
    // Progress bar
    const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;
    
    // Render options
    const container = document.getElementById('optionsContainer');
    container.innerHTML = '';
    (q.options || []).forEach((opt, i) => {
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
    
    updateNavigationButtons();
    updateQuizNavigation();
}

// Option Selection
function selectOption(index) {
    document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
    document.querySelector(`.option[data-index="${index}"]`)?.classList.add('selected');
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
    
    prev.disabled = currentQuestionIndex === 0;
    prev.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
    
    if (currentQuestionIndex === quizData.length - 1) {
        next.style.display = 'none';
        submit.style.display = 'block';
    } else {
        next.style.display = 'block';
        submit.style.display = 'none';
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
        item.className = `nav-item ${userAnswers[i] !== null ? 'answered' : ''} ${i === currentQuestionIndex ? 'current' : ''}`;
        item.textContent = i + 1;
        item.addEventListener('click', () => jumpToQuestion(i));
        grid.appendChild(item);
    });
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    displayQuestion();
}

function toggleNavigator() {
    document.getElementById('navGrid')?.classList.toggle('active');
}

// Submit & Results
function submitQuiz() {
    const unanswered = userAnswers.filter(a => a === null).length;
    if (unanswered > 0 && !confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;
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
            subjectScores[q.subject] = { name: q.subjectDisplay || capitalizeFirst(q.subject), correct: 0, total: 0 };
        }
        subjectScores[q.subject].total++;
        
        if (userAns === null) unanswered++;
        else if (userAns === correctAns) { correct++; subjectScores[q.subject].correct++; }
        else wrong++;
    });
    
    const pct = Math.round((correct / quizData.length) * 100);
    updateStats(pct);
    displayResults(correct, wrong, unanswered, pct, subjectScores);
}

function displayResults(correct, wrong, unanswered, pct, subjectScores) {
    document.getElementById('scorePercentage').textContent = `${pct}%`;
    const circ = 2 * Math.PI * 90;
    document.getElementById('scoreCircle').style.strokeDashoffset = circ - (pct / 100) * circ;
    
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('unansweredCount').textContent = unanswered;
    
    const breakdown = document.getElementById('subjectBreakdown');
    if (breakdown) {
        breakdown.innerHTML = '<h3>Subject Breakdown</h3>';
        Object.values(subjectScores).forEach(s => {
            const div = document.createElement('div');
            div.className = 'subject-result';
            div.innerHTML = `
                <span class="subject-result-name">${s.name}</span>
                <span class="subject-result-score">${s.correct}/${s.total} (${Math.round((s.correct/s.total)*100)}%)</span>
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
        
        if (userAns === null) { status = '⭕ Unanswered'; cls = 'unanswered'; unanswered++; }
        else if (userAns === correctAns) { status = '✅ Correct'; cls = 'correct'; correct++; }
        else { status = '❌ Wrong'; cls = 'wrong'; wrong++; }
        
        const item = document.createElement('div');
        item.className = `review-item ${cls}`;
        item.dataset.filter = cls;
        
        let optsHTML = '';
        (q.options || []).forEach((opt, idx) => {
            let optCls = 'review-option';
            if (idx === userAns && idx === correctAns) optCls += ' user-answer correct-answer';
            else if (idx === userAns) optCls += ' user-answer';
            optsHTML += `<div class="${optCls}"><strong>${['A','B','C','D'][idx]}.</strong> ${formatBoldStars(opt)}${idx === userAns ? ' 👈 Your answer' : ''}</div>`;
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
    });
    
    document.getElementById('filterAll').textContent = quizData.length;
    document.getElementById('filterCorrect').textContent = correct;
    document.getElementById('filterWrong').textContent = wrong;
    document.getElementById('filterUnanswered').textContent = unanswered;
}

function filterReview(filter) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    event?.target?.classList.add('active');
    document.querySelectorAll('.review-item').forEach(item => {
        item.classList.toggle('hidden', filter !== 'all' && item.dataset.filter !== filter);
    });
}

// Utilities
function capitalizeFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
            }
