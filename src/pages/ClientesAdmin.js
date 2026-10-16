import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api';

export default function ClientesAdmin({ onAbrirEditarReserva }) {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  
  // Detección de dispositivo móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modales
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null); // Para ver detalles
  const [clienteEditando, setClienteEditando] = useState(null); // Para editar
  const [modalNuevo, setModalNuevo] = useState(false); // Para crear nuevo
  const [modalCompartirLink, setModalCompartirLink] = useState(false); // Para compartir formulario de reserva
  const [copiadoExito, setCopiadoExito] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const urlFormulario = `${window.location.origin}/formulario-cliente`;

  const copiarLinkPublico = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(urlFormulario)
        .then(() => {
          setCopiadoExito(true);
          toast.success('¡Enlace del formulario copiado!');
          setTimeout(() => setCopiadoExito(false), 3000);
        })
        .catch(() => {
          prompt('Copia este enlace para el cliente:', urlFormulario);
        });
    } else {
      prompt('Copia este enlace para el cliente:', urlFormulario);
    }
  };

  const compartirWhatsApp = () => {
    const mensaje = `Hola, por favor completa tus datos en este enlace para registrar tu reserva y organizar tu evento:\n\n${urlFormulario}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  // Formulario de edición/creación
  const [form, setForm] = useState({
    alias: '',
    nombre: '',
    cedula: '',
    telefono: '',
    contacto2_nombre: '',
    contacto2_telefono: '',
    email: '',
    direccion: '',
    notas: '',
    actualizar_reservas: true
  });

  const [filtroOrigen, setFiltroOrigen] = useState('todos'); // 'todos' | 'por_revisar' | 'formulario'

  const notificarCambioNuevos = () => {
    window.dispatchEvent(new Event('clientes-nuevos-updated'));
  };

  const cargarClientes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/clientes');
      setClientes(res.data);
      notificarCambioNuevos();
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

  const marcarClienteRevisado = async (c, nuevoEstado = true, silencioso = false) => {
    try {
      const res = await api.patch(`/clientes/${c.id}/revisar`, { revisado: nuevoEstado });
      setClientes(prev => prev.map(item => item.id === c.id ? { ...item, revisado: res.data.revisado } : item));
      if (clienteSeleccionado && clienteSeleccionado.id === c.id) {
        setClienteSeleccionado(prev => ({ ...prev, revisado: res.data.revisado }));
      }
      notificarCambioNuevos();
      if (!silencioso) {
        toast.success(nuevoEstado ? 'Registro de cliente marcado como revisado ✓' : 'Marcado como pendiente de revisión');
      }
    } catch (err) {
      toast.error('Error al actualizar estado de revisión');
    }
  };

  const marcarTodosRevisados = async () => {
    try {
      await api.patch('/clientes/revisar-todos');
      setClientes(prev => prev.map(c => ({ ...c, revisado: true })));
      if (clienteSeleccionado) {
        setClienteSeleccionado(prev => ({ ...prev, revisado: true }));
      }
      if (filtroOrigen === 'por_revisar') setFiltroOrigen('todos');
      notificarCambioNuevos();
      toast.success('Todos los registros nuevos fueron marcados como revisados');
    } catch (err) {
      toast.error('Error al marcar registros como revisados');
    }
  };

  const abrirFichaCliente = (c) => {
    setClienteSeleccionado(c);
  };

  // Clientes filtrados por búsqueda y filtro de formulario
  const clientesFiltrados = useMemo(() => {
    let base = clientes;
    if (filtroOrigen === 'por_revisar') {
      base = base.filter(c => c.origen_formulario && c.revisado === false);
    } else if (filtroOrigen === 'formulario') {
      base = base.filter(c => c.origen_formulario);
    }

    if (!busqueda.trim()) return base;
    const q = busqueda.toLowerCase().trim();
    return base.filter(c => 
      (c.nombre && c.nombre.toLowerCase().includes(q)) ||
      (c.alias && c.alias.toLowerCase().includes(q)) ||
      (c.cedula && c.cedula.toLowerCase().includes(q)) ||
      (c.telefono && c.telefono.toLowerCase().includes(q)) ||
      (c.contacto2_nombre && c.contacto2_nombre.toLowerCase().includes(q)) ||
      (c.contacto2_telefono && c.contacto2_telefono.toLowerCase().includes(q)) ||
      (c.direccion && c.direccion.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.notas && c.notas.toLowerCase().includes(q))
    );
  }, [clientes, busqueda, filtroOrigen]);

  // Métricas rápidas
  const totalClientes = clientes.length;
  const clientesConReservas = clientes.filter(c => parseInt(c.total_reservas || 0) > 0).length;
  const totalFacturadoGeneral = clientes.reduce((acc, c) => acc + parseFloat(c.total_facturado || 0), 0);
  const nuevosSinRevisar = clientes.filter(c => c.origen_formulario && c.revisado === false).length;

  // Abrir modal de edición
  const abrirEditar = (c) => {
    setClienteEditando(c);
    setForm({
      alias: c.alias || '',
      nombre: c.nombre || '',
      cedula: c.cedula || '',
      telefono: c.telefono || '',
      contacto2_nombre: c.contacto2_nombre || '',
      contacto2_telefono: c.contacto2_telefono || '',
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
      contacto2_nombre: '',
      contacto2_telefono: '',
      email: '',
      direccion: '',
      notas: '',
      actualizar_reservas: false
    });
    setModalNuevo(true);
  };

  // Guardar edición o nuevo cliente
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
        setClientes(prev => prev.map(c => c.id === clienteEditando.id ? { ...c, ...res.data } : c));
        if (clienteSeleccionado && clienteSeleccionado.id === clienteEditando.id) {
          setClienteSeleccionado(prev => ({ ...prev, ...res.data }));
        }
      } else {
        await api.post('/clientes', form);
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
      notificarCambioNuevos();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar el cliente');
    }
  };

  // Limpiar número para enlace de WhatsApp
  const obtenerLinkWhatsapp = (telefono) => {
    if (!telefono) return null;
    let limpio = telefono.replace(/[^0-9]/g, '');
    if (limpio.length === 8) limpio = '507' + limpio;
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', width: '100%', boxSizing: 'border-box' }}>
      {/* ── Alerta destacada si hay nuevos clientes registrados por formulario sin revisar ── */}
      {nuevosSinRevisar > 0 && (
        <div style={{
          background: 'linear-gradient(90deg, #fff1f2 0%, #fef2f2 100%)',
          border: '1.5px solid #f87171',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          boxShadow: '0 2px 10px rgba(239, 68, 68, 0.12)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '50%',
              width: 34,
              height: 34,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 17,
              flexShrink: 0
            }}>
              🔔
            </span>
            <div>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: 14 }}>
                {nuevosSinRevisar === 1
                  ? '¡Tienes 1 nuevo registro de cliente enviado desde el formulario!'
                  : `¡Tienes ${nuevosSinRevisar} nuevos registros de clientes enviados desde el formulario!`}
              </div>
              <div style={{ fontSize: 12.5, color: '#b91c1c' }}>
                Identifícalos con la etiqueta <strong>🆕 NUEVO · FORMULARIO</strong> para revisar sus datos o crearles su reserva.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setFiltroOrigen(filtroOrigen === 'por_revisar' ? 'todos' : 'por_revisar')}
              style={{
                background: filtroOrigen === 'por_revisar' ? '#991b1b' : '#ef4444',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '7px 13px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {filtroOrigen === 'por_revisar' ? 'Ver todos los clientes' : `🔍 Filtrar nuevos (${nuevosSinRevisar})`}
            </button>
            <button
              type="button"
              onClick={marcarTodosRevisados}
              style={{
                background: '#fff',
                color: '#15803d',
                border: '1px solid #86efac',
                borderRadius: 8,
                padding: '7px 13px',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              ✓ Marcar todos como revisados
            </button>
          </div>
        </div>
      )}

      {/* ── Tarjetas de Estadísticas Responsivas ── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))', 
        gap: '0.75rem' 
      }}>
        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: isMobile ? '0.85rem' : '1rem 1.15rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.6rem' : '0.85rem' 
        }}>
          <div style={{ fontSize: isMobile ? 22 : 28, background: '#eef2ff', padding: isMobile ? '8px 10px' : '9px 12px', borderRadius: 10 }}>👥</div>
          <div>
            <div style={{ fontSize: isMobile ? 11 : 12.5, color: '#64748b', fontWeight: 600 }}>Total Clientes</div>
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#1e293b' }}>{totalClientes}</div>
          </div>
        </div>

        <div
          onClick={() => setFiltroOrigen(filtroOrigen === 'por_revisar' ? 'todos' : 'por_revisar')}
          title="Clic para filtrar los nuevos registros enviados por formulario"
          style={{ 
            background: nuevosSinRevisar > 0 ? '#fff1f2' : '#fff', 
            borderRadius: 12, 
            padding: isMobile ? '0.85rem' : '1rem 1.15rem', 
            border: nuevosSinRevisar > 0 ? '1.5px solid #f87171' : '1px solid #e2e8f0', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)', 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '0.6rem' : '0.85rem',
            cursor: 'pointer'
          }}
        >
          <div style={{ fontSize: isMobile ? 22 : 28, background: nuevosSinRevisar > 0 ? '#fee2e2' : '#f1f5f9', padding: isMobile ? '8px 10px' : '9px 12px', borderRadius: 10 }}>
            {nuevosSinRevisar > 0 ? '🔔' : '📝'}
          </div>
          <div>
            <div style={{ fontSize: isMobile ? 11 : 12.5, color: nuevosSinRevisar > 0 ? '#b91c1c' : '#64748b', fontWeight: 700 }}>
              Nuevos Formulario
            </div>
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: nuevosSinRevisar > 0 ? '#dc2626' : '#475569' }}>
              {nuevosSinRevisar} <span style={{ fontSize: 11, fontWeight: 600 }}>sin revisar</span>
            </div>
          </div>
        </div>

        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: isMobile ? '0.85rem' : '1rem 1.15rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.6rem' : '0.85rem' 
        }}>
          <div style={{ fontSize: isMobile ? 22 : 28, background: '#ecfdf5', padding: isMobile ? '8px 10px' : '9px 12px', borderRadius: 10 }}>📋</div>
          <div>
            <div style={{ fontSize: isMobile ? 11 : 12.5, color: '#64748b', fontWeight: 600 }}>Con Reservas</div>
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#059669' }}>{clientesConReservas}</div>
          </div>
        </div>

        <div style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: isMobile ? '0.85rem' : '1rem 1.15rem', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? '0.6rem' : '0.85rem'
        }}>
          <div style={{ fontSize: isMobile ? 22 : 28, background: '#fef3c7', padding: isMobile ? '8px 10px' : '9px 12px', borderRadius: 10 }}>💰</div>
          <div>
            <div style={{ fontSize: isMobile ? 11 : 12.5, color: '#64748b', fontWeight: 600 }}>Facturación Acumulada</div>
            <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, color: '#b45309' }}>${totalFacturadoGeneral.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* ── Barra de Búsqueda, Filtro de Formulario y Botón Nuevo Cliente ── */}
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: '0.85rem 1rem',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: '0.65rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder={isMobile ? "Buscar cliente o teléfono..." : "Buscar por nombre, alias, cédula, teléfono o dirección..."}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              fontSize: 13.5,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: 8,
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          width: isMobile ? '100%' : 'auto',
          flexWrap: 'wrap'
        }}>
          <select
            value={filtroOrigen}
            onChange={e => setFiltroOrigen(e.target.value)}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: filtroOrigen !== 'todos' ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
              background: filtroOrigen !== 'todos' ? '#fff1f2' : '#fff',
              color: filtroOrigen !== 'todos' ? '#991b1b' : '#334155',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="todos">📋 Todos los clientes ({clientes.length})</option>
            <option value="por_revisar">🔔 Nuevos por revisar ({nuevosSinRevisar})</option>
            <option value="formulario">📝 Registrados por formulario</option>
          </select>

          <button
            onClick={() => setModalCompartirLink(true)}
            title="Compartir link del formulario de reserva con clientes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 14px',
              background: '#10b981',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            <span>🔗</span>
            <span>Link para Clientes</span>
          </button>

          <button
            onClick={abrirNuevo}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '9px 16px',
              background: '#4a6cf7',
              color: '#fff',
              borderRadius: 8,
              border: 'none',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(74, 108, 247, 0.25)',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            <span>➕</span>
            <span>Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* ── Lista de Clientes (Modo Tarjetas en Móviles o Tabla Ajustada en Escritorio sin Scroll Horizontal) ── */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
          <p>Cargando información de clientes...</p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <h3 style={{ margin: '0 0 6px 0', color: '#1e293b' }}>No se encontraron clientes</h3>
          <p style={{ margin: 0, fontSize: 14 }}>
            {busqueda || filtroOrigen !== 'todos' ? 'No hay resultados que coincidan con el filtro seleccionado.' : 'Aún no hay clientes registrados en la base de datos.'}
          </p>
        </div>
      ) : isMobile ? (
        /* VISTA MÓVIL: Tarjetas adaptadas y táctiles */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {clientesFiltrados.map(c => {
            const linkWa = obtenerLinkWhatsapp(c.telefono);
            const numReservas = parseInt(c.total_reservas || 0);
            const esNuevoFormulario = Boolean(c.origen_formulario && c.revisado === false);

            return (
              <div 
                key={c.id} 
                style={{
                  background: esNuevoFormulario ? '#fffbeb' : '#fff',
                  borderRadius: 12,
                  padding: '1rem',
                  border: esNuevoFormulario ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}
              >
                {/* Indicador superior si es nuevo de formulario */}
                {esNuevoFormulario && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef3c7', padding: '5px 10px', borderRadius: 8, border: '1px solid #fde68a' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309' }}>
                      🆕 NUEVO REGISTRO POR FORMULARIO
                    </span>
                    <button
                      type="button"
                      onClick={() => marcarClienteRevisado(c, true)}
                      style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      ✓ Revisado
                    </button>
                  </div>
                )}

                {/* Cabecera de la tarjeta */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, paddingRight: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{c.nombre || 'Sin nombre registrado'}</span>
                      {c.origen_formulario && c.revisado !== false && (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 10, padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                          📝 Formulario
                        </span>
                      )}
                    </div>
                    {c.alias && (
                      <div style={{ color: '#4a6cf7', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                        🏷️ {c.alias}
                      </div>
                    )}
                  </div>

                  {numReservas > 0 ? (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <span style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        padding: '3px 8px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700
                      }}>
                        {numReservas} {numReservas === 1 ? 'reserva' : 'reservas'}
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginTop: 2 }}>
                        ${parseFloat(c.total_facturado || 0).toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>Sin reservas</span>
                  )}
                </div>

                {/* Datos rápidos del cliente */}
                <div style={{
                  background: '#f8fafc',
                  padding: '9px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6
                }}>
                  {c.cedula && (
                    <div>
                      <span style={{ color: '#64748b' }}>Cédula: </span>
                      <strong style={{ fontFamily: 'monospace' }}>{c.cedula}</strong>
                    </div>
                  )}

                  {c.telefono && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ color: '#64748b' }}>Teléfono: </span>
                        <strong>{c.telefono}</strong>
                      </div>
                      {linkWa && (
                        <a
                          href={linkWa}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            background: '#25D366',
                            color: '#fff',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11,
                            textDecoration: 'none',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          WhatsApp 💬
                        </a>
                      )}
                    </div>
                  )}

                  {c.direccion && (
                    <div style={{ color: '#334155' }}>
                      📍 {c.direccion}
                    </div>
                  )}

                  {c.notas && (
                    <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: 12 }}>
                      📝 {c.notas}
                    </div>
                  )}
                </div>

                {/* Acciones para móviles */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 36px', gap: 6, marginTop: 4 }}>
                  <button
                    onClick={() => navigate(`/catalogo?cliente_id=${c.id}`)}
                    style={{
                      background: '#ecfdf5',
                      border: '1px solid #a7f3d0',
                      color: '#065f46',
                      padding: '8px 4px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                    title="Crear nueva reserva para este cliente"
                  >
                    📅 Reserva
                  </button>

                  <button
                    onClick={() => abrirFichaCliente(c)}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      color: '#334155',
                      padding: '8px 4px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    👁️ Ver
                  </button>

                  <button
                    onClick={() => abrirEditar(c)}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1d4ed8',
                      padding: '8px 4px',
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => eliminarCliente(c)}
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      padding: '8px 0',
                      borderRadius: 6,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA ESCRITORIO: Tabla compacta 100% ajustada al ancho disponible sin desplazamiento horizontal */
        <div style={{
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          width: '100%'
        }}>
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                <th style={{ padding: '11px 12px', width: '25%' }}>Cliente / Cédula</th>
                <th style={{ padding: '11px 10px', width: '20%' }}>Contacto</th>
                <th style={{ padding: '11px 10px', width: '24%' }}>Dirección de Entrega</th>
                <th style={{ padding: '11px 8px', width: '11%', textAlign: 'center' }}>Reservas</th>
                <th style={{ padding: '11px 12px', width: '20%', textAlign: 'right' }}>Opciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c, index) => {
                const linkWa = obtenerLinkWhatsapp(c.telefono);
                const numReservas = parseInt(c.total_reservas || 0);
                const esNuevoFormulario = Boolean(c.origen_formulario && c.revisado === false);
                const bgBase = esNuevoFormulario ? '#fffbeb' : '#fff';

                return (
                  <tr 
                    key={c.id} 
                    style={{ 
                      background: bgBase,
                      borderBottom: index < clientesFiltrados.length - 1 ? '1px solid #f1f5f9' : 'none',
                      borderLeft: esNuevoFormulario ? '4px solid #ef4444' : '4px solid transparent',
                      transition: 'background 0.15s'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = esNuevoFormulario ? '#fef3c7' : '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = bgBase}
                  >
                    {/* Columna 1: Cliente, Alias, Cédula e Indicador de Formulario */}
                    <td style={{ padding: '10px 12px', verticalAlign: 'middle', wordBreak: 'break-word' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13.5 }}>
                          {c.nombre || 'Sin nombre'}
                        </span>
                        {esNuevoFormulario ? (
                          <span
                            title="Nuevo registro enviado desde el formulario público (Pendiente de revisar)"
                            style={{
                              background: '#ef4444',
                              color: '#fff',
                              fontSize: 10,
                              fontWeight: 800,
                              padding: '2px 7px',
                              borderRadius: 10,
                              letterSpacing: '0.02em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              boxShadow: '0 1px 4px rgba(239,68,68,0.35)'
                            }}
                          >
                            🆕 NUEVO · FORMULARIO
                          </span>
                        ) : c.origen_formulario ? (
                          <span
                            title="Cliente registrado a través del formulario público (Ya revisado)"
                            style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 8
                            }}
                          >
                            📝 Formulario
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 3 }}>
                        {c.alias && (
                          <span style={{ color: '#4a6cf7', fontSize: 11.5, fontWeight: 600 }}>
                            🏷️ {c.alias}
                          </span>
                        )}
                        {c.cedula && (
                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>
                            🆔 {c.cedula}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Columna 2: Contacto */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                      {c.telefono ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 12.5 }}>{c.telefono}</span>
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
                                width: 19,
                                height: 19,
                                fontSize: 10,
                                textDecoration: 'none',
                                flexShrink: 0
                              }}
                            >
                              💬
                            </a>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>Sin teléfono</span>
                      )}
                      {c.contacto2_nombre && (
                        <div style={{ fontSize: 11, color: '#475569', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`2do Contacto: ${c.contacto2_nombre} ${c.contacto2_telefono || ''}`}>
                          👥 {c.contacto2_nombre} {c.contacto2_telefono ? `(${c.contacto2_telefono})` : ''}
                        </div>
                      )}
                      {c.email && (
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.email}>
                          ✉️ {c.email}
                        </div>
                      )}
                    </td>

                    {/* Columna 3: Dirección y Notas (con ajuste de línea sin estirar la tabla) */}
                    <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                      {c.direccion ? (
                        <div 
                          style={{ 
                            color: '#334155', 
                            fontSize: 12,
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            wordBreak: 'break-word'
                          }}
                          title={c.direccion}
                        >
                          📍 {c.direccion}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>-</span>
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

                    {/* Columna 4: Reservas */}
                    <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                      {numReservas > 0 ? (
                        <div>
                          <span style={{
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            padding: '3px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 700,
                            display: 'inline-block'
                          }}>
                            {numReservas} {numReservas === 1 ? 'res.' : 'res.'}
                          </span>
                          <div style={{ fontSize: 11.5, color: '#059669', marginTop: 3, fontWeight: 700 }}>
                            ${parseFloat(c.total_facturado || 0).toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: 11.5 }}>0</span>
                      )}
                    </td>

                    {/* Columna 5: Opciones compactas siempre visibles */}
                    <td style={{ padding: '10px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
                        {esNuevoFormulario && (
                          <button
                            onClick={() => marcarClienteRevisado(c, true)}
                            title="Marcar nuevo registro de formulario como revisado"
                            style={{
                              background: '#16a34a',
                              border: 'none',
                              color: '#fff',
                              padding: '5px 8px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontSize: 11.5,
                              fontWeight: 700,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            ✓ Revisar
                          </button>
                        )}

                        <button
                          onClick={() => navigate(`/catalogo?cliente_id=${c.id}`)}
                          title="Crear una nueva reserva para este cliente"
                          style={{
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            color: '#065f46',
                            padding: '5px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 11.5,
                            fontWeight: 700,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          📅 Reserva
                        </button>

                        <button
                          onClick={() => abrirFichaCliente(c)}
                          title="Ver ficha completa del cliente y sus reservas"
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            color: '#334155',
                            padding: '5px 8px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 11.5,
                            fontWeight: 600,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          👁️ Ver
                        </button>

                        <button
                          onClick={() => abrirEditar(c)}
                          title="Editar datos del cliente"
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '5px 7px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12
                          }}
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => eliminarCliente(c)}
                          title="Eliminar cliente"
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#b91c1c',
                            padding: '5px 7px',
                            borderRadius: 6,
                            cursor: 'pointer',
                            fontSize: 12
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
          padding: isMobile ? '0.5rem' : '1.5rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: isMobile ? '96vw' : 850,
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden'
          }}>
            {/* Header Modal */}
            <div style={{
              padding: isMobile ? '1rem' : '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 18, color: '#1e293b' }}>
                    Ficha del Cliente
                  </h2>
                  {clienteSeleccionado.origen_formulario && (
                    <span style={{
                      background: clienteSeleccionado.revisado === false ? '#ef4444' : '#e0f2fe',
                      color: clienteSeleccionado.revisado === false ? '#fff' : '#0369a1',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 10
                    }}>
                      {clienteSeleccionado.revisado === false ? '🆕 Nuevo desde Formulario (Sin revisar)' : '📝 Registrado por Formulario (Revisado)'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13, color: '#4a6cf7', fontWeight: 600, marginTop: 2 }}>
                  {clienteSeleccionado.nombre || clienteSeleccionado.alias}
                  {clienteSeleccionado.alias && clienteSeleccionado.nombre && ` (${clienteSeleccionado.alias})`}
                </div>
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
            <div style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Banner de revisión dentro de la ficha si vino de formulario */}
              {clienteSeleccionado.origen_formulario && (
                <div style={{
                  background: clienteSeleccionado.revisado === false ? '#fff1f2' : '#f0fdf4',
                  border: `1px solid ${clienteSeleccionado.revisado === false ? '#fecdd3' : '#bbf7d0'}`,
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 10
                }}>
                  <div style={{ fontSize: 13, color: clienteSeleccionado.revisado === false ? '#991b1b' : '#166534' }}>
                    <strong>{clienteSeleccionado.revisado === false ? '🔔 Este cliente llenó el formulario público y está pendiente de revisión.' : '✓ Este registro de formulario ya fue revisado.'}</strong>
                    {clienteSeleccionado.fecha_formulario && (
                      <div style={{ fontSize: 11.5, marginTop: 2, opacity: 0.85 }}>
                        Enviado el: {new Date(clienteSeleccionado.fecha_formulario).toLocaleString('es-PA')}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => marcarClienteRevisado(clienteSeleccionado, clienteSeleccionado.revisado === false)}
                    style={{
                      background: clienteSeleccionado.revisado === false ? '#16a34a' : '#fff',
                      color: clienteSeleccionado.revisado === false ? '#fff' : '#475569',
                      border: clienteSeleccionado.revisado === false ? 'none' : '1px solid #cbd5e1',
                      borderRadius: 8,
                      padding: '8px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {clienteSeleccionado.revisado === false ? '✓ Marcar como Revisado' : 'Marcar como pendiente'}
                  </button>
                </div>
              )}

              {/* Bloque: Datos Personales Registrados */}
              <div style={{
                background: '#f8fafc',
                borderRadius: 10,
                padding: isMobile ? '1rem' : '1.25rem',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{ margin: '0 0 0.85rem 0', color: '#1e293b', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📋</span>
                  <span>Datos Registrados al Crear Reserva</span>
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
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

                  {clienteSeleccionado.email && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Correo Electrónico</label>
                      <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2 }}>
                        {clienteSeleccionado.email}
                      </div>
                    </div>
                  )}

                  {(clienteSeleccionado.contacto2_nombre || clienteSeleccionado.contacto2_telefono) && (
                    <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Segundo Contacto</label>
                      <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>👤 {clienteSeleccionado.contacto2_nombre || 'Sin nombre'}</span>
                        {clienteSeleccionado.contacto2_telefono && (
                          <>
                            <span>- 📞 {clienteSeleccionado.contacto2_telefono}</span>
                            {obtenerLinkWhatsapp(clienteSeleccionado.contacto2_telefono) && (
                              <a
                                href={obtenerLinkWhatsapp(clienteSeleccionado.contacto2_telefono)}
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
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dirección de Entrega</label>
                    <div style={{ fontSize: 14, color: '#1e293b', marginTop: 2 }}>
                      {clienteSeleccionado.direccion || '-'}
                    </div>
                  </div>

                  {clienteSeleccionado.notas && (
                    <div style={{ gridColumn: isMobile ? 'auto' : '1 / -1' }}>
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
                <h4 style={{ margin: '0 0 0.85rem 0', color: '#1e293b', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📦</span>
                    <span>Reservas y Artículos Alquilados ({clienteSeleccionado.reservas?.length || 0})</span>
                  </span>
                  {clienteSeleccionado.total_facturado && (
                    <span style={{ fontSize: 12, color: '#059669', fontWeight: 700 }}>
                      Total: ${parseFloat(clienteSeleccionado.total_facturado).toFixed(2)}
                    </span>
                  )}
                </h4>

                {!clienteSeleccionado.reservas || clienteSeleccionado.reservas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: 10, color: '#94a3b8', fontSize: 13 }}>
                    No hay reservas asociadas a este cliente.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {clienteSeleccionado.reservas.map(reserva => (
                      <div
                        key={reserva.id}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '0.85rem',
                          background: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>
                              Reserva #{reserva.id.slice(0, 8).toUpperCase()}
                            </span>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              📅 {reserva.fecha_inicio} al {reserva.fecha_fin}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {getEstadoBadge(reserva.estado)}
                            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>
                              ${parseFloat(reserva.total || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {reserva.direccion_entrega && reserva.direccion_entrega !== clienteSeleccionado.direccion && (
                          <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                            📍 <strong>Entrega:</strong> {reserva.direccion_entrega}
                          </div>
                        )}
                        {reserva.notas && (
                          <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 6 }}>
                            📝 {reserva.notas}
                          </div>
                        )}

                        {reserva.items && reserva.items.length > 0 && (
                          <div style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 10px', marginTop: 6 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
                              Artículos Alquilados
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              {reserva.items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155' }}>
                                  <span>
                                    • {item.nombre} <strong style={{ color: '#64748b' }}>×{item.cantidad}</strong>
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
              padding: '0.85rem 1rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: 'flex-end',
              gap: 8,
              background: '#f8fafc'
            }}>
              <button
                onClick={() => {
                  const cId = clienteSeleccionado.id;
                  setClienteSeleccionado(null);
                  navigate(`/catalogo?cliente_id=${cId}`);
                }}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                📅 Nueva Reserva
              </button>
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
                  padding: '9px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                ✏️ Editar Datos
              </button>
              <button
                onClick={() => setClienteSeleccionado(null)}
                style={{
                  background: '#fff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '9px 16px',
                  borderRadius: 6,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  width: isMobile ? '100%' : 'auto'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR O EDITAR CLIENTE (Totalmente responsivo) ── */}
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
          padding: isMobile ? '0.5rem' : '1.5rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: isMobile ? '96vw' : 600,
            width: '100%',
            maxHeight: '92vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: isMobile ? '1rem' : '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 17, color: '#1e293b' }}>
                {clienteEditando ? `Editar: ${clienteEditando.nombre || clienteEditando.alias}` : 'Nuevo Cliente'}
              </h2>
              <button
                onClick={() => { setClienteEditando(null); setModalNuevo(false); }}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={guardarEdicion} style={{ padding: isMobile ? '1rem' : '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
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
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Cédula / Documento (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.cedula}
                    onChange={e => setForm({ ...form, cedula: e.target.value })}
                    placeholder="Ej: 8-888-8888"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
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
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Segundo Contacto (Nombre)
                  </label>
                  <input
                    type="text"
                    value={form.contacto2_nombre}
                    onChange={e => setForm({ ...form, contacto2_nombre: e.target.value })}
                    placeholder="Ej: María Rodríguez"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Segundo Contacto (Teléfono/WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={form.contacto2_telefono}
                    onChange={e => setForm({ ...form, contacto2_telefono: e.target.value })}
                    placeholder="Ej: 6000-0000"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' }}
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
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, height: 70, resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              {clienteEditando && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <input
                    type="checkbox"
                    id="actualizar_reservas"
                    checked={form.actualizar_reservas}
                    onChange={e => setForm({ ...form, actualizar_reservas: e.target.checked })}
                    style={{ cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <label htmlFor="actualizar_reservas" style={{ fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                    Actualizar también estos datos en las reservas históricas de este cliente
                  </label>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'flex-end', gap: 8, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => { setClienteEditando(null); setModalNuevo(false); }}
                  style={{
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    padding: '10px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    width: isMobile ? '100%' : 'auto'
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
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: guardando ? 'not-allowed' : 'pointer',
                    opacity: guardando ? 0.7 : 1,
                    width: isMobile ? '100%' : 'auto'
                  }}
                >
                  {guardando ? 'Guardando...' : (clienteEditando ? 'Guardar Cambios' : 'Crear Cliente')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: COMPARTIR LINK PARA CLIENTES ── */}
      {modalCompartirLink && (
        <div 
          onClick={() => setModalCompartirLink(false)}
          style={{
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
            padding: '1rem'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 540,
              width: '100%',
              padding: isMobile ? '1.25rem' : '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
              border: '1px solid #e2e8f0'
            }}
          >
            {/* Cabecera */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20
                }}>
                  🔗
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b', fontWeight: 700 }}>
                    Formulario para Clientes
                  </h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
                    Enlace público para que el cliente ingrese sus datos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalCompartirLink(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 20,
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                ✕
              </button>
            </div>

            {/* Explicación */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '0.85rem 1rem',
              fontSize: 13,
              color: '#475569',
              lineHeight: 1.5,
              marginBottom: '1.25rem'
            }}>
              💡 <strong>¿Cómo funciona?</strong> Envía este enlace a tus clientes por WhatsApp o redes. Cuando ellos completen el formulario en su teléfono o computadora, se guardará directamente en tu base de datos de clientes listo para ser asociado a una reserva.
            </div>

            {/* Input con la URL */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Enlace directo al formulario:
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  readOnly
                  value={urlFormulario}
                  onClick={e => e.target.select()}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13,
                    background: '#f1f5f9',
                    color: '#334155',
                    outline: 'none',
                    fontWeight: 500
                  }}
                />
                <button
                  type="button"
                  onClick={copiarLinkPublico}
                  style={{
                    background: copiadoExito ? '#059669' : '#4a6cf7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '0 14px',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 0.2s'
                  }}
                >
                  {copiadoExito ? '✓ ¡Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Acciones principales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                onClick={compartirWhatsApp}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '12px',
                  background: '#25D366',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                <span>💬</span>
                <span>Enviar por WhatsApp</span>
              </button>

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <a
                  href={urlFormulario}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '10px',
                    background: '#fff',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                    textAlign: 'center'
                  }}
                >
                  <span>🌐</span>
                  <span>Ver Formulario</span>
                </a>
                <button
                  type="button"
                  onClick={() => setModalCompartirLink(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
