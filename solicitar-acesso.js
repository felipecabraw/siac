(function () {
  const form = document.getElementById('request-access-form');
  const feedback = document.getElementById('request-feedback');
  const submitBtn = form.querySelector('button[type="submit"]');
  let isSubmitting = false;

  clearSensitiveFields();
  window.addEventListener('pageshow', clearSensitiveFields);

  form.cpf.addEventListener('input', function () {
    form.cpf.value = AppCore.formatCpf(form.cpf.value);
  });

  form.matricula.addEventListener('input', function () {
    form.matricula.value = String(form.matricula.value || '').toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    isSubmitting = true;
    setSubmittingState(true);
    setFeedback('', '');

    const nome = String(form.nome.value || '').trim();
    const cpfDigits = AppCore.onlyDigits(form.cpf.value);
    const matricula = String(form.matricula.value || '').trim();
    const email = String(form.email.value || '').trim();
    const senha = String(form.senha.value || '');
    const confirmar = String(form.confirmarSenha.value || '');

    if (!AppCore.isValidCpf(cpfDigits)) {
      setFeedback('CPF invalido. Verifique o numero informado.', 'error');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    if (senha.length < 8) {
      setFeedback('A senha deve possuir no minimo 8 caracteres.', 'error');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    if (senha !== confirmar) {
      setFeedback('Senha e confirmacao nao conferem.', 'error');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    try {
      await BackendAPI.requestAccess({
        nome: nome,
        cpf: cpfDigits,
        matricula: matricula,
        email: email,
        senha: senha
      });

      setFeedback('Solicitacao enviada com sucesso. Aguarde aprovacao do Administrador Senior.', 'ok');
      form.reset();
      clearSensitiveFields();
      setTimeout(function () {
        window.location.href = 'index.html';
      }, 1800);
    } catch (error) {
      setFeedback((error && error.message) ? error.message : 'Falha ao enviar solicitacao de acesso.', 'error');
    } finally {
      isSubmitting = false;
      setSubmittingState(false);
    }
  });

  function clearSensitiveFields() {
    if (!form) return;
    form.email.value = '';
    form.senha.value = '';
    form.confirmarSenha.value = '';
  }

  function setSubmittingState(active) {
    if (!submitBtn) return;
    submitBtn.disabled = !!active;
    submitBtn.textContent = active ? 'Enviando...' : 'Enviar solicitacao';
  }

  function setFeedback(message, type) {
    if (!message) {
      feedback.textContent = '';
      feedback.hidden = true;
      return;
    }

    feedback.textContent = message;
    feedback.hidden = false;
    feedback.className = type === 'ok' ? 'form-feedback ok' : 'login-error';
  }
})();
