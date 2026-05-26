import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const estadoColor = { pendiente: '#f59e0b', confirmada: '#3b82f6', activa: '#22c55e', completada: '#6b7280', cancelada: '#ef4444' };

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [tab, setTab] = useState('dashboard');
  const [categorias, setCategorias] = useState([]);
  const [muebles, setMuebles] = useState([]);

  // Estados del formulario de mobiliario
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [precioDia, setPrecioDia] = useState('');
  const [precioSemana, setPrecioSemana] = useState('');
  const [precioMes, setPrecioMes] = useState('');
  const [stock, setStock] = useState('1');
  const [imagenes, setImagenes] = useState([]);
  const [nuevaImagenUrl, setNuevaImagenUrl] = useState('');
  const [loadingForm, setLoadingForm] = useState(false);

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/reservas-recientes').then(r => setReservas(r.data));
    api.get('/categorias')
      .then(r => setCategorias(r.data))
      .catch(err => console.error("Error cargando categorías:", err));
    api.get('/muebles')
      .then(r => setMuebles(r.data))
      .catch(err => console.error("Error cargando muebles:", err));
  }, []);

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
      toast.error('La URL de la imagen debe iniciar con http:// o https://');
      return;
    }
    setImagenes(prev => [...prev, nuevaImagenUrl.trim()]);
    setNuevaImagenUrl('');
  };

  const eliminarImagen = (index) => {
    setImagenes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return toast.error('El nombre es obligatorio');
    if (!categoriaId) return toast.error('La categoría es obligatoria');
    if (!precioDia || parseFloat(precioDia) <= 0) return toast.error('El precio por día debe ser mayor a 0');
    if (!stock || parseInt(stock) < 0) return toast.error('El stock no puede ser negativo');

    setLoadingForm(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria_id: parseInt(categoriaId),
        precio_dia: parseFloat(precioDia),
        precio_semana: precioSemana ? parseFloat(precioSemana) : null,
        precio_mes: precioMes ? parseFloat(precioMes) : null,
        stock: parseInt(stock),
        imagenes
      };

      const res = await api.post('/muebles', payload);
      toast.success(`Mueble "${res.data.nombre}" creado con éxito`);
      
      // Limpiar formulario
      setNombre('');
      setDescripcion('');
      setCategoriaId('');
      setPrecioDia('');
      setPrecioSemana('');
      setPrecioMes('');
      setStock('1');
      setImagenes([]);
      setNuevaImagenUrl('');
      
      // Refrescar estadísticas si es necesario
      api.get('/admin/stats').then(r => setStats(r.data));
      api.get('/muebles').then(r => setMuebles(r.data));
    } catch (error) {
      const msg = error.response?.data?.error || 'Error al guardar el mueble';
      toast.error(msg);
    } finally {
      setLoadingForm(false);
    }
  };

  const tabs = ['dashboard', 'reservas', 'mobiliario'];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
      <h1>Panel de administración</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: tab === t ? '#4a6cf7' : '#e8eaf6', color: tab === t ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>
            {t === 'dashboard' ? 'Resumen' : t === 'reservas' ? 'Reservas' : 'Mobiliario'}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Total reservas', value: stats.total_reservas, icon: '📋' },
            { label: 'Ingresos totales', value: `$${stats.ingresos_total?.toFixed(2)}`, icon: '💰' },
            { label: 'Muebles activos', value: stats.total_muebles, icon: '🪑' },
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

      {tab === 'reservas' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f8f9ff' }}>
                {['ID', 'Cliente', 'Fechas', 'Total', 'Estado', 'Acción'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #f0f0f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservas.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f8f8f8' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#888' }}>{r.id.slice(0,8).toUpperCase()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{r.nombre_cliente}</div>
                    <div style={{ color: '#888', fontSize: 12 }}>{r.email_cliente}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#666', fontSize: 13 }}>
                    {new Date(r.fecha_inicio).toLocaleDateString('es')} → {new Date(r.fecha_fin).toLocaleDateString('es')}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4a6cf7' }}>${r.total}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: estadoColor[r.estado] + '22', color: estadoColor[r.estado], padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{r.estado}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={r.estado}
                      onChange={e => cambiarEstado(r.id, e.target.value)}
                      style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, cursor: 'pointer' }}
                    >
                      {['pendiente', 'confirmada', 'activa', 'completada', 'cancelada'].map(e => (
                        <option key={e} value={e}>{e}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'mobiliario' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            {/* Columna Izquierda: Formulario */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>Agregar nuevo mueble</h3>
              
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Nombre del Mueble *</label>
                  <input
                    type="text"
                    placeholder="Ej. Silla Tiffany Dorada"
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Categoría *</label>
                    <select
                      value={categoriaId}
                      onChange={e => setCategoriaId(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, cursor: 'pointer', background: '#fff', boxSizing: 'border-box' }}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      {categorias.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Stock disponible *</label>
                    <input
                      type="number"
                      min="0"
                      value={stock}
                      onChange={e => setStock(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Precio / Día *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={precioDia}
                      onChange={e => setPrecioDia(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Precio / Sem.</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={precioSemana}
                      onChange={e => setPrecioSemana(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Precio / Mes</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={precioMes}
                      onChange={e => setPrecioMes(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Descripción</label>
                  <textarea
                    rows="3"
                    placeholder="Detalles sobre el mueble, material, dimensiones..."
                    value={descripcion}
                    onChange={e => setDescripcion(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, fontSize: 13, color: '#444' }}>Enlaces de Imágenes</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <input
                      type="text"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={nuevaImagenUrl}
                      onChange={e => setNuevaImagenUrl(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={agregarImagen}
                      style={{ padding: '10px 16px', background: '#e8eaf6', color: '#4a6cf7', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
                    >
                      + Añadir
                    </button>
                  </div>
                  
                  {/* Listado de imágenes agregadas */}
                  {imagenes.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', background: '#f8f9ff', padding: 8, borderRadius: 8, border: '1px dashed #cbd5e1' }}>
                      {imagenes.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 60, height: 60, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                          <img src={img} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => eliminarImagen(idx)}
                            style={{
                              position: 'absolute',
                              top: 2,
                              right: 2,
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: 16,
                              height: 16,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: 10,
                              padding: 0,
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loadingForm}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: loadingForm ? '#a5b4fc' : '#4a6cf7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: loadingForm ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 15,
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 10px rgba(74, 108, 247, 0.2)'
                  }}
                >
                  {loadingForm ? 'Guardando mueble...' : 'Guardar Mueble'}
                </button>
              </form>
            </div>

            {/* Columna Derecha: Previsualización */}
            <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem', width: '100%' }}>Previsualización en tiempo real</h3>
              
              <div style={{ width: '100%', maxWidth: 280, background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', border: '1px solid #eef2ff' }}>
                <div style={{ height: 180, background: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative' }}>
                  {imagenes[0] ? (
                    <img src={imagenes[0]} alt="Vista previa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    '🪑'
                  )}
                  {imagenes.length > 1 && (
                    <span style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600 }}>
                      +{imagenes.length - 1} fotos
                    </span>
                  )}
                </div>
                
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                    {categorias.find(c => c.id === parseInt(categoriaId))?.nombre || 'Categoría'}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 6, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {nombre || 'Nombre del Mueble'}
                  </div>
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 12, height: 36, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {descripcion || 'Aquí aparecerá la descripción detallada del mueble.'}
                  </div>
                  <div style={{ color: '#4a6cf7', fontWeight: 700, fontSize: '1.15rem', marginBottom: 4 }}>
                    ${precioDia ? parseFloat(precioDia).toFixed(2) : '0.00'}/día
                  </div>
                  {(precioSemana || precioMes) && (
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>
                      {precioSemana ? `$${parseFloat(precioSemana).toFixed(2)}/sem` : ''}
                      {precioSemana && precioMes ? ' · ' : ''}
                      {precioMes ? `$${parseFloat(precioMes).toFixed(2)}/mes` : ''}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: parseInt(stock) > 0 ? '#22c55e' : '#ef4444', fontWeight: 600, marginBottom: 12 }}>
                    Stock: {stock || 0} unidades
                  </div>
                  
                  <button
                    disabled
                    style={{
                      width: '100%',
                      background: '#4a6cf7',
                      opacity: 0.7,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px',
                      fontWeight: 600,
                      cursor: 'not-allowed',
                      fontSize: 13
                    }}
                  >
                    + Agregar al carrito
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de Muebles Existentes (para confirmación instantánea) */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1a1a2e', fontSize: '1.25rem', borderBottom: '2px solid #f0f0f0', paddingBottom: '0.5rem' }}>Muebles Registrados ({muebles.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f8f9ff', borderBottom: '1px solid #f0f0f0' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Imagen</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Nombre</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Categoría</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Precio/Día</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Stock</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#555' }}>Estado</th>
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
                      <td style={{ padding: '12px 16px', color: '#666' }}>{m.categoria_nombre}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4a6cf7' }}>${m.precio_dia}</td>
                      <td style={{ padding: '12px 16px', color: '#666' }}>{m.stock} uds</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: m.activo ? '#22c55e22' : '#ef444422', color: m.activo ? '#22c55e' : '#ef4444', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {m.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {muebles.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No hay muebles registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
