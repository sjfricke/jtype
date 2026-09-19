// Turns a deck card into something renderable.
//
// The deck schema describes a card as two parallel strings: `kanji` (what you
// read) and `kana` (what you type). `furigana` holds [kanaStart, kanaLength]
// pairs for each kanji block and `kanjiLength` holds how many characters of the
// kanji string each of those blocks covers. Everything between blocks is shared
// by both strings verbatim.
//
// Splitting that into segments gives an exact character-level mapping from
// typing progress in the kana back onto the kanji on screen.

function segmentsOf(card) {
    const segments = [];
    let kanaPos = 0;
    let kanjiPos = 0;

    for (let i = 0; i < card.kanjiLength.length; i++) {
        const readingStart = card.furigana[i * 2];
        const readingLength = card.furigana[i * 2 + 1];
        const literalLength = readingStart - kanaPos;

        if (literalLength > 0) {
            segments.push({
                ruby: false,
                text: card.kanji.substr(kanjiPos, literalLength),
                kanaStart: kanaPos,
            });
            kanjiPos += literalLength;
            kanaPos = readingStart;
        }

        segments.push({
            ruby: true,
            text: card.kanji.substr(kanjiPos, card.kanjiLength[i]),
            reading: card.kana.substr(readingStart, readingLength),
            kanaStart: kanaPos,
            kanaEnd: kanaPos + readingLength,
        });
        kanjiPos += card.kanjiLength[i];
        kanaPos += readingLength;
    }

    if (kanjiPos < card.kanji.length) {
        segments.push({ ruby: false, text: card.kanji.slice(kanjiPos), kanaStart: kanaPos });
    }
    return segments;
}

// Renders the sentence into `host`, one <span> per kanji-string character so
// progress can light up character by character.
export function renderCard(host, card) {
    const segments = segmentsOf(card);
    const chars = [];      // one span per character of card.kanji
    const thresholds = []; // kana typed correctly before that character is solved
    const blocks = [];     // ruby blocks, in order, for the furigana peek

    host.textContent = '';
    for (const segment of segments) {
        const base = segment.ruby ? document.createElement('ruby') : host;
        for (let i = 0; i < segment.text.length; i++) {
            const span = document.createElement('span');
            span.className = 'ch';
            span.textContent = segment.text[i];
            base.appendChild(span);
            chars.push(span);
            // A reading is only known once its whole block is typed; plain kana
            // resolves one character at a time.
            thresholds.push(segment.ruby ? segment.kanaEnd : segment.kanaStart + i + 1);
        }
        if (segment.ruby) {
            const rt = document.createElement('rt');
            rt.textContent = segment.reading;
            base.appendChild(rt);
            host.appendChild(base);
            blocks.push({ rt, kanaEnd: segment.kanaEnd });
        }
    }
    return { chars, thresholds, blocks };
}

export function commonPrefixLength(typed, answer) {
    let i = 0;
    while (i < typed.length && i < answer.length && typed[i] === answer[i]) i++;
    return i;
}
