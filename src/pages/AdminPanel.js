import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';

const estadoColor = { pendiente: '#f59e0b', confirmada: '#3b82f6', activa: '#22c55e', completada: '#6b7280', cancelada: '#ef4444' };

const formatFecha = (fechaStr, options) => {
  if (!fechaStr) return '';
  const [yyyy, mm, dd] = fechaStr.substring(0, 10).split('-');
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return date.toLocaleDateString('es', options);
};

// ─── Generador de Contrato PDF ───────────────────────────────────────────────
function generarContratoPDF(reserva, items, pagos, terminos, abono, todosLosCombos) {
  const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto), 0);
  const abonoExtra = parseFloat(abono) || 0;
  const saldoPendiente = parseFloat(reserva.total) - totalPagado - abonoExtra;
  const subtotalMobiliario = items.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);
  const totalAbono = totalPagado + abonoExtra;

  // Limpiar prefijo +507 o 507 del teléfono
  const cleanPhone = (reserva.telefono_cliente || '').replace(/^\+?507\s*/, '').trim();

  // Clasificar en mobiliario y servicios
  const esServicio = (nombre) => {
    const keywords = ['servicio', 'transporte', 'flete', 'montaje', 'armado', 'instalacio', 'envio', 'cargo', 'adicional', 'limpieza', 'deposito', 'garantia', 'decorac'];
    const n = (nombre || '').toLowerCase();
    return keywords.some(k => n.includes(k));
  };

  const mobiliarioItems = items.filter(i => !esServicio(i.nombre || i.mueble));
  const servicioItems = items.filter(i => esServicio(i.nombre || i.mueble));

  // Generar filas para Mobiliario
  const filasMobiliarioArray = [];
  mobiliarioItems.forEach(i => {
    const unitPrice = i.cantidad > 0 ? (parseFloat(i.subtotal || 0) / i.cantidad) : 0;
    
    // Fila principal del mueble o combo
    filasMobiliarioArray.push(`<tr>
      <td style="padding:6px 10px;vertical-align:top;">
        <span style="font-weight:600;">${i.nombre || i.mueble || ''}</span>
      </td>
      <td style="padding:6px 10px;text-align:center;vertical-align:top;font-weight:600;">${i.cantidad}</td>
      <td style="padding:6px 10px;text-align:right;vertical-align:top;">$${unitPrice.toFixed(2)}</td>
      <td style="padding:6px 10px;text-align:right;vertical-align:top;font-weight:600;">$${parseFloat(i.subtotal || 0).toFixed(2)}</td>
    </tr>`);

    // Si es un combo, agregar los componentes en filas individuales
    if (i.combo_id && todosLosCombos) {
      const componentesCombo = (i.componentes && i.componentes.length > 0)
        ? i.componentes
        : (() => {
            const comboObj = todosLosCombos.find(c => c.id === i.combo_id);
            return comboObj ? comboObj.items : [];
          })();

      componentesCombo.forEach(ci => {
        const compCant = ci.cantidad * i.cantidad;
        filasMobiliarioArray.push(`<tr style="background-color:#fafafa;font-size:11px;color:#555;">
          <td style="padding:4px 10px 4px 22px;">└─ ${ci.nombre}</td>
          <td style="padding:4px 10px;text-align:center;">${compCant}</td>
          <td style="padding:4px 10px;text-align:right;color:#888;">—</td>
          <td style="padding:4px 10px;text-align:right;color:#888;">—</td>
        </tr>`);
      });
    }
  });
  const filasMuebles = filasMobiliarioArray.join('');

  // Generar filas para Servicios Adicionales
  const filasServicios = servicioItems.map(i => {
    const unitPrice = i.cantidad > 0 ? (parseFloat(i.subtotal || 0) / i.cantidad) : 0;
    return `<tr>
      <td style="padding:6px 10px;vertical-align:top;">
        <span style="font-weight:600;">${i.nombre || i.mueble || ''}</span>
      </td>
      <td style="padding:6px 10px;text-align:center;vertical-align:top;font-weight:600;">${i.cantidad}</td>
      <td style="padding:6px 10px;text-align:right;vertical-align:top;">$${unitPrice.toFixed(2)}</td>
      <td style="padding:6px 10px;text-align:right;vertical-align:top;font-weight:600;">$${parseFloat(i.subtotal || 0).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const htmlContrato = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Contrato de Alquiler #${reserva.id.slice(0,8).toUpperCase()}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; line-height: 1.4; }
  .page { max-width: 780px; margin: 0 auto; padding: 32px 40px; box-sizing: border-box; }
  .header { border-bottom: 2.5px solid #3b82f6; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-size: 22px; font-weight: 800; color: #3b82f6; letter-spacing: -0.5px; }
  .logo span { color: #0f172a; }
  .contract-id { text-align: right; font-size: 11.5px; color: #64748b; }
  .contract-id strong { display: block; font-size: 15px; color: #0f172a; margin-bottom: 2px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }
  .field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; display: block; margin-bottom: 2px; font-weight: 600; }
  .field span { font-size: 12.5px; font-weight: 600; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; }
  table, th, td { border: 1px solid #cbd5e1; }
  thead { background: #f8fafc; }
  th { padding: 6px 10px; text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; font-weight: 700; }
  td { padding: 6px 10px; }
  .totals-container { display: flex; justify-content: flex-end; margin-top: 10px; }
  .totals { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 14px; width: 280px; box-sizing: border-box; }
  .total-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .total-row.final { font-size: 13.5px; font-weight: 800; color: #2563eb; border-top: 1.5px solid #cbd5e1; margin-top: 5px; padding-top: 6px; }
  .total-row.saldo { font-size: 13px; font-weight: 800; color: #dc2626; }
  .terms { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 10.5px; color: #475569; line-height: 1.5; white-space: pre-wrap; max-height: 220px; overflow: hidden; }
  .firma { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; }
  .firma-box { border-top: 1.5px solid #94a3b8; padding-top: 6px; text-align: center; font-size: 11px; color: #475569; font-weight: 500; }
  @media print { 
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 24px; max-width: 100%; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">🎉 Alquila<span> tu Party</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Contrato de Alquiler de Mobiliario y Servicios</div>
    </div>
    <div class="contract-id">
      <strong>Contrato #${reserva.id.slice(0,8).toUpperCase()}</strong>
      Fecha de emisión: ${new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Cliente</div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div class="field" style="flex: 1.5; min-width: 140px;"><label>Nombre completo</label><span>${reserva.nombre_cliente || '—'}</span></div>
      <div class="field" style="flex: 1; min-width: 90px;"><label>Teléfono</label><span>${cleanPhone || '—'}</span></div>
      <div class="field" style="flex: 2.5; min-width: 180px;"><label>Dirección de entrega</label><span>${reserva.direccion_entrega || '—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalles del Evento</div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div class="field" style="flex: 1.2; min-width: 160px;"><label>Fecha de Entrega</label><span>${formatFecha(reserva.fecha_inicio, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      <div class="field" style="flex: 1.2; min-width: 160px;"><label>Fecha de Retiro</label><span>${formatFecha(reserva.fecha_fin, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      ${(reserva.alias_cliente) ? `<div class="field" style="flex: 1; min-width: 100px;"><label>Alias / Evento</label><span>${reserva.alias_cliente}</span></div>` : ''}
      ${(reserva.notes || reserva.notas) ? `<div class="field" style="flex: 2; min-width: 180px;"><label>Notas adicionales</label><span style="font-weight:400;font-style:italic;">${reserva.notes || reserva.notas}</span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Mobiliario Reservado</div>
    <table>
      <thead>
        <tr>
          <th>DESCRIPCIÓN</th>
          <th style="text-align:center;width:65px;">CANT.</th>
          <th style="text-align:right;width:105px;">P. UNITARIO</th>
          <th style="text-align:right;width:105px;">IMPORTE</th>
        </tr>
      </thead>
      <tbody>${filasMuebles}</tbody>
    </table>
  </div>

  ${servicioItems.length > 0 ? `
  <div class="section">
    <div class="section-title">Servicios Adicionales</div>
    <table>
      <thead>
        <tr>
          <th>DESCRIPCIÓN</th>
          <th style="text-align:center;width:65px;">CANT.</th>
          <th style="text-align:right;width:105px;">P. UNITARIO</th>
          <th style="text-align:right;width:105px;">IMPORTE</th>
        </tr>
      </thead>
      <tbody>
        ${filasServicios}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="totals-container">
    <div class="totals">
      <div class="total-row"><span>Subtotal:</span><span>$${subtotalMobiliario.toFixed(2)}</span></div>
      <div class="total-row" style="color:#16a34a;"><span>Abono:</span><span>-$${totalAbono.toFixed(2)}</span></div>
      <div class="total-row final"><span>TOTAL:</span><span>$${parseFloat(reserva.total).toFixed(2)}</span></div>
      <div class="total-row saldo"><span>SALDO PENDIENTE:</span><span>$${Math.max(0, saldoPendiente).toFixed(2)}</span></div>
    </div>
  </div>

  <div class="section" style="margin-top:16px;">
    <div class="section-title">Términos y Condiciones</div>
    <div class="terms">${terminos || 'Ver términos en el establecimiento.'}</div>
  </div>

  <div class="firma">
    <div class="firma-box">
      <div style="margin-bottom:34px;">&nbsp;</div>
      Firma del Cliente<br><strong>${reserva.nombre_cliente || ''}</strong>
    </div>
    <div class="firma-box">
      <div style="margin-bottom:34px;">&nbsp;</div>
      Firma Alquila tu Party<br><strong>Representante Autorizado</strong>
    </div>
  </div>

  <div style="text-align:center;margin-top:28px;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:10px;">
    Documento oficial generado el ${new Date().toLocaleString('es')} · Alquila tu Party
  </div>
</div>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(htmlContrato);
  ventana.document.close();
  setTimeout(() => ventana.print(), 600);
}

// ─── Generador de Hoja de Entrega y Control (Sin Precios + Casillas Check) ────
function generarHojaEntregaPDF(reserva, items, todosLosCombos) {
  // Limpiar prefijo +507 o 507 del teléfono
  const cleanPhone = (reserva.telefono_cliente || '').replace(/^\+?507\s*/, '').trim();

  // Clasificar en mobiliario y servicios
  const esServicio = (nombre) => {
    const keywords = ['servicio', 'transporte', 'flete', 'montaje', 'armado', 'instalacio', 'envio', 'cargo', 'adicional', 'limpieza', 'deposito', 'garantia', 'decorac'];
    const n = (nombre || '').toLowerCase();
    return keywords.some(k => n.includes(k));
  };

  const mobiliarioItems = items.filter(i => !esServicio(i.nombre || i.mueble));
  const servicioItems = items.filter(i => esServicio(i.nombre || i.mueble));

  // Generar filas para Mobiliario
  const filasMobiliarioArray = [];
  mobiliarioItems.forEach(i => {
    // Fila principal del mueble o combo
    filasMobiliarioArray.push(`<tr>
      <td style="padding:6px;text-align:center;vertical-align:middle;">
        <div class="chk-box"></div>
      </td>
      <td style="padding:6px 10px;text-align:center;vertical-align:middle;font-weight:700;font-size:12.5px;">${i.cantidad}</td>
      <td style="padding:6px 10px;vertical-align:middle;">
        <span style="font-weight:700;">${i.nombre || i.mueble || ''}</span>
      </td>
      <td style="padding:6px;text-align:center;vertical-align:middle;">
        <div class="chk-box"></div>
      </td>
      <td style="padding:6px 10px;vertical-align:middle;border-bottom:1px dashed #cbd5e1;color:#64748b;font-size:10px;">
        &nbsp;
      </td>
    </tr>`);

    // Si es un combo, agregar los componentes en filas individuales con check
    if (i.combo_id && todosLosCombos) {
      const componentesCombo = (i.componentes && i.componentes.length > 0)
        ? i.componentes
        : (() => {
            const comboObj = todosLosCombos.find(c => c.id === i.combo_id);
            return comboObj ? comboObj.items : [];
          })();

      componentesCombo.forEach(ci => {
        const compCant = ci.cantidad * i.cantidad;
        filasMobiliarioArray.push(`<tr style="background-color:#fafafa;font-size:11px;color:#475569;">
          <td style="padding:4px;text-align:center;vertical-align:middle;">
            <div class="chk-box-sm"></div>
          </td>
          <td style="padding:4px 10px;text-align:center;vertical-align:middle;font-weight:600;">${compCant}</td>
          <td style="padding:4px 10px 4px 24px;vertical-align:middle;">└─ ${ci.nombre}</td>
          <td style="padding:4px;text-align:center;vertical-align:middle;">
            <div class="chk-box-sm"></div>
          </td>
          <td style="padding:4px 10px;border-bottom:1px dashed #e2e8f0;">&nbsp;</td>
        </tr>`);
      });
    }
  });
  const filasMuebles = filasMobiliarioArray.join('');

  // Generar filas para Servicios Adicionales
  const filasServicios = servicioItems.map(i => {
    return `<tr>
      <td style="padding:6px;text-align:center;vertical-align:middle;"><div class="chk-box"></div></td>
      <td style="padding:6px 10px;text-align:center;vertical-align:middle;font-weight:700;">${i.cantidad}</td>
      <td style="padding:6px 10px;vertical-align:middle;"><span style="font-weight:600;">${i.nombre || i.mueble || ''}</span></td>
      <td style="padding:6px;text-align:center;vertical-align:middle;"><div class="chk-box"></div></td>
      <td style="padding:6px 10px;border-bottom:1px dashed #cbd5e1;">&nbsp;</td>
    </tr>`;
  }).join('');

  const htmlHojaEntrega = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Hoja de Entrega #${reserva.id.slice(0,8).toUpperCase()}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; background: #fff; line-height: 1.4; }
  .page { max-width: 780px; margin: 0 auto; padding: 32px 40px; box-sizing: border-box; }
  .header { border-bottom: 2.5px solid #2563eb; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .logo { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .logo span { color: #0f172a; }
  .doc-id { text-align: right; font-size: 11.5px; color: #64748b; }
  .doc-id strong { display: block; font-size: 15px; color: #0f172a; margin-bottom: 2px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #2563eb; margin-bottom: 8px; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 4px; }
  .field label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; display: block; margin-bottom: 2px; font-weight: 600; }
  .field span { font-size: 12.5px; font-weight: 600; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-bottom: 14px; }
  table, th, td { border: 1px solid #cbd5e1; }
  thead { background: #f8fafc; }
  th { padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; font-weight: 700; }
  td { padding: 5px 8px; }
  .chk-box { width: 16px; height: 16px; border: 2px solid #2563eb; border-radius: 3px; margin: 0 auto; background: #fff; }
  .chk-box-sm { width: 13px; height: 13px; border: 1.5px solid #64748b; border-radius: 2px; margin: 0 auto; background: #fff; }
  .obs-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px 12px; min-height: 50px; font-size: 11px; color: #64748b; background: #f8fafc; }
  .clausula { font-size: 10.5px; color: #475569; font-style: italic; line-height: 1.45; margin-top: 14px; padding: 8px 12px; background: #f1f5f9; border-radius: 6px; border-left: 3px solid #2563eb; }
  .firmas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 28px; }
  .firma-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; background: #fff; }
  .firma-card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #2563eb; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-bottom: 24px; text-align: center; }
  .firma-linea { border-top: 1.5px solid #94a3b8; padding-top: 4px; text-align: center; font-size: 10.5px; color: #475569; margin-top: 30px; }
  @media print { 
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 24px; max-width: 100%; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="logo">🎉 Alquila<span> tu Party</span></div>
      <div style="font-size:11px;color:#64748b;margin-top:2px;">Hoja de Entrega y Control de Mobiliario</div>
    </div>
    <div class="doc-id">
      <strong>Control #${reserva.id.slice(0,8).toUpperCase()}</strong>
      Emisión: ${new Date().toLocaleDateString('es', { year: 'numeric', month: 'long', day: 'numeric' })}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Cliente</div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div class="field" style="flex: 1.5; min-width: 140px;"><label>Nombre completo</label><span>${reserva.nombre_cliente || '—'}</span></div>
      <div class="field" style="flex: 1; min-width: 90px;"><label>Teléfono</label><span>${cleanPhone || '—'}</span></div>
      <div class="field" style="flex: 2.5; min-width: 180px;"><label>Dirección de entrega</label><span>${reserva.direccion_entrega || '—'}</span></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Programación de Entrega y Retiro</div>
    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
      <div class="field" style="flex: 1.2; min-width: 160px;"><label>Fecha de Entrega</label><span>${formatFecha(reserva.fecha_inicio, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      <div class="field" style="flex: 1.2; min-width: 160px;"><label>Fecha de Retiro</label><span>${formatFecha(reserva.fecha_fin, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      ${(reserva.alias_cliente) ? `<div class="field" style="flex: 1; min-width: 100px;"><label>Alias / Evento</label><span>${reserva.alias_cliente}</span></div>` : ''}
      ${(reserva.notes || reserva.notas) ? `<div class="field" style="flex: 2; min-width: 180px;"><label>Instrucciones de Entrega</label><span style="font-weight:400;font-style:italic;">${reserva.notes || reserva.notas}</span></div>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Inventario y Artículos a Entregar</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:75px;">ENTREGA</th>
          <th style="text-align:center;width:60px;">CANT.</th>
          <th>DESCRIPCIÓN DEL MOBILIARIO / EQUIPO</th>
          <th style="text-align:center;width:80px;">RETIRO</th>
          <th style="width:160px;">OBSERVACIONES / ESTADO</th>
        </tr>
      </thead>
      <tbody>${filasMuebles}</tbody>
    </table>
  </div>

  ${servicioItems.length > 0 ? `
  <div class="section">
    <div class="section-title">Servicios a Ejecutar</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;width:75px;">CHECK</th>
          <th style="text-align:center;width:60px;">CANT.</th>
          <th>DESCRIPCIÓN DEL SERVICIO</th>
          <th style="text-align:center;width:80px;">CONFORME</th>
          <th style="width:160px;">OBSERVACIONES</th>
        </tr>
      </thead>
      <tbody>
        ${filasServicios}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Observaciones / Novedades en Sitio</div>
    <div class="obs-box">
      <em>Espacio para registrar novedades físicas, golpes previos, accesos o cambios en la entrega:</em>
      <div style="height:32px;"></div>
    </div>
  </div>

  <div class="clausula">
    <strong>Declaración de Conformidad:</strong> El cliente certifica haber recibido a satisfacción la totalidad del mobiliario y equipo detallado en perfectas condiciones y libre de daños, comprometiéndose a su custodia y devolución en la fecha y condiciones pactadas.
  </div>

  <div class="firmas-grid">
    <div class="firma-card">
      <div class="firma-card-title">1. Entrega del Mobiliario</div>
      <div class="firma-linea">
        Firma Responsable Entrega (Alquila tu Party)
      </div>
      <div class="firma-linea" style="margin-top:22px;">
        Firma Recibido Conforme (Cliente)
      </div>
    </div>

    <div class="firma-card">
      <div class="firma-card-title">2. Devolución / Retiro</div>
      <div class="firma-linea">
        Firma Responsable Retiro (Alquila tu Party)
      </div>
      <div class="firma-linea" style="margin-top:22px;">
        Firma Entrega Conforme (Cliente)
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:10px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:8px;">
    Hoja de control de entrega generada el ${new Date().toLocaleString('es')} · Alquila tu Party
  </div>
</div>
</body>
</html>`;

  const ventana = window.open('', '_blank');
  ventana.document.write(htmlHojaEntrega);
  ventana.document.close();
  setTimeout(() => ventana.print(), 600);
}

// Helper dates for reports
const formatYYYYMMDD = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFirstDayOfCurrentMonth = () => {
  const d = new Date();
  return formatYYYYMMDD(new Date(d.getFullYear(), d.getMonth(), 1));
};

const getToday = () => {
  return formatYYYYMMDD(new Date());
};

const getDatesInRange = (startDateStr, endDateStr) => {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  const dates = [];
  let curr = new Date(start);
  while (curr <= end) {
    dates.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

const formatShortDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const day = parseInt(parts[2]);
  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const month = monthNames[parseInt(parts[1]) - 1];
  return `${day} ${month}`;
};

const monthNamesSpanish = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const dayNamesSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayNamesShortSpanish = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const getDaysOfWeek = (refDate) => {
  const d = new Date(refDate);
  const day = d.getDay(); // 0 is Sunday, 1 is Monday ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust so week begins on Monday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    days.push(nextDay);
  }
  return days;
};

const getMonthCalendarMatrix = (year, monthIndex) => {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

  let startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun, 1 = Mon ...
  let startOffset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Mon = 0, ..., Sun = 6

  const days = [];

  // Previous month padding
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(year, monthIndex - 1, prevMonthLastDay - i);
    days.push({ date: d, dateStr: formatYYYYMMDD(d), isCurrentMonth: false });
  }

  // Current month days
  for (let dayNum = 1; dayNum <= lastDayOfMonth.getDate(); dayNum++) {
    const d = new Date(year, monthIndex, dayNum);
    days.push({ date: d, dateStr: formatYYYYMMDD(d), isCurrentMonth: true });
  }

  // Next month padding to complete grid rows
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, monthIndex + 1, i);
    days.push({ date: d, dateStr: formatYYYYMMDD(d), isCurrentMonth: false });
  }

  return days;
};

const isReservaActiveOnDate = (reserva, dateStr) => {
  if (!reserva.fecha_inicio) return false;
  const startStr = reserva.fecha_inicio.substring(0, 10);
  const endStr = reserva.fecha_fin ? reserva.fecha_fin.substring(0, 10) : startStr;
  return dateStr >= startStr && dateStr <= endStr;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'dashboard';
  const [muebles, setMuebles] = useState([]);
  const [combos, setCombos] = useState([]);

  // Estados de vista y filtros de Reservas (Lista, Semana, Mes)
  const [vistaReservas, setVistaReservas] = useState('lista'); // 'lista' | 'semana' | 'mes'
  const [fechaRefSemana, setFechaRefSemana] = useState(new Date());
  const [fechaRefMes, setFechaRefMes] = useState(new Date());
  const [diaSeleccionadoMes, setDiaSeleccionadoMes] = useState(formatYYYYMMDD(new Date()));
  const [filtroTextoReservas, setFiltroTextoReservas] = useState('');
  const [filtroEstadoReservas, setFiltroEstadoReservas] = useState('todos');

  // Estados formulario mobiliario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [precioDia, setPrecioDia] = useState('');
  const [stock, setStock] = useState('1');
  const [imagenes, setImagenes] = useState([]);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);
  const [muebleEditando, setMuebleEditando] = useState(null);
  const [activo, setActivo] = useState(true);

  // Estados formulario combos
  const [comboNombre, setComboNombre] = useState('');
  const [comboDescripcion, setComboDescripcion] = useState('');
  const [comboPrecioDia, setComboPrecioDia] = useState('');
  const [comboItems, setComboItems] = useState([]); // [{ mueble_id, nombre, cantidad }]
  const [muebleParaComboSeleccionado, setMuebleParaComboSeleccionado] = useState('');
  const [cantidadParaComboAgregar, setCantidadParaComboAgregar] = useState(1);
  const [comboEditando, setComboEditando] = useState(null);
  const [comboActivo, setComboActivo] = useState(true);
  const [loadingComboForm, setLoadingComboForm] = useState(false);

  // Estados edición de reservas
  const [reservaEditando, setReservaEditando] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editAlias, setEditAlias] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editDireccion, setEditDireccion] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [editFechaInicio, setEditFechaInicio] = useState('');
  const [editFechaFin, setEditFechaFin] = useState('');
  const [editTotal, setEditTotal] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [itemsEditando, setItemsEditando] = useState([]);
  const [muebleSeleccionado, setMuebleSeleccionado] = useState('');
  const [cantidadAgregar, setCantidadAgregar] = useState(1);
  const [tipoArticuloAgregar, setTipoArticuloAgregar] = useState('mueble'); // 'mueble' o 'combo'

  // Estados pagos
  const [modalPagos, setModalPagos] = useState(null); // reserva seleccionada
  const [pagosReserva, setPagosReserva] = useState([]);
  const [totalPagado, setTotalPagado] = useState(0);
  const [saldoPendiente, setSaldoPendiente] = useState(0);
  const [nuevoPagoMonto, setNuevoPagoMonto] = useState('');
  const [nuevoPagoMetodo, setNuevoPagoMetodo] = useState('efectivo');
  const [nuevoPagoNotas, setNuevoPagoNotas] = useState('');
  const [loadingPago, setLoadingPago] = useState(false);

  // Estados contrato PDF
  const [modalContrato, setModalContrato] = useState(null);
  const [contratoAbono, setContratoAbono] = useState('');
  const [pagosParaContrato, setPagosParaContrato] = useState([]);
  const [terminos, setTerminos] = useState('');

  const [terminosEdit, setTerminosEdit] = useState('');
  const [loadingTerminos, setLoadingTerminos] = useState(false);

  // Estados para Reportes
  const [reportesData, setReportesData] = useState(null);
  const [tipoReporte, setTipoReporte] = useState('mes'); // 'mes' o 'personalizado'
  const [mesReporte, setMesReporte] = useState(new Date().getMonth() + 1);
  const [anioReporte, setAnioReporte] = useState(new Date().getFullYear());
  const [fechaInicioReporte, setFechaInicioReporte] = useState(getFirstDayOfCurrentMonth());
  const [fechaFinReporte, setFechaFinReporte] = useState(getToday());
  const [loadingReportes, setLoadingReportes] = useState(false);
  const [activeBar, setActiveBar] = useState(null);

  const cargarReporte = async () => {
    if (tipoReporte === 'personalizado' && fechaInicioReporte > fechaFinReporte) {
      toast.error('La fecha de inicio no puede ser posterior a la fecha de fin');
      return;
    }
    setLoadingReportes(true);
    try {
      const params = { tipo: tipoReporte };
      if (tipoReporte === 'mes') {
        params.mes = mesReporte;
        params.anio = anioReporte;
      } else {
        params.fechaInicio = fechaInicioReporte;
        params.fechaFin = fechaFinReporte;
      }
      const res = await api.get('/admin/reportes', { params });
      setReportesData(res.data);
    } catch (err) {
      toast.error('Error al cargar reporte de estadísticas');
    } finally {
      setLoadingReportes(false);
    }
  };

  useEffect(() => {
    if (tab === 'reportes') {
      cargarReporte();
    }
  }, [tab, tipoReporte, mesReporte, anioReporte, fechaInicioReporte, fechaFinReporte]);

  // Cargar datos iniciales
  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/reservas').then(r => setReservas(r.data));
    api.get('/muebles?todos=true').then(r => setMuebles(r.data)).catch(() => {});
    api.get('/combos?todos=true').then(r => setCombos(r.data)).catch(() => {});
    api.get('/pagos/terminos').then(r => setTerminos(r.data.terminos)).catch(() => {});
  }, []);

  useEffect(() => {
    setTerminosEdit(terminos);
  }, [terminos]);

  // ── Editar reserva ──────────────────────────────────────────────────────────
  const abrirEditarReserva = (r) => {
    setReservaEditando(r);
    setEditAlias(r.alias_cliente || '');
    setEditNombre(r.nombre_cliente || '');

    setEditTelefono(r.telefono_cliente || '');
    setEditDireccion(r.direccion_entrega || '');
    setEditNotas(r.notes || r.notas || '');
    setEditFechaInicio(r.fecha_inicio ? r.fecha_inicio.substring(0, 10) : '');
    setEditFechaFin(r.fecha_fin ? r.fecha_fin.substring(0, 10) : '');
    setEditTotal(r.total || '');
    setEditEstado(r.estado || 'pendiente');
    const items = (r.items || []).filter(i => i && (i.mueble || i.combo_id)).map((i, idx) => {
      let customComps = i.componentes || [];
      if (i.combo_id && (!customComps || customComps.length === 0)) {
        const comboObj = combos.find(c => c.id === i.combo_id);
        if (comboObj && comboObj.items) {
          customComps = comboObj.items.map(ci => ({
            mueble_id: ci.mueble_id,
            nombre: ci.nombre,
            cantidad: ci.cantidad
          }));
        }
      }
      return {
        mueble_id: i.mueble_id || null,
        combo_id: i.combo_id || null,
        nombre: i.mueble,
        cantidad: i.cantidad,
        subtotal: i.subtotal,
        precio_unitario: i.precio_unitario !== undefined && i.precio_unitario !== null ? parseFloat(i.precio_unitario) : null,
        componentes: customComps
      };
    });
    
    setItemsEditando(items);
    setMuebleSeleccionado('');
    setCantidadAgregar(1);
    setTipoArticuloAgregar('mueble');
  };

  const agregarMuebleAReserva = () => {
    if (!muebleSeleccionado) return toast.error('Selecciona un artículo');

    if (tipoArticuloAgregar === 'combo') {
      const combo = combos.find(c => c.id === muebleSeleccionado);
      if (!combo) return;
      const yaExiste = itemsEditando.find(i => i.combo_id === muebleSeleccionado);
      let nuevosItems;
      if (yaExiste) {
        nuevosItems = itemsEditando.map(i =>
          i.combo_id === muebleSeleccionado ? { ...i, cantidad: i.cantidad + cantidadAgregar } : i
        );
      } else {
        nuevosItems = [...itemsEditando, {
          mueble_id: null,
          combo_id: combo.id,
          nombre: combo.nombre,
          cantidad: cantidadAgregar,
          precio_unitario: parseFloat(combo.precio_dia || 0),
          subtotal: parseFloat(combo.precio_dia || 0) * cantidadAgregar
        }];
      }
      setItemsEditando(nuevosItems);
      recalcularTotal(nuevosItems);
      setMuebleSeleccionado('');
      setCantidadAgregar(1);
      toast.success(`Combo "${combo.nombre}" agregado`);
    } else {
      const mueble = muebles.find(m => m.id === muebleSeleccionado);
      if (!mueble) return;
      const yaExiste = itemsEditando.find(i => i.mueble_id === muebleSeleccionado);
      let nuevosItems;
      if (yaExiste) {
        nuevosItems = itemsEditando.map(i =>
          i.mueble_id === muebleSeleccionado ? { ...i, cantidad: i.cantidad + cantidadAgregar } : i
        );
      } else {
        nuevosItems = [...itemsEditando, {
          mueble_id: mueble.id,
          combo_id: null,
          nombre: mueble.nombre,
          cantidad: cantidadAgregar,
          precio_unitario: parseFloat(mueble.precio_dia || 0),
          subtotal: parseFloat(mueble.precio_dia || 0) * cantidadAgregar
        }];
      }
      setItemsEditando(nuevosItems);
      recalcularTotal(nuevosItems);
      setMuebleSeleccionado('');
      setCantidadAgregar(1);
      toast.success(`${mueble.nombre} agregado`);
    }
  };

  const eliminarMuebleDeReserva = (id, esCombo = false, nombre = null) => {
    setItemsEditando(prev => {
      const nuevos = prev.filter(i => {
        if (!i.combo_id && !i.mueble_id) {
          return i.nombre !== nombre;
        }
        return esCombo ? i.combo_id !== id : i.mueble_id !== id;
      });
      recalcularTotal(nuevos);
      return nuevos;
    });
    toast.success('Artículo/servicio eliminado de la reserva');
  };

  const actualizarCantidadItem = (id, nuevaCantidad, esCombo = false, nombre = null) => {
    if (nuevaCantidad <= 0) return eliminarMuebleDeReserva(id, esCombo, nombre);
    setItemsEditando(prev => {
      const nuevos = prev.map(i => {
        if (!i.combo_id && !i.mueble_id) {
          return i.nombre === nombre ? { ...i, cantidad: nuevaCantidad, subtotal: (i.precio_unitario || 0) * nuevaCantidad } : i;
        }
        const match = esCombo ? (i.combo_id === id) : (i.mueble_id === id);
        return match ? { ...i, cantidad: nuevaCantidad } : i;
      });
      recalcularTotal(nuevos);
      return nuevos;
    });
  };

  const actualizarPrecioItem = (id, nuevoPrecio, esCombo = false, nombre = null) => {
    setItemsEditando(prev => {
      const nuevos = prev.map(i => {
        if (!i.combo_id && !i.mueble_id) {
          return i.nombre === nombre ? { ...i, precio_unitario: nuevoPrecio, subtotal: nuevoPrecio * i.cantidad } : i;
        }
        const match = esCombo ? (i.combo_id === id) : (i.mueble_id === id);
        return match ? { ...i, precio_unitario: nuevoPrecio } : i;
      });
      recalcularTotal(nuevos);
      return nuevos;
    });
  };

  const editarComponenteCombo = (itemIdx, compIdx, campo, valor) => {
    setItemsEditando(prev => prev.map((item, idx) => {
      if (idx !== itemIdx) return item;
      const nuevosComps = item.componentes.map((c, cIdx) => {
        if (cIdx !== compIdx) return c;
        return { ...c, [campo]: valor };
      });
      return { ...item, componentes: nuevosComps };
    }));
  };

  const eliminarComponenteCombo = (itemIdx, compIdx) => {
    setItemsEditando(prev => prev.map((item, idx) => {
      if (idx !== itemIdx) return item;
      const nuevosComps = item.componentes.filter((_, cIdx) => cIdx !== compIdx);
      return { ...item, componentes: nuevosComps };
    }));
  };

  const agregarComponenteCombo = (itemIdx, mueble) => {
    setItemsEditando(prev => prev.map((item, idx) => {
      if (idx !== itemIdx) return item;
      const yaExiste = (item.componentes || []).find(c => c.mueble_id === mueble.id);
      if (yaExiste) {
        toast.error('El artículo ya forma parte del combo');
        return item;
      }
      const nuevosComps = [...(item.componentes || []), {
        mueble_id: mueble.id,
        nombre: mueble.nombre,
        cantidad: 1
      }];
      return { ...item, componentes: nuevosComps };
    }));
  };

  const recalcularTotal = (items, customInicio, customFin) => {
    const inicio = customInicio !== undefined && customInicio !== null ? customInicio : editFechaInicio;
    const fin = customFin !== undefined && customFin !== null ? customFin : editFechaFin;
    if (!inicio || !fin) return items;

    const [y1, m1, d1] = inicio.substring(0, 10).split('-');
    const [y2, m2, d2] = fin.substring(0, 10).split('-');
    const date1 = new Date(Number(y1), Number(m1) - 1, Number(d1));
    const date2 = new Date(Number(y2), Number(m2) - 1, Number(d2));
    const dias = Math.ceil((date2 - date1) / 86400000) + 1;

    if (dias <= 0) return items;

    const updatedItems = items.map(item => {
      if (item.combo_id) {
        let precio = item.precio_unitario;
        if (precio === undefined || precio === null || isNaN(precio)) {
          const combo = combos.find(c => c.id === item.combo_id);
          precio = combo ? parseFloat(combo.precio_dia || 0) : 0;
        }
        const subtotal = parseFloat(precio) * item.cantidad * dias;
        return { ...item, precio_unitario: precio, subtotal };
      } else if (item.mueble_id) {
        let precio = item.precio_unitario;
        if (precio === undefined || precio === null || isNaN(precio)) {
          const mueble = muebles.find(m => m.id === item.mueble_id);
          precio = mueble ? parseFloat(mueble.precio_dia || 0) : 0;
        }
        const subtotal = parseFloat(precio) * item.cantidad * dias;
        return { ...item, precio_unitario: precio, subtotal };
      } else {
        let precio = item.precio_unitario;
        if (precio === undefined || precio === null || isNaN(precio)) {
          precio = item.subtotal / item.cantidad || 0;
        }
        const subtotal = parseFloat(precio) * item.cantidad;
        return { ...item, precio_unitario: precio, subtotal };
      }
    });

    const total = updatedItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
    setEditTotal(total.toFixed(2));
    return updatedItems;
  };

  const guardarEdicionReserva = async (e) => {
    e.preventDefault();
    if (!editFechaInicio || !editFechaFin) return toast.error('Las fechas son obligatorias');
    if (itemsEditando.length === 0) return toast.error('La reserva debe tener al menos un artículo');
    setLoadingEdit(true);
    try {
      const payload = {
        alias_cliente: editAlias.trim(),
        nombre_cliente: editNombre.trim(),
        email_cliente: null,
        telefono_cliente: editTelefono.trim(),
        direccion_entrega: editDireccion.trim(),
        notes: editNotas.trim(),
        notas: editNotas.trim(),
        fecha_inicio: editFechaInicio,
        fecha_fin: editFechaFin,
        total: parseFloat(editTotal) || 0,
        estado: editEstado
      };
      await api.put(`/reservas/${reservaEditando.id}`, payload);
      await api.put(`/reservas/${reservaEditando.id}/items`, {
        items: itemsEditando.map(i => ({ 
          mueble_id: i.mueble_id || null, 
          combo_id: i.combo_id || null, 
          cantidad: i.cantidad,
          nombre: (!i.mueble_id && !i.combo_id) ? i.nombre : null,
          precio_unitario: i.precio_unitario !== undefined && i.precio_unitario !== null ? parseFloat(i.precio_unitario) : null,
          componentes: i.combo_id ? i.componentes : null
        }))
      });
      toast.success('Reserva actualizada correctamente');
      setReservas(prev => prev.map(r => r.id === reservaEditando.id ? {
        ...r, ...payload,
        items: itemsEditando.map(i => ({ 
          mueble_id: i.mueble_id, 
          combo_id: i.combo_id, 
          mueble: i.nombre, 
          cantidad: i.cantidad, 
          precio_unitario: i.precio_unitario,
          subtotal: i.subtotal,
          componentes: i.componentes || []
        }))
      } : r));
      setReservaEditando(null);
      api.get('/admin/stats').then(r => setStats(r.data));
      api.get('/muebles?todos=true').then(r => setMuebles(r.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar la reserva');
    } finally {
      setLoadingEdit(false);
    }
  };

  // ── Eliminar reserva ────────────────────────────────────────────────────────
  const eliminarReserva = async (r) => {
    if (!window.confirm(`¿Eliminar definitivamente la reserva #${r.id.slice(0,8).toUpperCase()} de ${r.nombre_cliente}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/reservas/${r.id}`);
      setReservas(prev => prev.filter(x => x.id !== r.id));
      toast.success('Reserva eliminada');
      api.get('/admin/stats').then(res => setStats(res.data));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  // ── Pagos ───────────────────────────────────────────────────────────────────
  const abrirPagos = async (r) => {
    setModalPagos(r);
    setNuevoPagoMonto('');
    setNuevoPagoMetodo('efectivo');
    setNuevoPagoNotas('');
    try {
      const res = await api.get(`/pagos/reserva/${r.id}`);
      setPagosReserva(res.data.pagos);
      setTotalPagado(res.data.total_pagado);
      setSaldoPendiente(res.data.saldo_pendiente);
    } catch { toast.error('Error al cargar pagos'); }
  };

  const registrarPago = async () => {
    if (!nuevoPagoMonto || parseFloat(nuevoPagoMonto) <= 0) return toast.error('Ingresa un monto válido');
    setLoadingPago(true);
    try {
      const res = await api.post('/pagos', {
        reserva_id: modalPagos.id,
        monto: parseFloat(nuevoPagoMonto),
        metodo: nuevoPagoMetodo,
        notas: nuevoPagoNotas
      });
      const nuevosPagos = [...pagosReserva, res.data];
      setPagosReserva(nuevosPagos);
      const nuevoTotal = nuevosPagos.reduce((s, p) => s + parseFloat(p.monto), 0);
      setTotalPagado(nuevoTotal);
      setSaldoPendiente(parseFloat(modalPagos.total) - nuevoTotal);
      setNuevoPagoMonto('');
      setNuevoPagoNotas('');
      toast.success('Pago registrado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar pago');
    } finally {
      setLoadingPago(false);
    }
  };

  const eliminarPago = async (pagoId) => {
    if (!window.confirm('¿Eliminar este pago?')) return;
    try {
      await api.delete(`/pagos/${pagoId}`);
      const nuevosPagos = pagosReserva.filter(p => p.id !== pagoId);
      setPagosReserva(nuevosPagos);
      const nuevoTotal = nuevosPagos.reduce((s, p) => s + parseFloat(p.monto), 0);
      setTotalPagado(nuevoTotal);
      setSaldoPendiente(parseFloat(modalPagos.total) - nuevoTotal);
      toast.success('Pago eliminado');
    } catch { toast.error('Error al eliminar pago'); }
  };

  // ── Contrato PDF ─────────────────────────────────────────────────────────────
  const abrirContrato = async (r) => {
    setModalContrato(r);
    setContratoAbono('');
    try {
      const res = await api.get(`/pagos/reserva/${r.id}`);
      setPagosParaContrato(res.data.pagos);
    } catch { setPagosParaContrato([]); }
  };

  const guardarTerminos = async () => {
    setLoadingTerminos(true);
    try {
      await api.put('/pagos/terminos', { terminos: terminosEdit });
      setTerminos(terminosEdit);
      toast.success('Términos guardados');
    } catch { toast.error('Error al guardar términos'); }
    finally { setLoadingTerminos(false); }
  };

  // ── Mobiliario ───────────────────────────────────────────────────────────────
  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/reservas/${id}/estado`, { estado });
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado } : r));
      toast.success('Estado actualizado');
    } catch { toast.error('Error al actualizar'); }
  };

  const agregarImagen = (e) => {
    e.preventDefault();
    if (!nuevaImagenUrl.trim()) return;
    if (!nuevaImagenUrl.startsWith('http://') && !nuevaImagenUrl.startsWith('https://')) {
      return toast.error('La URL debe iniciar con http:// o https://');
    }
    setImagenes(prev => [...prev, nuevaImagenUrl.trim()]);
    setNuevaImagenUrl('');
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Comprimir al 60% en formato JPEG para optimizar espacio en base de datos
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setImagenes(prev => [...prev, dataUrl]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const eliminarImagen = (index) => setImagenes(prev => prev.filter((_, i) => i !== index));

  const iniciarEditarMueble = (m) => {
    setMuebleEditando(m);
    setNombre(m.nombre);
    setDescripcion(m.descripcion || '');
    setPrecioDia(m.precio_dia || '');
    setStock(m.stock);
    setImagenes(m.imagenes || []);
    setActivo(m.activo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarMueble = async (id, nombreMueble) => {
    if (!window.confirm(`¿Eliminar definitivamente el mueble "${nombreMueble}" de la base de datos? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/muebles/${id}`);
      toast.success(`Mueble "${nombreMueble}" eliminado`);
      api.get('/admin/stats').then(r => setStats(r.data));
      api.get('/muebles?todos=true').then(r => setMuebles(r.data));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al eliminar el mueble');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast.error('El nombre es obligatorio');
    if (!stock || parseInt(stock) < 0) return toast.error('El stock no puede ser negativo');
    setLoadingForm(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria_id: null,
        precio_dia: precioDia ? parseFloat(precioDia) : 0.00,
        precio_semana: null,
        precio_mes: null,
        stock: parseInt(stock),
        imagenes,
        activo: muebleEditando ? activo : true
      };

      if (muebleEditando) {
        const res = await api.put(`/muebles/${muebleEditando.id}`, payload);
        toast.success(`Mueble "${res.data.nombre}" actualizado con éxito`);
      } else {
        const res = await api.post('/muebles', payload);
        toast.success(`Mueble "${res.data.nombre}" creado con éxito`);
      }

      setNombre(''); setDescripcion(''); setPrecioDia('');
      setStock('1'); setImagenes([]); setNuevaImagenUrl('');
      setActivo(true);
      setMuebleEditando(null);
      api.get('/admin/stats').then(r => setStats(r.data));
      api.get('/muebles?todos=true').then(r => setMuebles(r.data));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar el mueble');
    } finally {
      setLoadingForm(false);
    }
  };

  // ── Combos y Paquetes CRUD ──────────────────────────────────────────────────
  const agregarMuebleAlCombo = () => {
    if (!muebleParaComboSeleccionado) return toast.error('Selecciona un mueble');
    const mueble = muebles.find(m => m.id === muebleParaComboSeleccionado);
    if (!mueble) return;
    const yaExiste = comboItems.find(i => i.mueble_id === muebleParaComboSeleccionado);
    if (yaExiste) {
      setComboItems(prev => prev.map(i => i.mueble_id === muebleParaComboSeleccionado ? { ...i, cantidad: i.cantidad + cantidadParaComboAgregar } : i));
    } else {
      setComboItems(prev => [...prev, { mueble_id: mueble.id, nombre: mueble.nombre, cantidad: cantidadParaComboAgregar }]);
    }
    setMuebleParaComboSeleccionado('');
    setCantidadParaComboAgregar(1);
    toast.success(`${mueble.nombre} añadido al combo`);
  };

  const eliminarMuebleDelCombo = (mueble_id) => {
    setComboItems(prev => prev.filter(i => i.mueble_id !== mueble_id));
    toast.success('Mueble quitado del combo');
  };

  const iniciarEditarCombo = (c) => {
    setComboEditando(c);
    setComboNombre(c.nombre);
    setComboDescripcion(c.descripcion || '');
    setComboPrecioDia(c.precio_dia || '');
    setComboItems(c.items.map(i => ({ mueble_id: i.mueble_id, nombre: i.nombre, cantidad: i.cantidad })));
    setComboActivo(c.activo !== undefined ? c.activo : true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitCombo = async (e) => {
    e.preventDefault();
    if (!comboNombre.trim()) return toast.error('El nombre es obligatorio');
    if (comboItems.length === 0) return toast.error('El combo debe incluir al menos un mueble');
    setLoadingComboForm(true);
    try {
      const payload = {
        nombre: comboNombre.trim(),
        descripcion: comboDescripcion.trim(),
        precio_dia: comboPrecioDia ? parseFloat(comboPrecioDia) : 0.00,
        precio_semana: null,
        precio_mes: null,
        items: comboItems,
        activo: comboEditando ? comboActivo : true
      };
      
      if (comboEditando) {
        const res = await api.put(`/combos/${comboEditando.id}`, payload);
        toast.success(`Combo "${res.data.nombre}" actualizado con éxito`);
      } else {
        await api.post('/combos', payload);
        toast.success(`Combo creado con éxito`);
      }
      
      setComboNombre('');
      setComboDescripcion('');
      setComboPrecioDia('');
      setComboItems([]);
      setComboActivo(true);
      setComboEditando(null);
      
      api.get('/combos?todos=true').then(r => setCombos(r.data));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Error al guardar el combo');
    } finally {
      setLoadingComboForm(false);
    }
  };

  const eliminarCombo = async (id) => {
    if (!window.confirm('¿Eliminar definitivamente este combo de la base de datos? Esta acción no se puede deshacer.')) return;
    try {
      await api.delete(`/combos/${id}`);
      setCombos(prev => prev.filter(c => c.id !== id));
      toast.success('Combo eliminado');
    } catch {
      toast.error('Error al eliminar combo');
    }
  };



  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>
          {tab === 'dashboard' ? 'Panel de administración' : 
           tab === 'reservas' ? 'Gestión de Reservas' : 
           tab === 'mobiliario' ? 'Inventario de Mobiliario' : 
           tab === 'combos' ? 'Combos y Paquetes' : 
           tab === 'reportes' ? 'Estadísticas e Ingresos' : 
           'Términos del Contrato'}
        </h1>
        {tab === 'reservas' && (
          <Link
            to="/catalogo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              background: '#4a6cf7',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 2px 8px rgba(74, 108, 247, 0.25)',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#3b5bdb'}
            onMouseOut={e => e.currentTarget.style.background = '#4a6cf7'}
          >
            <span>➕</span>
            <span>Nueva Reserva</span>
          </Link>
        )}
      </div>



      {/* ── Dashboard ── */}
      {tab === 'dashboard' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total reservas', value: stats.total_reservas, icon: '📋' },
            { label: 'Ingresos totales', value: `$${stats.ingresos_total?.toFixed(2)}`, icon: '💰' },
            { label: 'Muebles activos', value: stats.total_muebles, icon: '🪑' },
            { label: 'Combos activos', value: stats.total_combos || 0, icon: '🎁' },
            { label: 'Pendientes', value: stats.reservas_pendientes, icon: '⏳' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>{s.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1a1a2e' }}>{s.value}</div>
              <div style={{ color: '#888', fontSize: 13 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Reservas ── */}
      {tab === 'reservas' && (() => {
        // Filtrar reservas según texto y estado
        const reservasFiltradas = reservas.filter(r => {
          if (filtroEstadoReservas !== 'todos' && r.estado !== filtroEstadoReservas) return false;
          if (!filtroTextoReservas.trim()) return true;
          const query = filtroTextoReservas.toLowerCase().trim();
          const nombre = (r.nombre_cliente || '').toLowerCase();
          const alias = (r.alias_cliente || '').toLowerCase();
          const email = (r.email_cliente || '').toLowerCase();
          const tel = (r.telefono_cliente || '').toLowerCase();
          const id = String(r.id || '');
          return nombre.includes(query) || alias.includes(query) || email.includes(query) || tel.includes(query) || id.includes(query);
        });

        // Días de la semana seleccionada
        const diasSemana = getDaysOfWeek(fechaRefSemana);

        // Matriz del mes seleccionado
        const anioMes = fechaRefMes.getFullYear();
        const mesIdx = fechaRefMes.getMonth();
        const diasCalendarioMes = getMonthCalendarMatrix(anioMes, mesIdx);

        // Funciones de navegación de semana
        const navegarSemana = (delta) => {
          setFechaRefSemana(prev => {
            const n = new Date(prev);
            n.setDate(n.getDate() + delta * 7);
            return n;
          });
        };

        // Funciones de navegación de mes
        const navegarMes = (delta) => {
          setFechaRefMes(prev => {
            const n = new Date(prev);
            n.setMonth(n.getMonth() + delta);
            return n;
          });
        };

        const todayStr = getToday();

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Barra de Filtro de Vistas y Búsqueda */}
            <div style={{
              background: '#fff',
              borderRadius: 12,
              padding: '14px 20px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {/* 3 Iconos / Botones de Vista (Lista, Semana, Mes) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f3f9', padding: '4px', borderRadius: '10px' }}>
                <button
                  type="button"
                  onClick={() => setVistaReservas('lista')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: vistaReservas === 'lista' ? '#4a6cf7' : 'transparent',
                    color: vistaReservas === 'lista' ? '#fff' : '#4b5563',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: vistaReservas === 'lista' ? '0 2px 8px rgba(74, 108, 247, 0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  title="Ver en formato Lista"
                >
                  <span style={{ fontSize: '17px' }}>📋</span>
                  <span>Lista</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVistaReservas('semana')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: vistaReservas === 'semana' ? '#4a6cf7' : 'transparent',
                    color: vistaReservas === 'semana' ? '#fff' : '#4b5563',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: vistaReservas === 'semana' ? '0 2px 8px rgba(74, 108, 247, 0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  title="Ver en formato Semana"
                >
                  <span style={{ fontSize: '17px' }}>📅</span>
                  <span>Semana</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVistaReservas('mes')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: vistaReservas === 'mes' ? '#4a6cf7' : 'transparent',
                    color: vistaReservas === 'mes' ? '#fff' : '#4b5563',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: vistaReservas === 'mes' ? '0 2px 8px rgba(74, 108, 247, 0.35)' : 'none',
                    transition: 'all 0.2s'
                  }}
                  title="Ver en formato Mes"
                >
                  <span style={{ fontSize: '17px' }}>🗓️</span>
                  <span>Mes</span>
                </button>
              </div>

              {/* Filtros complementarios de búsqueda y estado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end' }}>
                <div style={{ position: 'relative', minWidth: 200, flex: '1 1 200px', maxWidth: 300 }}>
                  <input
                    type="text"
                    placeholder="🔍 Buscar alias, cliente, tel..."
                    value={filtroTextoReservas}
                    onChange={e => setFiltroTextoReservas(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid #ddd',
                      fontSize: 13,
                      boxSizing: 'border-box'
                    }}
                  />
                  {filtroTextoReservas && (
                    <button
                      onClick={() => setFiltroTextoReservas('')}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#999', fontSize: 12 }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={filtroEstadoReservas}
                  onChange={e => setFiltroEstadoReservas(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    fontSize: 13,
                    background: '#fff',
                    color: '#444',
                    fontWeight: 500
                  }}
                >
                  <option value="todos">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="activa">Activa</option>
                  <option value="completada">Completada</option>
                  <option value="cancelada">Cancelada</option>
                </select>

                <div style={{ background: '#eef2ff', color: '#4a6cf7', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {reservasFiltradas.length} {reservasFiltradas.length === 1 ? 'reserva' : 'reservas'}
                </div>
              </div>
            </div>

            {/* ── 1. VISTA LISTA ── */}
            {vistaReservas === 'lista' && (
              <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8f9ff' }}>
                      {['Alias', 'Cliente', 'Fechas', 'Total', 'Estado', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reservasFiltradas.map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#333' }}>{r.alias_cliente || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{r.nombre_cliente || 'Sin nombre'}</div>
                          {r.email_cliente && <div style={{ color: '#888', fontSize: 12 }}>{r.email_cliente}</div>}
                          {r.telefono_cliente && <div style={{ color: '#666', fontSize: 11 }}>📞 {r.telefono_cliente}</div>}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>
                          {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4a6cf7' }}>${parseFloat(r.total || 0).toFixed(2)}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: estadoColor[r.estado] + '22', color: estadoColor[r.estado], padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{r.estado}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <button onClick={() => abrirEditarReserva(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Editar">✏️</button>
                            <button onClick={() => abrirPagos(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Pagos">💳</button>
                            <button onClick={() => abrirContrato(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Contrato PDF">📄</button>
                            <button onClick={() => generarHojaEntregaPDF(r, r.items || [], combos)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Hoja de Entrega (Checklist)">🚚</button>
                            <button onClick={() => eliminarReserva(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Eliminar definitivamente">🗑️</button>
                            {r.estado !== 'cancelada' && r.estado !== 'completada' && (
                              <button 
                                onClick={() => {
                                  if (window.confirm(`¿Estás seguro de que deseas cancelar la reserva de ${r.nombre_cliente}?`)) {
                                    cambiarEstado(r.id, 'cancelada');
                                  }
                                }}
                                style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                                title="Cancelar reserva"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {reservasFiltradas.length === 0 && (
                      <tr><td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: '#888' }}>No se encontraron reservas con los filtros seleccionados.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── 2. VISTA SEMANA ── */}
            {vistaReservas === 'semana' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Navegador de Semana */}
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '12px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => navegarSemana(-1)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      ◀ Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setFechaRefSemana(new Date())}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #4a6cf7', background: '#eef2ff', color: '#4a6cf7', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Hoy / Esta Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => navegarSemana(1)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Siguiente ▶
                    </button>
                  </div>

                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1a2e' }}>
                    Semana del {diasSemana[0].getDate()} de {monthNamesSpanish[diasSemana[0].getMonth()]} al {diasSemana[6].getDate()} de {monthNamesSpanish[diasSemana[6].getMonth()]} {diasSemana[6].getFullYear()}
                  </div>
                </div>

                {/* Columnas de los 7 días */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px'
                }}>
                  {diasSemana.map((diaObj) => {
                    const diaStr = formatYYYYMMDD(diaObj);
                    const esHoy = diaStr === todayStr;
                    const reservasDelDia = reservasFiltradas.filter(r => isReservaActiveOnDate(r, diaStr));

                    return (
                      <div
                        key={diaStr}
                        style={{
                          background: '#fff',
                          borderRadius: 12,
                          padding: '12px 10px',
                          boxShadow: esHoy ? '0 0 0 2px #4a6cf7, 0 4px 12px rgba(74, 108, 247, 0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '280px'
                        }}
                      >
                        {/* Cabecera del día */}
                        <div style={{
                          paddingBottom: '8px',
                          marginBottom: '10px',
                          borderBottom: '1px solid #f0f0f0',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, color: esHoy ? '#4a6cf7' : '#888', letterSpacing: '0.5px' }}>
                            {dayNamesSpanish[diaObj.getDay()]}
                          </div>
                          <div style={{
                            fontSize: '1.3rem',
                            fontWeight: 800,
                            color: esHoy ? '#4a6cf7' : '#1a1a2e',
                            marginTop: '2px'
                          }}>
                            {diaObj.getDate()}
                          </div>
                          <div style={{ fontSize: '10px', color: '#aaa' }}>
                            {monthNamesSpanish[diaObj.getMonth()].substring(0, 3)}
                          </div>
                          {esHoy && (
                            <span style={{ display: 'inline-block', background: '#4a6cf7', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 6px', borderRadius: '10px', marginTop: '4px' }}>
                              HOY
                            </span>
                          )}
                          <div style={{ marginTop: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: reservasDelDia.length > 0 ? '#4a6cf7' : '#bbb' }}>
                              {reservasDelDia.length} {reservasDelDia.length === 1 ? 'reserva' : 'reservas'}
                            </span>
                          </div>
                        </div>

                        {/* Tarjetas de reservas del día */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                          {reservasDelDia.map(r => (
                            <div
                              key={`${diaStr}-${r.id}`}
                              style={{
                                background: '#f8f9ff',
                                borderRadius: 8,
                                padding: '8px',
                                borderLeft: `4px solid ${estadoColor[r.estado] || '#4a6cf7'}`,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px'
                              }}
                            >
                              <div style={{ fontWeight: 700, fontSize: '12px', color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.alias_cliente || r.nombre_cliente}>
                                {r.alias_cliente ? `🏷️ ${r.alias_cliente}` : (r.nombre_cliente || 'Reserva')}
                              </div>
                              <div style={{ fontSize: '11px', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                👤 {r.nombre_cliente || '-'}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4a6cf7' }}>
                                  ${parseFloat(r.total || 0).toFixed(0)}
                                </span>
                                <span style={{ background: (estadoColor[r.estado] || '#888') + '22', color: estadoColor[r.estado] || '#888', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: 4, textTransform: 'capitalize' }}>
                                  {r.estado}
                                </span>
                              </div>
                              {/* Botones de acción compactos */}
                              <div style={{ display: 'flex', gap: '4px', marginTop: '4px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '4px' }}>
                                <button onClick={() => abrirEditarReserva(r)} style={{ padding: '3px 5px', borderRadius: 4, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: '10px', cursor: 'pointer' }} title="Editar">✏️</button>
                                <button onClick={() => abrirPagos(r)} style={{ padding: '3px 5px', borderRadius: 4, border: 'none', background: '#22c55e', color: '#fff', fontSize: '10px', cursor: 'pointer' }} title="Pagos">💳</button>
                                <button onClick={() => abrirContrato(r)} style={{ padding: '3px 5px', borderRadius: 4, border: 'none', background: '#f59e0b', color: '#fff', fontSize: '10px', cursor: 'pointer' }} title="Contrato PDF">📄</button>
                                <button onClick={() => generarHojaEntregaPDF(r, r.items || [], combos)} style={{ padding: '3px 5px', borderRadius: 4, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: '10px', cursor: 'pointer' }} title="Hoja de Entrega">🚚</button>
                              </div>
                            </div>
                          ))}
                          {reservasDelDia.length === 0 && (
                            <div style={{ textAlign: 'center', color: '#ccc', fontSize: '11px', margin: 'auto 0', fontStyle: 'italic' }}>
                              Libre
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── 3. VISTA MES ── */}
            {vistaReservas === 'mes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Navegador de Mes */}
                <div style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '12px 20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => navegarMes(-1)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      ◀ Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setFechaRefMes(new Date())}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #4a6cf7', background: '#eef2ff', color: '#4a6cf7', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Mes Actual
                    </button>
                    <button
                      type="button"
                      onClick={() => navegarMes(1)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#333', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                    >
                      Siguiente ▶
                    </button>
                  </div>

                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1a1a2e' }}>
                    {monthNamesSpanish[mesIdx]} {anioMes}
                  </div>
                </div>

                {/* Calendario mensual en cuadrícula */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  {/* Encabezados de días de la semana */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '8px', textAlign: 'center' }}>
                    {dayNamesShortSpanish.map(d => (
                      <div key={d} style={{ fontWeight: 700, fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', padding: '6px 0' }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Celdas del mes */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                    {diasCalendarioMes.map((c, cIdx) => {
                      const esHoy = c.dateStr === todayStr;
                      const esSeleccionado = c.dateStr === diaSeleccionadoMes;
                      const reservasDelDia = reservasFiltradas.filter(r => isReservaActiveOnDate(r, c.dateStr));

                      return (
                        <div
                          key={cIdx}
                          onClick={() => setDiaSeleccionadoMes(c.dateStr)}
                          style={{
                            minHeight: '90px',
                            padding: '6px',
                            borderRadius: 8,
                            border: esSeleccionado ? '2px solid #4a6cf7' : (esHoy ? '2px solid #93c5fd' : '1px solid #f0f0f0'),
                            background: esSeleccionado ? '#f0f4ff' : (c.isCurrentMonth ? '#fff' : '#fafafa'),
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            opacity: c.isCurrentMonth ? 1 : 0.45,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{
                              fontWeight: (esHoy || esSeleccionado) ? 800 : 600,
                              fontSize: '12px',
                              color: esHoy ? '#4a6cf7' : (c.isCurrentMonth ? '#333' : '#999'),
                              background: esHoy ? '#eef2ff' : 'transparent',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {c.date.getDate()}
                            </span>
                            {reservasDelDia.length > 0 && (
                              <span style={{ background: '#4a6cf7', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: 10 }}>
                                {reservasDelDia.length}
                              </span>
                            )}
                          </div>

                          {/* Mini lista de reservas en el día */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'hidden', flex: 1 }}>
                            {reservasDelDia.slice(0, 2).map(r => (
                              <div
                                key={r.id}
                                style={{
                                  background: (estadoColor[r.estado] || '#4a6cf7') + '1a',
                                  color: estadoColor[r.estado] || '#4a6cf7',
                                  borderLeft: `2px solid ${estadoColor[r.estado] || '#4a6cf7'}`,
                                  borderRadius: '3px',
                                  padding: '1px 4px',
                                  fontSize: '9px',
                                  fontWeight: 600,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={`${r.alias_cliente || r.nombre_cliente} ($${r.total}) - ${r.estado}`}
                              >
                                {r.alias_cliente || r.nombre_cliente || 'Reserva'}
                              </div>
                            ))}
                            {reservasDelDia.length > 2 && (
                              <span style={{ fontSize: '9px', color: '#888', fontStyle: 'italic', paddingLeft: '2px' }}>
                                +{reservasDelDia.length - 2} más
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Detalle del Día Seleccionado en el Mes */}
                {diaSeleccionadoMes && (() => {
                  const reservasDelDiaSeleccionado = reservasFiltradas.filter(r => isReservaActiveOnDate(r, diaSeleccionadoMes));
                  const [y, m, d] = diaSeleccionadoMes.split('-');
                  const fechaObj = new Date(Number(y), Number(m) - 1, Number(d));

                  return (
                    <div style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1a1a2e' }}>
                          Reservas para el {fechaObj.getDate()} de {monthNamesSpanish[fechaObj.getMonth()]} {fechaObj.getFullYear()} ({reservasDelDiaSeleccionado.length})
                        </h3>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          Día seleccionado en el calendario
                        </span>
                      </div>

                      {reservasDelDiaSeleccionado.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                          {reservasDelDiaSeleccionado.map(r => (
                            <div
                              key={r.id}
                              style={{
                                background: '#f8f9ff',
                                borderRadius: 10,
                                padding: '14px',
                                borderLeft: `5px solid ${estadoColor[r.estado] || '#4a6cf7'}`,
                                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e' }}>
                                    {r.alias_cliente ? `🏷️ ${r.alias_cliente}` : (r.nombre_cliente || 'Sin nombre')}
                                  </div>
                                  <div style={{ fontSize: '12px', color: '#666' }}>
                                    Cliente: <strong>{r.nombre_cliente || '-'}</strong> {r.telefono_cliente && `(📞 ${r.telefono_cliente})`}
                                  </div>
                                </div>
                                <span style={{ background: (estadoColor[r.estado] || '#888') + '22', color: estadoColor[r.estado] || '#888', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 12, textTransform: 'capitalize' }}>
                                  {r.estado}
                                </span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#555', background: '#fff', padding: '6px 10px', borderRadius: 6 }}>
                                <span>📅 {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}</span>
                                <span style={{ fontWeight: 700, color: '#4a6cf7' }}>Total: ${parseFloat(r.total || 0).toFixed(2)}</span>
                              </div>

                              {r.direccion_entrega && (
                                <div style={{ fontSize: '11px', color: '#777' }}>
                                  📍 {r.direccion_entrega}
                                </div>
                              )}

                              <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                                <button onClick={() => abrirEditarReserva(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Editar">✏️ Editar</button>
                                <button onClick={() => abrirPagos(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#22c55e', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Pagos">💳 Pagos</button>
                                <button onClick={() => abrirContrato(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Contrato PDF">📄 Contrato</button>
                                <button onClick={() => generarHojaEntregaPDF(r, r.items || [], combos)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#8b5cf6', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Hoja de Entrega (Checklist)">🚚 Entrega</button>
                                <button onClick={() => eliminarReserva(r)} style={{ padding: '6px 10px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Eliminar definitivamente">🗑️ Eliminar</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#888', background: '#fafafa', borderRadius: 8 }}>
                          No hay reservas registradas para el {fechaObj.getDate()} de {monthNamesSpanish[fechaObj.getMonth()]}.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Mobiliario ── */}
      {tab === 'mobiliario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                {muebleEditando ? `Editar Mueble: ${muebleEditando.nombre}` : 'Agregar nuevo mueble'}
              </h3>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Nombre del Mueble *</label>
                  <input type="text" placeholder="Ej. Silla Tiffany Dorada" value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Stock disponible *</label>
                    <input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Precio (Opcional)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" value={precioDia} onChange={e => setPrecioDia(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Descripción</label>
                  <textarea rows="3" placeholder="Detalles sobre el mueble..." value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Imágenes del Mobiliario</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 10, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Cargar desde este equipo (Se comprimirá automáticamente):</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageUpload} 
                        style={{ fontSize: 13, padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>O ingresar enlace web (URL):</span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input type="text" placeholder="https://ejemplo.com/imagen.jpg" value={nuevaImagenUrl} onChange={e => setNuevaImagenUrl(e.target.value)} style={{ flex: 1, padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
                        <button type="button" onClick={agregarImagen} style={{ padding: '8px 14px', background: '#e8eaf6', color: '#4a6cf7', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Añadir URL</button>
                      </div>
                    </div>
                  </div>
                  {imagenes.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#f8f9ff', padding: 8, borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      {imagenes.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 60, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img src={img} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button type="button" onClick={() => eliminarImagen(idx)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, cursor: 'pointer', fontSize: 10, padding: 0, fontWeight: 'bold' }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {muebleEditando && (
                  <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input 
                      type="checkbox" 
                      id="mueble-activo"
                      checked={activo} 
                      onChange={e => setActivo(e.target.checked)} 
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="mueble-activo" style={{ fontWeight: 600, fontSize: 13, color: '#444', cursor: 'pointer' }}>Mueble Activo / Disponible para alquilar</label>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="submit" disabled={loadingForm} style={{ flex: 2, padding: '12px', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
                    {loadingForm ? 'Guardando...' : (muebleEditando ? '✓ Guardar Cambios' : '✓ Registrar Mueble')}
                  </button>
                  {muebleEditando && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setNombre(''); setDescripcion(''); setPrecioDia('');
                        setStock('1'); setImagenes([]); setNuevaImagenUrl('');
                        setActivo(true);
                        setMuebleEditando(null);
                      }} 
                      style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem', width: '100%' }}>Previsualización en tiempo real</h3>
              <div style={{ width: '100%', maxWidth: 280, background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #eef2ff' }}>
                <div style={{ height: 180, background: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative' }}>
                  {imagenes[0] ? <img src={imagenes[0]} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🪑'}
                  {imagenes.length > 1 && <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>+{imagenes.length - 1} fotos</span>}
                </div>
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 6, color: '#1a1a2e' }}>{nombre || 'Nombre del Mueble'}</div>
                  <div style={{ color: '#4a6cf7', fontWeight: 700, fontSize: '1.15rem', marginBottom: 4 }}>${precioDia ? parseFloat(precioDia).toFixed(2) : '0.00'}</div>
                  <div style={{ fontSize: 12, color: parseInt(stock) > 0 ? '#22c55e' : '#ef4444', fontWeight: 600 }}>Stock: {stock || 0} unidades</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>Muebles Registrados ({muebles.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8f9ff', borderBottom: '1px solid #f0f0f0' }}>
                    {['Imagen', 'Nombre', 'Precio', 'Stock', 'Estado', 'Acciones'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {muebles.map(m => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 6, background: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden' }}>
                          {m.imagenes?.[0] ? <img src={m.imagenes[0]} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🪑'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1a1a2e' }}>{m.nombre}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4a6cf7' }}>
                        {m.precio_dia ? `$${parseFloat(m.precio_dia).toFixed(2)}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#666' }}>{m.stock} uds</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: m.activo ? '#22c55e22' : '#ef444422', color: m.activo ? '#22c55e' : '#ef4444', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {m.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => iniciarEditarMueble(m)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Editar">✏️</button>
                          <button onClick={() => eliminarMueble(m.id, m.nombre)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }} title="Eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {muebles.length === 0 && (
                    <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No hay muebles registrados aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Combos y Paquetes ── */}
      {tab === 'combos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                {comboEditando ? `Editar Combo: ${comboEditando.nombre}` : 'Crear nuevo combo / paquete'}
              </h3>
              <form onSubmit={handleSubmitCombo}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Nombre del Combo *</label>
                  <input type="text" placeholder="Ej. Combo Cumpleaños Básico" value={comboNombre} onChange={e => setComboNombre(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Precio (Opcional)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={comboPrecioDia} onChange={e => setComboPrecioDia(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Descripción</label>
                  <textarea rows="2" placeholder="Qué eventos cubre o detalles..." value={comboDescripcion} onChange={e => setComboDescripcion(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                </div>
                {comboEditando && (
                  <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input 
                      type="checkbox" 
                      id="combo-activo"
                      checked={comboActivo} 
                      onChange={e => setComboActivo(e.target.checked)} 
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor="combo-activo" style={{ fontWeight: 600, fontSize: 13, color: '#444', cursor: 'pointer' }}>Combo Activo / Disponible para alquilar</label>
                  </div>
                )}

                {/* Relación con muebles */}
                <div style={{ background: '#f8f9ff', padding: '1.25rem', borderRadius: 10, border: '1px solid #eef2ff', marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1a1a2e', fontSize: '13px' }}>🧩 Mobiliario Componente del Combo</h4>
                  
                  {comboItems.length > 0 ? (
                    <div style={{ marginBottom: '1rem' }}>
                      {comboItems.map((citem, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e8eaf6' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>• {citem.nombre}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 13, color: '#666' }}>Cant: {citem.cantidad}</span>
                            <button type="button" onClick={() => eliminarMuebleDelCombo(citem.mueble_id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: '#888', fontSize: 12, margin: '0 0 1rem 0' }}>El combo está vacío. Añade artículos abajo.</p>}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <div style={{ flex: 2 }}>
                      <select value={muebleParaComboSeleccionado} onChange={e => setMuebleParaComboSeleccionado(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                        <option value="">Elegir mueble...</option>
                        {muebles.filter(m => m.activo).map(m => <option key={m.id} value={m.id}>{m.nombre} (Stock: {m.stock})</option>)}
                      </select>
                    </div>
                    <div style={{ width: 68 }}>
                      <input type="number" min="1" value={cantidadParaComboAgregar} onChange={e => setCantidadParaComboAgregar(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, textAlign: 'center' }} />
                    </div>
                    <button type="button" onClick={agregarMuebleAlCombo} style={{ padding: '8px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+</button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  {comboEditando && (
                    <button type="button" onClick={() => {
                      setComboEditando(null);
                      setComboNombre('');
                      setComboDescripcion('');
                      setComboPrecioDia('');
                      setComboItems([]);
                      setComboActivo(true);
                    }} style={{ flex: 1, padding: '12px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                  )}
                  <button type="submit" disabled={loadingComboForm} style={{ flex: 2, padding: '12px', background: loadingComboForm ? '#a5b4fc' : '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, cursor: loadingComboForm ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 15 }}>
                    {loadingComboForm ? 'Guardando combo...' : comboEditando ? 'Actualizar Combo' : 'Crear Combo'}
                  </button>
                </div>
              </form>
            </div>

            <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>
                Combos Registrados ({combos.length}) — Activos: {combos.filter(c => c.activo).length}
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: '#f8f9ff', borderBottom: '1px solid #f0f0f0' }}>
                      {['Nombre', 'Precio', 'Componentes', 'Estado', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map(c => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>🎁 {c.nombre}</div>
                          <div style={{ color: '#888', fontSize: 12 }}>{c.descripcion || 'Sin descripción'}</div>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4a6cf7' }}>
                          {c.precio_dia ? `$${parseFloat(c.precio_dia).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12 }}>
                          {c.items.map(ci => (
                            <div key={ci.mueble_id} style={{ color: '#555' }}>
                              • {ci.cantidad}x {ci.nombre}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: c.activo ? '#22c55e22' : '#ef444422', color: c.activo ? '#22c55e' : '#ef4444', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                            {c.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => iniciarEditarCombo(c)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#4a6cf7', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✏️</button>
                            <button onClick={() => eliminarCombo(c.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {combos.length === 0 && (
                      <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No hay combos registrados aún.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Reportes y Estadísticas ── */}
      {tab === 'reportes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Controles de Filtro */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>Estadísticas del Negocio</h3>
              <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: 13 }}>Filtra las ganancias e inventario alquilado por mes o rango de fechas</p>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Segmented Control */}
              <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
                <button
                  onClick={() => setTipoReporte('mes')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tipoReporte === 'mes' ? '#fff' : 'transparent',
                    color: tipoReporte === 'mes' ? '#1a1a2e' : '#64748b',
                    boxShadow: tipoReporte === 'mes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Mes Completo
                </button>
                <button
                  onClick={() => setTipoReporte('personalizado')}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: tipoReporte === 'personalizado' ? '#fff' : 'transparent',
                    color: tipoReporte === 'personalizado' ? '#1a1a2e' : '#64748b',
                    boxShadow: tipoReporte === 'personalizado' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Rango Personalizado
                </button>
              </div>

              {tipoReporte === 'mes' ? (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Mes</label>
                    <select value={mesReporte} onChange={e => setMesReporte(parseInt(e.target.value))} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff' }}>
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Año</label>
                    <select value={anioReporte} onChange={e => setAnioReporte(parseInt(e.target.value))} style={{ padding: '8px 16px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff' }}>
                      {[2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Fecha Inicio</label>
                    <input
                      type="date"
                      value={fechaInicioReporte}
                      onChange={e => setFechaInicioReporte(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Fecha Fin</label>
                    <input
                      type="date"
                      value={fechaFinReporte}
                      onChange={e => setFechaFinReporte(e.target.value)}
                      style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff', outline: 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {loadingReportes ? (
            <p style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>Cargando estadísticas de negocio...</p>
          ) : reportesData ? (
            <>
              {/* Tarjetas de Métricas Clave */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ fontSize: '2.5rem', background: '#eef2ff', padding: '10px', borderRadius: 12 }}>📋</div>
                  <div>
                    <div style={{ color: '#888', fontSize: 13, fontWeight: 600 }}>Reservas del Período</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', marginTop: 4 }}>{reportesData.total_reservas}</div>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ fontSize: '2.5rem', background: '#ecfdf5', padding: '10px', borderRadius: 12 }}>💰</div>
                  <div>
                    <div style={{ color: '#888', fontSize: 13, fontWeight: 600 }}>Ingresos Recibidos</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#10b981', marginTop: 4 }}>${reportesData.total_ingresos.toFixed(2)}</div>
                  </div>
                </div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div style={{ fontSize: '2.5rem', background: '#fff7ed', padding: '10px', borderRadius: 12 }}>🪑</div>
                  <div>
                    <div style={{ color: '#888', fontSize: 13, fontWeight: 600 }}>Artículos Alquilados</div>
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f97316', marginTop: 4 }}>{reportesData.total_articulos} <span style={{ fontSize: 12, fontWeight: 400, color: '#666' }}>unidades</span></div>
                  </div>
                </div>
              </div>

              {/* Desglose de Facturación / Ingresos por Categoría */}
              {reportesData.desglose && (
                <div style={{ marginTop: '1.5rem', background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginTop: 0, marginBottom: '1.25rem', color: '#1a1a2e', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📊 Desglose de Ingresos Reservados (Ganancias por Categoría)
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: 12, fontWeight: 600 }}>Total Reservado</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4a6cf7', marginTop: 6 }}>
                        ${reportesData.desglose.total_reservado.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Valor total contratado</div>
                    </div>
                    <div style={{ background: '#f0fdf4', padding: '1.25rem', borderRadius: 10, border: '1px solid #bbf7d0' }}>
                      <div style={{ color: '#166534', fontSize: 12, fontWeight: 600 }}>Mobiliario Reservado</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#15803d', marginTop: 6 }}>
                        ${reportesData.desglose.mobiliario.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>Mobiliario y combos</div>
                    </div>
                    <div style={{ background: '#fef2f2', padding: '1.25rem', borderRadius: 10, border: '1px solid #fecaca' }}>
                      <div style={{ color: '#991b1b', fontSize: 12, fontWeight: 600 }}>Fletes / Transporte</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c', marginTop: 6 }}>
                        ${reportesData.desglose.transporte.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>Envíos y retornos</div>
                    </div>
                    <div style={{ background: '#fffbeb', padding: '1.25rem', borderRadius: 10, border: '1px solid #fef3c7' }}>
                      <div style={{ color: '#92400e', fontSize: 12, fontWeight: 600 }}>Decoración</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: 6 }}>
                        ${reportesData.desglose.decoracion.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, color: '#d97706', marginTop: 4 }}>Servicios de decoración</div>
                    </div>
                    {reportesData.desglose.otros > 0 && (
                      <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>Otros Servicios</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#334155', marginTop: 6 }}>
                          ${reportesData.desglose.otros.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Servicios no clasificados</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Gráficas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
                {/* Gráfica 1: Ganancias del Período Filtrado */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1a1a2e' }}>
                    {tipoReporte === 'mes'
                      ? `Ganancias Diarias (${['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][mesReporte - 1]} ${anioReporte})`
                      : `Ganancias Diarias (${formatShortDate(reportesData.fecha_inicio)} - ${formatShortDate(reportesData.fecha_fin)})`
                    }
                  </h4>
                  <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: 2, paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                    {(() => {
                      const datesArray = getDatesInRange(reportesData.fecha_inicio, reportesData.fecha_fin);
                      const maxDaily = Math.max(...reportesData.ganancias_diarias.map(d => d.total), 1);
                      const bars = [];
                      datesArray.forEach((dateObj, idx) => {
                        const dateStr = formatYYYYMMDD(dateObj);
                        const rec = reportesData.ganancias_diarias.find(x => x.fecha === dateStr);
                        const total = rec ? rec.total : 0;
                        const heightPct = (total / maxDaily) * 100;
                        bars.push(
                          <div
                            key={dateStr}
                            onMouseEnter={() => setActiveBar({ type: 'daily', index: dateStr })}
                            onMouseLeave={() => setActiveBar(null)}
                            title={`${formatShortDate(dateStr)}: $${total.toFixed(2)}`}
                            style={{
                              flex: 1,
                              height: `${Math.max(heightPct, 3)}%`,
                              background: total === 0 ? '#f1f5f9' : (activeBar?.type === 'daily' && activeBar?.index === dateStr ? '#1d4ed8' : 'linear-gradient(180deg, #4a6cf7 0%, #818cf8 100%)'),
                              borderRadius: '3px 3px 0 0',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              position: 'relative'
                            }}
                          >
                            {activeBar?.type === 'daily' && activeBar?.index === dateStr && total > 0 && (
                              <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                ${total.toFixed(0)}
                              </div>
                            )}
                          </div>
                        );
                      });
                      return bars;
                    })()}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#888', padding: '0 4px' }}>
                    {(() => {
                      const datesArray = getDatesInRange(reportesData.fecha_inicio, reportesData.fecha_fin);
                      return (
                        <>
                          <span>{formatShortDate(reportesData.fecha_inicio)}</span>
                          {datesArray.length > 5 && (
                            <span>{formatShortDate(formatYYYYMMDD(datesArray[Math.floor(datesArray.length / 2)]))}</span>
                          )}
                          <span>{formatShortDate(reportesData.fecha_fin)}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Gráfica 2: Ganancias Generales de Todos los Meses */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1a1a2e' }}>Ingresos Mensuales Históricos</h4>
                  <div style={{ height: 200, display: 'flex', alignItems: 'flex-end', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', position: 'relative' }}>
                    {(() => {
                      const maxMonthly = Math.max(...reportesData.ganancias_mensuales_generales.map(m => m.total), 1);
                      const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                      
                      return reportesData.ganancias_mensuales_generales.map((m, idx) => {
                        const heightPct = (m.total / maxMonthly) * 100;
                        const label = `${mesesNombres[m.mes - 1]} ${m.anio.toString().slice(-2)}`;
                        return (
                          <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <div
                              onMouseEnter={() => setActiveBar({ type: 'monthly', index: idx })}
                              onMouseLeave={() => setActiveBar(null)}
                              title={`${label}: $${m.total.toFixed(2)}`}
                              style={{
                                width: '100%',
                                height: `${Math.max(heightPct, 3)}%`,
                                background: m.total === 0 ? '#f1f5f9' : (activeBar?.type === 'monthly' && activeBar?.index === idx ? '#065f46' : 'linear-gradient(180deg, #10b981 0%, #34d399 100%)'),
                                borderRadius: '4px 4px 0 0',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                position: 'relative'
                              }}
                            >
                              {activeBar?.type === 'monthly' && activeBar?.index === idx && m.total > 0 && (
                                <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', color: '#fff', padding: '4px 8px', borderRadius: 4, fontSize: 10, whiteSpace: 'nowrap', zIndex: 10, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
                                  ${m.total.toFixed(0)}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: 9, color: '#888', marginTop: 8, whiteSpace: 'nowrap' }}>{label}</span>
                          </div>
                        );
                      });
                    })()}
                    {reportesData.ganancias_mensuales_generales.length === 0 && (
                      <p style={{ width: '100%', textAlign: 'center', color: '#999', margin: 'auto 0' }}>No hay datos históricos aún.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tops de Mobiliario y Combos */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
                {/* Top Artículos */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>🪑 Mobiliario más Alquilado</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left', color: '#666' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Pos.</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Nombre Artículo</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Total Alquilado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportesData.top_muebles.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f8f8f8' }}>
                            <td style={{ padding: '12px 8px', fontWeight: 700, color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#888' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px 8px', fontWeight: 600, color: '#1a1a2e' }}>{item.nombre}</td>
                            <td style={{ padding: '12px 8px', fontWeight: 700, color: '#4a6cf7', textAlign: 'right' }}>{item.total} uds</td>
                          </tr>
                        ))}
                        {reportesData.top_muebles.length === 0 && (
                          <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Sin alquileres en este período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Top Combos */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <h4 style={{ margin: '0 0 1rem 0', color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>🎁 Combos más Alquilados</h4>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #f0f0f0', textAlign: 'left', color: '#666' }}>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Pos.</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600 }}>Nombre Combo</th>
                          <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Total Alquilado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportesData.top_combos.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #f8f8f8' }}>
                            <td style={{ padding: '12px 8px', fontWeight: 700, color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#888' }}>
                              #{idx + 1}
                            </td>
                            <td style={{ padding: '12px 8px', fontWeight: 600, color: '#1a1a2e' }}>{item.nombre}</td>
                            <td style={{ padding: '12px 8px', fontWeight: 700, color: '#10b981', textAlign: 'right' }}>{item.total} uds</td>
                          </tr>
                        ))}
                        {reportesData.top_combos.length === 0 && (
                          <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Sin combos alquilados en este período.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p style={{ textAlign: 'center', color: '#888' }}>No hay datos de reportes disponibles.</p>
          )}
        </div>
      )}
      {/* ── Términos de Contrato ── */}
      {tab === 'terminos' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <p style={{ color: '#888', fontSize: 13, margin: '0 0 1.5rem 0' }}>Este texto aparecerá al final de todos los contratos generados en PDF para sus clientes.</p>
          <textarea
            value={terminosEdit}
            onChange={e => setTerminosEdit(e.target.value)}
            rows={16}
            style={{ width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
            placeholder="Escribe aquí los términos y condiciones..."
          />
          <div style={{ display: 'flex', gap: 10, marginTop: '1rem', maxWidth: 400 }}>
            <button onClick={guardarTerminos} disabled={loadingTerminos} style={{ flex: 1, padding: '12px', background: loadingTerminos ? '#a5b4fc' : '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, cursor: loadingTerminos ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
              {loadingTerminos ? 'Guardando...' : '✓ Guardar Términos'}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ MODAL EDITAR RESERVA ══════════ */}
      {reservaEditando && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(26,26,46,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 700, maxHeight: '92vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative', boxSizing: 'border-box' }}>
            <button onClick={() => setReservaEditando(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.4rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.75rem' }}>
              Editar Reserva #{reservaEditando.id.slice(0, 8).toUpperCase()}
            </h3>
            <form onSubmit={guardarEdicionReserva}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Alias del Cliente</label>
                  <input type="text" value={editAlias} onChange={e => setEditAlias(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} placeholder="Ej: Boda Juan / Fiesta Maria" /></div>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Nombre del Cliente</label>
                  <input type="text" value={editNombre} onChange={e => setEditNombre(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} /></div>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Teléfono</label>
                  <input type="text" value={editTelefono} onChange={e => setEditTelefono(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} /></div>
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Dirección de Entrega</label>
                <input type="text" value={editDireccion} onChange={e => setEditDireccion(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Fecha Inicio *</label>
                  <input type="date" value={editFechaInicio} onChange={e => { const val = e.target.value; setEditFechaInicio(val); setItemsEditando(prev => recalcularTotal(prev, val, null)); }} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required /></div>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Fecha Fin *</label>
                  <input type="date" value={editFechaFin} onChange={e => { const val = e.target.value; setEditFechaFin(val); setItemsEditando(prev => recalcularTotal(prev, null, val)); }} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} required /></div>
                <div><label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Estado</label>
                  <div style={{ padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#f8f9fa', color: '#555', fontWeight: 600, textTransform: 'uppercase', boxSizing: 'border-box', textAlign: 'center' }}>
                    {editEstado}
                  </div></div>
              </div>

              <div style={{ background: '#f8f9ff', borderRadius: 10, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid #eef2ff' }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1a1a2e', fontSize: '1rem' }}>🪑 Artículos de la reserva</h4>
                {itemsEditando.length > 0 ? (
                  <div style={{ marginBottom: '1rem' }}>
                    {itemsEditando.map((item, idx) => {
                      const id = item.combo_id || item.mueble_id;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderBottom: '1px solid #e8eaf6' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ flex: 1, fontWeight: 600, fontSize: 13, color: '#1a1a2e', minWidth: '150px' }}>
                              {item.combo_id ? `🎁 Combo: ${item.nombre}` : item.nombre}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: '#666' }}>Cant:</span>
                              <input type="number" min="1" value={item.cantidad} onChange={e => actualizarCantidadItem(id, parseInt(e.target.value) || 1, !!item.combo_id, item.nombre)} style={{ width: 55, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center', fontSize: 13 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: '#666' }}>Precio:</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                value={item.precio_unitario !== null && item.precio_unitario !== undefined ? item.precio_unitario : ''} 
                                placeholder={item.combo_id ? (combos.find(c => c.id === item.combo_id)?.precio_dia || '0.00') : (muebles.find(m => m.id === item.mueble_id)?.precio_dia || '0.00')}
                                onChange={e => actualizarPrecioItem(id, parseFloat(e.target.value) || 0, !!item.combo_id, item.nombre)} 
                                style={{ width: 75, padding: '4px 6px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center', fontSize: 13 }} 
                              />
                              <span style={{ fontSize: 11, color: '#888' }}>
                                {item.combo_id || item.mueble_id ? '/día' : 'fijo'}
                              </span>
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e', minWidth: 65, textAlign: 'right' }}>
                              ${parseFloat(item.subtotal || 0).toFixed(2)}
                            </span>
                            <button type="button" onClick={() => eliminarMuebleDeReserva(id, !!item.combo_id, item.nombre)} style={{ background: '#ef444422', color: '#ef4444', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }} title="Eliminar artículo">🗑️</button>
                          </div>
                          {item.combo_id && (
                            <div style={{ paddingLeft: '20px', marginTop: '6px', fontSize: '12px', background: '#fafafa', borderRadius: '8px', padding: '10px', width: '90%', marginLeft: '20px', boxSizing: 'border-box' }}>
                              <strong style={{ display: 'block', marginBottom: '6px', color: '#555' }}>Componentes del Combo:</strong>
                              {(item.componentes || []).map((comp, cIdx) => (
                                <div key={cIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <span style={{ flex: 1, color: '#444' }}>• {comp.nombre}</span>
                                  <label style={{ fontSize: '11px', color: '#666' }}>Cant/unidad:</label>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    value={comp.cantidad} 
                                    onChange={e => editarComponenteCombo(idx, cIdx, 'cantidad', parseInt(e.target.value) || 0)} 
                                    style={{ width: '45px', padding: '2px 4px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center', fontSize: '11px' }}
                                  />
                                  <button 
                                    type="button" 
                                    onClick={() => eliminarComponenteCombo(idx, cIdx)} 
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '12px' }}
                                    title="Eliminar del combo"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                              {/* Agregar componente nuevo al combo */}
                              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', alignItems: 'center' }}>
                                <select 
                                  id={`select-new-comp-${idx}`}
                                  defaultValue=""
                                  style={{ padding: '4px', fontSize: '11px', border: '1px solid #ccc', borderRadius: '4px', flex: 1, height: '24px', background: '#fff' }}
                                >
                                  <option value="">+ Agregar artículo al combo...</option>
                                  {muebles.filter(m => m.activo).map(m => (
                                    <option key={m.id} value={m.id}>{m.nombre}</option>
                                  ))}
                                </select>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const selectEl = document.getElementById(`select-new-comp-${idx}`);
                                    const mId = selectEl.value;
                                    if (mId) {
                                      const mueble = muebles.find(m => m.id === mId);
                                      if (mueble) {
                                        agregarComponenteCombo(idx, mueble);
                                        selectEl.value = "";
                                      }
                                    }
                                  }}
                                  style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, height: '24px', display: 'flex', alignItems: 'center' }}
                                >
                                  Añadir
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : <p style={{ color: '#888', fontSize: 13, margin: '0 0 1rem 0' }}>No hay artículos en esta reserva.</p>}

                {/* Agregar artículo */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 100 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>Tipo</label>
                    <select value={tipoArticuloAgregar} onChange={e => { setTipoArticuloAgregar(e.target.value); setMuebleSeleccionado(''); }} style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                      <option value="mueble">Mueble</option>
                      <option value="combo">Combo</option>
                    </select>
                  </div>
                  <div style={{ flex: 2, minWidth: 180 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>Seleccionar artículo</label>
                    <select value={muebleSeleccionado} onChange={e => setMuebleSeleccionado(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#fff' }}>
                      <option value="">Seleccionar...</option>
                      {tipoArticuloAgregar === 'combo' 
                        ? combos.filter(c => c.activo).map(c => <option key={c.id} value={c.id}>🎁 {c.nombre} — ${c.precio_dia}</option>)
                        : muebles.filter(m => m.activo).map(m => <option key={m.id} value={m.id}>🪑 {m.nombre} — ${m.precio_dia}</option>)
                      }
                    </select>
                  </div>
                  <div style={{ width: 80 }}>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: 12, color: '#555' }}>Cantidad</label>
                    <input type="number" min="1" value={cantidadAgregar} onChange={e => setCantidadAgregar(parseInt(e.target.value) || 1)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                  <button type="button" onClick={agregarMuebleAReserva} style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Agregar</button>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Monto Total ($)</label>
                <input type="number" step="0.01" min="0" value={editTotal} onChange={e => setEditTotal(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Notas Adicionales</label>
                <textarea rows="2" value={editNotas} onChange={e => setEditNotas(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setReservaEditando(null)} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>Cancelar</button>
                <button type="submit" disabled={loadingEdit} style={{ padding: '10px 20px', background: loadingEdit ? '#a5b4fc' : '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, cursor: loadingEdit ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
                  {loadingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL PAGOS ══════════ */}
      {modalPagos && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(26,26,46,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative', boxSizing: 'border-box' }}>
            <button onClick={() => setModalPagos(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            <h3 style={{ marginTop: 0, marginBottom: 4, color: '#1a1a2e' }}>💳 Pagos — #{modalPagos.id.slice(0,8).toUpperCase()}</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 1.5rem 0' }}>{modalPagos.nombre_cliente}</p>

            {/* Resumen de saldo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: '1.5rem' }}>
              {[
                { label: 'Total reserva', value: `$${parseFloat(modalPagos.total).toFixed(2)}`, color: '#1a1a2e' },
                { label: 'Total pagado', value: `$${totalPagado.toFixed(2)}`, color: '#22c55e' },
                { label: 'Saldo pendiente', value: `$${Math.max(0, saldoPendiente).toFixed(2)}`, color: saldoPendiente > 0 ? '#ef4444' : '#22c55e' },
              ].map(s => (
                <div key={s.label} style={{ background: '#f8f9ff', borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Historial de pagos */}
            <h4 style={{ margin: '0 0 10px 0', fontSize: 14, color: '#555' }}>Historial</h4>
            {pagosReserva.length > 0 ? (
              <div style={{ marginBottom: '1.5rem' }}>
                {pagosReserva.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#22c55e' }}>+${parseFloat(p.monto).toFixed(2)}</div>
                      <div style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{p.metodo} · {new Date(p.creado_en).toLocaleDateString('es')}</div>
                      {p.notes && <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>{p.notes}</div>}
                    </div>
                    <button onClick={() => eliminarPago(p.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }} title="Eliminar pago">🗑️</button>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#aaa', fontSize: 13, margin: '0 0 1.5rem 0' }}>Sin pagos registrados.</p>}

            {/* Registrar nuevo pago */}
            <div style={{ background: '#f8f9ff', borderRadius: 10, padding: '1rem', border: '1px solid #eef2ff' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1a1a2e' }}>Registrar pago / abono</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Monto ($) *</label>
                  <input type="number" step="0.01" min="0.01" value={nuevoPagoMonto} onChange={e => setNuevoPagoMonto(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Método</label>
                  <select value={nuevoPagoMetodo} onChange={e => setNuevoPagoMetodo(e.target.value)} style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}>
                    {['efectivo','transferencia','tarjeta','yappy','otro'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 4 }}>Nota (opcional)</label>
                <input type="text" value={nuevoPagoNotas} onChange={e => setNuevoPagoNotas(e.target.value)} placeholder="Ej. Abono inicial, pago final..." style={{ width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <button onClick={registrarPago} disabled={loadingPago} style={{ width: '100%', padding: '10px', background: loadingPago ? '#a5b4fc' : '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, cursor: loadingPago ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14 }}>
                {loadingPago ? 'Registrando...' : '✓ Registrar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL CONTRATO PDF ══════════ */}
      {modalContrato && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(26,26,46,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 480, padding: '2rem', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', position: 'relative', boxSizing: 'border-box' }}>
            <button onClick={() => setModalContrato(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#888' }}>×</button>
            <h3 style={{ marginTop: 0, marginBottom: 4, color: '#1a1a2e' }}>📄 Generar Contrato</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 1.5rem 0' }}>Reserva #{modalContrato.id.slice(0,8).toUpperCase()} · {modalContrato.nombre_cliente}</p>

            <div style={{ background: '#f8f9ff', borderRadius: 10, padding: '1rem', marginBottom: '1.25rem', fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#555' }}>Total reserva:</span>
                <strong>${parseFloat(modalContrato.total).toFixed(2)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#555' }}>Pagos registrados:</span>
                <strong style={{ color: '#22c55e' }}>-${pagosParaContrato.reduce((s, p) => s + parseFloat(p.monto), 0).toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>
                Abono adicional en este contrato ($) <span style={{ color: '#888', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={contratoAbono}
                onChange={e => setContratoAbono(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              />
              <p style={{ fontSize: 12, color: '#888', margin: '6px 0 0 0' }}>Si el cliente va a pagar un abono hoy, ingrésalo aquí para que aparezca en el contrato.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setModalContrato(null)} style={{ flex: 1, padding: '10px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
                <button
                  onClick={() => {
                    generarContratoPDF(modalContrato, modalContrato.items || [], pagosParaContrato, terminos, contratoAbono, combos);
                    setModalContrato(null);
                  }}
                  style={{ flex: 2, padding: '10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                >
                  📄 Imprimir Contrato PDF
                </button>
              </div>
              <button
                onClick={() => {
                  generarHojaEntregaPDF(modalContrato, modalContrato.items || [], combos);
                  setModalContrato(null);
                }}
                style={{ width: '100%', padding: '11px', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
              >
                🚚 Imprimir Hoja de Entrega (Checklist sin precios)
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
