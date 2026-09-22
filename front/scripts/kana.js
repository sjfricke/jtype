// Romaji buffer that renders to kana via wanakana.
//
// Plain toKana() commits a trailing lone "n" to ん immediately, which is wrong
// half the time (こな vs こん). Since the expected answer is known, the caller
// passes the kana character it wants next and the buffer resolves the ambiguity
// with certainty instead of guessing.

const PUNCTUATION = {
    '-': 'ー',
    '[': '「',
    ']': '」',
    ',': '、',
    '.': '。',
    '!': '！',
    '?': '？',
};

const endsWithLoneN = (s) => /[nN]$/.test(s) && !/[nN][nN]$/.test(s);

export class KanaInput {
    constructor() {
        this.buffer = '';
    }

    clear() {
        this.buffer = '';
    }

    backspace() {
        this.buffer = this.buffer.slice(0, -1);
    }

    // `expected` is the answer's next kana character, or undefined past the end.
    key(ch, expected) {
        if (PUNCTUATION[ch]) {
            this.buffer += PUNCTUATION[ch];
            return;
        }
        if (/[0-9]/.test(ch)) {
            this.buffer += ch;
            return;
        }
        if (!/[a-zA-Z]/.test(ch)) return;

        const katakana = expected !== undefined
            && wanakana.isKatakana(expected) && !wanakana.isHiragana(expected);

        if (ch === 'n' || ch === 'N') {
            // "nn" is the habitual IME way to force ん.
            if (endsWithLoneN(this.buffer)) {
                this.buffer = this.buffer.slice(0, -1) + (katakana ? 'ン' : 'ん');
                return;
            }
            if (expected === 'ん' || expected === 'ン') {
                this.buffer += expected;
                return;
            }
        }

        // wanakana reads capitals as katakana.
        this.buffer += katakana ? ch.toUpperCase() : ch.toLowerCase();
    }

    get text() {
        const pending = endsWithLoneN(this.buffer) ? this.buffer.slice(0, -1) : this.buffer;
        return wanakana.toKana(pending);
    }

    // Index into the answer that the next keystroke is working on: everything
    // before it is settled kana, the rest is half-typed romaji still on screen.
    get settledLength() {
        return this.text.replace(/[a-zA-Z]+$/, '').length;
    }
}
