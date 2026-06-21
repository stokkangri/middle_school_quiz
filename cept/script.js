let chapterIndex = [];
let activeQuestions = [];
let currentQuestionIndex = 0;

// State management maps
let userAnswers = {};      // Captures inputs: { questionIndex: "A" }
let checkedQuestions = {}; // Tracks validation lock: { questionIndex: true }
let systemScores = {};     // Tracks point distribution: { questionIndex: 1 or 0 }

const loadingMessage = document.getElementById('loading-message');
const startBtn = document.getElementById('start-btn');
const topicSelect = document.getElementById('topic-select');
const setupView = document.getElementById('setup-view');
const quizView = document.getElementById('quiz-view');
const scoreView = document.getElementById('score-view');

const currentIdxText = document.getElementById('current-idx');
const totalCountText = document.getElementById('total-count');
const qText = document.getElementById('q-text');
const qOptions = document.getElementById('q-options');

const feedbackBox = document.getElementById('feedback-box');
const explanationBox = document.getElementById('explanation-box');
const checkBtn = document.getElementById('check-btn');
const revealBtn = document.getElementById('reveal-btn');
const nextBtn = document.getElementById('next-btn');
const prevBtn = document.getElementById('prev-btn');

const finalScoreText = document.getElementById('final-score');
const finalTotalText = document.getElementById('final-total');
const restartBtn = document.getElementById('restart-btn');

window.addEventListener('DOMContentLoaded', () => {
    fetch('chapters.json')
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(data => {
            chapterIndex = data;
            data.forEach(item => {
                const opt = document.createElement('option');
                opt.value = item.file;
                opt.textContent = item.name;
                topicSelect.appendChild(opt);
            });
            loadingMessage.style.display = 'none';
            setupView.style.display = 'block';
        })
        .catch(() => {
            loadingMessage.textContent = 'Error parsing primary chapters index.';
        });
});

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[arr[j] ? j : i]] = [arr[j], arr[i]];
    }
}

startBtn.addEventListener('click', () => {
    const targetJsonFile = topicSelect.value;
    setupView.style.display = 'none';
    loadingMessage.textContent = 'Fetching chapter questions data...';
    loadingMessage.style.display = 'block';

    fetch(targetJsonFile)
        .then(res => { if (!res.ok) throw new Error(); return res.json(); })
        .then(questions => {
            activeQuestions = questions;
            shuffleArray(activeQuestions);
            
            // Clear all runtime state engines
            currentQuestionIndex = 0;
            userAnswers = {};
            checkedQuestions = {};
            systemScores = {};

            loadingMessage.style.display = 'none';
            quizView.style.display = 'flex'; // Sets up two-column dashboard view layout
            
            buildSidebarGrid();
            loadQuestion();
        })
        .catch(() => {
            loadingMessage.textContent = 'Could not load the requested target JSON content block.';
        });
});

// Build out clickable side panel block grid nodes
function buildSidebarGrid() {
    const gridContainer = document.getElementById('question-grid');
    gridContainer.innerHTML = '';
    
    activeQuestions.forEach((_, index) => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-pointer-btn';
        btn.id = `sidebar-pointer-${index}`;
        btn.textContent = index + 1;
        btn.onclick = () => jumpToQuestion(index);
        gridContainer.appendChild(btn);
    });
}

// Adjust colors of navigation tabs dynamically
function updateNavigationUI() {
    activeQuestions.forEach((_, index) => {
        const btn = document.getElementById(`sidebar-pointer-${index}`);
        if (!btn) return;

        btn.classList.remove('active-view', 'answered', 'checked-state');

        if (index === currentQuestionIndex) {
            btn.classList.add('active-view');
        }
        if (checkedQuestions[index]) {
            btn.classList.add('checked-state'); // Verified/revealed green status marker
        } else if (userAnswers[index] !== undefined) {
            btn.classList.add('answered'); // Selected choice yellow marker
        }
    });

    // Control edge bounds tracking behaviors
    prevBtn.disabled = (currentQuestionIndex === 0);
    
    // Switch dynamic tracking mode configurations at trailing quiz bounds
    if (currentQuestionIndex === activeQuestions.length - 1) {
        nextBtn.textContent = "Finish Quiz";
        nextBtn.style.backgroundColor = "var(--primary-color)";
    } else {
        nextBtn.textContent = "Next Question →";
        nextBtn.style.backgroundColor = "var(--success-color)";
    }
}

function loadQuestion() {
    const targetQ = activeQuestions[currentQuestionIndex];
    totalCountText.textContent = activeQuestions.length;
    currentIdxText.textContent = currentQuestionIndex + 1;
    qText.textContent = targetQ.q;
    
    qOptions.innerHTML = '';
    Object.keys(targetQ.options).forEach(key => {
        const label = document.createElement('label');
        label.className = 'option-label';
        
        const isChecked = userAnswers[currentQuestionIndex] === key ? 'checked' : '';
        const isDisabled = checkedQuestions[currentQuestionIndex] ? 'disabled' : '';
        
        label.innerHTML = `
            <input type="radio" name="quiz-option" value="${key}" ${isChecked} ${isDisabled} onchange="saveSelectedAnswer('${key}')"> 
            <strong>${key})</strong> ${targetQ.options[key]}
        `;
        qOptions.appendChild(label);
    });

    // Handle historical visual layout parsing rules
    if (checkedQuestions[currentQuestionIndex]) {
        showStaticFeedback();
    } else {
        feedbackBox.style.display = 'none';
        explanationBox.style.display = 'none';
        checkBtn.style.display = 'block';
        revealBtn.style.display = 'block';
    }

    updateNavigationUI();
}

function saveSelectedAnswer(choiceKey) {
    if (checkedQuestions[currentQuestionIndex]) return;
    userAnswers[currentQuestionIndex] = choiceKey;
    updateNavigationUI();
}

function jumpToQuestion(targetIndex) {
    currentQuestionIndex = targetIndex;
    loadQuestion();
}

// Check validation processing runtime logic
checkBtn.addEventListener('click', () => {
    const selected = document.querySelector('input[name="quiz-option"]:checked');
    if (!selected) { alert('Select an answer block first!'); return; }

    const currentQ = activeQuestions[currentQuestionIndex];
    checkedQuestions[currentQuestionIndex] = true;

    if (selected.value === currentQ.answer) {
        systemScores[currentQuestionIndex] = 1;
    } else {
        systemScores[currentQuestionIndex] = 0;
    }

    showStaticFeedback();
    updateNavigationUI();
});

revealBtn.addEventListener('click', () => {
    checkedQuestions[currentQuestionIndex] = true;
    systemScores[currentQuestionIndex] = 0; // Revealing without checking defaults value payload to zero
    showStaticFeedback();
    updateNavigationUI();
});

function showStaticFeedback() {
    const currentQ = activeQuestions[currentQuestionIndex];
    const chosen = userAnswers[currentQuestionIndex];
    
    // Disable active interface nodes
    const inputs = document.getElementsByName('quiz-option');
    inputs.forEach(input => input.disabled = true);

    checkBtn.style.display = 'none';
    revealBtn.style.display = 'none';

    if (chosen === currentQ.answer) {
        feedbackBox.textContent = "Correct!";
        feedbackBox.className = "feedback correct";
    } else if (chosen) {
        feedbackBox.textContent = `Incorrect. Correct choice was ${currentQ.answer}.`;
        feedbackBox.className = "feedback incorrect";
    } else {
        feedbackBox.textContent = `The correct answer is ${currentQ.answer}.`;
        feedbackBox.className = "feedback correct";
    }

    explanationBox.textContent = `Explanation: ${currentQ.rationale}`;
    explanationBox.style.display = 'block';
}

// Handle layout navigation stepping boundaries
prevBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        loadQuestion();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentQuestionIndex < activeQuestions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        // Tally results on complete execution run sequence mapping rules
        let computedFinalScore = 0;
        Object.keys(systemScores).forEach(k => {
            computedFinalScore += systemScores[k];
        });

        quizView.style.display = 'none';
        scoreView.style.display = 'block';
        finalScoreText.textContent = computedFinalScore;
        finalTotalText.textContent = activeQuestions.length;
    }
});

restartBtn.addEventListener('click', () => {
    scoreView.style.display = 'none';
    setupView.style.display = 'block';
});
