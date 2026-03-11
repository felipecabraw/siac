(function () {
  AppCore.initShell('processos');

  const searchInput = document.getElementById('search');
  const filterYear = document.getElementById('filter-year');
  const statusFilters = document.getElementById('status-filters');
  const tableBody = document.getElementById('process-table-body');
  const activeFilterLabel = document.getElementById('active-filter-label');
  const activeFilterCount = document.getElementById('active-filter-count');
  const filterSummary = document.getElementById('contract-filter-summary');
  const viewNotesDialog = document.getElementById('view-notes-dialog');
  const viewNotesContent = document.getElementById('view-notes-content');
  const viewNotesContractName = document.getElementById('view-notes-contract-name');
  const closeViewNotes = document.getElementById('close-view-notes');

  const editDialog = document.getElementById('edit-contract-dialog');
  const editForm = document.getElementById('edit-contract-form');
  const editPassword = document.getElementById('edit-contract-password');
  const editFeedback = document.getElementById('edit-contract-feedback');
  const cancelEdit = document.getElementById('cancel-edit-contract');
  const confirmEditBtn = document.getElementById('confirm-edit-contract-btn');

  const closeDialog = document.getElementById('close-contract-dialog');
  const closeForm = document.getElementById('close-contract-form');
  const closePassword = document.getElementById('close-contract-password');
  const closeFeedback = document.getElementById('close-contract-feedback');
  const cancelClose = document.getElementById('cancel-contract-close');
  const confirmCloseBtn = document.getElementById('confirm-contract-close-btn');
  const closeContractName = document.getElementById('close-contract-name');

  const deleteDialog = document.getElementById('delete-contract-dialog');
  const deleteForm = document.getElementById('delete-contract-form');
  const deletePassword = document.getElementById('delete-contract-password');
  const deleteFeedback = document.getElementById('delete-contract-feedback');
  const cancelDelete = document.getElementById('cancel-contract-delete');
  const confirmContractName = document.getElementById('confirm-contract-name');
  const confirmDeleteBtn = document.getElementById('confirm-contract-delete-btn');

  if (!searchInput || !filterYear || !statusFilters || !tableBody || !activeFilterLabel || !activeFilterCount || !filterSummary || !viewNotesDialog || !viewNotesContent || !viewNotesContractName || !closeViewNotes || !editForm || !editPassword || !editFeedback || !cancelEdit || !confirmEditBtn || !closeForm || !closePassword || !closeFeedback || !cancelClose || !confirmCloseBtn || !closeContractName || !deleteForm || !deletePassword || !deleteFeedback || !cancelDelete || !confirmContractName || !confirmDeleteBtn) return;

  let query = '';
  let selectedYear = '';
  let selectedStatus = '';
  let cache = [];
  let pendingDeleteId = '';
  let pendingCloseId = '';
  const deletingIds = new Set();
  const closingIds = new Set();
  const editingIds = new Set();

  searchInput.addEventListener('input', function () {
    query = String(searchInput.value || '').trim().toLowerCase();
    renderTable();
  });

  filterYear.addEventListener('change', function () {
    selectedYear = String(filterYear.value || '').trim();
    renderTable();
  });

  statusFilters.addEventListener('click', function (event) {
    const button = event.target.closest('button[data-status]');
    if (!button) return;

    selectedStatus = String(button.getAttribute('data-status') || '');
    statusFilters.querySelectorAll('button[data-status]').forEach(function (item) {
      item.classList.toggle('active', item === button);
    });
    renderTable();
  });

  tableBody.addEventListener('click', async function (event) {
    const notesBtn = event.target.closest('button[data-notes-id]');
    if (notesBtn) {
      const id = String(notesBtn.getAttribute('data-notes-id') || '').trim();
      if (!id) return;
      openNotesDialog(id);
      return;
    }
    const editBtn = event.target.closest('button[data-edit-id]');
    if (editBtn) {
      const id = String(editBtn.getAttribute('data-edit-id') || '').trim();
      if (!id || editingIds.has(id)) return;
      openEditDialog(id);
      return;
    }

    const closeBtn = event.target.closest('button[data-close-id]');
    if (closeBtn) {
      const id = String(closeBtn.getAttribute('data-close-id') || '').trim();
      if (!id || closingIds.has(id) || closeBtn.hasAttribute('data-closed')) return;

      pendingCloseId = id;
      closePassword.value = '';
      closePassword.disabled = false;
      closeFeedback.hidden = true;
      closeFeedback.textContent = '';
      confirmCloseBtn.disabled = false;
      confirmCloseBtn.textContent = 'Encerrar contrato';
      closeContractName.textContent = closeBtn.getAttribute('data-contract-name') || 'Contrato selecionado';

      if (typeof closeDialog.showModal === 'function') {
        closeDialog.showModal();
      } else {
        const password = window.prompt('Informe sua senha para encerrar o contrato:');
        if (!password) return;
        await confirmClose(password);
      }
      return;
    }

    const deleteBtn = event.target.closest('button[data-delete-id]');
    if (!deleteBtn) return;

    const id = String(deleteBtn.getAttribute('data-delete-id') || '').trim();
    if (!id || deletingIds.has(id)) return;

    pendingDeleteId = id;
    deletePassword.value = '';
    deletePassword.disabled = false;
    deleteFeedback.hidden = true;
    deleteFeedback.textContent = '';
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Confirmar remoção';
    confirmContractName.textContent = deleteBtn.getAttribute('data-contract-name') || 'Contrato selecionado';

    if (typeof deleteDialog.showModal === 'function') {
      deleteDialog.showModal();
    } else {
      const password = window.prompt('Informe sua senha para remover o contrato:');
      if (!password) return;
      await confirmDelete(password);
    }
  });

  cancelClose.addEventListener('click', function () {
    if (confirmCloseBtn.disabled) return;
    if (typeof closeDialog.close === 'function') closeDialog.close();
  });

  closeForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    await confirmClose(closePassword.value);
  });

  cancelDelete.addEventListener('click', function () {
    if (confirmDeleteBtn.disabled) return;
    if (typeof deleteDialog.close === 'function') deleteDialog.close();
  });

  deleteForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    await confirmDelete(deletePassword.value);
  });

  closeViewNotes.addEventListener('click', function () {
    if (typeof viewNotesDialog.close === 'function') viewNotesDialog.close();
  });

  cancelEdit.addEventListener('click', function () {
    if (confirmEditBtn.disabled) return;
    if (typeof editDialog.close === 'function') editDialog.close();
  });

  editForm.processoSei.addEventListener('input', function () {
    editForm.processoSei.value = editForm.processoSei.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  editForm.numeroContrato.addEventListener('input', function () {
    editForm.numeroContrato.value = editForm.numeroContrato.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  editForm.valorGlobal.addEventListener('input', function () {
    editForm.valorGlobal.value = AppCore.formatCurrencyInput(editForm.valorGlobal.value);
  });

  editForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    await confirmEdit();
  });

  bootstrap();

  async function bootstrap() {
    try {
      cache = await BackendAPI.listProcessos();
    } catch (_error) {
      cache = ProcessoStore.load();
    }
    populateYearFilter();
    renderTable();
  }

  function populateYearFilter() {
    const years = cache
      .map(getContractYear)
      .filter(Boolean)
      .filter(function (year, index, list) { return list.indexOf(year) === index; })
      .sort();

    filterYear.innerHTML = ['<option value="">Todos</option>']
      .concat(years.map(function (year) {
        return '<option value="' + year + '"' + (year === selectedYear ? ' selected' : '') + '>' + year + '</option>';
      }))
      .join('');
  }

  function renderTable() {
    const filtered = cache
      .slice()
      .sort(function (a, b) { return AppCore.dateValue(a.fimVigencia) - AppCore.dateValue(b.fimVigencia); })
      .filter(function (item) {
        const year = getContractYear(item);
        const status = AppCore.getProcessStatus(item);

        if (selectedYear && year !== selectedYear) return false;
        if (selectedStatus && status.type !== selectedStatus) return false;

        if (!query) return true;
        const text = [
          item.processoSei,
          item.numeroContrato,
          item.empresaContratada,
          item.gestorContrato,
          item.fiscaisContrato,
          item.objeto,
          item.fundamentacaoLegal,
          item.observacoes,
          item.contratoContinuado ? 'continuado' : 'nao continuado',
          status.label
        ].join(' ').toLowerCase();
        return text.includes(query);
      });

    updateFilterSummary(filtered.length);

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">Nenhum contrato encontrado.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(function (item) {
      const status = AppCore.getProcessStatus(item);
      const badgeClass = status.type === 'danger' ? 'status-danger' : status.type === 'warning' ? 'status-warning' : status.type === 'closed' ? 'status-closed' : 'status-ok';
      const valor = Number(item.valorGlobal);
      const valorLabel = Number.isFinite(valor) && valor > 0 ? AppCore.formatCurrencyBrl(valor) : '-';
      const deleting = deletingIds.has(String(item.id));
      const closing = closingIds.has(String(item.id));
      const editing = editingIds.has(String(item.id));
      const isClosed = status.type === 'closed';

      return '<tr>' +
        '<td>' + AppCore.escapeHtml(item.processoSei) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.numeroContrato) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.empresaContratada) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.gestorContrato) + '</td>' +
        '<td>' + valorLabel + '</td>' +
        '<td>' + AppCore.formatDate(item.fimVigencia) + '</td>' +
        '<td><span class="status-chip ' + badgeClass + '">' + status.label + '</span></td>' +
        '<td><div class="action-icon-group">' +
          '<button class="action-icon-btn info" type="button" data-notes-id="' + item.id + '" aria-label="Visualizar observacoes" title="Visualizar observacoes">' + notesIcon() + '</button>' +
          '<button class="action-icon-btn" type="button" data-edit-id="' + item.id + '" aria-label="Editar contrato" title="Editar contrato" ' + (editing ? 'disabled' : '') + '>' + editIcon() + '</button>' +
          '<button class="action-icon-btn neutral" type="button" data-close-id="' + item.id + '" data-contract-name="Contrato ' + AppCore.escapeHtml(item.numeroContrato) + ' | Processo ' + AppCore.escapeHtml(item.processoSei) + '" aria-label="Encerrar contrato" title="' + (isClosed ? 'Contrato já encerrado' : 'Encerrar contrato') + '" ' + (closing || isClosed ? 'disabled' : '') + (isClosed ? ' data-closed="true"' : '') + '>' + closeIcon() + '</button>' +
          '<button class="action-icon-btn danger" type="button" data-delete-id="' + item.id + '" data-contract-name="Contrato ' + AppCore.escapeHtml(item.numeroContrato) + ' | Processo ' + AppCore.escapeHtml(item.processoSei) + '" aria-label="Remover contrato" title="Remover contrato" ' + (deleting ? 'disabled' : '') + '>' + trashIcon() + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');
  }

  function openNotesDialog(id) {
    const item = cache.find(function (entry) { return String(entry.id) === String(id); });
    if (!item) return;
    viewNotesContractName.textContent = 'Contrato ' + (item.numeroContrato || '-') + ' | Processo ' + (item.processoSei || '-');
    viewNotesContent.textContent = String(item.observacoes || '').trim() || 'Nenhuma observacao registrada.';
    if (typeof viewNotesDialog.showModal === 'function') {
      viewNotesDialog.showModal();
    }
  }
  function openEditDialog(id) {
    const item = cache.find(function (entry) { return String(entry.id) === String(id); });
    if (!item) return;

    editForm.id.value = item.id;
    editForm.processoSei.value = item.processoSei || '';
    editForm.numeroContrato.value = item.numeroContrato || '';
    editForm.objeto.value = item.objeto || '';
    editForm.fundamentacaoLegal.value = item.fundamentacaoLegal || '';
    editForm.empresaContratada.value = item.empresaContratada || '';
    editForm.valorGlobal.value = AppCore.formatCurrencyBrl(item.valorGlobal || 0);
    editForm.fonte.value = item.fonte || '';
    editForm.gestorContrato.value = item.gestorContrato || '';
    editForm.fiscaisContrato.value = item.fiscaisContrato || '';
    editForm.inicioVigencia.value = item.inicioVigencia || '';
    editForm.fimVigencia.value = item.fimVigencia || '';
    editForm.contratoContinuado.value = item.contratoContinuado ? 'sim' : 'nao';
    editForm.observacoes.value = item.observacoes || '';
    editPassword.value = '';
    editPassword.disabled = false;
    editFeedback.hidden = true;
    editFeedback.textContent = '';
    confirmEditBtn.disabled = false;
    confirmEditBtn.textContent = 'Salvar alterações';

    if (typeof editDialog.showModal === 'function') {
      editDialog.showModal();
    }
  }

  function getContractYear(item) {
    const raw = String(item.inicioVigencia || item.fimVigencia || '').trim();
    return raw ? raw.slice(0, 4) : '';
  }
  function updateFilterSummary(total) {
    const activeButton = statusFilters.querySelector('button[data-status].active');
    const label = activeButton ? String(activeButton.textContent || '').trim() : 'Todos';
    const statusValue = activeButton ? String(activeButton.getAttribute('data-status') || '').trim() : '';
    activeFilterLabel.textContent = label;
    activeFilterCount.textContent = formatContractCount(total);
    filterSummary.setAttribute('data-status', statusValue || 'all');
  }

  function formatContractCount(total) {
    return total === 1 ? '1 contrato' : total + ' contratos';
  }

  async function confirmEdit() {
    const id = String(editForm.id.value || '').trim();
    const pass = String(editPassword.value || '').trim();
    if (!id) return;
    if (!pass) {
      showEditError('Informe a senha para confirmar a edição.');
      return;
    }
    if (editingIds.has(id)) return;

    const inicio = String(editForm.inicioVigencia.value || '').trim();
    const fim = String(editForm.fimVigencia.value || '').trim();
    const processoSei = String(editForm.processoSei.value || '').trim();
    const numeroContrato = String(editForm.numeroContrato.value || '').trim();
    const valorGlobal = AppCore.parseCurrencyBrl(editForm.valorGlobal.value);

    if (new Date(fim) < new Date(inicio)) {
      showEditError('A data de fim da vigência deve ser igual ou posterior ao início.');
      return;
    }
    if (!Number.isFinite(valorGlobal) || valorGlobal <= 0) {
      showEditError('Informe um valor global válido e maior que zero.');
      return;
    }

    confirmEditBtn.disabled = true;
    confirmEditBtn.textContent = 'Salvando...';
    editPassword.disabled = true;
    editingIds.add(id);

    try {
      const ok = await BackendAPI.verifyCurrentPassword(pass);
      if (!ok) {
        showEditError('Senha inválida. Edição não autorizada.');
        editingIds.delete(id);
        return;
      }

      const hasDuplicate = await BackendAPI.hasDuplicateProcessoForUpdate(id, processoSei, numeroContrato);
      if (hasDuplicate) {
        showEditError('Já existe contrato cadastrado com esse Processo SEI nº ou número de contrato.');
        editingIds.delete(id);
        return;
      }

      const currentItem = cache.find(function (entry) { return String(entry.id) === id; });

      await BackendAPI.updateProcesso(id, {
        processoSei: processoSei,
        numeroContrato: numeroContrato,
        objeto: String(editForm.objeto.value || '').trim(),
        fundamentacaoLegal: String(editForm.fundamentacaoLegal.value || '').trim(),
        empresaContratada: String(editForm.empresaContratada.value || '').trim(),
        valorGlobal: valorGlobal,
        fonte: String(editForm.fonte.value || '').trim(),
        gestorContrato: String(editForm.gestorContrato.value || '').trim(),
        fiscaisContrato: String(editForm.fiscaisContrato.value || '').trim(),
        inicioVigencia: inicio,
        fimVigencia: fim,
        contratoContinuado: String(editForm.contratoContinuado.value || 'nao').trim().toLowerCase() === 'sim',
        observacoes: String(editForm.observacoes.value || '').trim(),
        status: currentItem && currentItem.status ? currentItem.status : 'vigente'
      });

      cache = await BackendAPI.listProcessos();
      populateYearFilter();
      renderTable();
      editingIds.delete(id);
      if (typeof editDialog.close === 'function' && editDialog.open) editDialog.close();
    } catch (_error) {
      showEditError((_error && _error.message) ? _error.message : 'Não foi possível salvar as alterações do contrato.');
      editingIds.delete(id);
    } finally {
      confirmEditBtn.disabled = false;
      confirmEditBtn.textContent = 'Salvar alterações';
      editPassword.disabled = false;
    }
  }

  async function confirmClose(password) {
    const pass = String(password || '').trim();
    if (!pass) {
      showCloseError('Informe a senha para confirmar o encerramento.');
      return;
    }
    if (!pendingCloseId || closingIds.has(pendingCloseId)) return;

    confirmCloseBtn.disabled = true;
    confirmCloseBtn.textContent = 'Encerrando...';
    closePassword.disabled = true;
    closingIds.add(pendingCloseId);

    try {
      const ok = await BackendAPI.verifyCurrentPassword(pass);
      if (!ok) {
        showCloseError('Senha inválida. Encerramento não autorizado.');
        closingIds.delete(pendingCloseId);
        return;
      }

      const targetId = pendingCloseId;
      const currentItem = cache.find(function (entry) { return String(entry.id) === targetId; });
      if (!currentItem) {
        throw new Error('Contrato não encontrado para encerramento.');
      }

      await BackendAPI.updateProcesso(targetId, Object.assign({}, currentItem, { status: 'encerrado' }));
      if (typeof closeDialog.close === 'function' && closeDialog.open) closeDialog.close();
      pendingCloseId = '';
      cache = await BackendAPI.listProcessos();
      populateYearFilter();
      renderTable();
      closingIds.delete(targetId);
    } catch (_error) {
      showCloseError((_error && _error.message) ? _error.message : 'Não foi possível encerrar o contrato.');
      closingIds.delete(pendingCloseId);
    } finally {
      confirmCloseBtn.disabled = false;
      confirmCloseBtn.textContent = 'Encerrar contrato';
      closePassword.disabled = false;
    }
  }

  async function confirmDelete(password) {
    const pass = String(password || '').trim();
    if (!pass) {
      showDeleteError('Informe a senha para confirmar a remoção.');
      return;
    }
    if (!pendingDeleteId || deletingIds.has(pendingDeleteId)) return;

    confirmDeleteBtn.disabled = true;
    confirmDeleteBtn.textContent = 'Removendo...';
    deletePassword.disabled = true;
    deletingIds.add(pendingDeleteId);

    try {
      const ok = await BackendAPI.verifyCurrentPassword(pass);
      if (!ok) {
        showDeleteError('Senha inválida. Remoção não autorizada.');
        deletingIds.delete(pendingDeleteId);
        return;
      }

      const removedId = pendingDeleteId;
      await BackendAPI.deleteProcesso(removedId);
      if (typeof deleteDialog.close === 'function' && deleteDialog.open) deleteDialog.close();
      pendingDeleteId = '';
      cache = await BackendAPI.listProcessos();
      populateYearFilter();
      renderTable();
      deletingIds.delete(removedId);
    } catch (_error) {
      showDeleteError((_error && _error.message) ? _error.message : 'Não foi possível remover o contrato no backend.');
      deletingIds.delete(pendingDeleteId);
    } finally {
      confirmDeleteBtn.disabled = false;
      confirmDeleteBtn.textContent = 'Confirmar remoção';
      deletePassword.disabled = false;
    }
  }

  function showEditError(message) {
    editFeedback.textContent = message;
    editFeedback.hidden = false;
  }

  function showCloseError(message) {
    closeFeedback.textContent = message;
    closeFeedback.hidden = false;
  }

  function showDeleteError(message) {
    deleteFeedback.textContent = message;
    deleteFeedback.hidden = false;
  }

  function notesIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5c-5.2 0-9 7-9 7s3.8 7 9 7 9-7 9-7-3.8-7-9-7z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
  }
  function editIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5-4-4L4 16v4z"></path><path d="M14.5 5.5l4 4"></path></svg>';
  }

  function closeIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10"></path><path d="M9 7V5h6v2"></path><path d="M8 7l1 12h6l1-12"></path><path d="M10 12l2 2 4-4"></path></svg>';
  }

  function trashIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="M8 7l1 13h6l1-13"></path><path d="M10 11v6"></path><path d="M14 11v6"></path></svg>';
  }
})();








