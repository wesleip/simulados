const questions = window.SIMULADO.questions;
let currentQuestionIndex = window.SIMULADO.initialQuestionIndex;
let isTransitioning = false;
let userAnswers = new Array(questions.length).fill(null);

let timer;
let timeRemaining = 60 * 60;
let isTimerRunning = false;
let isTimerPaused = false;

const questionTextEl = document.getElementById('question-text');
const optionsListEl = document.getElementById('options-list');
const prevButtonEl = document.getElementById('prevButton');
const nextButtonEl = document.getElementById('nextButton');
const questionCounterEl = document.getElementById('question-counter');
const startBtnEl = document.getElementById('startBtn');
const pauseBtnEl = document.getElementById('pauseBtn');
const resumeBtnEl = document.getElementById('resumeBtn');
const questionMapEl = document.getElementById('question-map');

function updateProgressBar() {
    const answered = userAnswers.filter(a => a !== null).length;
    const total = questions.length;
    const pct = total > 0 ? (answered / total) * 100 : 0;
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('progress-label').textContent = `${answered} respondida${answered !== 1 ? 's' : ''}`;
    document.getElementById('progress-total').textContent = `${total} questões`;
}

function buildQuestionMap() {
    questionMapEl.innerHTML = '';
    questions.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.id = `map-btn-${i}`;
        btn.textContent = i + 1;
        btn.className = 'w-8 h-8 rounded text-sm font-semibold transition-colors duration-150';
        btn.addEventListener('click', () => {
            if (isTransitioning) return;
            isTransitioning = true;
            currentQuestionIndex = i;
            loadQuestion();
        });
        questionMapEl.appendChild(btn);
    });
    updateQuestionMap();
}

function updateQuestionMap() {
    questions.forEach((_, i) => {
        const btn = document.getElementById(`map-btn-${i}`);
        if (!btn) return;
        const answered = userAnswers[i] !== null && userAnswers[i] !== undefined;
        const isCurrent = i === currentQuestionIndex;

        btn.className = 'w-8 h-8 rounded text-sm font-semibold transition-colors duration-150 ' + (
            isCurrent  ? 'bg-blue-600 text-white ring-2 ring-blue-300' :
            answered   ? 'bg-green-500 text-white hover:bg-green-600' :
                         'bg-gray-300 text-gray-700 hover:bg-gray-400'
        );
    });
}

function loadQuestion() {
    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) {
        console.error("Índice de questão inválido");
        return;
    }

    const question = questions[currentQuestionIndex];
    questionTextEl.textContent = question.question || "Questão sem texto";
    optionsListEl.innerHTML = '';

    try {
        const options = typeof question.options === 'string' ?
            JSON.parse(question.options) :
            question.options;
        const isMultiple = question.answer.includes(", ");

        const liItems = [];

        options.forEach((option, index) => {
            const li = document.createElement('li');
            li.className = 'mb-2 flex items-center p-3 rounded-lg border border-transparent cursor-pointer transition-colors duration-150 hover:bg-gray-50';

            const input = document.createElement('input');
            input.type = isMultiple ? 'checkbox' : 'radio';
            input.name = `question-${currentQuestionIndex}`;
            input.id = `option-${currentQuestionIndex}-${index}`;
            input.value = option;
            input.className = 'mr-3 shrink-0';

            const isChecked = isMultiple
                ? Array.isArray(userAnswers[currentQuestionIndex]) && userAnswers[currentQuestionIndex].includes(option)
                : userAnswers[currentQuestionIndex] === option;

            if (isChecked) {
                input.checked = true;
                li.classList.add('bg-blue-50', 'border-blue-400');
            }

            const label = document.createElement('label');
            label.htmlFor = input.id;
            label.textContent = option;
            label.className = 'cursor-pointer select-none w-full';

            li.appendChild(input);
            li.appendChild(label);
            optionsListEl.appendChild(li);
            liItems.push({ li, input });

            li.addEventListener('click', (e) => {
                if (e.target === input) return;
                input.checked = isMultiple ? !input.checked : true;
                input.dispatchEvent(new Event('change'));
            });

            input.addEventListener('change', () => {
                if (!isMultiple) {
                    liItems.forEach(({ li: otherLi, input: otherInput }) => {
                        otherLi.classList.toggle('bg-blue-50', otherInput.checked);
                        otherLi.classList.toggle('border-blue-400', otherInput.checked);
                    });
                } else {
                    li.classList.toggle('bg-blue-50', input.checked);
                    li.classList.toggle('border-blue-400', input.checked);
                }
                updateUserAnswer();
                updateQuestionMap();
                updateProgressBar();
            });
        });
    } catch (error) {
        console.error("Erro ao carregar opções:", error);
        optionsListEl.innerHTML = '<li class="text-red-500">Erro ao carregar as opções</li>';
    }

    updateUI();
    updateQuestionMap();
    updateProgressBar();
    isTransitioning = false;
}

function updateUI() {
    if (!questions || questions.length === 0) {
        questionCounterEl.textContent = "0/0";
        questionTextEl.textContent = "Nenhuma questão disponível";
        return;
    }

    questionCounterEl.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
    prevButtonEl.disabled = currentQuestionIndex === 0;
    nextButtonEl.textContent = currentQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Próxima Questão';
}

function updateUserAnswer() {
    const question = questions[currentQuestionIndex];
    const isMultiple = question.answer.includes(", ");

    if (isMultiple) {
        const checkedOptions = Array.from(document.querySelectorAll(`input[name="question-${currentQuestionIndex}"]:checked`))
            .map(input => input.value);
        userAnswers[currentQuestionIndex] = checkedOptions.length > 0 ? checkedOptions : null;
    } else {
        const selectedOption = document.querySelector(`input[name="question-${currentQuestionIndex}"]:checked`);
        userAnswers[currentQuestionIndex] = selectedOption ? selectedOption.value : null;
    }
}

function nextQuestion() {
    if (isTransitioning) return;
    isTransitioning = true;

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        loadQuestion();
    } else {
        isTransitioning = false;
        finishSimulado();
    }
}

function prevQuestion() {
    if (isTransitioning || currentQuestionIndex <= 0) return;
    isTransitioning = true;

    currentQuestionIndex--;
    loadQuestion();
}

function finishSimulado() {
    const unanswered = userAnswers.filter(a => a === null).length;
    const msg = unanswered > 0
        ? `Você tem ${unanswered} questão(ões) sem resposta. Deseja finalizar mesmo assim?`
        : 'Deseja finalizar o simulado?';
    if (confirm(msg)) {
        clearInterval(timer);

        nextButtonEl.disabled = true;
        nextButtonEl.textContent = 'Calculando resultados...';
        nextButtonEl.classList.replace('bg-blue-600', 'bg-gray-400');
        prevButtonEl.disabled = true;

        fetch('/eresult', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questions: questions,
                userAnswers: userAnswers.map(answer => answer === null ? "Não respondida" : answer)
            })
        })
        .then(response => response.json())
        .then(() => { window.location.href = "/eresult"; })
        .catch(error => {
            console.error('Erro ao enviar respostas:', error);
            nextButtonEl.disabled = false;
            nextButtonEl.textContent = 'Finalizar';
            nextButtonEl.classList.replace('bg-gray-400', 'bg-blue-600');
            prevButtonEl.disabled = false;
        });
    }
}

function startTimer() {
    if (isTimerRunning) return;

    isTimerRunning = true;
    startBtnEl.disabled = true;
    pauseBtnEl.disabled = false;

    timer = setInterval(updateTimer, 1000);
}

function pauseTimer() {
    if (!isTimerRunning || isTimerPaused) return;

    isTimerPaused = true;
    pauseBtnEl.disabled = true;
    resumeBtnEl.disabled = false;
}

function resumeTimer() {
    if (!isTimerRunning || !isTimerPaused) return;

    isTimerPaused = false;
    pauseBtnEl.disabled = false;
    resumeBtnEl.disabled = true;
}

function updateTimer() {
    if (isTimerPaused) return;

    if (timeRemaining <= 0) {
        clearInterval(timer);
        alert("O tempo acabou!");
        finishSimulado();
        return;
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const timerEl = document.getElementById("timer");
    timerEl.textContent = `Tempo restante: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if (timeRemaining <= 60) {
        timerEl.className = 'text-xl font-bold text-red-700 animate-pulse';
    } else if (timeRemaining <= 300) {
        timerEl.className = 'text-xl font-bold text-red-600';
    } else {
        timerEl.className = 'text-xl font-semibold text-gray-700';
    }

    timeRemaining--;
}

document.addEventListener('DOMContentLoaded', () => {
    if (!questions || questions.length === 0) {
        console.error("Nenhuma questão foi carregada");
        questionTextEl.textContent = "Nenhuma questão disponível";
        return;
    }

    buildQuestionMap();
    updateProgressBar();
    loadQuestion();

    nextButtonEl.addEventListener('click', nextQuestion);
    prevButtonEl.addEventListener('click', prevQuestion);

    startBtnEl.addEventListener('click', startTimer);
    pauseBtnEl.addEventListener('click', pauseTimer);
    resumeBtnEl.addEventListener('click', resumeTimer);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') nextQuestion();
        if (e.key === 'ArrowLeft') prevQuestion();
    });
});
