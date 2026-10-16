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
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>📄</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>Cargando tu Contrato de Arrendamiento...</div>
      </div>
    );
  }

  if (error || !data || !data.reserva) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '1.25rem', textAlign: 'center' }}>
        <div style={{ background: '#fff', padding: '2rem 1.5rem', borderRadius: 16, maxWidth: 460, width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: 20 }}>Contrato no disponible</h2>
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
    <div style={{ minHeight: '100vh', background: '#eef2f6', paddingBottom: isMobile ? '1.5rem' : '3rem' }}>
      <style>{`
        /* Sobrescribir table { display: block } global de index.css para que las tablas del contrato se vean perfectas en móvil */
        .contrato-table {
          display: table !important;
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: fixed !important;
        }
        .contrato-table thead {
          display: table-header-group !important;
        }
        .contrato-table tbody {
          display: table-row-group !important;
        }
        .contrato-table tr {
          display: table-row !important;
        }
        .contrato-table th,
        .contrato-table td {
          display: table-cell !important;
          box-sizing: border-box !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .contrato-hoja {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
        }
      `}</style>

      {/* Barra superior fija */}
      <div className="no-print" style={{
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        padding: isMobile ? '10px 12px' : '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
          <span style={{
            fontSize: isMobile ? 13 : 14,
            fontWeight: 800,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            📄 #{numeroContrato}
          </span>
          <span style={{
            padding: isMobile ? '3px 8px' : '4px 10px',
            borderRadius: 20,
            fontSize: isMobile ? 11 : 12,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            background: estaConfirmado ? '#dcfce7' : '#fee2e2',
            color: estaConfirmado ? '#15803d' : '#b91c1c',
            flexShrink: 0
          }}>
            {estaConfirmado ? '✓ Confirmado' : '⏳ Pendiente'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: isMobile ? '7px 11px' : '8px 14px',
            background: empColor,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: isMobile ? 12 : 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)'
          }}
        >
          {isMobile ? '🖨️ PDF' : '🖨️ Imprimir / Guardar PDF'}
        </button>
      </div>

      {/* Contenedor Principal del Contrato */}
      <div className="contrato-hoja" style={{
        maxWidth: 780,
        margin: isMobile ? '0.65rem 0.5rem' : '1.5rem auto',
        background: '#fff',
        borderRadius: isMobile ? 14 : 12,
        padding: isMobile ? '16px 14px' : '26px 30px',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.07)',
        border: '1px solid #e2e8f0',
        boxSizing: 'border-box',
        color: '#0f172a',
        fontSize: isMobile ? '13px' : '12px',
        lineHeight: 1.45
      }}>
        {/* ENCABEZADO */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'flex-start',
          gap: isMobile ? 12 : 16,
          marginBottom: 16
        }}>
          {/* Recuadro de Número de Contrato: en móvil va arriba de primero o integrado con protagonismo */}
          {isMobile && (
            <div style={{
              border: `2px solid ${empColor}`,
              background: '#f8fafc',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8
            }}>
              <div>
                <div style={{ color: empColor, fontWeight: 800, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  CONTRATO DE ARRENDAMIENTO
                </div>
                <div style={{ color: '#1e3a8a', fontWeight: 900, fontSize: 16, letterSpacing: '0.3px', marginTop: 1 }}>
                  #{numeroContrato}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Fecha</div>
                <div style={{ color: '#0f172a', fontSize: 12.5, fontWeight: 700 }}>{fechaContratoStr}</div>
              </div>
            </div>
          )}

          {/* Datos de la Empresa */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: isMobile ? 21 : 24,
              fontWeight: 900,
              color: empColor,
              letterSpacing: '-0.4px',
              marginBottom: 4,
              lineHeight: 1.15
            }}>
              {empNombre}
            </div>
            <div style={{ fontSize: isMobile ? 12 : 11.5, color: '#475569', fontWeight: 500, lineHeight: 1.45 }}>
              {empDireccion && <div>📍 {empDireccion}</div>}
              {empTelefono && (
                <div>📞 {(empTelefono.toLowerCase().startsWith('cel') || empTelefono.toLowerCase().startsWith('tel')) ? empTelefono : `Cel: ${empTelefono}`}</div>
              )}
              {empEmail && (
                <div>✉️ {(empEmail.toLowerCase().startsWith('email') || empEmail.toLowerCase().startsWith('correo')) ? empEmail : `Email: ${empEmail}`}</div>
              )}
              {empInstagram && (
                <div>📸 {(empInstagram.toLowerCase().startsWith('instagram') || empInstagram.toLowerCase().startsWith('ig')) ? empInstagram : `Instagram: ${empInstagram}`}</div>
              )}
              {empSitioWeb && <div>🌐 {empSitioWeb}</div>}

              {metodosArr.length > 0 ? (
                <div style={{
                  marginTop: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  padding: '8px 10px'
                }}>
                  <div style={{ fontWeight: 800, color: '#1e293b', fontSize: isMobile ? 11.5 : 11, marginBottom: 3, textTransform: 'uppercase' }}>
                    💳 Métodos de pago:
                  </div>
                  {metodosArr.map((m, idx) => {
                    let nombreLimpio = (m.nombre || '').trim().replace(/^(métodos?\s+de\s+pago\s*[:\-]?\s*)/i, '').trim();
                    const detalleLimpio = (m.detalle || '').trim();
                    return (
                      <div key={idx} style={{ paddingLeft: 2, fontSize: isMobile ? 12 : 11, color: '#334155', marginBottom: 2 }}>
                        • {nombreLimpio && <strong style={{ color: '#0f172a' }}>{nombreLimpio.endsWith(':') ? nombreLimpio : `${nombreLimpio}:`} </strong>}
                        {detalleLimpio}
                      </div>
                    );
                  })}
                </div>
              ) : empMetodosPago ? (
                <div style={{ marginTop: 6 }}>{empMetodosPago}</div>
              ) : null}
            </div>
          </div>

          {/* Recuadro de Número de Contrato en Escritorio */}
          {!isMobile && (
            <div style={{ border: `2px solid ${empColor}`, borderRadius: 8, padding: '10px 18px', textAlign: 'center', minWidth: 200, flexShrink: 0 }}>
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
          )}
        </div>

        {/* INFORMACIÓN DEL CLIENTE */}
        <div style={{
          background: empColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: isMobile ? 11.5 : 11,
          padding: '6px 10px',
          borderRadius: '6px 6px 0 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: 12
        }}>
          INFORMACIÓN DEL CLIENTE
        </div>
        <div style={{
          border: '1px solid #cbd5e1',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: isMobile ? '10px 12px' : '8px 12px',
          fontSize: isMobile ? 13 : 12,
          lineHeight: 1.5,
          background: '#fff'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 6 : 8 }}>
            <div>
              <span style={{ fontWeight: 800, color: '#475569', fontSize: isMobile ? 11.5 : 11, textTransform: 'uppercase', display: 'block' }}>Nombre del Cliente</span>
              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: isMobile ? 14 : 12.5 }}>{reserva.nombre_cliente || '—'}</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontWeight: 800, color: '#475569', fontSize: isMobile ? 11.5 : 11, textTransform: 'uppercase', display: 'block' }}>Teléfono</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{cleanPhone || '—'}</span>
              </div>
              <div>
                <span style={{ fontWeight: 800, color: '#475569', fontSize: isMobile ? 11.5 : 11, textTransform: 'uppercase', display: 'block' }}>Identificación</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{reserva.cedula_cliente || '—'}</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
            <span style={{ fontWeight: 800, color: '#475569', fontSize: isMobile ? 11.5 : 11, textTransform: 'uppercase', display: 'block' }}>Dirección del Evento / Entrega</span>
            <span style={{ fontWeight: 600, color: '#0f172a', wordBreak: 'break-word' }}>{reserva.direccion_entrega || '—'}</span>
          </div>
        </div>

        {/* DETALLES DEL EVENTO */}
        <div style={{
          background: empColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: isMobile ? 11.5 : 11,
          padding: '6px 10px',
          borderRadius: '6px 6px 0 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: 12
        }}>
          DETALLES DEL EVENTO
        </div>
        <div style={{
          border: '1px solid #cbd5e1',
          borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          padding: isMobile ? '10px 12px' : '8px 12px',
          fontSize: isMobile ? 13 : 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          background: '#fff'
        }}>
          <div>
            <span style={{ fontWeight: 800, color: '#475569', fontSize: isMobile ? 11 : 11, textTransform: 'uppercase', display: 'block' }}>📅 Fecha de Entrega</span>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: isMobile ? 13.5 : 12.5 }}>{fechaEntregaStr}</span>
          </div>
          <div>
            <span style={{ fontWeight: 800, color: '#475569', fontSize: isMobile ? 11 : 11, textTransform: 'uppercase', display: 'block' }}>📅 Fecha de Recolección</span>
            <span style={{ fontWeight: 700, color: '#0f172a', fontSize: isMobile ? 13.5 : 12.5 }}>{fechaRecoleccionStr}</span>
          </div>
        </div>

        {/* BIENES ARRENDADOS */}
        <div style={{
          background: empColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: isMobile ? 11.5 : 11,
          padding: '6px 10px',
          borderRadius: '6px 6px 0 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: 12
        }}>
          BIENES ARRENDADOS
        </div>
        <div>
          <table className="contrato-table" style={{ fontSize: isMobile ? 12 : 11, border: '1px solid #94a3b8' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #94a3b8', background: '#f8fafc', color: '#1e293b' }}>
                <th style={{ width: isMobile ? '15%' : '52px', padding: isMobile ? '6px 4px' : '6px', borderRight: '1px solid #94a3b8', textAlign: 'center', fontWeight: 800 }}>CANT.</th>
                <th style={{ width: isMobile ? '58%' : 'auto', padding: isMobile ? '6px 8px' : '6px 8px', borderRight: '1px solid #94a3b8', textAlign: 'left', fontWeight: 800 }}>DESCRIPCIÓN</th>
                {!isMobile && (
                  <>
                    <th style={{ width: '90px', padding: '6px', borderRight: '1px solid #94a3b8', textAlign: 'center', fontWeight: 800 }}>CÓDIGO</th>
                    <th style={{ width: '85px', padding: '6px 8px', borderRight: '1px solid #94a3b8', textAlign: 'right', fontWeight: 800 }}>P. UNIT.</th>
                  </>
                )}
                <th style={{ width: isMobile ? '27%' : '90px', padding: isMobile ? '6px 8px' : '6px 8px', textAlign: 'right', fontWeight: 800 }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {mobiliarioItems.length > 0 ? mobiliarioItems.map((i, idx) => {
                const unitPrice = i.cantidad > 0 ? (parseFloat(i.subtotal || 0) / i.cantidad) : 0;
                const cod = i.codigo || obtenerCodigo(i.nombre || i.mueble, false);
                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td style={{ padding: isMobile ? '7px 4px' : '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700, verticalAlign: 'top' }}>
                        {i.cantidad}
                      </td>
                      <td style={{ padding: isMobile ? '7px 8px' : '5px 8px', border: '1px solid #cbd5e1', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', lineHeight: 1.3 }}>
                          {i.nombre || i.mueble || ''}
                        </div>
                        {isMobile && (
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: 500 }}>
                            P. Unit: ${unitPrice.toFixed(2)} · Cód: {cod}
                          </div>
                        )}
                      </td>
                      {!isMobile && (
                        <>
                          <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 600, color: '#475569' }}>{cod}</td>
                          <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>${unitPrice.toFixed(2)}</td>
                        </>
                      )}
                      <td style={{ padding: isMobile ? '7px 8px' : '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 700, color: '#0f172a', verticalAlign: 'top' }}>
                        ${parseFloat(i.subtotal || 0).toFixed(2)}
                      </td>
                    </tr>
                    {i.combo_id && Array.isArray(i.componentes) && i.componentes.map((ci, cIdx) => (
                      <tr key={`${idx}-c-${cIdx}`} style={{ fontSize: isMobile ? 11 : 10.5, color: '#475569', background: '#f8fafc' }}>
                        <td style={{ padding: '4px 4px', textAlign: 'center', border: '1px solid #e2e8f0', fontWeight: 600 }}>{ci.cantidad * i.cantidad}</td>
                        <td style={{ padding: isMobile ? '4px 8px 4px 12px' : '4px 8px 4px 18px', border: '1px solid #e2e8f0' }}>└─ {ci.nombre}</td>
                        {!isMobile && (
                          <>
                            <td style={{ padding: '4px 6px', textAlign: 'center', border: '1px solid #e2e8f0' }}>{obtenerCodigo(ci.nombre, false)}</td>
                            <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#94a3b8' }}>—</td>
                          </>
                        )}
                        <td style={{ padding: '4px 8px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#94a3b8' }}>Incluido</td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              }) : (
                <tr>
                  <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>-</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#64748b', fontStyle: 'italic' }}>Sin artículos</td>
                  {!isMobile && (
                    <>
                      <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1' }}>N/A</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>$0.00</td>
                    </>
                  )}
                  <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>$0.00</td>
                </tr>
              )}
              <tr style={{ borderTop: '1.5px solid #94a3b8', background: '#f8fafc' }}>
                <td colSpan={isMobile ? 2 : 4} style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #94a3b8', textTransform: 'uppercase', fontSize: isMobile ? 11.5 : 11 }}>
                  SUBTOTAL MERCANCÍA:
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: isMobile ? 12.5 : 11.5 }}>
                  ${subtotalMobiliario.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SERVICIOS ADICIONALES */}
        <div style={{
          background: empColor,
          color: '#fff',
          fontWeight: 800,
          fontSize: isMobile ? 11.5 : 11,
          padding: '6px 10px',
          borderRadius: '6px 6px 0 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginTop: 12
        }}>
          SERVICIOS ADICIONALES
        </div>
        <div>
          <table className="contrato-table" style={{ fontSize: isMobile ? 12 : 11, border: '1px solid #94a3b8' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #94a3b8', background: '#f8fafc', color: '#1e293b' }}>
                <th style={{ width: isMobile ? '15%' : '52px', padding: isMobile ? '6px 4px' : '6px', borderRight: '1px solid #94a3b8', textAlign: 'center', fontWeight: 800 }}>CANT.</th>
                <th style={{ width: isMobile ? '58%' : 'auto', padding: isMobile ? '6px 8px' : '6px 8px', borderRight: '1px solid #94a3b8', textAlign: 'left', fontWeight: 800 }}>DESCRIPCIÓN</th>
                {!isMobile && (
                  <>
                    <th style={{ width: '90px', padding: '6px', borderRight: '1px solid #94a3b8', textAlign: 'center', fontWeight: 800 }}>CÓDIGO</th>
                    <th style={{ width: '85px', padding: '6px 8px', borderRight: '1px solid #94a3b8', textAlign: 'right', fontWeight: 800 }}>P. UNIT.</th>
                  </>
                )}
                <th style={{ width: isMobile ? '27%' : '90px', padding: isMobile ? '6px 8px' : '6px 8px', textAlign: 'right', fontWeight: 800 }}>IMPORTE</th>
              </tr>
            </thead>
            <tbody>
              {servicioItems.length > 0 ? servicioItems.map((i, idx) => {
                const unitPrice = i.cantidad > 0 ? (parseFloat(i.subtotal || 0) / i.cantidad) : 0;
                const cod = i.codigo || obtenerCodigo(i.nombre || i.mueble, true);
                return (
                  <tr key={idx}>
                    <td style={{ padding: isMobile ? '7px 4px' : '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 700 }}>{i.cantidad}</td>
                    <td style={{ padding: isMobile ? '7px 8px' : '5px 8px', border: '1px solid #cbd5e1', fontWeight: 700, textTransform: 'uppercase' }}>{i.nombre || i.mueble || ''}</td>
                    {!isMobile && (
                      <>
                        <td style={{ padding: '5px 6px', textAlign: 'center', border: '1px solid #cbd5e1', fontWeight: 600 }}>{cod}</td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1' }}>${unitPrice.toFixed(2)}</td>
                      </>
                    )}
                    <td style={{ padding: isMobile ? '7px 8px' : '5px 8px', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: 700 }}>${parseFloat(i.subtotal || 0).toFixed(2)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>-</td>
                  <td style={{ padding: '6px 8px', border: '1px solid #cbd5e1', color: '#64748b', fontStyle: 'italic' }}>Sin servicios adicionales</td>
                  {!isMobile && (
                    <>
                      <td style={{ padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', color: '#64748b' }}>N/A</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#64748b' }}>$0.00</td>
                    </>
                  )}
                  <td style={{ padding: '6px 8px', textAlign: 'right', border: '1px solid #cbd5e1', color: '#64748b' }}>$0.00</td>
                </tr>
              )}
              <tr style={{ borderTop: '1.5px solid #94a3b8', background: '#f8fafc' }}>
                <td colSpan={isMobile ? 2 : 4} style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, borderRight: '1px solid #94a3b8', textTransform: 'uppercase', fontSize: isMobile ? 11.5 : 11 }}>
                  SUBTOTAL SERVICIOS:
                </td>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 800, color: '#0f172a', fontSize: isMobile ? 12.5 : 11.5 }}>
                  ${subtotalServicios.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TOTALES */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, marginBottom: 10 }}>
          <div style={{
            width: isMobile ? '100%' : 270,
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: isMobile ? '10px 14px' : '8px 12px',
            fontSize: isMobile ? 13.5 : 12.5
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>Total del Contrato:</span>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>${parseFloat(reserva.total || 0).toFixed(2)}</span>
            </div>
            {totalAbono > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#16a34a' }}>
                <span style={{ fontWeight: 600 }}>Abono registrado:</span>
                <span style={{ fontWeight: 800 }}>-${totalAbono.toFixed(2)}</span>
              </div>
            )}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0 2px 0',
              marginTop: 4,
              borderTop: '1.5px solid #cbd5e1',
              color: saldoPendiente > 0 ? '#dc2626' : '#16a34a'
            }}>
              <span style={{ fontWeight: 900, fontSize: isMobile ? 15 : 14, textTransform: 'uppercase' }}>Saldo pendiente:</span>
              <span style={{ fontWeight: 900, fontSize: isMobile ? 16 : 15 }}>${saldoPendiente.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* AVISO DE NO DEVOLUCIONES */}
        <div style={{
          border: '1.5px solid #ef4444',
          background: '#fef2f2',
          borderRadius: 6,
          padding: isMobile ? '8px 10px' : '6px 10px',
          textAlign: 'center',
          color: '#dc2626',
          fontWeight: 800,
          fontSize: isMobile ? 12 : 11,
          margin: '10px 0 12px 0',
          letterSpacing: '0.4px'
        }}>
          ⚠ NO HAY DEVOLUCIONES EN ANTICIPOS
        </div>

        {/* TÉRMINOS Y CONDICIONES */}
        <div style={{
          border: '1px solid #94a3b8',
          borderRadius: 8,
          padding: isMobile ? '12px' : '10px 14px',
          marginBottom: 14,
          background: '#fff'
        }}>
          <div style={{
            color: empColor,
            fontWeight: 800,
            fontSize: isMobile ? 12.5 : 11.5,
            textAlign: 'center',
            textTransform: 'uppercase',
            marginBottom: 8,
            letterSpacing: '0.5px'
          }}>
            TÉRMINOS Y CONDICIONES
          </div>
          <div style={{
            fontSize: isMobile ? 12 : 10.5,
            lineHeight: isMobile ? 1.5 : 1.45,
            color: '#1e293b',
            textAlign: isMobile ? 'left' : 'justify'
          }}>
            {lineasTerminos.map((t, idx) => (
              <div key={idx} style={{ marginBottom: 6 }}>
                <b>{idx + 1}.</b> {t}
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN DE FIRMAS */}
        <div style={{ border: '1px solid #94a3b8', borderRadius: 8, marginBottom: 18, overflow: 'hidden' }}>
          <div style={{ padding: isMobile ? '16px 12px 12px 12px' : '14px 16px 10px 16px', textAlign: 'center', borderBottom: '1px solid #cbd5e1' }}>
            {estaConfirmado && (
              <div style={{ color: '#15803d', fontWeight: 800, fontSize: isMobile ? 12.5 : 12, marginBottom: 6 }}>
                ✓ CONFIRMADO DIGITALMENTE POR {(reserva.nombre_cliente || 'EL CLIENTE').toUpperCase()}
              </div>
            )}
            <div style={{ width: isMobile ? '85%' : '70%', margin: '0 auto 6px auto', borderBottom: '1px solid #475569' }}></div>
            <div style={{ fontSize: isMobile ? 12.5 : 11, fontWeight: 700, color: '#1e293b' }}>{reserva.nombre_cliente || ''}</div>
            <div style={{ fontSize: isMobile ? 10.5 : 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ACEPTO TÉRMINOS Y CONDICIONES</div>
          </div>
          <div style={{ padding: isMobile ? '16px 12px 12px 12px' : '14px 16px 10px 16px', textAlign: 'center', background: '#f8fafc' }}>
            <div style={{ width: isMobile ? '85%' : '70%', margin: '0 auto 6px auto', borderBottom: '1px solid #475569' }}></div>
            <div style={{ fontSize: isMobile ? 12.5 : 11, fontWeight: 700, color: '#1e293b' }}>{empNombre}</div>
            <div style={{ fontSize: isMobile ? 10.5 : 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ENTREGA CONFORME</div>
          </div>
        </div>

        {/* SECCIÓN FINAL DE CONFIRMACIÓN DEL CLIENTE (BOTÓN CONFIRMADO) */}
        <div style={{
          background: estaConfirmado ? '#f0fdf4' : '#fff1f2',
          border: `2px solid ${estaConfirmado ? '#22c55e' : '#ef4444'}`,
          borderRadius: 12,
          padding: isMobile ? '1.25rem 1rem' : '1.5rem',
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
                padding: isMobile ? '12px 24px' : '12px 28px',
                width: isMobile ? '100%' : 'auto',
                boxSizing: 'border-box',
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
              <h3 style={{ margin: '0 0 6px 0', color: '#991b1b', fontSize: isMobile ? 15.5 : 16, fontWeight: 800 }}>
                Confirmación del Contrato de Reserva
              </h3>
              <p style={{ margin: '0 0 14px 0', color: '#7f1d1d', fontSize: isMobile ? 12.5 : 13, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.45 }}>
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
                  padding: isMobile ? '15px 20px' : '14px 36px',
                  width: isMobile ? '100%' : 'auto',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: confirmando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.4)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
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
