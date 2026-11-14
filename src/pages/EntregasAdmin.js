import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';

// Nombres en español
const dayNamesSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const monthNamesSpanish = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const formatYYYYMMDD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isReservaActiveOnDate = (reserva, dateStr) => {
  if (!reserva.fecha_inicio) return false;
  const startStr = reserva.fecha_inicio.substring(0, 10);
  const endStr = reserva.fecha_fin ? reserva.fecha_fin.substring(0, 10) : startStr;
  return dateStr >= startStr && dateStr <= endStr;
};

// Clasificador de servicios o transporte
const esServicio = (nombre) => {
  const keywords = ['servicio', 'transporte', 'flete', 'montaje', 'armado', 'instalacio', 'envio', 'cargo', 'adicional', 'limpieza', 'deposito', 'garantia'];
  const n = (nombre || '').toLowerCase();
  return keywords.some(k => n.includes(k));
};

export default function EntregasAdmin({
  reservas = [],
  muebles = [],
  combos = [],
  config = {},
  terminos = '',
  onAbrirEditarReserva,
  onAbrirPagos,
  generarHojaEntregaPDF,
  onRefresh
}) {
  const [fechaRef, setFechaRef] = useState(new Date());
  const [tipoFiltroFecha, setTipoFiltroFecha] = useState('inicios'); // 'inicios' | 'activas'
  const [vista, setVista] = useState('consolidado'); // 'consolidado' | 'por_reserva'
  const [filtroProvincia, setFiltroProvincia] = useState('todas'); // 'todas' | 'Panamá' | 'Panamá Oeste'
  const [busqueda, setBusqueda] = useState('');
  const [checklist, setChecklist] = useState({}); // { [itemKey]: boolean }
  const [filtroTipoItem, setFiltroTipoItem] = useState('todos'); // 'todos' | 'mobiliario' | 'servicios'

  const diaStr = formatYYYYMMDD(fechaRef);
  const todayStr = formatYYYYMMDD(new Date());
  const esHoy = diaStr === todayStr;

  // Navegar día
  const navegarDia = (delta) => {
    setFechaRef(prev => {
      const n = new Date(prev);
      n.setDate(n.getDate() + delta);
      return n;
    });
  };

  // 1. Filtrar reservas según la fecha, provincia y criterio
  const reservasDelDia = useMemo(() => {
    return reservas.filter(r => {
      if (r.estado === 'cancelada') return false;

      let coincideFecha = false;
      if (tipoFiltroFecha === 'inicios') {
        const startStr = (r.fecha_inicio || '').substring(0, 10);
        coincideFecha = (startStr === diaStr);
      } else {
        coincideFecha = isReservaActiveOnDate(r, diaStr);
      }

      if (!coincideFecha) return false;

      if (filtroProvincia !== 'todas') {
        const provReserva = (r.provincia || 'Panamá').trim().toLowerCase();
        const provFiltro = filtroProvincia.trim().toLowerCase();
        if (provReserva !== provFiltro) return false;
      }

      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const cliente = (r.nombre_cliente || '').toLowerCase();
        const alias = (r.alias_cliente || '').toLowerCase();
        const dir = (r.direccion_entrega || '').toLowerCase();
        const prov = (r.provincia || '').toLowerCase();
        const tel = (r.telefono_cliente || '').toLowerCase();
        const id = (r.id || '').toLowerCase();
        const tieneItem = (r.items || []).some(it => (it.nombre || it.mueble || '').toLowerCase().includes(q));
        return cliente.includes(q) || alias.includes(q) || dir.includes(q) || prov.includes(q) || tel.includes(q) || id.includes(q) || tieneItem;
      }

      return true;
    });
  }, [reservas, tipoFiltroFecha, diaStr, busqueda, filtroProvincia]);

  // 2. Algoritmo de Consolidación de Mobiliario y Desglose de Combos
  const { itemsConsolidados, resumenKPIs } = useMemo(() => {
    const mapa = {}; // key -> { id, key, nombre, esServicio, cantidadTotal, stockDisponible, reservas: [] }
    let totalPiezasMobiliario = 0;
    let totalCobrarDia = 0;

    reservasDelDia.forEach(r => {
      // Calcular saldo pendiente de la reserva
      const totalReserva = parseFloat(r.total || 0);
      const abonosPagados = parseFloat(r.total_pagado || 0) || (r.pagos || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
      const abonoExtra = parseFloat(r.contrato_abono_extra || 0);
      const saldoReserva = Math.max(0, totalReserva - (abonosPagados + abonoExtra));
      totalCobrarDia += saldoReserva;

      const items = r.items || [];
      items.forEach(it => {
        // A) ES UN COMBO -> DESGLOSAR EN SUS COMPONENTES
        if (it.combo_id) {
          const comboQty = parseInt(it.cantidad) || 1;
          let componentes = (it.componentes && it.componentes.length > 0) ? it.componentes : null;

          if (!componentes) {
            const comboObj = combos.find(c => c.id === it.combo_id);
            if (comboObj && comboObj.items && comboObj.items.length > 0) {
              componentes = comboObj.items;
            }
          }

          if (componentes && componentes.length > 0) {
            componentes.forEach(comp => {
              const compUnitQty = parseInt(comp.cantidad) || 1;
              const compTotalQty = comboQty * compUnitQty;
              const muebleObj = muebles.find(m => m.id === comp.mueble_id) || muebles.find(m => m.nombre?.toLowerCase() === comp.nombre?.toLowerCase());
              const nombreFinal = comp.nombre || muebleObj?.nombre || 'Artículo de Combo';
              const itemEsServicio = esServicio(nombreFinal);

              const key = comp.mueble_id ? `m_${comp.mueble_id}` : `n_${nombreFinal.trim().toLowerCase()}`;

              if (!mapa[key]) {
                mapa[key] = {
                  key,
                  mueble_id: comp.mueble_id || muebleObj?.id || null,
                  nombre: nombreFinal,
                  categoria: muebleObj?.categoria || (itemEsServicio ? 'Servicios' : 'Mobiliario'),
                  stockDisponible: muebleObj?.stock !== undefined ? parseInt(muebleObj.stock) : null,
                  esServicio: itemEsServicio,
                  cantidadTotal: 0,
                  reservas: []
                };
              }

              mapa[key].cantidadTotal += compTotalQty;
              if (!itemEsServicio) {
                totalPiezasMobiliario += compTotalQty;
              }

              mapa[key].reservas.push({
                reservaId: r.id,
                alias: r.alias_cliente || r.nombre_cliente || 'Sin nombre',
                cliente: r.nombre_cliente || '',
                direccion: r.direccion_entrega || '',
                telefono: r.telefono_cliente || '',
                cantidad: compTotalQty,
                origen: `Combo: ${it.nombre || 'Combo'} (x${comboQty})`
              });
            });
          } else {
            // Si no se encontraron componentes del combo, registrar el combo completo como bulto
            const key = `combo_${it.combo_id}`;
            if (!mapa[key]) {
              mapa[key] = {
                key,
                mueble_id: null,
                nombre: `[Paquete] ${it.nombre || 'Combo'}`,
                categoria: 'Paquetes / Combos',
                stockDisponible: null,
                esServicio: false,
                cantidadTotal: 0,
                reservas: []
              };
            }
            mapa[key].cantidadTotal += comboQty;
            totalPiezasMobiliario += comboQty;
            mapa[key].reservas.push({
              reservaId: r.id,
              alias: r.alias_cliente || r.nombre_cliente || 'Sin nombre',
              cliente: r.nombre_cliente || '',
              direccion: r.direccion_entrega || '',
              telefono: r.telefono_cliente || '',
              cantidad: comboQty,
              origen: 'Combo Completo'
            });
          }
        } 
        // B) ES MOBILIARIO INDIVIDUAL O SERVICIO
        else {
          const qty = parseInt(it.cantidad) || 1;
          const muebleObj = muebles.find(m => m.id === it.mueble_id) || muebles.find(m => m.nombre?.toLowerCase() === (it.nombre || it.mueble || '').toLowerCase());
          const nombreFinal = it.nombre || it.mueble || muebleObj?.nombre || 'Artículo sin nombre';
          const itemEsServicio = esServicio(nombreFinal);

          const key = it.mueble_id ? `m_${it.mueble_id}` : `n_${nombreFinal.trim().toLowerCase()}`;

          if (!mapa[key]) {
            mapa[key] = {
              key,
              mueble_id: it.mueble_id || muebleObj?.id || null,
              nombre: nombreFinal,
              categoria: muebleObj?.categoria || (itemEsServicio ? 'Servicios' : 'Mobiliario Individual'),
              stockDisponible: muebleObj?.stock !== undefined ? parseInt(muebleObj.stock) : null,
              esServicio: itemEsServicio,
              cantidadTotal: 0,
              reservas: []
            };
          }

          mapa[key].cantidadTotal += qty;
          if (!itemEsServicio) {
            totalPiezasMobiliario += qty;
          }

          mapa[key].reservas.push({
            reservaId: r.id,
            alias: r.alias_cliente || r.nombre_cliente || 'Sin nombre',
            cliente: r.nombre_cliente || '',
            direccion: r.direccion_entrega || '',
            telefono: r.telefono_cliente || '',
            cantidad: qty,
            origen: 'Individual / Adicional'
          });
        }
      });
    });

    // Convertir mapa a lista ordenada
    let lista = Object.values(mapa);

    // Filtrar por tipo si aplica
    if (filtroTipoItem === 'mobiliario') {
      lista = lista.filter(i => !i.esServicio);
    } else if (filtroTipoItem === 'servicios') {
      lista = lista.filter(i => i.esServicio);
    }

    // Ordenar alfabéticamente de forma ascendente
    lista.sort((a, b) => {
      if (a.esServicio !== b.esServicio) return a.esServicio ? 1 : -1;
      return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
    });

    // Contar items verificados en checklist
    const itemsVerificados = lista.filter(it => checklist[it.key]).length;

    return {
      itemsConsolidados: lista,
      resumenKPIs: {
        totalPiezasMobiliario,
        totalReservas: reservasDelDia.length,
        totalCobrarDia,
        itemsVerificados,
        totalArticulosDistintos: lista.length
      }
    };
  }, [reservasDelDia, combos, muebles, filtroTipoItem, checklist]);

  // Manejar toggle en checklist
  const toggleCheck = (key) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const marcarTodosChecklist = (valor) => {
    const nuevo = {};
    itemsConsolidados.forEach(it => {
      nuevo[it.key] = valor;
    });
    setChecklist(nuevo);
    toast.success(valor ? 'Todos marcados como cargados' : 'Checklist reiniciado');
  };

  // Función para imprimir Hoja de Carga Consolidada (Picking List)
  const imprimirHojaCargaConsolidada = () => {
    if (!itemsConsolidados.length) {
      toast.error('No hay artículos para imprimir en esta fecha' + (filtroProvincia !== 'todas' ? ` para la provincia ${filtroProvincia}` : ''));
      return;
    }

    const empNombre = config?.nombre_empresa || 'Alquila tu Party';
    const empLogo = config?.logo_url || '🎉';
    const fechaTexto = `${dayNamesSpanish[fechaRef.getDay()]}, ${fechaRef.getDate()} de ${monthNamesSpanish[fechaRef.getMonth()]} de ${fechaRef.getFullYear()}`;
    const provTexto = filtroProvincia === 'todas' ? 'Todas las Provincias' : filtroProvincia;

    const logoHtml = (empLogo.startsWith('http') || empLogo.startsWith('data:'))
      ? `<img src="${empLogo}" alt="Logo" style="max-height:36px;max-width:140px;object-fit:contain;" />`
      : `<span style="font-size:24px;">${empLogo}</span>`;

    // Filas de consolidado
    const filasHtml = itemsConsolidados.map((it, idx) => {
      const desgloses = it.reservas.map(r => `<b>${r.cantidad}</b> (${r.alias})`).join(', ');
      return `
        <tr style="border-bottom:1px solid #e2e8f0; font-size:11px;">
          <td style="padding:6px;text-align:center;font-weight:700;color:#64748b;width:30px;">${idx + 1}</td>
          <td style="padding:6px;text-align:center;width:40px;">
            <div style="width:16px;height:16px;border:1.5px solid #1e293b;border-radius:3px;margin:0 auto;"></div>
          </td>
          <td style="padding:6px;text-align:center;font-size:14px;font-weight:800;color:#1e3a8a;width:55px;background:#f8fafc;">
            ${it.cantidadTotal}
          </td>
          <td style="padding:6px 10px;font-weight:700;color:#0f172a;">
            ${it.nombre} ${it.esServicio ? '<span style="font-size:9px;color:#d97706;border:1px solid #fde68a;padding:1px 4px;border-radius:4px;margin-left:4px;">SERVICIO</span>' : ''}
          </td>
          <td style="padding:6px 10px;font-size:10px;color:#475569;">
            ${desgloses}
          </td>
          <td style="padding:6px;text-align:center;width:40px;">
            <div style="width:16px;height:16px;border:1.5px solid #94a3b8;border-radius:3px;margin:0 auto;"></div>
          </td>
          <td style="padding:6px;border-bottom:1px dashed #cbd5e1;width:120px;">&nbsp;</td>
        </tr>
      `;
    }).join('');

    // Filas de reservas / entregas del día
    const filasReservasHtml = reservasDelDia.map((r, idx) => {
      const cleanPhone = (r.telefono_cliente || '').replace(/^\+?507\s*/, '').trim();
      const totalReserva = parseFloat(r.total || 0);
      const abonosPagados = parseFloat(r.total_pagado || 0) || (r.pagos || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
      const abonoExtra = parseFloat(r.contrato_abono_extra || 0);
      const saldo = Math.max(0, totalReserva - (abonosPagados + abonoExtra));

      return `
        <tr style="border-bottom:1px solid #e2e8f0; font-size:10.5px;">
          <td style="padding:6px;text-align:center;font-weight:700;color:#64748b;">${idx + 1}</td>
          <td style="padding:6px;font-weight:700;color:#0f172a;">
            ${r.alias_cliente || r.nombre_cliente}
            <div style="font-size:9.5px;color:#64748b;font-weight:normal;">${r.nombre_cliente} • Tel: ${cleanPhone}</div>
          </td>
          <td style="padding:6px;color:#334155;">
            ${r.provincia ? `<span style="font-size:9px;background:#e0f2fe;color:#0369a1;padding:1px 5px;border-radius:3px;font-weight:700;margin-right:4px;">${r.provincia}</span>` : ''}
            ${r.direccion_entrega || '<i style="color:#94a3b8;">Sin dirección registrada</i>'}
          </td>
          <td style="padding:6px;text-align:right;font-weight:700;color:${saldo > 0 ? '#b91c1c' : '#15803d'};">
            ${saldo > 0 ? `COBRAR $${saldo.toFixed(2)}` : 'PAGADO'}
          </td>
          <td style="padding:6px;font-size:9.5px;color:#475569;">
            ${r.notas || '-'}
          </td>
        </tr>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hoja de Carga - ${diaStr} (${provTexto}) - ${empNombre}</title>
        <style>
          @page { size: portrait; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 12px; color: #1e293b; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px; }
          .title { font-size: 16px; font-weight: 800; color: #1e3a8a; margin: 0; text-transform: uppercase; letter-spacing: 0.05em; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .kpi-bar { display: flex; gap: 15px; background: #f1f5f9; border-radius: 6px; padding: 8px 12px; margin-bottom: 14px; font-size: 11px; flex-wrap: wrap; }
          .kpi-item { display: flex; gap: 5px; align-items: center; }
          .kpi-item strong { color: #0f172a; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f8fafc; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #475569; padding: 6px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          .section-title { font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 14px 0 6px 0; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 25px; padding-top: 15px; }
          .sig-box { border-top: 1px solid #475569; text-align: center; font-size: 10px; color: #475569; padding-top: 4px; }
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:8px;">
            ${logoHtml}
            <div>
              <div class="title">Hoja de Carga y Despacho General (Picking) ${filtroProvincia !== 'todas' ? `- ${provTexto.toUpperCase()}` : ''}</div>
              <div class="subtitle">${empNombre} • <b>${fechaTexto}</b> • Provincia: <b style="color:#1d4ed8;">${provTexto}</b></div>
            </div>
          </div>
          <div style="text-align:right; font-size:10px; color:#64748b;">
            <div>Generado: ${new Date().toLocaleTimeString()}</div>
            <div>Modo: ${tipoFiltroFecha === 'inicios' ? 'Entregas que inician hoy' : 'Todas las reservas activas'}</div>
          </div>
        </div>

        <div class="kpi-bar">
          <div class="kpi-item"><span>📍 Provincia:</span> <strong style="color:#1d4ed8;">${provTexto}</strong></div>
          <div class="kpi-item"><span>📦 Total Mobiliario a Cargar:</span> <strong>${resumenKPIs.totalPiezasMobiliario} piezas</strong></div>
          <div class="kpi-item"><span>📋 Artículos Diferentes:</span> <strong>${resumenKPIs.totalArticulosDistintos}</strong></div>
          <div class="kpi-item"><span>🚚 Total Reservas:</span> <strong>${resumenKPIs.totalReservas}</strong></div>
          <div class="kpi-item"><span>💰 Total a Cobrar en Ruta:</span> <strong>$${resumenKPIs.totalCobrarDia.toFixed(2)}</strong></div>
        </div>

        <div class="section-title">1. Lista Consolidada de Carga (Bodega / Camión)</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th style="text-align:center;">Carga</th>
              <th style="text-align:center;">Cant.</th>
              <th>Artículo / Mobiliario</th>
              <th>Desglose por Reserva</th>
              <th style="text-align:center;">Retorno</th>
              <th>Notas / Estado</th>
            </tr>
          </thead>
          <tbody>
            ${filasHtml}
          </tbody>
        </table>

        <div class="section-title" style="page-break-before: auto;">2. Ruta de Entregas y Destinos del Día</div>
        <table>
          <thead>
            <tr>
              <th style="text-align:center; width:30px;">#</th>
              <th>Cliente / Evento</th>
              <th>Dirección de Entrega</th>
              <th style="text-align:right; width:110px;">Saldo a Cobrar</th>
              <th>Observaciones / Horario</th>
            </tr>
          </thead>
          <tbody>
            ${filasReservasHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <b>Despachado por (Bodega)</b><br>
            Firma / Nombre: _______________________________
          </div>
          <div class="sig-box">
            <b>Recibido por (Chofer / Conductor)</b><br>
            Firma / Nombre: _______________________________
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html);
      printWin.document.close();
    } else {
      toast.error('Por favor permite ventanas emergentes para imprimir');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* ── BARRA SUPERIOR: NAVEGADOR DE FECHA Y CONTROLES ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Navegador de Fecha */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => navegarDia(-1)}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Día Anterior"
            >
              ◀ Ant
            </button>
            <button
              type="button"
              onClick={() => setFechaRef(new Date())}
              style={{
                padding: '6px 14px',
                borderRadius: 7,
                border: '1px solid #4a6cf7',
                background: esHoy ? '#4a6cf7' : '#eef2ff',
                color: esHoy ? '#fff' : '#4a6cf7',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: 12
              }}
              title="Ir al día de hoy"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => navegarDia(1)}
              style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
              title="Día Siguiente"
            >
              Sig ▶
            </button>
          </div>

          <input
            type="date"
            value={diaStr}
            onChange={e => {
              if (e.target.value) {
                const [y, m, d] = e.target.value.split('-');
                setFechaRef(new Date(Number(y), Number(m) - 1, Number(d)));
              }
            }}
            style={{
              padding: '5px 10px',
              borderRadius: 7,
              border: '1px solid #cbd5e1',
              fontSize: 12,
              fontWeight: 600,
              color: '#1e293b',
              background: '#f8fafc',
              cursor: 'pointer'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 4 }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
              {dayNamesSpanish[fechaRef.getDay()]}, {fechaRef.getDate()} de {monthNamesSpanish[fechaRef.getMonth()]} {fechaRef.getFullYear()}
            </span>
            {esHoy && (
              <span style={{ background: '#2563eb', color: '#fff', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: 999 }}>
                HOY
              </span>
            )}
          </div>
        </div>

        {/* Acciones Rápidas de Impresión y Refresco */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={imprimirHojaCargaConsolidada}
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              border: 'none',
              background: '#4f46e5',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
            title="Imprimir Hoja de Carga (Picking) para bodega y chofer"
          >
            <span>🖨️</span>
            <span>Imprimir Hoja de Carga</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              style={{
                padding: '6px 10px',
                borderRadius: 7,
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
              title="Actualizar datos"
            >
              🔄
            </button>
          )}
        </div>
      </div>

      {/* ── BARRA DE FILTROS SECUNDARIA: CRITERIO DE FECHA, VISTAS Y BÚSQUEDA ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '10px 16px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {/* Selector de Modo de Fecha (Inicios vs Activas) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setTipoFiltroFecha('inicios')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: tipoFiltroFecha === 'inicios' ? '#fff' : 'transparent',
              color: tipoFiltroFecha === 'inicios' ? '#1e293b' : '#64748b',
              fontWeight: tipoFiltroFecha === 'inicios' ? 700 : 500,
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: tipoFiltroFecha === 'inicios' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            🚀 Despachos / Inicios de hoy
          </button>
          <button
            type="button"
            onClick={() => setTipoFiltroFecha('activas')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: tipoFiltroFecha === 'activas' ? '#fff' : 'transparent',
              color: tipoFiltroFecha === 'activas' ? '#1e293b' : '#64748b',
              fontWeight: tipoFiltroFecha === 'activas' ? 700 : 500,
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: tipoFiltroFecha === 'activas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📅 Todas las reservas activas
          </button>
        </div>

        {/* Selector de Provincia: Todas vs Panamá vs Panamá Oeste */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', padding: '0 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>📍</span>
            <span>Provincia:</span>
          </span>
          <button
            type="button"
            onClick={() => setFiltroProvincia('todas')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: filtroProvincia === 'todas' ? '#0f172a' : 'transparent',
              color: filtroProvincia === 'todas' ? '#fff' : '#64748b',
              fontWeight: filtroProvincia === 'todas' ? 700 : 500,
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: filtroProvincia === 'todas' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFiltroProvincia('Panamá')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: filtroProvincia === 'Panamá' ? '#2563eb' : 'transparent',
              color: filtroProvincia === 'Panamá' ? '#fff' : '#64748b',
              fontWeight: filtroProvincia === 'Panamá' ? 700 : 500,
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: filtroProvincia === 'Panamá' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Panamá
          </button>
          <button
            type="button"
            onClick={() => setFiltroProvincia('Panamá Oeste')}
            style={{
              padding: '5px 12px',
              borderRadius: 6,
              border: 'none',
              background: filtroProvincia === 'Panamá Oeste' ? '#7c3aed' : 'transparent',
              color: filtroProvincia === 'Panamá Oeste' ? '#fff' : '#64748b',
              fontWeight: filtroProvincia === 'Panamá Oeste' ? 700 : 500,
              fontSize: 11,
              cursor: 'pointer',
              boxShadow: filtroProvincia === 'Panamá Oeste' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Panamá Oeste
          </button>
        </div>

        {/* Selector de Vista: Consolidado General vs Detalle por Reserva */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', padding: 3, borderRadius: 8 }}>
          <button
            type="button"
            onClick={() => setVista('consolidado')}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: 'none',
              background: vista === 'consolidado' ? '#2563eb' : 'transparent',
              color: vista === 'consolidado' ? '#fff' : '#64748b',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>📦</span>
            <span>Consolidado General (Bodega)</span>
          </button>
          <button
            type="button"
            onClick={() => setVista('por_reserva')}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: 'none',
              background: vista === 'por_reserva' ? '#2563eb' : 'transparent',
              color: vista === 'por_reserva' ? '#fff' : '#64748b',
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5
            }}
          >
            <span>🚚</span>
            <span>Por Reserva / Dirección ({reservasDelDia.length})</span>
          </button>
        </div>

        {/* Buscador de texto */}
        <div style={{ position: 'relative', minWidth: 200, flex: 1, maxWidth: 300 }}>
          <input
            type="text"
            placeholder="Buscar por cliente, dirección o mueble..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: '100%',
              padding: '5px 10px 5px 28px',
              borderRadius: 7,
              border: '1px solid #cbd5e1',
              fontSize: 11,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8' }}>
            🔍
          </span>
          {busqueda && (
            <button
              onClick={() => setBusqueda('')}
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 11 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── TARJETA RESUMEN KPI (MÉTRICAS DEL DÍA) ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '12px 18px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            📦
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Total Piezas a Cargar</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{resumenKPIs.totalPiezasMobiliario} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>unidades</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            🚚
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Reservas a Entregar</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{resumenKPIs.totalReservas} <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>eventos</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            ✅
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Progreso de Carga</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#059669' }}>
              {resumenKPIs.itemsVerificados} / {resumenKPIs.totalArticulosDistintos}
              <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', marginLeft: 4 }}>
                ({resumenKPIs.totalArticulosDistintos > 0 ? Math.round((resumenKPIs.itemsVerificados / resumenKPIs.totalArticulosDistintos) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: resumenKPIs.totalCobrarDia > 0 ? '#fff7ed' : '#f0fdf4', color: resumenKPIs.totalCobrarDia > 0 ? '#ea580c' : '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            💵
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Cobros en Entrega</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: resumenKPIs.totalCobrarDia > 0 ? '#ea580c' : '#16a34a' }}>
              ${resumenKPIs.totalCobrarDia.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════════════
          VISTA 1: CONSOLIDADO GENERAL (LISTA DE CARGA DE BODEGA / PICKING)
      ════════════════════════════════════════════════════════════════════════════════ */}
      {vista === 'consolidado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Subcabecera de la lista con filtros rápidos y controles de checklist */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
            padding: '0 4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
                Artículos a Despachar ({itemsConsolidados.length}):
              </span>
              {filtroProvincia !== 'todas' && (
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  background: filtroProvincia === 'Panamá Oeste' ? '#f3e8ff' : '#e0f2fe',
                  color: filtroProvincia === 'Panamá Oeste' ? '#6b21a8' : '#0369a1',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: `1px solid ${filtroProvincia === 'Panamá Oeste' ? '#d8b4fe' : '#bae6fd'}`
                }}>
                  📍 {filtroProvincia}
                </span>
              )}
              <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 2, borderRadius: 6 }}>
                <button
                  type="button"
                  onClick={() => setFiltroTipoItem('todos')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: filtroTipoItem === 'todos' ? '#fff' : 'transparent',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoItem('mobiliario')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: filtroTipoItem === 'mobiliario' ? '#fff' : 'transparent',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🪑 Solo Mobiliario
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTipoItem('servicios')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: 'none',
                    background: filtroTipoItem === 'servicios' ? '#fff' : 'transparent',
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  🚚 Fletes / Servicios
                </button>
              </div>
            </div>

            {/* Acciones de Checklist */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => marcarTodosChecklist(true)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #bbf7d0',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✓ Marcar todos cargados
              </button>
              <button
                type="button"
                onClick={() => marcarTodosChecklist(false)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Reiniciar checklist
              </button>
            </div>
          </div>

          {/* Tabla o Listado de Artículos Consolidados */}
          {itemsConsolidados.length > 0 ? (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              overflow: 'hidden'
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px', width: 44, textAlign: 'center' }}>Check</th>
                      <th style={{ padding: '10px 14px', width: 80, textAlign: 'center' }}>Total</th>
                      <th style={{ padding: '10px 14px' }}>Mobiliario / Artículo</th>
                      <th style={{ padding: '10px 14px' }}>Desglose por Reserva (Origen)</th>
                      <th style={{ padding: '10px 14px', width: 140, textAlign: 'right' }}>Stock en Bodega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsConsolidados.map((it, idx) => {
                      const checked = !!checklist[it.key];
                      const stockInsuficiente = (it.stockDisponible !== null && it.stockDisponible < it.cantidadTotal);

                      return (
                        <tr
                          key={it.key || idx}
                          onClick={() => toggleCheck(it.key)}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: checked ? '#f0fdf4' : (idx % 2 === 0 ? '#fff' : '#fafafa'),
                            cursor: 'pointer',
                            transition: 'background 0.15s ease'
                          }}
                        >
                          {/* Checkbox para Picking / Carga en Camión */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCheck(it.key)}
                              style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16a34a' }}
                            />
                          </td>

                          {/* Cantidad Total Resumida */}
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: 8,
                              background: checked ? '#bbf7d0' : '#dbeafe',
                              color: checked ? '#14532d' : '#1e40af',
                              fontSize: 15,
                              fontWeight: 800,
                              minWidth: 28,
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}>
                              {it.cantidadTotal}
                            </span>
                          </td>

                          {/* Nombre del Mueble y Categoría */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontWeight: 700,
                                fontSize: 13,
                                color: checked ? '#15803d' : '#0f172a',
                                textDecoration: checked ? 'line-through' : 'none'
                              }}>
                                {it.nombre}
                              </span>
                              {it.esServicio && (
                                <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                                  Servicio
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {it.categoria || 'General'}
                            </div>
                          </td>

                          {/* Desglose por Reserva (Chips) */}
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {it.reservas.map((rDet, rIdx) => (
                                <span
                                  key={rIdx}
                                  title={`${rDet.cliente} - ${rDet.direccion}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    fontSize: 11,
                                    color: '#334155'
                                  }}
                                >
                                  <strong style={{ color: '#1e40af' }}>x{rDet.cantidad}</strong>
                                  <span>{rDet.alias}</span>
                                  <span style={{ fontSize: 9.5, color: '#64748b' }}>({rDet.origen})</span>
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Stock en Bodega */}
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11 }}>
                            {it.stockDisponible !== null ? (
                              <div>
                                <span style={{
                                  fontWeight: 700,
                                  color: stockInsuficiente ? '#dc2626' : '#16a34a'
                                }}>
                                  {it.stockDisponible} en bodega
                                </span>
                                {stockInsuficiente && (
                                  <div style={{ fontSize: 9.5, color: '#dc2626', fontWeight: 600 }}>
                                    ⚠️ Stock ajustado
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: '40px 20px',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🚚</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#1e293b' }}>
                No hay mobiliario para despachar en esta fecha
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 12 }}>
                {busqueda ? 'No se encontraron resultados con el filtro actual.' : `El día ${dayNamesSpanish[fechaRef.getDay()]}, ${fechaRef.getDate()} de ${monthNamesSpanish[fechaRef.getMonth()]} no tiene reservas programadas.`}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setFechaRef(new Date())}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    border: '1px solid #4a6cf7',
                    background: '#4a6cf7',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Ir al día de Hoy
                </button>
                {busqueda && (
                  <button
                    type="button"
                    onClick={() => setBusqueda('')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: 12,
                      cursor: 'pointer'
                    }}
                  >
                    Limpiar Búsqueda
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════════════
          VISTA 2: DESGLOSE POR RESERVA / RUTA DE ENTREGA
      ════════════════════════════════════════════════════════════════════════════════ */}
      {vista === 'por_reserva' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reservasDelDia.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px' }}>
              {reservasDelDia.map(r => {
                const totalReserva = parseFloat(r.total || 0);
                const abonosPagados = parseFloat(r.total_pagado || 0) || (r.pagos || []).reduce((s, p) => s + parseFloat(p.monto || 0), 0);
                const abonoExtra = parseFloat(r.contrato_abono_extra || 0);
                const saldo = Math.max(0, totalReserva - (abonosPagados + abonoExtra));
                const cleanPhone = (r.telefono_cliente || '').replace(/^\+?507\s*/, '').trim();

                return (
                  <div
                    key={r.id}
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '14px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Encabezado Tarjeta */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>
                          {r.alias_cliente || r.nombre_cliente}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Cliente: <b>{r.nombre_cliente}</b>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          background: (r.provincia === 'Panamá Oeste' ? '#f3e8ff' : '#e0f2fe'),
                          color: (r.provincia === 'Panamá Oeste' ? '#6b21a8' : '#0369a1'),
                          border: `1px solid ${r.provincia === 'Panamá Oeste' ? '#d8b4fe' : '#bae6fd'}`
                        }}>
                          📍 {r.provincia || 'Panamá'}
                        </span>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          background: r.estado === 'activa' ? '#dcfce7' : r.estado === 'confirmada' ? '#dbeafe' : '#fef3c7',
                          color: r.estado === 'activa' ? '#15803d' : r.estado === 'confirmada' ? '#1e40af' : '#b45309'
                        }}>
                          {r.estado}
                        </span>
                      </div>
                    </div>

                    {/* Dirección de Entrega y Enlace de Maps */}
                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: 8, fontSize: 11, border: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>📍 Dirección de Entrega:</span>
                        {r.direccion_entrega && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.direccion_entrega)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: 10, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                          >
                            Abrir Maps ↗
                          </a>
                        )}
                      </div>
                      <div style={{ color: r.direccion_entrega ? '#0f172a' : '#94a3b8' }}>
                        {r.direccion_entrega || 'No especificada'}
                      </div>
                    </div>

                    {/* Contacto y WhatsApp */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📞 Tel:</span>
                        <a href={`tel:${cleanPhone}`} style={{ color: '#0f172a', fontWeight: 600, textDecoration: 'none' }}>
                          {cleanPhone || 'Sin teléfono'}
                        </a>
                      </div>
                      {cleanPhone && (
                        <a
                          href={`https://wa.me/507${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#22c55e',
                            color: '#fff',
                            textDecoration: 'none',
                            fontSize: 10,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      )}
                    </div>

                    {/* Saldo y Estado de Pago para el Chofer */}
                    <div style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: saldo > 0 ? '#fff7ed' : '#f0fdf4',
                      border: `1px solid ${saldo > 0 ? '#ffedd5' : '#dcfce7'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11
                    }}>
                      <span style={{ fontWeight: 600, color: saldo > 0 ? '#9a3412' : '#166534' }}>
                        {saldo > 0 ? '⚠️ Cobrar en Entrega:' : '✅ Estado de Pago:'}
                      </span>
                      <strong style={{ fontSize: 13, color: saldo > 0 ? '#c2410c' : '#15803d' }}>
                        {saldo > 0 ? `$${saldo.toFixed(2)}` : '100% Pagado'}
                      </strong>
                    </div>

                    {/* Lista de Mobiliario y Combos de esta reserva */}
                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        Mobiliario a Entregar:
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {(r.items || []).slice().sort((a, b) => {
                          const aEsCombo = !!a.combo_id;
                          const bEsCombo = !!b.combo_id;
                          if (aEsCombo && !bEsCombo) return -1;
                          if (!aEsCombo && bEsCombo) return 1;
                          return (a.nombre || a.mueble || '').localeCompare(b.nombre || b.mueble || '', 'es', { sensitivity: 'base' });
                        }).map((it, itIdx) => {
                          const isCombo = !!it.combo_id;
                          let comps = (it.componentes && it.componentes.length > 0) ? it.componentes : null;
                          if (isCombo && !comps) {
                            const cObj = combos.find(c => c.id === it.combo_id);
                            if (cObj && cObj.items) comps = cObj.items;
                          }

                          return (
                            <div key={itIdx} style={{ fontSize: 11, color: '#1e293b' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 800, color: '#2563eb' }}>{it.cantidad}x</span>
                                <span style={{ fontWeight: 600 }}>{it.nombre || it.mueble}</span>
                                {isCombo && <span style={{ fontSize: 9.5, background: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: 4 }}>Combo</span>}
                              </div>

                              {/* Componentes del combo desglosados */}
                              {isCombo && comps && (
                                <div style={{ paddingLeft: 18, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {comps.map((cp, cpIdx) => (
                                    <div key={cpIdx} style={{ fontSize: 10, color: '#64748b' }}>
                                      └─ {cp.cantidad * it.cantidad}x {cp.nombre}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Notas de entrega si existen */}
                    {r.notas && (
                      <div style={{ fontSize: 10.5, color: '#475569', background: '#f8fafc', padding: '6px 8px', borderRadius: 6, fontStyle: 'italic' }}>
                        📝 {r.notas}
                      </div>
                    )}

                    {/* Botones de acción individual */}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #f1f5f9' }}>
                      {generarHojaEntregaPDF && (
                        <button
                          type="button"
                          onClick={() => generarHojaEntregaPDF(r, r.items || [], combos, config, terminos)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: 6,
                            border: '1px solid #8b5cf6',
                            background: '#f5f3ff',
                            color: '#7c3aed',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                          title="Imprimir Hoja de Entrega individual"
                        >
                          <span>🚚</span>
                          <span>Hoja Entrega</span>
                        </button>
                      )}

                      {onAbrirEditarReserva && (
                        <button
                          type="button"
                          onClick={() => onAbrirEditarReserva(r)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #cbd5e1',
                            background: '#fff',
                            color: '#334155',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Editar Reserva"
                        >
                          ✏️
                        </button>
                      )}

                      {onAbrirPagos && (
                        <button
                          type="button"
                          onClick={() => onAbrirPagos(r)}
                          style={{
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #bbf7d0',
                            background: '#f0fdf4',
                            color: '#16a34a',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Ver / Registrar Pagos"
                        >
                          💳
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: '40px 20px',
              textAlign: 'center',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🚚</div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: 16, color: '#1e293b' }}>
                No hay entregas registradas para esta fecha
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: 12 }}>
                Cambia la fecha o ajusta los filtros para visualizar reservas de otros días.
              </p>
              <button
                type="button"
                onClick={() => setFechaRef(new Date())}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #4a6cf7',
                  background: '#4a6cf7',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer'
                }}
              >
                Ir al día de Hoy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
