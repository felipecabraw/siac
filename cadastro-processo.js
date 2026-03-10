(function () {
  AppCore.initShell('cadastro');

  const form = document.getElementById('process-form');
  const feedback = document.getElementById('form-feedback');
  const demoBtn = document.getElementById('seed-demo');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;

  if (!form || !feedback || !demoBtn) return;

  let isSubmitting = false;
  let isSeeding = false;

  form.processoSei.addEventListener('input', function () {
    form.processoSei.value = form.processoSei.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  form.numeroContrato.addEventListener('input', function () {
    form.numeroContrato.value = form.numeroContrato.value.toUpperCase().replace(/[^A-Z0-9\-/.]/g, '');
  });

  form.valorGlobal.addEventListener('input', function () {
    form.valorGlobal.value = AppCore.formatCurrencyInput(form.valorGlobal.value);
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
    const inicio = String(data.get('inicioVigencia') || '').trim();
    const fim = String(data.get('fimVigencia') || '').trim();
    const processoSei = String(data.get('processoSei') || '').trim();
    const numeroContrato = String(data.get('numeroContrato') || '').trim();
    const valorGlobal = AppCore.parseCurrencyBrl(data.get('valorGlobal'));

    if (new Date(fim) < new Date(inicio)) {
      setFeedback('A data de fim da vig\u00eancia deve ser igual ou posterior ao in\u00edcio.', 'error');
      isSubmitting = false;
      setBusyState(false, false);
      return;
    }

    if (!Number.isFinite(valorGlobal) || valorGlobal <= 0) {
      setFeedback('Informe um valor global v\u00e1lido e maior que zero.', 'error');
      isSubmitting = false;
      setBusyState(false, false);
      return;
    }

    try {
      const hasDuplicate = await BackendAPI.hasDuplicateProcesso(processoSei, numeroContrato);
      if (hasDuplicate) {
        setFeedback('J\u00e1 existe contrato cadastrado com esse Processo SEI n\u00ba ou n\u00famero de contrato.', 'error');
        return;
      }
    } catch (_error) {
      setFeedback('N\u00e3o foi poss\u00edvel validar duplicidade no backend.', 'error');
      return;
    }

    const item = {
      processoSei: processoSei,
      numeroContrato: numeroContrato,
      objeto: String(data.get('objeto') || '').trim(),
      fundamentacaoLegal: String(data.get('fundamentacaoLegal') || '').trim(),
      empresaContratada: String(data.get('empresaContratada') || '').trim(),
      valorGlobal: valorGlobal,
      fonte: String(data.get('fonte') || '').trim(),
      gestorContrato: String(data.get('gestorContrato') || '').trim(),
      fiscaisContrato: String(data.get('fiscaisContrato') || '').trim(),
      inicioVigencia: inicio,
      fimVigencia: fim
    };

    try {
      await BackendAPI.createProcesso(item);
      form.reset();
      setFeedback('Contrato cadastrado com sucesso.', 'ok');
    } catch (_error) {
      setFeedback('Falha ao salvar contrato no backend.', 'error');
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
        setFeedback('J\u00e1 existem contratos cadastrados. A carga de exemplo n\u00e3o foi aplicada.', 'warn');
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
      submitBtn.textContent = submitting ? 'Salvando...' : 'Salvar contrato';
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
