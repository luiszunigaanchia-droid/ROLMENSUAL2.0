'use strict';

const RolDB = (() => {
  const DB_NAME = 'rolMensualPwaDB';
  const DB_VERSION = 1;
  const STORES = Object.freeze({
    employees: 'employees',
    assignments: 'assignments',
    audit: 'audit',
    settings: 'settings'
  });
  const LEGACY_KEYS = Object.freeze({
    roles: 'hsjd_roles_store_drag_v3_7',
    employees: 'hsjd_employees_list_v1',
    info: 'hsjd_employees_info_v1'
  });
  const MIGRATION_KEY = 'legacyMigrationV1';
  let dbPromise = null;

  function cleanText(value, max = 250) {
    return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  }

  function normalizeText(value) {
    return cleanText(value, 300).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  function employeeIdFromName(name) {
    return `emp-${fnv1a(normalizeText(name))}`;
  }

  function uid(prefix = 'id') {
    if (globalThis.crypto?.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function requestToPromise(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Error de IndexedDB.'));
    });
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORES.employees)) {
          const store = db.createObjectStore(STORES.employees, { keyPath: 'id' });
          store.createIndex('nameKey', 'nameKey', { unique: true });
          store.createIndex('active', 'active');
        }
        if (!db.objectStoreNames.contains(STORES.assignments)) {
          const store = db.createObjectStore(STORES.assignments, { keyPath: 'id' });
          store.createIndex('period', 'period');
          store.createIndex('employeeId', 'employeeId');
          store.createIndex('periodEmployee', ['period', 'employeeId'], { unique: true });
        }
        if (!db.objectStoreNames.contains(STORES.audit)) {
          const store = db.createObjectStore(STORES.audit, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
        if (!db.objectStoreNames.contains(STORES.settings)) {
          db.createObjectStore(STORES.settings, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      request.onerror = () => {
        dbPromise = null;
        reject(request.error || new Error('No se pudo abrir la base local.'));
      };
      request.onblocked = () => reject(new Error('La base local está bloqueada por otra pestaña.'));
    });
    return dbPromise;
  }

  async function runTransaction(storeNames, mode, worker) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, mode);
      const stores = Object.fromEntries(storeNames.map((name) => [name, tx.objectStore(name)]));
      let result;
      let callbackError = null;

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(callbackError || tx.error || new Error('Error durante la transacción local.'));
      tx.onabort = () => reject(callbackError || tx.error || new Error('La transacción fue cancelada.'));

      try {
        result = worker(stores, tx);
      } catch (error) {
        callbackError = error;
        tx.abort();
      }
    });
  }

  async function getAll(storeName) {
    const db = await openDB();
    return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).getAll());
  }

  async function getOne(storeName, key) {
    const db = await openDB();
    return requestToPromise(db.transaction(storeName, 'readonly').objectStore(storeName).get(key));
  }

  async function getByIndex(storeName, indexName, query) {
    const db = await openDB();
    const store = db.transaction(storeName, 'readonly').objectStore(storeName);
    return requestToPromise(store.index(indexName).getAll(query));
  }

  async function getSetting(key) {
    return (await getOne(STORES.settings, key))?.value;
  }

  function setSetting(key, value) {
    return runTransaction([STORES.settings], 'readwrite', (stores) => {
      stores.settings.put({ key, value });
      return value;
    });
  }

  function deleteSetting(key) {
    return runTransaction([STORES.settings], 'readwrite', (stores) => {
      stores.settings.delete(key);
      return true;
    });
  }

  function configSections() {
    return Array.isArray(window.ROL_CONFIG?.sections) ? window.ROL_CONFIG.sections : [];
  }

  function validPlacement(section, shift, fallbackSection = '') {
    const sections = configSections();
    const selected = sections.find((item) => item.name === section)
      || sections.find((item) => item.name === fallbackSection)
      || sections[0];
    const sectionName = selected?.name || '';
    const selectedShift = selected?.shifts?.includes(shift) ? shift : (selected?.shifts?.[0] || '');
    return { section: sectionName, shift: selectedShift };
  }

  function parseJSONStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function normalizeEmployee(input, existing = {}) {
    const name = cleanText(input?.name ?? existing.name, 140);
    const rawSection = cleanText(input?.baseSection ?? existing.baseSection, 100);
    const rawShift = cleanText(input?.baseShift ?? existing.baseShift, 100);
    const placement = rawSection ? validPlacement(rawSection, rawShift) : { section: '', shift: '' };
    return {
      id: cleanText(existing.id || input?.id || uid('emp'), 100),
      name,
      nameKey: normalizeText(name),
      role: cleanText(input?.role ?? existing.role ?? '', 30),
      baseSection: placement.section,
      baseShift: placement.shift,
      active: input?.active === undefined ? existing.active !== false : Boolean(input.active),
      createdAt: existing.createdAt || cleanText(input?.createdAt, 40) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function normalizeAssignment(input, employeesMap = new Map()) {
    const period = cleanText(input?.period, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) throw new Error(`Periodo inválido: ${period || 'vacío'}.`);
    const employeeId = cleanText(input?.employeeId, 100);
    const employee = employeesMap.get(employeeId);
    if (!employeeId) throw new Error('Existe una asignación sin colaborador.');
    const placement = validPlacement(
      cleanText(input?.section, 100),
      cleanText(input?.shift, 100),
      employee?.baseSection
    );
    return {
      id: cleanText(input?.id || uid('asg'), 120),
      period,
      employeeId,
      employeeNameSnapshot: cleanText(input?.employeeNameSnapshot || employee?.name || 'Colaborador', 140),
      section: placement.section,
      shift: placement.shift,
      note: cleanText(input?.note, 300),
      source: cleanText(input?.source || 'manual', 30),
      createdAt: cleanText(input?.createdAt, 40) || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function auditEntry(action, summary, details = null) {
    return {
      id: uid('audit'),
      action: cleanText(action, 60),
      summary: cleanText(summary, 400),
      details,
      createdAt: new Date().toISOString()
    };
  }

  function extractEmployeeEntry(raw) {
    if (typeof raw === 'string') return { name: cleanText(raw, 140), role: '', baseSection: '', baseShift: '' };
    if (raw && typeof raw === 'object' && raw.name) {
      return {
        name: cleanText(raw.name, 140),
        role: cleanText(raw.role || '', 30),
        baseSection: cleanText(raw.baseSection || '', 100),
        baseShift: cleanText(raw.baseShift || '', 100)
      };
    }
    return null;
  }

  async function ensureInitialData() {
    await openDB();

    const existingEmployees = await getAll(STORES.employees);
    const migrationDone = await getSetting(MIGRATION_KEY);

    if (migrationDone && existingEmployees.length > 0) return;

    if (existingEmployees.length > 0 && !migrationDone) {
      await setSetting(MIGRATION_KEY, { completedAt: new Date().toISOString(), source: 'existing-indexeddb' });
      return;
    }

    const defaults = Array.isArray(window.ROL_CONFIG?.defaultEmployees) ? window.ROL_CONFIG.defaultEmployees : [];
    const legacyEmployees = parseJSONStorage(LEGACY_KEYS.employees, null);
    const legacyInfo = parseJSONStorage(LEGACY_KEYS.info, {});
    const legacyRoles = parseJSONStorage(LEGACY_KEYS.roles, {});

    const hasLegacy = Array.isArray(legacyEmployees) && legacyEmployees.length > 0;
    const employeeSources = hasLegacy ? legacyEmployees : defaults;
    const parsed = [];
    const seen = new Set();

    for (const raw of employeeSources) {
      const entry = extractEmployeeEntry(raw);
      if (!entry || !entry.name) continue;
      const key = normalizeText(entry.name);
      if (seen.has(key)) continue;
      seen.add(key);
      parsed.push(entry);
    }

    if (legacyRoles && typeof legacyRoles === 'object') {
      Object.values(legacyRoles).forEach((rows) => {
        if (!Array.isArray(rows)) return;
        rows.forEach((row) => {
          const name = cleanText(row?.nombre, 140);
          const key = normalizeText(name);
          if (name && !seen.has(key)) {
            seen.add(key);
            parsed.push({ name, role: '', baseSection: '', baseShift: '' });
          }
        });
      });
    }

    const now = new Date().toISOString();
    const employees = parsed.map((entry) => {
      const info = legacyInfo?.[entry.name] || {};
      const hasLegacyPlacement = Boolean(cleanText(info.seccion_actual, 100));
      let placement;
      if (hasLegacyPlacement) {
        placement = validPlacement(cleanText(info.seccion_actual, 100), cleanText(info.turno_actual, 100));
      } else if (entry.baseSection) {
        placement = validPlacement(entry.baseSection, entry.baseShift);
      } else {
        placement = { section: '', shift: '' };
      }
      return {
        id: employeeIdFromName(entry.name),
        name: entry.name,
        nameKey: normalizeText(entry.name),
        role: entry.role || '',
        baseSection: placement.section,
        baseShift: placement.shift,
        active: true,
        createdAt: now,
        updatedAt: now
      };
    });
    const employeesMap = new Map(employees.map((item) => [item.id, item]));
    const nameToId = new Map(employees.map((item) => [normalizeText(item.name), item.id]));
    const assignments = [];

    if (legacyRoles && typeof legacyRoles === 'object') {
      Object.entries(legacyRoles).forEach(([period, rows]) => {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Array.isArray(rows)) return;
        const periodEmployees = new Set();
        rows.forEach((row, index) => {
          const name = cleanText(row?.nombre, 140);
          const employeeId = nameToId.get(normalizeText(name));
          if (!employeeId || periodEmployees.has(employeeId)) return;
          periodEmployees.add(employeeId);
          const employee = employeesMap.get(employeeId);
          const placement = validPlacement(cleanText(row?.sección, 100), cleanText(row?.subárea, 100), employee?.baseSection);
          assignments.push({
            id: `legacy-${period}-${employeeId}-${index}`,
            period,
            employeeId,
            employeeNameSnapshot: name || employee?.name || 'Colaborador',
            section: placement.section,
            shift: placement.shift,
            note: cleanText(row?.nota, 300),
            source: 'legacy-migration',
            createdAt: now,
            updatedAt: now
          });
        });
      });
    }

    await runTransaction(Object.values(STORES), 'readwrite', (stores) => {
      employees.forEach((employee) => stores.employees.put(employee));
      assignments.forEach((assignment) => stores.assignments.put(assignment));
      stores.audit.put(auditEntry(
        'migración',
        `Migración inicial: ${employees.length} colaboradores y ${assignments.length} asignaciones recuperadas.`,
        { legacyKeys: LEGACY_KEYS }
      ));
      stores.settings.put({ key: MIGRATION_KEY, value: { completedAt: now, source: assignments.length ? 'legacy-localstorage' : 'default-catalog' } });
    });
  }

  async function reseedFromConfig() {
    const defaults = Array.isArray(window.ROL_CONFIG?.defaultEmployees) ? window.ROL_CONFIG.defaultEmployees : [];
    if (!defaults.length) return 0;
    const existing = await getAll(STORES.employees);
    const existingByKey = new Map(existing.map((e) => [normalizeText(e.name), e]));
    const existingById = new Set(existing.map((e) => e.id));
    const now = new Date().toISOString();
    const toAdd = [];
    const toUpdate = [];
    const processedKeys = new Set();
    for (const raw of defaults) {
      const entry = extractEmployeeEntry(raw);
      if (!entry || !entry.name) continue;
      const key = normalizeText(entry.name);
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);
      const placement = entry.baseSection ? validPlacement(entry.baseSection, entry.baseShift) : { section: '', shift: '' };
      const existingEmp = existingByKey.get(key);
      if (existingEmp) {
        // Update role and baseSection if missing
        if ((!existingEmp.role && entry.role) || (!existingEmp.baseSection && placement.section)) {
          toUpdate.push({
            ...existingEmp,
            role: existingEmp.role || entry.role || '',
            baseSection: existingEmp.baseSection || placement.section,
            baseShift: existingEmp.baseShift || placement.shift,
            updatedAt: now
          });
        }
      } else {
        const newId = employeeIdFromName(entry.name);
        toAdd.push({
          id: newId,
          name: entry.name,
          nameKey: key,
          role: entry.role || '',
          baseSection: placement.section,
          baseShift: placement.shift,
          active: true,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    const totalChanges = toAdd.length + toUpdate.length;
    if (totalChanges) {
      await runTransaction([STORES.employees, STORES.audit], 'readwrite', (stores) => {
        toAdd.forEach((emp) => stores.employees.put(emp));
        toUpdate.forEach((emp) => stores.employees.put(emp));
        const parts = [];
        if (toAdd.length) parts.push(`${toAdd.length} añadidos`);
        if (toUpdate.length) parts.push(`${toUpdate.length} actualizados`);
        stores.audit.put(auditEntry('re-carga de catálogo', `Catálogo sincronizado con plantilla institucional: ${parts.join(', ')}.`));
      });
    }
    return totalChanges;
  }

  async function resetCatalog() {
    const defaults = Array.isArray(window.ROL_CONFIG?.defaultEmployees) ? window.ROL_CONFIG.defaultEmployees : [];
    if (!defaults.length) return 0;
    const now = new Date().toISOString();
    const processed = [];
    const seen = new Set();
    for (const raw of defaults) {
      const entry = extractEmployeeEntry(raw);
      if (!entry || !entry.name) continue;
      const key = normalizeText(entry.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const placement = entry.baseSection ? validPlacement(entry.baseSection, entry.baseShift) : { section: '', shift: '' };
      processed.push({
        id: employeeIdFromName(entry.name),
        name: entry.name,
        nameKey: key,
        role: entry.role || '',
        baseSection: placement.section,
        baseShift: placement.shift,
        active: true,
        createdAt: now,
        updatedAt: now
      });
    }
    await runTransaction([STORES.employees, STORES.audit, STORES.settings], 'readwrite', (stores) => {
      stores.employees.clear();
      processed.forEach((emp) => stores.employees.put(emp));
      stores.settings.put({ key: MIGRATION_KEY, value: { completedAt: now, source: 'catalog-reset' } });
      stores.audit.put(auditEntry('reseteo de catálogo', `Catálogo reinicializado con ${processed.length} colaboradores desde la plantilla institucional.`));
    });
    return processed.length;
  }

  async function listEmployees({ includeInactive = true } = {}) {
    const rows = await getAll(STORES.employees);
    return rows
      .filter((row) => includeInactive || row.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }

  async function listAssignments(period) {
    const rows = await getByIndex(STORES.assignments, 'period', period);
    return rows.sort((a, b) => a.section.localeCompare(b.section, 'es') || a.shift.localeCompare(b.shift, 'es') || a.employeeNameSnapshot.localeCompare(b.employeeNameSnapshot, 'es'));
  }

  async function listAudit(limit = 250) {
    const rows = await getAll(STORES.audit);
    return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async function saveEmployee(input) {
    const existing = input?.id ? await getOne(STORES.employees, input.id) : null;
    const employee = normalizeEmployee(input, existing || {});
    if (!employee.name) throw new Error('El nombre es obligatorio.');
    const all = await listEmployees();
    const duplicate = all.find((item) => item.nameKey === employee.nameKey && item.id !== employee.id);
    if (duplicate) throw new Error('Ya existe un colaborador con ese nombre.');
    const action = existing ? 'actualización de colaborador' : 'creación de colaborador';
    await runTransaction([STORES.employees, STORES.audit], 'readwrite', (stores) => {
      stores.employees.put(employee);
      stores.audit.put(auditEntry(action, `${existing ? 'Actualizado' : 'Creado'}: ${employee.name}.`, { employeeId: employee.id }));
    });
    return employee;
  }

  async function setEmployeeActive(employeeId, active) {
    const existing = await getOne(STORES.employees, employeeId);
    if (!existing) throw new Error('Colaborador no encontrado.');
    const employee = { ...existing, active: Boolean(active), updatedAt: new Date().toISOString() };
    await runTransaction([STORES.employees, STORES.audit], 'readwrite', (stores) => {
      stores.employees.put(employee);
      stores.audit.put(auditEntry(active ? 'reactivación' : 'archivo', `${active ? 'Reactivado' : 'Archivado'}: ${employee.name}.`, { employeeId }));
    });
    return employee;
  }

  async function saveAssignment(input) {
    const employees = await listEmployees();
    const employeesMap = new Map(employees.map((item) => [item.id, item]));
    const employee = employeesMap.get(input.employeeId);
    if (!employee || employee.active === false) throw new Error('El colaborador no está activo.');
    const assignment = normalizeAssignment({ ...input, employeeNameSnapshot: input.employeeNameSnapshot || employee.name }, employeesMap);
    const current = await listAssignments(assignment.period);
    const duplicate = current.find((item) => item.employeeId === assignment.employeeId && item.id !== assignment.id);
    if (duplicate) throw new Error('El colaborador ya tiene una asignación en este mes.');
    const existing = input?.id ? await getOne(STORES.assignments, input.id) : null;
    await runTransaction([STORES.assignments, STORES.audit], 'readwrite', (stores) => {
      stores.assignments.put(assignment);
      stores.audit.put(auditEntry(existing ? 'edición de asignación' : 'asignación', `${employee.name}: ${assignment.section} / ${assignment.shift} (${assignment.period}).`, { assignmentId: assignment.id, employeeId: employee.id }));
    });
    return assignment;
  }

  async function removeAssignment(assignmentId) {
    const existing = await getOne(STORES.assignments, assignmentId);
    if (!existing) return false;
    await runTransaction([STORES.assignments, STORES.audit], 'readwrite', (stores) => {
      stores.assignments.delete(assignmentId);
      stores.audit.put(auditEntry('eliminación de asignación', `${existing.employeeNameSnapshot}: removido de ${existing.period}.`, { assignmentId }));
    });
    return true;
  }

  async function replacePeriod(period, assignments, action = 'reemplazo de rol', undoSnapshot = null) {
    const existing = await listAssignments(period);
    const employees = await listEmployees();
    const employeesMap = new Map(employees.map((item) => [item.id, item]));
    const normalized = assignments.map((item) => normalizeAssignment({ ...item, period }, employeesMap));
    const seenEmployees = new Set();
    normalized.forEach((item) => {
      if (seenEmployees.has(item.employeeId)) throw new Error('El rol generado contiene colaboradores duplicados.');
      seenEmployees.add(item.employeeId);
    });
    await runTransaction([STORES.assignments, STORES.audit, STORES.settings], 'readwrite', (stores) => {
      existing.forEach((item) => stores.assignments.delete(item.id));
      normalized.forEach((item) => stores.assignments.put(item));
      if (undoSnapshot) stores.settings.put({ key: `undo:${period}`, value: undoSnapshot });
      stores.audit.put(auditEntry(action, `${period}: ${normalized.length} asignaciones guardadas.`, { previousCount: existing.length, newCount: normalized.length }));
    });
    return normalized;
  }

  async function exportBackup() {
    return {
      schema: 'hsjd-roles-backup',
      version: 2,
      appVersion: window.ROL_CONFIG?.appVersion || '3.0.0',
      exportedAt: new Date().toISOString(),
      employees: await listEmployees(),
      assignments: await getAll(STORES.assignments),
      audit: await getAll(STORES.audit),
      settings: (await getAll(STORES.settings)).filter((item) => !String(item.key).startsWith('undo:'))
    };
  }

  function convertLegacyBackup(data) {
    const legacyKeys = Object.keys(data || {});
    const plainLegacyStore = legacyKeys.length > 0 && legacyKeys.every((key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key));
    const legacyAssignments = data?.asignaciones && typeof data.asignaciones === 'object'
      ? data.asignaciones
      : (plainLegacyStore ? data : {});
    const suppliedEmployees = Array.isArray(data?.empleados) ? data.empleados : [];
    const legacyInfo = data?.empleados_info && typeof data.empleados_info === 'object' ? data.empleados_info : {};
    const names = [];
    const seen = new Set();
    const addName = (raw) => {
      const name = cleanText(raw, 140);
      const key = normalizeText(name);
      if (name && !seen.has(key)) { seen.add(key); names.push(name); }
    };
    suppliedEmployees.forEach(addName);
    Object.values(legacyAssignments).forEach((rows) => {
      if (Array.isArray(rows)) rows.forEach((row) => addName(row?.nombre));
    });
    if (!names.length) (window.ROL_CONFIG?.defaultEmployees || []).forEach(addName);
    const now = new Date().toISOString();
    const employees = names.map((name) => {
      const info = legacyInfo?.[name] || {};
      const rawSection = cleanText(info.seccion_actual, 100);
      const placement = rawSection ? validPlacement(rawSection, cleanText(info.turno_actual, 100)) : { section: '', shift: '' };
      return {
        id: employeeIdFromName(name), name, nameKey: normalizeText(name),
        baseSection: placement.section, baseShift: placement.shift, active: true,
        createdAt: now, updatedAt: now
      };
    });
    const nameToEmployee = new Map(employees.map((item) => [normalizeText(item.name), item]));
    const assignments = [];
    Object.entries(legacyAssignments).forEach(([period, rows]) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period) || !Array.isArray(rows)) return;
      const used = new Set();
      rows.forEach((row, index) => {
        const employee = nameToEmployee.get(normalizeText(row?.nombre));
        if (!employee || used.has(employee.id)) return;
        used.add(employee.id);
        const placement = validPlacement(cleanText(row?.sección, 100), cleanText(row?.subárea, 100), employee.baseSection);
        assignments.push({
          id: `legacy-import-${period}-${employee.id}-${index}`,
          period, employeeId: employee.id, employeeNameSnapshot: cleanText(row?.nombre, 140) || employee.name,
          section: placement.section, shift: placement.shift, note: cleanText(row?.nota, 300),
          source: 'legacy-backup-import', createdAt: now, updatedAt: now
        });
      });
    });
    return {
      schema: 'hsjd-roles-backup', version: 2, appVersion: 'legacy-converted', exportedAt: now,
      employees, assignments, audit: [], settings: []
    };
  }

  function validateBackup(data) {
    if (!data || typeof data !== 'object') throw new Error('El respaldo no contiene un objeto válido.');
    const backupKeys = Object.keys(data);
    const plainLegacyStore = backupKeys.length > 0 && backupKeys.every((key) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key));
    const looksLegacy = data.version === 'hsjd_roles_backup_v1' || data.asignaciones || plainLegacyStore;
    if (looksLegacy && data.schema !== 'hsjd-roles-backup') data = convertLegacyBackup(data);
    if (data.schema !== 'hsjd-roles-backup' || Number(data.version) !== 2) throw new Error('Formato o versión de respaldo no compatible.');
    if (!Array.isArray(data.employees) || !Array.isArray(data.assignments)) throw new Error('El respaldo está incompleto.');
    if (data.employees.length > 5000 || data.assignments.length > 250000) throw new Error('El respaldo excede los límites permitidos.');

    const employeeIds = new Set();
    const nameKeys = new Set();
    const employees = data.employees.map((item) => {
      const employee = normalizeEmployee(item, item);
      if (!employee.id || !employee.name) throw new Error('Existe un colaborador inválido.');
      if (employeeIds.has(employee.id) || nameKeys.has(employee.nameKey)) throw new Error('El respaldo contiene colaboradores duplicados.');
      employeeIds.add(employee.id);
      nameKeys.add(employee.nameKey);
      return employee;
    });
    const employeesMap = new Map(employees.map((item) => [item.id, item]));
    const assignmentIds = new Set();
    const periodEmployees = new Set();
    const assignments = data.assignments.map((item) => {
      if (!employeeIds.has(cleanText(item?.employeeId, 100))) throw new Error('Existe una asignación asociada a un colaborador inexistente.');
      const assignment = normalizeAssignment(item, employeesMap);
      const periodKey = `${assignment.period}|${assignment.employeeId}`;
      if (assignmentIds.has(assignment.id) || periodEmployees.has(periodKey)) throw new Error('El respaldo contiene asignaciones duplicadas.');
      assignmentIds.add(assignment.id);
      periodEmployees.add(periodKey);
      return assignment;
    });
    const audit = Array.isArray(data.audit) ? data.audit.slice(0, 100000).map((item) => ({
      id: cleanText(item?.id || uid('audit'), 120),
      action: cleanText(item?.action, 60),
      summary: cleanText(item?.summary, 400),
      details: item?.details ?? null,
      createdAt: cleanText(item?.createdAt, 40) || new Date().toISOString()
    })) : [];
    const settings = Array.isArray(data.settings) ? data.settings
      .filter((item) => item && typeof item.key === 'string' && !item.key.startsWith('undo:'))
      .slice(0, 500)
      .map((item) => ({ key: cleanText(item.key, 120), value: item.value })) : [];
    return { employees, assignments, audit, settings };
  }

  async function importBackup(data) {
    const normalized = validateBackup(data);
    await runTransaction(Object.values(STORES), 'readwrite', (stores) => {
      Object.values(stores).forEach((store) => store.clear());
      normalized.employees.forEach((item) => stores.employees.put(item));
      normalized.assignments.forEach((item) => stores.assignments.put(item));
      normalized.audit.forEach((item) => stores.audit.put(item));
      normalized.settings.forEach((item) => stores.settings.put(item));
      stores.settings.put({ key: MIGRATION_KEY, value: { completedAt: new Date().toISOString(), source: 'backup-import' } });
      stores.audit.put(auditEntry('restauración', `Respaldo restaurado con ${normalized.employees.length} colaboradores y ${normalized.assignments.length} asignaciones.`));
    });
    return normalized;
  }

  return Object.freeze({
    openDB,
    ensureInitialData,
    reseedFromConfig,
    resetCatalog,
    listEmployees,
    listAssignments,
    listAudit,
    getSetting,
    setSetting,
    deleteSetting,
    saveEmployee,
    setEmployeeActive,
    saveAssignment,
    removeAssignment,
    replacePeriod,
    exportBackup,
    importBackup,
    uid,
    cleanText,
    normalizeText
  });
})();

window.RolDB = RolDB;
