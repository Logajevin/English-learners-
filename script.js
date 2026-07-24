(() => {
  "use strict";

  const state = {
    all: [],
    filtered: [],
    activeFilter: "All",
    query: "",
    renderCount: 0,
    pageSize: 24,
  };

  const els = {
    grid: document.getElementById("cardGrid"),
    empty: document.getElementById("emptyState"),
    resultCount: document.getElementById("resultCount"),
    search: document.getElementById("searchInput"),
    clearSearch: document.getElementById("clearSearch"),
    tabs: document.getElementById("tabs"),
    langToggle: document.getElementById("langToggle"),
    themeToggle: document.getElementById("themeToggle"),
    wotdCard: document.getElementById("wotdCard"),
    shuffleBtn: document.getElementById("shuffleBtn"),
    loadMoreWrap: document.getElementById("loadMoreWrap"),
    loadMoreBtn: document.getElementById("loadMoreBtn"),
  };

  const TAG_CLASS = {
    "Idiom": "tag-idiom",
    "Phrasal Verb": "tag-phrasal",
    "Corporate Vocabulary": "tag-corporate",
  };

  // ---------- Theme ----------
  function initTheme() {
    const saved = localStorage.getItem("wm-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved ? saved === "dark" : prefersDark;
    setTheme(dark);
  }
  function setTheme(dark) {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("wm-theme", dark ? "dark" : "light");
    document.getElementById("themeIconSun").style.display = dark ? "none" : "block";
    document.getElementById("themeIconMoon").style.display = dark ? "block" : "none";
  }
  els.themeToggle.addEventListener("click", () => {
    setTheme(!document.documentElement.classList.contains("dark"));
  });

  // ---------- Language toggle ----------
  function initLang() {
    const saved = localStorage.getItem("wm-bilingual");
    const bilingual = saved === null ? true : saved === "true";
    setLang(bilingual);
  }
  function setLang(bilingual) {
    document.documentElement.classList.toggle("bilingual", bilingual);
    els.langToggle.setAttribute("aria-pressed", String(bilingual));
    els.langToggle.querySelector(".pill-toggle-label").textContent = bilingual ? "EN + தமிழ்" : "EN only";
    localStorage.setItem("wm-bilingual", String(bilingual));
  }
  els.langToggle.addEventListener("click", () => {
    setLang(els.langToggle.getAttribute("aria-pressed") !== "true");
  });

  // ---------- Data loading ----------
  async function loadData() {
    const files = ["data/idioms.json", "data/phrasal_verbs.json", "data/corporate_words.json"];
    try {
      const results = await Promise.all(files.map(f => fetch(f).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${f}`);
        return r.json();
      })));
      state.all = results.flat().map((item, idx) => ({ ...item, _uid: idx }));
    } catch (err) {
      els.grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <p>Couldn't load the word data.</p>
        <p class="empty-sub">${err.message}. If you're viewing this file directly, serve it over HTTP (e.g. via GitHub Pages or a local server) since browsers block JSON loading from local files.</p>
      </div>`;
      console.error(err);
      return;
    }
    setupWordOfDay();
    applyFilters();
  }

  // ---------- Filtering / search ----------
  function applyFilters() {
    const q = state.query.trim().toLowerCase();
    state.filtered = state.all.filter(item => {
      if (state.activeFilter !== "All" && item.category !== state.activeFilter) return false;
      if (!q) return true;
      return (
        item.term.toLowerCase().includes(q) ||
        item.meaning_en.toLowerCase().includes(q) ||
        (item.meaning_ta && item.meaning_ta.includes(q)) ||
        (item.example_en && item.example_en.toLowerCase().includes(q))
      );
    });
    state.renderCount = Math.min(state.pageSize, state.filtered.length);
    renderGrid(true);
  }

  els.search.addEventListener("input", (e) => {
    state.query = e.target.value;
    els.clearSearch.style.display = state.query ? "block" : "none";
    applyFilters();
  });
  els.clearSearch.addEventListener("click", () => {
    els.search.value = "";
    state.query = "";
    els.clearSearch.style.display = "none";
    applyFilters();
    els.search.focus();
  });

  els.tabs.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab");
    if (!btn) return;
    els.tabs.querySelectorAll(".tab").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    state.activeFilter = btn.dataset.filter;
    applyFilters();
  });

  els.loadMoreBtn.addEventListener("click", () => {
    state.renderCount = Math.min(state.renderCount + state.pageSize, state.filtered.length);
    renderGrid(false);
  });

  // ---------- Rendering ----------
  function cardHTML(item) {
    const tagClass = TAG_CLASS[item.category] || "";
    const posLine = item.part_of_speech ? `<p class="card-pos">${escapeHTML(item.part_of_speech)}</p>` : "";
    return `
    <div class="card" data-uid="${item._uid}" tabindex="0" role="button" aria-label="Flip card for ${escapeHTML(item.term)}">
      <div class="card-inner">
        <div class="card-face front">
          <span class="card-tag ${tagClass}">${escapeHTML(item.category)}</span>
          <h3 class="card-term">${escapeHTML(item.term)}</h3>
          ${posLine}
          <p class="card-meaning">${escapeHTML(item.meaning_en)}</p>
          <p class="card-hint">
            <svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 5a1 1 0 0 1 1 1v4.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42L11 10.6V6a1 1 0 0 1 1-1Zm-7 12a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1Z"/></svg>
            Tap to reveal தமிழ்
          </p>
        </div>
        <div class="card-face back">
          <span class="card-tag ${tagClass}">${escapeHTML(item.category)}</span>
          <h3 class="card-term" style="font-size:1.05rem">${escapeHTML(item.term)}</h3>
          <p class="back-meaning-ta meaning-ta">${escapeHTML(item.meaning_ta)}</p>
          <p class="back-meaning-en">${escapeHTML(item.meaning_en)}</p>
          <p class="back-example-label">Example</p>
          <p class="back-example-en">${escapeHTML(item.example_en)}</p>
          <p class="back-example-ta meaning-ta">${escapeHTML(item.example_ta)}</p>
        </div>
      </div>
    </div>`;
  }

  function renderGrid(reset) {
    const visible = state.filtered.slice(0, state.renderCount);
    els.grid.innerHTML = visible.map(cardHTML).join("");
    els.empty.style.display = state.filtered.length === 0 ? "block" : "none";
    els.loadMoreWrap.style.display = state.renderCount < state.filtered.length ? "flex" : "none";

    const count = state.filtered.length;
    els.resultCount.textContent = count === state.all.length
      ? `Showing all ${count} entries`
      : `${count} ${count === 1 ? "entry" : "entries"} found`;

    attachCardHandlers();
    observeCards();
  }

  function attachCardHandlers() {
    els.grid.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", () => card.classList.toggle("flipped"));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          card.classList.toggle("flipped");
        }
      });
    });
  }

  let io;
  function observeCards() {
    if (io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          setTimeout(() => el.classList.add("in-view"), i * 35);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
    els.grid.querySelectorAll(".card:not(.in-view)").forEach(c => io.observe(c));
  }

  // ---------- Word of the day ----------
  function setupWordOfDay() {
    if (!state.all.length) return;
    // Deterministic "today" word based on date, so it's stable across reloads.
    const dayKey = new Date().toISOString().slice(0, 10);
    let seed = 0;
    for (let i = 0; i < dayKey.length; i++) seed = (seed * 31 + dayKey.charCodeAt(i)) >>> 0;
    const idx = seed % state.all.length;
    renderWotd(state.all[idx]);
  }

  function renderWotd(item) {
    const tagClass = TAG_CLASS[item.category] || "";
    els.wotdCard.classList.remove("wotd-anim");
    void els.wotdCard.offsetWidth; // reflow to restart animation
    els.wotdCard.classList.add("wotd-anim");
    els.wotdCard.innerHTML = `
      <span class="wotd-category card-tag ${tagClass}">${escapeHTML(item.category)}</span>
      <h2 class="wotd-term">${escapeHTML(item.term)}</h2>
      <p class="wotd-meaning">${escapeHTML(item.meaning_en)}</p>
      <p class="wotd-meaning-ta meaning-ta">${escapeHTML(item.meaning_ta)}</p>
    `;
  }

  els.shuffleBtn.addEventListener("click", () => {
    if (!state.all.length) return;
    els.shuffleBtn.classList.add("spinning");
    setTimeout(() => els.shuffleBtn.classList.remove("spinning"), 400);
    const idx = Math.floor(Math.random() * state.all.length);
    renderWotd(state.all[idx]);
  });

  // ---------- utils ----------
  function escapeHTML(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------- init ----------
  initTheme();
  initLang();
  loadData();
})();
