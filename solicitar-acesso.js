(function () {
  const form = document.getElementById('request-access-form');
  const feedback = document.getElementById('request-feedback');
  const submitBtn = form.querySelector('button[type="submit"]');
  let isSubmitting = false;

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
      setFeedback('CPF inválido. Verifique o número informado.', 'error');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    if (senha.length < 8) {
      setFeedback('A senha deve possuir no mínimo 8 caracteres.', 'error');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    if (senha !== confirmar) {
      setFeedback('Senha e confirmação não conferem.', 'error');
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

      setFeedback('Solicitação enviada com sucesso. Aguarde aprovação do Administrador Sênior.', 'ok');
      form.reset();
      setTimeout(function () {
        window.location.href = 'index.html';
      }, 1800);
    } catch (error) {
      setFeedback((error && error.message) ? error.message : 'Falha ao enviar solicitação de acesso.', 'error');
    } finally {
      isSubmitting = false;
      setSubmittingState(false);
    }
  });

  function setSubmittingState(active) {
    if (!submitBtn) return;
    submitBtn.disabled = !!active;
    submitBtn.textContent = active ? 'Enviando...' : 'Enviar solicitação';
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

