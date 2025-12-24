document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const setupContainer = document.getElementById('setup-container');
    const quizContainer = document.getElementById('quiz-container');
    const scoreContainer = document.getElementById('score-container');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const numQuestionsInput = document.getElementById('num-questions');
    const dynamicContent = document.getElementById('dynamic-content');
    const navigationArea = document.getElementById('navigation-area');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const backBtn = document.getElementById('back-btn');
    const revealBtn = document.getElementById('reveal-btn');
    const loadingMessage = document.getElementById('loading-message');

    // --- State ---
    let allWords = [];
    let currentQuizWords = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let userAnswers = []; // To store user's answers for review

    const VOCAB_URL = 'https://corsproxy.io/?' + 'https://docs.google.com/spreadsheets/d/1YziLEaFBhDvaWCUfNgLkJSlyLo_bzNNaPSp7w52nhTc/export?format=csv';

    // --- Data Loading ---
    async function loadVocabulary() {
        try {
            const response = await fetch(VOCAB_URL);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const csvText = await response.text();
            allWords = parseCSV(csvText);

            if (allWords.length > 0) {
                loadingMessage.classList.add('hidden');
                startQuizBtn.disabled = false;
                numQuestionsInput.max = allWords.length;
                numQuestionsInput.placeholder = `(1-${allWords.length})`;
            } else {
                 throw new Error("No words were parsed from the data source.");
            }
        } catch (error) {
            console.error("Failed to load vocabulary:", error);
            loadingMessage.textContent = "Error: Could not load vocabulary data.";
            loadingMessage.style.color = 'red';
        }
    }

    function parseCSV(text) {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const wordIndex = headers.indexOf('Word');
        const meaningIndex = headers.indexOf('Meaning (Full)');
        const pronunciationIndex = headers.indexOf('Pronunciation');
        const audioIndex = headers.indexOf('Audio');

        if (wordIndex === -1 || meaningIndex === -1) {
            console.error("CSV headers 'Word' or 'Meaning (Full)' not found.");
            loadingMessage.textContent = "Error: Invalid vocabulary data format.";
            loadingMessage.style.color = 'red';
            return [];
        }

        return lines.slice(1).map(line => {
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            
            if (values.length > Math.max(wordIndex, meaningIndex)) {
                const word = (values[wordIndex] || '').trim().replace(/"/g, '');
                const meaning = (values[meaningIndex] || '').trim().replace(/"/g, '');
                const pronunciation = pronunciationIndex > -1 ? (values[pronunciationIndex] || '').trim().replace(/"/g, '') : '';
                const audio = audioIndex > -1 ? (values[audioIndex] || '').trim().replace(/"/g, '') : '';

                if (word && meaning) {
                    return {
                        "Word": word,
                        "Meaning (Full)": meaning,
                        "Pronunciation": pronunciation,
                        "Audio": audio
                    };
                }
            }
            return null;
        }).filter(Boolean);
    }

    // --- Event Listeners ---
    startQuizBtn.addEventListener('click', startQuiz);
    nextQuestionBtn.addEventListener('click', () => {
        if (currentQuestionIndex < currentQuizWords.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
        } else {
            showFinalScore();
        }
    });
    backBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
        }
    });
    revealBtn.addEventListener('click', () => {
        handleReveal();
    });

    // --- Quiz Logic ---
    function startQuiz() {
        const numQuestions = parseInt(numQuestionsInput.value, 10);
        if (isNaN(numQuestions) || numQuestions < 1 || numQuestions > allWords.length) {
            alert(`Please enter a number between 1 and ${allWords.length}.`);
            return;
        }

        score = 0;
        currentQuestionIndex = 0;
        userAnswers = new Array(numQuestions).fill(null);
        currentQuizWords = shuffleArray([...allWords]).slice(0, numQuestions);

        setupContainer.classList.add('hidden');
        scoreContainer.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        navigationArea.classList.remove('hidden');

        displayQuestion();
    }

    function displayQuestion() {
        if (currentQuestionIndex >= currentQuizWords.length) {
            showFinalScore();
            return;
        }

        const wordEntry = currentQuizWords[currentQuestionIndex];
        if (!wordEntry.question) {
            wordEntry.question = generateQuestion(wordEntry);
        }
        
        renderQuestion(wordEntry.question);
        updateNavigation();
    }

    function generateQuestion(wordEntry) {
        const questionTypes = ['word_to_meaning', 'meaning_to_word'];
        const type = questionTypes[Math.floor(Math.random() * questionTypes.length)];

        const correctAnswer = wordEntry;
        const options = [correctAnswer];
        
        while (options.length < 4) {
            const randomWord = allWords[Math.floor(Math.random() * allWords.length)];
            if (!options.some(opt => opt.Word === randomWord.Word)) {
                options.push(randomWord);
            }
        }
        shuffleArray(options);

        return { type, options, correctAnswer };
    }

    function renderQuestion({ type, options, correctAnswer }) {
        const userAnswer = userAnswers[currentQuestionIndex];
        const isAnswered = userAnswer !== null;

        let questionText = '';
        if (type === 'word_to_meaning') {
            const pronunciationLink = isAnswered ? getPronunciationLink(correctAnswer) : '';
            questionText = `What is the meaning of "<strong>${correctAnswer.Word}</strong>"? ${pronunciationLink}`;
        } else { // 'meaning_to_word'
            questionText = `Which word means "<strong>${correctAnswer["Meaning (Full)"]}</strong>"?`;
        }

        const optionsHtml = options.map(opt => {
            const word = (type === 'word_to_meaning') ? opt["Meaning (Full)"] : opt.Word;
            let pronunciationLink = '';
            if (isAnswered && opt.Word === correctAnswer.Word) {
                 pronunciationLink = getPronunciationLink(correctAnswer);
            }
            
            let btnClass = 'option-btn';
            if (isAnswered) {
                if (opt.Word === correctAnswer.Word) btnClass += ' correct';
                else if (opt.Word === userAnswer.selectedWord) btnClass += ' incorrect';
            }

            return `<button class="${btnClass}" data-word="${opt.Word}" ${isAnswered ? 'disabled' : ''}>
                        ${word} ${pronunciationLink}
                    </button>`;
        }).join('');

        let feedbackHtml = '';
        if (isAnswered) {
            if (userAnswer.isCorrect) {
                feedbackHtml = `<div id="feedback-area">Correct!</div>`;
            } else if (userAnswer.isRevealed) {
                const correctOpt = options.find(o => o.Word === correctAnswer.Word);
                const correctText = type === 'word_to_meaning' ? correctOpt["Meaning (Full)"] : correctOpt.Word;
                feedbackHtml = `<div id="feedback-area">Answer revealed: "${correctText}"</div>`;
            } else {
                const correctOpt = options.find(o => o.Word === correctAnswer.Word);
                const correctText = type === 'word_to_meaning' ? correctOpt["Meaning (Full)"] : correctOpt.Word;
                feedbackHtml = `<div id="feedback-area">Wrong! The correct answer was "${correctText}".</div>`;
            }
        }

        dynamicContent.innerHTML = `
            <div id="question-area">${questionText}</div>
            <div id="options-container">${optionsHtml}</div>
            ${feedbackHtml}
            <div id="progress-area">Question ${currentQuestionIndex + 1} of ${currentQuizWords.length}</div>
        `;
        
        if (!isAnswered) {
            document.querySelectorAll('.option-btn').forEach(btn => {
                btn.addEventListener('click', handleAnswer);
            });
        }
    }

    function handleAnswer(event) {
        const selectedBtn = event.target.closest('.option-btn');
        const selectedWord = selectedBtn.dataset.word;
        const correctWord = currentQuizWords[currentQuestionIndex].question.correctAnswer.Word;
        const isCorrect = selectedWord === correctWord;

        if (!userAnswers[currentQuestionIndex]) {
            userAnswers[currentQuestionIndex] = { selectedWord, isCorrect, isRevealed: false };
            if (isCorrect) {
                score++;
            }
        }

        displayQuestion(); // Re-render the question in its answered state
    }

    function updateNavigation() {
        const isAnswered = userAnswers[currentQuestionIndex] !== null;
        nextQuestionBtn.disabled = !isAnswered;
        revealBtn.disabled = isAnswered;

        backBtn.style.visibility = (currentQuestionIndex > 0) ? 'visible' : 'hidden';
        
        if (currentQuestionIndex === currentQuizWords.length - 1) {
            nextQuestionBtn.textContent = 'Finish Quiz';
        } else {
            nextQuestionBtn.textContent = 'Next';
        }
    }

    function handleReveal() {
        const correctWord = currentQuizWords[currentQuestionIndex].question.correctAnswer.Word;
        
        if (!userAnswers[currentQuestionIndex]) {
            userAnswers[currentQuestionIndex] = {
                selectedWord: correctWord,
                isCorrect: false,
                isRevealed: true
            };
            // Don't increment score for revealed answers
        }

        displayQuestion(); // Re-render the question in its answered state
    }

    function showFinalScore() {
        quizContainer.classList.add('hidden');
        scoreContainer.classList.remove('hidden');
        
        scoreContainer.innerHTML = `
            <h2>Quiz Complete!</h2>
            <p>Your final score is: <strong>${score} out of ${currentQuizWords.length}</strong></p>
            <button id="try-again-btn">Try Again</button>
        `;

        document.getElementById('try-again-btn').addEventListener('click', () => {
            scoreContainer.classList.add('hidden');
            setupContainer.classList.remove('hidden');
        });
    }

    // --- Utility Functions ---
    function getPronunciationLink(wordEntry) {
        if (wordEntry.Pronunciation && wordEntry.Audio) {
            return `<a href="${wordEntry.Audio}" target="_blank" title="Listen to pronunciation">(${wordEntry.Pronunciation})</a>`;
        }
        return '';
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- Initial Load ---
    loadVocabulary();
});