(() => {
  'use strict';

  const TOKEN_KEY = 'portfolio.admin.token';
  const collectionNames = { projects: 'project', articles: 'blog article' };
  const fields = {
    projects: [
      { name: 'title', label: 'Title', required: true },
      { name: 'subtitle', label: 'Subtitle' },
      { name: 'summary', label: 'Summary', type: 'textarea', required: true, wide: true },
      { name: 'category', label: 'Category', required: true },
      { name: 'focus', label: 'Focus', required: true },
      { name: 'status', label: 'Status', required: true },
      { name: 'order', label: 'Display order', type: 'number', required: true },
      { name: 'stack', label: 'Technology stack', type: 'list', wide: true, help: 'One item per line.' },
      { name: 'tags', label: 'Tags', type: 'list', wide: true, help: 'One item per line.' },
      { name: 'repo', label: 'Repository URL', type: 'url', wide: true, help: 'Optional full http(s) URL.' },
      { name: 'docsPending', label: 'Documentation is pending', type: 'checkbox' },
      { name: 'overview', label: 'Overview', type: 'textarea', required: true, wide: true },
      { name: 'background', label: 'Background', type: 'textarea', wide: true },
      { name: 'areas', label: 'Areas', type: 'list', wide: true, help: 'One item per line.' },
      { name: 'objectives', label: 'Objectives', type: 'list', wide: true, help: 'One item per line.' },
      { name: 'role', label: 'Role', type: 'textarea', wide: true },
      { name: 'process', label: 'Process', type: 'textarea', wide: true },
      { name: 'challenges', label: 'Challenges', type: 'textarea', wide: true },
      { name: 'results', label: 'Results', type: 'textarea', wide: true },
      { name: 'outcomes', label: 'Outcomes', type: 'textarea', wide: true }
    ],
    articles: [
      { name: 'title', label: 'Title', required: true, wide: true },
      { name: 'description', label: 'Description', type: 'textarea', required: true, wide: true },
      { name: 'category', label: 'Category', required: true },
      { name: 'publishedAt', label: 'Publication date', type: 'date', required: true },
      { name: 'updatedAt', label: 'Updated date', type: 'date' },
      { name: 'relatedProject', label: 'Related project translation key' },
      { name: 'tags', label: 'Tags', type: 'list', wide: true, help: 'One item per line.' },
      { name: 'draft', label: 'Draft (hidden from the public site)', type: 'checkbox' }
    ]
  };

  const state = {
    token: readToken(),
    kind: 'projects',
    locale: 'id',
    items: [],
    editing: null,
    toastTimer: null
  };

  const elements = {
    loginPanel: document.querySelector('#login-panel'),
    loginForm: document.querySelector('#login-form'),
    loginButton: document.querySelector('#login-button'),
    loginStatus: document.querySelector('#login-status'),
    tokenInput: document.querySelector('#token-input'),
    workspace: document.querySelector('#workspace'),
    logoutButton: document.querySelector('#logout-button'),
    localeFilter: document.querySelector('#locale-filter'),
    refreshButton: document.querySelector('#refresh-button'),
    createButton: document.querySelector('#create-button'),
    kindButtons: [...document.querySelectorAll('.kind-button')],
    listStatus: document.querySelector('#list-status'),
    entryList: document.querySelector('#entry-list'),
    dialog: document.querySelector('#editor-dialog'),
    form: document.querySelector('#entry-form'),
    editorKicker: document.querySelector('#editor-kicker'),
    editorTitle: document.querySelector('#editor-title'),
    entryLocale: document.querySelector('#entry-locale'),
    entrySlug: document.querySelector('#entry-slug'),
    translationKey: document.querySelector('#entry-translation-key'),
    entryFields: document.querySelector('#entry-fields'),
    entryBody: document.querySelector('#entry-body'),
    editorStatus: document.querySelector('#editor-status'),
    closeEditorButton: document.querySelector('#close-editor-button'),
    cancelEditorButton: document.querySelector('#cancel-editor-button'),
    saveButton: document.querySelector('#save-button'),
    toast: document.querySelector('#toast')
  };

  function readToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  function storeToken(token) {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // The in-memory token still works when session storage is unavailable.
    }
  }

  async function api(path, options = {}) {
    const headers = { Accept: 'application/json' };
    if (state.token) {
      headers.Authorization = `Bearer ${state.token}`;
    }
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
    if (!response.ok) {
      const error = new Error(payload?.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function setStatus(element, message, isError = false) {
    element.textContent = message;
    element.classList.toggle('is-error', isError);
  }

  function showToast(message) {
    clearTimeout(state.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    state.toastTimer = setTimeout(() => {
      elements.toast.hidden = true;
    }, 4500);
  }

  function showWorkspace() {
    elements.loginPanel.hidden = true;
    elements.workspace.hidden = false;
  }

  function showLogin(message = '') {
    elements.workspace.hidden = true;
    elements.loginPanel.hidden = false;
    elements.tokenInput.value = '';
    setStatus(elements.loginStatus, message, Boolean(message));
    elements.tokenInput.focus();
  }

  async function signIn(token) {
    state.token = token;
    elements.loginButton.disabled = true;
    setStatus(elements.loginStatus, 'Connecting…');
    try {
      await loadEntries();
      storeToken(token);
      showWorkspace();
      setStatus(elements.loginStatus, '');
    } catch (error) {
      state.token = '';
      storeToken('');
      setStatus(elements.loginStatus, error.message, true);
    } finally {
      elements.loginButton.disabled = false;
    }
  }

  async function loadEntries() {
    setStatus(elements.listStatus, 'Loading entries…');
    elements.refreshButton.disabled = true;
    try {
      const result = await api(`/api/v1/admin/${state.kind}?locale=${encodeURIComponent(state.locale)}`);
      state.items = Array.isArray(result?.items) ? result.items : [];
      renderEntries();
      setStatus(elements.listStatus, `${state.items.length} ${state.items.length === 1 ? 'entry' : 'entries'}`);
    } catch (error) {
      setStatus(elements.listStatus, error.message, true);
      throw error;
    } finally {
      elements.refreshButton.disabled = false;
    }
  }

  function renderEntries() {
    elements.entryList.replaceChildren();
    if (state.items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = `No ${state.kind} exist for ${state.locale} yet.`;
      elements.entryList.append(empty);
      return;
    }

    for (const item of state.items) {
      const card = document.createElement('article');
      card.className = 'entry-card';

      const content = document.createElement('div');
      const heading = document.createElement('h3');
      heading.textContent = item.data.title || item.slug;
      if (state.kind === 'articles' && item.data.draft) {
        const badge = document.createElement('span');
        badge.className = 'badge';
        badge.textContent = 'Draft';
        heading.append(badge);
      }
      const summary = document.createElement('p');
      summary.textContent = item.data.summary || item.data.description || '';
      const meta = document.createElement('p');
      meta.className = 'entry-meta';
      const details = [`/${item.locale}/${item.slug}`, item.data.category || 'Uncategorized'];
      if (state.kind === 'articles') {
        details.push(item.data.publishedAt || 'No publication date');
      } else {
        details.push(`Order: ${item.data.order ?? 0}`);
      }
      meta.textContent = details.join(' · ');
      content.append(heading, summary, meta);

      const actions = document.createElement('div');
      actions.className = 'entry-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'button button-secondary';
      edit.textContent = 'Edit';
      edit.setAttribute('aria-label', `Edit ${item.data.title || item.slug}`);
      edit.addEventListener('click', () => openEditor(item));
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'button button-danger';
      remove.textContent = 'Delete';
      remove.setAttribute('aria-label', `Delete ${item.data.title || item.slug}`);
      remove.addEventListener('click', () => deleteEntry(item, remove));
      actions.append(edit, remove);
      card.append(content, actions);
      elements.entryList.append(card);
    }
  }

  function makeInput(field, value) {
    const wrapper = document.createElement('div');
    wrapper.className = field.type === 'checkbox' ? 'field checkbox-field' : 'field';
    if (field.wide) {
      wrapper.classList.add('field-wide');
    }
    const id = `field-${field.name}`;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = field.label;

    let input;
    if (field.type === 'textarea' || field.type === 'list') {
      input = document.createElement('textarea');
      input.rows = field.type === 'list' ? 4 : 5;
    } else {
      input = document.createElement('input');
      input.type = field.type || 'text';
      if (field.type === 'number') {
        input.step = '1';
      }
    }
    input.id = id;
    input.name = field.name;
    input.required = Boolean(field.required);
    input.dataset.field = field.name;
    input.dataset.type = field.type || 'text';

    if (field.type === 'checkbox') {
      input.checked = Boolean(value);
      wrapper.append(input, label);
    } else {
      if (field.type === 'list') {
        input.value = Array.isArray(value) ? value.join('\n') : '';
      } else {
        input.value = value ?? '';
      }
      wrapper.append(label, input);
    }

    if (field.help) {
      const help = document.createElement('small');
      help.textContent = field.help;
      wrapper.append(help);
    }
    return wrapper;
  }

  function openEditor(item = null) {
    state.editing = item;
    const isArticle = state.kind === 'articles';
    const name = collectionNames[state.kind];
    const data = item?.data || {};
    elements.form.reset();
    elements.entryFields.replaceChildren();
    setStatus(elements.editorStatus, '');
    elements.editorKicker.textContent = item ? `Edit ${state.locale}` : `New ${state.locale}`;
    elements.editorTitle.textContent = item ? (data.title || item.slug) : `New ${name}`;
    elements.entryLocale.value = item?.locale || state.locale;
    elements.entrySlug.value = item?.slug || '';
    elements.translationKey.value = data.translationKey || '';
    elements.entryLocale.disabled = Boolean(item);
    elements.entrySlug.disabled = Boolean(item);

    const defaults = isArticle
      ? { publishedAt: new Date().toISOString().slice(0, 10), draft: true }
      : { order: 0, docsPending: false };
    for (const field of fields[state.kind]) {
      const value = item ? data[field.name] : defaults[field.name];
      elements.entryFields.append(makeInput(field, value));
    }
    elements.entryBody.value = item?.body || '';
    elements.dialog.showModal();
    elements.entrySlug.focus();
  }

  function closeEditor() {
    if (!elements.saveButton.disabled) {
      elements.dialog.close();
    }
  }

  function formPayload() {
    const data = { translationKey: elements.translationKey.value.trim() };
    for (const input of elements.entryFields.querySelectorAll('[data-field]')) {
      const type = input.dataset.type;
      if (type === 'checkbox') {
        data[input.name] = input.checked;
      } else if (type === 'number') {
        data[input.name] = Number(input.value);
      } else if (type === 'list') {
        data[input.name] = input.value.split('\n').map((value) => value.trim()).filter(Boolean);
      } else {
        data[input.name] = input.value.trim();
      }
    }
    return {
      locale: elements.entryLocale.value,
      slug: elements.entrySlug.value.trim(),
      data,
      body: elements.entryBody.value
    };
  }

  async function saveEntry(event) {
    event.preventDefault();
    const payload = formPayload();
    const editing = state.editing;
    const path = editing
      ? `/api/v1/admin/${state.kind}/${encodeURIComponent(editing.locale)}/${encodeURIComponent(editing.slug)}`
      : `/api/v1/admin/${state.kind}`;
    elements.saveButton.disabled = true;
    setStatus(elements.editorStatus, 'Saving…');
    try {
      await api(path, { method: editing ? 'PUT' : 'POST', body: payload });
      elements.dialog.close();
      state.locale = payload.locale;
      elements.localeFilter.value = state.locale;
      await loadEntries();
      showToast(`${editing ? 'Updated' : 'Created'} ${payload.data.title || payload.slug}. Rebuild the frontend to publish.`);
    } catch (error) {
      setStatus(elements.editorStatus, error.message, true);
    } finally {
      elements.saveButton.disabled = false;
    }
  }

  async function deleteEntry(item, button) {
    const title = item.data.title || item.slug;
    if (!window.confirm(`Delete “${title}” (${item.locale}/${item.slug})? This cannot be undone.`)) {
      return;
    }
    button.disabled = true;
    setStatus(elements.listStatus, `Deleting ${title}…`);
    try {
      await api(`/api/v1/admin/${state.kind}/${encodeURIComponent(item.locale)}/${encodeURIComponent(item.slug)}`, { method: 'DELETE' });
      await loadEntries();
      showToast(`Deleted ${title}. Rebuild the frontend to publish.`);
    } catch (error) {
      setStatus(elements.listStatus, error.message, true);
      button.disabled = false;
    }
  }

  elements.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const token = elements.tokenInput.value.trim();
    if (token) {
      void signIn(token);
    }
  });

  elements.logoutButton.addEventListener('click', () => {
    state.token = '';
    state.items = [];
    storeToken('');
    showLogin('Signed out.');
  });

  for (const button of elements.kindButtons) {
    button.addEventListener('click', async () => {
      if (button.dataset.kind === state.kind) {
        return;
      }
      state.kind = button.dataset.kind;
      for (const candidate of elements.kindButtons) {
        candidate.setAttribute('aria-pressed', String(candidate === button));
      }
      elements.createButton.textContent = `New ${collectionNames[state.kind]}`;
      try {
        await loadEntries();
      } catch {
        // The list status already contains the request error.
      }
    });
  }

  elements.localeFilter.addEventListener('change', async () => {
    state.locale = elements.localeFilter.value;
    try {
      await loadEntries();
    } catch {
      // The list status already contains the request error.
    }
  });
  elements.refreshButton.addEventListener('click', async () => {
    try {
      await loadEntries();
    } catch {
      // The list status already contains the request error.
    }
  });
  elements.createButton.addEventListener('click', () => openEditor());
  elements.form.addEventListener('submit', saveEntry);
  elements.closeEditorButton.addEventListener('click', closeEditor);
  elements.cancelEditorButton.addEventListener('click', closeEditor);
  elements.dialog.addEventListener('cancel', (event) => {
    if (elements.saveButton.disabled) {
      event.preventDefault();
    }
  });

  if (state.token) {
    elements.tokenInput.value = state.token;
    void signIn(state.token);
  } else {
    elements.tokenInput.focus();
  }
})();
