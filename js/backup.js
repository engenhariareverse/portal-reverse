const BACKUP = (() => {
  const STORES = ['clientes', 'servicos', 'orcamentos', 'compromissos', 'kanban_cards', 'lancamentos', 'arts', 'documentos', 'config'];

  async function exportBackup() {
    try {
      const data = {
        version: 2,
        app: 'Portal Reverse Engenharia',
        exportedAt: new Date().toISOString(),
        stores: {},
      };

      for (const store of STORES) {
        data.stores[store] = await DB.getAll(store);
      }

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `backup_reverse_${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await DB.put('config', { chave: 'ultimo_backup', valor: new Date().toISOString() });
      UI.showToast('Backup exportado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro no backup:', err);
      UI.showToast('Erro ao exportar backup: ' + err.message, 'error');
    }
  }

  async function importBackup() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { resolve(false); return; }

        try {
          const text = await file.text();
          const data = JSON.parse(text);

          if (!data.stores || !data.version) {
            UI.showToast('Arquivo inválido. Use um backup gerado por este portal.', 'error');
            resolve(false);
            return;
          }

          const exportedDate = UI.formatDateTime(data.exportedAt);
          const ok = await UI.showConfirm(
            'Restaurar Backup',
            `Isso vai <strong>substituir todos os dados atuais</strong> pelo backup de <strong>${exportedDate}</strong>.<br><br>Esta ação não pode ser desfeita. Confirmar?`,
            'Sim, restaurar'
          );

          if (!ok) { resolve(false); return; }

          for (const store of STORES) {
            await DB.clear(store);
            if (Array.isArray(data.stores[store])) {
              for (const record of data.stores[store]) {
                await DB.put(store, record);
              }
            }
          }

          UI.showToast('Backup restaurado com sucesso! Recarregando...', 'success', 2000);
          setTimeout(() => location.reload(), 2000);
          resolve(true);
        } catch (err) {
          console.error('Erro na importação:', err);
          UI.showToast('Erro ao importar backup: ' + err.message, 'error');
          resolve(false);
        }
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  return { exportBackup, importBackup };
})();
