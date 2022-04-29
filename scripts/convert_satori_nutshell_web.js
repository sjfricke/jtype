var data = [];

var audioFile = document.getElementsByTagName("audio")[0].children[0].getAttribute("src");
var audioPrefix = audioFile.substring((audioFile.indexOf("nutshell-grammar-") + "nutshell-grammar-".length), audioFile.indexOf(".mp3"));

// will have more items then shown, use audio array size for bounding index
for (var i = 0; i < articlePresenter.sentenceAudioPositions.length; i++) {

    var sentenceDiv = document.getElementsByClassName("sentence")[i];
    var wordCount = sentenceDiv.getElementsByClassName("word").length;
    var sentenceID = sentenceDiv.getAttribute("data-id");

    var kanaCount = 0;
    var furigana = [];
    var kanjiLength = [];

    var kana = "";
    var kanji = "";
    for (var j = 0; j < wordCount; j++) {
        var part = articlePresenter.article.getItemById(sentenceDiv.getElementsByClassName("word")[j].getAttribute("data-id")).parts[0];
        // if 'reading' is not null then 'text' is kanji
        if (part.reading) {
            kana += part.reading;
            kanjiLength.push(part.text.length);
            furigana.push(kanaCount);
            furigana.push(part.reading.length);
            kanaCount += part.reading.length; // get count at end for next start
        } else {
            kana += part.text;
            kanaCount += part.text.length; // get count at end for next start
        }
        kanji += part.text;
    }

    var translation = "";
    var notes = articlePresenter.article.getItemById(sentenceID).noteIds;
    for (var j = 0; j < notes.length; j++) {
        note = articlePresenter.article.getNoteById(notes[j]);
        // assume 3 == "meaning"
        if (note.type == 3) {
            translation = note.discussion;
            break;
        }
    }

    data.push({
        "kana" : kana,
        "kanji" : kanji,
        "translation" : translation,
        "furigana" : furigana,
        "kanjiLength" : kanjiLength,
        "sound" : audioPrefix + "_" + i + ".mp3"
    });
}

console.log(JSON.stringify(data, undefined, 4));