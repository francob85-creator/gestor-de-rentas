// ============================================================
// gestor-plantillas.js — Plantillas de documentos legales
// Separado del archivo principal para reducir peso.
// Requiere: state, _getRentaMap, _getCliMap, _getFPMap,
//           showToast, save, uid, fmt, fmtDate, fbSavePlan
//           Cargado automáticamente al abrir la sección Documentos.
// ============================================================

const DOCS_EXTRA = [
  { id:'contrato',  icon:'📝', title:'Contrato de arrendamiento', desc:'Contrato completo listo para firmar, con todos los datos del inquilino, monto, fechas y cláusulas estándar.' },
  { id:'ficha',     icon:'🏠', title:'Ficha de presentación',     desc:'Ficha comercial para publicar o presentar la propiedad: foto, características, precio y contacto.' },
  { id:'entrega',   icon:'🔑', title:'Acta de entrega / recepción', desc:'Documento para firmar al inicio o al final del contrato registrando el estado de la propiedad.' },
  { id:'deposito',  icon:'💰', title:'Recibo de depósito',         desc:'Recibo formal del depósito en garantía recibido del inquilino.' },
  { id:'salida',    icon:'🚪', title:'Acta de devolución / salida', desc:'Documento que firmará el inquilino al dejar la propiedad, con estado final y devolución del depósito.' },
  { id:'rescision', icon:'⚖️', title:'Rescisión de contrato',         desc:'Documento formal para rescindir el contrato por incumplimiento de cláusulas o salida anticipada. Detalla motivos, penalidades y plazos de desocupación.' },
];

let _extraRentaId = null;
let _docTextoActual = '';
let _docTituloActual = '';
// ══════════════════════════════════════════════════════════
// MIGRACIÓN MULTI-TENANT
// ══════════════════════════════════════════════════════════
function renderMigracion() {
  const el = document.getElementById('migracion-content');
  if (!el) return;
  el.innerHTML = `
    <div style="background:var(--surface);border-radius:14px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
      <div style="font-size:22px;font-weight:700;color:var(--accent);margin-bottom:4px">🔄 Migración de Datos</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:20px">Mueve tus datos a la nueva estructura multi-tenant</div>
      <div style="background:#f0f8f0;border:2px solid var(--success);border-radius:8px;padding:12px;font-family:monospace;font-size:12px;margin-bottom:16px">
        <strong>UID destino:</strong><br>tSKcnxaw6tRJXWlcZKhiXCERKwp2
      </div>
      <button onclick="ejecutarMigracion()" id="btn-migrar-app"
        style="width:100%;background:var(--accent);color:#fff;border:none;padding:14px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:12px">
        🚀 Iniciar Migración
      </button>
      <div id="mig-log" style="background:#1a1a2e;color:#00ff88;padding:16px;border-radius:8px;font-family:monospace;font-size:12px;min-height:180px;max-height:350px;overflow-y:auto;white-space:pre-wrap"></div>
    </div>
    <div style="background:var(--surface);border-radius:14px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-top:16px">
      <div style="font-size:18px;font-weight:700;color:var(--text);margin-bottom:4px">⚙️ Plan activo</div>
      <div style="font-size:13px;color:var(--text3);margin-bottom:16px">Plan actual en Firestore para esta cuenta</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <span style="font-size:14px;color:var(--text2)">Plan:</span>
        <span id="plan-actual-label" style="font-weight:700;font-size:15px;color:var(--accent)">Cargando...</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-bottom:16px">
        <button onclick="cambiarPlanAdmin('basico')"    style="padding:10px;border-radius:8px;border:2px solid var(--border);background:var(--surface2);font-weight:600;cursor:pointer;font-size:13px">Básico (10)</button>
        <button onclick="cambiarPlanAdmin('pro')"       style="padding:10px;border-radius:8px;border:2px solid var(--border);background:var(--surface2);font-weight:600;cursor:pointer;font-size:13px">Pro (50)</button>
        <button onclick="cambiarPlanAdmin('enterprise')" style="padding:10px;border-radius:8px;border:2px solid var(--border);background:var(--surface2);font-weight:600;cursor:pointer;font-size:13px">Enterprise (999)</button>
        <button onclick="cambiarPlanAdmin('admin')"     style="padding:10px;border-radius:8px;border:2px solid var(--accent);background:var(--accent);color:#fff;font-weight:600;cursor:pointer;font-size:13px">Admin (∞)</button>
      </div>
      <div id="plan-change-status" style="font-size:13px;color:var(--success);display:none"></div>
    </div>
  `;
  // Auto check
  const uid = _fbAuth ? _fbAuth.uid : null;
  const logEl = document.getElementById('mig-log');
  if (uid) {
    logEl.innerHTML += '<span style="color:#00ff88">✅ Sesión activa: ' + (_fbAuth.email||uid) + '</span>\n';
    logEl.innerHTML += '<span style="color:#88aaff">Listo para migrar. Presiona el botón.</span>\n';
  } else {
    logEl.innerHTML += '<span style="color:#ffaa00">⚠️ No hay sesión de Firebase Auth activa.</span>\n';
  }
  // Show current plan
  fbLoadPlan().then(function(plan) {
    var lbl = document.getElementById('plan-actual-label');
    if (lbl) lbl.textContent = (plan && plan.plan) ? plan.plan : 'basico';
  });
}

async function cambiarPlanAdmin(nuevoPlan) {
  if (!_fbAuth) return alert('Sin sesión.');
  var planes = { basico: 'Básico (10 props)', pro: 'Pro (50 props)', enterprise: 'Enterprise (999 props)', admin: 'Admin (ilimitado)' };
  if (!confirm('¿Cambiar plan a ' + (planes[nuevoPlan] || nuevoPlan) + '?')) return;
  try {
    await fbSavePlan({
      plan: nuevoPlan,
      email: _fbAuth.email,
      updatedAt: new Date().toISOString(),
      stripeStatus: 'active'
    });
    state.plan = nuevoPlan;
    state.planLimites = getPlanLimites(nuevoPlan);
    var lbl = document.getElementById('plan-actual-label');
    if (lbl) lbl.textContent = nuevoPlan;
    var st = document.getElementById('plan-change-status');
    if (st) { st.textContent = '✅ Plan cambiado a ' + nuevoPlan + ' — límite: ' + state.planLimites.propiedades + ' propiedades'; st.style.display = ''; }
    showToast('✅ Plan actualizado a ' + nuevoPlan);
  } catch(e) {
    alert('Error al cambiar plan: ' + e.message);
  }
}

async function ejecutarMigracion() {
  const btn = document.getElementById('btn-migrar-app');
  const logEl = document.getElementById('mig-log');
  if (!btn || !logEl) return;
  btn.disabled = true; btn.textContent = 'Migrando...';
  logEl.innerHTML = '';

  function mlog(msg, color) {
    logEl.innerHTML += '<span style="color:' + (color||'#88aaff') + '">' + msg + '</span>\n';
    logEl.scrollTop = logEl.scrollHeight;
  }

  const TARGET_UID = 'tSKcnxaw6tRJXWlcZKhiXCERKwp2';

  try {
    // Verify auth
    mlog('Paso 1: Verificando sesión...', '#88aaff');
    if (!_fbAuth) { mlog('❌ No hay sesión de Firebase Auth.', '#ff4444'); btn.disabled=false; btn.textContent='🚀 Iniciar Migración'; return; }
    if (_fbAuth.uid !== TARGET_UID) { mlog('❌ UID no coincide: ' + _fbAuth.uid, '#ff4444'); btn.disabled=false; btn.textContent='🚀 Iniciar Migración'; return; }
    mlog('✅ Sesión verificada: ' + _fbAuth.email, '#00ff88');

    // Read source
    mlog('\nPaso 2: Leyendo gestorrenta/main...', '#88aaff');
    const mainSnap = await db.collection('gestorrenta').doc('main').get();
    if (!mainSnap.exists) { mlog('❌ No existe gestorrenta/main', '#ff4444'); btn.disabled=false; btn.textContent='🚀 Iniciar Migración'; return; }
    const mainData = mainSnap.data();
    mlog('✅ ' + (mainData.rentas||[]).length + ' propiedades, ' + (mainData.clientes||[]).length + ' clientes', '#00ff88');

    // Read users
    mlog('\nPaso 3: Leyendo usuarios...', '#88aaff');
    const usersSnap = await db.collection('gestorrenta').doc('users').get();
    const usersData = usersSnap.exists ? usersSnap.data() : { list: [] };
    mlog('✅ ' + (usersData.list||[]).length + ' usuarios', '#00ff88');

    // Write to new path
    mlog('\nPaso 4: Escribiendo en tenants/' + TARGET_UID + '/data/main...', '#88aaff');
    await db.collection('tenants').doc(TARGET_UID).collection('data').doc('main').set({
      ...mainData,
      migratedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    mlog('✅ Datos migrados', '#00ff88');

    // Write users
    mlog('\nPaso 5: Migrando usuarios...', '#88aaff');
    await db.collection('tenants').doc(TARGET_UID).collection('data').doc('users').set(usersData);
    mlog('✅ Usuarios migrados', '#00ff88');

    // Create plan doc
    mlog('\nPaso 6: Configurando plan admin...', '#88aaff');
    await db.collection('tenants').doc(TARGET_UID).set({
      plan: 'admin', nombre: 'Franco', empresa: 'GestorRentas',
      email: _fbAuth.email, createdAt: new Date().toISOString(), stripeStatus: 'active',
    }, { merge: true });
    mlog('✅ Plan admin configurado', '#00ff88');

    // Verify
    mlog('\nPaso 7: Verificando...', '#88aaff');
    const verSnap = await db.collection('tenants').doc(TARGET_UID).collection('data').doc('main').get();
    mlog('✅ ' + (verSnap.data().rentas||[]).length + ' propiedades en nuevo path', '#00ff88');

    mlog('\n════════════════════════════', '#ffffff');
    mlog('🎉 MIGRACIÓN COMPLETADA', '#00ff88');
    mlog('════════════════════════════', '#ffffff');
    mlog('Tus datos ahora están en tenants/' + TARGET_UID, '#00ff88');
    mlog('Los datos originales NO fueron eliminados.', '#88aaff');
    btn.textContent = '✅ Completado';

    // Reload data from new path
    setTimeout(() => { fbStopSync(); fbStartSync(); }, 1000);

  } catch(e) {
    mlog('\n❌ Error: ' + e.message, '#ff4444');
    btn.disabled = false; btn.textContent = '🔄 Reintentar';
  }
}

// ── AYUDA (HELP) ──────────────────────────────────────────
function toggleAyuda(headerEl) {
  const body = headerEl.nextElementSibling;
  const chevron = headerEl.querySelector('.ayuda-chevron');
  const isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(90deg)';
}

function renderExtra() {
  // Populate property selector
  const sel = document.getElementById('extra-prop-sel');
  if (!sel) return;
  const curVal = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar propiedad —</option>' +
    state.rentas.map(r => {
      const cli = r.clienteId ? (_getCliMap()[r.clienteId] || null) : null;
      return `<option value="${r.id}">${r.nombre}${cli ? ' · ' + cli.nombre : ' · (sin inquilino)'}</option>`;
    }).join('');
  if (curVal) sel.value = curVal;

  const cards = document.getElementById('extra-doc-cards');
  if (!_extraRentaId) {
    cards.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text3)">
      <div style="font-size:48px;margin-bottom:12px">📄</div>
      <div style="font-size:15px;font-weight:600;margin-bottom:6px">Selecciona una propiedad</div>
      <div style="font-size:13px">Elige arriba la propiedad para generar sus documentos legales</div>
    </div>`;
    waFichaRenderLista();
    return;
  }

  const renta = (_getRentaMap()[_extraRentaId] || null);
  if (!renta) return;
  const cli = renta.clienteId ? (_getCliMap()[renta.clienteId] || null) : null;

  // Info bar
  const info = document.getElementById('extra-prop-inquilino');
  if (info) info.innerHTML = cli
    ? `👤 ${cli.nombre} · 💰 ${fmt(renta.monto)}/mes`
    : `<span style="color:var(--warning)">Sin inquilino asignado</span>`;

  // Cards
  cards.innerHTML = DOCS_EXTRA.map(doc => `
    <div class="doc-card" onclick="generarDocExtra('${doc.id}')">
      <div class="doc-card-icon">${doc.icon}</div>
      <div class="doc-card-title">${doc.title}</div>
      <div class="doc-card-desc">${doc.desc}</div>
      <button class="btn btn-primary doc-card-btn" onclick="event.stopPropagation();generarDocExtra('${doc.id}')">
        Generar documento ↗
      </button>
    </div>`).join('');
}

// ── WhatsApp Fichas ─────────────────────────────────────────
var _waFichaFiltro = 'sinrentar';

function waFichaSetFiltro(filtro) {
  _waFichaFiltro = filtro;
  var btnS = document.getElementById('waficha-btn-sinrentar');
  var btnT = document.getElementById('waficha-btn-todas');
  if (btnS) { btnS.className = filtro === 'sinrentar' ? 'btn btn-primary' : 'btn btn-ghost'; btnS.style.fontSize = '13px'; btnS.style.padding = '7px 16px'; }
  if (btnT) { btnT.className = filtro === 'todas' ? 'btn btn-primary' : 'btn btn-ghost'; btnT.style.fontSize = '13px'; btnT.style.padding = '7px 16px'; }
  waFichaRenderLista();
}

function waFichaRenderLista() {
  var lista = document.getElementById('waficha-lista');
  var acciones = document.getElementById('waficha-acciones');
  if (!lista) return;

  var hoyISO = new Date().toISOString().slice(0,10);
  var props;
  if (_waFichaFiltro === 'sinrentar') {
    props = state.rentas.filter(function(r) {
      var libre = !r.clienteId || r.clienteId === '';
      var conBaja = r.clienteId && r.clienteId !== '' && r.bajaProgramada && r.bajaProgramada >= hoyISO;
      return (libre || conBaja) && r.fichaPDF;
    });
  } else {
    props = state.rentas.filter(function(r) { return r.fichaPDF; });
  }

  if (!props.length) {
    lista.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text3);background:var(--surface2);border-radius:10px;font-size:13px">' +
      (_waFichaFiltro === 'sinrentar'
        ? '🏠 No hay propiedades sin rentar con ficha guardada.'
        : '📄 No hay propiedades con ficha guardada.') +
      '<br><span style="font-size:11px">Ve a una propiedad → Ficha PDF → sube o genera la ficha</span></div>';
    if (acciones) acciones.style.display = 'none';
    return;
  }

  var html = '';
  props.forEach(function(r) {
    var sinRentar = !r.clienteId || r.clienteId === '';
    var conBaja = r.bajaProgramada;
    var statusLabel = sinRentar
      ? (conBaja ? '<span style="font-size:10px;color:#b7791f;font-weight:600">⚠️ Baja ' + r.bajaProgramada + '</span>' : '<span style="font-size:10px;color:var(--success);font-weight:600">🏠 Disponible</span>')
      : '<span style="font-size:10px;color:var(--text3)">👤 ' + escHtml(getClienteNombre(r.clienteId)) + '</span>';
    var meta = r.fichaPDFMeta || {};
    var ext = (meta.name || '').split('.').pop().toLowerCase();
    var tipoIcon = ext === 'pdf' ? '📕' : (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp') ? '🖼️' : '📄';
    html += '<label onclick="this.querySelector(\'.waficha-check\').checked=true;waFichaCheckChange(this.querySelector(\'.waficha-check\'))" style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:background .15s">';
    html += '<input type="radio" name="waficha-radio" class="waficha-check" data-id="' + r.id + '" onchange="waFichaCheckChange(this)" style="display:none"><span class="waficha-circle" style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);background:#fff;flex-shrink:0;display:flex;align-items:center;justify-content:center;transition:all .15s"><span class="waficha-dot" style="width:12px;height:12px;border-radius:50%;background:var(--accent);display:none"></span></span>';
    html += '<span style="font-size:22px;flex-shrink:0">' + tipoIcon + '</span>';
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-weight:600;font-size:14px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + escHtml(r.nombre) + '</div>';
    html += '<div style="font-size:12px;color:var(--text3);margin-top:2px">' + statusLabel + '</div>';
    if (meta.name) html += '<div style="font-size:11px;color:var(--text3);margin-top:1px">📎 ' + escHtml(meta.name) + '</div>';
    html += '</div>';
    html += '</label>';
  });
  lista.innerHTML = html;
  if (acciones) acciones.style.display = 'flex';
  waFichaCheckChange();
}

function waFichaCheckChange(changedEl) {
  // Update visual state — custom circles
  document.querySelectorAll('.waficha-check').forEach(function(c) {
    var lbl = c.parentElement;
    if (!lbl) return;
    var circle = lbl.querySelector('.waficha-circle');
    var dot = lbl.querySelector('.waficha-dot');
    if (c.checked) {
      lbl.style.background = '#f0faf4';
      lbl.style.borderColor = 'var(--accent)';
      lbl.style.boxShadow = '0 0 0 2px rgba(27,58,45,.15)';
      if (circle) { circle.style.borderColor = 'var(--accent)'; circle.style.background = 'var(--accent)'; }
      if (dot) dot.style.display = 'block';
    } else {
      lbl.style.background = 'var(--surface)';
      lbl.style.borderColor = 'var(--border)';
      lbl.style.boxShadow = '';
      if (circle) { circle.style.borderColor = 'var(--border)'; circle.style.background = '#fff'; }
      if (dot) dot.style.display = 'none';
    }
  });
  var acciones = document.getElementById('waficha-acciones');
  if (!acciones) return;
  var checked = document.querySelector('.waficha-check:checked');
  var enviarBtn = acciones.querySelector('button[onclick="waFichaEnviar()"]');
  var hint = acciones.querySelector('div');
  if (enviarBtn) {
    if (checked) {
      var r = state.rentas.find(function(x){ return x.id === checked.dataset.id; });
      enviarBtn.textContent = '⬇️ Bajar PDF para enviar por WhatsApp o correo';
      enviarBtn.disabled = false;
      enviarBtn.style.opacity = '1';
      if (hint) hint.textContent = r ? r.nombre : '';
    } else {
      enviarBtn.textContent = '⬇️ Bajar PDF';
      enviarBtn.disabled = true;
      enviarBtn.style.opacity = '0.5';
      if (hint) hint.textContent = 'Selecciona una ficha para descargar';
    }
  }
}

function waFichaSeleccionarTodas() {
  document.querySelectorAll('.waficha-check').forEach(function(c){ c.checked = true; });
  waFichaCheckChange();
}

function waFichaDeseleccionarTodas() {
  document.querySelectorAll('.waficha-check').forEach(function(c){ c.checked = false; });
  waFichaCheckChange();
}

function waFichaEnviar() {
  var checked = document.querySelector('.waficha-check:checked');
  if (!checked) { showToast('Selecciona una ficha'); return; }
  var r = state.rentas.find(function(x){ return x.id === checked.dataset.id; });
  if (!r || !r.fichaPDF) { showToast('Esta ficha ya no está disponible'); return; }

  // Navigate same tab — Safari blocks window.open inside async callbacks
  if (r.fichaPDFStorage && _fbAuth) {
    var meta = r.fichaPDFMeta || {};
    var storageRef = storage.ref('fichas/' + _fbAuth.uid + '/' + r.id + '/' + encodeURIComponent(meta.name || 'ficha.pdf'));
    showToast('⏳ Cargando PDF...');
    storageRef.getDownloadURL().then(function(freshUrl) {
      r.fichaPDF = freshUrl;
      window.location.href = freshUrl;
    }).catch(function() {
      window.location.href = r.fichaPDF;
    });
  } else {
    window.location.href = r.fichaPDF;
  }
}

function extraCambiarPropiedad() {
  _extraRentaId = document.getElementById('extra-prop-sel').value || null;
  renderExtra();
}

function _numToLetras(n) {
  var _u = ['','UNO','DOS','TRES','CUATRO','CINCO','SEIS','SIETE','OCHO','NUEVE','DIEZ',
    'ONCE','DOCE','TRECE','CATORCE','QUINCE','DIECISÉIS','DIECISIETE','DIECIOCHO','DIECINUEVE',
    'VEINTE','VEINTIUNO','VEINTIDÓS','VEINTITRÉS','VEINTICUATRO','VEINTICINCO','VEINTISÉIS','VEINTISIETE','VEINTIOCHO','VEINTINUEVE'];
  var _d = ['','','VEINTE','TREINTA','CUARENTA','CINCUENTA','SESENTA','SETENTA','OCHENTA','NOVENTA'];
  var _c = ['','CIEN','DOSCIENTOS','TRESCIENTOS','CUATROCIENTOS','QUINIENTOS','SEISCIENTOS','SETECIENTOS','OCHOCIENTOS','NOVECIENTOS'];
  n = Math.round(n);
  if (n === 0) return 'CERO';
  if (n < 0) return 'MENOS ' + _numToLetras(-n);
  var r = '';
  if (n >= 1000000) {
    var m = Math.floor(n / 1000000);
    r += (m === 1 ? 'UN MILLÓN' : _numToLetras(m) + ' MILLONES') + ' ';
    n = n % 1000000;
  }
  if (n >= 1000) {
    var k = Math.floor(n / 1000);
    r += (k === 1 ? 'MIL' : _numToLetras(k) + ' MIL') + ' ';
    n = n % 1000;
  }
  if (n >= 100) {
    var c = Math.floor(n / 100);
    r += (n === 100 ? 'CIEN' : _c[c]) + ' ';
    n = n % 100;
  }
  if (n > 0) {
    if (n < 30) {
      r += _u[n];
    } else {
      var d = Math.floor(n / 10);
      var u = n % 10;
      r += _d[d] + (u > 0 ? ' Y ' + _u[u] : '');
    }
  }
  return r.trim();
}

function generarDocExtra(tipo) {
  const renta = (_getRentaMap()[_extraRentaId] || null);
  if (!renta) return;
  const cli = renta.clienteId ? (_getCliMap()[renta.clienteId] || null) : null;
  const fp = renta.formaPagoId ? (_getFPMap()[renta.formaPagoId] || null) : null;
  const hoy = new Date().toLocaleDateString('es-MX', { day:'2-digit', month:'long', year:'numeric' });

  // Datos del arrendador desde Configuración
  var _arrCfg = (state.configuracion && state.configuracion.arrendador) || {};
  const ciudad = _arrCfg.ciudad || 'Torreón, Coahuila';
  const arrendador = _arrCfg.nombre || '____________________';
  const arrendadorRFC = _arrCfg.rfc || '____________________';
  const arrendadorDomicilio = _arrCfg.domicilio || '____________________';
  const datosBancarios = _arrCfg.banco || '____________________';
  const diasPagoDefault = _arrCfg.diasPago || 8;

  // Datos de la propiedad y renta
  const prop = renta.nombre || '____________________';
  const monto = fmt(renta.monto || 0);
  const montoNum = renta.monto || 0;
  const montoLetras = _numToLetras(montoNum);
  const dia = renta.dia || diasPagoDefault;
  const inicio = renta.inicio ? fmtDate(renta.inicio) : '____________________';
  const fin = renta.fin ? fmtDate(renta.fin) : '____________________';
  const inicioISO = renta.inicio || '';
  const finISO = renta.fin || '';

  // Calcular meses de vigencia
  var _mesesVig = 12;
  if (inicioISO && finISO) {
    var _d1 = new Date(inicioISO + 'T12:00:00');
    var _d2 = new Date(finISO + 'T12:00:00');
    _mesesVig = Math.round((_d2 - _d1) / (1000 * 60 * 60 * 24 * 30.44)) || 12;
  }

  // Depósito: desde cliente o 1 mes por defecto
  var _depMonto = 0;
  if (cli && cli.deposito && cli.deposito.monto) {
    _depMonto = Number(cli.deposito.monto);
  } else {
    _depMonto = montoNum;
  }
  const deposito = fmt(_depMonto);
  const depositoLetras = _numToLetras(_depMonto);

  // Datos del cliente/arrendatario
  const inquilino = cli && cli.nombre ? cli.nombre : '____________________';
  const inquilinoRFC = (cli && cli.facturacion && cli.facturacion.rfc) ? cli.facturacion.rfc : '____________________';
  const inquilinoDomicilio = (cli && cli.direccion) ? cli.direccion : '____________________';
  const usoInmueble = (cli && cli.usoInmueble) ? cli.usoInmueble : 'habitacional';
  const repLegal = (cli && cli.facturacion && cli.facturacion.repLegal) ? cli.facturacion.repLegal : '';

  // Forma de pago
  const formaPagoStr = fp ? ((fp.icono ? fp.icono + ' ' : '') + fp.nombre) : (renta.formaPagoId || 'transferencia electrónica');

  // Fiador
  var _fiad = (cli && cli.fiador) || {};
  const fiadorNombre = _fiad.nombre || 'C. ____________________';
  const fiadorDomicilio = _fiad.domicilio || '____________________';
  const fiadorRFC = _fiad.rfc || '____________________';
  const fiadorIdTipo = _fiad.idTipo || 'INE';
  const fiadorIdNum = _fiad.idNum || '____________________';
  const fiadorRefPat = _fiad.refPatrimonial || '____________________';
  const tieneFiador = !!_fiad.nombre;

  let titulo = '';
  let texto = '';

  if (tipo === 'contrato') {
    titulo = 'Contrato de Arrendamiento — ' + inquilino;
    var _dom = arrendadorDomicilio || '____________________';
    texto =
'CONTRATO DE ARRENDAMIENTO\n' +
_dom + '\n\n' +
'ARRENDADOR\n' + arrendador + '\n' +
'ARRENDATARIO\n' + inquilino + '\n' +
(tieneFiador ? 'FIADOR Y OBLIGADO SOLIDARIO\n' + fiadorNombre + '\n' : '') +
'VIGENCIA\n' + inicio + ' - ' + fin + '\n' +
'RENTA MENSUAL\n' + monto + ' M.N.\n\n' +

'CONTRATO DE ARRENDAMIENTO QUE CELEBRAN POR UNA PARTE ' + arrendador.toUpperCase() +
' A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ COMO "EL ARRENDADOR" Y POR LA OTRA PARTE ' +
inquilino.toUpperCase() +
(repLegal ? ', REPRESENTADA EN ESTE ACTO POR CONDUCTO DE SU REPRESENTANTE LEGAL, EL C. ' + repLegal.toUpperCase() : '') +
' A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL ARRENDATARIO"' +
(tieneFiador ? '; ASÍ TAMBIÉN POR OTRA PARTE COMPARECE ' + fiadorNombre.toUpperCase() + ', QUIEN COMPARECE POR SUS PROPIOS DERECHOS EN SU CARÁCTER DE "FIADOR Y OBLIGADO SOLIDARIO"' : '') +
', DE CONFORMIDAD CON LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:\n\n' +

'DECLARACIONES\n\n' +

'I.- DECLARA "EL ARRENDADOR"\n\n' +
'A. Ser una persona mexicana, mayor de edad, al corriente en sus obligaciones fiscales y con domicilio ubicado en ' + arrendadorDomicilio + '.\n' +
'B. Que cuenta con su Registro Federal de Contribuyentes RFC: ' + arrendadorRFC + '.\n' +
'C. Que es legítimo propietario con derecho de uso, goce y disfrute, así como a percibir los frutos civiles del inmueble denominado ' + prop + '.\n' +
'D. Que es su interés dar en arrendamiento a "EL ARRENDATARIO" el inmueble identificado en el inciso C.\n' +
'E. Manifiesta "EL ARRENDADOR" que tiene la libre disponibilidad del bien materia de este contrato sin limitaciones ni responsabilidades de naturaleza civil, mercantil, fiscal o laboral.\n' +
'F. Que cuenta con los permisos de las autoridades correspondientes para destinar el local a los fines previstos en el presente contrato.\n\n' +

'II.- DECLARA "EL ARRENDATARIO"\n\n' +
'A. Que es una persona ' + (repLegal ? 'moral al corriente en sus obligaciones fiscales, y legalmente constituida.' : 'física, mayor de edad, al corriente en sus obligaciones fiscales.') + '\n' +
(repLegal ? 'B. Que su representante en este acto, el C. ' + repLegal + ', cuenta con las facultades necesarias para obligar a su representada en los términos del presente contrato, mismas que no le han sido revocadas o modificadas de manera alguna.\n' : '') +
'C. Que cuenta con Registro Federal de Contribuyentes RFC: ' + inquilinoRFC + '.\n' +
'D. Que conoce la ubicación del inmueble descrito en el inciso C del capítulo de Declaraciones del arrendador.\n' +
'E. Que es su deseo celebrar este contrato de arrendamiento con el fin de que se le conceda el uso y goce temporal del inmueble descrito, conforme a los términos y condiciones pactadas en el presente contrato.\n' +
'F. El objetivo de celebrar el arrendamiento es uso exclusivo: ' + usoInmueble + '.\n' +
'G. Que cuenta con la capacidad económica suficiente para pagar el presente arrendamiento.\n' +
'H. Que cuenta con un domicilio fiscal ubicado en ' + inquilinoDomicilio + '.\n\n' +

'III.- AMBAS PARTES DECLARAN:\n' +
'Reconocerse respectivamente la personalidad y capacidad con que se ostentan, por lo que suscriben de común acuerdo el presente contrato, no existiendo dolo o mala fe, así como vicios en el consentimiento.\n\n' +

'CLÁUSULAS\n\n' +

'PRIMERA. — OBJETO\n' +
'"EL ARRENDADOR" da en arrendamiento a "EL ARRENDATARIO" quien recibe en tal carácter el local identificado en la Declaración I inciso C), con todo cuanto de hecho y por derecho corresponde al referido local.\n' +
'"EL ARRENDADOR" entrega el local cumpliendo con todas y cada una de las características y especificaciones físicas, estructurales y técnicas conocidas por el "ARRENDATARIO".\n' +
'"EL ARRENDADOR" se obliga a proporcionar a "EL ARRENDATARIO" todos los documentos necesarios para efectuar los trámites para iniciar la operación y funcionamiento del local.\n' +
'"EL ARRENDADOR" permitirá al "ARRENDATARIO" la instalación de letrero luminoso en el inmueble, previa presentación de los detalles técnicos y siempre que no dañe la imagen del edificio ni vulnere los espacios de los demás inquilinos.\n\n' +

'SEGUNDA. — RENTA\n' +
'"EL ARRENDATARIO" pagará a "EL ARRENDADOR" la cantidad de ' + monto + ' (' + montoLetras + ' 00/100 M.N.) más el Impuesto al Valor Agregado correspondiente, menos las retenciones de impuestos y de IVA que procedan conforme a la legislación fiscal vigente.\n\n' +

'TERCERA. — FORMA DE PAGO\n' +
'En este acto el "ARRENDATARIO" entrega la cantidad de ' + deposito + ' (' + depositoLetras + ' 00/100 M.N.) en concepto de DEPÓSITO EN GARANTÍA, mismo que se quedará en poder del "ARRENDADOR" a efecto de garantizar cualquier retraso en el pago de servicios como agua, luz y/o cualquier otro servicio pendiente al término del contrato.\n' +
(datosBancarios && datosBancarios !== '____________________' ? '"EL ARRENDATARIO" pagará a "EL ARRENDADOR" por mensualidades adelantadas y dentro de los primeros ' + dia + ' (' + _numToLetras(Number(dia)).toLowerCase() + ') días naturales de cada mes. El pago deberá efectuarse mediante ' + datosBancarios + '.\n' : '"EL ARRENDATARIO" pagará a "EL ARRENDADOR" por mensualidades adelantadas y dentro de los primeros ' + dia + ' (' + _numToLetras(Number(dia)).toLowerCase() + ') días naturales de cada mes.\n') +
'En caso de que la renta no sea pagada dentro de los primeros ' + dia + ' días de cada mes, se pagará un interés moratorio del 3% (tres por ciento) mensual sobre el monto vencido.\n\n' +

'CUARTA. — SERVICIOS Y CUOTA DE MANTENIMIENTO\n' +
'"EL ARRENDATARIO" se obliga a mantener en condiciones funcionales el local y sus instalaciones. Cualquier servicio será contratado directamente por el "ARRENDATARIO" siendo a su exclusivo cargo la reconexión, contratación y consumo.\n\n' +

'QUINTA. — USO DE EL LOCAL\n' +
'"EL ARRENDATARIO" deberá utilizar el local únicamente para: ' + usoInmueble + '. Queda prohibido cualquier uso ilegal, peligroso o que resulte en molestia pública o privada.\n' +
'"EL ARRENDADOR" desde este momento NO permite el subarrendamiento ni el traspaso del local.\n\n' +

'SEXTA. — VIGENCIA\n' +
'La vigencia del presente contrato será FORZOSAMENTE para ambas partes por un período de ' + _mesesVig + ' (' + _numToLetras(_mesesVig).toUpperCase() + ') MESES, desde el ' + inicio + ' hasta el ' + fin + '.\n' +
'"EL ARRENDATARIO" podrá solicitar la terminación anticipada previo aviso por escrito con 60 (sesenta) días de anticipación, obligándose a pagar la pena convencional establecida en la Cláusula Trigésima Primera.\n\n' +

'SÉPTIMA. — RENOVACIÓN\n' +
'El "ARRENDATARIO" podrá solicitar la renovación del contrato notificando por escrito con 60 (sesenta) días de anticipación a la terminación del presente contrato.\n\n' +

'OCTAVA. — INCREMENTOS AL MONTO DE LA RENTA\n' +
'Concluido el primer año, en caso de renovación, el monto de renta se ajustará automáticamente cada año de manera proporcional al INPC publicado por el Banco de México en el DOF. Dicho incremento nunca podrá ser superior al 10% (diez por ciento) anual.\n\n' +

'NOVENA. — IMPUESTOS\n' +
'Serán por cuenta de "EL ARRENDADOR" los impuestos prediales y demás contribuciones que correspondan a los propios locales. En caso de adeudos previos a la entrega, el "ARRENDATARIO" podrá cubrir el pago y descontarlo del monto de la renta.\n\n' +

'DÉCIMA. — SERVICIOS\n' +
'Serán por cuenta de "EL ARRENDATARIO" el pago por agua, luz, teléfono y demás servicios contratados en el local arrendado, así como el IVA que se cause con motivo de este arrendamiento.\n\n' +

'DÉCIMA PRIMERA. — MODIFICACIONES AL LOCAL ARRENDADO\n' +
'"EL ARRENDADOR", previa autorización por escrito, facultará a "EL ARRENDATARIO" para realizar obras, adaptaciones, modificaciones o instalaciones necesarias para la operación del local, sin modificar ni afectar la estructura. Las modificaciones estructurales requieren autorización escrita expresa del "ARRENDADOR".\n' +
'Al término del contrato, todas las mejoras de carácter indesprendible quedarán a beneficio del "ARRENDADOR". Las de carácter movible podrán ser retiradas restaurando el local a su estado original.\n\n' +

'DÉCIMA SEGUNDA. — REPARACIONES Y CONSERVACIÓN\n' +
'"EL ARRENDADOR" absorbe las reparaciones derivadas del mantenimiento estructural normal: cimentación, columnas, muros, cubierta y vicios ocultos de construcción.\n' +
'"EL ARRENDATARIO" realizará a su costa las reparaciones menores derivadas del uso normal y continuo del local.\n\n' +

'DÉCIMA TERCERA. — RESPONSABILIDAD\n' +
'"EL ARRENDATARIO" responderá de cualquier daño a la estructura cuando se compruebe que se derivó por negligencia o mal uso. Asimismo, responde del incendio originado por su negligencia, por lo que se obliga a instalar extinguidores vigentes durante toda la vigencia del contrato.\n\n' +

'DÉCIMA CUARTA. — DERECHO DE INSPECCIÓN\n' +
'"EL ARRENDADOR" tendrá derecho a inspeccionar el local con una periodicidad máxima de una vez por bimestre, previa notificación por escrito con 3 (tres) días hábiles de anticipación.\n\n' +

'DÉCIMA QUINTA. — CESIÓN DE DERECHOS DEL ARRENDADOR\n' +
'El "ARRENDADOR" podrá ceder o transferir los derechos y obligaciones derivados del presente contrato, previa notificación por escrito a la otra parte con 30 (treinta) días de anticipación.\n\n' +

'DÉCIMA SEXTA. — CESIÓN DE POSICIÓN CONTRACTUAL DEL ARRENDATARIO\n' +
'"EL ARRENDATARIO" NO podrá ceder, transferir ni de cualquier otra forma transmitir su posición contractual a ninguna persona física o moral, sin el consentimiento previo y por escrito de "EL ARRENDADOR". Cualquier cesión sin dicho consentimiento será nula de pleno derecho y constituirá causa de rescisión.\n\n' +

'DÉCIMA SÉPTIMA. — CAMBIO DE RAZÓN SOCIAL\n' +
'"EL ARRENDATARIO" podrá cambiar su razón y/o denominación social sin que esto represente cambio en sus derechos y obligaciones, debiendo notificar a "EL ARRENDADOR" por escrito con 15 (quince) días de anticipación.\n\n' +

'DÉCIMA OCTAVA. — SUBARRENDAMIENTO\n' +
'Queda estrictamente prohibido el subarrendamiento del inmueble objeto del presente contrato a cualquier persona, sea física o moral.\n\n' +

'DÉCIMA NOVENA. — DEVOLUCIÓN DE EL LOCAL\n' +
'Al concluir los plazos establecidos, "EL ARRENDATARIO" deberá desocupar el local en las mismas condiciones documentadas en el Acta de Entrega-Recepción, salvo el desgaste por uso normal. Las mejoras indesprendibles quedarán a beneficio del "ARRENDADOR".\n\n' +

'VIGÉSIMA. — SEGUROS\n' +
'"EL ARRENDATARIO" se obliga a contratar y mantener vigente durante toda la vigencia del contrato un seguro de responsabilidad civil con suma asegurada mínima de $500,000.00 (QUINIENTOS MIL PESOS 00/100 M.N.), expedido por aseguradora autorizada por la CNSF.\n\n' +

'VIGÉSIMA PRIMERA. — FUERZA MAYOR O CASO FORTUITO\n' +
'Si cualquiera de las partes fallare en el cumplimiento de sus obligaciones por causa de fuerza mayor o caso fortuito, dicha parte no será responsable por pérdidas o daños por su incumplimiento, siempre que la causa sea ajena a su control razonable.\n\n' +

'VIGÉSIMA SEGUNDA. — CAUSAS DE RESCISIÓN\n' +
'"EL ARRENDADOR" podrá exigir la rescisión del presente contrato por las siguientes causas:\n' +
'Falta de pago de la renta convenida por más de dos meses consecutivos.\n' +
'Que "EL ARRENDATARIO" destine el local a fines distintos de los previstos en la Cláusula Quinta.\n' +
'Que se inicie un procedimiento de quiebra o suspensión de pagos en contra de "EL ARRENDATARIO".\n' +
'El embargo, ejecución u otra afectación judicial de todos los activos de "EL ARRENDATARIO".\n' +
'Que "EL ARRENDATARIO" no cubra los gastos y erogaciones a su cargo en los términos del presente contrato.\n' +
'Que "EL ARRENDATARIO" incumpla con cualquiera de las obligaciones contenidas en el presente contrato.\n' +
'Que "EL ARRENDATARIO" se niegue injustificadamente a permitir la inspección del local conforme a la Cláusula Décima Cuarta.\n' +
'Que "EL ARRENDATARIO" incumpla con la obligación de contratar y mantener vigente el seguro de responsabilidad civil previsto en la Cláusula Vigésima.\n' +
'En caso de que el arrendatario no haga entrega del local y lo siga ocupando después de aplicada la rescisión, estará obligado a pagar una pena convencional equivalente a dos rentas mensuales por cada mes de ocupación indebida, sin perjuicio de daños y perjuicios adicionales.\n\n' +

'VIGÉSIMA TERCERA. — DOMICILIOS\n' +
'Los otorgantes señalan como domicilio convencional para el cumplimiento de las obligaciones derivadas del arrendamiento los siguientes:\n' +
'"EL ARRENDADOR": ' + arrendadorDomicilio + '.\n' +
'"EL ARRENDATARIO": ' + inquilinoDomicilio + '.\n\n' +

'VIGÉSIMA CUARTA. — JURISDICCIÓN\n' +
'Para la interpretación, ejecución y cumplimiento del presente Contrato, las partes convienen en someterse a la jurisdicción y competencia de los Tribunales de la ciudad de ' + ciudad.toUpperCase() + ', renunciando a cualquier otro fuero.\n\n' +

'VIGÉSIMA QUINTA. — NOTIFICACIONES\n' +
'Cualquier comunicación deberá constar por escrito, entregada de forma personal o por correo certificado con acuse de recibo, surtiendo efectos a partir del día hábil inmediato siguiente a su recepción, en los domicilios señalados en la Cláusula Vigésima Tercera.\n\n' +

'VIGÉSIMA SEXTA. — DIVISIBILIDAD\n' +
'Si un tribunal declara nula, inválida o inejecutable cualquier estipulación de este contrato, las demás disposiciones continuarán en pleno vigor y vigencia.\n\n' +

'VIGÉSIMA SÉPTIMA. — MODIFICACIONES\n' +
'Toda modificación a los términos, plazo y condiciones de este contrato deberá otorgarse expresamente por escrito mediante acuerdo firmado por ambas partes.\n\n' +

'VIGÉSIMA OCTAVA. — ACUERDO TOTAL\n' +
'El presente contrato constituye la totalidad de los acuerdos entre las partes y deja sin efecto cualquier otro acuerdo previo, ya sea oral o escrito.\n\n' +

'VIGÉSIMA NOVENA. — DERECHO DE PREFERENCIA\n' +
'Para cualquier aplazamiento o renovación, el "ARRENDATARIO" contará con derecho de preferencia sobre cualquier otra persona, aplicable únicamente en cuestiones de arrendamiento y no de venta.\n\n' +

'TRIGÉSIMA. — PLAZO DE GRACIA\n' +
'En caso de haberse pactado un período de gracia, durante dicho período no se generará obligación de pago de renta. La primera renta corresponderá al período acordado entre las partes.\n\n' +

'TRIGÉSIMA PRIMERA. — PENA CONVENCIONAL POR TERMINACIÓN ANTICIPADA\n' +
'En el caso de que el "ARRENDATARIO" solicite la terminación anticipada del contrato conforme a la Cláusula Sexta, con aviso previo por escrito de 60 días, la pena convencional será de 3 (tres) meses de renta vigente. Si el "ARRENDATARIO" desocupa sin dar el aviso de 60 días, la pena será de 3 meses de renta más los días proporcionales correspondientes al período de aviso omitido.\n\n' +

'TRIGÉSIMA SEGUNDA. — RELACIONES LABORALES INDEPENDIENTES\n' +
'El "ARRENDATARIO" libera al "ARRENDADOR" de cualquier controversia laboral con sus empleados en el inmueble. En ningún caso se podrá considerar al "ARRENDADOR" como obligado solidario de controversias obrero-patronales.\n\n' +

(tieneFiador ?
'TRIGÉSIMA TERCERA. — EL FIADOR\n' +
'Se constituye como Fiador y obligado solidario el ' + fiadorNombre + ', con domicilio en ' + fiadorDomicilio + '.\n' +
'RFC del Fiador: ' + fiadorRFC + '   Identificación: ' + fiadorIdTipo + '   No.: ' + fiadorIdNum + '\n' +
'Referencia Patrimonial: ' + fiadorRefPat + '\n' +
'Se constituye FIADOR ante EL ARRENDADOR respecto a todas y cada una de las obligaciones a cargo de EL ARRENDATARIO, sin reserva, limitación ni condición alguna. La responsabilidad del FIADOR no cesa sino hasta que EL ARRENDADOR le extienda constancia por escrito de que EL ARRENDATARIO ha cumplido con todas sus obligaciones.\n' +
'El FIADOR renuncia expresamente a los beneficios que le otorgan los Artículos 3257, 3263, 3264, 3305, 3311, 3312, 3313, 3314 y demás del Código Civil Vigente en el Estado de Coahuila.\n\n'
: '') +

'TRIGÉSIMA CUARTA. — CLÁUSULA DE PRIVACIDAD\n' +
'Ambas Partes se obligan a respetar y cumplir íntegramente con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y otorgan su consentimiento para el trato de sus datos personales una con la otra.\n\n' +

'Leído que fue por las partes y debidamente enteradas de su contenido y alcance legal, lo firman de conformidad manifestando que no existe error, dolo o mala fe, suscribiéndose por duplicado en la Ciudad de ' + ciudad + ', el día ' + hoy + '.\n\n\n' +

'"EL ARRENDADOR"\n\n\n____________________________\n' + arrendador.toUpperCase() + '\n\n\n' +
'"EL ARRENDATARIO"\n\n\n____________________________\n' + inquilino.toUpperCase() + (repLegal ? '\nRep. Legal: ' + repLegal : '') + '\n' +
(tieneFiador ? '\n\n"EL FIADOR"\n\n\n____________________________\n' + fiadorNombre.toUpperCase() + '\n' : '') +
'\n\nTESTIGOS\n\n____________________________          ____________________________\n';
  }
  else if (tipo === 'ficha') {
    titulo = 'Ficha de Presentación';
    texto = `════════════════════════════════════════════
         PROPIEDAD EN RENTA
════════════════════════════════════════════

🏠 ${prop}
🏷️ Tipo: ${renta.tipo || 'Propiedad'}

──────────────────────────────────────────
DATOS DE LA RENTA
──────────────────────────────────────────
💰 Renta mensual:    ${monto}
📅 Disponible desde: ${inicio || '____________________'}
🔑 Depósito:         ${deposito} (2 meses)
📆 Día de pago:      Día ${dia} de cada mes
${fp ? '💳 Forma de pago: ' + fp.nombre : ''}

──────────────────────────────────────────
CARACTERÍSTICAS
──────────────────────────────────────────
${renta.notas || '• Escribe aquí las características de la propiedad:\n  habitaciones, baños, estacionamiento, etc.'}

──────────────────────────────────────────
SERVICIOS INCLUIDOS
──────────────────────────────────────────
${(renta.servicios||[]).length
  ? (renta.servicios||[]).map(s => `• ${s.nombre}${s.cuenta ? ' (No. ' + s.cuenta + ')' : ''}`).join('\n')
  : '• ____________________\n• ____________________'}

──────────────────────────────────────────
CONTACTO
──────────────────────────────────────────
📞 Tel: ____________________
📧 Email: ____________________

Generado el ${hoy}
════════════════════════════════════════════`;
  }

  else if (tipo === 'entrega') {
    titulo = 'Acta de Entrega / Recepción';
    const inventario = renta.inventario || [];
    texto = `ACTA DE ENTREGA DEL INMUEBLE

Lugar y fecha: ${ciudad}, ${hoy}

DATOS DE LAS PARTES:
Arrendador: ${arrendador}
Arrendatario: ${inquilino}
Inmueble: ${prop}

Por medio del presente documento, el Arrendador hace entrega formal del Inmueble antes descrito al Arrendatario, quien lo recibe en las condiciones siguientes:

ESTADO GENERAL DEL INMUEBLE:
□ Bueno    □ Regular    □ Con observaciones (ver abajo)

LLAVES ENTREGADAS:
• Llave principal:      ____ juego(s)
• Llave de garage:      ____ juego(s)
• Control remoto:       ____ pieza(s)
• Otros: ____________________

${inventario.length ? `INVENTARIO DE BIENES INCLUIDOS:
${inventario.map(it => `• ${it.nombre} (${it.cantidad||1} pieza${(it.cantidad||1)>1?'s':''}) — Estado: ${it.estado==='malo'?'Malo':it.estado==='regular'?'Regular':'Bueno'}`).join('\n')}` : `INVENTARIO DE BIENES INCLUIDOS:
• ____________________
• ____________________
• ____________________`}

OBSERVACIONES Y CONDICIONES ESPECIALES:
________________________________________________________
________________________________________________________
________________________________________________________

Con la firma del presente documento, el Arrendatario declara haber recibido el Inmueble y todos los bienes descritos a su entera satisfacción, comprometiéndose a devolverlos en las mismas condiciones al término del contrato.
──────────────────────────────    ──────────────────────────────
ENTREGA: EL ARRENDADOR            RECIBE: EL ARRENDATARIO
${arrendador}                      ${inquilino}

Fecha: ______________________     Fecha: ______________________
`;
  }

  else if (tipo === 'deposito') {
    titulo = 'Recibo de Depósito en Garantía';
    texto = `RECIBO DE DEPÓSITO EN GARANTÍA

Folio: ____________

Lugar y fecha: ${ciudad}, ${hoy}

Por medio del presente recibo, yo ${arrendador}, en calidad de Arrendador del inmueble ubicado en:

${prop}

DECLARO HABER RECIBIDO:

Del C. ${inquilino}, en calidad de Arrendatario, la cantidad de:

██████████████████████████████
${deposito}
(Equivalente a dos meses de renta)
██████████████████████████████

Concepto: Depósito en garantía correspondiente al contrato de arrendamiento con vigencia del ${inicio} al ${fin}.

CONDICIONES DE DEVOLUCIÓN:
El depósito será devuelto íntegramente al Arrendatario al término del contrato siempre que:
1. El inmueble sea entregado en las condiciones en que fue recibido.
2. No existan adeudos de renta, servicios o reparaciones pendientes.
3. Se haya dado aviso previo de desocupación conforme al contrato.

En caso de daños o adeudos, el Arrendador podrá descontar del depósito las cantidades correspondientes.
──────────────────────────────    ──────────────────────────────
QUIEN RECIBE: ARRENDADOR          QUIEN ENTREGA: ARRENDATARIO
${arrendador}                      ${inquilino}
${cli && cli.tel ? 'Tel: ' + cli.tel : ''}

Fecha: ______________________     Fecha: ______________________
`;
  }

  else if (tipo === 'salida') {
    titulo = 'Acta de Devolución / Salida';
    const inventario = renta.inventario || [];
    texto = `ACTA DE DEVOLUCIÓN Y SALIDA DEL INMUEBLE

Lugar y fecha: ${ciudad}, ${hoy}

DATOS:
Arrendador: ${arrendador}
Arrendatario: ${inquilino}
Inmueble: ${prop}
Contrato vigente: ${inicio} al ${fin}

Por medio del presente documento, el Arrendatario hace devolución formal del Inmueble al Arrendador, quien lo recibe en las siguientes condiciones:

ESTADO GENERAL AL MOMENTO DE LA ENTREGA:
□ Bueno    □ Regular    □ Con observaciones (ver abajo)

LLAVES DEVUELTAS:
• Llave principal:      ____ juego(s)
• Llave de garage:      ____ juego(s)
• Control remoto:       ____ pieza(s)
• Otros: ____________________

${inventario.length ? `VERIFICACIÓN DE INVENTARIO:
${inventario.map(it => `• ${it.nombre} (${it.cantidad||1} pza) — Estado al entrar: ${it.estado==='malo'?'Malo':it.estado==='regular'?'Regular':'Bueno'} — Estado al salir: ____________`).join('\n')}` : `VERIFICACIÓN DE INVENTARIO:
• ____________________  Estado al salir: ____________
• ____________________  Estado al salir: ____________`}

SERVICIOS AL CORRIENTE:
□ Luz        □ Agua       □ Gas       □ Internet
□ Otros: ____________________

ADEUDOS PENDIENTES:
□ Sin adeudos
□ Con adeudos por: $____________________ concepto: ____________________

RESOLUCIÓN DEL DEPÓSITO (${deposito}):
□ Se devuelve íntegramente al Arrendatario
□ Se devuelve parcialmente: $______________ (descontando $___________ por: ____________)
□ Se retiene por adeudos o daños (ver detalle en observaciones)

OBSERVACIONES:
________________________________________________________
________________________________________________________

Con la firma del presente documento, ambas partes dan por terminado el contrato de arrendamiento sin ulterior reclamación, salvo lo expresamente indicado.
──────────────────────────────    ──────────────────────────────
EL ARRENDADOR                     EL ARRENDATARIO
${arrendador}                      ${inquilino}

Fecha: ______________________     Fecha: ______________________
TESTIGO 1: ____________________   TESTIGO 2: ____________________
`;
  }

  else if (tipo === 'rescision') {
    titulo = 'Rescisión de Contrato de Arrendamiento';
    // Detect clauses violated — build list from renta data
    const saldoPend = (() => {
      try { return getStatusRenta(renta).saldo; } catch(e) { return 0; }
    })();
    const mesesAdeudo = saldoPend > 0 ? Math.ceil(saldoPend / (renta.monto||1)) : 0;

    texto = `RESCISIÓN DE CONTRATO DE ARRENDAMIENTO

En la ciudad de ${ciudad}, siendo el día ${hoy}, comparecen:

EL ARRENDADOR: ${arrendador}, en adelante "el Arrendador".
EL ARRENDATARIO: ${inquilino}, en adelante "el Arrendatario".
${cli && cli.tel ? 'Teléfono del Arrendatario: ' + cli.tel : ''}
${cli && cli.email ? 'Correo del Arrendatario: ' + cli.email : ''}

ANTECEDENTES:
Con fecha ${inicio}, las partes celebraron un Contrato de Arrendamiento sobre el inmueble
ubicado en: ${prop}, con vigencia hasta el ${fin} y una renta mensual de ${monto}.

CAUSAS DE RESCISIÓN:
El Arrendador manifiesta que el Arrendatario ha incurrido en los siguientes incumplimientos,
que constituyen causal de rescisión conforme al contrato celebrado y la legislación vigente:

${saldoPend > 0
  ? `□ [X] FALTA DE PAGO. El Arrendatario presenta un saldo vencido de ${fmt(saldoPend)},
         equivalente a aproximadamente ${mesesAdeudo} mes(es) de renta sin cubrir,
         incumpliendo la Cláusula Cuarta del contrato.`
  : `□ [ ] FALTA DE PAGO. Monto adeudado: $____________________`}

□ [ ] USO INDEBIDO DEL INMUEBLE. El Arrendatario ha destinado el inmueble a un uso
       distinto al pactado, en contravención a la Cláusula Segunda del contrato.

□ [ ] SUBARRENDAMIENTO NO AUTORIZADO. El Arrendatario ha subarrendado o cedido el
       uso del inmueble sin consentimiento escrito del Arrendador, violando la Cláusula Segunda.

□ [ ] DAÑOS AL INMUEBLE. El Arrendatario ha causado daños al inmueble que exceden el
       desgaste natural por uso ordinario, en contravención a la Cláusula Séptima.

□ [ ] ALTERACIONES NO AUTORIZADAS. El Arrendatario realizó modificaciones o
       remodelaciones al inmueble sin autorización escrita, violando la Cláusula Octava.

□ [ ] SERVICIOS IMPAGOS. El Arrendatario no ha cubierto los servicios a su cargo
       (luz, agua, gas u otros), poniendo en riesgo el inmueble.

□ [ ] OTRO INCUMPLIMIENTO: _________________________________________________
       ______________________________________________________________________

EFECTOS DE LA RESCISIÓN:
En virtud de lo anterior, el Arrendador declara rescindido el presente contrato, con los
siguientes efectos:

1. DESOCUPACIÓN. El Arrendatario deberá desocupar y entregar el inmueble libre de
   personas y bienes, en perfectas condiciones de limpieza y conservación, a más tardar
   el día: __________________ (plazo máximo de 15 días naturales a partir de este aviso).

2. ADEUDOS. El Arrendatario queda obligado a cubrir los adeudos pendientes de renta y
   servicios hasta la fecha de desocupación efectiva:
   Saldo pendiente de renta:  ${saldoPend > 0 ? fmt(saldoPend) : '$____________________'}
   Servicios pendientes:       $____________________
   Daños al inmueble:          $____________________
   TOTAL A CUBRIR:             $____________________

3. DEPÓSITO EN GARANTÍA. El depósito en garantía de ${deposito} quedará retenido por
   el Arrendador y se aplicará al pago de los adeudos y daños detallados. En caso de que
   el depósito sea insuficiente, el Arrendatario se obliga a cubrir la diferencia.

4. PENALIDAD POR RESCISIÓN. Conforme a lo pactado en la Cláusula Novena, el
   Arrendatario deberá cubrir adicionalmente la penalidad de: $____________________

5. ACCIONES LEGALES. El incumplimiento de los términos de este documento faculta al
   Arrendador para ejercer las acciones legales correspondientes ante los tribunales
   competentes de ${ciudad}, incluyendo el proceso de desahucio y cobro de adeudos.

ACUSE DE RECIBO:
El Arrendatario declara haber recibido el presente aviso de rescisión y estar enterado
de su contenido, plazos y consecuencias legales.
──────────────────────────────    ──────────────────────────────
EL ARRENDADOR                     EL ARRENDATARIO
${arrendador}                      ${inquilino}

Firma: ______________________     Firma: ______________________
Fecha: ${hoy}                      Fecha: ______________________
──────────────────────────────
TESTIGO
Nombre: ____________________
Firma:  ____________________
Fecha:  ____________________

Documento generado por GestorRenta — ${hoy}
`;
  }

  _docTextoActual = texto;
  _docTituloActual = titulo;
  document.getElementById('doc-extra-title').textContent = titulo;
  document.getElementById('doc-extra-body').textContent = texto;
  // Show Word download button only for contracts
  var _wordBtn = document.getElementById('btn-descargar-word');
  if (_wordBtn) _wordBtn.style.display = (tipo === 'contrato') ? '' : 'none';
  openModal('modalDocExtra');
}

function descargarWordContrato() {
  // Load docx library on demand if not already loaded
  if (!window._docxLoaded) {
    _loadDocx(function() { descargarWordContrato(); });
    showToast('⏳ Cargando librería Word...');
    return;
  }
  var D = window.docx;

  function N(txt) { return new D.TextRun({ text: txt, font: 'Arial', size: 20 }); }
  function V(txt) { return new D.TextRun({ text: txt || '', bold: true, highlight: 'yellow', font: 'Arial', size: 20 }); }
  function M(lbl) { return new D.TextRun({ text: lbl || 'XXXXXXXXXX', bold: true, highlight: 'yellow', font: 'Arial', size: 20 }); }
  function B(txt, sz, col) { return new D.TextRun({ text: txt, bold: true, font: 'Arial', size: sz || 20, color: col || '000000' }); }

  function p(runs) {
    return new D.Paragraph({ children: runs, spacing: { before: 0, after: 100 } });
  }
  function pH(txt) {
    return new D.Paragraph({
      children: [new D.TextRun({ text: txt, bold: true, font: 'Arial', size: 21, color: '1B3A6B' })],
      spacing: { before: 200, after: 60 }
    });
  }
  function pBlank() { return new D.Paragraph({ children: [N('')], spacing: { after: 80 } }); }

  function hdrLabel(txt) {
    return new D.Paragraph({
      children: [new D.TextRun({ text: txt, bold: true, font: 'Arial', size: 18, color: 'FFFFFF' })],
      alignment: 'center',
      shading: { type: 'clear', fill: '1B3A6B', color: 'auto' },
      spacing: { before: 0, after: 0 }
    });
  }
  function hdrValue(val, filled) {
    return new D.Paragraph({
      children: [filled && val ? V(val) : M(val || 'XXXXXXXXXX')],
      alignment: 'center',
      shading: { type: 'clear', fill: 'EBF3FB', color: 'auto' },
      spacing: { before: 0, after: 40 }
    });
  }
  function sigBlock(label, name) {
    return [
      new D.Paragraph({
        children: [N('_________________________________')],
        alignment: 'center',
        spacing: { before: 720, after: 60 }
      }),
      new D.Paragraph({
        children: [new D.TextRun({ text: label, bold: true, font: 'Arial', size: 22, color: '1B3A6B' })],
        alignment: 'center',
        spacing: { before: 0, after: 40 }
      }),
      new D.Paragraph({
        children: [name ? V(name.toUpperCase()) : M()],
        alignment: 'center',
        spacing: { before: 0, after: 0 }
      })
    ];
  }

  // DATA
  var renta = (_getRentaMap()[_extraRentaId] || null);
  if (!renta) { showToast('Error: no se encontró la propiedad'); return; }
  var cli = renta.clienteId ? (_getCliMap()[renta.clienteId] || null) : null;
  var cfg = (state.configuracion && state.configuracion.arrendador) || {};
  var hoy = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });

  var arrendador    = renta.arrendadorProp || cfg.nombre    || null;
  var arrendadorRFC = renta.arrendadorRFCProp || cfg.rfc   || null;
  var arrendadorDom = renta.arrendadorDomicilioProp || cfg.domicilio || null;
  var banco         = cfg.banco     || null;
  var ciudad        = cfg.ciudad    || null;
  var diasNum       = Number(cfg.diasPago || renta.dia) || 8;
  var diasLetras    = _numToLetras(diasNum).toLowerCase();
  // Property-specific address overrides config
  var inmuebleDireccion = renta.direccionInmueble || renta.nombre || null;
  var inmuebleDesc      = renta.descripcionContrato || null;

  var inquilino    = cli ? cli.nombre : null;
  var inquilinoRFC = (cli && cli.facturacion && cli.facturacion.rfc) ? cli.facturacion.rfc : null;
  var inquilinoDom = (cli && cli.direccion) ? cli.direccion : null;
  var repLegal     = (cli && cli.facturacion && cli.facturacion.repLegal) ? cli.facturacion.repLegal : null;
  var usoInmueble  = (cli && cli.usoInmueble) ? cli.usoInmueble : null;
  var prop         = renta.nombre || null;
  var montoNum     = Number(renta.monto) || 0;
  var monto        = montoNum ? fmt(montoNum) : null;
  var montoLetras  = montoNum ? _numToLetras(montoNum) : null;
  var inicio       = renta.inicio ? fmtDate(renta.inicio) : null;
  var fin          = renta.fin ? fmtDate(renta.fin) : null;
  var _depMonto    = (cli && cli.deposito && cli.deposito.monto) ? Number(cli.deposito.monto) : montoNum;
  var deposito       = _depMonto ? fmt(_depMonto) : null;
  var depositoLetras = _depMonto ? _numToLetras(_depMonto) : null;

  var _mesesVig = 12;
  if (renta.inicio && renta.fin) {
    var _d1 = new Date(renta.inicio + 'T12:00:00');
    var _d2 = new Date(renta.fin + 'T12:00:00');
    _mesesVig = Math.round((_d2 - _d1) / (1000 * 60 * 60 * 24 * 30.44)) || 12;
  }

  var fiad = (cli && cli.fiador) || {};
  var fiadorNombre = fiad.nombre || null;
  var fiadorDom    = fiad.domicilio || null;
  var fiadorRFC    = fiad.rfc || null;
  var fiadorIdTipo = fiad.idTipo || 'INE';
  var fiadorIdNum  = fiad.idNum || null;
  var fiadorRefPat = fiad.refPatrimonial || null;
  var tieneFiador  = !!fiadorNombre;

  var ch = [];

  // TITLE
  ch.push(new D.Paragraph({
    children: [new D.TextRun({ text: 'CONTRATO DE ARRENDAMIENTO', bold: true, font: 'Arial', size: 32, color: '1B3A6B' })],
    alignment: 'center', spacing: { after: 60 }
  }));
  ch.push(new D.Paragraph({
    children: [inmuebleDireccion ? V(inmuebleDireccion) : M('DOMICILIO DEL ARRENDADOR')],
    alignment: 'center', spacing: { after: 160 }
  }));

  // HEADER
  ch.push(hdrLabel('ARRENDADOR'));
  ch.push(hdrValue(arrendador, !!arrendador));
  ch.push(hdrLabel('ARRENDATARIO'));
  ch.push(hdrValue(inquilino, !!inquilino));
  ch.push(hdrLabel('FIADOR Y OBLIGADO SOLIDARIO'));
  ch.push(hdrValue(fiadorNombre, !!fiadorNombre));
  ch.push(hdrLabel('VIGENCIA'));
  ch.push(new D.Paragraph({
    children: [inicio ? V(inicio) : M(), N(' - '), fin ? V(fin) : M()],
    alignment: 'center', shading: { type: 'clear', fill: 'EBF3FB', color: 'auto' },
    spacing: { before: 0, after: 40 }
  }));
  ch.push(hdrLabel('RENTA MENSUAL'));
  ch.push(hdrValue(monto ? monto + ' M.N.' : null, !!monto));
  ch.push(pBlank());

  // OPENING
  var openRuns = [N('CONTRATO DE ARRENDAMIENTO QUE CELEBRAN POR UNA PARTE '), arrendador ? V(arrendador.toUpperCase()) : M('NOMBRE ARRENDADOR'), N(' A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ COMO "EL ARRENDADOR" Y POR LA OTRA PARTE '), inquilino ? V(inquilino.toUpperCase()) : M('NOMBRE ARRENDATARIO')];
  if (repLegal) { openRuns.push(N(', REPRESENTADA POR SU REPRESENTANTE LEGAL, EL C. ')); openRuns.push(V(repLegal.toUpperCase())); }
  openRuns.push(N(' A QUIEN EN LO SUCESIVO SE LE DENOMINARÁ "EL ARRENDATARIO"'));
  if (tieneFiador) { openRuns.push(N('; ASÍ TAMBIÉN COMPARECE ')); openRuns.push(V(fiadorNombre.toUpperCase())); openRuns.push(N(' EN SU CARÁCTER DE "FIADOR Y OBLIGADO SOLIDARIO"')); }
  openRuns.push(N(', DE CONFORMIDAD CON LAS SIGUIENTES DECLARACIONES Y CLÁUSULAS:'));
  ch.push(p(openRuns));
  ch.push(pBlank());

  // DECLARACIONES
  ch.push(pH('DECLARACIONES'));
  ch.push(pH('I.- DECLARA "EL ARRENDADOR"'));
  ch.push(p([N('A. Ser una persona mexicana, mayor de edad, al corriente en sus obligaciones fiscales y con domicilio ubicado en '), arrendadorDom ? V(arrendadorDom) : M(), N('.')]));
  ch.push(p([N('B. Que cuenta con su Registro Federal de Contribuyentes RFC: '), arrendadorRFC ? V(arrendadorRFC) : M(), N('.')]));
  ch.push(p([N('C. Que es legítimo propietario del inmueble denominado '), prop ? V(prop) : M(), inmuebleDesc ? N(', siendo: ' + inmuebleDesc) : N(''), N('.')]));
  ch.push(p([N('D. Que es su interés dar en arrendamiento a "EL ARRENDATARIO" el inmueble identificado en el inciso C.')]));
  ch.push(p([N('E. Manifiesta "EL ARRENDADOR" que tiene la libre disponibilidad del bien materia de este contrato sin limitaciones ni responsabilidades de naturaleza civil, mercantil, fiscal o laboral.')]));
  ch.push(p([N('F. Que cuenta con los permisos de las autoridades correspondientes para destinar el local a los fines previstos en el presente contrato.')]));
  ch.push(pBlank());

  ch.push(pH('II.- DECLARA "EL ARRENDATARIO"'));
  if (repLegal) {
    ch.push(p([N('A. Que es una persona moral al corriente en sus obligaciones fiscales, y legalmente constituida.')]));
    ch.push(p([N('B. Que su representante en este acto, el C. '), V(repLegal), N(', cuenta con las facultades necesarias para obligar a su representada.')]));
  } else {
    ch.push(p([N('A. Que es una persona física, mayor de edad, al corriente en sus obligaciones fiscales.')]));
  }
  ch.push(p([N('C. Que cuenta con su Registro Federal de Contribuyentes RFC: '), inquilinoRFC ? V(inquilinoRFC) : M(), N('.')]));
  ch.push(p([N('D. Que conoce la ubicación del inmueble descrito en el inciso C del capítulo de Declaraciones del arrendador.')]));
  ch.push(p([N('E. Que es su deseo celebrar este contrato con el fin de que se le conceda el uso y goce temporal del inmueble.')]));
  ch.push(p([N('F. El objetivo de celebrar el arrendamiento es uso exclusivo: '), usoInmueble ? V(usoInmueble) : M(), N('.')]));
  ch.push(p([N('G. Que cuenta con la capacidad económica suficiente para pagar el presente arrendamiento.')]));
  ch.push(p([N('H. Que cuenta con un domicilio fiscal ubicado en '), inquilinoDom ? V(inquilinoDom) : M(), N('.')]));
  ch.push(pBlank());

  ch.push(pH('III.- AMBAS PARTES DECLARAN:'));
  ch.push(p([N('Reconocerse respectivamente la personalidad y capacidad con que se ostentan, por lo que suscriben de común acuerdo el presente contrato, no existiendo dolo o mala fe, así como vicios en el consentimiento.')]));
  ch.push(pBlank());
  ch.push(pH('CLÁUSULAS'));

  ch.push(pH('PRIMERA. — OBJETO'));
  ch.push(p([N('"EL ARRENDADOR" da en arrendamiento a "EL ARRENDATARIO" quien recibe en tal carácter el local identificado en la Declaración I inciso C), con todo cuanto de hecho y por derecho corresponde al referido local. "EL ARRENDADOR" entrega el local cumpliendo con todas las características y especificaciones físicas, estructurales y técnicas conocidas por el "ARRENDATARIO".')]));

  ch.push(pH('SEGUNDA. — RENTA'));
  ch.push(p([N('"EL ARRENDATARIO" pagará a "EL ARRENDADOR" la cantidad de '), monto ? V(monto) : M(), N(' ('), montoLetras ? V(montoLetras + ' 00/100 M.N.') : M(), N(') más el Impuesto al Valor Agregado correspondiente, menos las retenciones de impuestos y de IVA que procedan conforme a la legislación fiscal vigente.')]));

  ch.push(pH('TERCERA. — FORMA DE PAGO'));
  ch.push(p([N('En este acto el "ARRENDATARIO" entrega la cantidad de '), deposito ? V(deposito) : M(), N(' ('), depositoLetras ? V(depositoLetras + ' 00/100 M.N.') : M(), N(') en concepto de DEPÓSITO EN GARANTÍA.')]));
  var pagoRuns = [N('"EL ARRENDATARIO" pagará a "EL ARRENDADOR" por mensualidades adelantadas y dentro de los primeros '), V(String(diasNum)), N(' ('), V(diasLetras), N(') días naturales de cada mes.')];
  if (banco) { pagoRuns.push(N(' El pago deberá efectuarse mediante ')); pagoRuns.push(V(banco)); pagoRuns.push(N('.')); }
  ch.push(p(pagoRuns));
  ch.push(p([N('En caso de que la renta no sea pagada dentro de los primeros '), V(String(diasNum)), N(' días de cada mes, se pagará un interés moratorio del 3% (tres por ciento) mensual sobre el monto vencido.')]));

  ch.push(pH('CUARTA. — SERVICIOS Y CUOTA DE MANTENIMIENTO'));
  ch.push(p([N('"EL ARRENDATARIO" se obliga a mantener en condiciones funcionales el local y sus instalaciones. Cualquier servicio será contratado directamente por el "ARRENDATARIO" siendo a su exclusivo cargo la reconexión, contratación y consumo.')]));

  ch.push(pH('QUINTA. — USO DE EL LOCAL'));
  ch.push(p([N('"EL ARRENDATARIO" deberá utilizar el local únicamente para: '), usoInmueble ? V(usoInmueble) : M(), N('. Queda prohibido cualquier uso ilegal, peligroso o que resulte en molestia pública o privada.')]));
  ch.push(p([N('"EL ARRENDADOR" desde este momento NO permite el subarrendamiento ni el traspaso del local.')]));

  ch.push(pH('SEXTA. — VIGENCIA'));
  ch.push(p([N('La vigencia del presente contrato será FORZOSAMENTE para ambas partes por un período de '), V(String(_mesesVig)), N(' ('), V(_numToLetras(_mesesVig).toUpperCase()), N(') MESES, desde el '), inicio ? V(inicio) : M(), N(' hasta el '), fin ? V(fin) : M(), N('.')]));
  ch.push(p([N('"EL ARRENDATARIO" podrá solicitar la terminación anticipada previo aviso por escrito con 60 (sesenta) días de anticipación, obligándose a pagar la pena convencional establecida en la Cláusula Trigésima Primera.')]));

  ch.push(pH('SÉPTIMA. — RENOVACIÓN'));
  ch.push(p([N('El "ARRENDATARIO" podrá solicitar la renovación del contrato notificando por escrito con 60 (sesenta) días de anticipación a la terminación del presente contrato.')]));

  ch.push(pH('OCTAVA. — INCREMENTOS AL MONTO DE LA RENTA'));
  ch.push(p([N('Concluido el primer año, en caso de renovación, el monto de renta se ajustará automáticamente cada año de manera proporcional al INPC publicado por el Banco de México en el DOF. Dicho incremento nunca podrá ser superior al 10% (diez por ciento) anual.')]));

  ch.push(pH('NOVENA. — IMPUESTOS'));
  ch.push(p([N('Serán por cuenta de "EL ARRENDADOR" los impuestos prediales y demás contribuciones que correspondan a los propios locales.')]));

  ch.push(pH('DÉCIMA. — SERVICIOS'));
  ch.push(p([N('Serán por cuenta de "EL ARRENDATARIO" el pago por agua, luz, teléfono y demás servicios contratados en el local arrendado, así como el IVA que se cause con motivo de este arrendamiento.')]));

  ch.push(pH('DÉCIMA PRIMERA. — MODIFICACIONES AL LOCAL ARRENDADO'));
  ch.push(p([N('"EL ARRENDADOR", previa autorización por escrito, facultará a "EL ARRENDATARIO" para realizar obras, adaptaciones o instalaciones necesarias para la operación del local, sin modificar ni afectar la estructura. Al término del contrato, las mejoras indesprendibles quedarán a beneficio del "ARRENDADOR".')]));

  ch.push(pH('DÉCIMA SEGUNDA. — REPARACIONES Y CONSERVACIÓN'));
  ch.push(p([N('"EL ARRENDADOR" absorbe las reparaciones derivadas del mantenimiento estructural normal: cimentación, columnas, muros, cubierta y vicios ocultos de construcción. "EL ARRENDATARIO" realizará a su costa las reparaciones menores derivadas del uso normal y continuo del local.')]));

  ch.push(pH('DÉCIMA TERCERA. — RESPONSABILIDAD'));
  ch.push(p([N('"EL ARRENDATARIO" responderá de cualquier daño a la estructura cuando se compruebe que se derivó por negligencia o mal uso. Se obliga a instalar extinguidores vigentes durante toda la vigencia del contrato.')]));

  ch.push(pH('DÉCIMA CUARTA. — DERECHO DE INSPECCIÓN'));
  ch.push(p([N('"EL ARRENDADOR" tendrá derecho a inspeccionar el local con una periodicidad máxima de una vez por bimestre, previa notificación por escrito con 3 (tres) días hábiles de anticipación.')]));

  ch.push(pH('DÉCIMA QUINTA. — CESIÓN DE DERECHOS DEL ARRENDADOR'));
  ch.push(p([N('El "ARRENDADOR" podrá ceder o transferir los derechos y obligaciones derivados del presente contrato, previa notificación por escrito con 30 (treinta) días de anticipación.')]));

  ch.push(pH('DÉCIMA SEXTA. — CESIÓN DE POSICIÓN CONTRACTUAL DEL ARRENDATARIO'));
  ch.push(p([N('"EL ARRENDATARIO" NO podrá ceder su posición contractual sin el consentimiento previo y por escrito de "EL ARRENDADOR". Cualquier cesión sin dicho consentimiento será nula de pleno derecho y constituirá causa de rescisión.')]));

  ch.push(pH('DÉCIMA SÉPTIMA. — CAMBIO DE RAZÓN SOCIAL'));
  ch.push(p([N('"EL ARRENDATARIO" podrá cambiar su razón y/o denominación social notificando a "EL ARRENDADOR" por escrito con 15 (quince) días de anticipación.')]));

  ch.push(pH('DÉCIMA OCTAVA. — SUBARRENDAMIENTO'));
  ch.push(p([N('Queda estrictamente prohibido el subarrendamiento del inmueble objeto del presente contrato a cualquier persona, sea física o moral.')]));

  ch.push(pH('DÉCIMA NOVENA. — DEVOLUCIÓN DE EL LOCAL'));
  ch.push(p([N('Al concluir los plazos establecidos, "EL ARRENDATARIO" deberá desocupar el local en las mismas condiciones documentadas en el Acta de Entrega-Recepción, salvo el desgaste por uso normal.')]));

  ch.push(pH('VIGÉSIMA. — SEGUROS'));
  ch.push(p([N('"EL ARRENDATARIO" se obliga a contratar y mantener vigente durante toda la vigencia del contrato un seguro de responsabilidad civil con suma asegurada mínima de $500,000.00 (QUINIENTOS MIL PESOS 00/100 M.N.).')]));

  ch.push(pH('VIGÉSIMA PRIMERA. — FUERZA MAYOR O CASO FORTUITO'));
  ch.push(p([N('Si cualquiera de las partes fallare en el cumplimiento de sus obligaciones por causa de fuerza mayor o caso fortuito, dicha parte no será responsable por pérdidas o daños, siempre que la causa sea ajena a su control razonable.')]));

  ch.push(pH('VIGÉSIMA SEGUNDA. — CAUSAS DE RESCISIÓN'));
  ch.push(p([N('"EL ARRENDADOR" podrá exigir la rescisión del presente contrato por: falta de pago por más de dos meses consecutivos; uso indebido del local; inicio de procedimiento de quiebra; embargo de activos; incumplimiento de cualquier obligación; negativa a permitir inspección; incumplimiento de la obligación de contratar seguro.')]));

  ch.push(pH('VIGÉSIMA TERCERA. — DOMICILIOS'));
  ch.push(p([N('"EL ARRENDADOR": '), arrendadorDom ? V(arrendadorDom) : M(), N('.')]));
  ch.push(p([N('"EL ARRENDATARIO": '), inquilinoDom ? V(inquilinoDom) : M(), N('.')]));

  ch.push(pH('VIGÉSIMA CUARTA. — JURISDICCIÓN'));
  ch.push(p([N('Para la interpretación, ejecución y cumplimiento del presente Contrato, las partes convienen en someterse a la jurisdicción y competencia de los Tribunales de la ciudad de '), ciudad ? V(ciudad.toUpperCase()) : M(), N(', renunciando a cualquier otro fuero.')]));

  ch.push(pH('VIGÉSIMA QUINTA. — NOTIFICACIONES'));
  ch.push(p([N('Cualquier comunicación deberá constar por escrito, entregada de forma personal o por correo certificado con acuse de recibo, surtiendo efectos a partir del día hábil inmediato siguiente a su recepción.')]));

  ch.push(pH('VIGÉSIMA SEXTA. — DIVISIBILIDAD'));
  ch.push(p([N('Si un tribunal declara nula, inválida o inejecutable cualquier estipulación de este contrato, las demás disposiciones continuarán en pleno vigor y vigencia.')]));

  ch.push(pH('VIGÉSIMA SÉPTIMA. — MODIFICACIONES'));
  ch.push(p([N('Toda modificación a los términos, plazo y condiciones de este contrato deberá otorgarse expresamente por escrito mediante acuerdo firmado por ambas partes.')]));

  ch.push(pH('VIGÉSIMA OCTAVA. — ACUERDO TOTAL'));
  ch.push(p([N('El presente contrato constituye la totalidad de los acuerdos entre las partes y deja sin efecto cualquier otro acuerdo previo, ya sea oral o escrito.')]));

  ch.push(pH('VIGÉSIMA NOVENA. — DERECHO DE PREFERENCIA'));
  ch.push(p([N('Para cualquier aplazamiento o renovación, el "ARRENDATARIO" contará con derecho de preferencia sobre cualquier otra persona, aplicable únicamente en cuestiones de arrendamiento y no de venta.')]));

  ch.push(pH('TRIGÉSIMA. — PLAZO DE GRACIA'));
  ch.push(p([N('En caso de haberse pactado un período de gracia, durante dicho período no se generará obligación de pago de renta. La primera renta corresponderá al período acordado entre las partes.')]));

  ch.push(pH('TRIGÉSIMA PRIMERA. — PENA CONVENCIONAL POR TERMINACIÓN ANTICIPADA'));
  ch.push(p([N('En caso de terminación anticipada con aviso previo de 60 días, la pena convencional será de 3 (tres) meses de renta vigente. Si el "ARRENDATARIO" desocupa sin dar el aviso, la pena será de 3 meses de renta más los días proporcionales del período de aviso omitido.')]));

  ch.push(pH('TRIGÉSIMA SEGUNDA. — RELACIONES LABORALES INDEPENDIENTES'));
  ch.push(p([N('El "ARRENDATARIO" libera al "ARRENDADOR" de cualquier controversia laboral con sus empleados en el inmueble. En ningún caso se podrá considerar al "ARRENDADOR" como obligado solidario de controversias obrero-patronales.')]));

  ch.push(pH('TRIGÉSIMA TERCERA. — EL FIADOR'));
  if (tieneFiador) {
    ch.push(p([N('Se constituye como Fiador y obligado solidario el '), V(fiadorNombre), N(', con domicilio en '), fiadorDom ? V(fiadorDom) : M(), N('.')]));
    ch.push(p([N('RFC del Fiador: '), fiadorRFC ? V(fiadorRFC) : M(), N('   Identificación: '), V(fiadorIdTipo), N('   No.: '), fiadorIdNum ? V(fiadorIdNum) : M()]));
    ch.push(p([N('Referencia Patrimonial: '), fiadorRefPat ? V(fiadorRefPat) : M()]));
  } else {
    ch.push(p([N('Se constituye como Fiador y obligado solidario el '), M('NOMBRE DEL FIADOR'), N(', con domicilio en '), M('DOMICILIO DEL FIADOR'), N('.')]));
    ch.push(p([N('RFC del Fiador: '), M(), N('   Identificación: '), M(), N('   No.: '), M()]));
    ch.push(p([N('Referencia Patrimonial: '), M()]));
  }
  ch.push(p([N('Se constituye FIADOR ante EL ARRENDADOR respecto a todas y cada una de las obligaciones a cargo de EL ARRENDATARIO, sin reserva, limitación ni condición alguna. La responsabilidad del FIADOR no cesa sino hasta que EL ARRENDADOR le extienda constancia por escrito de que EL ARRENDATARIO ha cumplido con todas sus obligaciones.')]));
  ch.push(p([N('El FIADOR renuncia expresamente a los beneficios que le otorgan los Artículos 3257, 3263, 3264, 3305, 3311, 3312, 3313, 3314 y demás del Código Civil Vigente en el Estado de Coahuila.')]));

  ch.push(pH('TRIGÉSIMA CUARTA. — CLÁUSULA DE PRIVACIDAD'));
  ch.push(p([N('Ambas Partes se obligan a respetar y cumplir íntegramente con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y otorgan su consentimiento para el trato de sus datos personales una con la otra.')]));
  ch.push(pBlank());

  ch.push(p([N('Leído que fue por las partes y debidamente enteradas de su contenido y alcance legal, lo firman de conformidad manifestando que no existe error, dolo o mala fe, suscribiéndose por duplicado en la Ciudad de '), ciudad ? V(ciudad) : M(), N(', el día '), V(hoy), N('.')]));

  // PAGE BREAK — firmas en hoja aparte
  ch.push(new D.Paragraph({
    children: [new D.TextRun({ break: 1 })],
    spacing: { after: 0 }
  }));

  // FIRMAS — todas centradas, más espaciadas
  sigBlock('"EL ARRENDADOR"', arrendador).forEach(function(p){ ch.push(p); });
  sigBlock('"EL ARRENDATARIO"', inquilino).forEach(function(p){ ch.push(p); });
  sigBlock('"EL FIADOR"', fiadorNombre).forEach(function(p){ ch.push(p); });

  // TESTIGOS — solo líneas en cada esquina
  ch.push(new D.Paragraph({
    children: [new D.TextRun({ text: 'TESTIGOS', bold: true, font: 'Arial', size: 22, color: '1B3A6B' })],
    alignment: 'center',
    spacing: { before: 720, after: 320 }
  }));
  // Dos líneas con tab en el medio — una en cada esquina
  ch.push(new D.Paragraph({
    children: [
      new D.TextRun({ text: '_________________________', font: 'Arial', size: 20 }),
      new D.TextRun({ text: '\t', font: 'Arial', size: 20 }),
      new D.TextRun({ text: '_________________________', font: 'Arial', size: 20 })
    ],
    tabStops: [{ type: 'left', position: 5760 }],
    spacing: { before: 0, after: 0 }
  }));

  var doc = new D.Document({
    styles: { default: { document: { run: { font: 'Arial', size: 20 } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 } } },
      children: ch
    }]
  });

  D.Packer.toBlob(doc).then(function(blob) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'Contrato_' + (inquilino || 'Arrendamiento').replace(/\s+/g, '_') + '.docx';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
    showToast('✅ Contrato Word descargado');
  }).catch(function(e) {
    console.error('Error generando Word:', e);
    showToast('❌ Error al generar el Word: ' + (e.message || ''));
  });
}
function imprimirDocExtra() {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${_docTituloActual}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 30px auto; font-size: 13px; line-height: 1.9; color: #111; }
    pre { white-space: pre-wrap; font-family: Georgia, serif; }
    @media print { body { margin: 15mm 20mm; } }
  </style></head>
  <body><pre>${_docTextoActual.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
  <scr\ipt>window.onload = () => { setTimeout(() => window.print(), 300); }<\/script>
  </body></html>`);
  win.document.close();
}

function copiarDocExtra() {
  navigator.clipboard.writeText(_docTextoActual).then(() => {
    const btn = event.currentTarget;
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ ¡Copiado!';
    setTimeout(() => btn.innerHTML = orig, 2000);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = _docTextoActual;
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('¡Copiado!');
  });
}
