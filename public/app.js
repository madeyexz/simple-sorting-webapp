// --- State ---
let questions = [];
let items = [];

// --- API helpers ---
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

async function loadData() {
  [questions, items] = await Promise.all([
    api('/api/questions'),
    api('/api/items'),
  ]);
  render();
}

// --- Render ---
function render() {
  renderPool();
  renderQuestions();
}

function renderPool() {
  const pool = document.getElementById('pool-items');
  // Items not assigned to ANY question go to the pool
  const assignedAnywhere = new Set();
  items.forEach(item => {
    if (Object.keys(item.assignments).length > 0) assignedAnywhere.add(item.id);
  });

  // Actually, show ALL items in pool always (they can be in multiple places)
  // But only show unassigned items for a given question in pool
  // Simpler: pool shows all items, user drags copies
  pool.innerHTML = '';
  items.forEach(item => {
    pool.appendChild(createChip(item, true));
  });
}

function renderQuestions() {
  const container = document.getElementById('questions-container');
  container.innerHTML = '';
  questions.forEach(q => {
    container.appendChild(createQuestionBlock(q));
  });
}

function createChip(item, showDelete = false) {
  const chip = document.createElement('div');
  chip.className = 'item-chip';
  chip.draggable = true;
  chip.dataset.itemId = item.id;
  chip.textContent = item.name;

  if (showDelete) {
    const del = document.createElement('button');
    del.className = 'btn-icon delete-item btn-danger';
    del.innerHTML = '&times;';
    del.title = 'Delete item';
    del.onclick = async (e) => {
      e.stopPropagation();
      await api(`/api/items/${item.id}`, 'DELETE');
      await loadData();
    };
    chip.appendChild(del);
  }

  chip.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', item.id);
    chip.classList.add('dragging');
  });
  chip.addEventListener('dragend', () => {
    chip.classList.remove('dragging');
  });

  return chip;
}

function createQuestionBlock(q) {
  const block = document.createElement('div');
  block.className = 'question-block';

  // Header
  const header = document.createElement('div');
  header.className = 'question-header';

  const text = document.createElement('div');
  text.className = 'question-text';
  text.textContent = q.text;
  text.ondblclick = () => startInlineEdit(text, q.text, async (val) => {
    await api(`/api/questions/${q.id}`, 'PUT', { text: val });
    await loadData();
  });

  const actions = document.createElement('div');
  actions.className = 'question-actions';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-icon';
  editBtn.innerHTML = '&#9998;';
  editBtn.title = 'Edit question';
  editBtn.onclick = () => startInlineEdit(text, q.text, async (val) => {
    await api(`/api/questions/${q.id}`, 'PUT', { text: val });
    await loadData();
  });

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-icon btn-danger';
  delBtn.innerHTML = '&times;';
  delBtn.title = 'Delete question';
  delBtn.onclick = async () => {
    if (confirm('Delete this question?')) {
      await api(`/api/questions/${q.id}`, 'DELETE');
      await loadData();
    }
  };

  actions.append(editBtn, delBtn);
  header.append(text, actions);
  block.appendChild(header);

  // Categories
  const cats = document.createElement('div');
  cats.className = 'question-categories';

  q.categories.forEach((cat, catIdx) => {
    const row = document.createElement('div');
    row.className = 'category-row';

    const label = document.createElement('div');
    label.className = 'category-label';

    const labelText = document.createElement('span');
    labelText.textContent = cat;
    labelText.ondblclick = () => startInlineEdit(labelText, cat, async (val) => {
      // Rename category
      const newCats = [...q.categories];
      const oldName = newCats[catIdx];
      newCats[catIdx] = val;
      await api(`/api/questions/${q.id}`, 'PUT', { categories: newCats });
      // Update assignments
      for (const item of items) {
        if (item.assignments[q.id] === oldName) {
          await api('/api/assign', 'POST', { itemId: item.id, questionId: q.id, category: val });
        }
      }
      await loadData();
    });

    const delCat = document.createElement('button');
    delCat.className = 'btn-icon btn-danger';
    delCat.innerHTML = '&times;';
    delCat.title = 'Delete category';
    delCat.onclick = async () => {
      const newCats = q.categories.filter((_, i) => i !== catIdx);
      await api(`/api/questions/${q.id}`, 'PUT', { categories: newCats });
      // Unassign items from this category
      for (const item of items) {
        if (item.assignments[q.id] === cat) {
          await api('/api/assign', 'POST', { itemId: item.id, questionId: q.id, category: null });
        }
      }
      await loadData();
    };

    label.append(labelText, delCat);

    const zone = document.createElement('div');
    zone.className = 'drop-zone category-items';
    zone.dataset.questionId = q.id;
    zone.dataset.category = cat;

    // Drop zone events
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const itemId = e.dataTransfer.getData('text/plain');
      await api('/api/assign', 'POST', { itemId, questionId: q.id, category: cat });
      await loadData();
    });

    // Render items in this category
    items.filter(i => i.assignments[q.id] === cat).forEach(item => {
      zone.appendChild(createChip(item));
    });

    row.append(label, zone);
    cats.appendChild(row);
  });

  // Add category button
  const addRow = document.createElement('div');
  addRow.className = 'add-category-row';
  const addBtn = document.createElement('button');
  addBtn.className = 'add-category-btn';
  addBtn.textContent = '+ Add category';
  addBtn.onclick = () => {
    // Replace button with inline input
    const input = document.createElement('input');
    input.className = 'inline-input';
    input.placeholder = 'Category name...';
    input.style.fontSize = '13px';
    addRow.replaceChild(input, addBtn);
    input.focus();

    const save = async () => {
      const val = input.value.trim();
      if (val) {
        const newCats = [...q.categories, val];
        await api(`/api/questions/${q.id}`, 'PUT', { categories: newCats });
        await loadData();
      } else {
        addRow.replaceChild(addBtn, input);
      }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
      if (e.key === 'Escape') addRow.replaceChild(addBtn, input);
    });
    input.addEventListener('blur', save);
  };
  addRow.appendChild(addBtn);
  cats.appendChild(addRow);

  block.appendChild(cats);

  // Also add a drop zone for "unassign" — dropping back removes assignment
  // Actually handled by pool drop

  return block;
}

function startInlineEdit(el, currentValue, onSave) {
  const input = document.createElement('input');
  input.className = 'inline-input';
  input.value = currentValue;
  input.style.fontSize = getComputedStyle(el).fontSize;
  input.style.fontWeight = getComputedStyle(el).fontWeight;

  const parent = el.parentNode;
  parent.replaceChild(input, el);
  input.focus();
  input.select();

  const save = async () => {
    const val = input.value.trim();
    if (val && val !== currentValue) {
      await onSave(val);
    } else {
      parent.replaceChild(el, input);
    }
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { input.blur(); }
    if (e.key === 'Escape') { parent.replaceChild(el, input); }
  });
  input.addEventListener('blur', save);
}

// --- Pool drop (unassign) ---
const poolZone = document.getElementById('pool-items');
poolZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  poolZone.classList.add('drag-over');
});
poolZone.addEventListener('dragleave', () => poolZone.classList.remove('drag-over'));
poolZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  poolZone.classList.remove('drag-over');
  // Dropping on pool doesn't unassign (items live in pool always)
  // Could add question-specific unassign if needed
});

// --- Modal ---
function showModal(title, fields, onSave) {
  const overlay = document.getElementById('modal-overlay');
  const titleEl = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  const saveBtn = document.getElementById('modal-save');
  const cancelBtn = document.getElementById('modal-cancel');

  titleEl.textContent = title;
  body.innerHTML = '';

  fields.forEach(f => {
    const label = document.createElement('label');
    label.textContent = f.label;
    body.appendChild(label);

    if (f.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.id = `modal-field-${f.key}`;
      ta.placeholder = f.placeholder || '';
      ta.value = f.value || '';
      body.appendChild(ta);
    } else {
      const input = document.createElement('input');
      input.id = `modal-field-${f.key}`;
      input.type = f.type || 'text';
      input.placeholder = f.placeholder || '';
      input.value = f.value || '';
      body.appendChild(input);
    }

    if (f.hint) {
      const hint = document.createElement('div');
      hint.className = 'hint';
      hint.textContent = f.hint;
      body.appendChild(hint);
    }
  });

  overlay.classList.remove('hidden');

  // Focus first input
  const firstInput = body.querySelector('input, textarea');
  if (firstInput) setTimeout(() => firstInput.focus(), 50);

  // Handle enter key on inputs
  body.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
    });
  });

  return new Promise((resolve) => {
    const close = () => {
      overlay.classList.add('hidden');
      saveBtn.onclick = null;
      cancelBtn.onclick = null;
    };

    saveBtn.onclick = () => {
      const values = {};
      fields.forEach(f => {
        values[f.key] = document.getElementById(`modal-field-${f.key}`).value.trim();
      });
      close();
      resolve(values);
    };

    cancelBtn.onclick = () => {
      close();
      resolve(null);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        close();
        resolve(null);
      }
    };
  });
}

// --- Button handlers ---
document.getElementById('btn-add-item').onclick = async () => {
  const result = await showModal('Add Item', [
    { key: 'name', label: 'Name', placeholder: 'Company or project name...' },
  ]);
  if (result && result.name) {
    // Support comma-separated batch add
    const names = result.name.split(',').map(s => s.trim()).filter(Boolean);
    for (const name of names) {
      await api('/api/items', 'POST', { name });
    }
    await loadData();
  }
};

document.getElementById('btn-add-question').onclick = async () => {
  const result = await showModal('Add Question', [
    { key: 'text', label: 'Question', type: 'textarea', placeholder: 'e.g., Did I feel genuine curiosity, or was I performing interest?' },
    { key: 'categories', label: 'Categories', placeholder: 'e.g., Yes, No, Maybe', hint: 'Comma-separated list of categories' },
  ]);
  if (result && result.text) {
    const categories = result.categories
      ? result.categories.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    await api('/api/questions', 'POST', { text: result.text, categories });
    await loadData();
  }
};

// --- Init ---
loadData();
