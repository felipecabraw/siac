(function () {
  const DB_NAME = 'controlecontratos_auth';
  const DB_VERSION = 1;
  const STORE_USERS = 'users';

  const DEFAULT_USER = {
    username: 'admin.institucional',
    nome: 'Administrador Institucional',
    passwordHash: 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7',
    createdAt: new Date().toISOString()
  };

  function openDb() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB indisponivel neste navegador.'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = function (event) {
        const db = event.target.result;
        let store;
        if (!db.objectStoreNames.contains(STORE_USERS)) {
          store = db.createObjectStore(STORE_USERS, { keyPath: 'username' });
        } else {
          store = event.target.transaction.objectStore(STORE_USERS);
        }

        store.put(DEFAULT_USER);
      };

      request.onsuccess = function () {
        const db = request.result;
        seedIfEmpty(db).then(function () { resolve(db); }).catch(reject);
      };

      request.onerror = function () {
        reject(request.error || new Error('Falha ao abrir banco de autenticacao.'));
      };
    });
  }

  function seedIfEmpty(db) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_USERS, 'readonly');
      const store = tx.objectStore(STORE_USERS);
      const countRequest = store.count();

      countRequest.onsuccess = function () {
        const count = countRequest.result || 0;
        if (count > 0) {
          resolve();
          return;
        }

        const writeTx = db.transaction(STORE_USERS, 'readwrite');
        writeTx.objectStore(STORE_USERS).put(DEFAULT_USER);
        writeTx.oncomplete = function () { resolve(); };
        writeTx.onerror = function () { reject(writeTx.error || new Error('Falha ao semear usuario padrao.')); };
      };

      countRequest.onerror = function () {
        reject(countRequest.error || new Error('Falha ao validar usuarios existentes.'));
      };
    });
  }

  function getUser(db, username) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_USERS, 'readonly');
      const store = tx.objectStore(STORE_USERS);
      const req = store.get(username);

      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error || new Error('Falha ao consultar usuario.')); };
    });
  }

  function saveUser(db, user) {
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(STORE_USERS, 'readwrite');
      const store = tx.objectStore(STORE_USERS);
      const req = store.put(user);

      req.onsuccess = function () { resolve(user); };
      req.onerror = function () { reject(req.error || new Error('Falha ao salvar usuario.')); };
    });
  }

  async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map(function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  async function validateLogin(username, password) {
    const db = await openDb();
    const user = await getUser(db, username);
    if (!user) return { ok: false, reason: 'usuario' };

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) return { ok: false, reason: 'senha' };

    return {
      ok: true,
      user: {
        username: user.username,
        nome: user.nome || user.username
      }
    };
  }

  async function updatePassword(username, newPassword) {
    const userName = String(username || '').trim();
    const password = String(newPassword || '');

    if (!userName) throw new Error('Usuario invalido para atualizar senha.');
    if (password.length < 8) throw new Error('A nova senha deve possuir no minimo 8 caracteres.');

    const db = await openDb();
    const user = await getUser(db, userName);
    if (!user) throw new Error('Usuario nao encontrado para atualizar senha.');

    user.passwordHash = await hashPassword(password);
    user.updatedAt = new Date().toISOString();
    await saveUser(db, user);
    return true;
  }

  window.AuthDB = {
    openDb: openDb,
    validateLogin: validateLogin,
    updatePassword: updatePassword,
    defaultUser: {
      username: DEFAULT_USER.username,
      passwordHint: 'Admin@123'
    }
  };
})();
