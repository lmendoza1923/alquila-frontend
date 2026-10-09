import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import api from '../api';

export default function SucursalesAdmin() {
  const [sucursales, setSucursales] = useState([]);
  const [muebles, setMuebles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-pestaña activa: 'sucursales' | 'planilla'
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
  const [modalInventarioSucursal, setModalInventarioSucursal] = useState(null); // { sucursal, mobiliario }
  const [busquedaModal, setBusquedaModal] = useState('');
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

  // Estado local para edición de planilla general
  // planillaValores: { [`${mueble_id}_${sucursal_id}`]: cantidad }
  const [planillaValores, setPlanillaValores] = useState({});
  const [planillaOriginal, setPlanillaOriginal] = useState({});
  const [busquedaPlanilla, setBusquedaPlanilla] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const [guardandoPlanilla, setGuardandoPlanilla] = useState(false);

  // ── Cargar Datos ────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resSuc, resMatriz] = await Promise.all([
        api.get('/sucursales'),
        api.get('/sucursales/distribucion/general')
      ]);

      setSucursales(resSuc.data || []);
      setMuebles(resMatriz.data.muebles || []);

      // Inicializar planilla de valores
      const valores = {};
      (resMatriz.data.muebles || []).forEach(m => {
        (resMatriz.data.sucursales || []).forEach(s => {
          valores[`${m.id}_${s.id}`] = m.distribucion[s.id] || 0;
        });
      });
      setPlanillaValores(valores);
      setPlanillaOriginal(valores);
    } catch (err) {
      console.error('Error cargando sucursales:', err);
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
    if (!window.confirm(`¿Estás seguro de eliminar la sucursal "${s.nombre}"?`)) {
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

  // ── Abrir modal de listado de mobiliario para una sucursal ───────────────
  const abrirInventarioSucursal = async (s) => {
    setBusquedaModal('');
    try {
      const res = await api.get(`/sucursales/${s.id}`);
      setModalInventarioSucursal(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar la lista de mobiliario de esta sucursal');
    }
  };

  // ── Guardar cantidades desde el modal de la sucursal ────────────────────
  const handleGuardarInventarioSucursal = async (e) => {
    e.preventDefault();
    if (!modalInventarioSucursal) return;

    setGuardando(true);
    try {
      const items = (modalInventarioSucursal.mobiliario || []).map(m => ({
        mueble_id: m.mueble_id,
        cantidad: Math.max(0, parseInt(m.cantidad) || 0)
      }));

      await api.put(`/sucursales/${modalInventarioSucursal.sucursal.id}/inventario`, { items });
      toast.success(`Cantidades actualizadas para ${modalInventarioSucursal.sucursal.nombre}`);
      setModalInventarioSucursal(null);
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar las cantidades');
    } finally {
      setGuardando(false);
    }
  };

  // ── Cambios en Planilla General ─────────────────────────────────────────
  const handleCambioPlanilla = (muebleId, sucursalId, valor) => {
    const num = Math.max(0, parseInt(valor) || 0);
    setPlanillaValores(prev => ({
      ...prev,
      [`${muebleId}_${sucursalId}`]: num
    }));
  };

  const hayCambiosPlanilla = useMemo(() => {
    return Object.keys(planillaValores).some(key => planillaValores[key] !== planillaOriginal[key]);
  }, [planillaValores, planillaOriginal]);

  const handleGuardarPlanilla = async () => {
    const cambios = [];
    Object.keys(planillaValores).forEach(key => {
      if (planillaValores[key] !== planillaOriginal[key]) {
        const [mueble_id, sucursal_id] = key.split('_');
        cambios.push({
          mueble_id,
          sucursal_id,
          cantidad: planillaValores[key]
        });
      }
    });

    if (!cambios.length) {
      toast('No hay cambios pendientes por guardar');
      return;
    }

    setGuardandoPlanilla(true);
    try {
      await api.post('/sucursales/distribucion/guardar', { cambios });
      toast.success(`Se guardaron las cantidades de ${cambios.length} registros`);
      cargarDatos();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Error al guardar los cambios');
    } finally {
      setGuardandoPlanilla(false);
    }
  };

  // Categorías únicas
  const categoriasUnicas = useMemo(() => {
    const setCats = new Set();
    muebles.forEach(m => {
      if (m.categoria_nombre) setCats.add(m.categoria_nombre);
    });
    return Array.from(setCats);
  }, [muebles]);

  // Mobiliario filtrado en la planilla general
  const mueblesFiltradosPlanilla = useMemo(() => {
    return muebles.filter(m => {
      const coincideBusqueda = !busquedaPlanilla.trim() || 
        m.nombre.toLowerCase().includes(busquedaPlanilla.toLowerCase()) ||
        m.categoria_nombre.toLowerCase().includes(busquedaPlanilla.toLowerCase());
      const coincideCat = filtroCategoria === 'todas' || m.categoria_nombre === filtroCategoria;
      return coincideBusqueda && coincideCat;
    });
  }, [muebles, busquedaPlanilla, filtroCategoria]);

  // Mobiliario filtrado en el modal de una sucursal específica
  const mobiliarioModalFiltrado = useMemo(() => {
    if (!modalInventarioSucursal?.mobiliario) return [];
    if (!busquedaModal.trim()) return modalInventarioSucursal.mobiliario;
    const q = busquedaModal.toLowerCase().trim();
    return modalInventarioSucursal.mobiliario.filter(m =>
      m.nombre.toLowerCase().includes(q) ||
      (m.categoria_nombre && m.categoria_nombre.toLowerCase().includes(q))
    );
  }, [modalInventarioSucursal, busquedaModal]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '1rem' : '1.5rem', color: '#1e293b' }}>
      
      {/* ── Cabecera Principal ── */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'flex-start' : 'center',
        gap: '1rem',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>🏢</span>
            <span>Sucursales</span>
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14 }}>
            Control visual de mobiliarios registrados en cada sucursal (no altera el stock de reservas)
          </p>
        </div>

        <button
          onClick={abrirNuevaSucursal}
          style={{
            width: isMobile ? '100%' : 'auto',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: '#4a6cf7',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '10px 18px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 6px rgba(74, 108, 247, 0.25)'
          }}
        >
          <span>➕</span>
          <span>Nueva Sucursal</span>
        </button>
      </div>

      {/* ── Barra de Navegación de Vistas ── */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '1.25rem'
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
          <span>Sucursales ({sucursales.length})</span>
        </button>

        <button
          onClick={() => setSubTab('planilla')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'planilla' ? '3px solid #4a6cf7' : '3px solid transparent',
            color: subTab === 'planilla' ? '#4a6cf7' : '#64748b',
            padding: '10px 16px',
            fontSize: 15,
            fontWeight: subTab === 'planilla' ? 700 : 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: -2
          }}
        >
          <span>📋</span>
          <span>Planilla General (Todos los Mobiliarios)</span>
          {hayCambiosPlanilla && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 700 }}>
              Sin guardar
            </span>
          )}
        </button>
      </div>

      {/* ── VISTA 1: TARJETAS DE SUCURSALES ── */}
      {subTab === 'sucursales' && (
        <div>
          {loading ? (
            <div style={{ background: '#fff', padding: '3rem', borderRadius: 12, textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontSize: 32 }}>⏳</div>
              <p>Cargando información de sucursales...</p>
            </div>
          ) : sucursales.length === 0 ? (
            <div style={{ background: '#fff', padding: '3.5rem 1.5rem', borderRadius: 12, textAlign: 'center', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>🏢</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>Aún no hay sucursales creadas</h3>
              <p style={{ color: '#64748b', maxWidth: 440, margin: '0 auto 1.5rem auto', fontSize: 14 }}>
                Crea tus sucursales para llevar el conteo visual de los mobiliarios que tienes en cada ubicación.
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
                + Crear Sucursal
              </button>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(340px, 1fr))',
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
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div style={{ height: 6, background: s.color || '#4a6cf7' }} />

                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h3 style={{ margin: 0, fontSize: 17, color: '#0f172a', fontWeight: 700 }}>
                            {s.nombre}
                          </h3>
                          {s.codigo && (
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                              Código: {s.codigo}
                            </span>
                          )}
                        </div>

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
                      </div>

                      {/* Info de contacto */}
                      <div style={{
                        background: '#f8fafc',
                        borderRadius: 8,
                        padding: '9px 12px',
                        fontSize: 13,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 5,
                        marginBottom: 12
                      }}>
                        {s.direccion ? (
                          <div style={{ color: '#334155' }}>
                            📍 {s.direccion}
                          </div>
                        ) : (
                          <div style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin dirección registrada</div>
                        )}

                        {s.encargado && (
                          <div style={{ color: '#334155' }}>
                            👤 Encargado: <strong>{s.encargado}</strong>
                          </div>
                        )}

                        {s.telefono && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>📞 {s.telefono}</div>
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

                      {/* Métricas simples de inventario en esta sucursal */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#f1f5f9',
                        padding: '10px 14px',
                        borderRadius: 8,
                        marginBottom: 14
                      }}>
                        <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                          Total Mobiliarios Registrados:
                        </span>
                        <span style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
                          {s.total_unidades} <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>piezas</span>
                        </span>
                      </div>

                      {/* Botones de acción */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                        <button
                          onClick={() => abrirInventarioSucursal(s)}
                          style={{
                            width: '100%',
                            background: '#4a6cf7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 12px',
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 6
                          }}
                        >
                          <span>📋</span>
                          <span>Ver y Editar Lista de Mobiliario</span>
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── VISTA 2: PLANILLA GENERAL (TODOS LOS MOBILIARIOS, SIN FOTOS) ── */}
      {subTab === 'planilla' && (
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
                value={busquedaPlanilla}
                onChange={e => setBusquedaPlanilla(e.target.value)}
                placeholder="🔍 Buscar mobiliario..."
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
              {hayCambiosPlanilla && (
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>
                  ⚠️ Cambios sin guardar
                </span>
              )}

              <button
                onClick={handleGuardarPlanilla}
                disabled={!hayCambiosPlanilla || guardandoPlanilla}
                style={{
                  background: hayCambiosPlanilla ? '#10b981' : '#94a3b8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: hayCambiosPlanilla ? 'pointer' : 'not-allowed',
                  boxShadow: hayCambiosPlanilla ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>💾</span>
                <span>{guardandoPlanilla ? 'Guardando...' : 'Guardar Cantidades'}</span>
              </button>
            </div>
          </div>

          {/* Tabla Limpia (solo texto y números) */}
          <div style={{ overflowX: 'auto', maxHeight: '72vh' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 14 }}>
              <thead style={{ background: '#f1f5f9', position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', minWidth: 260 }}>
                    Mobiliario
                  </th>
                  <th style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', minWidth: 140 }}>
                    Categoría
                  </th>
                  {sucursales.map(s => (
                    <th key={s.id} style={{ padding: '12px 14px', borderBottom: '2px solid #cbd5e1', textAlign: 'center', minWidth: 130 }}>
                      <div style={{ fontWeight: 700, color: '#1e293b' }}>{s.nombre}</div>
                      {s.codigo && <span style={{ fontSize: 11, color: '#64748b' }}>({s.codigo})</span>}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {mueblesFiltradosPlanilla.length === 0 ? (
                  <tr>
                    <td colSpan={sucursales.length + 2} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      No se encontraron mobiliarios con los filtros seleccionados
                    </td>
                  </tr>
                ) : (
                  mueblesFiltradosPlanilla.map((m, idx) => (
                    <tr 
                      key={m.id} 
                      style={{
                        background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                        borderBottom: '1px solid #e2e8f0'
                      }}
                    >
                      {/* Nombre del Mueble (Limpio, sin foto) */}
                      <td style={{ padding: '11px 14px', fontWeight: 600, color: '#1e293b' }}>
                        {m.nombre}
                      </td>

                      {/* Categoría */}
                      <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 13 }}>
                        {m.categoria_nombre}
                      </td>

                      {/* Input directo por Sucursal */}
                      {sucursales.map(s => {
                        const key = `${m.id}_${s.id}`;
                        const valor = planillaValores[key] !== undefined ? planillaValores[key] : 0;
                        const modificado = valor !== (planillaOriginal[key] || 0);

                        return (
                          <td key={s.id} style={{ padding: '8px 10px', textAlign: 'center' }}>
                            <input
                              type="number"
                              min="0"
                              value={valor}
                              onChange={e => handleCambioPlanilla(m.id, s.id, e.target.value)}
                              style={{
                                width: 78,
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: VER Y EDITAR LISTA DE MOBILIARIO DE UNA SUCURSAL ESPECÍFICA ── */}
      {modalInventarioSucursal && (
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
            maxWidth: 680,
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
                  📋 Mobiliarios en: {modalInventarioSucursal.sucursal.nombre}
                </h2>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  Define cuántas piezas de cada mobiliario tienes en esta sede
                </span>
              </div>
              <button
                onClick={() => setModalInventarioSucursal(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, color: '#64748b', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Buscador dentro del modal */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
              <input
                type="text"
                value={busquedaModal}
                onChange={e => setBusquedaModal(e.target.value)}
                placeholder="🔍 Filtrar por nombre de mobiliario..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            {/* Listado limpio de mobiliarios (solo texto y casilla de cantidad) */}
            <form onSubmit={handleGuardarInventarioSucursal} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '1rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {mobiliarioModalFiltrado.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    No se encontraron mobiliarios con ese nombre.
                  </div>
                ) : (
                  mobiliarioModalFiltrado.map((m) => {
                    const cant = parseInt(m.cantidad) || 0;
                    return (
                      <div
                        key={m.mueble_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          background: cant > 0 ? '#f0fdf4' : '#fff'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                            {m.nombre}
                          </div>
                          {m.categoria_nombre && (
                            <span style={{ fontSize: 12, color: '#64748b' }}>
                              {m.categoria_nombre}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>
                            Cantidad:
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={m.cantidad}
                            onChange={e => {
                              const val = Math.max(0, parseInt(e.target.value) || 0);
                              setModalInventarioSucursal(prev => ({
                                ...prev,
                                mobiliario: prev.mobiliario.map(it => it.mueble_id === m.mueble_id ? { ...it, cantidad: val } : it)
                              }));
                            }}
                            style={{
                              width: 80,
                              padding: '7px 8px',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              fontSize: 15,
                              fontWeight: 700,
                              textAlign: 'center',
                              outline: 'none',
                              background: '#fff'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div style={{ padding: '1rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setModalInventarioSucursal(null)}
                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  style={{ background: '#10b981', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  {guardando ? 'Guardando...' : 'Guardar Cantidades'}
                </button>
              </div>
            </form>
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
            maxWidth: 520,
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

    </div>
  );
}
