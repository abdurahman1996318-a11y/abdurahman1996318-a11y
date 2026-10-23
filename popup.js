document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const notesList = document.getElementById('notesList');
  const addNoteBtn = document.getElementById('addNoteBtn');
  const noteModal = document.getElementById('noteModal');
  const cancelModalBtn = document.getElementById('cancelModalBtn');
  const noteForm = document.getElementById('noteForm');
  const searchInput = document.getElementById('searchInput');
  const categoryPills = document.getElementById('categoryPills');
  const themeToggle = document.getElementById('themeToggle');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFileInput');

  // Form Fields
  const noteIdInput = document.getElementById('noteId');
  const noteTitleInput = document.getElementById('noteTitleInput');
  const noteCategorySelect = document.getElementById('noteCategorySelect');
  const noteContentInput = document.getElementById('noteContentInput');
  const noteLinksInput = document.getElementById('noteLinksInput');
  const modalTitle = document.getElementById('modalTitle');

  // State
  let notes = [];
  let currentCategory = 'ALL';
  let searchQuery = '';

  // Load Initial Settings & Data
  init();

  function init() {
    try {
      chrome.storage.local.get(['khatira_notes', 'khatira_theme'], (result) => {
        if (result.khatira_notes) {
          notes = result.khatira_notes;
        } else {
          // Default Sample Data (Ahli Sunnah & Academic Focus)
          notes = [
            {
              id: '1',
              title: 'ئىلمىي تەتقىقات ۋە ئەخلاق',
              category: 'ئىلمى تەتقىقاتلار',
              content: 'شەرقىي تۈركىستان خەلقىنىڭ قەدىر-قىممىتى ۋە مەدەنىيەت ئاساسلىرىنى قوغداشتا ئىلمىي تەتقىقاتلارنىڭ ئورنى ئىنتايىن يۇقىرى. ئەھلى سۈننەت ۋەلجامائەت ئەقىدىسى بويىچە بىلىم بىلەن ئامال بىرگە بولۇشى شەرت.',
              links: ['ئىلمىي ئاقارتىش', 'شەرقىي تۈركىستان'],
              createdAt: new Date().toLocaleDateString('ug-CN')
            }
          ];
          saveNotes();
        }

        if (result.khatira_theme === 'dark') {
          document.body.classList.add('dark-mode');
          themeToggle.textContent = '☀️';
        }

        renderNotes();
      });
    } catch (e) {
      console.error('Initialization error:', e);
    }
  }

  // Save Notes to Local Storage
  function saveNotes() {
    try {
      chrome.storage.local.set({ khatira_notes: notes }, () => {
        renderNotes();
      });
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }

  // Render Notes with Filtering & Search
  function renderNotes() {
    notesList.innerHTML = '';

    const filtered = notes.filter(note => {
      const matchesCategory = (currentCategory === 'ALL') || (note.category === currentCategory);
      const query = searchQuery.toLowerCase();
      const matchesSearch = note.title.toLowerCase().includes(query) ||
                            note.content.toLowerCase().includes(query) ||
                            (note.links && note.links.some(l => l.toLowerCase().includes(query)));
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      notesList.innerHTML = `<div class="empty-state">ھېچقانداق خاتىرە يوق.</div>`;
      return;
    }

    filtered.forEach(note => {
      const card = document.createElement('div');
      card.className = 'note-card';

      const linksHTML = (note.links || []).map(link => 
        `<span class="tag-link" data-tag="${escapeHTML(link)}">#${escapeHTML(link)}</span>`
      ).join(' ');

      card.innerHTML = `
        <div class="note-header">
          <span class="note-title">${escapeHTML(note.title)}</span>
          <span class="note-category">${escapeHTML(note.category)}</span>
        </div>
        <div class="note-content">${escapeHTML(note.content)}</div>
        <div class="note-footer">
          <div class="note-links">${linksHTML}</div>
          <div class="note-actions">
            <button class="action-btn edit-btn" data-id="${note.id}">تەھرىرلەش</button>
            <button class="action-btn delete-btn" data-id="${note.id}">ئۆچۈرۈش</button>
          </div>
        </div>
      `;

      notesList.appendChild(card);
    });

    // Attach Event Listeners to Card Buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => openEditModal(e.target.dataset.id));
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => deleteNote(e.target.dataset.id));
    });

    document.querySelectorAll('.tag-link').forEach(tag => {
      tag.addEventListener('click', (e) => {
        searchInput.value = e.target.dataset.tag;
        searchQuery = e.target.dataset.tag;
        renderNotes();
      });
    });
  }

  // Helper function to escape HTML
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[m];
    });
  }

  // Add / Edit Modal Controls
  addNoteBtn.addEventListener('click', () => {
    modalTitle.textContent = 'يېڭى خاتىرە قوشۇش';
    noteIdInput.value = '';
    noteForm.reset();
    noteModal.classList.add('active');
  });

  cancelModalBtn.addEventListener('click', () => {
    noteModal.classList.remove('active');
  });

  function openEditModal(id) {
    const note = notes.find(n => n.id === id);
    if (!note) return;

    modalTitle.textContent = 'خاتىرە تەھرىرلەش';
    noteIdInput.value = note.id;
    noteTitleInput.value = note.title;
    noteCategorySelect.value = note.category;
    noteContentInput.value = note.content;
    noteLinksInput.value = (note.links || []).join(', ');

    noteModal.classList.add('active');
  }

  // Form Submission
  noteForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const id = noteIdInput.value;
    const title = noteTitleInput.value.trim();
    const category = noteCategorySelect.value;
    const content = noteContentInput.value.trim();
    const linksRaw = noteLinksInput.value.trim();
    const links = linksRaw ? linksRaw.split(',').map(l => l.trim()).filter(l => l.length > 0) : [];

    if (!title || !content) return;

    if (id) {
      // Edit
      const noteIndex = notes.findIndex(n => n.id === id);
      if (noteIndex !== -1) {
        notes[noteIndex] = {
          ...notes[noteIndex],
          title,
          category,
          content,
          links
        };
      }
    } else {
      // Add New
      const newNote = {
        id: Date.now().toString(),
        title,
        category,
        content,
        links,
        createdAt: new Date().toLocaleDateString('ug-CN')
      };
      notes.unshift(newNote);
    }

    saveNotes();
    noteModal.classList.remove('active');
  });

  // Delete Note
  function deleteNote(id) {
    if (confirm('بۇ خاتىرىنى ئۆچۈرۈشنى جەزملەشتۈرەمسىز؟')) {
      notes = notes.filter(n => n.id !== id);
      saveNotes();
    }
  }

  // Search Filter
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderNotes();
  });

  // Category Filtering
  categoryPills.addEventListener('click', (e) => {
    if (e.target.classList.contains('pill')) {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
      e.target.classList.add('active');
      currentCategory = e.target.dataset.category;
      renderNotes();
    }
  });

  // Dark/Light Theme Toggle
  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    try {
      chrome.storage.local.set({ khatira_theme: isDark ? 'dark' : 'light' });
    } catch (e) {
      console.error('Theme save error:', e);
    }
  });

  // Export Local Data (JSON File Download)
  exportBtn.addEventListener('click', () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(notes, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `khatira_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error('Export error:', e);
    }
  });

  // Import Local Data
  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          notes = importedData;
          saveNotes();
          alert('مەلۇماتلار مۇۋەپپەقىيەتلىك كىرگۈزۈلدى!');
        } else {
          alert('ھۆججەت شەكلى نۇقسانلىق.');
        }
      } catch (err) {
        alert('JSON ھۆججەتنى ئوقۇشتا خاتالىق كۆرۈلدى.');
      }
    };
    reader.readAsText(file);
  });
});