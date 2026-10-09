import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function SucursalesAdmin() {
  const [sucursales, setSucursales] = useState([]);
  const [muebles, setMuebles] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-pestaña activa: 'sucursales' | 'matriz' | 'transferencias'
  const [subTab, setSubTab] = useState('sucursales');

  // Detección móvil
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Modales
  const [modalSucursal, setModalSucursal] = useState(false);
  const [sucursalEditando, setSucursalEditando] = useState(null);
  const [modalTransferir, setModalTransferir] = useState(false);
  const [modalDetalleSucursal, setModalDetalleSucursal] = useState(null); // sucursal seleccionada con su inventario
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formulario de Sucursal
  const [formSucursal, setFormSucursal] = useState({
    nombre: '',
    codigo: '',
    direccion: '',
    telefono: '',
    encargado: '',
    email: '',
    color: '#4a6cf7',
    es_principal: false,
    activo: true
  });

  // Formulario de Transferencia
  const [formTransferencia, setFormTransferencia] = useState({
    mueble_id: '',
    origen_sucursal_id: '',
    destino_sucursal_id: '',
    cantidad: 1,
    motivo: ''
  });

  // Estado local para edición de matriz de distribución
  // matrizCambios: { [`${mueble_id}_${sucursal_id}`]: cantidad }
  const [matrizValores, setMatrizValores] = useState({});
  const [matrizOriginal, setMatrizOriginal] = useState({});
  const [busquedaMatriz, setBusquedaMatriz] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [guardandoMatriz, setGuardandoMatriz] = useState(false);

  // ── Cargar Datos ────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resSuc, resMatriz, resTrans] = await Promise.all([
        api.get('/sucursales'),
        api.get('/sucursales/distribucion/general'),
        api.get('/sucursales/transferencias')
      ]);

      setSucursales(resSuc.data);
      setMuebles(resMatriz.data.muebles || []);
      setTransferencias(resTrans.data || []);

      // Inicializar matriz de valores
      const valores = {};
      (resMatriz.data.muebles || []).forEach(m => {
        (resMatriz.data.sucursales || []).forEach(s => {
          valores[`${m.id}_${s.id}`] = m.distribucion[s.id] || 0;
        });
      });
      setMatrizValores(valores);
      setMatrizOriginal(valores);
    } catch (err) {
      console.error('Error cargando sucursales y distribución:', err);
      toast.error('Error al cargar la información de sucursales');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // ── Abrir Modal Crear Sucursal ──────────────────────────────────────────
  const abrirNuevaSucursal = () => {
    setSucursalEditando(null);
    setFormSucursal({
      nombre: '',
      codigo: `SUC-${String(sucursales.length + 1).padStart(2, '0')}`,
      direccion: '',
      telefono: '',
      encargado: '',
      email: '',
      color: '#4a6cf7',
      es_principal: sucursales.length === 0,
      activo: true
    });
    setModalSucursal(true);
  };

  // ── Abrir Modal Editar Sucursal ─────────────────────────────────────────
  const abrirEditarSucursal = (s) => {
    setSucursalEditando(s);
    setFormSucursal({
      nombre: s.nombre || '',
      codigo: s.codigo || '',
      direccion: s.direccion || '',
      telefono: s.telefono || '',
      encargado: s.encargado || '',
      email: s.email || '',
      color: s.color || '#4a6cf7',
      es_principal: Boolean(s.es_principal),
      activo: s.activo !== false
    });
    setModalSucursal(true);
  };

  // ── Guardar Sucursal (Crear o Editar) ───────────────────────────────────
  const handleGuardarSucursal = async (e) => {
    e.preventDefault();
    if (!formSucursal.nombre.trim()) {
      toast.error('El nombre de la sucursal es obligatorio');
      return;
    }

    setGuardando(true);
    try {
      if (sucursalEditando) {
        await api.put(`/sucursales/${sucursalEditando.id}`, formSucursal);
        toast.success('Sucursal actualizada con éxito');
      } else {
        await api.post('/sucursales', formSucursal);
        toast.success('Sucursal registrada con éxito');
      }
      setModalSucursal(false);
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al guardar la sucursal');
    } finally {
      setGuardando(false);
    }
  };

  // ── Eliminar Sucursal ───────────────────────────────────────────────────
  const handleEliminarSucursal = async (s) => {
    if (!window.confirm(`¿Estás seguro de eliminar la sucursal "${s.nombre}"? Si tiene mobiliario distribuido, sus asignaciones se desvincularán.`)) {
      return;
    }

    try {
      await api.delete(`/sucursales/${s.id}`);
      toast.success('Sucursal eliminada');
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al eliminar la sucursal');
    }
  };

  // ── Ver detalle e inventario de una sucursal ─────────────────────────────
  const abrirDetalleSucursal = async (s) => {
    setCargandoDetalle(true);
    try {
      const res = await api.get(`/sucursales/${s.id}`);
      setModalDetalleSucursal(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al obtener el mobiliario de esta sucursal');
    } finally {
      setCargandoDetalle(false);
    }
  };

  // ── Guardar inventario desde el modal de sucursal ────────────────────────
  const handleGuardarInventarioSucursal = async (e) => {
    e.preventDefault();
    if (!modalDetalleSucursal) return;

    setGuardando(true);
    try {
      const items = (modalDetalleSucursal.mobiliario || []).map(m => ({
        mueble_id: m.mueble_id,
        cantidad: parseInt(m.cantidad) || 0,
        notas: m.notas || ''
      }));

      await api.put(`/sucursales/${modalDetalleSucursal.sucursal.id}/inventario`, { items });
      toast.success('Inventario de la sucursal actualizado');
      setModalDetalleSucursal(null);
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar cambios de inventario');
    } finally {
      setGuardando(false);
    }
  };

  // ── Abrir Modal Transferencia ───────────────────────────────────────────
  const abrirTransferencia = (muebleId = '', origenId = '') => {
    setFormTransferencia({
      mueble_id: muebleId || (muebles[0]?.id || ''),
      origen_sucursal_id: origenId || (sucursales[0]?.id || ''),
      destino_sucursal_id: sucursales.find(s => s.id !== origenId)?.id || '',
      cantidad: 1,
      motivo: ''
    });
    setModalTransferir(true);
  };

  // ── Ejecutar Transferencia ──────────────────────────────────────────────
  const handleEjecutarTransferencia = async (e) => {
    e.preventDefault();
    if (!formTransferencia.mueble_id) {
      toast.error('Selecciona el mueble a transferir');
      return;
    }
    if (!formTransferencia.destino_sucursal_id) {
      toast.error('Selecciona la sucursal de destino');
      return;
    }
    if (formTransferencia.origen_sucursal_id === formTransferencia.destino_sucursal_id) {
      toast.error('La sucursal de origen y destino deben ser distintas');
      return;
    }
    if (!formTransferencia.cantidad || parseInt(formTransferencia.cantidad) <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/sucursales/transferir', formTransferencia);
      toast.success('¡Transferencia completada con éxito!');
      setModalTransferir(false);
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al ejecutar la transferencia');
    } finally {
      setGuardando(false);
    }
  };

  // ── Cambios en la Matriz ────────────────────────────────────────────────
  const handleCambioMatriz = (muebleId, sucursalId, valor) => {
    const num = Math.max(0, parseInt(valor) || 0);
    setMatrizValores(prev => ({
      ...prev,
      [`${muebleId}_${sucursalId}`]: num
    }));
  };

  const hayCambiosMatriz = useMemo(() => {
    return Object.keys(matrizValores).some(key => matrizValores[key] !== matrizOriginal[key]);
  }, [matrizValores, matrizOriginal]);

  const handleGuardarMatriz = async () => {
    const cambios = [];
    Object.keys(matrizValores).forEach(key => {
      if (matrizValores[key] !== matrizOriginal[key]) {
        const [mueble_id, sucursal_id] = key.split('_');
        cambios.push({
          mueble_id,
          sucursal_id,
          cantidad: matrizValores[key]
        });
      }
    });

    if (!cambios.length) {
      toast('No hay cambios pendientes por guardar');
      return;
    }

    setGuardandoMatriz(true);
    try {
      await api.post('/sucursales/distribucion/guardar', { cambios });
      toast.success(`Se actualizaron ${cambios.length} asignaciones de mobiliario`);
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al guardar la distribución');
    } finally {
      setGuardandoMatriz(false);
    }
  };

  // Categorías únicas para filtro de matriz
  const categoriasUnicas = useMemo(() => {
    const setCats = new Set();
    muebles.forEach(m => {
      if (m.categoria_nombre) setCats.add(m.categoria_nombre);
    });
    return Array.from(setCats);
  }, [muebles]);

  // Mobiliario filtrado en la matriz
  const mueblesFiltradosMatriz = useMemo(() => {
    return muebles.filter(m => {
      const coincideBusqueda = !busquedaMatriz.trim() || 
        m.nombre.toLowerCase().includes(busquedaMatriz.toLowerCase()) ||
        m.categoria_nombre.toLowerCase().includes(busquedaMatriz.toLowerCase());
      const coincideCat = filtroCategoria === 'todas' || m.categoria_nombre === filtroCategoria;
      return coincideBusqueda && coincideCat;
    });
  }, [muebles, busquedaMatriz, filtroCategoria]);

  // Métricas generales
  const totalUnidadesEmpresa = muebles.reduce((sum, m) => sum + (m.stock_total || 0), 0);
  const totalUnidadesAsignadas = sucursales.reduce((sum, s) => sum + (s.total_unidades || 0), 0);
  const sucursalesActivas = sucursales.filter(s => s.activo).length;

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem', color: '#1e293b' }}>
      
      {/* ── Cabecera Principal ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🏢</span>
            <span>Sucursales y Distribución</span>
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14 }}>
            Control de sedes y asignación del inventario de mobiliario por sucursal
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>
          <button
            onClick={() => abrirTransferencia()}
            disabled={sucursales.length < 2}
            title={sucursales.length < 2 ? 'Necesitas al menos 2 sucursales para transferir' : 'Mover mobiliario entre sedes'}
            style={{
              flex: isMobile ? 1 : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#0ea5e9',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              fontWeight: 600,
              cursor: sucursales.length < 2 ? 'not-allowed' : 'pointer',
              opacity: sucursales.length < 2 ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(14, 165, 233, 0.25)'
            }}
          >
            <span>🔄</span>
            <span>Transferir</span>
          </button>

          <button
            onClick={abrirNuevaSucursal}
            style={{
              flex: isMobile ? 1 : 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: '#4a6cf7',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 16px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(74, 108, 247, 0.25)'
            }}
          >
            <span>➕</span>
            <span>Nueva Sucursal</span>
          </button>
        </div>
      </div>

      {/* ── Tarjetas de Resumen / Métricas ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ background: '#fff', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Sucursales Activas</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', marginTop: 4 }}>
            {sucursalesActivas} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>/ {sucursales.length}</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Mobiliarios Distintos</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#4a6cf7', marginTop: 4 }}>
            {muebles.length} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>modelos</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Unidades Global</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#059669', marginTop: 4 }}>
            {totalUnidadesEmpresa} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>piezas</span>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '14px', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Distribuido en Sedes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#d97706', marginTop: 4 }}>
            {totalUnidadesAsignadas} <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>({totalUnidadesEmpresa > 0 ? Math.round((totalUnidadesAsignadas / totalUnidadesEmpresa) * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* ── Barra de Navegación de Sub-Pestañas ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.25rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setSubTab('sucursales')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'sucursales' ? '3px solid #4a6cf7' : '3px solid transparent',
            color: subTab === 'sucursales' ? '#4a6cf7' : '#64748b',
            padding: '10px 16px',
            fontSize: 15,
            fontWeight: subTab === 'sucursales' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <span>🏢</span>
          <span>Sedes y Sucursales ({sucursales.length})</span>
        </button>

        <button
          onClick={() => setSubTab('matriz')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'matriz' ? '3px solid #4a6cf7' : '3px solid transparent',
            color: subTab === 'matriz' ? '#4a6cf7' : '#64748b',
            padding: '10px 16px',
            fontSize: 15,
            fontWeight: subTab === 'matriz' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <span>📦</span>
          <span>Matriz de Distribución</span>
          {hayCambiosMatriz && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10 }}>
              Sin guardar
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('transferencias')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'transferencias' ? '3px solid #4a6cf7' : '3px solid transparent',
            color: subTab === 'transferencias' ? '#4a6cf7' : '#64748b',
            padding: '10px 16px',
            fontSize: 15,
            fontWeight: subTab === 'transferencias' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <span>🚚</span>
          <span>Historial de Traslados ({transferencias.length})</span>
        </button>
      </div>

      {/* ── CONTENIDO: SUB-PESTAÑA 1: SUCURSALES ── */}
      {subTab === 'sucursales' && (
        <div>
          {loading ? (
            <div style={{ background: '#fff', padding: '3rem', borderRadius: 12, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32 }}>⏳</div>
              <p>Cargando sucursales...</p>
            </div>
          ) : sucursales.length === 0 ? (
            <div style={{ background: '#fff', padding: '3.5rem 1.5rem', borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🏢</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>No hay sucursales registradas</h3>
              <p style={{ color: '#64748b', maxWidth: 440, margin: '0 auto 1.5rem auto', fontSize: 14 }}>
                Crea tus sucursales para comenzar a organizar y distribuir el stock de sillas, mesas y toldos entre tus diferentes sedes o bodegas.
              </p>
              <button
                onClick={abrirNuevaSucursal}
                style={{
                  background: '#4a6cf7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                + Registrar Primera Sucursal
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1rem'
            }}>
              {sucursales.map(s => {
                const linkWa = s.telefono ? s.telefono.replace(/[^0-9]/g, '') : null;
                return (
                  <div
                    key={s.id}
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      border: s.es_principal ? '2px solid #4a6cf7' : '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    {/* Barra de color de la sucursal */}
                    <div style={{ height: 6, background: s.color || '#4a6cf7' }} />

                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Cabecera de la tarjeta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 700 }}>
                              {s.nombre}
                            </h3>
                          </div>
                          {s.codigo && (
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                              Código: {s.codigo}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          {s.es_principal && (
                            <span style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 12,
                              border: '1px solid #bfdbfe'
                            }}>
                              ⭐ Principal
                            </span>
                          )}
                          {!s.activo && (
                            <span style={{
                              background: '#fef2f2',
                              color: '#b91c1c',
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 12
                            }}>
                              Inactiva
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Detalles de contacto y ubicación */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 13,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        marginBottom: 12
                      }}>
                        {s.direccion ? (
                          <div style={{ color: '#334155' }}>
                            📍 <strong>Dirección:</strong> {s.direccion}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin dirección registrada</div>
                        )}

                        {s.encargado && (
                          <div style={{ color: '#334155' }}>
                            👤 <strong>Encargado:</strong> {s.encargado}
                          </div>
                        )}

                        {s.telefono && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              📞 <strong>Tel:</strong> {s.telefono}
                            </div>
                            {linkWa && (
                              <a
                                href={`https://wa.me/${linkWa.length === 8 ? '507' + linkWa : linkWa}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  background: '#25D366',
                                  color: '#fff',
                                  padding: '2px 8px',
                                  borderRadius: 4,
                                  fontSize: 11,
                                  textDecoration: 'none',
                                  fontWeight: 600
                                }}
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Resumen de Inventario asignado */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 8,
                        padding: '10px 0',
                        borderTop: '1px solid #f1f5f9',
                        borderBottom: '1px solid #f1f5f9',
                        marginBottom: 12,
                        textAlign: 'center'
                      }}>
                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Modelos Asignados</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#4a6cf7', marginTop: 2 }}>
                            {s.total_items}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Unidades en Sede</div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669', marginTop: 2 }}>
                            {s.total_unidades}
                          </div>
                        </div>
                      </div>

                      {/* Botones de acción */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 'auto' }}>
                        <button
                          onClick={() => abrirDetalleSucursal(s)}
                          style={{
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            borderRadius: 6,
                            padding: '8px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          <span>📦</span>
                          <span>Ver Mobiliario</span>
                        </button>

                        <button
                          onClick={() => abrirTransferencia('', s.id)}
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            color: '#15803d',
                            borderRadius: 6,
                            padding: '8px 10px',
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4
                          }}
                        >
                          <span>🔄</span>
                          <span>Transferir de aquí</span>
                        </button>

                        <button
                          onClick={() => abrirEditarSucursal(s)}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            color: '#475569',
                            borderRadius: 6,
                            padding: '7px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ Editar
                        </button>

                        <button
                          onClick={() => handleEliminarSucursal(s)}
                          style={{
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            borderRadius: 6,
                            padding: '7px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CONTENIDO: SUB-PESTAÑA 2: MATRIZ DE DISTRIBUCIÓN ── */}
      {subTab === 'matriz' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          
          {/* Barra de filtros y botón de guardar */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 12,
            justifyContent: 'space-between',
            alignItems: isMobile ? 'stretch' : 'center'
          }}>
            <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={busquedaMatriz}
                onChange={e => setBusquedaMatriz(e.target.value)}
                placeholder="🔍 Buscar mueble o categoría..."
                style={{
                  flex: isMobile ? '1 1 100%' : '1 1 240px',
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  outline: 'none',
                  background: '#fff'
                }}
              />

              <select
                value={filtroCategoria}
                onChange={e => setFiltroCategoria(e.target.value)}
                style={{
                  padding: '9px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  background: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="todas">Todas las categorías</option>
                {categoriasUnicas.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hayCambiosMatriz && (
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  ⚠️ Tienes cambios sin guardar
                </span>
              )}

              <button
                onClick={handleGuardarMatriz}
                disabled={!hayCambiosMatriz || guardandoMatriz}
                style={{
                  background: hayCambiosMatriz ? '#10b981' : '#94a3b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: hayCambiosMatriz ? 'pointer' : 'not-allowed',
                  boxShadow: hayCambiosMatriz ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>💾</span>
                <span>{guardandoMatriz ? 'Guardando...' : 'Guardar Distribución'}</span>
              </button>
            </div>
          </div>

          {/* Tabla de Matriz */}
          <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', minWidth: 220 }}>
                    Mobiliario
                  </th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', minWidth: 100 }}>
                    Stock General
                  </th>
                  {sucursales.map(s => (
                    <th key={s.id} style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', minWidth: 140 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color || '#4a6cf7' }} />
                        <span style={{ fontWeight: 700, color: '#1e293b' }}>{s.nombre}</span>
                      </div>
                      {s.codigo && <span style={{ fontSize: 11, color: '#64748b' }}>({s.codigo})</span>}
                    </th>
                  ))}
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', minWidth: 110 }}>
                    Total Asignado
                  </th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', minWidth: 110 }}>
                    Sin Asignar
                  </th>
                </tr>
              </thead>

              <tbody>
                {mueblesFiltradosMatriz.length === 0 ? (
                  <tr>
                    <td colSpan={sucursales.length + 4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No se encontraron mobiliarios con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  mueblesFiltradosMatriz.map((m, idx) => {
                    // Calcular suma asignada en vivo desde matrizValores
                    let sumaAsignadaVivo = 0;
                    sucursales.forEach(s => {
                      sumaAsignadaVivo += matrizValores[`${m.id}_${s.id}`] || 0;
                    });
                    const sinAsignarVivo = m.stock_total - sumaAsignadaVivo;
                    const esSobreasignado = sinAsignarVivo < 0;

                    return (
                      <tr 
                        key={m.id} 
                        style={{
                          background: idx % 2 === 0 ? '#fff' : '#fcfcfd',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        {/* Nombre e Imagen del Mueble */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {m.imagenes && m.imagenes.length > 0 ? (
                              <img 
                                src={m.imagenes[0]} 
                                alt={m.nombre} 
                                style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', border: '1px solid #e2e8f0' }} 
                              />
                            ) : (
                              <div style={{ width: 38, height: 38, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                🪑
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 700, color: '#1e293b' }}>{m.nombre}</div>
                              <span style={{ fontSize: 12, color: '#64748b' }}>{m.categoria_nombre}</span>
                            </div>
                          </div>
                        </td>

                        {/* Stock Total General */}
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#334155' }}>
                          {m.stock_total}
                        </td>

                        {/* Inputs por Sucursal */}
                        {sucursales.map(s => {
                          const key = `${m.id}_${s.id}`;
                          const valor = matrizValores[key] !== undefined ? matrizValores[key] : 0;
                          const modificado = valor !== (matrizOriginal[key] || 0);

                          return (
                            <td key={s.id} style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <input
                                type="number"
                                min="0"
                                value={valor}
                                onChange={e => handleCambioMatriz(m.id, s.id, e.target.value)}
                                style={{
                                  width: 76,
                                  padding: '6px 8px',
                                  borderRadius: 6,
                                  border: modificado ? '2px solid #3b82f6' : '1px solid #cbd5e1',
                                  background: modificado ? '#eff6ff' : '#fff',
                                  textAlign: 'center',
                                  fontSize: 14,
                                  fontWeight: 700,
                                  outline: 'none'
                                }}
                              />
                            </td>
                          );
                        })}

                        {/* Total Asignado */}
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                          {sumaAsignadaVivo}
                        </td>

                        {/* Sin Asignar / Estado */}
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 700,
                            background: esSobreasignado ? '#fef2f2' : sinAsignarVivo === 0 ? '#f0fdf4' : '#eff6ff',
                            color: esSobreasignado ? '#dc2626' : sinAsignarVivo === 0 ? '#16a34a' : '#2563eb',
                            border: esSobreasignado ? '1px solid #fecaca' : 'none'
                          }}>
                            {esSobreasignado ? `Exceso (${Math.abs(sinAsignarVivo)})` : sinAsignarVivo}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CONTENIDO: SUB-PESTAÑA 3: HISTORIAL DE TRANSFERENCIAS ── */}
      {subTab === 'transferencias' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Registro Cronológico de Movimientos</h3>
              <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: 13 }}>
                Historial de traslados de mobiliario realizados entre sucursales
              </p>
            </div>
            <button
              onClick={() => abrirTransferencia()}
              disabled={sucursales.length < 2}
              style={{
                background: '#0ea5e9',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '9px 14px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              🔄 Nueva Transferencia
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600 }}>Fecha y Hora</th>
                  <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600 }}>Mobiliario</th>
                  <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600 }}>Origen</th>
                  <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600 }}>Destino</th>
                  <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600, textAlign: 'center' }}>Cantidad</th>
                  <th style={{ padding: '12px 14px', color: '#64748b', fontWeight: 600 }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      Aún no se han registrado movimientos o transferencias de mobiliario.
                    </td>
                  </tr>
                ) : (
                  transferencias.map(t => {
                    const f = new Date(t.fecha);
                    const fechaFmt = isNaN(f.getTime()) ? t.fecha : `${f.toLocaleDateString('es-PA')} ${f.toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' })}`;

                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', color: '#475569', fontSize: 13 }}>
                          {fechaFmt}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, color: '#1e293b' }}>
                          🪑 {t.mueble_nombre || 'Mueble no especificado'}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                            {t.origen_nombre}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                            {t.destino_nombre}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: 15, color: '#0ea5e9' }}>
                          {t.cantidad}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>
                          {t.motivo || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: CREAR / EDITAR SUCURSAL ── */}
      {modalSucursal && (
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
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: 540,
            width: '100%',
            maxHeight: '90vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <h2 style={{ margin: 0, fontSize: 17, color: '#1e293b' }}>
                {sucursalEditando ? `Editar Sucursal: ${sucursalEditando.nombre}` : 'Registrar Nueva Sucursal'}
              </h2>
              <button
                onClick={() => setModalSucursal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarSucursal} style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Nombre de la Sucursal / Sede *
                  </label>
                  <input
                    type="text"
                    value={formSucursal.nombre}
                    onChange={e => setFormSucursal({ ...formSucursal, nombre: e.target.value })}
                    placeholder="Ej: Sucursal Central / Bodega Este"
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Código
                  </label>
                  <input
                    type="text"
                    value={formSucursal.codigo}
                    onChange={e => setFormSucursal({ ...formSucursal, codigo: e.target.value })}
                    placeholder="SUC-01"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Dirección Física
                </label>
                <input
                  type="text"
                  value={formSucursal.direccion}
                  onChange={e => setFormSucursal({ ...formSucursal, direccion: e.target.value })}
                  placeholder="Calle, edificio, barriada o punto de referencia"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formSucursal.telefono}
                    onChange={e => setFormSucursal({ ...formSucursal, telefono: e.target.value })}
                    placeholder="Ej: 6000-0000"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Encargado / Responsable
                  </label>
                  <input
                    type="text"
                    value={formSucursal.encargado}
                    onChange={e => setFormSucursal({ ...formSucursal, encargado: e.target.value })}
                    placeholder="Ej: Carlos Méndez"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Correo Electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    value={formSucursal.email}
                    onChange={e => setFormSucursal({ ...formSucursal, email: e.target.value })}
                    placeholder="sucursal@empresa.com"
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Color de Distintivo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={formSucursal.color}
                      onChange={e => setFormSucursal({ ...formSucursal, color: e.target.value })}
                      style={{ width: 44, height: 40, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 0 }}
                    />
                    <span style={{ fontSize: 12, color: '#64748b' }}>{formSucursal.color}</span>
                  </div>
                </div>
              </div>

              {/* Opciones booleanas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={formSucursal.es_principal}
                    onChange={e => setFormSucursal({ ...formSucursal, es_principal: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Establecer como Sucursal Principal / Bodega Central</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={formSucursal.activo}
                    onChange={e => setFormSucursal({ ...formSucursal, activo: e.target.checked })}
                    style={{ width: 16, height: 16 }}
                  />
                  <span>Sucursal Activa (habilitada para asignaciones)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setModalSucursal(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ background: '#4a6cf7', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {guardando ? 'Guardando...' : (sucursalEditando ? 'Actualizar Sucursal' : 'Guardar Sucursal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DETALLE Y AJUSTE DE INVENTARIO DE UNA SUCURSAL ── */}
      {modalDetalleSucursal && (
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
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: 720,
            width: '100%',
            maxHeight: '90vh',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: '#1e293b' }}>
                  📦 Mobiliario en: {modalDetalleSucursal.sucursal.nombre}
                </h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Ajusta la cantidad de cada modelo ubicada físicamente en esta sede
                </span>
              </div>
              <button
                onClick={() => setModalDetalleSucursal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarInventarioSucursal} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {modalDetalleSucursal.mobiliario.map((m, idx) => (
                  <div
                    key={m.mueble_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      background: (parseInt(m.cantidad) || 0) > 0 ? '#f0fdf4' : '#fff'
                    }}
                  >
                    {m.imagenes && m.imagenes.length > 0 ? (
                      <img src={m.imagenes[0]} alt={m.nombre} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 44, height: 44, borderRadius: 6, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                        🪑
                      </div>
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{m.nombre}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        {m.categoria_nombre} • Stock Total Empresa: <strong>{m.stock_total}</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>En esta sede:</label>
                      <input
                        type="number"
                        min="0"
                        value={m.cantidad}
                        onChange={e => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setModalDetalleSucursal(prev => ({
                            ...prev,
                            mobiliario: prev.mobiliario.map((it, i) => i === idx ? { ...it, cantidad: val } : it)
                          }));
                        }}
                        style={{
                          width: 80,
                          padding: '6px 8px',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setModalDetalleSucursal(null)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {guardando ? 'Guardando...' : 'Guardar Cantidades en esta Sede'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: TRANSFERIR MOBILIARIO ENTRE SUCURSALES ── */}
      {modalTransferir && (
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
          padding: '1rem'
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 14,
            maxWidth: 520,
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.25rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, color: '#1e293b' }}>
                  🔄 Transferir Mobiliario entre Sedes
                </h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Mover artículos de una sucursal a otra
                </span>
              </div>
              <button
                onClick={() => setModalTransferir(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEjecutarTransferencia} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Mobiliario a Mover *
                </label>
                <select
                  value={formTransferencia.mueble_id}
                  onChange={e => setFormTransferencia({ ...formTransferencia, mueble_id: e.target.value })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                >
                  {muebles.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombre} (Stock Total: {m.stock_total})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Sucursal de Origen (Sale de) *
                  </label>
                  <select
                    value={formTransferencia.origen_sucursal_id}
                    onChange={e => setFormTransferencia({ ...formTransferencia, origen_sucursal_id: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    <option value="">-- Sin sede / Bodega Externa --</option>
                    {sucursales.map(s => {
                      const cantDisponible = matrizValores[`${formTransferencia.mueble_id}_${s.id}`] || 0;
                      return (
                        <option key={s.id} value={s.id}>
                          {s.nombre} ({cantDisponible} disp.)
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                    Sucursal de Destino (Entra a) *
                  </label>
                  <select
                    value={formTransferencia.destino_sucursal_id}
                    onChange={e => setFormTransferencia({ ...formTransferencia, destino_sucursal_id: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, background: '#fff' }}
                  >
                    <option value="">-- Seleccionar Destino --</option>
                    {sucursales.filter(s => s.id !== formTransferencia.origen_sucursal_id).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Cantidad de Unidades a Transferir *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formTransferencia.cantidad}
                  onChange={e => setFormTransferencia({ ...formTransferencia, cantidad: parseInt(e.target.value) || 1 })}
                  required
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 15, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                  Motivo o Razón del Traslado
                </label>
                <input
                  type="text"
                  value={formTransferencia.motivo}
                  onChange={e => setFormTransferencia({ ...formTransferencia, motivo: e.target.value })}
                  placeholder="Ej: Reabastecimiento para evento de fin de semana"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setModalTransferir(false)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ background: '#0ea5e9', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {guardando ? 'Transfiriendo...' : 'Confirmar Traslado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
