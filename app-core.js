(function () {
  const AUTH_KEY = 'cc_auth';
  const AUTH_USER_KEY = 'cc_auth_user';
  const PROCESS_KEY = 'cc_processos';
  const PROFILE_PREFIX = 'cc_profile_';
  const ALMOX_ITEM_KEY = 'cc_almox_itens';
  const ALMOX_MOV_KEY = 'cc_almox_movimentacoes';
  const ALMOX_DEL_KEY = 'cc_almox_exclusoes';

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
        nameEl.textContent = 'Olá, ' + firstName(safeIdentity.nome) + '!';
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

  async function logout() {
    try {
      if (window.BackendAPI && typeof window.BackendAPI.signOut === 'function') {
        await window.BackendAPI.signOut();
      } else {
        localStorage.removeItem(AUTH_KEY);
        localStorage.removeItem(AUTH_USER_KEY);
      }
    } catch (_error) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
    }
    window.location.href = 'index.html';
  }

  function initShell(activeNav) {
    if (!requireAuth()) return;

    if (window.BackendAPI && typeof window.BackendAPI.restoreSession === 'function') {
      window.BackendAPI.restoreSession().then(function (isValid) {
        if (!isValid) window.location.href = 'index.html';
      }).catch(function () {
        window.location.href = 'index.html';
      });
    }

    const identity = getDisplayIdentity();
    const logoutBtn = document.getElementById('logout');

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

    document.querySelectorAll('[data-nav]').forEach(function (link) {
      const nav = link.getAttribute('data-nav');
      link.classList.toggle('active', nav === activeNav);
    });
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
      return normalizeKey(item.numeroProcesso) === np || normalizeKey(item.numeroContrato) === nc;
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
    if (diff <= 30) return { type: 'warning', label: 'Até 30 dias', dias: diff };
    return { type: 'ok', label: 'Em dia', dias: diff };
  }

  function formatDate(str) {
    const d = dateValue(str);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return day + '/' + month + '/' + d.getFullYear();
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

  function createDemoData() {
    const today = startOfDay(new Date());

    function addDays(days) {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return d.getFullYear() + '-' + month + '-' + day;
    }

    return [
      {
        id: 'demo-1',
        numeroProcesso: '2026-001',
        numeroContrato: 'CT-001/2026',
        inicioVigencia: '2026-01-10',
        terminoVigencia: addDays(18),
        gestorContrato: 'Ana Pereira',
        fiscalContrato: 'Carlos Nunes',
        fonteRecurso: 'Tesouro municipal',
        dataAssinatura: '2026-01-08',
        dataPublicacao: '2026-01-12',
        valorContrato: 125000.5,
        objetoContrato: 'Serviço de manutenção predial.',
        fundamentacaoContrato: 'Lei 14.133/2021 e regulamento interno.'
      },
      {
        id: 'demo-2',
        numeroProcesso: '2026-014',
        numeroContrato: 'CT-014/2026',
        inicioVigencia: '2026-02-01',
        terminoVigencia: addDays(95),
        gestorContrato: 'Lúcia Prado',
        fiscalContrato: 'Bruno Moraes',
        fonteRecurso: 'Convênio federal',
        dataAssinatura: '2026-01-27',
        dataPublicacao: '2026-02-03',
        valorContrato: 342000,
        objetoContrato: 'Apoio técnico para sistema de protocolo.',
        fundamentacaoContrato: 'Lei 14.133/2021, art. 75.'
      },
      {
        id: 'demo-3',
        numeroProcesso: '2025-223',
        numeroContrato: 'CT-223/2025',
        inicioVigencia: '2025-03-04',
        terminoVigencia: addDays(-5),
        gestorContrato: 'Marcos Lima',
        fiscalContrato: 'Débora Silva',
        fonteRecurso: 'Recursos próprios',
        dataAssinatura: '2025-03-01',
        dataPublicacao: '2025-03-05',
        valorContrato: 89000.99,
        objetoContrato: 'Locação de equipamentos de TI.',
        fundamentacaoContrato: 'Processo administrativo 2025-223.'
      }
    ];
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
    if (!Number.isFinite(estoqueAtual) || estoqueAtual < 0) throw new Error('Quantidade inicial inválida.');
    if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) throw new Error('Estoque mínimo inválido.');

    const items = loadAlmoxItems();
    if (items.some(function (item) { return normalizeItemName(item.nome) === normalizeItemName(nome); })) {
      throw new Error('Já existe item cadastrado com este nome.');
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
    if (tipo !== 'entrada' && tipo !== 'saida') throw new Error('Tipo de movimentação inválido.');
    if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');
    if (!motivo) throw new Error('Informe o motivo da movimentação.');

    const items = loadAlmoxItems();
    const idx = items.findIndex(function (item) { return item.id === itemId; });
    if (idx < 0) throw new Error('Item não encontrado.');

    const selected = items[idx];
    if (tipo === 'saida' && quantidade > Number(selected.estoqueAtual)) {
      throw new Error('Quantidade de saída maior que o estoque disponível.');
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
    if (!id) throw new Error('Item inválido para exclusão.');

    const items = loadAlmoxItems();
    const selected = items.find(function (item) { return item.id === id; });
    if (!selected) throw new Error('Item não encontrado para exclusão.');

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
    getProfile: getProfile,
    saveProfile: saveProfile,
    getStatus: getStatus,
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
    formatCurrencyInput: formatCurrencyInput
  };

  window.ProcessoStore = {
    load: loadProcessos,
    save: saveProcessos,
    add: addProcesso,
    remove: removeProcesso,
    demoData: createDemoData
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













