async function initBookPage() {
  const slug = location.hash.slice(1) || new URLSearchParams(location.search).get('id');
  const res = await fetch('./data/books.json');
  const books = await res.json();
  const book = books.find(b => b.slug === slug);

  if (!book) {
    document.getElementById('bookDetail').innerHTML =
      '<a href="index.html" class="back-link">← Bookshelf</a><p style="margin-top:40px">本が見つかりませんでした。</p>';
    return;
  }

  document.title = `${book.title} — SPINE`;

  document.getElementById('detailCover').innerHTML = book.cover
    ? `<img src="${book.cover}" alt="${book.title}" onerror="this.parentElement.innerHTML='<div class=cover-placeholder>${book.title}</div>'">`
    : `<div class="cover-placeholder">${book.title}</div>`;

  document.getElementById('detailTo').textContent = book.to;
  document.getElementById('detailTitle').textContent = book.title;
  document.getElementById('detailAuthor').textContent = book.author;
  document.getElementById('detailDesc').textContent = book.description;

  // 長文の感想（comment）。空なら非表示
  const commentEl = document.getElementById('detailComment');
  if (book.comment) {
    commentEl.innerHTML = book.comment
      .split('\n')
      .map(p => `<p>${p}</p>`)
      .join('');
  } else {
    commentEl.style.display = 'none';
  }

  const links = [];
  if (book.amazon_url) links.push(`<a href="${book.amazon_url}" class="buy-link amazon" target="_blank" rel="noopener noreferrer">Amazon</a>`);
  if (book.rakuten_url) links.push(`<a href="${book.rakuten_url}" class="buy-link rakuten" target="_blank" rel="noopener noreferrer">楽天</a>`);
  document.getElementById('detailLinks').innerHTML = links.join('');

  // 同じ「渡したい人」カテゴリの別の本
  const related = books.filter(b => b.to === book.to && b.slug !== book.slug);
  const relEl = document.getElementById('detailRelated');
  if (related.length) {
    relEl.innerHTML =
      `<h2 class="related-heading">${book.to}、他にも</h2>` +
      related.map(b => `
        <a href="book.html#${b.slug}" class="related-card" onclick="setTimeout(()=>location.reload(),0)">
          <span class="related-title">${b.title}</span>
          <span class="related-author">${b.author}</span>
        </a>`).join('');
  }
}

document.addEventListener('DOMContentLoaded', initBookPage);
