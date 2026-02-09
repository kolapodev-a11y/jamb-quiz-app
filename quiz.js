// ============================================
// JAMB Quiz App - Quiz Logic
// ============================================

// KaTeX Rendering Helper
function renderLatexInElement(el) {
    if (typeof renderMathInElement !== "function" || !el) return;
    renderMathInElement(el, {
        delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
        ],
        throwOnError: false
    });
}

// Bold Text Formatter (for **text** syntax)
function formatBoldStars(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// Global: Track current English passage
let currentDisplayedPassage = "";

// ============================================
// Display Question
// ============================================

function displayQuestion() {
    if (currentQuestionIndex >= quizData.length) return;

    const question = quizData[currentQuestionIndex];
    
    // Update UI elements
    document.getElementById('currentQuestion').textContent = currentQuestionIndex + 1;
    document.getElementById('qNumber').textContent = currentQuestionIndex + 1;
    document.getElementById('currentSubject').textContent = question.subjectDisplay || capitalizeFirst(question.subject);
    
    const questionTextEl = document.getElementById('questionText');
    const passageBox = document.getElementById('passageBox');
    let qText = question.question || '';

    // Handle English passage display
    if (question.subject === 'english' && question._passageText) {
        if (question._isPassageStart) {
            currentDisplayedPassage = question._passageText;
        }
        passageBox.style.display = 'block';
        passageBox.innerHTML = `<h3>Comprehension Passage</h3><p>${formatBoldStars(currentDisplayedPassage)}</p>`;
    } else {
        passageBox.style.display = 'none';
        currentDisplayedPassage = '';
    }

    // Format question text and render
    qText = formatBoldStars(qText);
    questionTextEl.innerHTML = qText;
    renderLatexInElement(questionTextEl);

    // Update progress bar
    const progress = ((currentQuestionIndex + 1) / quizData.length) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    // Render options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';
    const optionLabels = ['A', 'B', 'C', 'D'];

    (question.options || []).forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'option';
        optionDiv.dataset.index = index;
        
        if (userAnswers[currentQuestionIndex] === index) {
            optionDiv.classList.add('selected');
        }
        
        optionDiv.innerHTML = `
            <div class="option-label">${optionLabels[index]}</div>
            <div class="option-text">${formatBoldStars(option)}</div>
        `;
        
        optionDiv.addEventListener('click', () => selectOption(index));
        optionsContainer.appendChild(optionDiv);
        renderLatexInElement(optionDiv);
    });

    // Update navigation
    updateNavigationButtons();
    updateQuizNavigation();
}

// ============================================
// Option Selection
// ============================================

function selectOption(index) {
    // Deselect all
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Select current
    const selectedOpt = document.querySelector(`.option[data-index="${index}"]`);
    if (selectedOpt) selectedOpt.classList.add('selected');
    
    // Save answer
    userAnswers[currentQuestionIndex] = index;
    updateQuizNavigation();
}

// ============================================
// Navigation
// ============================================

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
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');
    
    prevBtn.disabled = currentQuestionIndex === 0;
    prevBtn.style.opacity = currentQuestionIndex === 0 ? '0.5' : '1';
    
    if (currentQuestionIndex === quizData.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

// ============================================
// Question Navigator
// ============================================

function updateQuizNavigation() {
    const navGrid = document.getElementById('navGrid');
    if (!navGrid) return;
    
    navGrid.innerHTML = '';
    let currentSubject = '';
    
    quizData.forEach((question, index) => {
        // Add subject header when subject changes
        if (question.subject !== currentSubject) {
            currentSubject = question.subject;
            const subjectHeader = document.createElement('div');
            subjectHeader.className = 'nav-subject-header';
            subjectHeader.textContent = question.subjectDisplay || capitalizeFirst(question.subject);
            navGrid.appendChild(subjectHeader);
        }

        const navItem = document.createElement('div');
        navItem.className = 'nav-item';
        navItem.textContent = index + 1;
        
        if (userAnswers[index] !== null) {
            navItem.classList.add('answered');
        }
        
        if (index === currentQuestionIndex) {
            navItem.classList.add('current');
        }
        
        navItem.addEventListener('click', () => jumpToQuestion(index));
        navGrid.appendChild(navItem);
    });
}

function jumpToQuestion(index) {
    currentQuestionIndex = index;
    displayQuestion();
}

function toggleNavigator() {
    const navGrid = document.getElementById('navGrid');
    if (navGrid) navGrid.classList.toggle('active');
}

// ============================================
// Submit Quiz
// ============================================

function submitQuiz() {
    const unanswered = userAnswers.filter(a => a === null).length;
    
    if (unanswered > 0) {
        const confirm = window.confirm(
            `You have ${unanswered} unanswered question(s). Submit anyway?`
        );
        if (!confirm) return;
    }
    
    stopTimer();
    calculateResults();
    showScreen('results-screen');
}

// ============================================
// Calculate & Display Results
// ============================================

function calculateResults() {
    let correct = 0, wrong = 0, unanswered = 0;
    const subjectScores = {};
    
    quizData.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.correctAnswer;
        
        if (!subjectScores[question.subject]) {
            subjectScores[question.subject] = {
                name: question.subjectDisplay || capitalizeFirst(question.subject),
                correct: 0,
                total: 0
            };
        }
        
        subjectScores[question.subject].total++;
        
        if (userAnswer === null) {
            unanswered++;
        } else if (userAnswer === correctAnswer) {
            correct++;
            subjectScores[question.subject].correct++;
        } else {
            wrong++;
        }
    });
    
    const percentage = Math.round((correct / quizData.length) * 100);
    updateStats(percentage);
    displayResults(correct, wrong, unanswered, percentage, subjectScores);
}

function displayResults(correct, wrong, unanswered, percentage, subjectScores) {
    // Update score circle
    document.getElementById('scorePercentage').textContent = `${percentage}%`;
    const circumference = 2 * Math.PI * 90;
    const offset = circumference - (percentage / 100) * circumference;
    const circle = document.getElementById('scoreCircle');
    if (circle) circle.style.strokeDashoffset = offset;
    
    // Update summary cards
    document.getElementById('correctCount').textContent = correct;
    document.getElementById('wrongCount').textContent = wrong;
    document.getElementById('unansweredCount').textContent = unanswered;
    
    // Subject breakdown
    const breakdownContainer = document.getElementById('subjectBreakdown');
    if (breakdownContainer) {
        breakdownContainer.innerHTML = '<h3>Subject Breakdown</h3>';
        
        Object.values(subjectScores).forEach(subject => {
            const subjectPct = Math.round((subject.correct / subject.total) * 100);
            const resultDiv = document.createElement('div');
            resultDiv.className = 'subject-result';
            resultDiv.innerHTML = `
                <span class="subject-result-name">${subject.name}</span>
                <span class="subject-result-score">${subject.correct}/${subject.total} (${subjectPct}%)</span>
            `;
            breakdownContainer.appendChild(resultDiv);
        });
    }
}

// ============================================
// Review Answers
// ============================================

function reviewAnswers() {
    showScreen('review-screen');
    displayReview();
}

function backToResults() {
    showScreen('results-screen');
}

function displayReview() {
    const reviewContainer = document.getElementById('reviewContainer');
    if (!reviewContainer) return;
    
    reviewContainer.innerHTML = '';
    let correctCount = 0, wrongCount = 0, unansweredCount = 0;
    
    quizData.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const correctAnswer = question.correctAnswer;
        let status = '', statusClass = '';
        
        if (userAnswer === null) {
            status = '⭕ Unanswered';
            statusClass = 'unanswered';
            unansweredCount++;
        } else if (userAnswer === correctAnswer) {
            status = '✅ Correct';
            statusClass = 'correct';
            correctCount++;
        } else {
            status = '❌ Wrong';
            statusClass = 'wrong';
            wrongCount++;
        }
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${statusClass}`;
        reviewItem.dataset.filter = statusClass;
        
        const optionLabels = ['A', 'B', 'C', 'D'];
        let optionsHTML = '';
        (question.options || []).forEach((option, optIndex) => {
            let optionClass = 'review-option';
            if (optIndex === userAnswer && optIndex === correctAnswer) {
                optionClass += ' user-answer correct-answer';
            } else if (optIndex === userAnswer) {
                optionClass += ' user-answer';
            }
            optionsHTML += `
                <div class="${optionClass}">
                    <strong>${optionLabels[optIndex]}.</strong> ${formatBoldStars(option)}
                    ${optIndex === userAnswer ? ' 👈 Your answer' : ''}
                </div>
            `;
        });
        
        reviewItem.innerHTML = `
            <div class="review-header">
                <div class="review-question-number">Question ${index + 1} - ${question.subjectDisplay || capitalizeFirst(question.subject)}</div>
                <div class="review-status ${statusClass}">${status}</div>
            </div>
            <div class="review-question">${formatBoldStars(question.question)}</div>
            <div class="review-options">${optionsHTML}</div>
        `;
        reviewContainer.appendChild(reviewItem);
    });
    
    // Update filter counts
    document.getElementById('filterAll')?.textContent = quizData.length;
    document.getElementById('filterCorrect')?.textContent = correctCount;
    document.getElementById('filterWrong')?.textContent = wrongCount;
    document.getElementById('filterUnanswered')?.textContent = unansweredCount;
}

function filterReview(filter) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (event?.target) event.target.classList.add('active');
    
    // Filter items
    document.querySelectorAll('.review-item').forEach(item => {
        if (filter === 'all' || item.dataset.filter === filter) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

// ============================================
// Utility Functions
// ============================================

function capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
            }
