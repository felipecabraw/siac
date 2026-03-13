(function () {
  AppCore.initShell('patrimonio');

  const UNIDADES_SEAP = [
    'SECRETARIA DE ADMINISTRACAO PENITENCIARIA',
    'CENTRAL DE MONITORAMENTO ELETRONICO',
    'PENITENCIARIA ESTADUAL ROGERIO COUTINHO MADRUGA',
    'PENITENCIARIA ESTADUAL DE ALCACUZ',
    'PENITENCIARIA ESTADUAL DE PARNAMIRIM',
    'PENITENCIARIA ESTADUAL DO SERIDO',
    'CADEIA PUBLICA DE CARAUBAS',
    'CADEIA PUBLICA DE NATAL',
    'CADEIA PUBLICA DE NOVA CRUZ',
    'CADEIA PUBLICA DE CEARA-MIRIM',
    'CADEIA PUBLICA DE MOSSORO',
    'CENTRO DE DETENCAO PROVISORIA DE PARNAMIRIM/FEMININO',
    'CENTRO DE DETENCAO PROVISORIA DE APODI',
    'COMPLEXO PENAL JOAO CHAVES (FEMININO)',
    'COMPLEXO PENAL REGIONAL DE PAU DOS FERROS',
    'UNIDADE PSIQUIATRICA DE CUSTODIA E TRATAMENTO',
    'CENTRAL DE RECEBIMENTO E TRIAGEM',
    'COMPLEXO PENAL ESTADUAL AGRICOLA MARIO NEGOCIO (MASCULINO)',
    'COMPLEXO PENAL ESTADUAL AGRICOLA MARIO NEGOCIO (FEMININO)'
  ].map(function (label) {
    return label
      .replace('ADMINISTRACAO', 'ADMINISTRA\u00c7\u00c3O')
      .replace('PENITENCIARIA', 'PENITENCI\u00c1RIA')
      .replace('ELETRONICO', 'ELETR\u00d4NICO')
      .replace('ROGERIO', 'ROG\u00c9RIO')
      .replace('ALCACUZ', 'ALCA\u00c7UZ')
      .replace('SERIDO', 'SERID\u00d3')
      .replace('PUBLICA', 'P\u00daBLICA')
      .replace('CARAUBAS', 'CARA\u00daBAS')
      .replace('CEARA-MIRIM', 'CEAR\u00c1-MIRIM')
      .replace('MOSSORO', 'MOSSOR\u00d3')
      .replace('DETENCAO', 'DETEN\u00c7\u00c3O')
      .replace('PROVISORIA', 'PROVIS\u00d3RIA')
      .replace('JOAO', 'JO\u00c3O')
      .replace('PSIQUIATRICA', 'PSIQUI\u00c1TRICA')
      .replace('CUSTODIA', 'CUST\u00d3DIA')
      .replace('AGRICOLA', 'AGR\u00cdCOLA')
      .replace('MARIO', 'M\u00c1RIO')
      .replace('NEGOCIO', 'NEG\u00d3CIO');
  });

  const CATEGORY_LABELS = {
    armamentos_acessorios_operacionais: 'Armamentos e acess\u00f3rios operacionais',
    equipamentos_taticos_protecao: 'Equipamentos t\u00e1ticos, de prote\u00e7\u00e3o e seguran\u00e7a',
    viaturas_veiculos_embarcacoes_aeronaves: 'Viaturas, ve\u00edculos, embarca\u00e7\u00f5es e aeronaves',
    informatica_tic: 'Inform\u00e1tica e TIC',
    comunicacao_monitoramento_audio_video: 'Comunica\u00e7\u00e3o, monitoramento e \u00e1udio/v\u00eddeo',
    maquinas_aparelhos_equipamentos_ferramentas: 'M\u00e1quinas, aparelhos, equipamentos e ferramentas',
    moveis_utensilios: 'M\u00f3veis e utens\u00edlios',
    eletrodomesticos_eletroeletronicos: 'Eletrodom\u00e9sticos e eletroeletr\u00f4nicos',
    material_cultural_educacional_esportivo: 'Material cultural, educacional e esportivo',
    equipamentos_medicos_odontologicos_laboratoriais: 'Equipamentos m\u00e9dicos, odontol\u00f3gicos e laboratoriais',
    equipamentos_oficina_manutencao_infraestrutura: 'Equipamentos de oficina, manuten\u00e7\u00e3o e infraestrutura',
    semoventes_animais_de_servico: 'Semoventes e animais de servi\u00e7o',
    bens_agropecuarios_rurais: 'Bens agropecu\u00e1rios e rurais',
    imoveis_benfeitorias: 'Im\u00f3veis, edifica\u00e7\u00f5es e benfeitorias',
    bens_moveis_almoxarifado: 'Bens m\u00f3veis em almoxarifado',
    bens_moveis_andamento: 'Bens m\u00f3veis em andamento',
    demais_bens_moveis: 'Demais bens m\u00f3veis',
    armamento_belico: 'Armamentos e acess\u00f3rios operacionais',
    veiculos_viaturas: 'Viaturas, ve\u00edculos, embarca\u00e7\u00f5es e aeronaves',
    informatica_tecnologia: 'Inform\u00e1tica e TIC',
    material_expediente: 'Demais bens m\u00f3veis e apoio administrativo',
    equipamento_operacional: 'Equipamentos t\u00e1ticos, de prote\u00e7\u00e3o e seguran\u00e7a',
    imovel: 'Im\u00f3veis, edifica\u00e7\u00f5es e benfeitorias',
    comunicacao_monitoramento: 'Comunica\u00e7\u00e3o, monitoramento e \u00e1udio/v\u00eddeo',
    outro: 'Outro'
  };
  const NATUREZA_LABELS = {
    permanente: 'Permanente',
    controlado: 'Controlado',
    imovel: 'Im\u00f3vel'
  };

  const ESTADO_LABELS = {
    novo: 'Novo',
    bom: 'Bom',
    regular: 'Regular',
    ruim: 'Ruim',
    irrecuperavel: 'Irrecuper\u00e1vel'
  };

  const SITUACAO_META = {
    em_uso: { className: 'status-ok', label: 'Em uso' },
    reserva: { className: 'status-ok', label: 'Reserva' },
    manutencao: { className: 'status-warning', label: 'Manuten\u00e7\u00e3o' },
    inventario_pendente: { className: 'status-warning', label: 'Invent\u00e1rio pendente' },
    extraviado: { className: 'status-danger', label: 'Extraviado' },
    inservivel: { className: 'status-danger', label: 'Inserv\u00edvel' },
    baixado: { className: 'status-danger', label: 'Baixado' }
  };

  const MOVIMENTACAO_LABELS = {
    incorporacao: 'Incorpora\u00e7\u00e3o',
    transferencia: 'Transfer\u00eancia',
    redistribuicao: 'Redistribui\u00e7\u00e3o',
    recolhimento: 'Recolhimento',
    manutencao: 'Manuten\u00e7\u00e3o',
    retorno_operacional: 'Retorno operacional'
  };

  const itemForm = document.getElementById('patrimonio-item-form');
  const movForm = document.getElementById('patrimonio-mov-form');
  const feedback = document.getElementById('patrimonio-feedback');
  const itensBody = document.getElementById('patrimonio-itens-body');
  const movBody = document.getElementById('patrimonio-mov-body');
  const movBemSelect = document.getElementById('patrimonio-mov-bem-id');
  const unidadePrincipalSelect = document.getElementById('patrimonio-unidade-principal');
  const unidadeDestinoSelect = document.getElementById('patrimonio-unidade-destino');
  const unitFilter = document.getElementById('patrimonio-filter-unidade');
  const categoryFilter = document.getElementById('patrimonio-filter-category');
  const situationFilter = document.getElementById('patrimonio-filter-situacao');
  const searchInput = document.getElementById('patrimonio-search');
  const valorInput = document.getElementById('patrimonio-valor-aquisicao');

  const kpiRegistros = document.getElementById('patrimonio-kpi-registros');
  const kpiUnidades = document.getElementById('patrimonio-kpi-unidades');
  const kpiLocais = document.getElementById('patrimonio-kpi-locais');
  const kpiCriticos = document.getElementById('patrimonio-kpi-criticos');

  if (!itemForm || !movForm || !feedback || !itensBody || !movBody || !movBemSelect || !unidadePrincipalSelect || !unidadeDestinoSelect || !unitFilter || !categoryFilter || !situationFilter || !searchInput || !valorInput || !kpiRegistros || !kpiUnidades || !kpiLocais || !kpiCriticos) {
    return;
  }

  const itemSubmitBtn = itemForm.querySelector('button[type="submit"]');
  const movSubmitBtn = movForm.querySelector('button[type="submit"]');

  let itemsCache = [];
  let isItemSubmitting = false;
  let isMovementSubmitting = false;

  renderUnitSelect(unidadePrincipalSelect, 'Selecione');
  renderUnitSelect(unidadeDestinoSelect, 'Selecione');
  renderUnitSelect(unitFilter, 'Todas');

  valorInput.addEventListener('input', function () {
    valorInput.value = AppCore.formatCurrencyInput(valorInput.value);
  });

  searchInput.addEventListener('input', renderItemsTable);
  unitFilter.addEventListener('change', renderItemsTable);
  categoryFilter.addEventListener('change', renderItemsTable);
  situationFilter.addEventListener('change', renderItemsTable);

  movBemSelect.addEventListener('change', function () {
    const selected = findSelectedItem();
    if (!selected) return;
    setSelectValue(unidadeDestinoSelect, selected.localizacaoPrincipal || '');
    movForm.setorDestino.value = selected.setorLocalizacao || '';
    movForm.localDetalhadoDestino.value = selected.localDetalhado || '';
    movForm.responsavelDestino.value = selected.responsavelBem || '';
    movForm.matriculaDestino.value = selected.matriculaResponsavel || '';
    movForm.situacaoDestino.value = normalizeKey(selected.situacaoBem || '');
  });

  itemForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isItemSubmitting) return;

    isItemSubmitting = true;
    setItemSubmittingState(true);
    clearFeedback();

    const data = new FormData(itemForm);
    try {
      await BackendAPI.addPatrimonioItem({
        numeroTombamento: data.get('numeroTombamento'),
        descricaoBem: data.get('descricaoBem'),
        categoriaPatrimonial: data.get('categoriaPatrimonial'),
        naturezaBem: data.get('naturezaBem'),
        quantidade: Number(data.get('quantidade')),
        unidadeMedida: data.get('unidadeMedida'),
        marca: data.get('marca'),
        modelo: data.get('modelo'),
        numeroSerie: data.get('numeroSerie'),
        valorAquisicao: AppCore.parseCurrencyBrl(data.get('valorAquisicao')),
        dataAquisicao: data.get('dataAquisicao'),
        formaIngresso: data.get('formaIngresso'),
        documentoOrigem: data.get('documentoOrigem'),
        localizacaoPrincipal: data.get('localizacaoPrincipal'),
        setorLocalizacao: data.get('setorLocalizacao'),
        localDetalhado: data.get('localDetalhado'),
        responsavelBem: data.get('responsavelBem'),
        matriculaResponsavel: data.get('matriculaResponsavel'),
        situacaoBem: data.get('situacaoBem'),
        estadoFisico: data.get('estadoFisico'),
        observacoes: data.get('observacoes')
      });

      itemForm.reset();
      itemForm.quantidade.value = '1';
      unidadePrincipalSelect.value = '';
      setFeedback('Bem patrimonial cadastrado com sucesso.', 'ok');
      await renderAll();
    } catch (error) {
      setFeedback((error && error.message) ? error.message : 'N\u00e3o foi poss\u00edvel cadastrar o bem patrimonial.', 'error');
    } finally {
      isItemSubmitting = false;
      setItemSubmittingState(false);
    }
  });

  movForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (isMovementSubmitting) return;

    isMovementSubmitting = true;
    setMovementSubmittingState(true);
    clearFeedback();

    const selected = findSelectedItem();
    const data = new FormData(movForm);
    try {
      await BackendAPI.movePatrimonioItem({
        bemId: data.get('bemId'),
        tipoMovimentacao: data.get('tipoMovimentacao'),
        localizacaoDestino: data.get('localizacaoDestino'),
        setorDestino: data.get('setorDestino'),
        localDetalhadoDestino: data.get('localDetalhadoDestino'),
        responsavelDestino: data.get('responsavelDestino'),
        matriculaDestino: data.get('matriculaDestino'),
        situacaoDestino: data.get('situacaoDestino'),
        motivo: data.get('motivo'),
        localizacaoAtual: selected ? selected.localizacaoPrincipal : '',
        setorAtual: selected ? selected.setorLocalizacao : '',
        responsavelAtual: selected ? selected.responsavelBem : ''
      });

      movForm.reset();
      unidadeDestinoSelect.value = '';
      setFeedback('Movimenta\u00e7\u00e3o patrimonial registrada com sucesso.', 'ok');
      await renderAll();
    } catch (error) {
      setFeedback((error && error.message) ? error.message : 'N\u00e3o foi poss\u00edvel registrar a movimenta\u00e7\u00e3o patrimonial.', 'error');
    } finally {
      isMovementSubmitting = false;
      setMovementSubmittingState(false);
    }
  });

  function renderUnitSelect(selectElement, emptyLabel) {
    if (!selectElement) return;
    const currentValue = String(selectElement.value || '').trim();
    selectElement.innerHTML = ['<option value="">' + AppCore.escapeHtml(emptyLabel) + '</option>']
      .concat(UNIDADES_SEAP.map(function (unit) {
        const selected = currentValue === unit ? ' selected' : '';
        return '<option value="' + AppCore.escapeHtml(unit) + '"' + selected + '>' + AppCore.escapeHtml(unit) + '</option>';
      }))
      .join('');
  }

  function setSelectValue(selectElement, value) {
    const normalized = String(value || '').trim();
    if (!normalized) {
      selectElement.value = '';
      return;
    }

    const existing = Array.from(selectElement.options || []).some(function (option) {
      return String(option.value || '').trim() === normalized;
    });

    if (!existing) {
      const legacyOption = document.createElement('option');
      legacyOption.value = normalized;
      legacyOption.textContent = normalized + ' (legado)';
      legacyOption.dataset.legacy = 'true';
      selectElement.appendChild(legacyOption);
    }

    selectElement.value = normalized;
  }

  function setItemSubmittingState(active) {
    if (!itemSubmitBtn) return;
    itemSubmitBtn.disabled = !!active;
    itemSubmitBtn.textContent = active ? 'Cadastrando...' : 'Cadastrar bem patrimonial';
  }

  function setMovementSubmittingState(active) {
    if (!movSubmitBtn) return;
    movSubmitBtn.disabled = !!active;
    movSubmitBtn.textContent = active ? 'Registrando...' : 'Registrar movimenta\u00e7\u00e3o';
  }

  function setFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = 'form-feedback ' + (type || 'ok');
    feedback.hidden = false;
  }

  function clearFeedback() {
    feedback.textContent = '';
    feedback.className = 'form-feedback';
    feedback.hidden = true;
  }

  function findSelectedItem() {
    const selectedId = String(movBemSelect.value || '').trim();
    return itemsCache.find(function (item) { return String(item.id) === selectedId; }) || null;
  }

  function labelFor(map, value, fallback) {
    const key = String(value || '').trim();
    if (!key) return fallback || 'N\u00e3o informado';
    return map[key] || fallback || key;
  }

  async function renderAll() {
    itemsCache = await BackendAPI.listPatrimonioItems();
    renderKpis();
    renderCategoryFilter();
    renderMovementSelect();
    renderItemsTable();
    const movements = await BackendAPI.listPatrimonioMovements();
    renderMovementsTable(movements);
  }

  function renderKpis() {
    const registros = itemsCache.length;
    const unidades = new Set(itemsCache.map(function (item) {
      return String(item.localizacaoPrincipal || '').trim();
    }).filter(Boolean));
    const locais = new Set(itemsCache.map(function (item) {
      return [item.localizacaoPrincipal || '', item.setorLocalizacao || ''].join(' | ');
    }).filter(Boolean));
    const criticos = itemsCache.filter(function (item) {
      const situacao = normalizeKey(item.situacaoBem || '');
      return !String(item.responsavelBem || '').trim() || situacao === 'manutencao' || situacao === 'extraviado' || situacao === 'inservivel' || situacao === 'baixado';
    }).length;

    kpiRegistros.textContent = String(registros);
    kpiUnidades.textContent = String(unidades.size);
    kpiLocais.textContent = String(locais.size);
    kpiCriticos.textContent = String(criticos);
  }

  function renderCategoryFilter() {
    const currentValue = String(categoryFilter.value || '');
    const categories = itemsCache.map(function (item) { return normalizeKey(item.categoriaPatrimonial || ''); }).filter(Boolean);
    const unique = Array.from(new Set(categories)).sort(function (a, b) { return labelFor(CATEGORY_LABELS, a, a).localeCompare(labelFor(CATEGORY_LABELS, b, b), 'pt-BR'); });
    categoryFilter.innerHTML = ['<option value="">Todas</option>']
      .concat(unique.map(function (category) {
        const selected = currentValue === category ? ' selected' : '';
        return '<option value="' + AppCore.escapeHtml(category) + '"' + selected + '>' + AppCore.escapeHtml(labelFor(CATEGORY_LABELS, category, category)) + '</option>';
      }))
      .join('');
  }

  function renderMovementSelect() {
    const sorted = itemsCache.slice().sort(function (a, b) {
      return String(a.numeroTombamento || '').localeCompare(String(b.numeroTombamento || ''), 'pt-BR');
    });

    if (sorted.length === 0) {
      movBemSelect.innerHTML = '<option value="">Cadastre um bem primeiro</option>';
      return;
    }

    movBemSelect.innerHTML = ['<option value="">Selecione</option>']
      .concat(sorted.map(function (item) {
        const text = AppCore.escapeHtml(item.numeroTombamento) + ' - ' + AppCore.escapeHtml(item.descricaoBem);
        return '<option value="' + AppCore.escapeHtml(String(item.id)) + '">' + text + '</option>';
      }))
      .join('');
  }

  function getFilteredItems() {
    const searchTerm = String(searchInput.value || '').trim().toLowerCase();
    const unidade = String(unitFilter.value || '').trim().toLowerCase();
    const category = String(categoryFilter.value || '').trim().toLowerCase();
    const situation = String(situationFilter.value || '').trim().toLowerCase();

    return itemsCache.filter(function (item) {
      if (unidade && String(item.localizacaoPrincipal || '').trim().toLowerCase() !== unidade) return false;
      if (category && String(item.categoriaPatrimonial || '').trim().toLowerCase() !== category) return false;
      if (situation && String(item.situacaoBem || '').trim().toLowerCase() !== situation) return false;
      if (!searchTerm) return true;

      const haystack = [
        item.numeroTombamento,
        item.descricaoBem,
        item.localizacaoPrincipal,
        item.setorLocalizacao,
        item.localDetalhado,
        item.responsavelBem
      ].join(' ').toLowerCase();
      return haystack.indexOf(searchTerm) >= 0;
    });
  }

  function getSituacaoMeta(situacao) {
    const normalized = normalizeKey(situacao || '');
    return SITUACAO_META[normalized] || { className: 'status-danger', label: normalized ? normalized : 'Cr\u00edtico' };
  }

  function formatDate(value) {
    if (!value) return 'N\u00e3o informado';
    const date = new Date(value + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return 'N\u00e3o informado';
    return date.toLocaleDateString('pt-BR');
  }

  function formatDateTime(value) {
    if (!value) return 'N\u00e3o informado';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N\u00e3o informado';
    return date.toLocaleString('pt-BR');
  }

  function renderItemsTable() {
    const items = getFilteredItems().sort(function (a, b) {
      return String(a.numeroTombamento || '').localeCompare(String(b.numeroTombamento || ''), 'pt-BR');
    });

    if (items.length === 0) {
      itensBody.innerHTML = '<tr><td colspan="7">Nenhum bem patrimonial localizado com os filtros atuais.</td></tr>';
      return;
    }

    itensBody.innerHTML = items.map(function (item) {
      const situacao = getSituacaoMeta(item.situacaoBem);
      const quantidade = Number(item.quantidade) || 0;
      const unidade = AppCore.escapeHtml(item.unidadeMedida || 'un');
      const valorText = Number.isFinite(Number(item.valorAquisicao)) && Number(item.valorAquisicao) > 0
        ? AppCore.formatCurrencyBrl(item.valorAquisicao)
        : 'N\u00e3o informado';
      const ultimaMov = labelFor(MOVIMENTACAO_LABELS, item.ultimaMovimentacaoTipo, 'Cadastro inicial');
      const responsavel = String(item.responsavelBem || '').trim() || 'N\u00e3o informado';
      const matricula = String(item.matriculaResponsavel || '').trim() || 'N\u00e3o informada';

      return '<tr>' +
        '<td><div class="patrimonio-table-meta"><strong>' + AppCore.escapeHtml(item.numeroTombamento) + '</strong><span>' + AppCore.escapeHtml(item.descricaoBem) + '</span></div></td>' +
        '<td>' + AppCore.escapeHtml(labelFor(CATEGORY_LABELS, item.categoriaPatrimonial, '-')) + '<br><small>' + AppCore.escapeHtml(labelFor(NATUREZA_LABELS, item.naturezaBem, '-')) + ' | ' + quantidade + ' ' + unidade + '</small></td>' +
        '<td>' + AppCore.escapeHtml(item.localizacaoPrincipal || 'N\u00e3o informada') + '<br><small>' + AppCore.escapeHtml(item.setorLocalizacao || 'N\u00e3o informado') + (item.localDetalhado ? ' | ' + AppCore.escapeHtml(item.localDetalhado) : '') + '</small></td>' +
        '<td>' + AppCore.escapeHtml(responsavel) + '<br><small>Matr\u00edcula: ' + AppCore.escapeHtml(matricula) + '</small></td>' +
        '<td><span class="status-chip ' + situacao.className + '">' + AppCore.escapeHtml(situacao.label) + '</span><br><small>' + AppCore.escapeHtml(labelFor(ESTADO_LABELS, item.estadoFisico, 'N\u00e3o informado')) + '</small></td>' +
        '<td>' + AppCore.escapeHtml(valorText) + '<br><small>Aquisi\u00e7\u00e3o: ' + AppCore.escapeHtml(formatDate(item.dataAquisicao)) + '</small></td>' +
        '<td>' + AppCore.escapeHtml(ultimaMov) + '<br><small>' + AppCore.escapeHtml(item.ultimaMovimentacaoPor || 'N\u00e3o informado') + ' | ' + AppCore.escapeHtml(formatDateTime(item.ultimaMovimentacaoEm)) + '</small></td>' +
      '</tr>';
    }).join('');
  }

  function renderMovementsTable(movements) {
    const rows = (movements || []).slice(0, 50);
    if (rows.length === 0) {
      movBody.innerHTML = '<tr><td colspan="8">Nenhuma movimenta\u00e7\u00e3o patrimonial registrada.</td></tr>';
      return;
    }

    movBody.innerHTML = rows.map(function (item) {
      const situacao = getSituacaoMeta(item.situacaoDestino);
      return '<tr>' +
        '<td>' + AppCore.escapeHtml(formatDateTime(item.dataHora)) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.numeroTombamento || '-') + '</td>' +
        '<td>' + AppCore.escapeHtml(labelFor(MOVIMENTACAO_LABELS, item.tipoMovimentacao, '-')) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.localizacaoOrigem || '-') + '<br><small>' + AppCore.escapeHtml(item.setorOrigem || '-') + '</small></td>' +
        '<td>' + AppCore.escapeHtml(item.localizacaoDestino || '-') + '<br><small>' + AppCore.escapeHtml(item.setorDestino || '-') + '</small></td>' +
        '<td><span class="status-chip ' + situacao.className + '">' + AppCore.escapeHtml(situacao.label) + '</span></td>' +
        '<td>' + AppCore.escapeHtml(item.motivo || '-') + '</td>' +
        '<td>' + AppCore.escapeHtml(item.usuario || '-') + '</td>' +
      '</tr>';
    }).join('');
  }

  renderAll().catch(function () {
    setFeedback('Falha ao carregar o m\u00f3dulo de patrim\u00f4nio.', 'error');
  });
})();