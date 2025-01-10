let currentQuestionIndex = 0;
let score = 0;
let questions = [];

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-btn");
  const nextButton = document.getElementById("next-btn");
  const questionContainer = document.getElementById("question-container");
  const questionElement = document.getElementById("question");
  const answerButtonsElement = document.getElementById("answer-buttons");
  const scoreElement = document.getElementById("score");
  const scoreContainer = document.getElementById("score-container");
  const categorySelect = document.getElementById("category-select");

  startButton.addEventListener("click", startQuiz);
  nextButton.addEventListener("click", () => {
    currentQuestionIndex++;
    setNextQuestion();
  });

  async function fetchCategories() {
    try {
      const response = await fetch("https://opentdb.com/api_category.php");
      const data = await response.json();
      data.trivia_categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category.id;
        option.textContent = category.name;
        categorySelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  }

  async function startQuiz() {
    startButton.classList.add("hide");
    scoreContainer.classList.add("hide");

    let apiUrl = "https://opentdb.com/api.php?amount=10&type=multiple";
    const selectedCategory = categorySelect.value;
    if (selectedCategory) {
      apiUrl += `&category=${selectedCategory}`;
    }

    const response = await fetch(apiUrl);
    const data = await response.json();
    questions = data.results.map(formatQuestion);
    currentQuestionIndex = 0;
    score = 0;
    questionContainer.classList.remove("hide");
    setNextQuestion();
  }

  function formatQuestion(question) {
    return {
      question: decodeHTML(question.question),
      answers: [...question.incorrect_answers, question.correct_answer]
        .map((answer) => decodeHTML(answer))
        .sort(() => Math.random() - 0.5),
      correctAnswer: decodeHTML(question.correct_answer),
    };
  }

  function setNextQuestion() {
    resetState();
    if (currentQuestionIndex < questions.length) {
      showQuestion(questions[currentQuestionIndex]);
    } else {
      endQuiz();
    }
  }

  function showQuestion(question) {
    questionElement.innerText = question.question;
    question.answers.forEach((answer) => {
      const button = document.createElement("button");
      button.innerText = answer;
      button.classList.add("btn");
      button.addEventListener("click", selectAnswer);
      answerButtonsElement.appendChild(button);
    });
  }

  function resetState() {
    nextButton.classList.add("hide");
    while (answerButtonsElement.firstChild) {
      answerButtonsElement.removeChild(answerButtonsElement.firstChild);
    }
  }

  function selectAnswer(e) {
    const selectedButton = e.target;
    const correct =
      selectedButton.innerText ===
      questions[currentQuestionIndex].correctAnswer;

    if (correct) score++;

    setStatusClass(selectedButton, correct);
    Array.from(answerButtonsElement.children).forEach((button) => {
      button.disabled = true;
    });

    if (currentQuestionIndex < questions.length - 1) {
      nextButton.classList.remove("hide");
    } else {
      startButton.innerText = "Restart";
      startButton.classList.remove("hide");
    }
  }

  function setStatusClass(element, correct) {
    element.classList.add(correct ? "correct" : "wrong");
  }

  function endQuiz() {
    questionContainer.classList.add("hide");
    startButton.innerText = "Restart";
    startButton.classList.remove("hide");
    scoreContainer.classList.remove("hide");
    scoreElement.innerText = `${score} out of ${questions.length}`;
  }

  // Helper function to decode HTML entities
  function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  fetchCategories();
});
