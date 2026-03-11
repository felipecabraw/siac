(function () {
  if (!BackendAPI.isCurrentUserSeniorAdmin()) {
    window.location.href = 'dashboard.html';
    return;
  }

  AppCore.initShell('');

  const approvalFeedback = document.getElementById('approval-feedback');
  const approvalTableBody = document.getElementById('approval-table-body');
  const auditFeedback = document.getElementById('audit-feedback');
  const auditTableBody = document.getElementById('audit-table-body');
  const noticesFeedback = document.getElementById('notices-feedback');
  const noticeForm = document.getElementById('system-notice-form');
  const noticeTableBody = document.getElementById('system-notices-table-body');
  const cancelNoticeBtn = document.getElementById('cancel-system-notice');
  const saveNoticeBtn = document.getElementById('save-system-notice');

  if (!approvalTableBody || !noticeForm || !noticeTableBody || !approvalFeedback || !noticesFeedback || !auditFeedback || !auditTableBody) return;

  const approvingIds = new Set();
  const deletingNoticeIds = new Set();
  let isSavingNotice = false;

  bindApprovalActions();
  bindNoticeActions();
  bootstrap();

  async function bootstrap() {
    await loadPendingApprovals();
    await loadAuditEvents();
    await loadSystemNotices();
  }

  function bindApprovalActions() {
    if (approvalTableBody.dataset.bound === 'true') return;
    approvalTableBody.dataset.bound = 'true';

    approvalTableBody.addEventListener('click', async function (event) {
      const btn = event.target.closest('button[data-approve-id]');
      if (!btn) return;

      const id = String(btn.getAttribute('data-approve-id') || '').trim();
      if (!id || approvingIds.has(id)) return;

      approvingIds.add(id);
      btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = 'Aprovando...';

      try {
        await BackendAPI.approveAccessRequest(id);
        setApprovalFeedback('Usuário aprovado com sucesso.', 'ok');
        await loadPendingApprovals();
      } catch (error) {
        setApprovalFeedback((error && error.message) ? error.message : 'Falha ao aprovar usuário.', 'error');
        approvingIds.delete(id);
        btn.disabled = false;
        btn.textContent = oldText;
      }
    });
  }

  function bindNoticeActions() {
    if (!noticeForm.dataset.bound) {
      noticeForm.dataset.bound = 'true';
      noticeForm.addEventListener('submit', handleNoticeSubmit);
    }

    if (cancelNoticeBtn && !cancelNoticeBtn.dataset.bound) {
      cancelNoticeBtn.dataset.bound = 'true';
      cancelNoticeBtn.addEventListener('click', resetNoticeForm);
    }

    if (!noticeTableBody.dataset.bound) {
      noticeTableBody.dataset.bound = 'true';
      noticeTableBody.addEventListener('click', async function (event) {
        const editBtn = event.target.closest('button[data-edit-notice-id]');
        if (editBtn) {
          populateNoticeForm({
            id: String(editBtn.getAttribute('data-edit-notice-id') || '').trim(),
            titulo: editBtn.getAttribute('data-notice-title') || '',
            tipo: editBtn.getAttribute('data-notice-type') || 'aviso',
            publicado: editBtn.getAttribute('data-notice-published') || 'true',
            conteudo: editBtn.getAttribute('data-notice-content') || ''
          });
          return;
        }

        const deleteBtn = event.target.closest('button[data-delete-notice-id]');
        if (!deleteBtn) return;

        const id = String(deleteBtn.getAttribute('data-delete-notice-id') || '').trim();
        if (!id || deletingNoticeIds.has(id)) return;

        const title = String(deleteBtn.getAttribute('data-notice-title') || 'esta novidade').trim();
        if (!window.confirm('Deseja excluir a publicação "' + title + '"?')) return;

        deletingNoticeIds.add(id);
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Excluindo...';

        try {
          await BackendAPI.deleteSystemNotice(id);
          setNoticesFeedback('Publicação excluída com sucesso.', 'ok');
          resetNoticeForm();
          await loadSystemNotices();
          await loadAuditEvents();
          if (AppCore.refreshSystemNoticeCenter) await AppCore.refreshSystemNoticeCenter();
        } catch (error) {
          setNoticesFeedback((error && error.message) ? error.message : 'Falha ao excluir a publicação.', 'error');
        } finally {
          deletingNoticeIds.delete(id);
        }
      });
    }
  }

  async function handleNoticeSubmit(event) {
    event.preventDefault();
    if (isSavingNotice) return;

    const payload = {
      id: String(noticeForm.id.value || '').trim(),
      titulo: String(noticeForm.titulo.value || '').trim(),
      tipo: String(noticeForm.tipo.value || 'aviso').trim().toLowerCase(),
      publicado: String(noticeForm.publicado.value || 'true') === 'true',
      conteudo: String(noticeForm.conteudo.value || '').trim()
    };

    if (!payload.titulo || !payload.conteudo) {
      setNoticesFeedback('Preencha título e conteúdo para publicar a novidade.', 'error');
      return;
    }

    isSavingNotice = true;
    setNoticeSavingState(true);

    try {
      await BackendAPI.saveSystemNotice(payload);
      setNoticesFeedback(payload.id ? 'Publicação atualizada com sucesso.' : 'Novidade publicada com sucesso.', 'ok');
      resetNoticeForm();
      await loadSystemNotices();
      await loadAuditEvents();
      if (AppCore.refreshSystemNoticeCenter) await AppCore.refreshSystemNoticeCenter();
    } catch (error) {
      setNoticesFeedback((error && error.message) ? error.message : 'Falha ao salvar a novidade.', 'error');
    } finally {
      isSavingNotice = false;
      setNoticeSavingState(false);
    }
  }

  async function loadPendingApprovals() {
    try {
      const pending = await BackendAPI.listPendingAccessRequests();
      if (!pending || pending.length === 0) {
        approvalTableBody.innerHTML = '<tr><td colspan="6">Nenhuma solicitação pendente.</td></tr>';
        return;
      }

      approvalTableBody.innerHTML = pending.map(function (item) {
        const id = String(item.id || '');
        const approving = approvingIds.has(id);
        return '<tr>' +
          '<td>' + AppCore.escapeHtml(item.nome_completo || '-') + '</td>' +
          '<td>' + AppCore.escapeHtml(item.cpf || '-') + '</td>' +
          '<td>' + AppCore.escapeHtml(item.matricula || '-') + '</td>' +
          '<td>' + AppCore.escapeHtml(item.username || '-') + '</td>' +
          '<td><span class="status-chip status-warning">Pendente</span></td>' +
          '<td><button class="action-btn" data-approve-id="' + AppCore.escapeHtml(id) + '" ' + (approving ? 'disabled' : '') + '>' + (approving ? 'Aprovando...' : 'Aprovar') + '</button></td>' +
        '</tr>';
      }).join('');
    } catch (error) {
      approvalTableBody.innerHTML = '<tr><td colspan="6">Falha ao carregar solicitações pendentes.</td></tr>';
      setApprovalFeedback((error && error.message) ? error.message : 'Falha ao consultar aprovações.', 'error');
    }
  }

  async function loadAuditEvents() {
    try {
      const events = await BackendAPI.listAuditEvents(25);
      if (!events || events.length === 0) {
        auditTableBody.innerHTML = '<tr><td colspan="4">Nenhuma ação registrada até o momento.</td></tr>';
        return;
      }

      auditTableBody.innerHTML = events.map(function (item) {
        const payload = item.payload || {};
        const resumo = [
          payload.numeroContrato ? 'Contrato ' + payload.numeroContrato : '',
          payload.processoSei ? 'Processo ' + payload.processoSei : '',
          payload.empresaContratada ? payload.empresaContratada : '',
          payload.status ? 'Status ' + formatAuditStatus(payload.status) : ''
        ].filter(Boolean).join(' • ');
        return '<tr>' +
          '<td>' + AppCore.escapeHtml(formatAuditDate(item.criadoEm)) + '</td>' +
          '<td>' + AppCore.escapeHtml(item.usuario || '-') + '</td>' +
          '<td><span class="tag tag-audit">' + AppCore.escapeHtml(item.acaoLabel || 'Ação') + '</span></td>' +
          '<td>' + AppCore.escapeHtml(resumo || 'Registro sem resumo.') + '</td>' +
        '</tr>';
      }).join('');
    } catch (error) {
      auditTableBody.innerHTML = '<tr><td colspan="4">Falha ao carregar a central de ações.</td></tr>';
      setAuditFeedback((error && error.message) ? error.message : 'Falha ao consultar a central de ações.', 'error');
    }
  }

  async function loadSystemNotices() {
    try {
      const notices = await BackendAPI.listSystemNotices(true);
      if (!notices || notices.length === 0) {
        noticeTableBody.innerHTML = '<tr><td colspan="5">Nenhuma publicação cadastrada.</td></tr>';
        return;
      }

      noticeTableBody.innerHTML = notices.map(function (item) {
        const deleting = deletingNoticeIds.has(String(item.id || ''));
        const typeLabel = getTypeLabel(item.tipo);
        const updated = item.atualizadoEm ? AppCore.formatDate(item.atualizadoEm.slice(0, 10)) : '-';
        return '<tr>' +
          '<td><strong>' + AppCore.escapeHtml(item.titulo || '-') + '</strong><div class="table-subtext">' + AppCore.escapeHtml(shortenText(item.conteudo, 96)) + '</div></td>' +
          '<td><span class="tag tag-' + AppCore.escapeHtml(String(item.tipo || 'aviso').toLowerCase()) + '">' + AppCore.escapeHtml(typeLabel) + '</span></td>' +
          '<td><span class="status-chip ' + (item.publicado ? 'status-ok' : 'status-closed') + '">' + (item.publicado ? 'Publicado' : 'Oculto') + '</span></td>' +
          '<td>' + AppCore.escapeHtml(updated) + '</td>' +
          '<td><div class="action-inline-group">' +
            '<button type="button" class="action-btn subtle" data-edit-notice-id="' + AppCore.escapeHtml(String(item.id || '')) + '" data-notice-title="' + AppCore.escapeHtml(item.titulo || '') + '" data-notice-type="' + AppCore.escapeHtml(item.tipo || 'aviso') + '" data-notice-published="' + AppCore.escapeHtml(String(item.publicado !== false)) + '" data-notice-content="' + AppCore.escapeHtml(item.conteudo || '') + '">Editar</button>' +
            '<button type="button" class="action-btn danger" data-delete-notice-id="' + AppCore.escapeHtml(String(item.id || '')) + '" data-notice-title="' + AppCore.escapeHtml(item.titulo || '') + '" ' + (deleting ? 'disabled' : '') + '>' + (deleting ? 'Excluindo...' : 'Excluir') + '</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
    } catch (error) {
      noticeTableBody.innerHTML = '<tr><td colspan="5">Falha ao carregar publicações.</td></tr>';
      setNoticesFeedback((error && error.message) ? error.message : 'Falha ao consultar novidades do sistema.', 'error');
    }
  }

  function populateNoticeForm(item) {
    noticeForm.id.value = String(item && item.id ? item.id : '');
    noticeForm.titulo.value = String(item && item.titulo ? item.titulo : '');
    noticeForm.tipo.value = String(item && item.tipo ? item.tipo : 'aviso');
    noticeForm.publicado.value = String(item && typeof item.publicado !== 'undefined' ? item.publicado : 'true');
    noticeForm.conteudo.value = String(item && item.conteudo ? item.conteudo : '');
    if (cancelNoticeBtn) cancelNoticeBtn.hidden = false;
    if (saveNoticeBtn) saveNoticeBtn.textContent = 'Salvar atualização';
    noticeForm.titulo.focus();
  }

  function resetNoticeForm() {
    noticeForm.reset();
    noticeForm.id.value = '';
    noticeForm.tipo.value = 'aviso';
    noticeForm.publicado.value = 'true';
    if (cancelNoticeBtn) cancelNoticeBtn.hidden = true;
    if (saveNoticeBtn) saveNoticeBtn.textContent = 'Publicar novidade';
  }

  function setNoticeSavingState(active) {
    if (!saveNoticeBtn) return;
    saveNoticeBtn.disabled = !!active;
    saveNoticeBtn.textContent = active ? 'Salvando...' : (noticeForm && noticeForm.id.value ? 'Salvar atualização' : 'Publicar novidade');
    if (cancelNoticeBtn) cancelNoticeBtn.disabled = !!active;
  }

  function setAuditFeedback(message, type) {
    auditFeedback.textContent = message;
    auditFeedback.className = 'form-feedback ' + (type || 'ok');
    auditFeedback.hidden = false;
  }

  function setApprovalFeedback(message, type) {
    approvalFeedback.textContent = message;
    approvalFeedback.className = 'form-feedback ' + (type || 'ok');
    approvalFeedback.hidden = false;
  }

  function setNoticesFeedback(message, type) {
    noticesFeedback.textContent = message;
    noticesFeedback.className = 'form-feedback ' + (type || 'ok');
    noticesFeedback.hidden = false;
  }

  function formatAuditDate(value) {
    if (!value) return '-';
    return AppCore.formatDate(value.slice(0, 10)) + ' ' + String(value).slice(11, 16);
  }

  function formatAuditStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'encerrado') return 'Encerrado';
    if (normalized === 'vencido') return 'Vencido';
    return 'Vigente';
  }

  function getTypeLabel(type) {
    const normalized = String(type || 'aviso').trim().toLowerCase();
    if (normalized === 'alerta') return 'Alerta';
    if (normalized === 'novidade') return 'Novidade';
    return 'Aviso';
  }

  function shortenText(text, max) {
    const value = String(text || '').trim();
    if (value.length <= max) return value || '-';
    return value.slice(0, max - 1).trim() + '…';
  }
})();



