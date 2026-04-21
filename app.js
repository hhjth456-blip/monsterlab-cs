// =================================================
//  MONSTERLAB CS - TEMPLATE HUB APP
//  Main application logic
// =================================================

// ── State ──────────────────────────────────────
let currentCategory = 'all';
let searchQuery = '';
let copiedTotal = parseInt(localStorage.getItem('ml_copied_count') || '0');
let toastTimer = null;

// ── DOM Ready ───────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initStats();
  buildCategoryFilters();
  renderTemplates();
  bindSearch();
});

// ── Initialize counters ─────────────────────────
function initStats() {
  animateCount('totalTemplates', TEMPLATES.length);
  animateCount('totalCategories', CATEGORIES.length);
  animateCount('copiedCount', copiedTotal);
}

function animateCount(elId, target) {
  const el = document.getElementById(elId);
  if (!el) return;
  let current = 0;
  const duration = 900;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current);
  }, 16);
}

function updateCopiedStat() {
  copiedTotal++;
  localStorage.setItem('ml_copied_count', copiedTotal);
  const el = document.getElementById('copiedCount');
  if (el) {
    el.textContent = copiedTotal;
    el.style.transform = 'scale(1.3)';
    el.style.color = '#fff';
    setTimeout(() => {
      el.style.transform = 'scale(1)';
      el.style.color = 'var(--orange)';
    }, 250);
  }
}

// ── Category Filters ────────────────────────────
function buildCategoryFilters() {
  const wrap = document.getElementById('categoryFilter');
  if (!wrap) return;

  CATEGORIES.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.cat = cat.id;
    btn.textContent = `${cat.icon} ${cat.label}`;
    btn.addEventListener('click', () => selectCategory(cat.id));
    wrap.appendChild(btn);
  });
}

function selectCategory(catId) {
  currentCategory = catId;
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === catId);
  });
  renderTemplates();
}

// ── Search ──────────────────────────────────────
function bindSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClear');

  input.addEventListener('input', () => {
    searchQuery = input.value.trim();
    clearBtn.style.display = searchQuery ? 'block' : 'none';
    renderTemplates();
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    searchQuery = '';
    clearBtn.style.display = 'none';
    input.focus();
    renderTemplates();
  });
}

// ── Filter Logic ─────────────────────────────────
function getFilteredTemplates() {
  let result = TEMPLATES;

  // Category filter
  if (currentCategory !== 'all') {
    result = result.filter(t => t.category === currentCategory);
  }

  // Search filter
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(t =>
      t.question.toLowerCase().includes(q) ||
      t.answer.toLowerCase().includes(q) ||
      (t.tags && t.tags.some(tag => tag.toLowerCase().includes(q))) ||
      (t.tip && t.tip.toLowerCase().includes(q))
    );
  }

  return result;
}

// ── Render Templates ─────────────────────────────
function renderTemplates() {
  const grid = document.getElementById('templateGrid');
  const noResult = document.getElementById('noResult');
  if (!grid) return;

  const filtered = getFilteredTemplates();

  grid.innerHTML = '';

  if (filtered.length === 0) {
    noResult.style.display = 'block';
    grid.style.display = 'none';
    return;
  }

  noResult.style.display = 'none';
  grid.style.display = 'grid';

  // Group by category when showing all (no search)
  if (currentCategory === 'all' && !searchQuery) {
    CATEGORIES.forEach(cat => {
      const catTemplates = filtered.filter(t => t.category === cat.id);
      if (catTemplates.length === 0) return;

      // Section heading
      const heading = createSectionHeading(cat);
      grid.appendChild(heading);

      catTemplates.forEach(t => {
        grid.appendChild(createCard(t));
      });
    });
  } else {
    // Flat list for search / single category
    filtered.forEach(t => {
      grid.appendChild(createCard(t));
    });
  }
}

// ── Section Heading ──────────────────────────────
function createSectionHeading(cat) {
  const el = document.createElement('div');
  el.className = 'section-heading';
  el.innerHTML = `
    <span class="section-heading-icon">${cat.icon}</span>
    <div class="section-heading-text">
      <h2>${cat.label}</h2>
      <p>${cat.desc}</p>
    </div>
    <div class="section-heading-line"></div>
  `;
  return el;
}

// ── Create Card ──────────────────────────────────
function createCard(template) {
  const cat = CATEGORIES.find(c => c.id === template.category) || {};
  const card = document.createElement('div');
  card.className = 'template-card';
  card.dataset.id = template.id;

  const tagsHTML = (template.tags || [])
    .map(tag => `<span class="tag">#${tag}</span>`)
    .join('');

  card.innerHTML = `
    <div class="card-header" role="button" tabindex="0" aria-expanded="false">
      <span class="card-category-dot" style="background:${cat.color || 'var(--orange)'}"></span>
      <div class="card-header-text">
        <div class="card-category-label" style="color:${cat.color || 'var(--orange)'}">${cat.icon || ''} ${cat.label || ''}</div>
        <div class="card-question">${highlightMatch(template.question)}</div>
      </div>
      <span class="card-arrow">▼</span>
    </div>
    <div class="card-divider"></div>
    <div class="card-body">
      ${template.tip ? `
        <div class="card-tip">
          <span class="card-tip-icon">💡</span>
          <span>${template.tip}</span>
        </div>
      ` : ''}
      ${tagsHTML ? `<div class="card-tags">${tagsHTML}</div>` : ''}
      <div class="answer-label">추천 답변</div>
      <div class="answer-text" id="answer-${template.id}">${highlightMatch(template.answer)}</div>
      <button class="copy-btn" data-id="${template.id}">
        <span class="copy-btn-icon">📋</span>
        <span>답변 복사하기</span>
      </button>
    </div>
  `;

  // Toggle accordion
  const header = card.querySelector('.card-header');
  header.addEventListener('click', () => toggleCard(card));
  header.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleCard(card);
    }
  });

  // Copy button
  const copyBtn = card.querySelector('.copy-btn');
  copyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    copyAnswer(template, copyBtn);
  });

  return card;
}

// ── Toggle Accordion ─────────────────────────────
function toggleCard(card) {
  const isOpen = card.classList.contains('open');
  const header = card.querySelector('.card-header');

  // Close all others
  document.querySelectorAll('.template-card.open').forEach(c => {
    if (c !== card) {
      c.classList.remove('open');
      c.querySelector('.card-header').setAttribute('aria-expanded', 'false');
    }
  });

  card.classList.toggle('open', !isOpen);
  header.setAttribute('aria-expanded', String(!isOpen));

  // Smooth scroll into view
  if (!isOpen) {
    setTimeout(() => {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ── Copy Answer ──────────────────────────────────
async function copyAnswer(template, btn) {
  const rawText = template.answer;

  try {
    await navigator.clipboard.writeText(rawText);
    showCopiedSuccess(btn, template.question);
    updateCopiedStat();
  } catch {
    // Fallback for older browsers
    const el = document.createElement('textarea');
    el.value = rawText;
    el.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand('copy');
      showCopiedSuccess(btn, template.question);
      updateCopiedStat();
    } catch {
      showToast('❌', '복사에 실패했습니다. 직접 선택하여 복사해 주세요.');
    }
    document.body.removeChild(el);
  }
}

function showCopiedSuccess(btn, question) {
  const originalHTML = btn.innerHTML;
  btn.classList.add('copied');
  btn.innerHTML = '<span class="copy-btn-icon">✅</span><span>복사 완료!</span>';
  btn.disabled = true;

  setTimeout(() => {
    btn.classList.remove('copied');
    btn.innerHTML = originalHTML;
    btn.disabled = false;
  }, 2000);

  showToast('✅', `"${question.substring(0, 25)}..." 답변이 복사되었습니다!`);
}

// ── Toast ─────────────────────────────────────────
function showToast(icon, msg) {
  const toast = document.getElementById('toast');
  const msgEl = document.getElementById('toastMsg');
  const iconEl = toast.querySelector('.toast-icon');

  if (toastTimer) clearTimeout(toastTimer);

  iconEl.textContent = icon;
  msgEl.textContent = msg;
  toast.classList.add('show');

  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

// ── Highlight Search Match ────────────────────────
function highlightMatch(text) {
  if (!searchQuery || searchQuery.length < 2) return escapeHTML(text);
  const escaped = escapeHTML(text);
  const escapedQuery = escapeHTML(searchQuery).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return escaped.replace(
    new RegExp(escapedQuery, 'gi'),
    match => `<mark style="background:rgba(255,107,53,0.2);color:var(--orange-dark);border-radius:3px;padding:0 2px;">${match}</mark>`
  );
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
