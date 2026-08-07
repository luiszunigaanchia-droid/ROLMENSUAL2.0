'use strict';

(() => {
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const state = {
    employees: [],
    assignments: [],
    period: '',
    employeeSearch: '',
    manageSearch: '',
    installPrompt: null,
    selectedEmployeeId: null,
    channel: 'BroadcastChannel' in window ? new BroadcastChannel('rolmensualpwa-sync-v1') : null
  };

  const $ = (id) => document.getElementById(id);
  const sectionConfig = () => window.ROL_CONFIG?.sections || [];
  const activeEmployees = () => state.employees.filter((employee) => employee.active !== false);
  const formatPeriod = (period) => {
    const match = /^(\d{4})-(\d{2})$/.exec(period || '');
    return match ? `${MONTHS[Number(match[2]) - 1]} ${match[1]}` : period;
  };
  const norm = (value) => RolDB.normalizeText(value);

  function toast(message, type = 'info') {
    const element = $('toast');
    element.textContent = String(message || '');
    element.className = `toast ${type}`;
    element.classList.remove('hidden');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.add('hidden'), 3800);
  }

  function notifyChange() {
    state.channel?.postMessage({ type: 'data-changed', at: Date.now() });
  }

  function randomInt(max) {
    if (max <= 1) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    do crypto.getRandomValues(buffer); while (buffer[0] >= limit);
    return buffer[0] % max;
  }

  function shuffled(values) {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function getSection(name) {
    return sectionConfig().find((section) => section.name === name) || sectionConfig()[0];
  }

  function populateSectionSelect(select, selected = '') {
    select.replaceChildren();
    sectionConfig().forEach((section) => {
      const option = document.createElement('option');
      option.value = section.name;
      option.textContent = section.name;
      select.appendChild(option);
    });
    if (sectionConfig().some((section) => section.name === selected)) select.value = selected;
  }

  function populateShiftSelect(sectionName, select, selected = '') {
    select.replaceChildren();
    const section = getSection(sectionName);
    (section?.shifts || []).forEach((shift) => {
      const option = document.createElement('option');
      option.value = shift;
      option.textContent = shift;
      select.appendChild(option);
    });
    if (section?.shifts?.includes(selected)) select.value = selected;
  }

  function setupPeriodSelectors() {
    const now = new Date();
    const yearSelect = $('yearSelect');
    const monthSelect = $('monthSelect');
    const currentYear = now.getFullYear();
    yearSelect.replaceChildren();
    for (let year = currentYear - 7; year <= currentYear + 10; year += 1) {
      const option = document.createElement('option');
      option.value = String(year);
      option.textContent = String(year);
      yearSelect.appendChild(option);
    }
    monthSelect.replaceChildren();
    MONTHS.forEach((month, index) => {
      const option = document.createElement('option');
      option.value = String(index + 1);
      option.textContent = month;
      monthSelect.appendChild(option);
    });
    yearSelect.value = String(currentYear);
    monthSelect.value = String(now.getMonth() + 1);
    updatePeriodFromSelectors();
  }

  function updatePeriodFromSelectors() {
    state.period = `${$('yearSelect').value}-${String($('monthSelect').value).padStart(2, '0')}`;
  }

  async function refresh() {
    updatePeriodFromSelectors();
    [state.employees, state.assignments] = await Promise.all([
      RolDB.listEmployees(),
      RolDB.listAssignments(state.period)
    ]);
    renderAll();
    await updateUndoButton();
  }

  function renderAll() {
    renderMetrics();
    renderAvailableEmployees();
    renderBoard();
    $('periodTitle').textContent = formatPeriod(state.period);
    $('periodSubtitle').textContent = `${state.assignments.length} asignación${state.assignments.length === 1 ? '' : 'es'} registrada${state.assignments.length === 1 ? '' : 's'}`;
  }

  function assignmentCounts() {
    const counts = new Map();
    state.assignments.forEach((assignment) => {
      const key = `${assignment.section}|${assignment.shift}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function renderMetrics() {
    const active = activeEmployees();
    const assignedIds = new Set(state.assignments.map((item) => item.employeeId));
    const counts = assignmentCounts();
    let totalQuota = 0;
    let covered = 0;
    let overfill = 0;
    sectionConfig().forEach((section) => {
      section.shifts.forEach((shift) => {
        const quota = section.slots?.[shift]?.length || 0;
        const count = counts.get(`${section.name}|${shift}`) || 0;
        totalQuota += quota;
        covered += Math.min(count, quota);
        overfill += Math.max(0, count - quota);
      });
    });
    const coverage = totalQuota ? Math.round((covered / totalQuota) * 100) : 0;
    $('metricEmployees').textContent = String(active.length);
    $('metricAssigned').textContent = String(state.assignments.length);
    $('metricAvailable').textContent = String(active.filter((item) => !assignedIds.has(item.id)).length);
    $('metricCoverage').textContent = `${coverage}%`;
    $('coverageFill').style.width = `${Math.min(coverage, 100)}%`;
    $('metricOverfill').textContent = String(overfill);
  }

  function availableEmployees() {
    const assignedIds = new Set(state.assignments.map((item) => item.employeeId));
    const query = norm(state.employeeSearch);
    return activeEmployees().filter((employee) => {
      if (assignedIds.has(employee.id)) return false;
      if (!query) return true;
      return [employee.name, employee.baseSection, employee.baseShift].some((value) => norm(value).includes(query));
    });
  }

  function renderAvailableEmployees() {
    const container = $('availableEmployees');
    container.replaceChildren();
    const employees = availableEmployees();
    $('availableCount').textContent = String(employees.length);
    if (!employees.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = state.employeeSearch ? 'No hay coincidencias.' : 'Todo el personal activo está asignado.';
      container.appendChild(empty);
      return;
    }
    employees.forEach((employee) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'person-card';
      button.draggable = true;
      button.dataset.employeeId = employee.id;

      const main = document.createElement('span');
      main.className = 'person-main';
      const name = document.createElement('span');
      name.className = 'person-name';
      name.textContent = employee.name;
      const base = document.createElement('span');
      base.className = 'person-base';
      base.textContent = employee.baseSection ? `${employee.baseSection} · ${employee.baseShift || 'Sin turno base'}` : 'Sin asignación base';
      main.append(name, base);
      const arrow = document.createElement('span');
      arrow.className = 'person-arrow';
      arrow.textContent = '→';
      button.append(main, arrow);
      button.addEventListener('click', () => openAssignmentDialog(employee.id));
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', employee.id);
        event.dataTransfer.effectAllowed = 'move';
      });
      container.appendChild(button);
    });
  }

  function renderBoard() {
    const board = $('board');
    board.replaceChildren();
    const grouped = new Map();
    state.assignments.forEach((assignment) => {
      const key = `${assignment.section}|${assignment.shift}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(assignment);
    });

    sectionConfig().forEach((section) => {
      const card = document.createElement('article');
      card.className = 'section-card';
      const header = document.createElement('header');
      header.className = 'section-header';
      const color = document.createElement('span');
      color.className = 'section-color';
      color.style.backgroundColor = section.color;
      const title = document.createElement('h3');
      title.textContent = section.name;
      header.append(color, title);
      const shifts = document.createElement('div');
      shifts.className = 'shift-list';

      section.shifts.forEach((shift) => {
        const rows = grouped.get(`${section.name}|${shift}`) || [];
        const quotaValue = section.slots?.[shift]?.length || 0;
        const block = document.createElement('section');
        block.className = 'shift-block';
        const shiftHead = document.createElement('div');
        shiftHead.className = 'shift-head';
        const shiftName = document.createElement('span');
        shiftName.className = 'shift-name';
        shiftName.textContent = shift;
        const quota = document.createElement('span');
        quota.className = `quota ${rows.length === quotaValue ? 'complete' : rows.length > quotaValue ? 'over' : ''}`.trim();
        quota.textContent = `${rows.length}/${quotaValue}`;
        shiftHead.append(shiftName, quota);

        const dropZone = document.createElement('div');
        dropZone.className = 'drop-zone';
        dropZone.dataset.section = section.name;
        dropZone.dataset.shift = shift;
        dropZone.addEventListener('dragover', (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          dropZone.classList.add('drag-over');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
        dropZone.addEventListener('drop', (event) => {
          event.preventDefault();
          dropZone.classList.remove('drag-over');
          const employeeId = event.dataTransfer.getData('text/plain');
          if (employeeId) openAssignmentDialog(employeeId, '', section.name, shift);
        });

        const list = document.createElement('div');
        list.className = 'assignment-list';
        rows.sort((a, b) => a.employeeNameSnapshot.localeCompare(b.employeeNameSnapshot, 'es', { sensitivity: 'base' }));
        rows.forEach((assignment) => list.appendChild(createAssignmentRow(assignment)));
        if (!rows.length) {
          const empty = document.createElement('div');
          empty.className = 'empty-slot';
          empty.textContent = 'Arrastre o seleccione personal';
          list.appendChild(empty);
        }
        dropZone.appendChild(list);
        block.append(shiftHead, dropZone);
        shifts.appendChild(block);
      });
      card.append(header, shifts);
      board.appendChild(card);
    });
  }

  function createAssignmentRow(assignment) {
    const row = document.createElement('div');
    row.className = 'assignment-row';
    const text = document.createElement('div');
    const name = document.createElement('span');
    name.className = 'assignment-name';
    name.textContent = assignment.employeeNameSnapshot;
    text.appendChild(name);
    if (assignment.note) {
      const note = document.createElement('span');
      note.className = 'assignment-note';
      note.textContent = assignment.note;
      text.appendChild(note);
    }
    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'icon-button';
    edit.title = 'Editar asignación';
    edit.setAttribute('aria-label', `Editar asignación de ${assignment.employeeNameSnapshot}`);
    edit.textContent = '✎';
    edit.addEventListener('click', () => openAssignmentDialog(assignment.employeeId, assignment.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon-button danger';
    remove.title = 'Quitar del mes';
    remove.setAttribute('aria-label', `Quitar a ${assignment.employeeNameSnapshot}`);
    remove.textContent = '×';
    remove.addEventListener('click', async () => {
      if (!confirm(`¿Quitar a “${assignment.employeeNameSnapshot}” del rol de ${formatPeriod(state.period)}?`)) return;
      await RolDB.removeAssignment(assignment.id);
      notifyChange();
      await refresh();
      toast('Asignación eliminada.', 'success');
    });
    actions.append(edit, remove);
    row.append(text, actions);
    return row;
  }

  function openAssignmentDialog(employeeId, assignmentId = '', section = '', shift = '') {
    const employee = state.employees.find((item) => item.id === employeeId);
    const assignment = assignmentId ? state.assignments.find((item) => item.id === assignmentId) : null;
    if (!employee) return toast('Colaborador no encontrado.', 'error');
    $('assignmentId').value = assignment?.id || '';
    $('assignmentEmployeeId').value = employee.id;
    $('assignmentEmployeeName').textContent = assignment?.employeeNameSnapshot || employee.name;
    $('assignmentTitle').textContent = assignment ? 'Editar asignación' : 'Asignar colaborador';
    const initialSection = assignment?.section || section || employee.baseSection || sectionConfig()[0]?.name || '';
    populateSectionSelect($('assignmentSection'), initialSection);
    const initialShift = assignment?.shift || shift || employee.baseShift || '';
    populateShiftSelect($('assignmentSection').value, $('assignmentShift'), initialShift);
    $('assignmentNote').value = assignment?.note || '';
    $('assignmentDialog').showModal();
  }

  async function saveAssignment() {
    const employee = state.employees.find((item) => item.id === $('assignmentEmployeeId').value);
    if (!employee) return toast('Colaborador no encontrado.', 'error');
    try {
      await RolDB.saveAssignment({
        id: $('assignmentId').value || undefined,
        period: state.period,
        employeeId: employee.id,
        employeeNameSnapshot: $('assignmentId').value ? $('assignmentEmployeeName').textContent : employee.name,
        section: $('assignmentSection').value,
        shift: $('assignmentShift').value,
        note: $('assignmentNote').value,
        source: $('assignmentId').value ? 'manual-edit' : 'manual'
      });
      $('assignmentDialog').close();
      notifyChange();
      await refresh();
      toast('Asignación guardada.', 'success');
    } catch (error) {
      toast(error.message || 'No se pudo guardar la asignación.', 'error');
    }
  }

  function resetEmployeeForm() {
    $('employeeId').value = '';
    $('employeeName').value = '';
    $('employeeActive').checked = true;
    populateSectionSelect($('employeeBaseSection'));
    populateShiftSelect($('employeeBaseSection').value, $('employeeBaseShift'));
    $('employeeFormTitle').textContent = 'Nuevo colaborador';
  }

  function openEmployeeManager() {
    resetEmployeeForm();
    renderEmployeeCatalog();
    $('employeeDialog').showModal();
  }

  function renderEmployeeCatalog() {
    const container = $('employeeCatalog');
    container.replaceChildren();
    const query = norm(state.manageSearch);
    const rows = state.employees.filter((employee) => !query || [employee.name, employee.baseSection, employee.baseShift].some((value) => norm(value).includes(query)));
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No se encontraron colaboradores.';
      container.appendChild(empty);
      return;
    }
    rows.forEach((employee) => {
      const row = document.createElement('div');
      row.className = `catalog-row ${employee.active === false ? 'inactive' : ''}`.trim();
      const main = document.createElement('div');
      const name = document.createElement('span');
      name.className = 'catalog-name';
      name.textContent = employee.name;
      const meta = document.createElement('span');
      meta.className = 'catalog-meta';
      meta.textContent = `${employee.baseSection || 'Sin sección base'} · ${employee.baseShift || 'Sin turno base'}${employee.active === false ? ' · Archivado' : ''}`;
      main.append(name, meta);
      const actions = document.createElement('div');
      actions.className = 'row-actions';
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'btn secondary small';
      edit.textContent = 'Editar';
      edit.addEventListener('click', () => editEmployee(employee));
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = `btn ${employee.active === false ? 'success' : 'danger'} small`;
      toggle.textContent = employee.active === false ? 'Reactivar' : 'Archivar';
      toggle.addEventListener('click', async () => {
        const action = employee.active === false ? 'reactivar' : 'archivar';
        if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a “${employee.name}”? Los roles históricos se conservarán.`)) return;
        await RolDB.setEmployeeActive(employee.id, employee.active === false);
        notifyChange();
        await refresh();
        renderEmployeeCatalog();
        toast(`Colaborador ${employee.active === false ? 'reactivado' : 'archivado'}.`, 'success');
      });
      actions.append(edit, toggle);
      row.append(main, actions);
      container.appendChild(row);
    });
  }

  function editEmployee(employee) {
    $('employeeId').value = employee.id;
    $('employeeName').value = employee.name;
    $('employeeActive').checked = employee.active !== false;
    populateSectionSelect($('employeeBaseSection'), employee.baseSection);
    populateShiftSelect($('employeeBaseSection').value, $('employeeBaseShift'), employee.baseShift);
    $('employeeFormTitle').textContent = `Editar: ${employee.name}`;
    $('employeeName').focus();
  }

  async function saveEmployee() {
    try {
      await RolDB.saveEmployee({
        id: $('employeeId').value || undefined,
        name: $('employeeName').value,
        baseSection: $('employeeBaseSection').value,
        baseShift: $('employeeBaseShift').value,
        active: $('employeeActive').checked
      });
      notifyChange();
      await refresh();
      resetEmployeeForm();
      renderEmployeeCatalog();
      toast('Ficha de personal guardada.', 'success');
    } catch (error) {
      toast(error.message || 'No se pudo guardar el colaborador.', 'error');
    }
  }

  function buildQuotaSlots() {
    const slots = [];
    sectionConfig().forEach((section) => {
      section.shifts.forEach((shift) => {
        const slotDefs = section.slots?.[shift] || [];
        slotDefs.forEach((role, idx) => {
          slots.push({ section: section.name, shift, role, slotIndex: idx + 1 });
        });
      });
    });
    return slots;
  }

  function takePreferredSlot(slots, employee, preferred = null) {
    const preferences = [];
    if (preferred?.section && preferred?.shift) preferences.push((slot) => slot.section === preferred.section && slot.shift === preferred.shift);
    if (preferred?.section) preferences.push((slot) => slot.section === preferred.section);
    if (employee.baseSection && employee.baseShift) preferences.push((slot) => slot.section === employee.baseSection && slot.shift === employee.baseShift);
    if (employee.baseSection) preferences.push((slot) => slot.section === employee.baseSection);
    preferences.push(() => true);
    for (const matcher of preferences) {
      const index = slots.findIndex(matcher);
      if (index >= 0) return slots.splice(index, 1)[0];
    }
    return null;
  }

  async function autoGenerate() {
    const active = activeEmployees();
    if (!active.length) return toast('No hay personal activo para generar el rol.', 'error');
    const currentWarning = state.assignments.length ? ` El mes actual contiene ${state.assignments.length} asignaciones y será reemplazado.` : '';
    if (!confirm(`Se generará automáticamente el rol de ${formatPeriod(state.period)} asignando al personal a su sección base según la plantilla institucional.${currentWarning}\n\n¿Continuar?`)) return;

    // Matriz de Afinidad de Secciones (Donantes Preferidos)
    const SECTION_AFFINITY = {
      "Banco de Sangre": ["Microbiología", "Emergencias", "Inmunología"],
      "Química Clínica": ["Banco de Sangre", "Biología Molecular"],
      "Emergencias": {
        "1pm-10pm": ["Unidad Preanalítica", "Inmunología"],
        "10pm-7am": ["Banco de Sangre", "Microbiología", "Inmunología"],
        "default": ["Banco de Sangre", "Microbiología", "Inmunología", "Unidad Preanalítica"]
      },
      "Hematología": ["Inmunología", "Microbiología"],
      "Microbiología": ["Banco de Sangre", "Biología Molecular"]
    };

    function getAffinity(targetSection, targetShift) {
      const entry = SECTION_AFFINITY[targetSection];
      if (!entry) return [];
      if (Array.isArray(entry)) return entry;
      return entry[targetShift] || entry["default"] || [];
    }

    const unassigned = [...active];
    const generated = [];
    const missingSlots = [];
    let assignedCount = 0;
    
    // Paso 1: Asignar a su sección base
    sectionConfig().forEach((section) => {
      section.shifts.forEach((shift) => {
        const slotDefs = section.slots?.[shift] || [];
        slotDefs.forEach((requiredRole) => {
          let empIndex = unassigned.findIndex(e => e.baseSection === section.name && e.role === requiredRole && e.baseShift === shift);
          if (empIndex < 0) {
            empIndex = unassigned.findIndex(e => e.baseSection === section.name && e.role === requiredRole);
          }
          if (empIndex < 0 && (requiredRole.includes('DPL') || requiredRole.includes('T1') || requiredRole.includes('T2'))) {
             empIndex = unassigned.findIndex(e => e.baseSection === section.name && (e.role === 'DPL' || e.role === 'T1' || e.role === 'T2'));
          }

          if (empIndex >= 0) {
            const employee = unassigned.splice(empIndex, 1)[0];
            generated.push({
              id: RolDB.uid('asg'), period: state.period, employeeId: employee.id, employeeNameSnapshot: employee.name,
              section: section.name, shift: shift, note: '', source: 'auto-generate'
            });
            assignedCount++;
          } else {
            // Guardar para el paso 2
            missingSlots.push({ section: section.name, shift, requiredRole });
          }
        });
      });
    });

    // Paso 2: Rotar empleados sobrantes a espacios vacíos en otras secciones
    missingSlots.forEach(slot => {
      const affinityList = getAffinity(slot.section, slot.shift);

      const findCandidate = (roleCheck) => {
        // 1. Intentar encontrar alguien afín
        let idx = unassigned.findIndex(e => affinityList.includes(e.baseSection) && roleCheck(e));
        // 2. Si no, buscar en el resto
        if (idx < 0) {
          idx = unassigned.findIndex(e => roleCheck(e));
        }
        return idx;
      };

      let empIndex = findCandidate(e => e.role === slot.requiredRole);
      
      if (empIndex < 0 && (slot.requiredRole.includes('DPL') || slot.requiredRole.includes('T1') || slot.requiredRole.includes('T2'))) {
         empIndex = findCandidate(e => e.role === 'DPL' || e.role === 'T1' || e.role === 'T2');
         
         // Regla extraída del rol Julio 2025: Los MQC sobrantes pueden cubrir campos técnicos (D/T) si ya no hay técnicos.
         if (empIndex < 0) {
             empIndex = findCandidate(e => e.role === 'MQC');
         }
      }
      
      if (empIndex >= 0) {
        const employee = unassigned.splice(empIndex, 1)[0];
        const isMqcCoveringTech = employee.role === 'MQC' && (slot.requiredRole.includes('DPL') || slot.requiredRole.includes('T1') || slot.requiredRole.includes('T2'));
        const finalNote = isMqcCoveringTech ? 'Rotación (MQC cubre D/T)' : 'Rotación';

        generated.push({
          id: RolDB.uid('asg'), period: state.period, employeeId: employee.id, employeeNameSnapshot: employee.name,
          section: slot.section, shift: slot.shift, note: finalNote, source: 'auto-generate-rotation'
        });
        assignedCount++;
      }
    });

    const undoSnapshot = state.assignments.map((item) => ({ ...item }));
    await RolDB.replacePeriod(state.period, generated, 'auto-generación', undoSnapshot);
    notifyChange();
    await refresh();
    toast(`Rol autogenerado: ${assignedCount} colaboradores asignados a su base.`, 'success');
  }

  async function updateUndoButton() {
    const snapshot = await RolDB.getSetting(`undo:${state.period}`);
    $('undoGenerateBtn').classList.toggle('hidden', !Array.isArray(snapshot));
  }

  async function undoGeneration() {
    const snapshot = await RolDB.getSetting(`undo:${state.period}`);
    if (!Array.isArray(snapshot)) return toast('No hay una generación para deshacer.', 'error');
    if (!confirm(`¿Restaurar las ${snapshot.length} asignaciones anteriores de ${formatPeriod(state.period)}?`)) return;
    await RolDB.replacePeriod(state.period, snapshot, 'deshacer auto-generación');
    await RolDB.deleteSetting(`undo:${state.period}`);
    notifyChange();
    await refresh();
    toast('Se restauró el rol anterior.', 'success');
  }

  async function clearMonth() {
    if (!state.assignments.length) return toast('El mes no tiene asignaciones.', 'error');
    if (!confirm(`¿Eliminar las ${state.assignments.length} asignaciones de ${formatPeriod(state.period)}? Esta acción quedará registrada.`)) return;
    await RolDB.replacePeriod(state.period, [], 'limpieza de mes', state.assignments.map((item) => ({ ...item })));
    notifyChange();
    await refresh();
    toast('Mes limpiado. Puede usar "Deshacer generación" para recuperarlo.', 'success');
  }

  async function reloadCatalog() {
    if (!confirm('Se eliminará el catálogo actual de personal y se recargará desde la plantilla institucional predeterminada.\n\nLas asignaciones del mes NO se eliminarán.\n\n¿Continuar?')) return;
    const count = await RolDB.resetCatalog();
    notifyChange();
    await refresh();
    toast(`Catálogo reinicializado con ${count} colaboradores.`, 'success');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportBackup() {
    const data = await RolDB.exportBackup();
    const date = new Date().toLocaleDateString('en-CA');
    downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `roles-hsjd-respaldo-${date}.json`);
    await RolDB.setSetting('lastBackup', data.exportedAt);
    updateStorageNotice();
    toast('Respaldo JSON generado.', 'success');
  }

  async function importBackup(file) {
    if (file.size > 50 * 1024 * 1024) return toast('El archivo excede 50 MB.', 'error');
    try {
      const data = JSON.parse(await file.text());
      if (!confirm('La importación reemplazará personal, asignaciones, auditoría y configuración local. Exporte primero un respaldo del estado actual.\n\n¿Continuar?')) return;
      await RolDB.importBackup(data);
      notifyChange();
      await refresh();
      toast('Respaldo restaurado.', 'success');
    } catch (error) {
      toast(error.message || 'El archivo no es un respaldo válido.', 'error');
    } finally {
      $('importFile').value = '';
    }
  }

  async function updateStorageNotice() {
    const lastBackup = await RolDB.getSetting('lastBackup');
    let text = 'Los datos se almacenan localmente en este navegador.';
    if (lastBackup) text += ` Último respaldo: ${new Date(lastBackup).toLocaleString('es-CR')}.`;
    if (navigator.storage?.persisted) {
      const persistent = await navigator.storage.persisted();
      text += persistent ? ' Almacenamiento persistente activo.' : ' El almacenamiento todavía no es persistente.';
    }
    $('storageNotice').textContent = text;
  }

  async function requestPersistence() {
    if (!navigator.storage?.persist) return toast('Este navegador no permite solicitar almacenamiento persistente.', 'error');
    const granted = await navigator.storage.persist();
    await updateStorageNotice();
    toast(granted ? 'Almacenamiento persistente concedido.' : 'El navegador no concedió persistencia.', granted ? 'success' : 'error');
  }

  function buildPrintArea() {
    const formatted = formatPeriod(state.period).toUpperCase();
    const content = $('printContent');
    content.replaceChildren();

    const titleEl = document.createElement('h1');
    titleEl.className = 'grid-print-title';
    titleEl.textContent = `DISTRIBUCIÓN MENSUAL ${formatted}`;
    content.appendChild(titleEl);

    // Definición de las 7 columnas y bloques según la matriz institucional
    const gridColumns = [
      // Columna 1
      [
        { name: 'QUÍMICA CLÍNICA I TURNO', color: '#cadc56', textColor: '#000' },
        { name: 'UNIDAD PREANALÍTICA', color: '#1a7da0', textColor: '#fff' },
        { name: 'QUÍMICA CLÍNICA II TURNO', color: '#cadc56', textColor: '#000' }
      ],
      // Columna 2
      [
        { name: 'HEMATOLOGÍA I TURNO', color: '#cf4e79', textColor: '#fff' },
        { name: 'HEMATOLOGÍA II TURNO', color: '#cf4e79', textColor: '#fff' }
      ],
      // Columna 3
      [
        { name: 'INMUNOLOGÍA I TURNO', color: '#8d4798', textColor: '#fff' },
        { name: 'INMUNOLOGÍA II TURNO', color: '#8d4798', textColor: '#fff' }
      ],
      // Columna 4
      [
        { name: 'MICROBIOLOGÍA I TURNO', color: '#529641', textColor: '#fff' },
        { name: 'MICROBIOLOGÍA II TURNO', color: '#529641', textColor: '#fff' }
      ],
      // Columna 5
      [
        { name: 'BANCO DE SANGRE I TURNO', color: '#e65345', textColor: '#fff' },
        { name: 'BANCO DE SANGRE II TURNO', color: '#e65345', textColor: '#fff' },
        { name: 'BANCO DE SANGRE III TURNO', color: '#e65345', textColor: '#fff' }
      ],
      // Columna 6
      [
        { name: 'EMERGENCIAS I TURNO', color: '#eb9335', textColor: '#fff' },
        { name: 'EMERGENCIAS II TURNO', color: '#eb9335', textColor: '#fff' },
        { name: 'EMERGENCIAS III TURNO', color: '#eb9335', textColor: '#fff' },
        { name: 'GESTIÓN DE CALIDAD', color: '#7ba647', textColor: '#fff' }
      ],
      // Columna 7
      [
        { name: 'LAB HORMONAS Y MARCADORES TUMORALES', color: '#3389bc', textColor: '#fff' },
        { name: 'BIOLOGÍA MOLECULAR I TURNO', color: '#169976', textColor: '#fff' },
        { name: 'DIRECCIÓN DE LABORATORIO CLÍNICO', color: '#097c8d', textColor: '#fff' }
      ]
    ];

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid-print-container';

    gridColumns.forEach((colBlocks) => {
      const colDiv = document.createElement('div');
      colDiv.className = 'grid-print-col';

      colBlocks.forEach((block) => {
        const blockDiv = document.createElement('div');
        blockDiv.className = 'grid-print-block';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'grid-block-header';
        headerDiv.style.backgroundColor = block.color;
        headerDiv.style.color = block.textColor;
        headerDiv.textContent = block.name;

        const table = document.createElement('table');
        table.className = 'grid-block-table';

        const head = document.createElement('thead');
        const headRow = document.createElement('tr');
        const thNum = document.createElement('th');
        thNum.style.width = '8%';
        thNum.textContent = '#';
        const thRole = document.createElement('th');
        thRole.style.width = '18%';
        thRole.textContent = 'PUESTO';
        const thName = document.createElement('th');
        thName.style.width = '74%';
        thName.textContent = 'NOMBRE';
        headRow.append(thNum, thRole, thName);
        head.appendChild(headRow);
        table.appendChild(head);

        const body = document.createElement('tbody');

        // Mapear bloque a la sección y turno de la base de datos
        let secName = '';
        let shiftName = '';
        const upperBlock = block.name.toUpperCase();
        
        if (upperBlock.includes('QUÍMICA CLÍNICA')) secName = 'Química Clínica';
        else if (upperBlock.includes('HEMATOLOGÍA')) secName = 'Hematología';
        else if (upperBlock.includes('INMUNOLOGÍA')) secName = 'Inmunología';
        else if (upperBlock.includes('MICROBIOLOGÍA')) secName = 'Microbiología';
        else if (upperBlock.includes('BANCO DE SANGRE')) secName = 'Banco de Sangre';
        else if (upperBlock.includes('EMERGENCIAS')) secName = 'Emergencias';
        else if (upperBlock.includes('LAB HORMONAS')) secName = 'Hormonas y Marcadores Tumorales';
        else if (upperBlock.includes('BIOLOGÍA MOLECULAR')) secName = 'Biología Molecular';
        else if (upperBlock.includes('UNIDAD PREANALÍTICA')) secName = 'Unidad Preanalítica';
        else if (upperBlock.includes('GESTIÓN DE CALIDAD')) secName = 'Gestión de Calidad';
        else if (upperBlock.includes('DIRECCIÓN')) secName = 'Dirección de Laboratorio Clínico';

        if (upperBlock.includes('I TURNO') || upperBlock === 'UNIDAD PREANALÍTICA' || upperBlock === 'GESTIÓN DE CALIDAD' || upperBlock === 'DIRECCIÓN DE LABORATORIO CLÍNICO' || upperBlock.includes('LAB HORMONAS')) {
            shiftName = ['Unidad Preanalítica', 'Gestión de Calidad', 'Dirección de Laboratorio Clínico', 'Hormonas y Marcadores Tumorales', 'Biología Molecular'].includes(secName) ? 'Turno Único' : '6am-3pm';
        } else if (upperBlock.includes('II TURNO')) {
            shiftName = '1pm-10pm';
        } else if (upperBlock.includes('III TURNO')) {
            shiftName = '10pm-7am';
        }

        const sectionMatch = sectionConfig().find(s => s.name === secName);
        const slotDefs = sectionMatch?.slots?.[shiftName] || [];
        const rawAssignments = state.assignments.filter(item => item.section === secName && item.shift === shiftName);
        
        // Mapear empleados a slots según rol
        const mapped = new Array(slotDefs.length).fill(null);
        const unmapped = [];
        
        rawAssignments.forEach(asg => {
            const emp = state.employees.find(e => e.id === asg.employeeId);
            const role = emp ? emp.role : 'MQC';
            let placed = false;
            for (let i = 0; i < slotDefs.length; i++) {
                if (slotDefs[i].includes(role) && mapped[i] === null) {
                    mapped[i] = asg;
                    placed = true;
                    break;
                }
            }
            if (!placed) unmapped.push(asg);
        });
        
        for (let i = 0; i < mapped.length; i++) {
            if (mapped[i] === null && unmapped.length > 0) {
                mapped[i] = unmapped.shift();
            }
        }
        
        const finalAssignments = mapped.concat(unmapped);
        const maxRows = Math.max(slotDefs.length, finalAssignments.length);

        if (maxRows === 0) {
          const row = document.createElement('tr');
          const td1 = document.createElement('td');
          td1.textContent = '1';
          const td2 = document.createElement('td');
          td2.textContent = '—';
          const td3 = document.createElement('td');
          td3.textContent = '—';
          row.append(td1, td2, td3);
          body.appendChild(row);
        } else {
          for (let i = 0; i < maxRows; i++) {
            const row = document.createElement('tr');
            const roleLabel = slotDefs[i] || '—';
            const asg = finalAssignments[i];
            const name = asg ? (asg.note ? `${asg.employeeNameSnapshot} (${asg.note})` : asg.employeeNameSnapshot) : '';
            const td1 = document.createElement('td');
            td1.textContent = String(i + 1);
            const td2 = document.createElement('td');
            td2.textContent = roleLabel;
            const td3 = document.createElement('td');
            td3.textContent = name;
            row.append(td1, td2, td3);
            body.appendChild(row);
          }
        }

        table.appendChild(body);
        blockDiv.append(headerDiv, table);
        colDiv.appendChild(blockDiv);
      });

      gridContainer.appendChild(colDiv);
    });

    content.appendChild(gridContainer);

    // Pie de página institucional con la nota aclaratoria
    const footerNotice = document.createElement('div');
    footerNotice.className = 'grid-print-footer';
    footerNotice.textContent = 'Funcionarios de secretaría y asistentes técnicos recibirán la distribución por parte de sus jefes inmediatos. La distribución de vacaciones dispuesta aquí puede variar según necesidades del servicio o por modificaciones en los períodos de vacaciones del personal que conforma cada rol. Cualquier cambio de horario debe ser comunicado por la jefatura del servicio a la dirección del laboratorio con la justificación. Funcionarios indicados con asterisco serán considerados como primera opción en caso de necesidades de personal en otros servicios.';
    content.appendChild(footerNotice);
  }

  function printRole() {
    buildPrintArea();
    window.print();
  }

  async function openAudit() {
    const list = $('auditList');
    list.replaceChildren();
    const audit = await RolDB.listAudit();
    if (!audit.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No hay registros de auditoría.';
      list.appendChild(empty);
    } else {
      audit.forEach((entry) => {
        const row = document.createElement('article');
        row.className = 'audit-row';
        const time = document.createElement('time');
        time.className = 'audit-time';
        time.dateTime = entry.createdAt;
        time.textContent = new Date(entry.createdAt).toLocaleString('es-CR');
        const text = document.createElement('div');
        const action = document.createElement('span');
        action.className = 'audit-action';
        action.textContent = entry.action || 'acción';
        const summary = document.createElement('span');
        summary.className = 'audit-summary';
        summary.textContent = entry.summary || '';
        text.append(action, summary);
        row.append(time, text);
        list.appendChild(row);
      });
    }
    $('auditDialog').showModal();
  }

  function updateNetworkStatus() {
    const online = navigator.onLine;
    $('networkStatus').textContent = online ? 'En línea · datos locales' : 'Sin conexión · datos locales';
    $('networkStatus').className = `status ${online ? '' : 'offline'}`.trim();
  }

  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) $('updateBanner').classList.remove('hidden');
        });
      });
      $('updateBtn').addEventListener('click', () => {
        const waiting = registration.waiting;
        if (waiting) waiting.postMessage({ type: 'SKIP_WAITING' });
        else location.reload();
      });
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
    } catch (error) {
      console.warn('No se pudo registrar el service worker.', error);
    }
  }

  function setupInstall() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.installPrompt = event;
      $('installBtn').classList.remove('hidden');
    });
    $('installBtn').addEventListener('click', async () => {
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice.catch(() => null);
      state.installPrompt = null;
      $('installBtn').classList.add('hidden');
    });
    window.addEventListener('appinstalled', () => {
      state.installPrompt = null;
      $('installBtn').classList.add('hidden');
    });
  }

  function bindEvents() {
    $('yearSelect').addEventListener('change', refresh);
    $('monthSelect').addEventListener('change', refresh);
    $('employeeSearch').addEventListener('input', (event) => {
      state.employeeSearch = event.target.value;
      renderAvailableEmployees();
    });
    $('manageSearch').addEventListener('input', (event) => {
      state.manageSearch = event.target.value;
      renderEmployeeCatalog();
    });
    $('assignmentSection').addEventListener('change', () => populateShiftSelect($('assignmentSection').value, $('assignmentShift')));
    $('employeeBaseSection').addEventListener('change', () => populateShiftSelect($('employeeBaseSection').value, $('employeeBaseShift')));
    $('saveAssignmentBtn').addEventListener('click', saveAssignment);
    $('manageEmployeesBtn').addEventListener('click', openEmployeeManager);
    $('saveEmployeeBtn').addEventListener('click', saveEmployee);
    $('resetEmployeeBtn').addEventListener('click', resetEmployeeForm);
    $('autoGenerateBtn').addEventListener('click', autoGenerate);
    $('undoGenerateBtn').addEventListener('click', undoGeneration);
    $('clearMonthBtn').addEventListener('click', clearMonth);
    $('printBtn').addEventListener('click', printRole);
    $('backupBtn').addEventListener('click', exportBackup);
    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', (event) => event.target.files?.[0] && importBackup(event.target.files[0]));
    $('persistBtn').addEventListener('click', requestPersistence);
    $('reloadCatalogBtn').addEventListener('click', reloadCatalog);
    $('auditBtn').addEventListener('click', openAudit);
    document.querySelectorAll('[data-close-dialog]').forEach((button) => {
      button.addEventListener('click', () => button.closest('dialog')?.close());
    });
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    state.channel?.addEventListener('message', (event) => {
      if (event.data?.type === 'data-changed') refresh().catch(console.error);
    });
  }

  async function init() {
    try {
      setupPeriodSelectors();
      bindEvents();
      setupInstall();
      updateNetworkStatus();
      await RolDB.ensureInitialData();
      await RolDB.reseedFromConfig();
      await Promise.all([refresh(), updateStorageNotice(), registerServiceWorker()]);
    } catch (error) {
      console.error(error);
      toast(error.message || 'No se pudo iniciar la aplicación.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
