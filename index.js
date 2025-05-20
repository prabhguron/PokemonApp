let gameActive = false;
let firstCard = undefined;
let secondCard = undefined;
let lockBoard = false;
let timeRemaining = 0;
let timerInterval;
let clickCount = 0;
let pairsMatched = 0;
let totalPairs = 0;
let pairsLeft = 0;
let powerUpsRemaining = 1;
let pokemonData = [];
//object to store easy medium hard


const gameDifficulties = {
    easy: { pairs: 4, timeLimit: 60 },
    medium: { pairs: 8, timeLimit: 90 },
    hard: { pairs: 12, timeLimit: 120 }
};

function setup() {
    $("#start-btn").on("click", startGame);
    $("#reset-btn").on("click", resetGame);
    $("#power-up-btn").on("click", activatePowerUp);
    $("#theme").on("change", changeTheme);
    
    changeTheme();
}

function changeTheme() {
    const theme = $("#theme").val();
    $("body").removeClass("theme-light theme-dark theme-pokemon")
             .addClass(`theme-${theme}`);
}

async function startGame() {
    try {
        $("#game-board").empty();
        
        firstCard = undefined;
        secondCard = undefined;
        lockBoard = false;
        clickCount = 0;
        pairsMatched = 0;
        powerUpsRemaining = 1;
        
        clearInterval(timerInterval);
        $("#game-message").addClass("hidden");
        $("#game-board").removeClass("power-up-active");
        
        $("#reset-btn").prop("disabled", false);
        $("#power-up-btn").prop("disabled", false);
        $("#power-up-btn").text(`Power-Up (${powerUpsRemaining})`);
        $("#start-btn").prop("disabled", true);
        
        gameActive = true;
        
        const difficulty = $("#difficulty").val();
        totalPairs = gameDifficulties[difficulty].pairs;
        pairsLeft = totalPairs;
        timeRemaining = gameDifficulties[difficulty].timeLimit;
        
        updateStatusDisplay();
        
        await fetchRandomPokemon(totalPairs);
        createCards();
        startTimer();
    } catch (error) {
        console.error("Error starting game:", error);
        showMessage("Error starting game. Please try again.");
    }
}

function resetGame() {
    $("#game-board").empty();
    
    firstCard = undefined;
    secondCard = undefined;
    lockBoard = false;
    clickCount = 0;
    pairsMatched = 0;
    pairsLeft = 0;
    
    clearInterval(timerInterval);
    
    gameActive = false;
    $("#start-btn").prop("disabled", false);
    $("#reset-btn").prop("disabled", true);
    $("#power-up-btn").prop("disabled", true);
    $("#game-message").addClass("hidden");
    
    updateStatusDisplay();
}
//call function
async function fetchRandomPokemon(pairsNeeded) {
    const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1000");
    const data = await response.json();
    
    const validPokemon = data.results.filter((pokemon, index) => index < 1025);
    const shuffled = [...validPokemon].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, pairsNeeded);
    
    pokemonData = [];
    for (const pokemon of selected) {
        const detailResponse = await fetch(pokemon.url);
        const detailData = await detailResponse.json();
        
        if (detailData.sprites.other["official-artwork"]?.front_default) {
            pokemonData.push({
                id: detailData.id,
                name: detailData.name,
                image: detailData.sprites.other["official-artwork"].front_default
            });
        }
    }
    
    if (pokemonData.length < pairsNeeded) {
        return fetchRandomPokemon(pairsNeeded);
    }
    
    pokemonData = pokemonData.slice(0, pairsNeeded);
}

function createCards() {
    const pairs = [...pokemonData, ...pokemonData];
    const shuffledPairs = [...pairs].sort(() => 0.5 - Math.random());
    
    shuffledPairs.forEach((pokemon) => {
        const card = `
            <div class="card" data-pokemon-id="${pokemon.id}">
                <div class="card-face front-face">
                    <img src="${pokemon.image}" alt="${pokemon.name}" />
                </div>
                <div class="card-face back-face"></div>
            </div>
        `;
        $("#game-board").append(card);
    });
    
    $(".card").on("click", flipCard);
    
    $("#total-pairs").text(totalPairs);
    $("#pairs-left").text(pairsLeft);
}

function flipCard() {
    if (lockBoard || $(this).hasClass("flip") || $(this).hasClass("matched")) {
        return;
    }
    
    $(this).addClass("flip");
    
    clickCount++;
    $("#clicks").text(clickCount);
    
    if (!firstCard) {
        firstCard = this;
        return;
    }
    
    secondCard = this;
    checkForMatch();
}

function checkForMatch() {
    lockBoard = true;
    
    const isMatch = $(firstCard).data("pokemon-id") === $(secondCard).data("pokemon-id");
    
    if (isMatch) {
        disableCards();
    } else {
        unflipCards();
    }
}

function disableCards() {
    $(firstCard).addClass("matched").off("click");
    $(secondCard).addClass("matched").off("click");
    
    pairsMatched++;
    pairsLeft--;
    updateStatusDisplay();
    
    if (pairsMatched === totalPairs) {
        endGame(true);
    }
    
    resetBoardState();
}

function unflipCards() {
    setTimeout(() => {
        $(firstCard).removeClass("flip");
        $(secondCard).removeClass("flip");
        resetBoardState();
    }, 1000);
}

function resetBoardState() {
    firstCard = undefined;
    secondCard = undefined;
    lockBoard = false;
}

function startTimer() {
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeRemaining--;
        updateTimerDisplay();
        
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            endGame(false);
        }
    }, 1000);
}
//uhhh it's some stackover flow code but it just updated timer
function updateTimerDisplay() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    $("#timer").text(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
}

function updateStatusDisplay() {
    $("#clicks").text(clickCount);
    $("#pairs-left").text(pairsLeft);
    $("#pairs-matched").text(pairsMatched);
    $("#total-pairs").text(totalPairs);
}
//winner destruction
function endGame(isWin) {
    clearInterval(timerInterval);
    gameActive = false;
    $("#power-up-btn").prop("disabled", true);
    $("#start-btn").prop("disabled", false);
    
    if (isWin) {
        showMessage(`Congratulations! You won!<br>You matched all pairs in ${clickCount} clicks.`);
    } else {
        showMessage("Game Over! Time's up!");
        $(".card:not(.matched)").addClass("flip");
    }
    
    $(".card").off("click").addClass("no-click");
}

function showMessage(message) {
    $("#game-message").html(message).removeClass("hidden");
    
    setTimeout(() => {
        if (!gameActive) {
            $("#game-message").addClass("hidden");
        }
    }, 5000);
}

function activatePowerUp() {
  if (powerUpsRemaining <= 0 || !gameActive) {
      return;
  }
   
  powerUpsRemaining--;
  $("#power-up-btn").text(`Power-Up (${powerUpsRemaining})`);
   
  // Disable the power-up button if no more power-ups are available
  if (powerUpsRemaining <= 0) {
      $("#power-up-btn").prop("disabled", true);
  }
   
  const lockBoardState = lockBoard;
  lockBoard = true;
   
  // Temporarily add flip class to all unmatched cards
  $(".card:not(.matched)").addClass("flip");
   
  // Set a timeout to flip them back after 1 second (changed from 2 seconds)
  setTimeout(() => {
      // Only flip back cards that aren't part of a found match
      $(".card:not(.matched)").removeClass("flip");
       
      // Restore the board state
      lockBoard = lockBoardState;
       
      // If cards were selected before using the power-up, reset them
      if (firstCard && !$(firstCard).hasClass("matched")) {
          firstCard = undefined;
      }
      if (secondCard && !$(secondCard).hasClass("matched")) {
          secondCard = undefined;
      }
  }, 1000); 
}

$(document).ready(setup)