(function () {
  const AUTH_KEY = 'cc_auth';
  const AUTH_USER_KEY = 'cc_auth_user';
  const AUTH_ROLE_KEY = 'cc_auth_role';
  const PROCESS_KEY = 'cc_processos';
  const NOTICE_KEY = 'cc_system_notices';
  const NOTICE_READ_PREFIX = 'cc_system_notice_reads_';
  const AUDIT_KEY = 'cc_audit_events';
  const PROFILE_PREFIX = 'cc_profile_';
  const ALMOX_ITEM_KEY = 'cc_almox_itens';
  const ALMOX_MOV_KEY = 'cc_almox_movimentacoes';
  const ALMOX_DEL_KEY = 'cc_almox_exclusoes';
  const LEGACY_DEMO_PROCESS_IDS = ['demo-1', 'demo-2', 'demo-3'];
  const LEGACY_DEMO_PROCESSOS = ['SEI-2026-001', 'SEI-2026-014', 'SEI-2025-223'];
  const LEGACY_DEMO_CONTRATOS = ['CT-001/2026', 'CT-014/2026', 'CT-223/2025'];

  let client = null;
  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }
  function getConfig() {
    const cfg = window.SIGA_BACKEND_CONFIG || {};
    return {
      provider: cfg.provider || 'local',
      supabaseUrl: String(cfg.supabaseUrl || '').trim(),
      supabaseAnonKey: String(cfg.supabaseAnonKey || '').trim(),
      seniorAdminBootstrapEmail: normalizeEmail(cfg.seniorAdminBootstrapEmail || 'felipecabraw@gmail.com')
    };
  }
  function isSupabaseEnabled() {
    const cfg = getConfig();
    return cfg.provider === 'supabase' && !!cfg.supabaseUrl && !!cfg.supabaseAnonKey && !!window.supabase;
  }
  function getClient() {
    if (!isSupabaseEnabled()) return null;
    if (client) return client;
    const cfg = getConfig();
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }
  function translateAuthError(error, fallbackMessage) {
    const raw = String(error && (error.message || error.error_description || error.code) || '').trim();
    const msg = raw.toLowerCase();
    if (!raw) return fallbackMessage || 'Falha na autentica\u00e7\u00e3o.';
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'Senha ou usu\u00e1rio inv\u00e1lidos. Verifique suas credenciais.';
    }
    if (msg.includes('email not confirmed')) {
      return 'Seu e-mail ainda n\u00e3o foi confirmado. Verifique sua caixa de entrada.';
    }
    if (msg.includes('user already registered')) {
      return 'J\u00e1 existe um usu\u00e1rio cadastrado com este e-mail.';
    }
    if (msg.includes('weak password') || msg.includes('password should be at least')) {
      return 'Senha fraca. Utilize uma senha mais forte com no m\u00ednimo 8 caracteres.';
    }
    if (msg.includes('for security purposes') || msg.includes('rate limit')) {
      return 'N\u00e3o foi poss\u00edvel concluir o cadastro agora. Tente novamente.';
    }
    if (msg.includes('unable to validate email address') || msg.includes('invalid email')) {
      return 'E-mail inv\u00e1lido. Verifique o formato informado.';
    }
    if (msg.includes('password')) {
      return 'Senha inv\u00e1lida. Confira e tente novamente.';
    }
    return fallbackMessage || 'Falha na autentica\u00e7\u00e3o.';
  }
  function isMissingApprovalColumnError(error) {
    const msg = String(error && error.message ? error.message : '').toLowerCase();
    return msg.includes('aprovado_em') || msg.includes('aprovado_por');
  }
  function isMissingSystemNoticeReadsTableError(error) {
    const msg = String(error && error.message ? error.message : '').toLowerCase();
    return msg.includes('sistema_novidades_leituras') ||
      (msg.includes('relation') && msg.includes('does not exist')) ||
      msg.includes('could not find the table') ||
      msg.includes('failed to parse select parameter');
  }
  function getCurrentAuthUser() {
    return localStorage.getItem(AUTH_USER_KEY) || 'admin.institucional';
  }
  function isCurrentUserSeniorAdmin() {
    return localStorage.getItem(AUTH_ROLE_KEY) === 'senior_admin';
  }
  function loadLocalList(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }
  function saveLocalList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }
  function profileKey(username) {
    return PROFILE_PREFIX + username;
  }
  function noticeReadKey(username) {
    return NOTICE_READ_PREFIX + String(username || getCurrentAuthUser() || 'usuario.institucional');
  }
  function loadLocalProfile(username) {
    const user = String(username || getCurrentAuthUser() || 'admin.institucional');
    try {
      const raw = localStorage.getItem(profileKey(user));
      if (!raw) return { nome: '', cpf: '', matricula: '', funcao: '', foto: '' };
      const parsed = JSON.parse(raw);
      return {
        nome: parsed.nome || '',
        cpf: parsed.cpf || '',
        matricula: parsed.matricula || '',
        funcao: parsed.funcao || '',
        foto: parsed.foto || ''
      };
    } catch (_error) {
      return { nome: '', cpf: '', matricula: '', funcao: '', foto: '' };
    }
  }
  function saveLocalProfile(username, profile) {
    const user = String(username || getCurrentAuthUser() || 'admin.institucional');
    localStorage.setItem(profileKey(user), JSON.stringify({
      nome: String(profile.nome || ''),
      cpf: String(profile.cpf || ''),
      matricula: String(profile.matricula || ''),
      funcao: String(profile.funcao || ''),
      foto: String(profile.foto || '')
    }));
  }
  function loadLocalNoticeReads(username) {
    try {
      const raw = localStorage.getItem(noticeReadKey(username));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_error) {
      return [];
    }
  }
  function saveLocalNoticeReads(username, list) {
    localStorage.setItem(noticeReadKey(username), JSON.stringify(Array.isArray(list) ? list : []));
  }
  function persistAuth(userId, role) {
    localStorage.setItem(AUTH_KEY, 'ok');
    localStorage.setItem(AUTH_USER_KEY, userId || 'usuario.institucional');
    localStorage.setItem(AUTH_ROLE_KEY, role || 'usuario');
  }
  function clearAuth() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_ROLE_KEY);
  }
  function mapRowToProcesso(row) {
    return {
      id: row.id,
      processoSei: row.processo_sei || row.numero_processo,
      numeroContrato: row.numero_contrato,
      objeto: row.objeto || row.objeto_contrato,
      fundamentacaoLegal: row.fundamentacao_legal || row.fundamentacao_contrato || '',
      empresaContratada: row.empresa_contratada || '',
      valorGlobal: Number(row.valor_global || row.valor_contrato),
      fonte: row.fonte || row.fonte_recurso,
      gestorContrato: row.gestor_contrato,
      fiscaisContrato: row.fiscais_contrato || row.fiscal_contrato,
      inicioVigencia: row.inicio_vigencia,
      fimVigencia: row.fim_vigencia || row.termino_vigencia,
      contratoContinuado: !!row.contrato_continuado,
      observacoes: row.observacoes || '',
      status: row.status_contrato || 'vigente'
    };
  }
  function mapProcessoToRow(item) {
    return {
      numero_processo: String(item.processoSei || '').trim(),
      processo_sei: String(item.processoSei || '').trim(),
      numero_contrato: String(item.numeroContrato || '').trim(),
      inicio_vigencia: String(item.inicioVigencia || '').trim(),
      fim_vigencia: String(item.fimVigencia || '').trim(),
      termino_vigencia: String(item.fimVigencia || '').trim(),
      gestor_contrato: String(item.gestorContrato || '').trim(),
      fiscais_contrato: String(item.fiscaisContrato || '').trim(),
      fiscal_contrato: String(item.fiscaisContrato || '').trim(),
      fonte: String(item.fonte || '').trim(),
      fonte_recurso: String(item.fonte || '').trim(),
      valor_global: Number(item.valorGlobal) || 0,
      valor_contrato: Number(item.valorGlobal) || 0,
      objeto: String(item.objeto || '').trim(),
      objeto_contrato: String(item.objeto || '').trim(),
      fundamentacao_legal: String(item.fundamentacaoLegal || '').trim(),
      empresa_contratada: String(item.empresaContratada || '').trim(),
      contrato_continuado: !!item.contratoContinuado,
      observacoes: String(item.observacoes || '').trim(),
      status_contrato: String(item.status || 'vigente').trim().toLowerCase(),
      data_assinatura: String(item.inicioVigencia || '').trim(),
      data_publicacao: String(item.fimVigencia || '').trim(),
      fundamentacao_contrato: String(item.fundamentacaoLegal || '').trim()
    };
  }
  function isLegacyDemoProcess(item) {
    const id = String(item && item.id ? item.id : '').trim();
    const processo = String(item && item.processoSei ? item.processoSei : '').trim().toUpperCase();
    const contrato = String(item && item.numeroContrato ? item.numeroContrato : '').trim().toUpperCase();
    return LEGACY_DEMO_PROCESS_IDS.indexOf(id) >= 0 ||
      LEGACY_DEMO_PROCESSOS.indexOf(processo) >= 0 ||
      LEGACY_DEMO_CONTRATOS.indexOf(contrato) >= 0;
  }
  async function purgeLegacyDemoProcessos() {
    const cached = loadLocalList(PROCESS_KEY);
    const filtered = cached.filter(function (item) { return !isLegacyDemoProcess(item); });
    if (filtered.length !== cached.length) {
      saveLocalList(PROCESS_KEY, filtered);
    }

    if (!isSupabaseEnabled()) {
      return { removedLocal: cached.length - filtered.length, removedRemote: 0 };
    }

    const user = await getSessionUser();
    if (!user) {
      return { removedLocal: cached.length - filtered.length, removedRemote: 0 };
    }

    const supabase = getClient();
    const remoteIds = new Set();
    const checks = [
      supabase.from('processos_contratos').select('id').in('numero_processo', LEGACY_DEMO_PROCESSOS),
      supabase.from('processos_contratos').select('id').in('processo_sei', LEGACY_DEMO_PROCESSOS),
      supabase.from('processos_contratos').select('id').in('numero_contrato', LEGACY_DEMO_CONTRATOS)
    ];

    for (let i = 0; i < checks.length; i += 1) {
      const result = await checks[i];
      if (result.error) throw new Error(result.error.message || 'Falha ao localizar contratos de exemplo.');
      (result.data || []).forEach(function (row) {
        if (row && row.id) remoteIds.add(String(row.id));
      });
    }

    if (remoteIds.size === 0) {
      return { removedLocal: cached.length - filtered.length, removedRemote: 0 };
    }

    const deleteResult = await supabase.from('processos_contratos').delete().in('id', Array.from(remoteIds));
    if (deleteResult.error) throw new Error(deleteResult.error.message || 'Falha ao remover contratos de exemplo.');

    return { removedLocal: cached.length - filtered.length, removedRemote: remoteIds.size };
  }
  function mapRowToSystemNotice(row) {
    return {
      id: row.id,
      titulo: row.titulo || '',
      tipo: String(row.tipo || 'aviso').trim().toLowerCase(),
      conteudo: row.conteudo || '',
      publicado: row.publicado !== false,
      criadoPor: row.criado_por || '',
      criadoEm: row.criado_em || '',
      atualizadoPor: row.atualizado_por || '',
      atualizadoEm: row.atualizado_em || row.criado_em || '',
      lida: !!row.lida
    };
  }
  function mapSystemNoticeToRow(item) {
    return {
      titulo: String(item.titulo || '').trim(),
      tipo: String(item.tipo || 'aviso').trim().toLowerCase(),
      conteudo: String(item.conteudo || '').trim(),
      publicado: item.publicado !== false
    };
  }
  function mapAuditRow(row) {
    return {
      id: row.id,
      modulo: row.modulo || '',
      acao: row.acao || '',
      entidade: row.entidade || '',
      entidadeId: row.entidade_id || '',
      payload: row.payload || {},
      usuario: row.usuario_id || '-',
      criadoEm: row.criado_em || ''
    };
  }
  function buildProcessAuditPayload(item) {
    return {
      processoSei: String(item && item.processoSei ? item.processoSei : '').trim(),
      numeroContrato: String(item && item.numeroContrato ? item.numeroContrato : '').trim(),
      empresaContratada: String(item && item.empresaContratada ? item.empresaContratada : '').trim(),
      status: String(item && item.status ? item.status : 'vigente').trim().toLowerCase()
    };
  }
  function getAuditActionLabel(action) {
    const normalized = String(action || '').trim().toLowerCase();
    if (normalized === 'cadastro') return 'Cadastro';
    if (normalized === 'alteracao') return 'Altera\u00e7\u00e3o';
    if (normalized === 'encerramento') return 'Encerramento';
    if (normalized === 'exclusao') return 'Exclus\u00e3o';
    return 'A\u00e7\u00e3o';
  }
  async function logAuditEvent(entry) {
    const payload = {
      modulo: String(entry && entry.modulo ? entry.modulo : '').trim(),
      acao: String(entry && entry.acao ? entry.acao : '').trim().toLowerCase(),
      entidade: String(entry && entry.entidade ? entry.entidade : '').trim(),
      entidadeId: String(entry && entry.entidadeId ? entry.entidadeId : '').trim(),
      payload: entry && entry.payload ? entry.payload : {}
    };

    if (!payload.modulo || !payload.acao || !payload.entidade) return null;

    if (!isSupabaseEnabled()) {
      const list = loadLocalList(AUDIT_KEY);
      list.unshift({
        id: 'audit-' + Date.now(),
        modulo: payload.modulo,
        acao: payload.acao,
        entidade: payload.entidade,
        entidadeId: payload.entidadeId,
        payload: payload.payload,
        usuario: getCurrentAuthUser(),
        criadoEm: new Date().toISOString()
      });
      saveLocalList(AUDIT_KEY, list.slice(0, 300));
      return true;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    const actor = user ? (user.email || user.id) : getCurrentAuthUser();
    const result = await supabase.from('auditoria_eventos').insert({
      modulo: payload.modulo,
      acao: payload.acao,
      entidade: payload.entidade,
      entidade_id: payload.entidadeId || null,
      payload: payload.payload,
      usuario_id: actor
    });
    if (result.error) throw new Error(result.error.message || 'Falha ao registrar auditoria.');
    return true;
  }
  async function listAuditEvents(limit) {
    const size = Math.max(1, Math.min(Number(limit) || 20, 100));
    if (isSupabaseEnabled()) {
      const allowed = await hasVerifiedSeniorAdminAccess();
      if (!allowed) {
        throw new Error('Somente o Administrador Senior pode consultar a central de acoes.');
      }
    } else if (!isCurrentUserSeniorAdmin()) {
      throw new Error('Somente o Administrador Senior pode consultar a central de acoes.');
    }

    if (!isSupabaseEnabled()) {
      return loadLocalList(AUDIT_KEY)
        .filter(function (item) { return String(item.modulo || '').trim().toLowerCase() === 'contratos'; })
        .slice(0, size)
        .map(function (item) {
          return {
            id: item.id,
            modulo: item.modulo,
            acao: item.acao,
            acaoLabel: getAuditActionLabel(item.acao),
            entidade: item.entidade,
            entidadeId: item.entidadeId,
            payload: item.payload || {},
            usuario: item.usuario || '-',
            criadoEm: item.criadoEm || ''
          };
        });
    }

    const supabase = getClient();
    const result = await supabase
      .from('auditoria_eventos')
      .select('*')
      .eq('modulo', 'contratos')
      .order('criado_em', { ascending: false })
      .limit(size);
    if (result.error) throw new Error(result.error.message || 'Falha ao consultar a central de a\u00e7\u00f5es.');
    return (result.data || []).map(function (row) {
      const mapped = mapAuditRow(row);
      mapped.acaoLabel = getAuditActionLabel(mapped.acao);
      return mapped;
    });
  }
  function mapRowToAlmoxItem(row) {
    return {
      id: row.id,
      nome: row.nome,
      categoria: row.categoria || '',
      unidadeMedida: row.unidade_medida,
      localEstoque: row.local_estoque,
      estoqueAtual: Number(row.estoque_atual) || 0,
      estoqueMinimo: Number(row.estoque_minimo) || 0,
      observacao: row.observacao || '',
      criadoPor: row.criado_por || '-',
      criadoEm: row.criado_em || '',
      ultimaMovimentacaoPor: row.atualizado_por || row.criado_por || '-',
      ultimaMovimentacaoEm: row.atualizado_em || row.criado_em || ''
    };
  }
  async function getSessionUser() {
    if (!isSupabaseEnabled()) return null;
    const supabase = getClient();
    const data = await supabase.auth.getSession();
    const session = data && data.data ? data.data.session : null;
    return session && session.user ? session.user : null;
  }
  async function resolveLoginEmail(identifier) {
    const normalized = String(identifier || '').trim().toLowerCase();
    if (!normalized) return '';
    if (normalized.indexOf('@') >= 0) return normalized;
    const supabase = getClient();
    const result = await supabase.rpc('resolver_login_identificador', {
      p_identificador: normalized
    });
    if (result.error) {
      throw new Error(result.error.message || 'Falha ao localizar usu\u00e1rio para autentica\u00e7\u00e3o.');
    }
    if (!Array.isArray(result.data) || !result.data.length) {
      return normalized;
    }
    return String(result.data[0].email || normalized).trim().toLowerCase();
  }
  async function getAccessRequestByEmail(email) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return null;
    const supabase = getClient();
    const result = await supabase
      .from('solicitacoes_acesso')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();
    if (result.error) {
      throw new Error(result.error.message || 'Falha ao consultar solicita\u00e7\u00e3o de acesso.');
    }
    return result.data || null;
  }
  async function createApprovedProfileFromRequest(user, request, defaults, roleOverride) {
    const supabase = getClient();
    const payload = {
      auth_user_id: user.id,
      username: normalizeEmail(user.email || defaults.email || request.email || ''),
      nome_completo: defaults.nome || request.nome_completo || '',
      cpf: defaults.cpf || request.cpf || '',
      matricula: defaults.matricula || request.matricula || '',
      funcao: defaults.funcao || '',
      foto_url: defaults.foto || '',
      status_acesso: 'ativo',
      role: roleOverride || 'usuario'
    };
    const created = await supabase
      .from('usuarios_perfil')
      .upsert(payload, { onConflict: 'auth_user_id' })
      .select('*')
      .single();
    if (created.error) {
      throw new Error(created.error.message || 'Falha ao criar perfil aprovado.');
    }
    return created.data;
  }
  async function getOrCreateAccessProfile(user, defaults) {
    const supabase = getClient();
    const query = await supabase
      .from('usuarios_perfil')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (query.error) {
      throw new Error(query.error.message || 'Falha ao consultar perfil de acesso.');
    }
    if (query.data) return query.data;
    const userEmail = normalizeEmail(user && user.email ? user.email : defaults.email || '');
    const bootstrapEmail = normalizeEmail(getConfig().seniorAdminBootstrapEmail);
    if (userEmail && userEmail === bootstrapEmail) {
      return createApprovedProfileFromRequest(user, {
        email: userEmail,
        nome_completo: defaults.nome || '',
        cpf: defaults.cpf || '',
        matricula: defaults.matricula || ''
      }, defaults, 'senior_admin');
    }
    const accessRequest = await getAccessRequestByEmail(userEmail);
    if (!accessRequest) {
      throw new Error('Nenhuma solicita\u00e7\u00e3o de acesso foi localizada para este usu\u00e1rio.');
    }
    const requestStatus = String(accessRequest.status || '').toLowerCase();
    if (requestStatus === 'aprovado') {
      return createApprovedProfileFromRequest(user, accessRequest, defaults, 'usuario');
    }
    return {
      id: accessRequest.id,
      auth_user_id: user.id,
      username: accessRequest.email,

      nome_completo: accessRequest.nome_completo || defaults.nome || '',
      cpf: accessRequest.cpf || defaults.cpf || '',
      matricula: accessRequest.matricula || defaults.matricula || '',
      funcao: defaults.funcao || '',
      foto_url: defaults.foto || '',
      status_acesso: requestStatus || 'pendente',
      role: 'usuario'
    };
  }
  async function tryBootstrapS\u00eaniorAdmin(user, profile) {
    const cfg = getConfig();
    const bootstrapEmail = normalizeEmail(cfg.seniorAdminBootstrapEmail);
    const userEmail = normalizeEmail(user && user.email ? user.email : '');
    if (!bootstrapEmail || !userEmail || userEmail !== bootstrapEmail) {
      return profile;
    }
    const alreadyS\u00eanior = String(profile.role || '').toLowerCase() === 'senior_admin' && String(profile.status_acesso || '').toLowerCase() === 'ativo';
    if (alreadyS\u00eanior) return profile;
    const supabase = getClient();
    let updated = await supabase
      .from('usuarios_perfil')
      .update({
        role: 'senior_admin',
        status_acesso: 'ativo',
        aprovado_por: user.email || user.id,
        aprovado_em: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select('*')
      .single();
    if (updated.error && isMissingApprovalColumnError(updated.error)) {
      updated = await supabase
        .from('usuarios_perfil')
        .update({
          role: 'senior_admin',
          status_acesso: 'ativo'
        })
        .eq('id', profile.id)
        .select('*')
        .single();
    }
    if (updated.error) {
      throw new Error(updated.error.message || 'Falha ao ativar administrador s\u00eanior inicial.');
    }
    return updated.data;
  }
  async function ensureAccessAfterLogin(user) {
    const meta = user && user.user_metadata ? user.user_metadata : {};
    let profile = await getOrCreateAccessProfile(user, {
      email: user.email || '',
      nome: String(meta.nome || ''),
      cpf: String(meta.cpf || ''),
      matricula: String(meta.matricula || '')
    });
    profile = await tryBootstrapS\u00eaniorAdmin(user, profile);
    const role = String(profile.role || 'usuario').toLowerCase();
    const status = String(profile.status_acesso || '').toLowerCase();
    if (status !== 'ativo') {
      return { ok: false, status: status || 'pendente' };
    }
    return { ok: true, status: 'ativo', role: role };
  }
  async function getCurrentAccessProfile() {
    if (!isSupabaseEnabled()) return null;
    const user = await getSessionUser();
    if (!user) return null;
    const meta = user && user.user_metadata ? user.user_metadata : {};
    return getOrCreateAccessProfile(user, {
      email: user.email || '',
      nome: String(meta.nome || ''),
      cpf: String(meta.cpf || ''),
      matricula: String(meta.matricula || '')
    });
  }
  async function hasVerifiedSeniorAdminAccess() {
    if (!isSupabaseEnabled()) return isCurrentUserSeniorAdmin();

    const validSession = await restoreSession();
    if (!validSession) return false;

    const profile = await getCurrentAccessProfile();
    const role = String(profile && profile.role ? profile.role : '').toLowerCase();
    const status = String(profile && profile.status_acesso ? profile.status_acesso : '').toLowerCase();
    return role === 'senior_admin' && status === 'ativo';
  }
  async function signIn(identifier, password) {
    if (isSupabaseEnabled()) {
      const supabase = getClient();
      const loginValue = String(identifier || '').trim();
      const pass = String(password || '');
      let email = '';

      try {
        email = await resolveLoginEmail(loginValue);
      } catch (error) {
        return { ok: false, message: (error && error.message) ? error.message : 'Falha ao localizar o usu\u00e1rio para autentica\u00e7\u00e3o.' };
      }

      if (!email || !pass) {
        return { ok: false, message: 'Informe CPF ou e-mail e senha.' };
      }

      const result = await supabase.auth.signInWithPassword({ email: email, password: pass });
      if (result.error) return { ok: false, message: translateAuthError(result.error, 'Falha ao autenticar.') };
      const user = result.data && result.data.user ? result.data.user : null;
      if (!user) return { ok: false, message: 'Usu\u00e1rio n\u00e3o encontrado na sess\u00e3o.' };

      let access;
      try {
        access = await ensureAccessAfterLogin(user);
      } catch (error) {
        return { ok: false, message: (error && error.message) ? error.message : 'Falha ao validar perfil de acesso.' };
      }

      if (!access.ok) {
        await supabase.auth.signOut();
        return { ok: false, message: 'Seu acesso ainda n\u00e3o foi aprovado pelo Administrador S\u00eanior.' };
      }

      persistAuth(user.email || email, access.role || 'usuario');
      return { ok: true, userId: user.email || email };
    }
    if (window.AuthDB && typeof window.AuthDB.validateLogin === 'function') {
      const fallback = await window.AuthDB.validateLogin(identifier, password);
      if (!fallback.ok) return { ok: false, message: 'Credenciais inv\u00e1lidas. Verifique usu\u00e1rio e senha.' };
      persistAuth(fallback.user.username, 'senior_admin');
      return { ok: true, userId: fallback.user.username };
    }
    return { ok: false, message: 'Autentica\u00e7\u00e3o indispon\u00edvel.' };
  }
  async function restoreSession() {
    if (!isSupabaseEnabled()) {
      return localStorage.getItem(AUTH_KEY) === 'ok';
    }

    const user = await getSessionUser();
    if (!user) {
      clearAuth();
      return false;
    }

    let access;
    try {
      access = await ensureAccessAfterLogin(user);
    } catch (_error) {
      const supabase = getClient();
      await supabase.auth.signOut();
      clearAuth();
      return false;
    }
    if (!access.ok) {
      const supabase = getClient();
      await supabase.auth.signOut();
      clearAuth();
      return false;
    }

    persistAuth(user.email || user.id || 'usuario.institucional', access.role || 'usuario');
    return true;
  }

  async function signOut() {
    if (isSupabaseEnabled()) {
      const supabase = getClient();
      await supabase.auth.signOut();
    }
    clearAuth();
  }

  async function sendPasswordReset(email) {
    const target = normalizeEmail(email);
    if (!target) throw new Error('Informe um e-mail valido.');

    if (!isSupabaseEnabled()) {
      throw new Error('Recupera\u00e7\u00e3o de senha dispon\u00edvel apenas no modo Supabase.');
    }

    const supabase = getClient();
    const redirect = window.location.origin.replace(/\/$/, '') + '/index.html';
    const result = await supabase.auth.resetPasswordForEmail(target, { redirectTo: redirect });
    if (result.error) {
      throw new Error(translateAuthError(result.error, 'Falha ao enviar recupera\u00e7\u00e3o de senha.'));
    }
    return true;
  }

  async function verifyCurrentPassword(password) {
    const pass = String(password || '').trim();
    if (!pass) return false;

    if (isSupabaseEnabled()) {
      const user = await getSessionUser();
      if (!user || !user.email) return false;
      const supabase = getClient();
      const result = await supabase.auth.signInWithPassword({ email: user.email, password: pass });
      return !result.error;
    }

    if (window.AuthDB && typeof window.AuthDB.validateLogin === 'function') {
      const fallback = await window.AuthDB.validateLogin(getCurrentAuthUser(), pass);
      return !!fallback.ok;
    }

    return false;
  }

  async function changePassword(currentPassword, newPassword) {
    const current = String(currentPassword || '');
    const next = String(newPassword || '');

    if (!current || !next) {
      throw new Error('Informe a senha atual e a nova senha.');
    }

    if (next.length < 8) {
      throw new Error('A nova senha deve possuir no minimo 8 caracteres.');
    }

    const validCurrentPassword = await verifyCurrentPassword(current);
    if (!validCurrentPassword) {
      throw new Error('A senha atual informada esta incorreta.');
    }

    if (isSupabaseEnabled()) {
      const supabase = getClient();
      const result = await supabase.auth.updateUser({ password: next });
      if (result.error) {
        throw new Error(translateAuthError(result.error, 'Falha ao atualizar a senha.'));
      }
      return true;
    }

    if (window.AuthDB && typeof window.AuthDB.updatePassword === 'function') {
      await window.AuthDB.updatePassword(getCurrentAuthUser(), next);
      return true;
    }

    throw new Error('Atualizacao de senha indisponivel neste ambiente.');
  }

  async function requestAccess(payload) {
    if (!isSupabaseEnabled()) {
      throw new Error('Solicita\u00e7\u00e3o de acesso dispon\u00edvel apenas no modo Supabase.');
    }

    const nome = String(payload.nome || '').trim();
    const cpf = String(payload.cpf || '').trim();
    const matricula = String(payload.matricula || '').trim();
    const email = normalizeEmail(payload.email);
    const senha = String(payload.senha || '');

    if (!nome || !cpf || !matricula || !email || !senha) {
      throw new Error('Preencha todos os campos obrigat\u00f3rios para solicitar acesso.');
    }

    const supabase = getClient();
    const result = await supabase.rpc('solicitar_acesso', {
      p_nome: nome,
      p_cpf: cpf,
      p_matricula: matricula,
      p_email: email,
      p_senha: senha
    });

    if (result.error) {
      throw new Error(result.error.message || 'Falha ao registrar solicita\u00e7\u00e3o de acesso.');
    }

    return true;
  }

  async function listPendingAccessRequests() {
    if (!isSupabaseEnabled()) {
      throw new Error('Consulta de solicita\u00e7\u00f5es dispon\u00edvel apenas no modo Supabase.');
    }

    const currentProfile = await getCurrentAccessProfile();
    const role = String(currentProfile && currentProfile.role ? currentProfile.role : '').toLowerCase();
    if (!currentProfile || role !== 'senior_admin') {
      throw new Error('Apenas o Administrador S\u00eanior pode consultar solicita\u00e7\u00f5es.');
    }

    const supabase = getClient();
    const result = await supabase
      .from('solicitacoes_acesso')
      .select('id,email,nome_completo,cpf,matricula,status,criado_em')
      .eq('status', 'pendente')
      .order('criado_em', { ascending: true });

    if (result.error) {
      throw new Error(result.error.message || 'Falha ao consultar solicita\u00e7\u00f5es pendentes.');
    }

    return (result.data || []).map(function (item) {
      return {
        id: item.id,
        username: item.email,
        nome_completo: item.nome_completo,
        cpf: item.cpf,
        matricula: item.matricula,
        status_acesso: item.status,
        criado_em: item.criado_em
      };
    });
  }

  async function approveAccessRequest(requestId) {
    if (!isSupabaseEnabled()) {
      throw new Error('Aprova\u00e7\u00e3o dispon\u00edvel apenas no modo Supabase.');
    }

    const id = String(requestId || '').trim();
    if (!id) throw new Error('Solicita\u00e7\u00e3o inv\u00e1lida para aprova\u00e7\u00e3o.');

    const currentUser = await getSessionUser();
    const currentProfile = await getCurrentAccessProfile();
    const role = String(currentProfile && currentProfile.role ? currentProfile.role : '').toLowerCase();
    if (!currentUser || !currentProfile || role !== 'senior_admin') {
      throw new Error('Apenas o Administrador S\u00eanior pode aprovar solicita\u00e7\u00f5es.');
    }

    const supabase = getClient();
    const result = await supabase.rpc('aprovar_solicitacao_acesso', {
      p_solicitacao_id: id,
      p_admin_email: normalizeEmail(currentUser.email || '')
    });

    if (result.error) {
      throw new Error(result.error.message || 'Falha ao aprovar solicita\u00e7\u00e3o.');
    }

    return true;
  }
  async function listProcessos() {
    if (!isSupabaseEnabled()) return loadLocalList(PROCESS_KEY);

    const supabase = getClient();
    const result = await supabase.from('processos_contratos').select('*').order('termino_vigencia', { ascending: true });
    if (result.error) throw new Error(result.error.message || 'Falha ao consultar contratos.');

    const list = (result.data || []).map(mapRowToProcesso);
    saveLocalList(PROCESS_KEY, list);
    return list;
  }

  async function hasDuplicateProcesso(numeroProcesso, numeroContrato) {
    if (!isSupabaseEnabled()) {
      const list = loadLocalList(PROCESS_KEY);
      const np = String(numeroProcesso || '').trim().toLowerCase();
      const nc = String(numeroContrato || '').trim().toLowerCase();
      return list.some(function (item) {
        return String(item.processoSei || '').trim().toLowerCase() === np || String(item.numeroContrato || '').trim().toLowerCase() === nc;
      });
    }

    const supabase = getClient();
    const np = String(numeroProcesso || '').trim();
    const nc = String(numeroContrato || '').trim();

    const byProcesso = await supabase.from('processos_contratos').select('id').eq('numero_processo', np).limit(1);
    if (byProcesso.error) throw new Error(byProcesso.error.message || 'Falha ao validar n\u00famero do processo.');
    if ((byProcesso.data || []).length > 0) return true;

    const byContrato = await supabase.from('processos_contratos').select('id').eq('numero_contrato', nc).limit(1);
    if (byContrato.error) throw new Error(byContrato.error.message || 'Falha ao validar n\u00famero do contrato.');
    return (byContrato.data || []).length > 0;
  }

  async function hasDuplicateProcessoForUpdate(id, numeroProcesso, numeroContrato) {
    const safeId = String(id || '').trim();
    if (!safeId) return hasDuplicateProcesso(numeroProcesso, numeroContrato);

    if (!isSupabaseEnabled()) {
      const list = loadLocalList(PROCESS_KEY);
      const np = String(numeroProcesso || '').trim().toLowerCase();
      const nc = String(numeroContrato || '').trim().toLowerCase();
      return list.some(function (item) {
        if (String(item.id) === safeId) return false;
        return String(item.processoSei || '').trim().toLowerCase() === np ||
          String(item.numeroContrato || '').trim().toLowerCase() === nc;
      });
    }

    const supabase = getClient();
    const np = String(numeroProcesso || '').trim();
    const nc = String(numeroContrato || '').trim();

    const byProcesso = await supabase.from('processos_contratos').select('id').eq('numero_processo', np).neq('id', safeId).limit(1);
    if (byProcesso.error) throw new Error(byProcesso.error.message || 'Falha ao validar n\u00famero do processo.');
    if ((byProcesso.data || []).length > 0) return true;

    const byContrato = await supabase.from('processos_contratos').select('id').eq('numero_contrato', nc).neq('id', safeId).limit(1);
    if (byContrato.error) throw new Error(byContrato.error.message || 'Falha ao validar n\u00famero do contrato.');
    return (byContrato.data || []).length > 0;
  }

  async function createProcesso(item) {
    if (!isSupabaseEnabled()) {
      const list = loadLocalList(PROCESS_KEY);
      const entity = item.id ? item : Object.assign({ id: String(Date.now()) }, item);
      list.push(entity);
      saveLocalList(PROCESS_KEY, list);
      await logAuditEvent({
        modulo: 'contratos',
        acao: 'cadastro',
        entidade: 'processo_contrato',
        entidadeId: String(entity.id || ''),
        payload: buildProcessAuditPayload(entity)
      });
      return entity;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    const payload = mapProcessoToRow(item);
    payload.criado_por = user ? (user.email || user.id) : null;
    payload.atualizado_por = user ? (user.email || user.id) : null;

    const result = await supabase.from('processos_contratos').insert(payload).select('*').single();
    if (result.error) throw new Error(result.error.message || 'Falha ao salvar contrato.');

    const mapped = mapRowToProcesso(result.data);
    const cached = loadLocalList(PROCESS_KEY);
    cached.push(mapped);
    saveLocalList(PROCESS_KEY, cached);
    await logAuditEvent({
      modulo: 'contratos',
      acao: 'cadastro',
      entidade: 'processo_contrato',
      entidadeId: String(mapped.id || ''),
      payload: buildProcessAuditPayload(mapped)
    });
    return mapped;
  }

  async function updateProcesso(id, item) {
    const safeId = String(id || '').trim();
    if (!safeId) throw new Error('Contrato inv\u00e1lido para atualiza\u00e7\u00e3o.');

    if (!isSupabaseEnabled()) {
      const list = loadLocalList(PROCESS_KEY);
      const index = list.findIndex(function (entry) { return String(entry.id) === safeId; });
      if (index < 0) throw new Error('Contrato n\u00e3o encontrado para atualiza\u00e7\u00e3o.');

      const entity = Object.assign({}, list[index], item, { id: safeId });
      list[index] = entity;
      saveLocalList(PROCESS_KEY, list);
      await logAuditEvent({
        modulo: 'contratos',
        acao: String(entity.status || '').trim().toLowerCase() === 'encerrado' ? 'encerramento' : 'alteracao',
        entidade: 'processo_contrato',
        entidadeId: safeId,
        payload: buildProcessAuditPayload(entity)
      });
      return entity;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    const payload = mapProcessoToRow(item);
    payload.atualizado_por = user ? (user.email || user.id) : null;

    const result = await supabase.from('processos_contratos').update(payload).eq('id', safeId).select('*').single();
    if (result.error) throw new Error(result.error.message || 'Falha ao atualizar contrato.');

    const mapped = mapRowToProcesso(result.data);
    const cached = loadLocalList(PROCESS_KEY);
    const index = cached.findIndex(function (entry) { return String(entry.id) === safeId; });
    if (index >= 0) {
      cached[index] = mapped;
    } else {
      cached.push(mapped);
    }
    saveLocalList(PROCESS_KEY, cached);
    await logAuditEvent({
      modulo: 'contratos',
      acao: String(mapped.status || '').trim().toLowerCase() === 'encerrado' ? 'encerramento' : 'alteracao',
      entidade: 'processo_contrato',
      entidadeId: safeId,
      payload: buildProcessAuditPayload(mapped)
    });
    return mapped;
  }

  async function deleteProcesso(id) {
    const safeId = String(id || '').trim();
    if (!safeId) throw new Error('Contrato inv\u00e1lido para exclus\u00e3o.');

    if (!isSupabaseEnabled()) {
      const current = loadLocalList(PROCESS_KEY).find(function (item) { return String(item.id) === safeId; }) || null;
      const list = loadLocalList(PROCESS_KEY).filter(function (item) { return String(item.id) !== safeId; });
      saveLocalList(PROCESS_KEY, list);
      await logAuditEvent({
        modulo: 'contratos',
        acao: 'exclusao',
        entidade: 'processo_contrato',
        entidadeId: safeId,
        payload: buildProcessAuditPayload(current || { id: safeId })
      });
      return true;
    }

    const supabase = getClient();
    const found = await supabase.from('processos_contratos').select('*').eq('id', safeId).single();
    const current = found && !found.error ? mapRowToProcesso(found.data) : null;
    const result = await supabase.from('processos_contratos').delete().eq('id', safeId);
    if (result.error) throw new Error(result.error.message || 'Falha ao remover contrato.');

    const list = loadLocalList(PROCESS_KEY).filter(function (item) { return String(item.id) !== safeId; });
    saveLocalList(PROCESS_KEY, list);
    await logAuditEvent({
      modulo: 'contratos',
      acao: 'exclusao',
      entidade: 'processo_contrato',
      entidadeId: safeId,
      payload: buildProcessAuditPayload(current || { id: safeId })
    });
    return true;
  }

  async function listSystemNotices(includeUnpublished) {
    const all = !!includeUnpublished;
    if (!isSupabaseEnabled()) {
      const reads = loadLocalNoticeReads(getCurrentAuthUser());
      let list = loadLocalList(NOTICE_KEY).map(function (item) {
        return {
          id: item.id,
          titulo: item.titulo || '',
          tipo: item.tipo || 'aviso',
          conteudo: item.conteudo || '',
          publicado: item.publicado !== false,
          criadoPor: item.criadoPor || '',
          criadoEm: item.criadoEm || '',
          atualizadoPor: item.atualizadoPor || '',
          atualizadoEm: item.atualizadoEm || item.criadoEm || '',
          lida: reads.indexOf(String(item.id || '')) >= 0
        };
      });
      list.sort(function (a, b) {
        return String(b.atualizadoEm || b.criadoEm || '').localeCompare(String(a.atualizadoEm || a.criadoEm || ''));
      });
      return all ? list : list.filter(function (item) { return item.publicado !== false; });
    }

    const supabase = getClient();
    let query = supabase.from('sistema_novidades').select('*').order('atualizado_em', { ascending: false }).order('criado_em', { ascending: false });
    let canViewAll = false;
    if (all) {
      canViewAll = await hasVerifiedSeniorAdminAccess();
    }
    if (!all || !canViewAll) {
      query = query.eq('publicado', true);
    }

    const result = await query;
    if (result.error) throw new Error(result.error.message || 'Falha ao consultar novidades do sistema.');
    const list = (result.data || []).map(mapRowToSystemNotice);
    const user = await getSessionUser();
    const localReads = new Set(loadLocalNoticeReads(getCurrentAuthUser()).map(function (item) { return String(item || '').trim(); }));
    list.forEach(function (item) {
      item.lida = localReads.has(String(item.id || '').trim());
    });
    if (user && list.length > 0) {
      const ids = list.map(function (item) { return String(item.id || '').trim(); }).filter(Boolean);
      const readResult = await supabase
        .from('sistema_novidades_leituras')
        .select('novidade_id')
        .eq('auth_user_id', user.id)
        .in('novidade_id', ids);
      if (readResult.error) {
        if (!isMissingSystemNoticeReadsTableError(readResult.error)) {
          throw new Error(readResult.error.message || 'Falha ao consultar leituras de novidades.');
        }
      } else {
        const readIds = new Set((readResult.data || []).map(function (item) { return String(item.novidade_id || '').trim(); }));
        list.forEach(function (item) {
          item.lida = readIds.has(String(item.id || '').trim()) || localReads.has(String(item.id || '').trim());
        });
      }
    }
    saveLocalList(NOTICE_KEY, list);
    return list;
  }

  async function markSystemNoticeRead(id, read) {
    const safeId = String(id || '').trim();
    if (!safeId) throw new Error('Novidade inv\u00e1lida para registrar leitura.');
    const shouldMarkRead = read !== false;

    if (!isSupabaseEnabled()) {
      const username = getCurrentAuthUser();
      const reads = loadLocalNoticeReads(username);
      const exists = reads.indexOf(safeId) >= 0;
      if (shouldMarkRead && !exists) reads.push(safeId);
      if (!shouldMarkRead && exists) {
        saveLocalNoticeReads(username, reads.filter(function (item) { return String(item) !== safeId; }));
      } else {
        saveLocalNoticeReads(username, reads);
      }
      return true;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    if (!user) throw new Error('Sess\u00e3o inv\u00e1lida para registrar leitura.');

    const username = getCurrentAuthUser();
    const reads = loadLocalNoticeReads(username);
    const exists = reads.indexOf(safeId) >= 0;
    const nextReads = shouldMarkRead
      ? (exists ? reads.slice() : reads.concat([safeId]))
      : reads.filter(function (item) { return String(item) !== safeId; });

    saveLocalNoticeReads(username, nextReads);

    if (shouldMarkRead) {
      const insertResult = await supabase
        .from('sistema_novidades_leituras')
        .upsert({
          novidade_id: safeId,
          auth_user_id: user.id,
          lida_em: new Date().toISOString()
        }, { onConflict: 'novidade_id,auth_user_id' });
      if (insertResult.error && !isMissingSystemNoticeReadsTableError(insertResult.error)) {
        saveLocalNoticeReads(username, reads);
        throw new Error(insertResult.error.message || 'Falha ao marcar novidade como lida.');
      }
    } else {
      const deleteResult = await supabase
        .from('sistema_novidades_leituras')
        .delete()
        .eq('novidade_id', safeId)
        .eq('auth_user_id', user.id);
      if (deleteResult.error && !isMissingSystemNoticeReadsTableError(deleteResult.error)) {
        saveLocalNoticeReads(username, reads);
        throw new Error(deleteResult.error.message || 'Falha ao atualizar leitura da novidade.');
      }
    }

    return true;
  }
  async function saveSystemNotice(payload) {
    if (isSupabaseEnabled()) {
      const allowed = await hasVerifiedSeniorAdminAccess();
      if (!allowed) {
        throw new Error('Somente o Administrador Senior pode publicar novidades do sistema.');
      }
    } else if (!isCurrentUserSeniorAdmin()) {
      throw new Error('Somente o Administrador Senior pode publicar novidades do sistema.');
    }

    const entity = {
      id: String(payload && payload.id ? payload.id : '').trim(),
      titulo: String(payload && payload.titulo ? payload.titulo : '').trim(),
      tipo: String(payload && payload.tipo ? payload.tipo : 'aviso').trim().toLowerCase(),
      conteudo: String(payload && payload.conteudo ? payload.conteudo : '').trim(),
      publicado: payload && payload.publicado !== false
    };

    if (!entity.titulo) throw new Error('Informe o t\u00edtulo da novidade.');
    if (!entity.conteudo) throw new Error('Informe o conte\u00fado da novidade.');

    if (!isSupabaseEnabled()) {
      const now = new Date().toISOString();
      const username = getCurrentAuthUser();
      const list = loadLocalList(NOTICE_KEY);
      if (entity.id) {
        const index = list.findIndex(function (item) { return String(item.id) === entity.id; });
        if (index < 0) throw new Error('Novidade n\u00e3o encontrada para atualiza\u00e7\u00e3o.');
        list[index] = Object.assign({}, list[index], entity, {
          atualizadoPor: username,
          atualizadoEm: now
        });
        saveLocalList(NOTICE_KEY, list);
        return list[index];
      }

      const created = Object.assign({}, entity, {
        id: 'notice-' + Date.now(),
        criadoPor: username,
        criadoEm: now,
        atualizadoPor: username,
        atualizadoEm: now
      });
      list.unshift(created);
      saveLocalList(NOTICE_KEY, list);
      return created;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    const actor = user ? (user.email || user.id) : getCurrentAuthUser();
    const row = mapSystemNoticeToRow(entity);
    row.atualizado_por = actor;

    let result;
    if (entity.id) {
      result = await supabase.from('sistema_novidades').update(row).eq('id', entity.id).select('*').single();
    } else {
      row.criado_por = actor;
      result = await supabase.from('sistema_novidades').insert(row).select('*').single();
    }

    if (result.error) throw new Error(result.error.message || 'Falha ao salvar novidade do sistema.');
    const mapped = mapRowToSystemNotice(result.data);
    const cached = loadLocalList(NOTICE_KEY);
    const index = cached.findIndex(function (item) { return String(item.id) === String(mapped.id); });
    if (index >= 0) cached[index] = mapped; else cached.unshift(mapped);
    saveLocalList(NOTICE_KEY, cached);
    return mapped;
  }

  async function deleteSystemNotice(id) {
    if (isSupabaseEnabled()) {
      const allowed = await hasVerifiedSeniorAdminAccess();
      if (!allowed) {
        throw new Error('Somente o Administrador Senior pode excluir novidades do sistema.');
      }
    } else if (!isCurrentUserSeniorAdmin()) {
      throw new Error('Somente o Administrador Senior pode excluir novidades do sistema.');
    }

    const safeId = String(id || '').trim();
    if (!safeId) throw new Error('Novidade inv\u00e1lida para exclus\u00e3o.');

    if (!isSupabaseEnabled()) {
      const filtered = loadLocalList(NOTICE_KEY).filter(function (item) { return String(item.id) !== safeId; });
      saveLocalList(NOTICE_KEY, filtered);
      return true;
    }

    const supabase = getClient();
    const result = await supabase.from('sistema_novidades').delete().eq('id', safeId);
    if (result.error) throw new Error(result.error.message || 'Falha ao excluir novidade do sistema.');

    const filtered = loadLocalList(NOTICE_KEY).filter(function (item) { return String(item.id) !== safeId; });
    saveLocalList(NOTICE_KEY, filtered);
    return true;
  }

  async function getProfile() {
    if (!isSupabaseEnabled()) {
      return loadLocalProfile(getCurrentAuthUser());
    }

    const supabase = getClient();
    const user = await getSessionUser();
    if (!user) throw new Error('Sess\u00e3o inv\u00e1lida para carregar perfil.');

    const meta = user && user.user_metadata ? user.user_metadata : {};
    let profile = await getOrCreateAccessProfile(user, {
      email: user.email || '',
      nome: String(meta.nome || ''),
      cpf: String(meta.cpf || ''),
      matricula: String(meta.matricula || '')
    });
    profile = await tryBootstrapS\u00eaniorAdmin(user, profile);

    const mapped = {
      nome: profile.nome_completo || '',
      cpf: profile.cpf || '',
      matricula: profile.matricula || '',
      funcao: profile.funcao || '',
      foto: profile.foto_url || ''
    };

    saveLocalProfile(user.email || getCurrentAuthUser(), mapped);
    return mapped;
  }

  async function saveProfile(profile) {
    const normalized = {
      nome: String(profile.nome || '').trim(),
      cpf: String(profile.cpf || '').trim(),
      matricula: String(profile.matricula || '').trim(),
      funcao: String(profile.funcao || '').trim(),
      foto: String(profile.foto || '').trim()
    };

    if (!isSupabaseEnabled()) {
      saveLocalProfile(getCurrentAuthUser(), normalized);
      return normalized;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    if (!user) throw new Error('Sess\u00e3o inv\u00e1lida para salvar perfil.');

    const currentProfile = await getOrCreateAccessProfile(user, { email: user.email || '' });

    const payload = {
      auth_user_id: user.id,
      username: user.email || getCurrentAuthUser(),
      nome_completo: normalized.nome,
      cpf: normalized.cpf,
      matricula: normalized.matricula,
      funcao: normalized.funcao,
      foto_url: normalized.foto,
      status_acesso: currentProfile.status_acesso || 'pendente',
      role: currentProfile.role || 'usuario'
    };

    const result = await supabase
      .from('usuarios_perfil')
      .upsert(payload, { onConflict: 'auth_user_id' })
      .select('*')
      .single();

    if (result.error) throw new Error(result.error.message || 'Falha ao salvar perfil.');

    saveLocalProfile(user.email || getCurrentAuthUser(), normalized);
    return normalized;
  }

  async function listAlmoxItems() {
    if (!isSupabaseEnabled()) return loadLocalList(ALMOX_ITEM_KEY);

    const supabase = getClient();
    const result = await supabase.from('almox_itens').select('*').order('nome', { ascending: true });
    if (result.error) throw new Error(result.error.message || 'Falha ao consultar itens de almoxarifado.');

    const list = (result.data || []).map(mapRowToAlmoxItem);
    saveLocalList(ALMOX_ITEM_KEY, list);
    return list;
  }

  async function addAlmoxItem(payload) {
    if (!isSupabaseEnabled()) {
      const list = loadLocalList(ALMOX_ITEM_KEY);
      const nome = String(payload.nome || '').trim();
      const categoria = String(payload.categoria || '').trim();
      const unidade = String(payload.unidadeMedida || '').trim();
      const local = String(payload.localEstoque || '').trim() || 'SEAP/ALMOXARIFADO';
      const observacao = String(payload.observacao || '').trim();
      const estoqueAtual = Number(payload.estoqueAtual);
      const estoqueMinimo = Number(payload.estoqueMinimo);
      const username = getCurrentAuthUser();

      if (!nome) throw new Error('Informe o nome do item.');
      if (!unidade) throw new Error('Informe a unidade de medida.');
      if (!Number.isFinite(estoqueAtual) || estoqueAtual < 0) throw new Error('Quantidade inicial inv\u00e1lida.');
      if (!Number.isFinite(estoqueMinimo) || estoqueMinimo < 0) throw new Error('Estoque m\u00ednimo inv\u00e1lido.');

      const exists = list.some(function (item) {
        return String(item.nome || '').trim().toLowerCase() === nome.toLowerCase() && String(item.localEstoque || '').trim().toLowerCase() === local.toLowerCase();
      });
      if (exists) throw new Error('J\u00e1 existe item cadastrado com este nome neste local.');

      const now = new Date().toISOString();
      const item = {
        id: 'almox-' + Date.now(),
        nome: nome,
        categoria: categoria,
        unidadeMedida: unidade,
        localEstoque: local,
        estoqueAtual: estoqueAtual,
        estoqueMinimo: estoqueMinimo,
        observacao: observacao,
        criadoPor: username,
        criadoEm: now,
        ultimaMovimentacaoPor: username,
        ultimaMovimentacaoEm: now
      };
      list.push(item);
      saveLocalList(ALMOX_ITEM_KEY, list);

      if (estoqueAtual > 0) {
        const movs = loadLocalList(ALMOX_MOV_KEY);
        movs.unshift({
          id: 'mov-' + Date.now(),
          itemId: item.id,
          itemNome: item.nome,
          tipo: 'entrada',
          quantidade: estoqueAtual,
          motivo: 'Saldo inicial no cadastro',
          usuario: username,
          dataHora: now
        });
        saveLocalList(ALMOX_MOV_KEY, movs.slice(0, 500));
      }

      return item;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    if (!user) throw new Error('Sess\u00e3o inv\u00e1lida para cadastro no almoxarifado.');

    const payloadRow = {
      nome: String(payload.nome || '').trim(),
      categoria: String(payload.categoria || '').trim(),
      unidade_medida: String(payload.unidadeMedida || '').trim(),
      local_estoque: String(payload.localEstoque || '').trim() || 'SEAP/ALMOXARIFADO',
      estoque_atual: Number(payload.estoqueAtual) || 0,
      estoque_minimo: Number(payload.estoqueMinimo) || 0,
      observacao: String(payload.observacao || '').trim(),
      criado_por: user.email || user.id,
      atualizado_por: user.email || user.id
    };

    const result = await supabase.from('almox_itens').insert(payloadRow).select('*').single();
    if (result.error) throw new Error(result.error.message || 'Falha ao cadastrar item no almoxarifado.');

    if (payloadRow.estoque_atual > 0) {
      await supabase.from('almox_movimentacoes').insert({
        item_id: result.data.id,
        tipo: 'entrada',
        quantidade: payloadRow.estoque_atual,
        motivo: 'Saldo inicial no cadastro',
        saldo_resultante: payloadRow.estoque_atual,
        criado_por: user.email || user.id
      });
    }

    const list = await listAlmoxItems();
    return list.find(function (item) { return item.id === result.data.id; }) || mapRowToAlmoxItem(result.data);
  }

  async function moveAlmoxItem(payload) {
    const tipo = String(payload.tipo || '').trim();
    const quantidade = Number(payload.quantidade);
    const motivo = String(payload.motivo || '').trim();
    const itemId = String(payload.itemId || '').trim();

    if (!itemId) throw new Error('Selecione o item.');
    if (tipo !== 'entrada' && tipo !== 'saida') throw new Error('Tipo de movimenta\u00e7\u00e3o inv\u00e1lido.');
    if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error('Quantidade inv\u00e1lida.');
    if (!motivo) throw new Error('Informe o motivo da movimenta\u00e7\u00e3o.');

    if (!isSupabaseEnabled()) {
      const items = loadLocalList(ALMOX_ITEM_KEY);
      const idx = items.findIndex(function (item) { return item.id === itemId; });
      if (idx < 0) throw new Error('Item n\u00e3o encontrado.');

      const selected = items[idx];
      if (tipo === 'saida' && quantidade > Number(selected.estoqueAtual)) {
        throw new Error('Quantidade de sa\u00edda maior que o estoque dispon\u00edvel.');
      }

      const now = new Date().toISOString();
      const novoEstoque = tipo === 'entrada' ? Number(selected.estoqueAtual) + quantidade : Number(selected.estoqueAtual) - quantidade;

      selected.estoqueAtual = novoEstoque;
      selected.ultimaMovimentacaoPor = getCurrentAuthUser();
      selected.ultimaMovimentacaoEm = now;
      items[idx] = selected;
      saveLocalList(ALMOX_ITEM_KEY, items);

      const movs = loadLocalList(ALMOX_MOV_KEY);
      movs.unshift({
        id: 'mov-' + Date.now(),
        itemId: selected.id,
        itemNome: selected.nome,
        tipo: tipo,
        quantidade: quantidade,
        motivo: motivo,
        usuario: getCurrentAuthUser(),
        dataHora: now
      });
      saveLocalList(ALMOX_MOV_KEY, movs.slice(0, 500));
      return selected;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    if (!user) throw new Error('Sess\u00e3o inv\u00e1lida para movimenta\u00e7\u00e3o.');

    const found = await supabase.from('almox_itens').select('*').eq('id', itemId).single();
    if (found.error || !found.data) throw new Error('Item n\u00e3o encontrado.');

    const current = Number(found.data.estoque_atual) || 0;
    if (tipo === 'saida' && quantidade > current) throw new Error('Quantidade de sa\u00edda maior que o estoque dispon\u00edvel.');

    const newStock = tipo === 'entrada' ? current + quantidade : current - quantidade;

    const updated = await supabase
      .from('almox_itens')
      .update({ estoque_atual: newStock, atualizado_por: user.email || user.id })
      .eq('id', itemId)
      .select('*')
      .single();

    if (updated.error) throw new Error(updated.error.message || 'Falha ao atualizar estoque.');

    const moveResult = await supabase.from('almox_movimentacoes').insert({
      item_id: itemId,
      tipo: tipo,
      quantidade: quantidade,
      motivo: motivo,
      saldo_resultante: newStock,
      criado_por: user.email || user.id
    });

    if (moveResult.error) throw new Error(moveResult.error.message || 'Falha ao registrar movimenta\u00e7\u00e3o.');

    await listAlmoxItems();
    return mapRowToAlmoxItem(updated.data);
  }

  async function deleteAlmoxItem(itemId) {
    const id = String(itemId || '').trim();
    if (!id) throw new Error('Item inv\u00e1lido para exclus\u00e3o.');

    if (!isSupabaseEnabled()) {
      const items = loadLocalList(ALMOX_ITEM_KEY);
      const selected = items.find(function (item) { return item.id === id; });
      if (!selected) throw new Error('Item n\u00e3o encontrado para exclus\u00e3o.');

      const remaining = items.filter(function (item) { return item.id !== id; });
      saveLocalList(ALMOX_ITEM_KEY, remaining);

      const del = loadLocalList(ALMOX_DEL_KEY);
      del.unshift({
        id: 'del-' + Date.now(),
        itemId: selected.id,
        itemNome: selected.nome,
        quantidadeNoMomento: Number(selected.estoqueAtual) || 0,
        unidadeMedida: selected.unidadeMedida || '',
        usuario: getCurrentAuthUser(),
        dataHora: new Date().toISOString()
      });
      saveLocalList(ALMOX_DEL_KEY, del.slice(0, 500));
      return true;
    }

    const supabase = getClient();
    const user = await getSessionUser();
    if (!user) throw new Error('Sess\u00e3o inv\u00e1lida para exclus\u00e3o.');

    const found = await supabase.from('almox_itens').select('*').eq('id', id).single();
    if (found.error || !found.data) throw new Error('Item n\u00e3o encontrado para exclus\u00e3o.');

    const delLog = await supabase.from('almox_exclusoes').insert({
      item_id: found.data.id,
      item_nome: found.data.nome,
      quantidade_no_momento: Number(found.data.estoque_atual) || 0,
      unidade_medida: found.data.unidade_medida,
      local_estoque: found.data.local_estoque,
      excluido_por: user.email || user.id
    });
    if (delLog.error) throw new Error(delLog.error.message || 'Falha ao registrar exclus\u00e3o.');

    const clearMoves = await supabase.from('almox_movimentacoes').delete().eq('item_id', id);
    if (clearMoves.error) throw new Error(clearMoves.error.message || 'Falha ao limpar movimenta\u00e7\u00f5es do item.');

    const deleted = await supabase.from('almox_itens').delete().eq('id', id);
    if (deleted.error) throw new Error(deleted.error.message || 'Falha ao excluir item.');

    await listAlmoxItems();
    return true;
  }

  async function listAlmoxMovements() {
    if (!isSupabaseEnabled()) return loadLocalList(ALMOX_MOV_KEY);

    const supabase = getClient();
    const result = await supabase
      .from('almox_movimentacoes')
      .select('id,item_id,tipo,quantidade,motivo,saldo_resultante,criado_por,criado_em,almox_itens(nome)')
      .order('criado_em', { ascending: false })
      .limit(200);

    if (result.error) throw new Error(result.error.message || 'Falha ao consultar movimenta\u00e7\u00f5es.');

    const list = (result.data || []).map(function (row) {
      return {
        id: row.id,
        itemId: row.item_id,
        itemNome: row.almox_itens && row.almox_itens.nome ? row.almox_itens.nome : '-',
        tipo: row.tipo,
        quantidade: Number(row.quantidade) || 0,
        motivo: row.motivo || '',
        usuario: row.criado_por || '-',
        dataHora: row.criado_em || ''
      };
    });

    saveLocalList(ALMOX_MOV_KEY, list);
    return list;
  }

  async function listAlmoxDeletes() {
    if (!isSupabaseEnabled()) return loadLocalList(ALMOX_DEL_KEY);

    const supabase = getClient();
    const result = await supabase.from('almox_exclusoes').select('*').order('excluido_em', { ascending: false }).limit(200);
    if (result.error) throw new Error(result.error.message || 'Falha ao consultar exclus\u00f5es.');

    const list = (result.data || []).map(function (row) {
      return {
        id: row.id,
        itemId: row.item_id,
        itemNome: row.item_nome,
        quantidadeNoMomento: Number(row.quantidade_no_momento) || 0,
        unidadeMedida: row.unidade_medida || '',
        usuario: row.excluido_por || '-',
        dataHora: row.excluido_em || ''
      };
    });

    saveLocalList(ALMOX_DEL_KEY, list);
    return list;
  }

  window.BackendAPI = {
    isSupabaseEnabled: isSupabaseEnabled,
    isCurrentUserSeniorAdmin: isCurrentUserSeniorAdmin,
    hasVerifiedSeniorAdminAccess: hasVerifiedSeniorAdminAccess,
    signIn: signIn,
    restoreSession: restoreSession,
    signOut: signOut,
    sendPasswordReset: sendPasswordReset,
    verifyCurrentPassword: verifyCurrentPassword,
    changePassword: changePassword,
    requestAccess: requestAccess,
    listPendingAccessRequests: listPendingAccessRequests,
    approveAccessRequest: approveAccessRequest,
    getCurrentAuthUser: getCurrentAuthUser,
    listSystemNotices: listSystemNotices,
    markSystemNoticeRead: markSystemNoticeRead,
    saveSystemNotice: saveSystemNotice,
    deleteSystemNotice: deleteSystemNotice,
    listAuditEvents: listAuditEvents,
    listProcessos: listProcessos,
    hasDuplicateProcesso: hasDuplicateProcesso,
    hasDuplicateProcessoForUpdate: hasDuplicateProcessoForUpdate,
    createProcesso: createProcesso,
    updateProcesso: updateProcesso,
    deleteProcesso: deleteProcesso,
    purgeLegacyDemoProcessos: purgeLegacyDemoProcessos,
    getProfile: getProfile,
    saveProfile: saveProfile,
    listAlmoxItems: listAlmoxItems,
    addAlmoxItem: addAlmoxItem,
    moveAlmoxItem: moveAlmoxItem,
    deleteAlmoxItem: deleteAlmoxItem,
    listAlmoxMovements: listAlmoxMovements,
    listAlmoxDeletes: listAlmoxDeletes
  };
})();


