(function () {
  AppCore.initShell('perfil');

  const form = document.getElementById('profile-form');
  const feedback = document.getElementById('profile-feedback');
  const preview = document.getElementById('profile-preview');
  const fileInput = document.getElementById('fotoPerfil');
  const clearPhotoBtn = document.getElementById('clear-photo');

  const approvalPanel = document.getElementById('admin-approval-panel');
  const approvalFeedback = document.getElementById('approval-feedback');
  const approvalTableBody = document.getElementById('approval-table-body');
  const saveBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !feedback || !preview || !fileInput || !clearPhotoBtn) return;

  let photoData = '';
  let isSaving = false;
  const approvingIds = new Set();

  bootstrap();

  async function bootstrap() {
    try {
      const profile = await BackendAPI.getProfile();
      photoData = profile.foto || '';
      form.nome.value = profile.nome || '';
      form.cpf.value = AppCore.formatCpf(profile.cpf || '');
      form.matricula.value = profile.matricula || '';
      form.funcao.value = profile.funcao || '';
      updatePreview();
    } catch (_error) {
      showFeedback('Não foi possível carregar os dados do usuário.', 'error');
    }

    if (approvalPanel && BackendAPI.isCurrentUserSeniorAdmin()) {
      approvalPanel.hidden = false;
      await loadPendingApprovals();
      bindApprovalActions();
    }
  }

  form.cpf.addEventListener('input', function () {
    form.cpf.value = AppCore.formatCpf(form.cpf.value);
  });

  form.matricula.addEventListener('input', function () {
    form.matricula.value = form.matricula.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  fileInput.addEventListener('change', function () {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      photoData = String(event.target.result || '');
      updatePreview();
    };
    reader.readAsDataURL(file);
  });

  clearPhotoBtn.addEventListener('click', function () {
    photoData = '';
    fileInput.value = '';
    updatePreview();
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSaving) return;

    const cpfDigits = AppCore.onlyDigits(form.cpf.value);
    if (!AppCore.isValidCpf(cpfDigits)) {
      showFeedback('CPF inválido. Verifique o número informado.', 'error');
      return;
    }

    const payload = {
      nome: String(form.nome.value || '').trim(),
      cpf: cpfDigits,
      matricula: String(form.matricula.value || '').trim(),
      funcao: String(form.funcao.value || '').trim(),
      foto: photoData
    };

    isSaving = true;
    setSavingState(true);

    try {
      await BackendAPI.saveProfile(payload);
      AppCore.saveProfile(BackendAPI.getCurrentAuthUser(), payload);
      showFeedback('Dados do usuário atualizados com sucesso.', 'ok');
      setTimeout(function () {
        window.location.reload();
      }, 300);
    } catch (_error) {
      showFeedback('Não foi possível salvar os dados do usuário no backend.', 'error');
    } finally {
      isSaving = false;
      setSavingState(false);
    }
  });

  function bindApprovalActions() {
    if (!approvalTableBody) return;

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

  async function loadPendingApprovals() {
    if (!approvalTableBody) return;

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

  function setSavingState(active) {
    if (!saveBtn) return;
    saveBtn.disabled = !!active;
    saveBtn.textContent = active ? 'Salvando...' : 'Salvar perfil';
  }

  function setApprovalFeedback(message, type) {
    if (!approvalFeedback) return;
    approvalFeedback.textContent = message;
    approvalFeedback.className = 'form-feedback ' + (type || 'ok');
    approvalFeedback.hidden = false;
  }

  function updatePreview() {
    if (photoData) {
      preview.src = photoData;
      preview.classList.remove('empty');
      return;
    }

    preview.src = 'logoSispern.png';
    preview.classList.add('empty');
  }

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + (type || 'ok');
    feedback.hidden = false;
  }
})();

