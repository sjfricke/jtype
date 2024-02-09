// Current state of displayed values and where to mark correct
var gDisplay = {
    // was going to do a ring buffer, but running local all things should load fast enough
    currentCard : {},
    nextCard : {},

    dom : {
        kanji : {},
        kana : {},
        translation : {},
        input : {},
    },

    // For smart detect
    nextIsKatakana : false,
    nextIsN : false,
    // for showing furigana on screen
    correctKanaIndex : 0,
    kanjiStartIndex : [],

    tokens : {}, // detailed

    matched : false,
}

function resetGlobalDisplay() {
    gDisplay.correctKanaIndex = 0;
    gDisplay.kanjiStartIndex = [];
    gDisplay.tokens = {};
}

function setNextCorrect(input) {
    gDisplay.nextIsKatakana = wanakana.isKatakana(input);
    gDisplay.nextIsN = input == "ん" || input == "ン";
}

function playSound() {
    // If audio is playing, restart it, otherwise play it
    var audio = gDisplay.currentCard.audio;
    if (audio) {
        if (!audio.ended) {
            audio.load(); // pauses and resets it
        }
        audio.play();
    }
}

function setVisibility() {
    gDisplay.dom.kanji.style.visibility  = (inputSettings.listenMode) ? "hidden" : "visible";

    gDisplay.dom.kana.style.visibility  = (document.getElementById("kana").checked) ? "visible" : "hidden";
    gDisplay.dom.translation.style.visibility  = (document.getElementById("translation").checked) ? "visible" : "hidden";
}

function displayCard() {
    // make each char in kanji html capable to being highlighted
    var kanjiHtml = "";
    for (var i = 0; i < gDisplay.currentCard.kanji.length; i++) {
        kanjiHtml += "<span>" + gDisplay.currentCard.kanji[i] + "</span>"
    }
    furiganaHtml = "<br><span id=\"furigana\" style=\"color:";
    furiganaHtml += (inputSettings.darkMode) ? "lightblue" : "blue";
    furiganaHtml += "\"></span>";
    kanjiHtml += furiganaHtml

    // Reset values for display
    resetGlobalDisplay();

    // The mapping between the card furigana and wanakana tokenizer is to allow for manual
    // furigana labeling in the json schema
    gDisplay.tokens = wanakana.tokenize(gDisplay.currentCard.kanji, {detailed : true});

    // Get where each kanji start to be used to get exact HTML element for furigana
    var kanjiFound = 0;
    for (var i = 0; i < gDisplay.currentCard.kanji.length; i++) {
        // Assume numbers are always being listed as "kanji"
        if (wanakana.isKanji(gDisplay.currentCard.kanji[i]) || !isNaN(Number(gDisplay.currentCard.kanji[i]))) {
            gDisplay.kanjiStartIndex.push(i);
            i += (gDisplay.currentCard.kanjiLength[kanjiFound] - 1);
            kanjiFound++;
        }
    }

    gDisplay.dom.kanji.innerHTML = kanjiHtml;
    gDisplay.dom.kana.innerHTML = gDisplay.currentCard.kana;
    gDisplay.dom.translation.innerHTML = gDisplay.currentCard.translation;

    // display right away controlled by setting
    setVisibility();

    // need to set first letter for smart detect to start right away
    setNextCorrect(gDisplay.currentCard.kana[0]);

    if (inputSettings.playSound) {
        playSound();
    }
}

// Get the next card
function getNextCard() {
    if (gDisplay.nextCard == undefined) {
        alert("Out of cards, time to reload");
    }

    $.get("/cards/1", function(data) {
        // pause and delete old audio if there
        if (gDisplay.currentCard.audio) {
            gDisplay.currentCard.audio.pause();
            delete gDisplay.currentCard.audio;
        }

        gDisplay.currentCard = gDisplay.nextCard;
        if (data.length == 0) {
            console.log("Ran out of cards");
            gDisplay.nextCard = undefined;
        } else {
            gDisplay.nextCard = data[0];
            gDisplay.nextCard.audio = (gDisplay.nextCard.sound) ? new Audio("sound/" + gDisplay.nextCard.sound) : undefined;
        }

        clearInputDisplay();
        displayCard();
    })
}

// Check if result is correct
function compareInput() {
    var answer = gDisplay.currentCard.kana;
    var input = gDisplay.dom.input.innerText;
    if (input.length == 0) {
        // fall through for visibility
    } else if (input == answer) {
        // full match
        gDisplay.matched = true;
        if (inputSettings.listenMode) {
            // TODO - まった will not work... just make a function to set these
            // save trouble with getting this to fall through and just set the last character as correct
            gDisplay.dom.kanji.children[gDisplay.dom.kanji.children.length - 3].classList.add("correct");
            gDisplay.dom.kanji.children[gDisplay.dom.kanji.children.length - 3].classList.remove("wrong");
            // inject 'tab' key to display and have user hit 'enter'
            document.dispatchEvent(new KeyboardEvent('keydown',{'keyCode':9}));
        } else if (inputSettings.correctSound) {
            gDisplay.dom.translation.style.visibility = "visible";
            playSound();
        } else {
            getNextCard();
        }
    } else {
        // Highlight progress
        gDisplay.matched = false;

        // TODO - don't be lazy and only compare next one, doing this until better understand edge cases
        // also classList.toggle() is valid when looking to refactor
        var cCount = 0; // into Kanji
        var furigana = gDisplay.currentCard.furigana;
        var fIndex = 0;
        var foundIncorrect = false;

        for (i = 0; i < input.length; i++) {
            var furiganaStart = furigana[fIndex * 2];
            if (furiganaStart == i) {
                var furiganaLength = furigana[(fIndex * 2) + 1];
                var furiganaEnd = furigana[fIndex * 2] + furiganaLength;
                var inputSub = input.substring(furiganaStart, furiganaEnd);
                var answerSub = answer.substring(furiganaStart, furiganaEnd);
                if (inputSub == answerSub) {
                    cCount += gDisplay.currentCard.kanjiLength[fIndex];
                    fIndex++;
                    i += (furiganaLength - 1);
                } else {
                    foundIncorrect = true;
                    break;
                }
            } else if (answer[i] == input[i]) {
                cCount++;
            } else {
                foundIncorrect = true;
                break;
            }
        }

        // see how far into the kana is correct
        // can't use above loop or else kanji with ん will not get triggered (ex. 今夜)
        gDisplay.correctKanaIndex = 0;
        for (i = 0; i < answer.length; i++) {
            if (input[i] == answer[i]) {
                gDisplay.correctKanaIndex++;
            } else {
                break;
            }
        }
        setNextCorrect(answer[gDisplay.correctKanaIndex]);

        for (var i = 0; i < cCount; i++) {
            gDisplay.dom.kanji.children[i].classList.add("correct");
            gDisplay.dom.kanji.children[i].classList.remove("wrong");
        }
        for (var i = cCount; i < gDisplay.dom.kanji.children.length; i++) {
            gDisplay.dom.kanji.children[i].classList.remove("correct");
            gDisplay.dom.kanji.children[i].classList.remove("wrong");
        }
        // starting typing next char and not correct
        if (foundIncorrect) {
            gDisplay.dom.kanji.children[cCount].classList.add("wrong");
        }


    }

    // Set per character after everything
    if (inputSettings.listenMode) {
        for (var i = 0; i < gDisplay.dom.kanji.children.length; i++) {
            let character = gDisplay.dom.kanji.children[i];
            if (character.id == "furigana") {
                continue;
            }

            // Makes it harder to not see the next 'wrong' labeled items until typed correctly
            let showWrong = character.classList.contains("wrong") && inputSettings.showWrong;

            if (character.classList.contains("correct") || showWrong || gDisplay.dom.kana.style.visibility == "visible") {
                character.style.visibility = "visible";
            } else {
                character.style.visibility = "hidden";
            }
        }
    }
}

// Show the Furigana of the next kanji not correct yet
function showFurigana(show) {
    var furiganaDiv = document.getElementById("furigana");
    if (show) {
        furiganaDiv.style.visibility = "visible"; // incase not already
        for (var i = 0; i < gDisplay.currentCard.furigana.length; i++) {
            var furiganaStart = gDisplay.currentCard.furigana[i * 2];
            var furiganaLength = gDisplay.currentCard.furigana[(i * 2) + 1];
            var furiganaEnd = furiganaStart + furiganaLength;
            if (gDisplay.correctKanaIndex < furiganaEnd) {
                // Show next furigana only from here
                var furiganaText = gDisplay.currentCard.kana.substring(furiganaStart, furiganaEnd);
                furiganaDiv.innerHTML = furiganaText;

                // get absoulte position so furigana is displayed by text
                var kanjiIndex = gDisplay.kanjiStartIndex[i];
                if (inputSettings.vertical) {
                    // 1 for length, 1 for furigana <span>, 1 for <br>
                    var lastKanjiTextIndex = gDisplay.dom.kanji.children.length - 3;
                    // "enough" space to to buffer, could be smarter how this is done
                    var leftOffset = gDisplay.dom.kanji.children[lastKanjiTextIndex].getBoundingClientRect().left - 40;
                    var topOffset = gDisplay.dom.kanji.children[kanjiIndex].getBoundingClientRect().top;
                    furiganaDiv.style.left = leftOffset + "px";
                    furiganaDiv.style.top = topOffset + "px";
                } else {
                    var offset = gDisplay.dom.kanji.children[kanjiIndex].getBoundingClientRect().left - gDisplay.dom.kanji.offsetLeft;
                    furiganaDiv.style.left = offset + "px";
                }
                break;
            }
        }
    } else {
        // remove from dom
        furiganaDiv.innerHTML = "";
    }
}

// Used to update the CSS to match desired layout
//
// @param vertical Set as vertical or else horizontal
function setDisplayLayout() {
    if (inputSettings.vertical) {
        gDisplay.dom.kanji.classList.remove("textKanjiHorizontal");
        gDisplay.dom.kana.classList.remove("textKanaHorizontal");
        gDisplay.dom.translation.classList.remove("textTranslationHorizontal");
        gDisplay.dom.input.classList.remove("inputDisplayHorizontal");

        gDisplay.dom.kanji.classList.add("textKanjiVertical");
        gDisplay.dom.kana.classList.add("textKanaVertical");
        gDisplay.dom.translation.classList.add("textTranslationVertical");
        gDisplay.dom.input.classList.add("inputDisplayVertical");

        document.getElementById("textDisplay").style.display = "flex";
    } else {
        gDisplay.dom.kanji.classList.remove("textKanjiVertical");
        gDisplay.dom.kana.classList.remove("textKanaVertical");
        gDisplay.dom.translation.classList.remove("textTranslationVertical");
        gDisplay.dom.input.classList.remove("inputDisplayVertical");

        gDisplay.dom.kanji.classList.add("textKanjiHorizontal");
        gDisplay.dom.kana.classList.add("textKanaHorizontal");
        gDisplay.dom.translation.classList.add("textTranslationHorizontal");
        gDisplay.dom.input.classList.add("inputDisplayHorizontal");

        document.getElementById("textDisplay").style.display = "block";
    }

    setVisibility();
}

// Called after deck is selected or debug mode to get main display up
function setupMainType() {
    // get first card and back buffer
    $.get("/cards/2", function(data) {
        gDisplay.currentCard = data[0];
        gDisplay.nextCard = data[1];

        // get Audio - will be undefined if no sound file
        gDisplay.currentCard.audio = (gDisplay.currentCard.sound) ? new Audio("sound/" + gDisplay.currentCard.sound) : undefined;
        gDisplay.nextCard.audio = (gDisplay.nextCard.sound) ? new Audio("sound/" + gDisplay.nextCard.sound) : undefined;

        // prevent requery each time as dom elements never leave
        gDisplay.dom.kanji = document.getElementById("textKanji");
        gDisplay.dom.kana = document.getElementById("textKana");
        gDisplay.dom.translation = document.getElementById("textTranslation");
        gDisplay.dom.input = document.getElementById("inputDisplay");

        // Default layout
        setDisplayLayout();

        // Swap deck select with main typing screen
        var mainType = document.getElementById("mainType");
        mainType.style.visibility = "visible";
        document.getElementById("deckSelect").remove();

        // Turn whole screen into a keylogger
        document.addEventListener('keydown', mainTypeKeydown);
        document.addEventListener('keyup', mainTypeKeyup);

        displayCard();
    });
}

$(document).ready(function(){
    console.debug("Document loaded");

    if (DEBUG) {
        // Bypass selection processed
        setupMainType();
        return;
    }

    $.get("/decks", function(data) {
        var deckList = document.getElementById("deckList");
        for (var i = 0; i < data.decks.length; i++) {
            const deck = data.decks[i];
            var newListItem = document.createElement("li");
            newListItem.innerHTML = "<button class=\"deckOnClick\" id=\"" + deck.name + "\">select</button> "
                                    + deck.name + " (" + deck.cardCount + " cards)"
            deckList.appendChild(newListItem);
        }

        // Apply jquery events
        $(".deckOnClick").on("click", deckOnClick);
    });
});
