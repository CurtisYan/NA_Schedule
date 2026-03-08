const ALL_SEGS = [
    { key: 'seg1', label: '1-2节', time: '09:00-10:20' },
    { key: 'seg2', label: '3-4节', time: '10:40-12:00' },
    { key: 'seg3', label: '5-6节', time: '12:30-13:50' },
    { key: 'seg4', label: '7-8节', time: '14:00-15:20' },
    { key: 'seg5', label: '9-10节', time: '15:30-16:50' },
    { key: 'seg6', label: '11-12节', time: '17:00-18:20' },
    { key: 'seg7', label: '13-14节', time: '19:00-20:20' },
    { key: 'seg8', label: '15-16节', time: '20:30-21:50' },
];
let activeSegKeys = ['seg4', 'seg5']; // default 7-8, 9-10
let slotMin = 1;
let slotMax = 1;
let distinguishGender = true;
let scheduleMode = 'NA'; // 'NA' or 'Custom'

let DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
let DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
let activeDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];

let students = [];
let schedule = {};
let dragSource = null;

function getActiveSegs() { return ALL_SEGS.filter(s => activeSegKeys.includes(s.key)); }
function getActiveDays() { return DAY_KEYS.filter(k => activeDayKeys.includes(k)); }

function toast(msg, type = 'success') {
    const container = document.getElementById('toast');
    if (!container) return;
    const div = document.createElement('div');
    div.className = `toast-msg ${type}`;
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => div.classList.add('show'), 10);
    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

function init() {
    buildEmptySchedule();
    renderAll();
}

function buildEmptySchedule() {
    const newSched = {};
    for (const day of getActiveDays()) {
        for (const seg of getActiveSegs()) {
            const key = `${day}-${seg.key}`;
            let existing = schedule[key];
            const resize = (arr) => {
                let newArr = [];
                if (distinguishGender) {
                    for (let g of ['M', 'F']) {
                        let gSlots = arr.filter(s => s.gender === g);
                        for (let i = 0; i < Math.ceil(slotMax); i++) {
                            newArr.push({ gender: g, name: gSlots[i] ? gSlots[i].name : null });
                        }
                    }
                } else {
                    let assigned = arr.filter(s => s.name);
                    for (let i = 0; i < Math.ceil(slotMax); i++) {
                        newArr.push({ gender: 'none', name: assigned[i] ? assigned[i].name : null });
                    }
                }
                return newArr;
            };
            if (existing) {
                if (existing.split) {
                    existing.odd = resize(existing.odd);
                    existing.even = resize(existing.even);
                } else {
                    existing.slots = resize(existing.slots);
                }
                newSched[key] = existing;
            } else {
                let slots = [];
                if (distinguishGender) {
                    for (let g of ['M', 'F']) {
                        for (let i = 0; i < Math.ceil(slotMax); i++) {
                            slots.push({ gender: g, name: null });
                        }
                    }
                } else {
                    for (let i = 0; i < Math.ceil(slotMax); i++) {
                        slots.push({ gender: 'none', name: null });
                    }
                }
                newSched[key] = { split: false, slots: slots };
            }
        }
    }
    schedule = newSched;
}

let _sid = 1;
function addStudent(name, gender = 'M', freeSlots = []) {
    name = name.trim();
    if (!name) return;
    const ex = students.find(s => s.name === name);
    if (ex) { ex.freeSlots = [...new Set([...ex.freeSlots, ...freeSlots])]; }
    else { students.push({ id: _sid++, name, gender, active: true, freeSlots }); }
    renderAll();
}

function toggleGender(id) { const s = students.find(s => s.id === id); if (s) { s.gender = s.gender === 'M' ? 'F' : 'M'; renderAll(); } }
function toggleActive(id) { const s = students.find(s => s.id === id); if (s) { s.active = !s.active; if (!s.active) clearStudentFromSchedule(s.name); renderAll(); } }

function clearStudentFromSchedule(name) {
    for (const k in schedule) {
        const c = schedule[k];
        if (c.split) { ['odd', 'even'].forEach(w => c[w].forEach(sl => { if (sl.name === name) sl.name = null })); }
        else { c.slots.forEach(sl => { if (sl.name === name) sl.name = null; }); }
    }
}
function addStudentFromInput() {
    const i = document.getElementById('new-student-name');
    const name = i.value.trim();
    if (!name) return;
    if (/^\d+$/.test(name)) { toast('姓名不能为纯数字', 'warning'); return; }
    openManualFreetime(name);
    i.value = '';
    i.focus();
}

function renderAll() {
    renderStudentList(); renderPool(); renderScheduleTable(); renderFooter();
}

function renderStudentList() {
    const l = document.getElementById('student-list');
    document.getElementById('student-count').textContent = `共 ${students.length} 人`;
    l.innerHTML = '';
    students.forEach(s => {
        const ac = countAssignments(s.name);
        // filter free slots to only count active segments and days
        const activeFree = s.freeSlots.filter(fs => {
            const baseKey = fs.split('|')[0];
            return activeDayKeys.some(d => baseKey.startsWith(`${d}-`)) && activeSegKeys.some(k => baseKey.endsWith(`-${k}`));
        });
        const d = document.createElement('div');
        d.className = `student-item${s.active ? '' : ' unchecked'}`;
        d.innerHTML = `
      <div class="student-item-left"><input type="checkbox" ${s.active ? 'checked' : ''} onchange="toggleActive(${s.id})"/>
      <div class="student-info"><div class="name">${s.name}</div><div class="slots">空闲排班: ${activeFree.length} &nbsp;·&nbsp; 已排: ${ac}</div></div></div>
      <button class="gender-btn ${s.gender === 'M' ? 'male' : 'female'}" onclick="toggleGender(${s.id})">${s.gender === 'M' ? '男' : '女'}</button>`;
        l.appendChild(d);
    });
}

function renderPool() {
    const p = document.getElementById('pool-chips');
    const active = students.filter(s => s.active);
    document.getElementById('pool-count').textContent = `${active.length} 人参与`;
    p.innerHTML = '';
    const max = Math.ceil((DAY_KEYS.length * getActiveSegs().length * 2) / (active.length || 1));
    active.forEach(s => {
        const c = countAssignments(s.name);
        const hc = checkStudentConflict(s);
        const d = document.createElement('div');
        d.className = `person-chip${hc ? ' chip-conflict' : ''}`; d.draggable = true; d.dataset.name = s.name;
        if (hc) { d.style.borderColor = 'var(--danger)'; d.style.background = 'var(--danger-bg)'; }
        let sc = 'ok', st = `${c}班`;
        if (hc) { sc = 'conflict'; st = '冲突'; } else if (c >= max && max > 0) { sc = 'overload'; }
        d.innerHTML = `<span class="material-symbols-outlined ${s.gender === 'M' ? 'male' : 'female'}" style="color:var(--${s.gender === 'M' ? 'male' : 'female'}-text)">${s.gender === 'M' ? 'male' : 'female'}</span><span class="chip-name">${s.name}</span><span class="chip-stat ${sc}">${st}</span>`;
        d.onclick = () => openFreeTime(s.name);
        d.ondragstart = e => { dragSource = { type: 'pool', studentName: s.name }; e.dataTransfer.setData('text/plain', s.name); };
        p.appendChild(d);
    });
}

function countAssignments(name) {
    let c = 0;
    for (const k in schedule) {
        const cell = schedule[k];
        if (cell.split) ['odd', 'even'].forEach(w => cell[w].forEach(sl => { if (sl.name === name) c += 0.5; }));
        else cell.slots.forEach(sl => { if (sl.name === name) c++; });
    } return c;
}

function checkStudentConflict(s) {
    for (const k in schedule) {
        const c = schedule[k], wks = c.split ? ['odd', 'even'] : [null];
        for (const w of wks) {
            const slts = w ? c[w] : c.slots;
            for (const sl of slts) if (sl.name === s.name && s.gender === 'F' && sl.gender === 'M') return true;
        }
    } return false;
}

function renderScheduleTable() {
    const th = document.getElementById('schedule-head');
    const ad = getActiveDays();
    th.innerHTML = `<tr><th>时间 / 星期</th>${ad.map(d => `<th>${DAYS[DAY_KEYS.indexOf(d)]}</th>`).join('')}</tr>`;
    const tb = document.getElementById('schedule-body');
    tb.innerHTML = '';
    let id = 1;
    getActiveSegs().forEach(seg => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><div class="time-label"><div class="seg">${seg.label}</div><div class="time">${seg.time}</div></div></td>`;
        ad.forEach(day => {
            const k = `${day}-${seg.key}`;
            const c = schedule[k];
            const td = document.createElement('td');
            if (c) { td.innerHTML = renderCell(k, c, id++); td.querySelector('.sched-cell').ondragover = e => e.preventDefault(); }
            tr.appendChild(td);
        });
        tb.appendChild(tr);
    });
}

function renderCell(k, c, id) {
    const hc = checkCellConflict(c), cc = hc ? ' conflict' : '';
    const head = `<div class="cell-header">${hc ? `<span class="cell-conflict-label">冲突</span>` : `<span class="cell-id">#${String(id).padStart(3, '0')}</span>`}<button class="split-btn" onclick="${c.split ? `unsplitCell('${k}')` : `splitCell('${k}')`}">${c.split ? '合并' : '单双周'}</button></div>`;
    if (c.split) return `<div class="sched-cell${cc}" data-key="${k}">${head}<div class="slots-split"><div class="split-col"><div class="split-week-label">单周</div>${c.odd.map((sl, i) => renderSlotRow(sl, k, i, 'odd')).join('')}</div><div class="split-col"><div class="split-week-label">双周</div>${c.even.map((sl, i) => renderSlotRow(sl, k, i, 'even')).join('')}</div></div></div>`;
    return `<div class="sched-cell${cc}" data-key="${k}">${head}<div class="slots-container">${c.slots.map((sl, i) => renderSlotRow(sl, k, i)).join('')}</div></div>`;
}

function renderSlotRow(sl, k, idx, w = null) {
    const wa = w ? `data-week="${w}"` : '';
    const hc = sl.name && checkSlotConflict(sl), ci = hc ? `<span class="material-symbols-outlined slot-conflict-icon">error</span>` : '';
    const rb = sl.name ? `<button class="remove-btn" onclick="removeFromSlot('${k}',${idx}${w ? `,'${w}'` : ''})" title="移除"><span class="material-symbols-outlined">close</span></button>` : '';
    const slotClass = sl.gender === 'M' ? 'male-slot' : sl.gender === 'F' ? 'female-slot' : 'neutral-slot';
    const genderIcon = (distinguishGender && sl.gender !== 'none') ? `<span class="material-symbols-outlined slot-icon ${sl.gender === 'M' ? 'male' : 'female'}">${sl.gender === 'M' ? 'male' : 'female'}</span>` : '';
    return `<div class="slot-row ${slotClass}" data-key="${k}" data-idx="${idx}" ${wa} ondragover="event.preventDefault();this.classList.add('drag-over-slot')" ondragleave="this.classList.remove('drag-over-slot')" ondrop="onDrop(event,this,'${k}',${idx},'${w || ''}')" ondragstart="onSlotDragStart(event,this)">
    ${genderIcon}<span class="slot-name ${sl.name ? '' : 'empty'}">${sl.name || '待分配'}</span><div class="slot-actions">${ci}${rb}</div></div>`;
}

function checkCellConflict(c) { const f = (s) => s.some(sl => sl.name && checkSlotConflict(sl)); return c.split ? (f(c.odd) || f(c.even)) : f(c.slots); }
function checkSlotConflict(sl) { if (sl.gender === 'none') return false; const s = students.find(x => x.name === sl.name); return s && s.gender === 'F' && sl.gender === 'M'; }
function splitCell(k) { const c = schedule[k]; c.split = true; c.odd = c.slots.map(s => ({ ...s })); c.even = c.slots.map(s => ({ ...s, name: null })); delete c.slots; renderAll(); }
function unsplitCell(k) { const c = schedule[k]; c.split = false; c.slots = c.odd.map(s => ({ ...s })); delete c.odd; delete c.even; renderAll(); }

function onSlotDragStart(e, el) {
    const n = el.querySelector('.slot-name')?.textContent; if (!n || n === '待分配') { e.preventDefault(); return; }
    dragSource = { type: 'cell', studentName: n, fromKey: el.dataset.key, fromIdx: parseInt(el.dataset.idx), fromWeek: el.dataset.week || null };
    e.dataTransfer.setData('text/plain', n);
}

function onDrop(e, el, k, idx, w) {
    e.preventDefault(); el.classList.remove('drag-over-slot');
    const n = e.dataTransfer.getData('text/plain'), s = students.find(x => x.name === n && x.active);
    if (!s) { toast('该学生未参与排班', 'warn'); return; }
    if (!isFreeFor(s, k, w)) { toast('该生此时段不空闲', 'warn'); return; }
    const c = schedule[k], slts = w ? c[w] : c.slots, sl = slts[idx];
    if (dragSource && dragSource.type === 'cell') {
        const src = schedule[dragSource.fromKey], srcs = dragSource.fromWeek ? src[dragSource.fromWeek] : src.slots;
        if (srcs && srcs[dragSource.fromIdx]) srcs[dragSource.fromIdx].name = null;
    }
    const occ = sl.name; sl.name = n;
    if (occ && dragSource && dragSource.type === 'cell') {
        const src = schedule[dragSource.fromKey], srcs = dragSource.fromWeek ? src[dragSource.fromWeek] : src.slots;
        if (srcs && srcs[dragSource.fromIdx]) srcs[dragSource.fromIdx].name = occ;
    } dragSource = null; renderAll();
}

function removeFromSlot(k, i, w) { const c = schedule[k], slts = w ? c[w] : c.slots; if (slts[i]) slts[i].name = null; renderAll(); }

function isFreeFor(student, slotKey, slotWeek) {
    const fs = student.freeSlots.find(f => f.split('|')[0] === slotKey);
    if (!fs) return false;
    if (!slotWeek) return true;
    const weeksStr = fs.split('|')[1];
    if (!weeksStr) return true;
    let str = weeksStr.replace(/周/g, '');
    let weekNumbers = new Set();
    str.split(',').forEach(part => {
        if (part.includes('-')) {
            let [s, e] = part.split('-').map(Number);
            for (let i = s; i <= e; i++) weekNumbers.add(i);
        } else {
            weekNumbers.add(Number(part));
        }
    });
    if (slotWeek === 'odd') return [...weekNumbers].some(w => w % 2 !== 0);
    if (slotWeek === 'even') return [...weekNumbers].some(w => w % 2 === 0);
    return true;
}

function fillSlots(slots, studentsObj, enforceMin, assignmentsByDay) {
    let remainingSlots = [...slots];
    let slotsByPos = {};
    remainingSlots.forEach(s => {
        let id = `${s.key}-${s.week || 'all'}-${s.g}`;
        if (!slotsByPos[id]) slotsByPos[id] = [];
        slotsByPos[id].push(s);
    });
    let madeProgress = true;
    while (madeProgress && Object.keys(slotsByPos).length > 0) {
        madeProgress = false;
        let posCandidates = [];
        for (const id in slotsByPos) {
            const slotGroup = slotsByPos[id];
            const firstSlot = slotGroup[0];
            const dayKey = firstSlot.key.split('-')[0];
            const cellNames = firstSlot.cell.map(x => x.name).filter(Boolean);
            let cands = studentsObj.filter(s =>
                (firstSlot.g === 'none' || s.gender === firstSlot.g) &&
                !cellNames.includes(s.name) &&
                isFreeFor(s, firstSlot.key, firstSlot.week)
            );
            
            // NA模式规则：女生不能去男生区
            if (scheduleMode === 'NA' && firstSlot.g === 'M') {
                cands = cands.filter(s => s.gender === 'M');
            }
            
            // NA模式规则：班次限制
            // 直接使用slotMax作为每人最多班次（支持0.5单位）
            // 例如：slotMax=1（一周一班）、slotMax=1.5（两周三班）、slotMax=2（一周两班）
            if (scheduleMode === 'NA') {
                cands = cands.filter(s => s.assigned < slotMax);
            }
            
            posCandidates.push({ id, slots: slotGroup, cands, dayKey });
        }
        posCandidates.sort((a, b) => a.cands.length - b.cands.length);
        const targetPos = posCandidates[0];
        if (targetPos.cands.length === 0) {
            delete slotsByPos[targetPos.id];
            continue;
        }
        targetPos.cands.sort((a, b) => {
            const aSameDay = assignmentsByDay[a.name].has(targetPos.dayKey) ? 1 : 0;
            const bSameDay = assignmentsByDay[b.name].has(targetPos.dayKey) ? 1 : 0;
            if (aSameDay !== bSameDay) return aSameDay - bSameDay;
            if (enforceMin) {
                if (a.activeFreeLength !== b.activeFreeLength) return a.activeFreeLength - b.activeFreeLength;
                return a.assigned - b.assigned;
            } else {
                if (a.assigned !== b.assigned) return a.assigned - b.assigned;
                return a.activeFreeLength - b.activeFreeLength;
            }
        });
        const bestCand = targetPos.cands[0];
        const slotToFill = targetPos.slots.shift();
        slotToFill.cell[slotToFill.idx].name = bestCand.name;
        bestCand.assigned += (slotToFill.week ? 0.5 : 1);
        assignmentsByDay[bestCand.name].add(targetPos.dayKey);
        madeProgress = true;
        if (targetPos.slots.length === 0) {
            delete slotsByPos[targetPos.id];
        }
    }
}

function executeScheduling(isContinue) {
    const active = students.filter(s => s.active);
    if (!active.length) { toast('请先添加并勾选学生', 'warn'); return; }

    if (!isContinue) {
        for (const k in schedule) {
            const c = schedule[k];
            if (c.split) ['odd', 'even'].forEach(w => c[w].forEach(s => s.name = null));
            else c.slots.forEach(s => s.name = null);
        }
    }

    let assignmentsByDay = {};
    let assignedCount = {};
    active.forEach(s => { assignmentsByDay[s.name] = new Set(); assignedCount[s.name] = 0; });

    let allSlots = [];
    for (const k in schedule) {
        const c = schedule[k];
        const dayKey = k.split('-')[0];
        if (c.split) {
            ['odd', 'even'].forEach(w => {
                c[w].forEach((sl, idx) => {
                    if (sl.name) {
                        if (assignedCount[sl.name] !== undefined) {
                            assignedCount[sl.name] += 0.5;
                            assignmentsByDay[sl.name].add(dayKey);
                        }
                    } else {
                        const gSlots = c[w].filter(x => x.gender === sl.gender);
                        allSlots.push({ key: k, week: w, idx, g: sl.gender, cell: c[w], isMin: gSlots.indexOf(sl) < slotMin });
                    }
                });
            });
        } else {
            c.slots.forEach((sl, idx) => {
                if (sl.name) {
                    if (assignedCount[sl.name] !== undefined) {
                        assignedCount[sl.name] += 1;
                        assignmentsByDay[sl.name].add(dayKey);
                    }
                } else {
                    const gSlots = c.slots.filter(x => x.gender === sl.gender);
                    allSlots.push({ key: k, week: null, idx, g: sl.gender, cell: c.slots, isMin: gSlots.indexOf(sl) < slotMin });
                }
            });
        }
    }

    const acm = active.map(s => {
        const aFree = s.freeSlots.filter(fs => {
            const baseKey = fs.split('|')[0];
            return activeDayKeys.some(d => baseKey.startsWith(`${d}-`)) && activeSegKeys.some(k => baseKey.endsWith(`-${k}`));
        });
        return { ...s, activeFreeLength: aFree.length, assigned: assignedCount[s.name] };
    });

    // 调试信息
    console.log('激活的日期数:', activeDayKeys.length, activeDayKeys);
    console.log('激活的时间段数:', activeSegKeys.length, activeSegKeys);
    console.log('schedule对象的key数:', Object.keys(schedule).length);
    console.log('schedule对象示例:', Object.keys(schedule).slice(0, 5));
    console.log('allSlots总数:', allSlots.length);
    console.log('minSlots数:', allSlots.filter(s => s.isMin).length);
    console.log('maxSlots数:', allSlots.filter(s => !s.isMin).length);
    console.log('slotMin:', slotMin, 'slotMax:', slotMax);
    console.log('distinguishGender:', distinguishGender);

    const minSlots = allSlots.filter(s => s.isMin);
    const maxSlots = allSlots.filter(s => !s.isMin);

    console.log('开始填充minSlots...');
    fillSlots(minSlots, acm, true, assignmentsByDay);
    console.log('minSlots填充完成');
    
    // 检查填充结果
    let filledCount = 0;
    for (const k in schedule) {
        const c = schedule[k];
        if (c.split) {
            ['odd', 'even'].forEach(w => c[w].forEach(sl => { if (sl.name) filledCount++; }));
        } else {
            c.slots.forEach(sl => { if (sl.name) filledCount++; });
        }
    }
    console.log('填充后有名字的位置数:', filledCount);
    console.log('schedule示例:', schedule['mon-seg4']);
    fillSlots(maxSlots, acm, false, assignmentsByDay);

    renderAll(); toast(isContinue ? '增量填充完成' : '排班完成', 'success');
}

function runScheduler() { executeScheduling(false); }
function continueSchedule() { executeScheduling(true); }

// ======================= MODALS AND settings ========================
function openImport() { document.getElementById('import-overlay').classList.add('open') }
function closeImport() { document.getElementById('import-overlay').classList.remove('open') }
document.getElementById('import-overlay').onclick = e => { if (e.target === e.currentTarget) closeImport() };
document.getElementById('settings-overlay').onclick = e => { if (e.target === e.currentTarget) closeSettings() };

function openSettings() {
    const gd = document.getElementById('settings-days'); gd.innerHTML = '';
    DAY_KEYS.forEach((dk, i) => {
        const ck = activeDayKeys.includes(dk);
        gd.innerHTML += `<label class="checkbox-label ${ck ? 'active' : ''}">
      <input type="checkbox" value="${dk}" ${ck ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)">
      ${DAYS[i]}
    </label>`;
    });
    const gs = document.getElementById('settings-segments'); gs.innerHTML = '';
    ALL_SEGS.forEach(s => {
        const ck = activeSegKeys.includes(s.key);
        gs.innerHTML += `<label class="checkbox-label ${ck ? 'active' : ''}">
      <input type="checkbox" value="${s.key}" ${ck ? 'checked' : ''} onchange="this.parentElement.classList.toggle('active', this.checked)">
      ${s.label} (${s.time})
    </label>`;
    });
    document.getElementById('settings-min').value = slotMin;
    document.getElementById('settings-max').value = slotMax;
    const chk = document.getElementById('settings-distinguish-gender');
    if (chk) chk.checked = distinguishGender;

    document.getElementById('settings-overlay').classList.add('open');
}
function closeSettings() { document.getElementById('settings-overlay').classList.remove('open') }
function saveSettings() {
    const cd = document.querySelectorAll('#settings-days input:checked');
    activeDayKeys = Array.from(cd).map(i => i.value);
    const cs = document.querySelectorAll('#settings-segments input:checked');
    activeSegKeys = Array.from(cs).map(i => i.value);
    slotMin = parseFloat(document.getElementById('settings-min').value) || 0;
    slotMax = parseFloat(document.getElementById('settings-max').value) || 1;
    if (slotMax < slotMin) slotMax = slotMin;
    const chk = document.getElementById('settings-distinguish-gender');
    const oldDistinguish = distinguishGender;
    distinguishGender = chk ? chk.checked : true;

    buildEmptySchedule();
    renderAll();
    closeSettings();
    toast('设置已更新', 'success');
}

function openFreeTime(name) {
    const s = students.find(x => x.name === name);
    if (!s) return;
    document.getElementById('freetime-title').textContent = `${s.name} 的空闲视图`;
    const th = document.getElementById('freetime-head');
    th.innerHTML = `<tr><th style="width:100px;text-align:center;padding:12px 0;">时间带</th>${DAYS.map(d => `<th style="padding:12px 0;">${d}</th>`).join('')}</tr>`;
    const tb = document.getElementById('freetime-body');
    tb.innerHTML = '';
    ALL_SEGS.forEach(seg => {
        const tr = document.createElement('tr');
        let html = `<td style="text-align:center;font-weight:600;font-size:13px;color:var(--text2);padding:14px 8px;background:#f8fafc;border-right:1px solid var(--border)">${seg.label}<div style="font-size:10px;font-weight:normal;color:var(--text3);margin-top:4px;">${seg.time}</div></td>`;
        DAY_KEYS.forEach(day => {
            const fs = s.freeSlots.find(f => f.startsWith(`${day}-${seg.key}`));
            const isFree = !!fs;
            let weekStr = fs ? (fs.split('|')[1] || '1-18周') : '';
            html += `<td style="text-align:center; vertical-align:middle; padding:12px 8px;">
                        ${isFree
                    ? `<span class="material-symbols-outlined" style="color:var(--success);font-size:24px;">check_circle</span><div style="font-size:11px;color:var(--text2);margin-top:4px;font-weight:600;">${weekStr}</div>`
                    : `<span style="color:var(--border2);font-size:18px;">-</span>`}
                    </td>`;
        });
        tr.innerHTML = html;
        tb.appendChild(tr);
    });
    document.getElementById('freetime-overlay').classList.add('open');
}
document.getElementById('freetime-overlay').onclick = e => { if (e.target === e.currentTarget) e.target.classList.remove('open') };

let manualStudentName = '';
let manualFreeSlotsMap = new Map();

function openManualFreetime(name) {
    manualStudentName = name;
    manualFreeSlotsMap.clear();
    document.getElementById('manual-freetime-title').textContent = `为 ${name} 手动分配空闲时间`;
    document.getElementById('manual-gender-select').value = 'M';

    const th = document.getElementById('manual-freetime-head');
    th.innerHTML = `<tr><th style="width:100px;text-align:center;padding:12px 0;">时间带</th>${DAYS.map(d => `<th style="padding:12px 0;">${d}</th>`).join('')}</tr>`;

    const tb = document.getElementById('manual-freetime-body');
    tb.innerHTML = '';

    ALL_SEGS.forEach(seg => {
        const tr = document.createElement('tr');
        let html = `<td style="text-align:center;font-weight:600;font-size:13px;color:var(--text2);padding:14px 8px;background:#f8fafc;border-right:1px solid var(--border)">${seg.label}<div style="font-size:10px;font-weight:normal;color:var(--text3);margin-top:4px;">${seg.time}</div></td>`;
        DAY_KEYS.forEach(day => {
            const key = `${day}-${seg.key}`;
            html += `<td style="text-align:center; vertical-align:middle; padding:0; cursor:pointer;" onclick="toggleManualSlot(this, '${key}')">
                        <div class="manual-cell" style="width:100%; height:100%; min-height:60px; display:flex; flex-direction:column; align-items:center; justify-content:center; border-radius:4px; transition:0.2s; background: transparent;">
                            <span class="material-symbols-outlined icon-status" style="color:var(--border2);font-size:24px;">panorama_fish_eye</span>
                            <span class="week-label" style="font-size:11px; margin-top:4px; font-weight:600; color:var(--text2); display:none;"></span>
                        </div>
                    </td>`;
        });
        tr.innerHTML = html;
        tb.appendChild(tr);
    });
    document.getElementById('manual-freetime-overlay').classList.add('open');
}

let pendingSlotKey = null;
let pendingSlotTd = null;
let isDraggingWeek = false;
let dragSelectState = false; // true if selecting, false if deselecting
let weekSelection = new Set(); // Stores weeks 1-18

function initWeekGrid() {
    const grid = document.getElementById('week-grid');
    if (grid.children.length > 0) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 18; i++) {
        const btn = document.createElement('div');
        btn.className = 'week-btn';
        btn.style.cssText = `
                    padding: 6px 0; text-align: center; border: 1px solid var(--border);
                    border-radius: 4px; font-size: 12px; cursor: pointer; transition: 0.1s;
                    user-select: none;
                `;
        btn.dataset.week = i;
        btn.textContent = i;

        btn.onmousedown = (e) => {
            isDraggingWeek = true;
            // toggle state: if currently has week, then dragging means remove. otherwise insert
            dragSelectState = !weekSelection.has(i);
            toggleWeekNum(i, dragSelectState);
        };
        btn.onmouseenter = (e) => {
            if (isDraggingWeek) {
                toggleWeekNum(i, dragSelectState);
            }
        };
        grid.appendChild(btn);
    }
    // Bind global mouseup to stop dragging
    document.addEventListener('mouseup', () => { isDraggingWeek = false; }, { once: false });
}

function toggleWeekNum(w, state) {
    if (state) weekSelection.add(w);
    else weekSelection.delete(w);
    updateWeekGridUI();
}

function updateWeekGridUI() {
    const btns = document.querySelectorAll('.week-btn');
    btns.forEach(btn => {
        const w = parseInt(btn.dataset.week);
        if (weekSelection.has(w)) {
            btn.style.background = 'var(--primary)';
            btn.style.color = 'white';
            btn.style.borderColor = 'var(--primary)';
        } else {
            btn.style.background = 'white';
            btn.style.color = 'var(--text2)';
            btn.style.borderColor = 'var(--border)';
        }
    });
    updateWeekPreview();
}

function selectAllWeeks() {
    for (let i = 1; i <= 18; i++) weekSelection.add(i);
    updateWeekGridUI();
}

function clearAllWeeks() {
    weekSelection.clear();
    updateWeekGridUI();
}

function stringifyWeeks() {
    if (weekSelection.size === 0) return '';
    if (weekSelection.size === 18) return '1-18周';
    let arr = Array.from(weekSelection).sort((a, b) => a - b);
    let parts = [];
    let start = arr[0], end = arr[0];
    for (let i = 1; i < arr.length; i++) {
        if (arr[i] === end + 1) { end = arr[i]; }
        else {
            parts.push(start === end ? start : `${start}-${end}`);
            start = arr[i]; end = arr[i];
        }
    }
    parts.push(start === end ? start : `${start}-${end}`);
    return parts.join(',') + '周';
}

function parseWeeks(str) {
    let set = new Set();
    if (!str) return set;
    if (str === '1-18周') { for (let i = 1; i <= 18; i++) set.add(i); return set; }
    let s = str.replace('周', '');
    let parts = s.split(',');
    for (let p of parts) {
        if (p.includes('-')) {
            let [a, b] = p.split('-').map(Number);
            if (a && b) for (let i = a; i <= b; i++) set.add(i);
        } else {
            let n = Number(p);
            if (n) set.add(n);
        }
    }
    return set;
}

function updateWeekPreview() {
    document.getElementById('week-selector-preview').textContent = stringifyWeeks() || '未选择';
}

function toggleManualSlot(td, key) {
    const cell = td.querySelector('.manual-cell');
    const icon = td.querySelector('.icon-status');
    const weekLabel = td.querySelector('.week-label');

    if (manualFreeSlotsMap.has(key)) {
        manualFreeSlotsMap.delete(key);
        cell.style.background = 'transparent';
        icon.textContent = 'panorama_fish_eye';
        icon.style.color = 'var(--border2)';
        weekLabel.style.display = 'none';
        weekLabel.textContent = '';
        closeWeekPopover();
    } else {
        pendingSlotKey = key;
        pendingSlotTd = td;
        const popover = document.getElementById('week-selector-popover');

        initWeekGrid();
        weekSelection = parseWeeks('1-18周'); // Default
        updateWeekGridUI();

        // Position popover relative to scroll
        const rect = td.getBoundingClientRect();
        const wrapRect = td.closest('.table-wrap').getBoundingClientRect();

        let top = rect.bottom - wrapRect.top + td.closest('.table-wrap').scrollTop + 5;
        let left = rect.left - wrapRect.left + td.closest('.table-wrap').scrollLeft;

        // Keep popover inside wrap horizontally
        if (left + 280 > wrapRect.width) {
            left = wrapRect.width - 300;
        }

        popover.style.top = top + 'px';
        popover.style.left = left + 'px';
        popover.style.display = 'block';
    }
}

function closeWeekPopover() {
    document.getElementById('week-selector-popover').style.display = 'none';
    pendingSlotKey = null;
    pendingSlotTd = null;
}

function confirmWeekSelection() {
    if (!pendingSlotKey || !pendingSlotTd) return;

    let wk = stringifyWeeks();
    if (!wk) {
        toast('必须选择至少1周', 'warning');
        return;
    }

    manualFreeSlotsMap.set(pendingSlotKey, wk);

    const cell = pendingSlotTd.querySelector('.manual-cell');
    const icon = pendingSlotTd.querySelector('.icon-status');
    const weekLabel = pendingSlotTd.querySelector('.week-label');

    cell.style.background = 'var(--primary-bg)';
    icon.textContent = 'check_circle';
    icon.style.color = 'var(--primary)';
    weekLabel.textContent = wk;
    weekLabel.style.display = 'block';

    closeWeekPopover();
}

function closeManualFreetime() {
    closeWeekPopover();
    document.getElementById('manual-freetime-overlay').classList.remove('open');
}

function confirmManualFreetime() {
    const gender = document.getElementById('manual-gender-select').value;
    const formattedSlots = [];
    manualFreeSlotsMap.forEach((week, key) => {
        formattedSlots.push(`${key}|${week}`);
    });
    addStudent(manualStudentName, gender, formattedSlots);
    closeManualFreetime();
    toast(`成功添加学生: ${manualStudentName}`, 'success');
}
document.getElementById('manual-freetime-overlay').onclick = e => { if (e.target === e.currentTarget) closeManualFreetime() };

function handleFileInput(e) { const f = e.target.files[0]; if (f) processFile(f); e.target.value = ''; }

function processFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
        const d = new Uint8Array(e.target.result); const wb = XLSX.read(d, { type: 'array' });
        const js = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });

        // Find header
        let hr = -1;
        for (let r = 0; r < Math.min(js.length, 5); r++) { if (js[r].some(c => typeof c === 'string' && (c.includes('周一') || c.includes('星期')))) { hr = r; break; } }
        if (hr === -1) { toast('解析表头失败', 'error'); return; }

        // map columns to DAY_KEYS
        const dc = {}; js[hr].forEach((c, i) => {
            if (c && typeof c === 'string') {
                const idx = DAYS.findIndex(d => c.includes(d)); if (idx !== -1) dc[i] = DAY_KEYS[idx];
            }
        });

        // map rows to ALL_SEGS keys via Regex heuristic on time strings
        const rc = {};
        for (let r = hr + 1; r < js.length; r++) {
            const t = (js[r][0] || '').toString().replace(/\s+/g, '');
            if (t) {
                // match segment from ALL_SEGS by checking if 1-2, 3-4 etc exists in text
                for (const s of ALL_SEGS) {
                    const m = s.label.replace('节', '');
                    if (t.includes(m) || t.includes(s.time.replace(/\s+/g, ''))) { rc[r] = s.key; break; }
                }
            } else if (r > 0 && rc[r - 1]) rc[r] = rc[r - 1]; // merging
        }

        let rg = /([\u4e00-\u9fa5A-Za-z]+)\s*(?:\(([^)]*)\))?/g;
        for (let r = hr + 1; r < js.length; r++) {
            if (!rc[r]) continue;
            for (const ci in dc) {
                const dk = dc[ci], sk = rc[r];
                const val = (js[r][ci] || '').toString().trim();
                let m; while ((m = rg.exec(val)) !== null) {
                    let weekStr = m[2] ? `|${m[2]}` : '';
                    addStudent(m[1].trim(), 'M', [`${dk}-${sk}${weekStr}`]);
                }
            }
        }
        closeImport(); toast('解析Excel完毕', 'success');
    };
    reader.readAsArrayBuffer(file);
}

function renderFooter() {
    let [fl, t] = [0, 0];
    for (const k in schedule) {
        const c = schedule[k], wk = c.split ? ['odd', 'even'] : [null];
        for (const w of wk) { const s = w ? c[w] : c.slots; for (const sl of s) { t++; if (sl.name) fl++; } }
    }
    const active = students.filter(s => s.active);
    const m = active.filter(s => s.gender === 'M').length;
    const f = active.filter(s => s.gender === 'F').length;
    document.getElementById('stat-male').textContent = `男生人数: ${m}`; document.getElementById('stat-female').textContent = `女生人数: ${f}`;
    document.getElementById('stat-filled').textContent = `已排班: ${t ? Math.round(fl / t * 100) : 0}%`;
}

function exportCSV() {
    const ad = getActiveDays();
    const rs = [['时间段'].concat(ad.map(d => DAYS[DAY_KEYS.indexOf(d)]))];
    getActiveSegs().forEach(seg => {
        const mr = [seg.label + '(男)'], fr = [seg.label + '(女)'];
        ad.forEach(d => {
            const c = schedule[`${d}-${seg.key}`];
            if (c && c.split) {
                const oM = c.odd.filter(s => s.gender === 'M' && s.name).map(s => s.name).join(' ');
                const eM = c.even.filter(s => s.gender === 'M' && s.name).map(s => s.name).join(' ');
                const oF = c.odd.filter(s => s.gender === 'F' && s.name).map(s => s.name).join(' ');
                const eF = c.even.filter(s => s.gender === 'F' && s.name).map(s => s.name).join(' ');
                mr.push(`单:${oM} 双:${eM}`); fr.push(`单:${oF} 双:${eF}`);
            } else if (c) {
                mr.push(c.slots.filter(s => s.gender === 'M' && s.name).map(s => s.name).join(' ') || '');
                fr.push(c.slots.filter(s => s.gender === 'F' && s.name).map(s => s.name).join(' ') || '');
            } else {
                mr.push(''); fr.push('');
            }
        }); rs.push(mr, fr);
    });
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\uFEFF' + rs.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = '排班表.csv'; a.click();
}
function saveSchedule() { localStorage.setItem('schedule_data', JSON.stringify({ students, schedule, activeSegKeys, activeDayKeys, slotMin, slotMax, distinguishGender, scheduleMode })); toast('保存成功'); }
function tryRestore() { const s = localStorage.getItem('schedule_data'); if (s) { try { const p = JSON.parse(s); if (p.activeSegKeys) activeSegKeys = p.activeSegKeys; if (p.activeDayKeys) activeDayKeys = p.activeDayKeys; if (p.slotMin !== undefined) slotMin = p.slotMin; if (p.slotMax !== undefined) slotMax = p.slotMax; if (p.distinguishGender !== undefined) distinguishGender = p.distinguishGender; if (p.scheduleMode) scheduleMode = p.scheduleMode; students = p.students || []; Object.assign(schedule, p.schedule || {}); return true; } catch { return false; } } return false; }

init(); if (!tryRestore()) { } renderAll();

window.handleModeChange = function (mode) {
    if (mode === 'NA') {
        activeSegKeys = ['seg4', 'seg5'];
        activeDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];
        distinguishGender = true;
    } else if (mode === 'Custom') {
        activeSegKeys = ['seg1', 'seg2', 'seg3', 'seg4', 'seg5', 'seg6', 'seg7', 'seg8'];
        activeDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'];
        distinguishGender = false;
    }
    openSettings(); // Refresh UI inside settings overlay
};

window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

window.addEventListener('beforeunload', e => {
    const current = JSON.stringify({ students, schedule, activeSegKeys, activeDayKeys, slotMin, slotMax, distinguishGender, scheduleMode });
    const saved = localStorage.getItem('schedule_data');
    if (students.length > 0 && current !== saved) {
        e.preventDefault();
        e.returnValue = '';
    }
});