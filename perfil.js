(function () {
  AppCore.initShell('perfil');

  const form = document.getElementById('profile-form');
  const feedback = document.getElementById('profile-feedback');
  const preview = document.getElementById('profile-preview');
  const fileInput = document.getElementById('fotoPerfil');
  const clearPhotoBtn = document.getElementById('clear-photo');
  const saveBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !feedback || !preview || !fileInput || !clearPhotoBtn) return;

  let photoData = '';
  let isSaving = false;

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
      const fallback = AppCore.getProfile(BackendAPI.getCurrentAuthUser());
      photoData = fallback.foto || '';
      form.nome.value = fallback.nome || '';
      form.cpf.value = AppCore.formatCpf(fallback.cpf || '');
      form.matricula.value = fallback.matricula || '';
      form.funcao.value = fallback.funcao || '';
      updatePreview();
      showFeedback('Não foi possível carregar os dados do usuário no backend. Exibindo a última versão local.', 'warn');
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

  function setSavingState(active) {
    if (!saveBtn) return;
    saveBtn.disabled = !!active;
    saveBtn.textContent = active ? 'Salvando...' : 'Salvar perfil';
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
