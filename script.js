document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const elements = {
    views: {
      categories: document.getElementById("categories-view"),
      quiz: document.getElementById("quiz-view"),
      score: document.getElementById("score-view"),
    },
    buttons: {
      back: document.getElementById("back-btn"),
      next: document.getElementById("next-btn"),
      retry: document.getElementById("retry-btn"),
    },
    quiz: {
      container: document.getElementById("question-container"),
      question: document.getElementById("question"),
      answerButtons: document.getElementById("answer-buttons"),
      loader: document.getElementById("loader"),
      progress: {
        bar: document.getElementById("progress"),
        container: document.getElementById("progress-container"),
        current: document.getElementById("current-question"),
        total: document.getElementById("total-questions"),
      },
    },
    score: {
      final: document.getElementById("score"),
      category: document.getElementById("score-category"),
    },
    categoriesGrid: document.getElementById("categories-grid"),
  };

  // Game State
  const state = {
    currentQuestionIndex: 0,
    score: 0,
    questions: [],
    currentCategory: null,
  };

  // Category Icons Mapping
  const categoryIcons = {
    9: "public", // General Knowledge
    10: "menu_book", // Books
    11: "movies", // Film
    12: "music_note", // Music
    13: "theater_comedy", // Musicals & Theatres
    14: "tv", // Television
    15: "videogame_asset", // Video Games
    16: "casino", // Board Games
    17: "science", // Science & Nature
    18: "computer", // Computers
    19: "calculate", // Mathematics
    20: "auto_stories", // Mythology
    21: "sports_soccer", // Sports
    22: "terrain", // Geography
    23: "history", // History
    24: "policy", // Politics
    25: "palette", // Art
    26: "people", // Celebrities
    27: "pets", // Animals
    28: "directions_car", // Vehicles
    29: "book", // Comics
    30: "devices", // Science: Gadgets
    31: "emoji_events", // Japanese Anime & Manga
    32: "animation", // Cartoon & Animations
  };

  // Event Listeners
  function initializeEventListeners() {
    elements.buttons.back.addEventListener("click", showCategories);
    elements.buttons.next.addEventListener("click", () => {
      state.currentQuestionIndex++;
      setNextQuestion();
    });
    elements.buttons.retry.addEventListener("click", () => {
      state.currentCategory
        ? startQuiz(state.currentCategory)
        : showCategories();
    });
  }

  // API Functions
  async function fetchCategories() {
    try {
      showLoader();
      const response = await fetch("https://opentdb.com/api_category.php");
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      createCategoryCards(data.trivia_categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      // Could add user-facing error message here
    } finally {
      hideLoader();
    }
  }

  async function startQuiz(category) {
    try {
      state.currentCategory = category;
      showLoader();
      showQuizView();

      const apiUrl = `https://opentdb.com/api.php?amount=10&category=${category.id}&type=multiple`;
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error("Failed to fetch questions");
      const data = await response.json();

      state.questions = data.results.map(formatQuestion);
      state.currentQuestionIndex = 0;
      state.score = 0;

      elements.quiz.container.classList.remove("hide");
      elements.quiz.progress.container.classList.remove("hide");
      elements.quiz.progress.total.textContent = state.questions.length;
      updateProgress();
      setNextQuestion();
    } catch (error) {
      console.error("Error starting quiz:", error);
      // Could add user-facing error message here
    } finally {
      hideLoader();
    }
  }

  // UI Functions
  function createCategoryCards(categories) {
    // Add edit mode toggle button
    if (!document.getElementById("edit-toggle")) {
      const toggleBtn = document.createElement("button");
      toggleBtn.id = "edit-toggle";
      toggleBtn.className = "btn edit-toggle";
      toggleBtn.innerHTML = `
            <span class="material-icons">edit</span>
            <span>Arrange Categories</span>
        `;
      toggleBtn.addEventListener("click", toggleEditMode);
      elements.views.categories.insertBefore(
        toggleBtn,
        elements.categoriesGrid
      );
    }

    elements.categoriesGrid.innerHTML = "";

    const savedOrder = JSON.parse(localStorage.getItem("categoryOrder")) || [];
    const orderedCategories = [...categories].sort((a, b) => {
      const indexA = savedOrder.indexOf(a.id);
      const indexB = savedOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    orderedCategories.forEach((category) => {
      const card = document.createElement("div");
      card.className = "category-card";
      card.dataset.categoryId = category.id;

      card.innerHTML = `
            <span class="material-icons">${
              categoryIcons[category.id] || "quiz"
            }</span>
            <h3>${category.name}</h3>
            <span class="drag-handle material-icons">drag_indicator</span>
        `;

      card.addEventListener("click", (e) => {
        if (!document.body.classList.contains("edit-mode")) {
          startQuiz(category);
        }
      });

      elements.categoriesGrid.appendChild(card);
    });
  }

  function toggleEditMode() {
    const isEditMode = document.body.classList.toggle("edit-mode");
    const toggleBtn = document.getElementById("edit-toggle");
    const cards = document.querySelectorAll(".category-card");

    if (isEditMode) {
      toggleBtn.innerHTML = `
            <span class="material-icons">check</span>
            <span>Done</span>
        `;
      cards.forEach((card) => {
        card.draggable = true;
        card.addEventListener("dragstart", handleDragStart);
        card.addEventListener("dragover", handleDragOver);
        card.addEventListener("drop", handleDrop);
      });
    } else {
      toggleBtn.innerHTML = `
            <span class="material-icons">edit</span>
            <span>Arrange Categories</span>
        `;
      cards.forEach((card) => {
        card.draggable = false;
        card.removeEventListener("dragstart", handleDragStart);
        card.removeEventListener("dragover", handleDragOver);
        card.removeEventListener("drop", handleDrop);
      });
    }
  }

  function handleDragStart(e) {
    e.target.classList.add("dragging");
    e.dataTransfer.setData("text/plain", e.target.dataset.categoryId);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    const draggedElement = document.querySelector(
      `[data-category-id="${draggedId}"]`
    );
    const dropZone = e.target.closest(".category-card");

    if (draggedElement && dropZone && draggedElement !== dropZone) {
      // Reorder DOM elements
      const allCards = [...elements.categoriesGrid.children];
      const draggedIndex = allCards.indexOf(draggedElement);
      const dropIndex = allCards.indexOf(dropZone);

      if (draggedIndex < dropIndex) {
        dropZone.parentNode.insertBefore(draggedElement, dropZone.nextSibling);
      } else {
        dropZone.parentNode.insertBefore(draggedElement, dropZone);
      }

      // Save new order to localStorage
      const newOrder = [...elements.categoriesGrid.children].map((card) =>
        parseInt(card.dataset.categoryId)
      );
      localStorage.setItem("categoryOrder", JSON.stringify(newOrder));
    }

    document.querySelector(".dragging")?.classList.remove("dragging");
  }

  function showQuestion(question) {
    elements.quiz.question.innerText = question.question;
    const letters = ["A", "B", "C", "D"];

    question.answers.forEach((answer, index) => {
      const button = document.createElement("button");
      button.innerText = answer;
      button.classList.add("btn");
      button.setAttribute("data-letter", letters[index]);
      button.addEventListener("click", selectAnswer);
      elements.quiz.answerButtons.appendChild(button);
    });
  }

  function selectAnswer(e) {
    const selectedButton = e.target;
    const correct =
      selectedButton.innerText ===
      state.questions[state.currentQuestionIndex].correctAnswer;

    if (correct) state.score++;

    setStatusClass(selectedButton, correct);
    Array.from(elements.quiz.answerButtons.children).forEach((button) => {
      button.disabled = true;
      if (
        button.innerText ===
        state.questions[state.currentQuestionIndex].correctAnswer
      ) {
        setStatusClass(button, true);
      }
    });

    if (state.currentQuestionIndex < state.questions.length - 1) {
      elements.buttons.next.classList.remove("hide");
    } else {
      setTimeout(showScoreView, 1000);
    }
  }

  function getFeedbackMessage(score) {
    if (score === 10)
      return {
        message: "Is your name Camilla? Because you're perfect! 🥰",
        icon: "emoji_events",
      };
    if (score >= 8)
      return {
        message: "Excellent Work! Nearly Perfect! 🌟",
        icon: "stars",
      };
    if (score >= 6)
      return {
        message: "Good Job! Above Average! 👍",
        icon: "thumb_up",
      };
    if (score >= 4)
      return {
        message: "Not Bad! Keep Practicing! 💪",
        icon: "fitness_center",
      };
    return {
      message: "Hey buddy, are you ok? 😅",
      icon: "sentiment_very_dissatisfied",
    };
  }

  // Utility Functions
  function formatQuestion(question) {
    return {
      question: decodeHTML(question.question),
      answers: [...question.incorrect_answers, question.correct_answer]
        .map((answer) => decodeHTML(answer))
        .sort(() => Math.random() - 0.5),
      correctAnswer: decodeHTML(question.correct_answer),
    };
  }

  function decodeHTML(html) {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  function setStatusClass(element, correct) {
    element.classList.add(correct ? "correct" : "wrong");
  }

  function resetState() {
    elements.buttons.next.classList.add("hide");
    while (elements.quiz.answerButtons.firstChild) {
      elements.quiz.answerButtons.removeChild(
        elements.quiz.answerButtons.firstChild
      );
    }
  }

  // View Management
  function showCategories() {
    elements.views.categories.classList.remove("hide");
    elements.views.quiz.classList.add("hide");
    elements.views.score.classList.add("hide");
    elements.buttons.back.classList.add("hide");
  }

  function showQuizView() {
    elements.views.categories.classList.add("hide");
    elements.views.quiz.classList.remove("hide");
    elements.views.score.classList.add("hide");
    elements.buttons.back.classList.remove("hide");

    // Update the quiz view title to show current category
    document.querySelector("#quiz-view h1").textContent =
      state.currentCategory.name;
  }

  function showScoreView() {
    elements.views.categories.classList.add("hide");
    elements.views.quiz.classList.add("hide");
    elements.views.score.classList.remove("hide");
    elements.buttons.back.classList.remove("hide");

    const feedback = getFeedbackMessage(state.score);

    elements.views.score.innerHTML = `
        <h2>${state.currentCategory.name}</h2>
        <div class="final-score-card">
            <div class="score-circle">
                <span id="score">${state.score}/10</span>
                <span class="score-text">points</span>
            </div>
            <div class="score-details">
                <div class="feedback">
                    <span class="material-icons">${feedback.icon}</span>
                    <p class="feedback-message">${feedback.message}</p>
                </div>
            </div>
            <div class="retry-button-container">
                <button id="retry-btn" class="btn">
                    <span class="material-icons">replay</span>
                    Try Again
                </button>
            </div>
        </div>
    `;

    document.getElementById("retry-btn").addEventListener("click", () => {
      startQuiz(state.currentCategory);
    });

    elements.views.score.classList.add("fade-in");
  }

  function setNextQuestion() {
    resetState();
    if (state.currentQuestionIndex < state.questions.length) {
      showQuestion(state.questions[state.currentQuestionIndex]);
      updateProgress();
    } else {
      showScoreView();
    }
  }

  function updateProgress() {
    const progress =
      ((state.currentQuestionIndex + 1) / state.questions.length) * 100;
    elements.quiz.progress.bar.style.width = `${progress}%`;
    elements.quiz.progress.current.textContent = state.currentQuestionIndex + 1;
  }

  function showLoader() {
    elements.quiz.loader.classList.remove("hide");
  }

  function hideLoader() {
    elements.quiz.loader.classList.add("hide");
  }

  // Initialize App
  initializeEventListeners();
  fetchCategories();
});
