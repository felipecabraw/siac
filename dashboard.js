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
    renderKPIs(processos);
    renderDonut(processos);
    renderChart(processos);
    renderAlerts(processos);
  }

  function renderChartCurrent() {
    renderChart(cache);
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
    const dangerPct = (totals.danger / total) * 100;

    const c1 = okPct;
    const c2 = okPct + warningPct;

    donut.style.background = 'conic-gradient(' +
      '#2f9d62 0% ' + c1.toFixed(2) + '%,' +
      '#eab54f ' + c1.toFixed(2) + '% ' + c2.toFixed(2) + '%,' +
      '#d74f4f ' + c2.toFixed(2) + '% 100%)';

    legend.innerHTML = [
      legendItem('#2f9d62', 'Vigente', totals.ok),
      legendItem('#eab54f', 'A vencer em at\u00e9 90 dias', totals.warning),
      legendItem('#d74f4f', 'Vencido', totals.danger)
    ].join('');
  }

  function renderChart(processos) {
    const ordered = processos
      .slice()
      .sort(function (a, b) { return AppCore.dateValue(a.fimVigencia) - AppCore.dateValue(b.fimVigencia); })
      .slice(0, 8);

    const ctx = chartCanvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = chartCanvas.clientWidth;
    const cssHeight = chartCanvas.clientHeight;

    chartCanvas.width = Math.floor(cssWidth * dpr);
    chartCanvas.height = Math.floor(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.fillStyle = '#4b6275';
    ctx.font = '12px Segoe UI';

    if (ordered.length === 0) {
      ctx.fillText('Sem contratos cadastrados.', 16, 28);
      return;
    }

    const now = AppCore.startOfDay(new Date());
    const values = ordered.map(function (item) {
      return AppCore.daysBetween(now, AppCore.dateValue(item.fimVigencia));
    });
    const maxAbs = Math.max.apply(null, values.map(function (v) { return Math.abs(v); }).concat([30]));

    const leftPad = 92;
    const topPad = 16;
    const barHeight = 20;
    const gap = 10;
    const chartWidth = cssWidth - leftPad - 20;

    ordered.forEach(function (item, index) {
      const y = topPad + index * (barHeight + gap);
      const status = AppCore.getProcessStatus(item);
      const days = status.dias;
      const width = Math.max(4, (Math.abs(days) / maxAbs) * (chartWidth - 10));
      const color = status.type === 'danger' ? '#d74f4f' : status.type === 'warning' ? '#eab54f' : '#2f9d62';

      ctx.fillStyle = '#2e4a5f';
      ctx.fillText(item.numeroContrato.slice(0, 12), 8, y + 14);

      ctx.fillStyle = color;
      ctx.fillRect(leftPad, y, width, barHeight);

      ctx.fillStyle = '#274257';
      ctx.fillText(days + ' dias', leftPad + width + 8, y + 14);
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
      .filter(function (row) { return row.status.type !== 'ok'; })
      .sort(function (a, b) { return a.status.dias - b.status.dias; })
      .slice(0, 6);

    if (hot.length === 0) {
      alertsList.innerHTML = '<li class="alert-item ok">Nenhum contrato em zona de risco no momento.</li>';
      return;
    }

    alertsList.innerHTML = hot.map(function (row) {
      const typeClass = row.status.type === 'danger' ? 'danger' : 'warning';
      const label = row.status.type === 'danger'
        ? 'Vencido h\u00e1 ' + Math.abs(row.status.dias) + ' dias'
        : 'Vence em ' + row.status.dias + ' dias';

      return '<li class="alert-item ' + typeClass + '">' +
        '<div><strong>Contrato ' + AppCore.escapeHtml(row.contrato) + '</strong><span>Processo ' + AppCore.escapeHtml(row.processo) + ' | ' + AppCore.escapeHtml(row.empresa) + '</span></div>' +
        '<div><b>' + label + '</b><small>T\u00e9rmino: ' + AppCore.formatDate(row.termino) + '</small></div>' +
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





