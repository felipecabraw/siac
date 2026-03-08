(function () {
  AppCore.initShell('processos');

  const searchInput = document.getElementById('search');
  const tableBody = document.getElementById('process-table-body');

  if (!searchInput || !tableBody) return;

  let query = '';
  let cache = [];
  const deletingIds = new Set();

  searchInput.addEventListener('input', function () {
    query = String(searchInput.value || '').trim().toLowerCase();
    renderTable();
  });

  tableBody.addEventListener('click', async function (event) {
    const btn = event.target.closest('button[data-delete-id]');
    if (!btn) return;

    const id = String(btn.getAttribute('data-delete-id') || '').trim();
    if (!id || deletingIds.has(id)) return;

    deletingIds.add(id);
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Removendo...';

    try {
      await BackendAPI.deleteProcesso(id);
      cache = await BackendAPI.listProcessos();
      renderTable();
    } catch (_error) {
      window.alert('Não foi possível remover o processo no backend.');
      deletingIds.delete(id);
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });

  bootstrap();

  async function bootstrap() {
    try {
      cache = await BackendAPI.listProcessos();
    } catch (_error) {
      cache = ProcessoStore.load();
    }
    renderTable();
  }

  function renderTable() {
    const filtered = cache
      .slice()
      .sort(function (a, b) { return AppCore.dateValue(a.terminoVigencia) - AppCore.dateValue(b.terminoVigencia); })
      .filter(function (item) {
        if (!query) return true;
        const text = [item.numeroProcesso, item.numeroContrato, item.gestorContrato, item.fiscalContrato]
          .join(' ')
          .toLowerCase();
        return text.includes(query);
      });

    if (filtered.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="8">Nenhum processo encontrado.</td></tr>';
      return;
    }

    tableBody.innerHTML = filtered.map(function (item) {
      const status = AppCore.getStatus(item.terminoVigencia);
      const badgeClass = status.type === 'danger' ? 'status-danger' : status.type === 'warning' ? 'status-warning' : 'status-ok';
      const valor = Number(item.valorContrato);
      const valorLabel = Number.isFinite(valor) && valor > 0 ? AppCore.formatCurrencyBrl(valor) : '-';
      const deleting = deletingIds.has(String(item.id));

      return '<tr>' +
        '<td>' + AppCore.escapeHtml(item.numeroProcesso) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.numeroContrato) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.gestorContrato) + '</td>' +
        '<td>' + AppCore.escapeHtml(item.fiscalContrato) + '</td>' +
        '<td>' + valorLabel + '</td>' +
        '<td>' + AppCore.formatDate(item.terminoVigencia) + '</td>' +
        '<td><span class="status-chip ' + badgeClass + '">' + status.label + '</span></td>' +
        '<td><button class="action-btn" data-delete-id="' + item.id + '" ' + (deleting ? 'disabled' : '') + '>' + (deleting ? 'Removendo...' : 'Remover') + '</button></td>' +
      '</tr>';
    }).join('');
  }
})();
