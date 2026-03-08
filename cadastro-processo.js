(function () {
  AppCore.initShell('cadastro');

  const form = document.getElementById('process-form');
  const feedback = document.getElementById('form-feedback');
  const demoBtn = document.getElementById('seed-demo');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !feedback || !demoBtn) return;

  let isSubmitting = false;
  let isSeeding = false;

  form.numeroProcesso.addEventListener('input', function () {
    form.numeroProcesso.value = form.numeroProcesso.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  form.numeroContrato.addEventListener('input', function () {
    form.numeroContrato.value = form.numeroContrato.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  form.valorContrato.addEventListener('input', function () {
    form.valorContrato.value = AppCore.formatCurrencyInput(form.valorContrato.value);
  });

  form.addEventListener('submit', handleSubmit);
  demoBtn.addEventListener('click', handleSeedDemo);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || isSeeding) return;

    clearFeedback();
    isSubmitting = true;
    setBusyState(true, false);

    const data = new FormData(form);
    const inicio = data.get('inicioVigencia');
    const termino = data.get('terminoVigencia');
    const numeroProcesso = String(data.get('numeroProcesso') || '').trim();
    const numeroContrato = String(data.get('numeroContrato') || '').trim();
    const valorContrato = AppCore.parseCurrencyBrl(data.get('valorContrato'));

    if (new Date(termino) < new Date(inicio)) {
      setFeedback('A data de término da vigência deve ser igual ou posterior ao início.', 'error');
      isSubmitting = false;
      setBusyState(false, false);
      return;
    }

    if (!Number.isFinite(valorContrato) || valorContrato <= 0) {
      setFeedback('Informe um valor de contrato válido e maior que zero.', 'error');
      isSubmitting = false;
      setBusyState(false, false);
      return;
    }

    try {
      const hasDuplicate = await BackendAPI.hasDuplicateProcesso(numeroProcesso, numeroContrato);
      if (hasDuplicate) {
        setFeedback('Já existe processo ou contrato com essa numeração.', 'error');
        return;
      }
    } catch (_error) {
      setFeedback('Não foi possível validar duplicidade no backend.', 'error');
      return;
    }

    const item = {
      numeroProcesso: numeroProcesso,
      numeroContrato: numeroContrato,
      inicioVigencia: inicio,
      terminoVigencia: termino,
      gestorContrato: String(data.get('gestorContrato') || '').trim(),
      fiscalContrato: String(data.get('fiscalContrato') || '').trim(),
      fonteRecurso: String(data.get('fonteRecurso') || '').trim(),
      dataAssinatura: String(data.get('dataAssinatura') || '').trim(),
      dataPublicacao: String(data.get('dataPublicacao') || '').trim(),
      valorContrato: valorContrato,
      objetoContrato: String(data.get('objetoContrato') || '').trim(),
      fundamentacaoContrato: String(data.get('fundamentacaoContrato') || '').trim()
    };

    try {
      await BackendAPI.createProcesso(item);
      form.reset();
      setFeedback('Processo cadastrado com sucesso.', 'ok');
    } catch (_error) {
      setFeedback('Falha ao salvar processo no backend.', 'error');
    } finally {
      isSubmitting = false;
      setBusyState(false, false);
    }
  }

  async function handleSeedDemo() {
    if (isSeeding || isSubmitting) return;

    isSeeding = true;
    setBusyState(false, true);

    try {
      const current = await BackendAPI.listProcessos();
      if (current.length > 0) {
        setFeedback('Já existem processos cadastrados. A carga de exemplo não foi aplicada.', 'warn');
        return;
      }

      const demo = ProcessoStore.demoData();
      for (let i = 0; i < demo.length; i += 1) {
        await BackendAPI.createProcesso(demo[i]);
      }

      setFeedback('Dados de exemplo inseridos com sucesso.', 'ok');
    } catch (_error) {
      setFeedback('Falha ao inserir dados de exemplo.', 'error');
    } finally {
      isSeeding = false;
      setBusyState(false, false);
    }
  }

  function setBusyState(submitting, seeding) {
    if (submitBtn) {
      submitBtn.disabled = !!submitting || !!seeding;
      submitBtn.textContent = submitting ? 'Salvando...' : 'Salvar processo';
    }
    if (demoBtn) {
      demoBtn.disabled = !!submitting || !!seeding;
      demoBtn.textContent = seeding ? 'Inserindo...' : 'Inserir dados de exemplo';
    }
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + type;
    feedback.hidden = false;
  }

  function clearFeedback() {
    feedback.hidden = true;
    feedback.className = 'form-feedback';
    feedback.textContent = '';
  }
})();
