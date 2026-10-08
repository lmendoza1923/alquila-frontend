import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function ClientesAdmin({ onAbrirEditarReserva }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Modales
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // Para ver detalles
  const [clienteEditando, setClienteEditando] = useState(null); // Para editar
  const [modalNuevo, setModalNuevo] = useState(false); // Para crear nuevo
  const [guardando, setGuardando] = useState(false);

  // Formulario de edición/creación
  const [form, setForm] = useState({
    alias: '',
    nombre: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: '',
    notas: '',
    actualizar_reservas: true
  });

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clientes');
      setClientes(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la lista de clientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarClientes();
  }, []);

  // Clientes filtrados por búsqueda
  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes;
    const q = busqueda.toLowerCase().trim();
    return clientes.filter(c => 
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.alias && c.alias.toLowerCase().includes(q)) ||
      (c.cedula && c.cedula.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q)) ||
      (c.direccion && c.direccion.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.notas && c.notas.toLowerCase().includes(q))
    );
  }, [clientes, busqueda]);

  // Métricas rápidas
  const totalClientes = clientes.length;
  const clientesConReservas = clientes.filter(c => parseInt(c.total_reservas || 0) > 0).length;
  const totalFacturadoGeneral = clientes.reduce((acc, c) => acc + parseFloat(c.total_facturado || 0), 0);

  // Abrir modal de edición
  const abrirEditar = (c) => {
    setClienteEditando(c);
    setForm({
      alias: c.alias || '',
      nombre: c.nombre || '',
      cedula: c.cedula || '',
      telefono: c.telefono || '',
      email: c.email || '',
      direccion: c.direccion || '',
      notas: c.notas || '',
      actualizar_reservas: true
    });
  };

  // Abrir modal de nuevo cliente
  const abrirNuevo = () => {
    setClienteEditando(null);
    setForm({
      alias: '',
      nombre: '',
      cedula: '',
      telefono: '',
      email: '',
      direccion: '',
      notas: '',
      actualizar_reservas: false
    });
    setModalNuevo(true);
  };

  // Guardar edición
  const guardarEdicion = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim() && !form.alias.trim()) {
      toast.error('Debe ingresar al menos un nombre o alias para el cliente');
      return;
    }

    setGuardando(true);
    try {
      if (clienteEditando) {
        const res = await api.put(`/clientes/${clienteEditando.id}`, form);
        toast.success('Cliente actualizado correctamente');
        setClienteEditando(null);
        // Actualizar en el estado local
        setClientes(prev => prev.map(c => c.id === clienteEditando.id ? { ...c, ...res.data } : c));
        if (clienteSeleccionado && clienteSeleccionado.id === clienteEditando.id) {
          setClienteSeleccionado(prev => ({ ...prev, ...res.data }));
        }
      } else {
        const res = await api.post('/clientes', form);
        toast.success('Cliente creado correctamente');
        setModalNuevo(false);
        await cargarClientes();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar los datos del cliente');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar cliente
  const eliminarCliente = async (c) => {
    const confirmMsg = `¿Eliminar al cliente "${c.nombre || c.alias}"? Sus reservas históricas permanecerán intactas en el sistema.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/clientes/${c.id}`);
      toast.success('Cliente eliminado');
      setClientes(prev => prev.filter(x => x.id !== c.id));
      if (clienteSeleccionado && clienteSeleccionado.id === c.id) {
        setClienteSeleccionado(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar el cliente');
    }
  };

  // Limpiar número para enlace de WhatsApp
  const obtenerLinkWhatsapp = (telefono) => {
    if (!telefono) return null;
    let limpio = telefono.replace(/[^0-9]/g, '');
    if (limpio.length === 8) limpio = '507' + limpio; // Prefijo Panamá por defecto si son 8 dígitos
    return `https://wa.me/${limpio}`;
  };

  const getEstadoBadge = (estado) => {
    const estilos = {
      activa: { bg: '#e0f2fe', color: '#0369a1', label: 'Activa' },
      confirmada: { bg: '#dcfce7', color: '#15803d', label: 'Confirmada' },
      completada: { bg: '#f1f5f9', color: '#475569', label: 'Completada' },
      pendiente: { bg: '#fef3c7', color: '#b45309', label: 'Pendiente' },
      cancelada: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelada' }
    };
    const s = estilos[estado] || { bg: '#f3f4f6', color: '#374151', label: estado };
    return (
      <span style={{
        background: s.bg,
        color: s.color,
        padding: '3px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase'
      }}>
        {s.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── Tarjetas de Estadísticas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: 32, background: '#eef2ff', padding: '10px 14px', borderRadius: 10 }}>👥</div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total Clientes</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}>{totalClientes}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: 32, background: '#ecfdf5', padding: '10px 14px', borderRadius: 10 }}>📋</div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Con Reservas</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#059669' }}>{clientesConReservas}</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: 32, background: '#fef3c7', padding: '10px 14px', borderRadius: 10 }}>💰</div>
          <div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Facturación Acumulada</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#b45309' }}>${totalFacturadoGeneral.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Barra de Búsqueda y Botón Nuevo Cliente ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ flex: '1', minWidth: '260px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, alias, cédula, teléfono o dirección..."
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 14,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          onClick={abrirNuevo}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: '#4a6cf7',
            color: '#fff',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(74, 108, 247, 0.25)',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#3b5bdb'}
          onMouseOut={e => e.currentTarget.style.background = '#4a6cf7'}
        >
          <span>➕</span>
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {/* ── Tabla Principal de Clientes ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <p>Cargando información de clientes...</p>
          </div>
        ) : clientesFiltrados.length === 0 ? (
          <div style={{ padding: '3.5rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No se encontraron clientes</h3>
            <p style={{ margin: 0, fontSize: 14 }}>
              {busqueda ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no hay clientes registrados en la base de datos.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '14px 16px' }}>Cliente / Alias</th>
                  <th style={{ padding: '14px 16px' }}>Cédula</th>
                  <th style={{ padding: '14px 16px' }}>Contacto</th>
                  <th style={{ padding: '14px 16px' }}>Dirección de Entrega</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Reservas</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((c, index) => {
                  const linkWa = obtenerLinkWhatsapp(c.telefono);
                  const numReservas = parseInt(c.total_reservas || 0);

                  return (
                    <tr 
                      key={c.id} 
                      style={{ 
                        borderBottom: index < clientesFiltrados.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseOut={e => e.currentTarget.style.background = '#fff'}
                    >
                      {/* Cliente y Alias */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {c.nombre || 'Sin nombre registrado'}
                        </div>
                        {c.alias && (
                          <div style={{ color: '#4a6cf7', fontSize: 12, fontWeight: 500, marginTop: 2 }}>
                            🏷️ {c.alias}
                          </div>
                        )}
                      </td>

                      {/* Cédula */}
                      <td style={{ padding: '14px 16px', color: '#475569', fontSize: 13 }}>
                        {c.cedula ? (
                          <span style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
                            {c.cedula}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>-</span>
                        )}
                      </td>

                      {/* Teléfono y Email */}
                      <td style={{ padding: '14px 16px' }}>
                        {c.telefono ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontWeight: 500, color: '#1e293b' }}>{c.telefono}</span>
                            {linkWa && (
                              <a
                                href={linkWa}
                                target="_blank"
                                rel="noreferrer"
                                title="Escribir por WhatsApp"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: '#25D366',
                                  color: '#fff',
                                  borderRadius: '50%',
                                  width: 20,
                                  height: 20,
                                  fontSize: 11,
                                  textDecoration: 'none'
                                }}
                              >
                                💬
                              </a>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>Sin teléfono</span>
                        )}
                        {c.email && (
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                            ✉️ {c.email}
                          </div>
                        )}
                      </td>

                      {/* Dirección de Entrega */}
                      <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                        {c.direccion ? (
                          <div 
                            style={{ 
                              color: '#334155', 
                              fontSize: 13,
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis' 
                            }}
                            title={c.direccion}
                          >
                            📍 {c.direccion}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 13 }}>-</span>
                        )}
                        {c.notas && (
                          <div 
                            style={{ 
                              color: '#64748b', 
                              fontSize: 11, 
                              fontStyle: 'italic',
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              marginTop: 2
                            }}
                            title={c.notas}
                          >
                            📝 {c.notas}
                          </div>
                        )}
                      </td>

                      {/* Reservas e Historial */}
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {numReservas > 0 ? (
                          <div>
                            <span style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              padding: '4px 10px',
                              borderRadius: 16,
                              fontSize: 12,
                              fontWeight: 700
                            }}>
                              {numReservas} {numReservas === 1 ? 'reserva' : 'reservas'}
                            </span>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 600 }}>
                              ${parseFloat(c.total_facturado || 0).toFixed(2)}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>Sin reservas</span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => setClienteSeleccionado(c)}
                            title="Ver detalles completos del cliente y sus reservas"
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#334155',
                              padding: '6px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600
                            }}
                          >
                            👁️ Ver Ficha
                          </button>

                          <button
                            onClick={() => abrirEditar(c)}
                            title="Editar datos del cliente"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              padding: '6px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: 600
                            }}
                          >
                            ✏️ Editar
                          </button>

                          <button
                            onClick={() => eliminarCliente(c)}
                            title="Eliminar cliente"
                            style={{
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              color: '#b91c1c',
                              padding: '6px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 13
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL: DETALLES COMPLETOS DEL CLIENTE Y RESERVAS ── */}
      {clienteSeleccionado && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: 850,
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>
                  Ficha del Cliente: {clienteSeleccionado.nombre || clienteSeleccionado.alias}
                </h2>
                {clienteSeleccionado.alias && (
                  <span style={{ fontSize: 13, color: '#4a6cf7', fontWeight: 600 }}>
                    Alias: {clienteSeleccionado.alias}
                  </span>
                )}
              </div>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 22,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 6
                }}
              >
                ✕
              </button>
            </div>

            {/* Contenido Scrollable */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Bloque: Datos Personales Registrados */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 10,
                padding: '1.25rem',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📋</span>
                  <span>Datos Registrados al Crear Reserva</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Nombre Completo</label>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                      {clienteSeleccionado.nombre || '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Alias / Identificador</label>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                      {clienteSeleccionado.alias || '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Cédula / Identificación</label>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                      {clienteSeleccionado.cedula || '-'}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Teléfono / WhatsApp</label>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>{clienteSeleccionado.telefono || '-'}</span>
                      {clienteSeleccionado.telefono && obtenerLinkWhatsapp(clienteSeleccionado.telefono) && (
                        <a
                          href={obtenerLinkWhatsapp(clienteSeleccionado.telefono)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#25D366',
                            color: '#fff',
                            borderRadius: '4px',
                            padding: '2px 6px',
                            fontSize: 11,
                            textDecoration: 'none',
                            fontWeight: 600
                          }}
                        >
                          WhatsApp 💬
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Correo Electrónico</label>
                    <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                      {clienteSeleccionado.email || '-'}
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dirección de Entrega</label>
                    <div style={{ fontSize: 14, color: '#1e293b', marginTop: 2 }}>
                      {clienteSeleccionado.direccion || '-'}
                    </div>
                  </div>

                  {clienteSeleccionado.notas && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Notas Adicionales</label>
                      <div style={{ fontSize: 13, color: '#475569', marginTop: 2, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap' }}>
                        {clienteSeleccionado.notas}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bloque: Historial de Reservas del Cliente */}
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📦</span>
                    <span>Historial de Reservas y Artículos Alquilados ({clienteSeleccionado.reservas?.length || 0})</span>
                  </span>
                  {clienteSeleccionado.total_facturado && (
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 700 }}>
                      Total facturado: ${parseFloat(clienteSeleccionado.total_facturado).toFixed(2)}
                    </span>
                  )}
                </h4>

                {!clienteSeleccionado.reservas || clienteSeleccionado.reservas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', background: '#f8fafc', borderRadius: 10, color: '#94a3b8' }}>
                    No hay reservas asociadas a este cliente.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {clienteSeleccionado.reservas.map(reserva => (
                      <div
                        key={reserva.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '1rem',
                          background: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>
                              Reserva #{reserva.id.slice(0, 8).toUpperCase()}
                            </span>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              📅 {reserva.fecha_inicio} al {reserva.fecha_fin}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {getEstadoBadge(reserva.estado)}
                            <span style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>
                              ${parseFloat(reserva.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Dirección y notas de la reserva */}
                        {reserva.direccion_entrega && reserva.direccion_entrega !== clienteSeleccionado.direccion && (
                          <div style={{ fontSize: 12, color: '#475569', marginBottom: 6 }}>
                            📍 <strong>Entrega:</strong> {reserva.direccion_entrega}
                          </div>
                        )}
                        {reserva.notas && (
                          <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 8 }}>
                            📝 {reserva.notas}
                          </div>
                        )}

                        {/* Items Alquilados */}
                        {reserva.items && reserva.items.length > 0 && (
                          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 12px', marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                              Artículos y Servicios Alquilados
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {reserva.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                                  <span>
                                    • {item.nombre} <strong style={{ color: '#64748b' }}>×{item.cantidad}</strong>
                                    {item.precio_unitario ? ` ($${parseFloat(item.precio_unitario).toFixed(2)}/u)` : ''}
                                  </span>
                                  <span style={{ fontWeight: 600 }}>${parseFloat(item.subtotal || 0).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              background: '#f8fafc'
            }}>
              <button
                onClick={() => {
                  const c = clienteSeleccionado;
                  setClienteSeleccionado(null);
                  abrirEditar(c);
                }}
                style={{
                  background: '#4a6cf7',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                ✏️ Editar Datos de este Cliente
              </button>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{
                  background: '#fff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR O EDITAR CLIENTE ── */}
      {(clienteEditando || modalNuevo) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1.5rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: 600,
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h2 style={{ margin: 0, fontSize: 17, color: '#1e293b' }}>
                {clienteEditando ? `Editar Cliente: ${clienteEditando.nombre || clienteEditando.alias}` : 'Nuevo Cliente'}
              </h2>
              <button
                onClick={() => { setClienteEditando(null); setModalNuevo(false); }}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarEdicion} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Alias / Identificador
                  </label>
                  <input
                    type="text"
                    value={form.alias}
                    onChange={e => setForm({ ...form, alias: e.target.value })}
                    placeholder="Ej: Juan Boda / Fiesta de María"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Cédula / Documento (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.cedula}
                    onChange={e => setForm({ ...form, cedula: e.target.value })}
                    placeholder="Ej: 8-888-8888"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    placeholder="Ej: 6000-0000"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@ejemplo.com"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Dirección de Entrega Habitual
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Calle, edificio, urbanización, ciudad"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Notas Adicionales
                </label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Instrucciones especiales, preferencias de horario..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, height: 70, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {clienteEditando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="actualizar_reservas"
                    checked={form.actualizar_reservas}
                    onChange={e => setForm({ ...form, actualizar_reservas: e.target.checked })}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="actualizar_reservas" style={{ fontSize: 13, color: '#475569', cursor: 'pointer' }}>
                    Actualizar también estos datos en las reservas históricas de este cliente
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setClienteEditando(null); setModalNuevo(false); }}
                  style={{
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '9px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{
                    background: '#4a6cf7',
                    border: 'none',
                    color: '#fff',
                    padding: '9px 20px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: guardando ? 'not-allowed' : 'pointer',
                    opacity: guardando ? 0.7 : 1
                  }}
                >
                  {guardando ? 'Guardando...' : (clienteEditando ? 'Guardar Cambios' : 'Crear Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
