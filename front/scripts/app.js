import { KanaInput } from './kana.js';
import { renderCard, commonPrefixLength } from './card.js';

const dom = {
    picker: document.getElementById('picker'),
    practice: document.getElementById('practice'),
    finished: document.getElementById('finished'),
    deckList: document.getElementById('deckList'),
    modes: document.getElementById('modes'),
    sentence: document.getElementById('sentence'),
    typed: document.getElementById('typed'),
    translation: document.getElementById('translation'),
    deckName: document.getElementById('deckName'),
    modeName: document.getElementById('modeName'),
    counter: document.getElementById('counter'),
    legend: document.getElementById('legend'),
};

const LEGEND = {
    dictation: [['Space', 'hint'], ['Tab', 'replay'], ['/', 'reveal'], ['Enter', 'next'], ['Esc', 'decks']],
    typing: [['Space', 'furigana'], ['Tab', 'listen'], ['/', 'reveal'], ['Enter', 'next'], ['Esc', 'decks']],
};

let mode = 'dictation';
const session = {
    deck: null,
    queue: [],
    index: 0,
    card: null,
    view: null,
    input: new KanaInput(),
    audio: null,
    nextAudio: null,
    done: false,
};

function shuffled(cards) {
    const out = cards.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function audioFor(card) {
    return card && card.sound ? new Audio(`/audio/${encodeURIComponent(session.deck.name)}/${card.sound}`) : null;
}

function playAudio() {
    if (!session.audio) return;
    session.audio.currentTime = 0;
    session.audio.play().catch(() => {});
}

function show(screen) {
    for (const name of ['picker', 'practice', 'finished']) dom[name].hidden = name !== screen;
}

//
// Deck picker
//

async function loadDecks() {
    const decks = await fetch('/api/decks').then((r) => r.json());
    dom.deckList.textContent = '';
    for (const deck of decks) {
        const button = document.createElement('button');
        button.innerHTML = `<strong></strong><span>${deck.cardCount} cards</span>`;
        button.firstChild.textContent = deck.name;
        button.disabled = !deck.hasAudio;
        button.onclick = () => startDeck(deck.name);
        const item = document.createElement('li');
        item.appendChild(button);
        dom.deckList.appendChild(item);
    }
}

for (const button of dom.modes.querySelectorAll('.mode')) {
    button.onclick = () => {
        mode = button.dataset.mode;
        for (const other of dom.modes.querySelectorAll('.mode')) {
            other.setAttribute('aria-checked', String(other === button));
        }
    };
}

//
// Practice
//

async function startDeck(name) {
    session.deck = await fetch(`/api/decks/${encodeURIComponent(name)}`).then((r) => r.json());
    session.queue = shuffled(session.deck.cards);
    session.index = -1;
    session.nextAudio = null;

    dom.deckName.textContent = name;
    dom.modeName.textContent = mode;
    dom.legend.textContent = '';
    for (const [key, action] of LEGEND[mode]) {
        const entry = document.createElement('span');
        entry.innerHTML = '<kbd></kbd> ';
        entry.firstChild.textContent = key;
        entry.appendChild(document.createTextNode(action));
        dom.legend.appendChild(entry);
    }

    show('practice');
    nextCard();
}

function nextCard() {
    session.index++;
    if (session.index >= session.queue.length) return show('finished');

    session.card = session.queue[session.index];
    session.view = renderCard(dom.sentence, session.card);
    session.input.clear();
    session.done = false;

    dom.sentence.className = mode === 'dictation' ? 'masked' : '';
    dom.translation.textContent = session.card.translation;
    dom.translation.classList.remove('shown');
    dom.counter.textContent = `${session.index + 1} / ${session.queue.length}`;

    // The next card's audio was already fetched while this one was being typed.
    session.audio = session.nextAudio || audioFor(session.card);
    session.nextAudio = audioFor(session.queue[session.index + 1]);

    update();
    if (mode === 'dictation') playAudio();
}

// Shows or re-hides the sentence, its furigana and the meaning, without
// otherwise touching the card.
function setRevealed(on) {
    dom.sentence.classList.toggle('revealed', on);
    dom.sentence.classList.toggle('masked', !on && mode === 'dictation');
    dom.translation.classList.toggle('shown', on);
}

function finish() {
    session.done = true;
    setRevealed(true);
    playAudio();
}

function update() {
    const typed = session.input.text;
    const answer = session.card.kana;
    const correct = commonPrefixLength(typed, answer);

    dom.typed.textContent = '';
    for (const [text, cls] of [[typed.slice(0, correct), 'ok'], [typed.slice(correct), 'bad']]) {
        if (!text) continue;
        const span = document.createElement('span');
        span.className = cls;
        span.textContent = text;
        dom.typed.appendChild(span);
    }

    const { chars, thresholds } = session.view;
    let active = chars.length;
    for (let i = 0; i < chars.length; i++) {
        const solved = thresholds[i] <= correct;
        chars[i].classList.toggle('solved', solved);
        chars[i].classList.remove('wrong');
        if (!solved && active === chars.length) active = i;
    }
    if (typed.length > correct && active < chars.length) chars[active].classList.add('wrong');

    if (!session.done && typed === answer) finish();
}

// Dictation's hint: unmask just the next thing you have to type — one kana, or
// a whole kanji block, since a block's reading only resolves as a unit.
function peekNextUnit(show) {
    const { chars, thresholds } = session.view;
    for (const char of chars) char.classList.remove('hint');
    if (!show) return;

    const correct = commonPrefixLength(session.input.text, session.card.kana);
    const start = thresholds.findIndex((t) => t > correct);
    if (start < 0) return;
    for (let i = start; i < chars.length && thresholds[i] === thresholds[start]; i++) {
        chars[i].classList.add('hint');
    }
}

function peekFurigana(show) {
    if (mode !== 'typing') return;
    const correct = commonPrefixLength(session.input.text, session.card.kana);
    for (const block of session.view.blocks) {
        block.rt.classList.toggle('peek', show && block.kanaEnd > correct);
        if (show && block.kanaEnd > correct) break;
    }
}

function toPicker() {
    if (session.audio) session.audio.pause();
    show('picker');
}

document.addEventListener('keydown', (event) => {
    if (dom.practice.hidden || event.ctrlKey || event.metaKey || event.altKey) return;

    switch (event.key) {
        case 'Escape':
            return toPicker();
        case 'Enter':
            return nextCard();
        case 'Backspace':
            session.input.backspace();
            return update();
        case 'Tab':
            event.preventDefault();
            return playAudio();
        case '/':
        case '`':
            event.preventDefault();
            return setRevealed(!dom.sentence.classList.contains('revealed'));
        case ' ':
            event.preventDefault();
            if (event.repeat) return;
            return mode === 'dictation' ? peekNextUnit(true) : peekFurigana(true);
    }

    if (event.key.length !== 1) return;
    session.input.key(event.key, session.card.kana[session.input.settledLength]);
    update();
});

document.addEventListener('keyup', (event) => {
    if (event.key !== ' ' || dom.practice.hidden) return;
    if (mode === 'dictation') peekNextUnit(false);
    else peekFurigana(false);
});

document.getElementById('back').onclick = toPicker;
document.getElementById('again').onclick = () => show('picker');

loadDecks();
