(function () {
  AppCore.initShell('perfil');

  const form = document.getElementById('profile-form');
  const feedback = document.getElementById('profile-feedback');
  const preview = document.getElementById('profile-preview');
  const fileInput = document.getElementById('fotoPerfil');
  const clearPhotoBtn = document.getElementById('clear-photo');
  const saveBtn = form ? form.querySelector('button[type="submit"]') : null;

  const passwordForm = document.getElementById('password-form');
  const passwordFeedback = document.getElementById('password-feedback');
  const passwordBtn = passwordForm ? passwordForm.querySelector('button[type="submit"]') : null;

  if (!form || !feedback || !preview || !fileInput || !clearPhotoBtn || !passwordForm || !passwordFeedback) return;

  let photoData = '';
  let isSaving = false;
  let isChangingPassword = false;

  bootstrap();

  async function bootstrap() {
    try {
      const profile = await BackendAPI.getProfile();
      photoData = profile.foto || '';
      form.nome.value = profile.nome || '';
      form.cpf.value = AppCore.formatCpf(profile.cpf || '');
      form.email.value = profile.email || BackendAPI.getCurrentAuthUser() || '';
      form.matricula.value = profile.matricula || '';
      form.funcao.value = profile.funcao || '';
      updatePreview();
    } catch (_error) {
      const fallback = AppCore.getProfile(BackendAPI.getCurrentAuthUser());
      photoData = fallback.foto || '';
      form.nome.value = fallback.nome || '';
      form.cpf.value = AppCore.formatCpf(fallback.cpf || '');
      form.email.value = fallback.email || BackendAPI.getCurrentAuthUser() || '';
      form.matricula.value = fallback.matricula || '';
      form.funcao.value = fallback.funcao || '';
      updatePreview();
      showFeedback('Nao foi possivel carregar os dados do usuario no backend. Exibindo a ultima versao local.', 'warn');
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
      showFeedback('CPF invalido. Verifique o numero informado.', 'error');
      return;
    }

    const email = String(form.email.value || '').trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback('Informe um e-mail valido para usar como login.', 'error');
      return;
    }

    const payload = {
      nome: String(form.nome.value || '').trim(),
      email: email,
      cpf: cpfDigits,
      matricula: String(form.matricula.value || '').trim(),
      funcao: String(form.funcao.value || '').trim(),
      foto: photoData
    };

    isSaving = true;
    setSavingState(true);

    try {
      const saved = await BackendAPI.saveProfile(payload);
      AppCore.saveProfile(saved.email || BackendAPI.getCurrentAuthUser(), saved);
      const savedEmail = String(saved && saved.email ? saved.email : '').trim().toLowerCase();
      const successMessage = savedEmail === email
        ? 'Dados do usuario atualizados com sucesso. O e-mail informado tambem pode ser usado como login.'
        : 'Dados do usuario atualizados com sucesso. Se o provedor solicitar confirmacao do novo e-mail, conclua-a para usar o novo login.';
      showFeedback(successMessage, 'ok');
      setTimeout(function () {
        window.location.reload();
      }, 300);
    } catch (_error) {
      showFeedback(((_error && _error.message) ? _error.message : 'Nao foi possivel salvar os dados do usuario no backend.'), 'error');
    } finally {
      isSaving = false;
      setSavingState(false);
    }
  });

  passwordForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isChangingPassword) return;

    clearPasswordFeedback();

    const currentPassword = String(passwordForm.senhaAtual.value || '');
    const nextPassword = String(passwordForm.novaSenha.value || '');
    const confirmPassword = String(passwordForm.confirmarNovaSenha.value || '');

    if (!currentPassword || !nextPassword || !confirmPassword) {
      showPasswordFeedback('Preencha a senha atual, a nova senha e a confirmacao.', 'error');
      return;
    }

    if (nextPassword.length < 8) {
      showPasswordFeedback('A nova senha deve ter no minimo 8 caracteres.', 'error');
      return;
    }

    if (nextPassword !== confirmPassword) {
      showPasswordFeedback('A confirmacao da nova senha nao confere.', 'error');
      return;
    }

    if (currentPassword === nextPassword) {
      showPasswordFeedback('A nova senha precisa ser diferente da senha atual.', 'error');
      return;
    }

    isChangingPassword = true;
    setPasswordSavingState(true);

    try {
      await BackendAPI.changePassword(currentPassword, nextPassword);
      passwordForm.reset();
      showPasswordFeedback('Senha atualizada com sucesso.', 'ok');
    } catch (error) {
      showPasswordFeedback((error && error.message) ? error.message : 'Nao foi possivel atualizar a senha.', 'error');
    } finally {
      isChangingPassword = false;
      setPasswordSavingState(false);
    }
  });

  function setSavingState(active) {
    if (!saveBtn) return;
    saveBtn.disabled = !!active;
    saveBtn.textContent = active ? 'Salvando...' : 'Salvar perfil';
  }

  function setPasswordSavingState(active) {
    if (!passwordBtn) return;
    passwordBtn.disabled = !!active;
    passwordBtn.textContent = active ? 'Atualizando...' : 'Atualizar senha';
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

  function clearPasswordFeedback() {
    passwordFeedback.textContent = '';
    passwordFeedback.hidden = true;
    passwordFeedback.className = 'form-feedback';
  }

  function showPasswordFeedback(message, type) {
    passwordFeedback.textContent = message;
    passwordFeedback.className = 'form-feedback ' + (type || 'ok');
    passwordFeedback.hidden = false;
  }
})();
