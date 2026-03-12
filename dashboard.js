(function () {
  AppCore.initShell('inicio');

  const todayLabel = document.getElementById('today-label');
  const kpiTotal = document.getElementById('kpi-total');
  const kpiUpcoming = document.getElementById('kpi-upcoming');
  const kpiExpired = document.getElementById('kpi-expired');
  const donut = document.getElementById('status-donut');
  const legend = document.getElementById('status-legend');
  const chartCanvas = document.getElementById('deadline-chart');
  const alertsList = document.getElementById('alert-list');
  const expiredList = document.getElementById('expired-list');

  let cache = [];

  todayLabel.textContent = formatDateHuman(new Date());

  bootstrap();
  window.addEventListener('resize', renderChartCurrent);

  async function bootstrap() {
    try {
      cache = await BackendAPI.listProcessos();
    } catch (_error) {
      cache = ProcessoStore.load();
    }
    renderAll(cache);
  }

  function renderAll(processos) {
    const ativos = getActiveProcessos(processos);
    renderKPIs(ativos);
    renderDonut(ativos);
    renderChart(ativos);
    renderAlerts(ativos);
    renderExpired(ativos);
  }

  function renderChartCurrent() {
    renderChart(getActiveProcessos(cache));
  }

  function getActiveProcessos(processos) {
    return processos.filter(function (item) {
      return AppCore.getProcessStatus(item).type !== 'closed';
    });
  }

  function getPreventiveProcessos(processos) {
    return processos.filter(function (item) {
      const status = AppCore.getProcessStatus(item);
      return (status.type === 'ok' || status.type === 'warning') && Number(status.dias) <= 365;
    });
  }

  function getExpiredProcessos(processos) {
    return processos.filter(function (item) {
      return AppCore.getProcessStatus(item).type === 'danger';
    });
  }

  function renderKPIs(processos) {
    let upcoming = 0;
    let expired = 0;

    processos.forEach(function (item) {
      const status = AppCore.getProcessStatus(item);
      if (status.type === 'danger') expired += 1;
      if (status.type === 'warning') upcoming += 1;
    });

    kpiTotal.textContent = String(processos.length);
    kpiUpcoming.textContent = String(upcoming);
    kpiExpired.textContent = String(expired);
  }

  function renderDonut(processos) {
    const totals = { ok: 0, warning: 0, danger: 0 };
    processos.forEach(function (item) {
      totals[AppCore.getProcessStatus(item).type] += 1;
    });

    const total = Math.max(1, processos.length);
    const okPct = (totals.ok / total) * 100;
    const warningPct = (totals.warning / total) * 100;
    const c1 = okPct;
    const c2 = okPct + warningPct;

    donut.style.background = 'conic-gradient(' +
      '#2f9d62 0% ' + c1.toFixed(2) + '%,' +
      '#eab54f ' + c1.toFixed(2) + '% ' + c2.toFixed(2) + '%,' +
      '#d74f4f ' + c2.toFixed(2) + '% 100%)';

    legend.innerHTML = [
      legendItem('#2f9d62', 'Vigente', totals.ok),
      legendItem('#eab54f', 'A vencer em ate 90 dias', totals.warning),
      legendItem('#d74f4f', 'Vencido', totals.danger)
    ].join('');
  }

  function renderChart(processos) {
    const ordered = getPreventiveProcessos(processos)
      .slice()
      .sort(function (a, b) { return AppCore.dateValue(a.fimVigencia) - AppCore.dateValue(b.fimVigencia); })
      .slice(0, 10);

    const ctx = chartCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.max(chartCanvas.clientWidth || 0, 220);
    const compact = cssWidth < 520;
    const leftPad = compact ? 72 : 92;
    const topPad = 16;
    const barHeight = compact ? 18 : 20;
    const gap = compact ? 12 : 10;
    const rowSpan = barHeight + gap;
    const cssHeight = Math.max(240, topPad + (ordered.length * rowSpan) + 12);
    const rightPad = compact ? 68 : 86;
    const chartWidth = Math.max(90, cssWidth - leftPad - rightPad);
    const labelSize = compact ? '11px' : '12px';
    const contractLabelLimit = compact ? 9 : 12;

    chartCanvas.style.width = '100%';
    chartCanvas.style.height = cssHeight + 'px';
    chartCanvas.width = Math.floor(cssWidth * dpr);
    chartCanvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#4b6275';
    ctx.font = labelSize + ' Segoe UI';

    if (ordered.length === 0) {
      ctx.fillText('Sem contratos na janela preventiva de ate 365 dias.', 16, 28);
      return;
    }

    const now = AppCore.startOfDay(new Date());
    const values = ordered.map(function (item) {
      return Math.max(0, AppCore.daysBetween(now, AppCore.dateValue(item.fimVigencia)));
    });
    const maxValue = Math.max.apply(null, values.concat([30]));

    ordered.forEach(function (item, index) {
      const y = topPad + index * rowSpan;
      const status = AppCore.getProcessStatus(item);
      const days = Math.max(0, status.dias || 0);
      const width = Math.max(4, (days / maxValue) * (chartWidth - 10));
      const color = status.type === 'warning' ? '#eab54f' : '#2f9d62';
      const contractLabel = String(item.numeroContrato || '').slice(0, contractLabelLimit);
      const dayLabel = days + ' dias';
      const dayLabelWidth = ctx.measureText(dayLabel).width;
      const labelX = Math.max(leftPad + chartWidth + 8, cssWidth - dayLabelWidth - 6);

      ctx.fillStyle = '#2e4a5f';
      ctx.fillText(contractLabel, 8, y + 14);

      ctx.fillStyle = color;
      ctx.fillRect(leftPad, y, width, barHeight);

      ctx.fillStyle = '#274257';
      ctx.fillText(dayLabel, labelX, y + 14);
    });
  }

  function renderAlerts(processos) {
    const hot = processos
      .map(function (item) {
        return {
          processo: item.processoSei,
          contrato: item.numeroContrato,
          empresa: item.empresaContratada,
          termino: item.fimVigencia,
          status: AppCore.getProcessStatus(item)
        };
      })
      .filter(function (row) { return row.status.type === 'warning'; })
      .sort(function (a, b) { return a.status.dias - b.status.dias; })
      .slice(0, 6);

    if (hot.length === 0) {
      alertsList.innerHTML = '<li class="alert-item ok">Nenhum contrato em janela de vencimento nos proximos 90 dias.</li>';
      return;
    }

    alertsList.innerHTML = hot.map(function (row) {
      return '<li class="alert-item warning">' +
        '<div><strong>Contrato ' + AppCore.escapeHtml(row.contrato) + '</strong><span>Processo ' + AppCore.escapeHtml(row.processo) + ' | ' + AppCore.escapeHtml(row.empresa) + '</span></div>' +
        '<div><b>Vence em ' + row.status.dias + ' dias</b><small>Termino: ' + AppCore.formatDate(row.termino) + '</small></div>' +
      '</li>';
    }).join('');
  }

  function renderExpired(processos) {
    const expired = getExpiredProcessos(processos)
      .map(function (item) {
        return {
          processo: item.processoSei,
          contrato: item.numeroContrato,
          empresa: item.empresaContratada,
          termino: item.fimVigencia,
          status: AppCore.getProcessStatus(item)
        };
      })
      .sort(function (a, b) { return a.status.dias - b.status.dias; })
      .slice(0, 8);

    if (expired.length === 0) {
      expiredList.innerHTML = '<li class="alert-item ok">Nenhum contrato com vigencia vencida no momento.</li>';
      return;
    }

    expiredList.innerHTML = expired.map(function (row) {
      return '<li class="alert-item danger">' +
        '<div><strong>Contrato ' + AppCore.escapeHtml(row.contrato) + '</strong><span>Processo ' + AppCore.escapeHtml(row.processo) + ' | ' + AppCore.escapeHtml(row.empresa) + '</span></div>' +
        '<div><b>Vencido ha ' + Math.abs(row.status.dias) + ' dias</b><small>Termino: ' + AppCore.formatDate(row.termino) + '</small></div>' +
      '</li>';
    }).join('');
  }

  function legendItem(color, label, value) {
    return '<li><span><span class="dot" style="background:' + color + '"></span>' + label + '</span><strong>' + value + '</strong></li>';
  }

  function formatDateHuman(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return 'Atualizado em ' + day + '/' + month + '/' + date.getFullYear();
  }
})();
