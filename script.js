document.addEventListener('DOMContentLoaded', () => {
    const youtubeLinkInput = document.getElementById('youtubeLinkInput');
    const loadVideoButton = document.getElementById('loadVideoButton');
    const youtubeVideo = document.getElementById('youtubeVideo');
    const videoPlaceholder = document.getElementById('videoPlaceholder');

    const showFlashcardsBtn = document.getElementById('showFlashcardsBtn');
    const showFlashcardMakerBtn = document.getElementById('showFlashcardMakerBtn');
    const showTranscriptToolBtn = document.getElementById('showTranscriptToolBtn');
    const flashcardMakerSection = document.getElementById('flashcardMakerSection');
    const flashcardsDisplaySection = document.getElementById('flashcardsDisplaySection');
    const transcriptToolSection = document.getElementById('transcriptToolSection');
    const transcriptIframe = document.getElementById('transcriptIframe');
    const iframeWarning = document.getElementById('iframeWarning');

    const startTimeInput = document.getElementById('startTimeInput');
    const endTimeInput = document.getElementById('endTimeInput');

    const questionInput = document.getElementById('questionInput');
    const questionTypeRadios = document.querySelectorAll('input[name="questionType"]');
    const optionsContainer = document.getElementById('optionsContainer');

    const saveFlashcardButton = document.getElementById('saveFlashcardButton');
    const clearFlashcardMakerFormBtn = document.getElementById('clearFlashcardMakerFormBtn');

    const scoreDisplay = document.getElementById('scoreDisplay');
    const streakDisplay = document.getElementById('streakDisplay');
    const currentQuestion = document.getElementById('currentQuestion');
    const currentOptions = document.getElementById('currentOptions');
    const checkAnswerButton = document.getElementById('checkAnswerButton');
    const nextFlashcardButton = document.getElementById('nextFlashcardButton');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const confettiContainer = document.getElementById('confettiContainer');

    let flashcards = [];
    let currentFlashcardIndex = 0;
    let correctAnswersCount = 0;
    let totalQuestions = 0;
    let currentStreak = 0;
    let selectedAnswers = [];

    let optionCounter = 0;

    // --- Utility Functions ---

    /**
     * Formats a given number of seconds into a MM:SS string.
     * @param {number} seconds - The total number of seconds.
     * @returns {string} The formatted time string (e.g., "01:30").
     */
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    /**
     * Parses a time string (MM:SS or SS) into total seconds.
     * @param {string} timeString - The time string to parse.
     * @returns {number} The total number of seconds, or NaN if invalid.
     */
    function parseTimeToSeconds(timeString) {
        const parts = timeString.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0], 10);
            const seconds = parseInt(parts[1], 10);
            if (!isNaN(minutes) && !isNaN(seconds) && minutes >= 0 && seconds >= 0 && seconds < 60) {
                return (minutes * 60) + seconds;
            }
        } else if (parts.length === 1) {
            const seconds = parseInt(parts[0], 10);
            if (!isNaN(seconds) && seconds >= 0) {
                return seconds;
            }
        }
        return NaN;
    }

    /**
     * Extracts the YouTube video ID from a given URL.
     * @param {string} url - The YouTube video URL.
     * @returns {string|null} The video ID or null if not found.
     */
    function getYouTubeVideoId(url) {
        let videoId = '';
        try {
            const urlObj = new URL(url);
            const urlParams = new URLSearchParams(urlObj.search);
            videoId = urlParams.get('v');

            if (!videoId) {
                const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
                if (match && match[1]) {
                    videoId = match[1];
                }
            }
        } catch (e) {
            console.error("Invalid URL:", e);
            return null;
        }
        return videoId;
    }

    /**
     * Displays a custom modal with a given title and message.
     * @param {string} title - The title of the modal.
     * @param {string} message - The message content of the modal.
     */
    function showModal(title, message) {
        const modal = document.getElementById('customModal');
        modal.querySelector('#modalTitle').textContent = title;
        modal.querySelector('#modalMessage').textContent = message;
        modal.classList.remove('hidden');
    }
    document.getElementById('modalCloseButton').addEventListener('click', () => {
        document.getElementById('customModal').classList.add('hidden');
    });
    document.getElementById('customModal').addEventListener('click', (e) => {
        if (e.target.id === 'customModal') {
            document.getElementById('customModal').classList.add('hidden');
        }
    });

    // --- Dynamic Option Management (for Flashcard Maker) ---

    /**
     * Adds a new option input field (text + radio/checkbox) to the Flashcard Maker.
     * @param {string} initialValue - The initial text value for the input.
     * @param {boolean} isChecked - Whether the corresponding radio/checkbox should be checked.
     * @param {string|null} optionChar - The character for the option (e.g., 'A', 'B'). If null, it's auto-generated.
     * @returns {HTMLElement} The newly created input field.
     */
    function addOptionInput(initialValue = '', isChecked = false, optionChar = null) {
        const currentType = document.querySelector('input[name="questionType"]:checked').value;
        if (optionChar === null) {
            optionChar = String.fromCharCode(65 + optionCounter);
            optionCounter++;
        }

        const optionDiv = document.createElement('div');
        optionDiv.className = 'flex items-center space-x-2';
        optionDiv.dataset.optionChar = optionChar;

        let inputHtml = '';
        if (currentType === 'multiple-choice') {
            inputHtml = `<input type="radio" id="maker_option_${optionChar}_radio" name="makerCorrectOption" value="${optionChar}" class="form-radio text-blue-600" ${isChecked ? 'checked' : ''}>`;
        } else { // check-all-that-apply
            inputHtml = `<input type="checkbox" id="maker_option_${optionChar}_checkbox" name="makerCorrectOption" value="${optionChar}" class="form-checkbox text-blue-600 rounded" ${isChecked ? 'checked' : ''}>`;
        }

        optionDiv.innerHTML = `
            ${inputHtml}
            <label for="maker_option_${optionChar}_${currentType === 'multiple-choice' ? 'radio' : 'checkbox'}" class="text-gray-700">${optionChar})</label>
            <input type="text" id="maker_option_${optionChar}_input" placeholder="Option ${optionChar}" class="flex-grow p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-gray-700" value="${initialValue}">
            <button type="button" class="remove-option-btn px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm">X</button>
        `;
        optionsContainer.appendChild(optionDiv);

        const inputField = optionDiv.querySelector(`input[type="text"]`);
        inputField.addEventListener('input', handleOptionInput);

        const removeButton = optionDiv.querySelector('.remove-option-btn');
        removeButton.addEventListener('click', () => {
            optionDiv.remove();
        });
        return inputField;
    }

    /**
     * Handles input events on option text fields to dynamically add new options.
     * @param {Event} event - The input event.
     */
    function handleOptionInput(event) {
        const inputField = event.target;
        const allOptionInputs = optionsContainer.querySelectorAll('input[type="text"]');
        const lastInputField = allOptionInputs[allOptionInputs.length - 1];

        if (inputField === lastInputField && inputField.value.trim() !== '') {
            addOptionInput();
        }
    }

    /**
     * Clears all dynamic option input fields and adds the initial two empty ones.
     */
    function clearDynamicOptions() {
        optionsContainer.innerHTML = '';
        optionCounter = 0;
        addOptionInput();
        addOptionInput();
    }

    // --- Event Listeners ---

    // Event listener for loading the YouTube video.
    loadVideoButton.addEventListener('click', () => {
        const url = youtubeLinkInput.value.trim();
        if (url) {
            const videoId = getYouTubeVideoId(url);
            if (videoId) {
                youtubeVideo.src = `https://www.youtube.com/embed/${videoId}`;
                videoPlaceholder.classList.add('hidden');
                youtubeVideo.classList.remove('hidden');
            } else {
                showModal('Error', 'Please enter a valid YouTube video URL.');
            }
        } else {
            showModal('Error', 'Please enter a YouTube video URL.');
        }
    });

    /**
     * Sets the active section and highlights the corresponding button.
     * @param {string} activeButtonId - The ID of the button to activate.
     */
    function setActiveButton(activeButtonId) {
        const sectionMap = {
            'showFlashcardsBtn': flashcardsDisplaySection,
            'showFlashcardMakerBtn': flashcardMakerSection,
            'showTranscriptToolBtn': transcriptToolSection
        };

        // Hide all sections
        Object.values(sectionMap).forEach(section => {
            section.classList.add('hidden');
        });

        // Show the active section
        if (sectionMap[activeButtonId]) {
            sectionMap[activeButtonId].classList.remove('hidden');
        }

        // Update button styles
        const allButtons = [showFlashcardsBtn, showFlashcardMakerBtn, showTranscriptToolBtn];
        allButtons.forEach(btn => {
            if (btn.id === activeButtonId) {
                btn.classList.remove('bg-gray-300', 'text-gray-800');
                btn.classList.add('bg-blue-600', 'text-white');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-gray-300', 'text-gray-800');
            }
        });
    }

    // Event listener for "Flashcards" button.
    showFlashcardsBtn.addEventListener('click', () => {
        setActiveButton('showFlashcardsBtn');
        if (flashcards.length > 0) {
            displayFlashcard(currentFlashcardIndex);
        } else {
            currentQuestion.textContent = "No flashcards created yet. Go to 'Flashcard Maker' to create some!";
            currentOptions.innerHTML = '';
            checkAnswerButton.classList.add('hidden');
            nextFlashcardButton.classList.add('hidden');
            feedbackMessage.textContent = '';
        }
    });

    // Event listener for "Flashcard Maker" button.
    showFlashcardMakerBtn.addEventListener('click', () => {
        setActiveButton('showFlashcardMakerBtn');
        // Inputs are no longer cleared automatically to preserve content.
    });

    // Event listener for "Transcript Tool" button.
    showTranscriptToolBtn.addEventListener('click', () => {
        setActiveButton('showTranscriptToolBtn');
        // The iframe warning is always visible when this section is active,
        // as direct cross-origin access detection is not possible.
        iframeWarning.style.display = 'block';
    });

    // Event listeners for question type radio buttons to clear/reset dynamic options.
    questionTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            clearDynamicOptions();
        });
    });

    // Event listener for "Save Flashcard" button.
    saveFlashcardButton.addEventListener('click', () => {
        const question = questionInput.value.trim();
        const currentQuestionType = document.querySelector('input[name="questionType"]:checked').value;

        const startTime = parseTimeToSeconds(startTimeInput.value.trim());
        const endTime = parseTimeToSeconds(endTimeInput.value.trim());

        let options = {};
        let correctAnswers = [];

        const allOptionDivs = optionsContainer.querySelectorAll('[data-option-char]');
        let filledOptionCount = 0;

        allOptionDivs.forEach(optionDiv => {
            const optionChar = optionDiv.dataset.optionChar;
            const optionTextInput = optionDiv.querySelector('input[type="text"]');
            const optionValue = optionTextInput.value.trim();

            if (optionValue !== '') {
                options[optionChar] = optionValue;
                filledOptionCount++;

                const correctInput = optionDiv.querySelector('input[name="makerCorrectOption"]');
                if (correctInput && correctInput.checked) {
                    correctAnswers.push(optionChar);
                }
            }
        });

        // Validation checks
        const hasEnoughOptions = filledOptionCount >= 2;
        const hasCorrectAnswer = correctAnswers.length > 0;
        const allRequiredFieldsFilled = question && !isNaN(startTime) && !isNaN(endTime) && endTime > startTime && startTime >= 0;

        if (allRequiredFieldsFilled && hasEnoughOptions && hasCorrectAnswer) {
            const newFlashcard = {
                id: Date.now(), // Simple unique ID
                type: currentQuestionType,
                startTime: startTime,
                endTime: endTime,
                question: question,
                options: options, // This will only contain filled options
                correctAnswers: correctAnswers
            };
            flashcards.push(newFlashcard);
            clearFlashcardMakerInputs(); // Clear form after successful save
            showModal('Success', 'Flashcard saved!');
            // If currently viewing flashcards, update the display to reflect new card
            if (!flashcardsDisplaySection.classList.contains('hidden')) {
                displayFlashcard(currentFlashcardIndex);
            }
        } else {
            let errorMessage = 'Please fill in all required fields: question, valid start/end times (e.g., "30" or "1:30"; end time must be after start time and start time must be non-negative).';
            if (!hasEnoughOptions) {
                errorMessage += ' Please provide at least two answer options.';
            }
            if (!hasCorrectAnswer) {
                errorMessage += ' Please select at least one correct answer.';
            }
            showModal('Warning', errorMessage);
        }
    });

    // Event listener for "Clear Form" button in Flashcard Maker.
    clearFlashcardMakerFormBtn.addEventListener('click', () => {
        clearFlashcardMakerInputs();
        showModal('Form Cleared', 'Flashcard maker form has been cleared.');
    });

    // Event listener for "Check Answer" button in Flashcards display.
    checkAnswerButton.addEventListener('click', () => {
        const currentCard = flashcards[currentFlashcardIndex];
        totalQuestions++;
        let isCorrect = false;

        if (currentCard.type === 'multiple-choice') {
            // For multiple-choice, only one answer should be selected and it must be the correct one.
            if (selectedAnswers.length === 1 && selectedAnswers[0] === currentCard.correctAnswers[0]) {
                isCorrect = true;
            }
        } else { // check-all-that-apply
            // For check-all-that-apply, both selected and correct arrays must be identical after sorting.
            const sortedSelected = [...selectedAnswers].sort();
            const sortedCorrect = [...currentCard.correctAnswers].sort();
            if (sortedSelected.length === sortedCorrect.length &&
                sortedSelected.every((val, index) => val === sortedCorrect[index])) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            correctAnswersCount++;
            currentStreak++;
            feedbackMessage.textContent = 'Correct! 🎉';
            feedbackMessage.className = 'text-center mt-3 text-lg font-medium text-green-700';
            triggerConfetti();
        } else {
            currentStreak = 0;
            let correctDisplay = '';
            if (currentCard.type === 'multiple-choice') {
                correctDisplay = `The correct answer was: ${currentCard.correctAnswers[0]}.`;
            } else {
                correctDisplay = `The correct answer(s) was/were: ${currentCard.correctAnswers.join(', ')}.`;
            }
            feedbackMessage.textContent = `Incorrect. ${correctDisplay}`;
            feedbackMessage.className = 'text-center mt-3 text-lg font-medium text-red-700';
        }
        updateScoreDisplay();
        // Disable options and check button after answering to prevent re-submission
        Array.from(currentOptions.querySelectorAll('input[type="radio"], input[type="checkbox"]')).forEach(input => input.disabled = true);
        checkAnswerButton.disabled = true;
    });

    // Event listener for "Next Flashcard" button.
    nextFlashcardButton.addEventListener('click', () => {
        currentFlashcardIndex = (currentFlashcardIndex + 1) % flashcards.length;
        displayFlashcard(currentFlashcardIndex);
        feedbackMessage.textContent = ''; // Clear feedback message
        selectedAnswers = []; // Reset selected answers for the new card
        // Re-enable options and uncheck all for the new question
        Array.from(currentOptions.querySelectorAll('input[type="radio"], input[type="checkbox"]')).forEach(input => {
            input.disabled = false;
            input.checked = false;
        });
        checkAnswerButton.disabled = false;
    });

    // --- Flashcard Display Logic ---

    /**
     * Displays the flashcard at the given index in the Flashcards section.
     * @param {number} index - The index of the flashcard to display.
     */
    function displayFlashcard(index) {
        if (flashcards.length === 0) {
            currentQuestion.textContent = "No flashcards created yet. Go to 'Flashcard Maker' to create some!";
            currentOptions.innerHTML = '';
            checkAnswerButton.classList.add('hidden');
            nextFlashcardButton.classList.add('hidden');
            return;
        }

        const card = flashcards[index];
        currentQuestion.textContent = `(${formatTime(card.startTime)} - ${formatTime(card.endTime)}) ${card.question}`;
        currentOptions.innerHTML = ''; // Clear previous options
        checkAnswerButton.classList.remove('hidden');
        nextFlashcardButton.classList.remove('hidden');

        selectedAnswers = []; // Reset selected answers for new card display

        const optionChars = Object.keys(card.options).sort(); // Sort keys to ensure consistent option order
        optionChars.forEach(key => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'flex items-center space-x-2';
            const inputId = `flashcard_option_${key}`;

            if (card.type === 'multiple-choice') {
                optionDiv.innerHTML = `
                    <input type="radio" id="${inputId}" name="flashcardOption" value="${key}" class="form-radio text-blue-600">
                    <label for="${inputId}" class="text-gray-700">${key}) ${card.options[key]}</label>
                `;
                optionDiv.querySelector(`#${inputId}`).addEventListener('change', (e) => {
                    selectedAnswers = [e.target.value]; // For radio, only one selection
                });
            } else { // check-all-that-apply
                optionDiv.innerHTML = `
                    <input type="checkbox" id="${inputId}" name="flashcardOption" value="${key}" class="form-checkbox text-blue-600 rounded">
                    <label for="${inputId}" class="text-gray-700">${key}) ${card.options[key]}</label>
                `;
                optionDiv.querySelector(`#${inputId}`).addEventListener('change', (e) => {
                    if (e.target.checked) {
                        selectedAnswers.push(e.target.value);
                    } else {
                        selectedAnswers = selectedAnswers.filter(ans => ans !== e.target.value);
                    }
                });
            }
            currentOptions.appendChild(optionDiv);
        });
    }

    /**
     * Updates the score and streak displays.
     */
    function updateScoreDisplay() {
        scoreDisplay.textContent = `Score: ${correctAnswersCount}/${totalQuestions}`;
        streakDisplay.textContent = `Streak: ${currentStreak}`;
    }

    // --- Confetti Animation ---
    /**
     * Triggers a confetti animation on the screen.
     */
    function triggerConfetti() {
        confettiContainer.classList.remove('hidden');
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39', '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#795548', '#9E9E9E', '#607D8B'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.top = `${Math.random() * 100}vh`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg) scale(${0.5 + Math.random() * 0.5})`;
            confetti.style.animationDelay = `${Math.random() * 0.5}s`;
            confetti.style.animationDuration = `${1.5 + Math.random() * 1}s`;
            confettiContainer.appendChild(confetti);

            confetti.addEventListener('animationend', () => {
                confetti.remove();
                if (confettiContainer.children.length === 0) {
                    confettiContainer.classList.add('hidden');
                }
            });
        }
    }

    // --- Initialization ---

    /**
     * Clears all input fields in the Flashcard Maker form and resets dynamic options.
     */
    function clearFlashcardMakerInputs() {
        startTimeInput.value = '';
        endTimeInput.value = '';
        questionInput.value = '';
        document.getElementById('type_multiple_choice').checked = true; // Reset to default type
        clearDynamicOptions(); // Clear and re-add initial dynamic options
    }

    // Initial state setup when the DOM is fully loaded.
    flashcardsDisplaySection.classList.add('hidden'); // Hide Flashcards display
    flashcardMakerSection.classList.remove('hidden'); // Show Flashcard Maker by default
    transcriptToolSection.classList.add('hidden'); // Hide Transcript Tool

    // Set initial active button styling
    showFlashcardMakerBtn.classList.remove('bg-gray-300', 'text-gray-800');
    showFlashcardMakerBtn.classList.add('bg-blue-600', 'text-white');
    showFlashcardsBtn.classList.remove('bg-blue-600', 'text-white');
    showFlashcardsBtn.classList.add('bg-gray-300', 'text-gray-800');
    showTranscriptToolBtn.classList.remove('bg-blue-600', 'text-white');
    showTranscriptToolBtn.classList.add('bg-gray-300', 'text-gray-800');

    // Initially hide the YouTube iframe and show its placeholder
    youtubeVideo.classList.add('hidden');
    videoPlaceholder.classList.remove('hidden');

    updateScoreDisplay(); // Initialize score display (0/0, Streak: 0)
    // Display initial message for flashcards section (e.g., "No flashcards created yet...")
    displayFlashcard(currentFlashcardIndex);

    // Add initial empty option fields for the Flashcard Maker
    addOptionInput();
    addOptionInput();
});
