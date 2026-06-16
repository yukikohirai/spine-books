async function loadBooks() {
  const res = await fetch('./data/books.json');
  return res.json();
}

function getAllTags(books) {
  const tags = new Set(books.map(b => b.to));
  return ['すべて', ...tags];
}

function createCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.tag = book.to;

  const coverHtml = book.cover
    ? `<img src="${book.cover}" alt="${book.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=cover-placeholder>${book.title}</div>'">`
    : `<div class="cover-placeholder">${book.title}</div>`;

  card.innerHTML = `
    <a class="book-card-inner" href="book.html#${book.slug}">
      <div class="cover-wrap">${coverHtml}</div>
      <span class="book-tag">${book.to}</span>
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">${book.author}</p>
      <p class="book-desc">${book.description}</p>
      <span class="card-more">この本のページへ →</span>
    </a>
  `;

  return card;
}

function setupScrollAnimation(cards) {
  const reveal = (card) => {
    const index = [...card.parentElement.children].indexOf(card);
    setTimeout(() => card.classList.add('visible'), (index % 3) * 80);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          reveal(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );

  cards.forEach(card => observer.observe(card));

  // フェイルセーフ：Observerが発火しない環境でもカードを必ず表示する
  setTimeout(() => {
    cards.forEach(card => {
      if (!card.classList.contains('visible')) {
        card.classList.add('visible');
        observer.unobserve(card);
      }
    });
  }, 1200);
}

function setupHeaderScroll() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 60);
  }, { passive: true });
}

function setupFilter(books, grid) {
  const filterContainer = document.querySelector('.filter-tags');
  const tags = getAllTags(books);
  const countEl = document.querySelector('.section-count');

  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.className = 'filter-tag' + (tag === 'すべて' ? ' active' : '');
    btn.textContent = tag;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tag').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cards = grid.querySelectorAll('.book-card');
      let visible = 0;
      cards.forEach(card => {
        const show = tag === 'すべて' || card.dataset.tag === tag;
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      countEl.textContent = `${visible} books`;
    });
    filterContainer.appendChild(btn);
  });
}

function createShowcaseCard(book) {
  const card = document.createElement('div');
  card.className = 'showcase-card';

  const coverHtml = book.cover
    ? `<img src="${book.cover}" alt="${book.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=cover-placeholder>${book.title}</div>'">`
    : `<div class="cover-placeholder">${book.title}</div>`;

  card.innerHTML = `<div class="cover-wrap">${coverHtml}</div>`;
  card.dataset.title = book.title;
  card.dataset.author = book.author;
  card.dataset.tag = book.to;
  card.dataset.desc = book.description;
  return card;
}

function setupShowcase(books) {
  const stack = document.getElementById('showcaseStack');
  const info = document.getElementById('showcaseInfo');
  if (!stack || !info) return;

  const cards = books.map(createShowcaseCard);
  cards.forEach(card => stack.appendChild(card));

  const showcase = document.querySelector('.showcase');
  const n = cards.length;
  const radius = Math.round(180 / (2 * Math.tan(Math.PI / n))) + 120;
  const angleStep = 360 / n;

  cards.forEach((card, i) => {
    const angle = angleStep * i;
    card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
  });

  let currentFront = -1;

  function render() {
    const showcaseTop = showcase.offsetTop;
    const showcaseHeight = showcase.offsetHeight;
    const scrolled = window.scrollY - showcaseTop;
    const progress = Math.max(0, Math.min(1, scrolled / (showcaseHeight - window.innerHeight)));

    const totalRotation = 360 * 2;
    const deg = progress * totalRotation;
    stack.style.transform = `rotateY(${-deg}deg)`;

    // 各カードの正面からの角度差を計算してスケール調整
    cards.forEach((card, i) => {
      const cardAngle = (angleStep * i - deg + 3600) % 360;
      // 0度が正面。180度が真後ろ
      const diff = cardAngle > 180 ? 360 - cardAngle : cardAngle;
      const proximity = 1 - diff / 180; // 1=正面, 0=真後ろ
      const scale = 0.45 + 0.75 * proximity;
      const brightness = 0.4 + 0.6 * proximity;
      card.style.transform = `rotateY(${angleStep * i}deg) translateZ(${radius}px) scale(${scale})`;
      card.style.filter = `brightness(${brightness})`;
    });

    // 正面のカードを特定してinfoを更新
    let frontIdx = 0;
    let minDiff = Infinity;
    cards.forEach((card, i) => {
      const cardAngle = (angleStep * i - deg + 3600) % 360;
      const diff = cardAngle > 180 ? 360 - cardAngle : cardAngle;
      if (diff < minDiff) { minDiff = diff; frontIdx = i; }
    });

    if (frontIdx !== currentFront) {
      currentFront = frontIdx;
      const b = books[frontIdx];
      info.classList.remove('visible');
      setTimeout(() => {
        info.querySelector('.info-tag').textContent = b.to;
        info.querySelector('.info-title').textContent = b.title;
        info.querySelector('.info-author').textContent = b.author;
        info.querySelector('.info-desc').textContent = b.description;
        info.classList.add('visible');
      }, 120);
    }
  }

  window.addEventListener('scroll', render, { passive: true });
  render();
}

// ─── Music Player (self-hosted audio: keeps playing in the background on mobile) ───
const BGM_GROUPS = [
  { name: 'Morning',   icon: '☀', tracks: ['audio/track1.mp3', 'audio/track2.mp3', 'audio/track3.mp3'], yt: ['pTMkDy0guJE', '88Rq16DL7qY', 'xjwPgxeOHNA'] },
  { name: 'Afternoon', icon: '◐', tracks: ['audio/track2.mp3', 'audio/track3.mp3', 'audio/track4.mp3'], yt: ['F20kgtSMGew', 'b5GbCibheZo', 'thTwVYmVMoE'] },
  { name: 'Night',     icon: '☽', tracks: ['audio/track3.mp3', 'audio/track4.mp3', 'audio/track1.mp3'], yt: ['4ehCL7_jc4Q', 'N81DOZr-mvs', '2zaZK2xHGcI'] },
];


function setupMusicPlayer() {
  const rows      = document.getElementById('bgmRows');
  const volSlider = document.getElementById('volumeSlider');
  const audio     = document.getElementById('bgmAudio');
  if (!rows || !audio) return;

  // loop属性はiOSのバックグラウンド再生を止めるので使わず、曲終わりに次へ進める
  audio.loop = false;
  audio.volume = volSlider ? parseFloat(volSlider.value) : 0.6;

  // 全ボタンを1本のプレイリストにする
  const playlist = [];
  BGM_GROUPS.forEach(group => {
    group.tracks.forEach((src, i) => playlist.push({ src, title: `${group.name} ${i + 1}` }));
  });

  let curIndex = -1;

  BGM_GROUPS.forEach((group, gi) => {
    const row = document.createElement('div');
    row.className = 'bgm-row';
    const base = gi * 3;
    const nums = group.tracks
      .map((src, i) => `<button class="bgm-num" data-index="${base + i}">${i + 1}</button>`)
      .join('');
    row.innerHTML = `
      <span class="bgm-row-icon">${group.icon}</span>
      <span class="bgm-row-name">${group.name}</span>
      <span class="bgm-nums">${nums}</span>`;
    rows.appendChild(row);
  });

  const buttons = [...rows.querySelectorAll('.bgm-num')];

  // 同じ時間帯（3曲）の中だけでループする
  const groupStart  = i => Math.floor(i / 3) * 3;
  const nextInGroup = i => groupStart(i) + ((i - groupStart(i) + 1) % 3);
  const prevInGroup = i => groupStart(i) + ((i - groupStart(i) + 2) % 3);

  function setActive(i) {
    buttons.forEach((b, bi) => b.classList.toggle('playing', bi === i));
  }

  function syncMediaSession(title) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'SPINE',
      album: 'A Personal Bookshelf',
    });
    navigator.mediaSession.setActionHandler('play',          () => playIndex(curIndex < 0 ? 0 : curIndex));
    navigator.mediaSession.setActionHandler('pause',         () => audio.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playIndex(prevInGroup(curIndex < 0 ? 0 : curIndex)));
    navigator.mediaSession.setActionHandler('nexttrack',     () => playIndex(nextInGroup(curIndex < 0 ? 0 : curIndex)));
  }

  function playIndex(i) {
    const track = playlist[i];
    if (!track) return;
    if (curIndex !== i) {
      audio.src = track.src;
      curIndex = i;
    }
    audio.play().catch(() => {});
    setActive(i);
    syncMediaSession(track.title);
  }

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (curIndex === i && !audio.paused) {   // 再生中の曲をもう一度押す → 一時停止
        audio.pause();
        setActive(-1);
        return;
      }
      playIndex(i);
    });
  });

  // 曲が終わったら同じ時間帯の次の曲へ（バックグラウンドでも継続）
  audio.addEventListener('ended', () => playIndex(nextInGroup(curIndex)));

  if (volSlider) {
    volSlider.addEventListener('input', () => { audio.volume = parseFloat(volSlider.value); });
  }

  if ('mediaSession' in navigator) {
    audio.addEventListener('play',  () => {
      navigator.mediaSession.playbackState = 'playing';
      if (curIndex >= 0) setActive(curIndex);
    });
    audio.addEventListener('pause', () => { navigator.mediaSession.playbackState = 'paused'; });
  }
}

async function init() {
  const books = await loadBooks();
  const grid = document.querySelector('.books-grid');
  const countEl = document.querySelector('.section-count');

  countEl.textContent = `${books.length} books`;

  const cards = books.map(createCard);
  cards.forEach(card => grid.appendChild(card));

  setupShowcase(books);
  setupFilter(books, grid);
  setupScrollAnimation(cards);
  setupMusicPlayer();
}

document.addEventListener('DOMContentLoaded', init);
