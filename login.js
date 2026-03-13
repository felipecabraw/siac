(function () {
  const form = document.getElementById('login-form');
  const errorBox = document.getElementById('login-error');
  const userInput = document.getElementById('usuario');
  const passwordInput = document.getElementById('senha');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !errorBox || !userInput || !passwordInput || !togglePasswordBtn) return;

  let isSubmitting = false;

  form.addEventListener('submit', handleSubmit);
  togglePasswordBtn.addEventListener('click', handleTogglePassword);
  userInput.focus();

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    clearError();
    isSubmitting = true;
    setSubmittingState(true);

    const username = String(form.usuario.value || '').trim();
    const password = String(form.senha.value || '').trim();

    if (!username || !password) {
      setError('Informe CPF/E-mail e senha.');
      isSubmitting = false;
      setSubmittingState(false);
      return;
    }

    const loginValue = String(username || '').trim().toLowerCase();

    try {
      const result = await BackendAPI.signIn(loginValue, password);
      if (!result.ok) {
        setError(result.message || 'Credenciais inv\u00e1lidas.');
        return;
      }

      window.location.href = 'dashboard.html';
    } catch (_error) {
      setError(((_error && _error.message) ? _error.message : 'Falha ao autenticar. Verifique a conex\u00e3o com o backend.'));
    } finally {
      isSubmitting = false;
      setSubmittingState(false);
    }
  }

  function handleTogglePassword() {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    togglePasswordBtn.textContent = isVisible ? 'Mostrar' : 'Ocultar';
    togglePasswordBtn.setAttribute('aria-label', isVisible ? 'Mostrar senha' : 'Ocultar senha');
    togglePasswordBtn.setAttribute('aria-pressed', isVisible ? 'false' : 'true');
  }

  function setSubmittingState(active) {
    if (!submitBtn) return;
    submitBtn.disabled = !!active;
    submitBtn.textContent = active ? 'Entrando...' : 'Entrar';
  }

  function setError(message) {
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    errorBox.textContent = '';
    errorBox.hidden = true;
  }
})();
