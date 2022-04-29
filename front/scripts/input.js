//
// @file input.js
// @brief Handles all input from keyboard
//

// Global settings from input
var inputSettings = {
    playSound : false, // default
    pressSound : true, // default
    vertical : true, // default
    listenMode : false, // default
    darkMode : false, // default
    showWrong : false, // default
}

function deckOnClick(event) {
    // id == deck name
    var deckName = event.target.id;

    // confirm deck with backend
    $.get("/decks/" + deckName, function(data) {
        setupMainType();
    });
}

var inputRomaji = ""; // shadow buffer of what is displayed
function mainTypeKeydown(event) {
    const keyCode = event.keyCode;
    if (keyCode == 13) {
        // enter
        return getNextCard(); // skip
    }

    if (keyCode == 32) {
        // space
        if (inputSettings.listenMode) {
            playSound();
            if (gDisplay.matched == true) {
                // TODO - need to just wrap compareInput() as other inputs still trigger it
                return; // don't want to toggle display
            }
        } else {
            showFurigana(true);
        }
        event.preventDefault();
    } else if (keyCode == 17) {
        // ctl - unused
    } else if (keyCode == 18) {
        // alt
        if (inputSettings.listenMode) {
            showFurigana(true); // instead of space
        }
    } else if (keyCode == 9) {
        // tab
        if (inputSettings.pressSound) {
            playSound();
        }

        if (inputSettings.listenMode) {
            // always visible as whole element, each element is shown/not in compare input
            gDisplay.dom.kanji.style.visibility = "visible";

            if (gDisplay.dom.kana.style.visibility == "visible") {
                // undo incase wantted to just peek
                gDisplay.dom.kana.style.visibility = "hidden";
                gDisplay.dom.translation.style.visibility = "hidden";
            } else {
                // make visible if it wasn't until next card
                gDisplay.dom.kana.style.visibility = "visible";
                gDisplay.dom.translation.style.visibility = "visible";
            }

            // prevent calling recursive compareInput
            if (gDisplay.matched == true) {
                return;
            }
        } else {
            // just make translation visible for non-listen mode
            gDisplay.dom.translation.style.visibility = "visible";
        }
        event.preventDefault();
    } else if (keyCode == 8) {
        // backspace
        inputRomaji = inputRomaji.slice(0, -1);
    } else if (keyCode >= 48 && keyCode <= 57) {
        // 0 - 9
        inputRomaji += String.fromCharCode(keyCode);
    } else if (keyCode >= 65 && keyCode <= 90) {
        // a - z
        // wanakana has system of capital letters being katakana
        if (keyCode == 78 && gDisplay.nextIsN) {
            inputRomaji += (gDisplay.nextIsKatakana) ? "ン" : "ん";
        } else if (gDisplay.nextIsKatakana) {
            inputRomaji += String.fromCharCode(keyCode);
        } else {
            inputRomaji += String.fromCharCode(keyCode).toLowerCase();
        }
    }
    // Special char
    else if (keyCode == 189) {
        inputRomaji += "-";
    } else if (keyCode == 219) {
        inputRomaji += "「";
    } else if (keyCode == 221) {
        inputRomaji += "」";
    }

    gDisplay.dom.input.innerText = wanakana.toKana(inputRomaji);
    compareInput();
}

function mainTypeKeyup(event) {
    const keyCode = event.keyCode;
    if (keyCode == 32) {
        // space
        showFurigana(false);
        event.preventDefault();
    }

    if (keyCode == 18) {
        // alt
        if (inputSettings.listenMode) {
            showFurigana(false);
            event.preventDefault();
        }
    }
}

function clearInputDisplay() {
    gDisplay.dom.input.innerText = "";
    inputRomaji = "";
    gDisplay.matched = false;
}

// Sends all checkboxes out to handlers
$(document).ready(function() {
    // Default settings
    document.getElementById("kana").checked = false;
    document.getElementById("translation").checked = false;
    document.getElementById("vertical").checked = inputSettings.vertical;
    document.getElementById("playSound").checked = inputSettings.playSound;
    document.getElementById("pressSound").checked = inputSettings.pressSound;
    document.getElementById("listenMode").checked = inputSettings.listenMode;
    document.getElementById("darkMode").checked = inputSettings.darkMode;
    document.getElementById("showWrong").checked = inputSettings.showWrong;

    $('input[type="checkbox"]').click(function(){
        var box = $(this)[0].name;
        var checked = $(this).prop("checked");

        // dispatches each type of option to be handled
        if (box == "kana") {
            setVisibility();
        } else if (box == "translation") {
            setVisibility();
        } else if (box == "vertical") {
            inputSettings.vertical = checked;
            setDisplayLayout();
        } else if (box == "playSound") {
            inputSettings.playSound = checked;
        } else if (box == "pressSound") {
            inputSettings.pressSound = checked;
        } else if (box == "listenMode") {
            inputSettings.listenMode = checked;
            document.getElementById("playSound").checked = true;
            inputSettings.playSound = true;
            document.getElementById("pressSound").checked = false;
            inputSettings.pressSound = false;
            document.getElementById("vertical").checked = false;
            inputSettings.vertical = false;
            setDisplayLayout();
        } else if (box == "darkMode") {
            inputSettings.darkMode = checked;
            document.body.style.background = (checked) ? "black" : "white";
            document.body.style.color = (checked) ? "white" : "black";
            // will only replace the current word
            document.getElementById("furigana").style.color = (inputSettings.darkMode) ? "lightblue" : "blue";
        } else if (box == "showWrong") {
            inputSettings.showWrong = checked;
        }
    });
});
