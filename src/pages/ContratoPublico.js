import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';
import { normalizarMetodosPago, formatearMetodosPagoTexto } from '../context/ConfigContext';

export default function ContratoPublico() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  const cargarContrato = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reservas/contrato-publico/${id}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'No se pudo encontrar el contrato solicitado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) cargarContrato();
  }, [id]);

  const handleConfirmarContrato = async () => {
    if (confirmando) return;
    setConfirmando(true);
    try {
      const res = await api.post(`/reservas/contrato-publico/${id}/confirmar`);
      setData(prev => ({
        ...prev,
        reserva: {
          ...prev.reserva,
          ...res.data.reserva,
          contrato_confirmado: true,
          contrato_confirmado_en: res.data.reserva?.contrato_confirmado_en || new Date().toISOString()
        }
      }));
      toast.success('¡Contrato confirmado con éxito! Muchas gracias.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Hubo un problema al confirmar el contrato.');
    } finally {
      setConfirmando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Cargando tu Contrato de Arrendamiento...</div>
      </div>
    );
  }

  if (error || !data || !data.reserva) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '2rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '2.5rem', borderRadius: 16, maxWidth: 460, width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Contrato no disponible</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>{error || 'El enlace del contrato no es válido o la reserva fue eliminada.'}</p>
        </div>
      </div>
    );
  }

  const { reserva, items = [], pagos = [], terminos = '', config: configEmpresa = {} } = data;

  const totalPagado = pagos.reduce((s, p) => s + parseFloat(p.monto || 0), 0);
  const abonoExtra = parseFloat(reserva.contrato_abono_extra || 0);
  const totalAbono = totalPagado + abonoExtra;
  const saldoPendiente = Math.max(0, parseFloat(reserva.total || 0) - totalAbono);

  const empNombre = configEmpresa?.nombre_empresa || 'Alquila Tu Party';
  const empColor = configEmpresa?.color_primario || '#2563eb';
  const cleanPhone = (reserva.telefono_cliente || '').replace(/^\+?507\s*/, '').trim();

  const formatearFechaDDMMYYYY = (fStr) => {
    if (!fStr) return '';
    try {
      const parts = String(fStr).substring(0, 10).split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      const dObj = new Date(fStr);
      if (!isNaN(dObj.getTime())) {
        return `${String(dObj.getDate()).padStart(2, '0')}/${String(dObj.getMonth() + 1).padStart(2, '0')}/${dObj.getFullYear()}`;
      }
      return fStr;
    } catch {
      return fStr;
    }
  };

  const hoyD = reserva.creado_en ? new Date(reserva.creado_en) : new Date();
  const diaHoy = String(hoyD.getDate()).padStart(2, '0');
  const mesHoy = String(hoyD.getMonth() + 1).padStart(2, '0');
  const anioHoy = hoyD.getFullYear();
  const fechaContratoStr = `${diaHoy}/${mesHoy}/${anioHoy}`;

  const numIdRaw = String(reserva.id || '').replace(/\D/g, '');
  const idPart = (numIdRaw.slice(-4) || reserva.id?.slice(0, 4) || '0001').padStart(4, '0').toUpperCase();
  const numeroContrato = `${diaHoy}${mesHoy}${anioHoy}-${idPart}`;

  const fechaEntregaStr = formatearFechaDDMMYYYY(reserva.fecha_inicio) || '____/____/________';
  const fechaRecoleccionStr = formatearFechaDDMMYYYY(reserva.fecha_fin) || fechaEntregaStr;

  const empDireccion = configEmpresa?.direccion_empresa?.trim() || '';
  const empTelefono = configEmpresa?.telefono_contacto?.trim() || '';
  const empEmail = configEmpresa?.email_contacto?.trim() || '';
  const empInstagram = configEmpresa?.instagram_empresa?.trim() || '';
  const metodosPagoTexto = formatearMetodosPagoTexto(configEmpresa?.metodos_pago);
  const empMetodosPago = metodosPagoTexto || (typeof configEmpresa?.metodos_pago === 'string' ? configEmpresa.metodos_pago.trim() : '');
  const empSitioWeb = configEmpresa?.sitio_web?.trim() || '';
  const metodosArr = normalizarMetodosPago(configEmpresa?.metodos_pago);

  const esServicio = (nombre) => {
    const keywords = ['servicio', 'transporte', 'flete', 'montaje', 'armado', 'instalacio', 'envio', 'cargo', 'adicional', 'limpieza', 'deposito', 'depósito', 'garantia', 'garantía', 'decorac'];
    const n = (nombre || '').toLowerCase();
    return keywords.some(k => n.includes(k));
  };

  const mobiliarioItems = items.filter(i => !esServicio(i.nombre || i.mueble));
  const servicioItems = items.filter(i => esServicio(i.nombre || i.mueble));

  const subtotalMobiliario = mobiliarioItems.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);
  const subtotalServicios = servicioItems.reduce((s, i) => s + parseFloat(i.subtotal || 0), 0);

  const obtenerCodigo = (nombre, esServ = false) => {
    if (esServ) return 'N/A';
    const limpio = (nombre || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return limpio.slice(0, 8) || 'ART01';
  };

  const terminosPredeterminados = [
    'El equipo se alquila con un horario definido entre el cliente y la empresa.',
    'El equipo rentado debe permanecer en la ubicación especificada en el contrato. Cualquier traslado no autorizado puede resultar en cargos adicionales y el cliente será responsable por cualquier daño durante el traslado.',
    'No se permite realizar modificaciones al equipo rentado. Cualquier decoración debe ser removible y no debe causar daños. No se permite el uso de clavos, grapas, pegamentos o cualquier material que pueda dañar el equipo.',
    'El cliente es responsable por cualquier daño, pérdida o robo del equipo durante el período de renta. Los costos de reparación o reemplazo serán evaluados por la empresa y deberán ser cubiertos por el cliente.',
    'Los anticipos realizados no son reembolsables bajo ninguna circunstancia.'
  ];

  const lineasTerminos = (terminos && terminos.trim())
    ? terminos.split('\n').filter(l => l.trim().length > 0).map(l => l.replace(/^\d+[\.\-\)]\s*/, ''))
    : terminosPredeterminados;

  const estaConfirmado = Boolean(reserva.contrato_confirmado);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', paddingBottom: '3rem' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .contrato-hoja { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; padding: 0 !important; }
        }
      `}</style>

      {/* Barra superior de acciones */}
      <div className="no-print" style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 10,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
            📄 Contrato #{numeroContrato}
          </span>
          <span style={{
            padding: '4px 10px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: estaConfirmado ? '#dcfce7' : '#fee2e2',
            color: estaConfirmado ? '#15803d' : '#b91c1c'
          }}>
            {estaConfirmado ? '✓ Confirmado' : '⏳ Pendiente de confirmar'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              padding: '8px 14px',
              background: empColor,
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Contenedor tipo Hoja del Contrato */}
      <div className="contrato-hoja" style={{
        maxWidth: 780,
        margin: '1.5rem auto',
        background: '#fff',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.07)',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        color: '#0f172a',
        fontSize: '12px',
        lineHeight: 1.4
      }}>
        {/* ENCABEZADO */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ maxWidth: '60%', minWidth: 220 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: empColor, letterSpacing: '-0.5px', marginBottom: 4 }}>
              {empNombre}
            </div>
            <div style={{ fontSize: 11, color: '#475569', fontWeight: 500, lineHeight: 1.35 }}>
              {empDireccion && <div>{empDireccion}</div>}
              {empTelefono && (
                <div>{(empTelefono.toLowerCase().startsWith('cel') || empTelefono.toLowerCase().startsWith('tel')) ? empTelefono : `Cel: ${empTelefono}`}</div>
              )}
              {empEmail && (
                <div>{(empEmail.toLowerCase().startsWith('email') || empEmail.toLowerCase().startsWith('correo')) ? empEmail : `Email: ${empEmail}`}</div>
              )}
              {empInstagram && (
                <div>{(empInstagram.toLowerCase().startsWith('instagram') || empInstagram.toLowerCase().startsWith('ig')) ? empInstagram : `Instagram: ${empInstagram}`}</div>
              )}
              {metodosArr.length > 0 ? (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontWeight: 700, color: '#334155' }}>Métodos de pago:</div>
                  {metodosArr.map((m, idx) => {
                    let nombreLimpio = (m.nombre || '').trim().replace(/^(métodos?\s+de\s+pago\s*[:\-]?\s*)/i, '').trim();
                    const detalleLimpio = (m.detalle || '').trim();
                    return (
                      <div key={idx} style={{ paddingLeft: 6 }}>
                        • {nombreLimpio && <strong>{nombreLimpio.endsWith(':') ? nombreLimpio : `${nombreLimpio}:`} </strong>}
                        {detalleLimpio}
                      </div>
                    );
                  })}
                </div>
              ) : empMetodosPago ? (
                <div>{empMetodosPago}</div>
              ) : null}
              {empSitioWeb && <div>{empSitioWeb}</div>}
            </div>
          </div>

          <div style={{ border: `2px solid ${empColor}`, borderRadius: 6, padding: '8px 16px', textAlign: 'center', minWidth: 190 }}>
            <div style={{ color: empColor, fontWeight: 800, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 3 }}>
              CONTRATO DE ARRENDAMIENTO
            </div>
            <div style={{ color: '#1e3a8a', fontWeight: 900, fontSize: 16, letterSpacing: '0.5px', marginBottom: 2 }}>
              {numeroContrato}
            </div>
            <div style={{ color: '#334155', fontSize: 11, fontWeight: 600 }}>
              {fechaContratoStr}
            </div>
          </div>
        </div>

        {/* INFORMACIÓN DEL CLIENTE */}
        <div style={{ background: empColor, color: '#fff', fontWeight: 800, fontSize: 11, padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>
          INFORMACIÓN DEL CLIENTE
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', padding: '8px 10px', fontSize: 11.5, lineHeight: 1.5 }}>
          <div style={{ display: 'flex', marginBottom: 3 }}>
            <span style={{ fontWeight: 800, minWidth: 100, color: '#0f172a' }}>Nombre:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{reserva.nombre_cliente || '—'}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: 3 }}>
            <span style={{ fontWeight: 800, minWidth: 100, color: '#0f172a' }}>Teléfono:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{cleanPhone || '—'}</span>
          </div>
          <div style={{ display: 'flex', marginBottom: 3, borderBottom: '1px solid #e2e8f0', paddingBottom: 3 }}>
            <span style={{ fontWeight: 800, minWidth: 100, color: '#0f172a' }}>Dirección:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{reserva.direccion_entrega || '—'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', paddingTop: 2 }}>
            <span style={{ fontWeight: 800, minWidth: 100, color: '#0f172a' }}>Identificación:</span>
            <span style={{ fontWeight: 600, flex: 1, color: '#1e293b' }}>
              {reserva.cedula_cliente || '—'}
            </span>
          </div>
        </div>

        {/* DETALLES DEL EVENTO */}
        <div style={{ background: empColor, color: '#fff', fontWeight: 800, fontSize: 11, padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>
          DETALLES DEL EVENTO
        </div>
        <div style={{ border: '1px solid #cbd5e1', borderTop: 'none', padding: '8px 10px', fontSize: 11.5, lineHeight: 1.5 }}>
          <div style={{ display: 'flex', marginBottom: 3 }}>
            <span style={{ fontWeight: 800, minWidth: 100, color: '#0f172a' }}>Entrega:</span>
            <span style={{ fontWeight: 600 }}>{fechaEntregaStr}</span>
          </div>
          <div style={{ display: 'flex' }}>
            <span style={{ fontWeight: 800, minWidth: 100, color: '#0f172a' }}>Recolección:</span>
            <span style={{ fontWeight: 600 }}>{fechaRecoleccionStr}</span>
          </div>
        </div>

        {/* BIENES ARRENDADOS */}
        <div style={{ background: empColor, color: '#fff', fontWeight: 800, fontSize: 11, padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>
          BIENES ARRENDADOS
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #000' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', background: '#f8fafc' }}>
                <th style={{ width: 50, padding: '5px', borderRight: '1px solid #000', textAlign: 'center' }}>CANT.</th>
                <th style={{ padding: '5px 8px', borderRight: '1px solid #000', textAlign: 'left' }}>DESCRIPCIÓN</th>
                <th style={{ width: 90, padding: '5px', borderRight: '1px solid #000', textAlign: 'center' }}>CÓDIGO</th>
                <th style={{ width: 85, padding: '5px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>P. UNIT.</th>
                <th style={{ width: 85, padding: '5px 8px', textAlign: 'right' }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {mobiliarioItems.length > 0 ? mobiliarioItems.map((i, idx) => {
                const unitPrice = i.cantidad > 0 ? (parseFloat(i.subtotal || 0) / i.cantidad) : 0;
                const cod = i.codigo || obtenerCodigo(i.nombre || i.mueble, false);
                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #000', fontWeight: 600 }}>{i.cantidad}</td>
                      <td style={{ padding: '4px 8px', border: '1px solid #000', fontWeight: 700, textTransform: 'uppercase' }}>{i.nombre || i.mueble || ''}</td>
                      <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #000', fontWeight: 600 }}>{cod}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000' }}>${unitPrice.toFixed(2)}</td>
                      <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000', fontWeight: 600 }}>${parseFloat(i.subtotal || 0).toFixed(2)}</td>
                    </tr>
                    {i.combo_id && Array.isArray(i.componentes) && i.componentes.map((ci, cIdx) => (
                      <tr key={`${idx}-c-${cIdx}`} style={{ fontSize: 10, color: '#475569', background: '#fafafa' }}>
                        <td style={{ padding: '3px 6px', textAlign: 'center', border: '1px solid #000' }}>{ci.cantidad * i.cantidad}</td>
                        <td style={{ padding: '3px 8px 3px 18px', border: '1px solid #000' }}>└─ {ci.nombre}</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', border: '1px solid #000' }}>{obtenerCodigo(ci.nombre, false)}</td>
                        <td style={{ padding: '3px 8px', textAlign: 'right', border: '1px solid #000', color: '#888' }}>—</td>
                        <td style={{ padding: '3px 8px', textAlign: 'right', border: '1px solid #000', color: '#888' }}>—</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #000' }}>-</td>
                  <td style={{ padding: '4px 8px', border: '1px solid #000', color: '#64748b', fontStyle: 'italic' }}>Sin artículos</td>
                  <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #000' }}>N/A</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000' }}>$0.00</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000' }}>$0.00</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #000', background: '#fff' }}>
                <td colSpan="4" style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #000', textTransform: 'uppercase' }}>
                  SUBTOTAL MERCANCÍA:
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                  ${subtotalMobiliario.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SERVICIOS ADICIONALES */}
        <div style={{ background: empColor, color: '#fff', fontWeight: 800, fontSize: 11, padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 10 }}>
          SERVICIOS ADICIONALES
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #000' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #000', background: '#f8fafc' }}>
                <th style={{ width: 50, padding: '5px', borderRight: '1px solid #000', textAlign: 'center' }}>CANT.</th>
                <th style={{ padding: '5px 8px', borderRight: '1px solid #000', textAlign: 'left' }}>DESCRIPCIÓN</th>
                <th style={{ width: 90, padding: '5px', borderRight: '1px solid #000', textAlign: 'center' }}>CÓDIGO</th>
                <th style={{ width: 85, padding: '5px 8px', borderRight: '1px solid #000', textAlign: 'right' }}>P. UNIT.</th>
                <th style={{ width: 85, padding: '5px 8px', textAlign: 'right' }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {servicioItems.length > 0 ? servicioItems.map((i, idx) => {
                const unitPrice = i.cantidad > 0 ? (parseFloat(i.subtotal || 0) / i.cantidad) : 0;
                const cod = i.codigo || obtenerCodigo(i.nombre || i.mueble, true);
                return (
                  <tr key={idx}>
                    <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #000', fontWeight: 600 }}>{i.cantidad}</td>
                    <td style={{ padding: '4px 8px', border: '1px solid #000', fontWeight: 700, textTransform: 'uppercase' }}>{i.nombre || i.mueble || ''}</td>
                    <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #000', fontWeight: 600 }}>{cod}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000' }}>${unitPrice.toFixed(2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000', fontWeight: 600 }}>${parseFloat(i.subtotal || 0).toFixed(2)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #000', color: '#64748b' }}>-</td>
                  <td style={{ padding: '4px 8px', border: '1px solid #000', color: '#64748b', fontStyle: 'italic' }}>Sin servicios adicionales</td>
                  <td style={{ padding: '4px', textAlign: 'center', border: '1px solid #000', color: '#64748b' }}>N/A</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000', color: '#64748b' }}>$0.00</td>
                  <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #000', color: '#64748b' }}>$0.00</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #000', background: '#fff' }}>
                <td colSpan="4" style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #000', textTransform: 'uppercase' }}>
                  SUBTOTAL SERVICIOS:
                </td>
                <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 800 }}>
                  ${subtotalServicios.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TOTALES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, marginBottom: 8 }}>
          <div style={{ width: 250, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Total:</span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>${parseFloat(reserva.total || 0).toFixed(2)}</span>
            </div>
            {totalAbono > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#16a34a' }}>
                <span style={{ fontWeight: 600 }}>Abono:</span>
                <span style={{ fontWeight: 700 }}>-${totalAbono.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginTop: 2, borderTop: '1px solid #e2e8f0', color: saldoPendiente > 0 ? '#dc2626' : '#16a34a' }}>
              <span style={{ fontWeight: 900, fontSize: 14, textTransform: 'uppercase' }}>Saldo pendiente:</span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>${saldoPendiente.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* AVISO DE NO DEVOLUCIONES */}
        <div style={{ border: '1.5px solid #ef4444', borderRadius: 4, padding: '5px 10px', textAlign: 'center', color: '#dc2626', fontWeight: 800, fontSize: 11, margin: '8px 0 10px 0', letterSpacing: '0.5px' }}>
          ⚠ NO HAY DEVOLUCIONES EN ANTICIPOS
        </div>

        {/* TÉRMINOS Y CONDICIONES */}
        <div style={{ border: '1px solid #475569', borderRadius: 4, padding: '8px 12px', marginBottom: 12 }}>
          <div style={{ color: empColor, fontWeight: 800, fontSize: 11.5, textAlign: 'center', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.5px' }}>
            TÉRMINOS Y CONDICIONES
          </div>
          <div style={{ fontSize: 10.5, lineHeight: 1.45, color: '#1e293b', textAlign: 'justify' }}>
            {lineasTerminos.map((t, idx) => (
              <div key={idx} style={{ marginBottom: 4 }}>
                <b>{idx + 1}.</b> {t}
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN DE FIRMAS */}
        <div style={{ border: '1px solid #94a3b8', borderRadius: 4, marginBottom: 18 }}>
          <div style={{ padding: '14px 16px 10px 16px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>
            {estaConfirmado && (
              <div style={{ color: '#15803d', fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                ✓ CONFIRMADO DIGITALMENTE POR {(reserva.nombre_cliente || 'EL CLIENTE').toUpperCase()}
              </div>
            )}
            <div style={{ width: '70%', margin: '0 auto 4px auto', borderBottom: '1px solid #475569' }}></div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{reserva.nombre_cliente || ''}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACEPTO TÉRMINOS Y CONDICIONES</div>
          </div>
          <div style={{ padding: '14px 16px 10px 16px', textAlign: 'center' }}>
            <div style={{ width: '70%', margin: '0 auto 4px auto', borderBottom: '1px solid #475569' }}></div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1e293b' }}>{empNombre}</div>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ENTREGA CONFORME</div>
          </div>
        </div>

        {/* SECCIÓN FINAL DE CONFIRMACIÓN DEL CLIENTE (BOTÓN CONFIRMADO) */}
        <div style={{
          background: estaConfirmado ? '#f0fdf4' : '#fff1f2',
          border: `2px solid ${estaConfirmado ? '#22c55e' : '#ef4444'}`,
          borderRadius: 12,
          padding: '1.5rem',
          textAlign: 'center',
          transition: 'all 0.3s ease'
        }}>
          {estaConfirmado ? (
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: '#16a34a',
                color: '#fff',
                padding: '12px 28px',
                borderRadius: 10,
                fontSize: 16,
                fontWeight: 800,
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)',
                marginBottom: 10
              }}>
                <span>✓</span>
                <span>CONFIRMADO</span>
              </div>
              <h3 style={{ margin: '6px 0 4px 0', color: '#15803d', fontSize: 16 }}>
                ¡Contrato Confirmado!
              </h3>
              <p style={{ margin: 0, color: '#166534', fontSize: 13 }}>
                Has aceptado y confirmado los términos y detalles de tu contrato de reserva.
                {reserva.contrato_confirmado_en && (
                  <span style={{ display: 'block', fontSize: 11.5, marginTop: 4, opacity: 0.85 }}>
                    Fecha de confirmación: {new Date(reserva.contrato_confirmado_en).toLocaleString('es-PA')}
                  </span>
                )}
              </p>
            </div>
          ) : (
            <div>
              <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: 16, fontWeight: 800 }}>
                Confirmación del Contrato de Reserva
              </h3>
              <p style={{ margin: '0 0 16px 0', color: '#7f1d1d', fontSize: 13, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
                Por favor verifica que tus datos, fechas y artículos sean correctos. Al presionar el botón <strong>Confirmado</strong> declaras estar de acuerdo con los términos y condiciones del contrato.
              </p>
              <button
                type="button"
                onClick={handleConfirmarContrato}
                disabled={confirmando}
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 36px',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: confirmando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase'
                }}
              >
                <span>✓</span>
                <span>{confirmando ? 'Confirmando...' : 'Confirmado'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
