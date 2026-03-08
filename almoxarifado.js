(function () {
  AppCore.initShell('almoxarifado');

  const itemForm = document.getElementById('almox-item-form');
  const movForm = document.getElementById('almox-mov-form');
  const feedback = document.getElementById('almox-feedback');
  const itensBody = document.getElementById('almox-itens-body');
  const movBody = document.getElementById('almox-mov-body');
  const delBody = document.getElementById('almox-del-body');
  const movItemSelect = document.getElementById('mov-item-id');

  const kpiItens = document.getElementById('almox-kpi-itens');
  const kpiEstoque = document.getElementById('almox-kpi-estoque');
  const kpiCriticos = document.getElementById('almox-kpi-criticos');

  const deleteDialog = document.getElementById('delete-dialog');
  const deleteForm = document.getElementById('delete-form');
  const deletePassword = document.getElementById('delete-password');
  const deleteFeedback = document.getElementById('delete-feedback');
  const cancelDelete = document.getElementById('cancel-delete');
  const confirmItemName = document.getElementById('confirm-item-name');

  if (!itemForm || !movForm || !feedback || !itensBody || !movBody || !delBody || !movItemSelect || !kpiItens || !kpiEstoque || !kpiCriticos || !deleteForm || !deletePassword || !deleteFeedback || !cancelDelete || !confirmItemName) {
    return;
  }

  const itemSubmitBtn = itemForm.querySelector('button[type="submit"]');
  const movSubmitBtn = movForm.querySelector('button[type="submit"]');
  const deleteSubmitBtn = deleteForm.querySelector('button[type="submit"]');

  let deletingItemId = '';
  let itemsCache = [];
  let isItemSubmitting = false;
  let isMovementSubmitting = false;
  let isDeleteSubmitting = false;
  const deletingIds = new Set();

  itemForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isItemSubmitting) return;

    isItemSubmitting = true;
    setItemSubmittingState(true);
    clearFeedback();

    const data = new FormData(itemForm);
    try {
      await BackendAPI.addAlmoxItem({
        nome: data.get('nome'),
        categoria: data.get('categoria'),
        estoqueAtual: Number(data.get('estoqueAtual')),
        estoqueMinimo: Number(data.get('estoqueMinimo')),
        unidadeMedida: data.get('unidadeMedida'),
        localEstoque: data.get('localEstoque'),
        observacao: data.get('observacao')
      });

      itemForm.reset();
      itemForm.localEstoque.value = 'SEAP/ALMOXARIFADO';
      setFeedback('Item cadastrado com sucesso.', 'ok');
      await renderAll();
    } catch (error) {
      setFeedback(error.message || 'Não foi possível cadastrar o item.', 'error');
    } finally {
      isItemSubmitting = false;
      setItemSubmittingState(false);
    }
  });

  movForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isMovementSubmitting) return;

    isMovementSubmitting = true;
    setMovementSubmittingState(true);
    clearFeedback();

    const data = new FormData(movForm);
    try {
      await BackendAPI.moveAlmoxItem({
        itemId: data.get('itemId'),
        tipo: data.get('tipo'),
        quantidade: Number(data.get('quantidade')),
        motivo: data.get('motivo')
      });

      movForm.reset();
      setFeedback('Movimentação registrada com sucesso.', 'ok');
      await renderAll();
    } catch (error) {
      setFeedback(error.message || 'Não foi possível movimentar o estoque.', 'error');
    } finally {
      isMovementSubmitting = false;
      setMovementSubmittingState(false);
    }
  });

  itensBody.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-delete-id]');
    if (!button) return;

    const candidateId = String(button.getAttribute('data-delete-id') || '').trim();
    if (!candidateId || deletingIds.has(candidateId)) return;

    deletingItemId = candidateId;
    const itemNome = button.getAttribute('data-item-nome') || 'Item não identificado';
    confirmItemName.textContent = 'Item selecionado: ' + itemNome;
    deletePassword.value = '';
    deleteFeedback.hidden = true;
    deleteFeedback.textContent = '';

    if (typeof deleteDialog.showModal === 'function') {
      deleteDialog.showModal();
    } else {
      const password = window.prompt('Informe sua senha para excluir o item:');
      if (!password) return;
      confirmDeleteWithPassword(password);
    }
  });

  cancelDelete.addEventListener('click', function () {
    if (isDeleteSubmitting) return;
    if (typeof deleteDialog.close === 'function') {
      deleteDialog.close();
    }
  });

  deleteForm.addEventListener('submit', function (event) {
    event.preventDefault();
    if (isDeleteSubmitting) return;
    confirmDeleteWithPassword(deletePassword.value);
  });

  async function confirmDeleteWithPassword(password) {
    const pass = String(password || '').trim();
    if (!pass) {
      showDeleteError('Informe a senha para confirmar a exclusão.');
      return;
    }
    if (!deletingItemId || deletingIds.has(deletingItemId)) return;

    isDeleteSubmitting = true;
    setDeleteSubmittingState(true);
    deletingIds.add(deletingItemId);

    try {
      const ok = await BackendAPI.verifyCurrentPassword(pass);
      if (!ok) {
        showDeleteError('Senha inválida. Exclusão não autorizada.');
        deletingIds.delete(deletingItemId);
        return;
      }

      await BackendAPI.deleteAlmoxItem(deletingItemId);
      deletingItemId = '';
      if (typeof deleteDialog.close === 'function' && deleteDialog.open) deleteDialog.close();
      setFeedback('Item excluído com sucesso.', 'warn');
      await renderAll();
    } catch (error) {
      showDeleteError((error && error.message) ? error.message : 'Falha ao excluir item.');
      deletingIds.delete(deletingItemId);
    } finally {
      isDeleteSubmitting = false;
      setDeleteSubmittingState(false);
    }
  }

  function setItemSubmittingState(active) {
    if (!itemSubmitBtn) return;
    itemSubmitBtn.disabled = !!active;
    itemSubmitBtn.textContent = active ? 'Cadastrando...' : 'Cadastrar item';
  }

  function setMovementSubmittingState(active) {
    if (!movSubmitBtn) return;
    movSubmitBtn.disabled = !!active;
    movSubmitBtn.textContent = active ? 'Registrando...' : 'Registrar movimentação';
  }

  function setDeleteSubmittingState(active) {
    if (!deleteSubmitBtn) return;
    deleteSubmitBtn.disabled = !!active;
    deleteSubmitBtn.textContent = active ? 'Excluindo...' : 'Confirmar exclusão';
    deletePassword.disabled = !!active;
  }

  function showDeleteError(message) {
    deleteFeedback.textContent = message;
    deleteFeedback.hidden = false;
    setFeedback(message, 'error');
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + type;
    feedback.hidden = false;
  }

  function clearFeedback() {
    feedback.textContent = '';
    feedback.className = 'form-feedback';
    feedback.hidden = true;
  }

  async function renderAll() {
    try {
      itemsCache = await BackendAPI.listAlmoxItems();
      renderKpis();
      renderItemSelect();
      renderItemsTable();

      const movements = await BackendAPI.listAlmoxMovements();
      renderMovementsTable(movements);

      const deletes = await BackendAPI.listAlmoxDeletes();
      renderDeletesTable(deletes);
    } catch (_error) {
      setFeedback('Falha ao carregar dados do almoxarifado no backend.', 'error');
    }
  }

  function renderKpis() {
    const totalItens = itemsCache.length;
    const estoqueTotal = itemsCache.reduce(function (acc, item) {
      return acc + (Number(item.estoqueAtual) || 0);
    }, 0);
    const criticos = itemsCache.filter(function (item) {
      return Number(item.estoqueAtual) <= Number(item.estoqueMinimo || 0);
    }).length;

    kpiItens.textContent = String(totalItens);
    kpiEstoque.textContent = String(estoqueTotal);
    kpiCriticos.textContent = String(criticos);
  }

  function renderItemSelect() {
    const items = itemsCache.slice().sort(function (a, b) {
      return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    });

    if (items.length === 0) {
      movItemSelect.innerHTML = '<option value="">Cadastre um item primeiro</option>';
      return;
    }

    movItemSelect.innerHTML = ['<option value="">Selecione</option>']
      .concat(items.map(function (item) {
        const text = AppCore.escapeHtml(item.nome) + ' (' + Number(item.estoqueAtual) + ' ' + AppCore.escapeHtml(item.unidadeMedida) + ')';
        return '<option value="' + item.id + '">' + text + '</option>';
      }))
      .join('');
  }

  function renderItemsTable() {
    const items = itemsCache.slice().sort(function (a, b) {
      return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
    });

    if (items.length === 0) {
      itensBody.innerHTML = '<tr><td colspan="8">Nenhum item cadastrado.</td></tr>';
      return;
    }

    itensBody.innerHTML = items.map(function (item) {
      const estoque = Number(item.estoqueAtual) || 0;
      const minimo = Number(item.estoqueMinimo) || 0;
      const statusClass = estoque <= minimo ? 'status-danger' : estoque <= (minimo + 3) ? 'status-warning' : 'status-ok';
      const statusLabel = estoque <= minimo ? 'Crítico' : estoque <= (minimo + 3) ? 'Atenção' : 'Regular';
      const isDeleting = deletingIds.has(String(item.id));

      return '<tr>' +
        '<td>' + AppCore.escapeHtml(item.nome) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.categoria || '-') + '</td>' +
        '<td>' + estoque + ' ' + AppCore.escapeHtml(item.unidadeMedida) + '</td>' +
        '<td>' + minimo + ' ' + AppCore.escapeHtml(item.unidadeMedida) + '</td>' +
        '<td><span class="status-chip ' + statusClass + '">' + statusLabel + '</span></td>' +
        '<td>' + AppCore.escapeHtml(item.criadoPor || '-') + '<br><small>' + formatDateTime(item.criadoEm) + '</small></td>' +
        '<td>' + AppCore.escapeHtml(item.ultimaMovimentacaoPor || '-') + '<br><small>' + formatDateTime(item.ultimaMovimentacaoEm) + '</small></td>' +
        '<td><button class="action-btn" data-delete-id="' + item.id + '" data-item-nome="' + AppCore.escapeHtml(item.nome) + '" ' + (isDeleting ? 'disabled' : '') + '>' + (isDeleting ? 'Excluindo...' : 'Excluir') + '</button></td>' +
      '</tr>';
    }).join('');
  }

  function renderMovementsTable(movements) {
    const rows = (movements || []).slice(0, 50);

    if (rows.length === 0) {
      movBody.innerHTML = '<tr><td colspan="6">Nenhuma movimentação registrada.</td></tr>';
      return;
    }

    movBody.innerHTML = rows.map(function (mov) {
      const typeClass = mov.tipo === 'saida' ? 'status-danger' : 'status-ok';
      const typeLabel = mov.tipo === 'saida' ? 'Saída' : 'Entrada';
      return '<tr>' +
        '<td>' + formatDateTime(mov.dataHora) + '</td>' +
        '<td>' + AppCore.escapeHtml(mov.itemNome) + '</td>' +
        '<td><span class="status-chip ' + typeClass + '">' + typeLabel + '</span></td>' +
        '<td>' + Number(mov.quantidade) + '</td>' +
        '<td>' + AppCore.escapeHtml(mov.motivo) + '</td>' +
        '<td>' + AppCore.escapeHtml(mov.usuario) + '</td>' +
      '</tr>';
    }).join('');
  }

  function renderDeletesTable(deletes) {
    const rows = (deletes || []).slice(0, 30);

    if (rows.length === 0) {
      delBody.innerHTML = '<tr><td colspan="4">Nenhuma exclusão registrada.</td></tr>';
      return;
    }

    delBody.innerHTML = rows.map(function (item) {
      return '<tr>' +
        '<td>' + formatDateTime(item.dataHora) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.itemNome) + '</td>' +
        '<td>' + Number(item.quantidadeNoMomento) + ' ' + AppCore.escapeHtml(item.unidadeMedida || '') + '</td>' +
        '<td>' + AppCore.escapeHtml(item.usuario) + '</td>' +
      '</tr>';
    }).join('');
  }

  function formatDateTime(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('pt-BR');
  }

  renderAll();
})();
