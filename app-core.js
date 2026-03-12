(function () {
  const AUTH_KEY = 'cc_auth';
  const AUTH_USER_KEY = 'cc_auth_user';
  const AUTH_ROLE_KEY = 'cc_auth_role';
  const PROCESS_KEY = 'cc_processos';
  const PROFILE_PREFIX = 'cc_profile_';
  const ALMOX_ITEM_KEY = 'cc_almox_itens';
  const ALMOX_MOV_KEY = 'cc_almox_movimentacoes';
  const ALMOX_DEL_KEY = 'cc_almox_exclusoes';
  const DEMO_PROCESS_CLEANUP_KEY = 'cc_demo_process_cleanup_done';

  function requireAuth() {
    if (localStorage.getItem(AUTH_KEY) !== 'ok') {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  function getCurrentUsername() {
    return localStorage.getItem(AUTH_USER_KEY) || 'admin.institucional';
  }

  function getCurrentRole() {
    return localStorage.getItem(AUTH_ROLE_KEY) || 'usuario';
  }

  function cleanupLegacyDemoProcessos() {
    if (sessionStorage.getItem(DEMO_PROCESS_CLEANUP_KEY) === 'done') return;
    sessionStorage.setItem(DEMO_PROCESS_CLEANUP_KEY, 'done');
    if (!window.BackendAPI || typeof window.BackendAPI.purgeLegacyDemoProcessos !== 'function') return;
    window.BackendAPI.purgeLegacyDemoProcessos().catch(function () {
      sessionStorage.removeItem(DEMO_PROCESS_CLEANUP_KEY);
    });
  }

  function profileKey(username) {
    return PROFILE_PREFIX + username;
  }

  function getProfile(username) {
    const user = username || getCurrentUsername();
    try {
      const raw = localStorage.getItem(profileKey(user));
      if (!raw) return defaultProfile();
      const parsed = JSON.parse(raw);
      return {
        nome: parsed.nome || '',
        cpf: parsed.cpf || '',
        matricula: parsed.matricula || '',
        funcao: parsed.funcao || '',
        foto: parsed.foto || ''
      };
    } catch (_error) {
      return defaultProfile();
    }
  }

  function saveProfile(username, data) {
    const user = username || getCurrentUsername();
    const current = getProfile(user);
    const merged = {
      nome: data.nome || current.nome || '',
      cpf: data.cpf || '',
      matricula: data.matricula || '',
      funcao: data.funcao || '',
      foto: data.foto || ''
    };

    localStorage.setItem(profileKey(user), JSON.stringify(merged));
    return merged;
  }

  function defaultProfile() {
    return {
      nome: '',
      cpf: '',
      matricula: '',
      funcao: '',
      foto: ''
    };
  }

  function getDisplayIdentity() {
    const username = getCurrentUsername();
    const profile = getProfile(username);
    return {
      username: username,
      nome: profile.nome || username,
      foto: profile.foto || ''
    };
  }

  function applyIdentity(identity) {
    const safeIdentity = identity || getDisplayIdentity();
    const nameEl = document.getElementById('top-user-name');
    const avatarEl = document.getElementById('top-user-avatar');
    const avatarFallbackEl = document.getElementById('top-user-fallback');

    if (nameEl) {
      if (String(safeIdentity.nome || '').trim()) {
        nameEl.textContent = 'Ol\u00e1, ' + firstName(safeIdentity.nome) + '!';
      } else {
        nameEl.textContent = safeIdentity.username;
      }
    }

    if (avatarEl && avatarFallbackEl) {
      if (safeIdentity.foto) {
        avatarEl.src = safeIdentity.foto;
        avatarEl.hidden = false;
        avatarFallbackEl.hidden = true;
      } else {
        avatarEl.hidden = true;
        avatarFallbackEl.hidden = false;
        avatarFallbackEl.textContent = initials(safeIdentity.nome || safeIdentity.username);
      }
    }
  }

  function ensureUserMenu() {
    const chip = document.querySelector('.user-chip-wrap');
    const topbarRight = document.querySelector('.dashboard-topbar-right');
    if (!chip || !topbarRight) return null;

    let wrapper = topbarRight.querySelector('.user-menu');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'user-menu';
      topbarRight.insertBefore(wrapper, chip);
      wrapper.appendChild(chip);
    }

    chip.classList.add('user-menu-trigger');
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-haspopup', 'menu');
    chip.setAttribute('aria-expanded', 'false');

    if (!chip.querySelector('.user-menu-chevron')) {
      const chevron = document.createElement('span');
      chevron.className = 'user-menu-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      chevron.innerHTML = '<svg viewBox="0 0 20 20" focusable="false"><path d="m5 7 5 6 5-6"></path></svg>';
      chip.appendChild(chevron);
    }

    let menu = document.getElementById('top-user-menu');
    if (!menu) {
      menu = document.createElement('div');
      menu.id = 'top-user-menu';
      menu.className = 'user-menu-dropdown';
      menu.hidden = true;
      wrapper.appendChild(menu);
    }

    const items = [
      '<a class="user-menu-link" href="perfil.html">Perfil</a>'
    ];

    if (getCurrentRole() === 'senior_admin') {
      items.push('<a class="user-menu-link user-menu-link-admin" href="admin-panel.html">Painel do Administrador</a>');
    }

    menu.innerHTML = items.join('');
    return { chip: chip, menu: menu, wrapper: wrapper };
  }

  function bindUserMenu() {
    const refs = ensureUserMenu();
    if (!refs || refs.chip.dataset.bound === 'true') return;

    refs.chip.dataset.bound = 'true';

    function closeMenu() {
      refs.menu.hidden = true;
      refs.wrapper.classList.remove('open');
      refs.chip.setAttribute('aria-expanded', 'false');
    }

    function toggleMenu() {
      const willOpen = refs.menu.hidden;
      refs.menu.hidden = !willOpen;
      refs.wrapper.classList.toggle('open', willOpen);
      refs.chip.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    }

    refs.chip.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      toggleMenu();
    });

    refs.chip.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMenu();
      }
      if (event.key === 'Escape') {
        closeMenu();
      }
    });

    document.addEventListener('click', function (event) {
      if (!refs.wrapper.contains(event.target)) closeMenu();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeMenu();
    });
  }

  function ensureResponsiveSidebar() {
    const layout = document.querySelector('.dashboard-layout');
    const sidebar = document.querySelector('.sidebar');
    const sidebarBrand = document.querySelector('.sidebar-brand');
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (!layout || !sidebar || !sidebarBrand || !sidebarNav) return null;

    if (!sidebarNav.id) sidebarNav.id = 'sidebar-nav';

    let toggle = document.getElementById('sidebar-toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.id = 'sidebar-toggle';
      toggle.className = 'sidebar-toggle';
      toggle.setAttribute('aria-controls', sidebarNav.id);
      toggle.innerHTML = '<span class="sidebar-toggle-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path></svg></span><span class="sidebar-toggle-label">Menu</span>';
      sidebarBrand.appendChild(toggle);
    }

    return { layout: layout, sidebar: sidebar, toggle: toggle, nav: sidebarNav };
  }

  function bindResponsiveSidebar() {
    const refs = ensureResponsiveSidebar();
    if (!refs || refs.layout.dataset.sidebarBound === 'true') return;

    refs.layout.dataset.sidebarBound = 'true';

    function syncSidebar() {
      const compact = window.innerWidth <= 1120;
      const mobile = window.innerWidth <= 760;
      const mode = compact ? (mobile ? 'mobile' : 'compact') : 'full';
      const lastMode = refs.sidebar.dataset.sidebarMode || '';

      document.body.classList.toggle('dashboard-has-collapsible-sidebar', compact);
      refs.toggle.hidden = !compact;

      if (!compact) {
        refs.sidebar.classList.remove('is-collapsed');
      } else if (!refs.sidebar.dataset.sidebarInitialized || lastMode !== mode) {
        refs.sidebar.classList.toggle('is-collapsed', mobile);
      }

      refs.sidebar.dataset.sidebarInitialized = 'true';
      refs.sidebar.dataset.sidebarMode = mode;
      refs.toggle.setAttribute('aria-expanded', refs.sidebar.classList.contains('is-collapsed') ? 'false' : 'true');
    }

    refs.toggle.addEventListener('click', function () {
      const willCollapse = !refs.sidebar.classList.contains('is-collapsed');
      refs.sidebar.classList.toggle('is-collapsed', willCollapse);
      refs.toggle.setAttribute('aria-expanded', willCollapse ? 'false' : 'true');
    });

    refs.nav.addEventListener('click', function (event) {
      const link = event.target.closest('a');
      if (!link || window.innerWidth > 760) return;
      refs.sidebar.classList.add('is-collapsed');
      refs.toggle.setAttribute('aria-expanded', 'false');
    });

    window.addEventListener('resize', syncSidebar);
    syncSidebar();
  }

  async function logout() {
    try {
      if (window.BackendAPI && typeof window.BackendAPI.signOut === 'function') {
        await window.BackendAPI.signOut();
      } else {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(AUTH_ROLE_KEY);
      }
    } catch (_error) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      localStorage.removeItem(AUTH_ROLE_KEY);
    }
    window.location.href = 'index.html';
  }

  function ensureSystemNoticesDialog() {
    let dialog = document.getElementById('system-notices-dialog');
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.id = 'system-notices-dialog';
    dialog.className = 'confirm-dialog system-notices-dialog';
    dialog.innerHTML = '' +
      '<form method="dialog" class="confirm-dialog-form system-notices-dialog-form">' +
        '<div class="system-notices-dialog-head">' +
          '<div><h3>Alertas e novidades do sistema</h3><p>Acompanhe comunicados funcionais, ajustes publicados e orienta\u00e7\u00f5es do SIAC.</p></div>' +
          '<span class="tag">Central institucional</span>' +
        '</div>' +
        '<label class="system-notice-bulk-read-toggle">' +
          '<input type="checkbox" id="mark-all-system-notices-read" />' +
          '<span>Marcar todas como lidas</span>' +
        '</label>' +
        '<div id="system-notices-list" class="system-notices-list"></div>' +
        '<div class="form-actions"><button type="button" id="close-system-notices" class="btn btn-primary">Fechar</button></div>' +
      '</form>';
    document.body.appendChild(dialog);
    return dialog;
  }

  function noticeTypeMeta(type) {
    const normalized = String(type || 'aviso').trim().toLowerCase();
    if (normalized === 'alerta') return { label: 'Alerta', className: 'alert' };
    if (normalized === 'novidade') return { label: 'Novidade', className: 'news' };
    return { label: 'Aviso', className: 'info' };
  }

  function renderSystemNotices(list) {
    const host = document.getElementById('system-notices-list');
    if (!host) return;

    if (!Array.isArray(list) || list.length === 0) {
      host.innerHTML = '<div class="system-notice-empty">Nenhuma novidade publicada no momento.</div>';
      return;
    }

    host.innerHTML = list.map(function (item) {
      const meta = noticeTypeMeta(item.tipo);
      const dateBase = item.atualizadoEm || item.criadoEm;
      const when = dateBase ? formatDateTime(dateBase) : 'Agora mesmo';
      return '' +
        '<article class="system-notice-card">' +
          '<div class="system-notice-card-top">' +
            '<span class="system-notice-type ' + meta.className + '">' + escapeHtml(meta.label) + '</span>' +
            '<time class="system-notice-time">' + escapeHtml(when) + '</time>' +
          '</div>' +
          '<h4>' + escapeHtml(item.titulo || 'Comunicado') + '</h4>' +
          '<p>' + escapeHtml(item.conteudo || '').replace(/\n/g, '<br>') + '</p>' +
          '<label class="system-notice-read-toggle">' +
            '<input type="checkbox" data-read-notice-id="' + escapeHtml(String(item.id || '')) + '" ' + (item.lida ? 'checked ' : '') + '/>' +
            '<span>Marcar como lida</span>' +
          '</label>' +
        '</article>';
    }).join('');
  }

  async function refreshSystemNoticeCenter() {
    const trigger = document.getElementById('system-notices-trigger');
    const badge = document.getElementById('system-notices-badge');
    if (!trigger || !window.BackendAPI || typeof window.BackendAPI.listSystemNotices !== 'function') return;

    try {
      const notices = await window.BackendAPI.listSystemNotices(false);
      renderSystemNotices(notices);
      const total = Array.isArray(notices) ? notices.filter(function (item) { return !item.lida; }).length : 0;
      if (badge) {
        badge.hidden = total === 0;
        badge.textContent = total > 9 ? '9+' : String(total);
      }
      const bulkReadToggle = document.getElementById('mark-all-system-notices-read');
      if (bulkReadToggle) {
        bulkReadToggle.checked = Array.isArray(notices) && notices.length > 0 && total === 0;
        bulkReadToggle.disabled = !Array.isArray(notices) || notices.length === 0;
      }
      trigger.classList.toggle('has-items', total > 0);
    } catch (_error) {
      renderSystemNotices([]);
      if (badge) {
        badge.hidden = true;
        badge.textContent = '';
      }
      const bulkReadToggle = document.getElementById('mark-all-system-notices-read');
      if (bulkReadToggle) {
        bulkReadToggle.checked = false;
        bulkReadToggle.disabled = true;
      }
      trigger.classList.remove('has-items');
    }
  }

  function bindSystemNoticeCenter() {
    const trigger = document.getElementById('system-notices-trigger');
    if (!trigger || trigger.dataset.bound === 'true') return;

    const dialog = ensureSystemNoticesDialog();
    const closeBtn = dialog.querySelector('#close-system-notices');

    trigger.dataset.bound = 'true';
    trigger.addEventListener('click', async function () {
      await refreshSystemNoticeCenter();
      if (typeof dialog.showModal === 'function') dialog.showModal();
    });

    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        if (typeof dialog.close === 'function') dialog.close();
      });
    }

    dialog.addEventListener('change', async function (event) {
      const bulkToggle = event.target.closest('#mark-all-system-notices-read');
      if (bulkToggle && window.BackendAPI && typeof window.BackendAPI.markSystemNoticeRead === 'function' && typeof window.BackendAPI.listSystemNotices === 'function') {
        if (!bulkToggle.checked) {
          await refreshSystemNoticeCenter();
          return;
        }
        bulkToggle.disabled = true;
        try {
          const notices = await window.BackendAPI.listSystemNotices(false);
          const unread = Array.isArray(notices) ? notices.filter(function (item) { return !item.lida; }) : [];
          await Promise.all(unread.map(function (item) {
            return window.BackendAPI.markSystemNoticeRead(item.id, true);
          }));
          await refreshSystemNoticeCenter();
        } catch (_error) {
          bulkToggle.checked = false;
        } finally {
          bulkToggle.disabled = false;
        }
        return;
      }

      const checkbox = event.target.closest('input[data-read-notice-id]');
      if (!checkbox || !window.BackendAPI || typeof window.BackendAPI.markSystemNoticeRead !== 'function') return;
      checkbox.disabled = true;
      try {
        await window.BackendAPI.markSystemNoticeRead(checkbox.getAttribute('data-read-notice-id'), checkbox.checked);
        await refreshSystemNoticeCenter();
      } catch (_error) {
        checkbox.checked = !checkbox.checked;
      } finally {
        checkbox.disabled = false;
      }
    });
    dialog.addEventListener('click', function (event) {
      if (event.target === dialog && typeof dialog.close === 'function') dialog.close();
    });
  }

  function initShell(activeNav) {
    if (!requireAuth()) return;
    document.body.classList.add('shell-loading');

    const identity = getDisplayIdentity();
    const logoutBtn = document.getElementById('logout');

    function finalizeShell() {
      applyIdentity(identity);

      if (window.BackendAPI && typeof window.BackendAPI.getProfile === 'function') {
        window.BackendAPI.getProfile().then(function (profile) {
          const hydrated = {
            username: getCurrentUsername(),
            nome: String(profile && profile.nome ? profile.nome : identity.nome || ''),
            foto: String(profile && profile.foto ? profile.foto : identity.foto || '')
          };
          saveProfile(hydrated.username, hydrated);
          applyIdentity(hydrated);
        }).catch(function () {
          applyIdentity(identity);
        });
      }

      if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
      }

      bindUserMenu();
      bindResponsiveSidebar();
      bindSystemNoticeCenter();
      refreshSystemNoticeCenter();

      document.querySelectorAll('[data-nav]').forEach(function (link) {
        const nav = link.getAttribute('data-nav');
        link.classList.toggle('active', nav === activeNav);
      });

      cleanupLegacyDemoProcessos();
      document.body.classList.remove('shell-loading');
    }

    if (window.BackendAPI && typeof window.BackendAPI.restoreSession === 'function') {
      window.BackendAPI.restoreSession().then(function (isValid) {
        if (!isValid) {
          window.location.href = 'index.html';
          return;
        }
        finalizeShell();
      }).catch(function () {
        window.location.href = 'index.html';
      });
      return;
    }

    finalizeShell();
  }

  function firstName(name) {
    const cleaned = String(name || '').trim();
    if (!cleaned) return '';
    return cleaned.split(/\s+/)[0];
  }

  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function loadProcessos() {
    try {
      const raw = localStorage.getItem(PROCESS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveProcessos(list) {
    localStorage.setItem(PROCESS_KEY, JSON.stringify(list));
  }

  function addProcesso(item) {
    const list = loadProcessos();
    list.push(item);
    saveProcessos(list);
  }

  function removeProcesso(id) {
    const list = loadProcessos().filter(function (item) { return item.id !== id; });
    saveProcessos(list);
    return list;
  }

  function hasDuplicateProcesso(numeroProcesso, numeroContrato) {
    const np = normalizeKey(numeroProcesso);
    const nc = normalizeKey(numeroContrato);

    return loadProcessos().some(function (item) {
      return normalizeKey(item.processoSei) === np || normalizeKey(item.numeroContrato) === nc;
    });
  }

  function normalizeKey(value) {
    return String(value || '').trim().toLowerCase();
  }

  function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function dateValue(str) {
    return startOfDay(new Date(str + 'T00:00:00'));
  }

  function daysBetween(a, b) {
    return Math.ceil((b.getTime() - a.getTime()) / 86400000);
  }

  function getStatus(terminoVigencia) {
    const diff = daysBetween(startOfDay(new Date()), dateValue(terminoVigencia));
    if (diff < 0) return { type: 'danger', label: 'Vencido', dias: diff };
    if (diff <= 90) return { type: 'warning', label: 'A vencer', dias: diff };
    return { type: 'ok', label: 'Vigente', dias: diff };
  }

  function getProcessStatus(item) {
    const currentStatus = String(item && item.status ? item.status : '').trim().toLowerCase();
    if (currentStatus === 'encerrado') {
      return { type: 'closed', label: 'Encerrado', dias: null };
    }

    const base = getStatus(item.fimVigencia || item.terminoVigencia);

    if (base.type === 'danger') {
      return { type: 'danger', label: 'Vencido', dias: base.dias };
    }
    if (base.type === 'warning') {
      return { type: 'warning', label: 'A vencer', dias: base.dias };
    }
    return { type: 'ok', label: 'Vigente', dias: base.dias };
  }

  function formatDate(str) {
    const d = dateValue(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return day + '/' + month + '/' + d.getFullYear();
  }

  function formatDateTime(str) {
    const date = new Date(str);
    if (!Number.isFinite(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return day + '/' + month + '/' + date.getFullYear() + ' \u00e0s ' + hours + ':' + minutes;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function formatCurrencyBrl(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function parseCurrencyBrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return NaN;
    const normalized = raw
      .replace(/\s/g, '')
      .replace(/R\$/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .replace(/[^0-9.-]/g, '');
    const num = Number(normalized);
    return Number.isFinite(num) ? num : NaN;
  }

  function formatCurrencyInput(value) {
    const digits = onlyDigits(value);
    if (!digits) return '';
    return formatCurrencyBrl(Number(digits) / 100);
  }

  function formatCpf(value) {
    const digits = onlyDigits(value).slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.replace(/(\d{3})(\d+)/, '$1.$2');
    if (digits.length <= 9) return digits.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3');
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
  }

  function isValidCpf(value) {
    const cpf = onlyDigits(value);
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
    let digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    if (digit !== Number(cpf[9])) return false;

    sum = 0;
    for (let j = 0; j < 10; j += 1) sum += Number(cpf[j]) * (11 - j);
    digit = (sum * 10) % 11;
    if (digit === 10) digit = 0;
    return digit === Number(cpf[10]);
  }


  function loadAlmoxItems() {
    try {
      const raw = localStorage.getItem(ALMOX_ITEM_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveAlmoxItems(list) {
    localStorage.setItem(ALMOX_ITEM_KEY, JSON.stringify(list));
  }

  function loadAlmoxMovements() {
    try {
      const raw = localStorage.getItem(ALMOX_MOV_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveAlmoxMovements(list) {
    localStorage.setItem(ALMOX_MOV_KEY, JSON.stringify(list));
  }

  function loadAlmoxDeletes() {
    try {
      const raw = localStorage.getItem(ALMOX_DEL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveAlmoxDeletes(list) {
    localStorage.setItem(ALMOX_DEL_KEY, JSON.stringify(list));
  }

  function normalizeItemName(value) {
    return String(value || '').trim().toLowerCase();
  }

  function addAlmoxItem(payload) {
    const currentUser = getCurrentUsername();
    const nome = String(payload.nome || '').trim();
    const categoria = String(payload.categoria || '').trim();
    const unidadeMedida = String(payload.unidadeMedida || '').trim();
    const localEstoque = String(payload.localEstoque || '').trim() || 'SEAP/ALMOXARIFADO';
    const observacao = String(payload.observacao || '').trim();
    const estoqueAtual = Number(payload.estoqueAtual);
    const estoqueMinimo = Number(payload.estoqueMinimo);

    if (!nome) throw new Error('Informe o nome do item.');
    if (!unidadeMedida) throw new Error('Informe a unidade de medida.');
    if (!Number.isFinite(estoqueAtual) || estoqueAtual < 0) throw new Error('Quantidade inicial inv\u00e1lida.');
    if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) throw new Error('Estoque m\u00ednimo inv\u00e1lido.');

    const items = loadAlmoxItems();
    if (items.some(function (item) { return normalizeItemName(item.nome) === normalizeItemName(nome); })) {
      throw new Error('J\u00e1 existe item cadastrado com este nome.');
    }

    const now = new Date().toISOString();
    const item = {
      id: 'almox-' + Date.now(),
      nome: nome,
      categoria: categoria,
      unidadeMedida: unidadeMedida,
      localEstoque: localEstoque,
      estoqueAtual: estoqueAtual,
      estoqueMinimo: estoqueMinimo,
      observacao: observacao,
      criadoPor: currentUser,
      criadoEm: now,
      ultimaMovimentacaoPor: currentUser,
      ultimaMovimentacaoEm: now
    };

    items.push(item);
    saveAlmoxItems(items);

    if (estoqueAtual > 0) {
      const movs = loadAlmoxMovements();
      movs.unshift({
        id: 'mov-' + Date.now(),
        itemId: item.id,
        itemNome: item.nome,
        tipo: 'entrada',
        quantidade: estoqueAtual,
        motivo: 'Saldo inicial no cadastro',
        usuario: currentUser,
        dataHora: now
      });
      saveAlmoxMovements(movs.slice(0, 500));
    }

    return item;
  }

  function moveAlmoxItem(payload) {
    const currentUser = getCurrentUsername();
    const itemId = String(payload.itemId || '').trim();
    const tipo = String(payload.tipo || '').trim();
    const motivo = String(payload.motivo || '').trim();
    const quantidade = Number(payload.quantidade);

    if (!itemId) throw new Error('Selecione o item.');
    if (tipo !== 'entrada' && tipo !== 'saida') throw new Error('Tipo de movimenta\u00e7\u00e3o inv\u00e1lido.');
    if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('Quantidade inv\u00e1lida.');
    if (!motivo) throw new Error('Informe o motivo da movimenta\u00e7\u00e3o.');

    const items = loadAlmoxItems();
    const idx = items.findIndex(function (item) { return item.id === itemId; });
    if (idx < 0) throw new Error('Item n\u00e3o encontrado.');

    const selected = items[idx];
    if (tipo === 'saida' && quantidade > Number(selected.estoqueAtual)) {
      throw new Error('Quantidade de sa\u00edda maior que o estoque dispon\u00edvel.');
    }

    const now = new Date().toISOString();
    const novoEstoque = tipo === 'entrada'
      ? Number(selected.estoqueAtual) + quantidade
      : Number(selected.estoqueAtual) - quantidade;

    items[idx] = {
      id: selected.id,
      nome: selected.nome,
      categoria: selected.categoria,
      unidadeMedida: selected.unidadeMedida,
      localEstoque: selected.localEstoque || 'SEAP/ALMOXARIFADO',
      estoqueAtual: novoEstoque,
      estoqueMinimo: Number(selected.estoqueMinimo) || 0,
      observacao: selected.observacao || '',
      criadoPor: selected.criadoPor || currentUser,
      criadoEm: selected.criadoEm || now,
      ultimaMovimentacaoPor: currentUser,
      ultimaMovimentacaoEm: now
    };
    saveAlmoxItems(items);

    const movs = loadAlmoxMovements();
    movs.unshift({
      id: 'mov-' + Date.now(),
      itemId: selected.id,
      itemNome: selected.nome,
      tipo: tipo,
      quantidade: quantidade,
      motivo: motivo,
      usuario: currentUser,
      dataHora: now
    });
    saveAlmoxMovements(movs.slice(0, 500));

    return items[idx];
  }

  function deleteAlmoxItem(itemId) {
    const currentUser = getCurrentUsername();
    const id = String(itemId || '').trim();
    if (!id) throw new Error('Item inv\u00e1lido para exclus\u00e3o.');

    const items = loadAlmoxItems();
    const selected = items.find(function (item) { return item.id === id; });
    if (!selected) throw new Error('Item n\u00e3o encontrado para exclus\u00e3o.');

    const remaining = items.filter(function (item) { return item.id !== id; });
    saveAlmoxItems(remaining);

    const now = new Date().toISOString();
    const deletes = loadAlmoxDeletes();
    deletes.unshift({
      id: 'del-' + Date.now(),
      itemId: selected.id,
      itemNome: selected.nome,
      quantidadeNoMomento: Number(selected.estoqueAtual) || 0,
      unidadeMedida: selected.unidadeMedida || '',
      usuario: currentUser,
      dataHora: now
    });
    saveAlmoxDeletes(deletes.slice(0, 500));

    return selected;
  }
  window.AppCore = {
    initShell: initShell,
    getCurrentUsername: getCurrentUsername,
    getCurrentRole: getCurrentRole,
    getProfile: getProfile,
    saveProfile: saveProfile,
    getStatus: getStatus,
    getProcessStatus: getProcessStatus,
    formatDate: formatDate,
    escapeHtml: escapeHtml,
    dateValue: dateValue,
    startOfDay: startOfDay,
    daysBetween: daysBetween,
    hasDuplicateProcesso: hasDuplicateProcesso,
    onlyDigits: onlyDigits,
    formatCpf: formatCpf,
    isValidCpf: isValidCpf,
    formatCurrencyBrl: formatCurrencyBrl,
    parseCurrencyBrl: parseCurrencyBrl,
    formatCurrencyInput: formatCurrencyInput,
    refreshSystemNoticeCenter: refreshSystemNoticeCenter
  };

  window.ProcessoStore = {
    load: loadProcessos,
    save: saveProcessos,
    add: addProcesso,
    remove: removeProcesso
  };

  window.AlmoxStore = {
    loadItems: loadAlmoxItems,
    saveItems: saveAlmoxItems,
    addItem: addAlmoxItem,
    moveItem: moveAlmoxItem,
    deleteItem: deleteAlmoxItem,
    loadMovements: loadAlmoxMovements,
    loadDeletes: loadAlmoxDeletes
  };
})();

