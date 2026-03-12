(function () {
  const form = document.getElementById('forgot-password-form');
  const feedback = document.getElementById('forgot-feedback');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !feedback) return;

  let isSubmitting = false;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isSubmitting) return;

    feedback.hidden = true;
    isSubmitting = true;
    setSubmittingState(true);

    const email = String(form.email.value || '').trim();
    if (!email) {
      showFeedback('Informe o e-mail cadastrado.', 'error');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    try {
      await BackendAPI.sendPasswordReset(email);
      showFeedback('Solicita\u00e7\u00e3o enviada. Verifique seu e-mail para redefinir a senha.', 'ok');
      form.reset();
    } catch (error) {
      showFeedback((error && error.message) ? error.message : 'Falha ao solicitar recupera\u00e7\u00e3o de senha.', 'error');
    } finally {
      isSubmitting = false;
      setSubmittingState(false);
    }
  });

  function setSubmittingState(active) {
    if (!submitBtn) return;
    submitBtn.disabled = !!active;
    submitBtn.textContent = active ? 'Enviando...' : 'Enviar recupera\u00e7\u00e3o';
  }

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.hidden = false;
    feedback.className = type === 'ok' ? 'form-feedback ok' : 'login-error';
  }
})();



