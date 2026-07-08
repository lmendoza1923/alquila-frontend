import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const s = {
  page: { maxWidth: 1200, margin: '0 auto', padding: '2rem' },
  filtros: { display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' },
  input: { padding: '8px 12px', border: '1px solid #ddd', borderRadius: '8px', fontSize: '14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' },
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform .2s', display: 'flex', flexDirection: 'column' },
  imgBox: { height: 180, background: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, position: 'relative' },
  body: { padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
  nombre: { fontWeight: 600, fontSize: '1.05rem', marginBottom: 4, color: '#1a1a2e' },
  precio: { color: '#4a6cf7', fontWeight: 700, fontSize: '1.15rem' },
  btn: { width: '100%', marginTop: '0.75rem', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontWeight: 600 },
  tabBtn: (active) => ({ padding: '10px 24px', borderRadius: 8, border: 'none', background: active ? '#4a6cf7' : '#e8eaf6', color: active ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 }),
  label: { fontSize: 11, color: '#666', marginBottom: 3, display: 'block' }
};

export default function Catalogo() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const navigate = useNavigate();

  const [muebles, setMuebles] = useState([]);
  const [combos, setCombos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState('muebles'); // 'muebles' o 'combos'
  const [loading, setLoading] = useState(true);

  // Cart Context hooks
  const { 
    agregar, 
    items, 
    actualizar, 
    quitar, 
    calcularTotal, 
    diasSeleccionados, 
    vaciar, 
    fechas, 
    setFechas 
  } = useCart();

  // Checkout states for Admin
  const [form, setForm] = useState({ alias: '', nombre: '', telefono: '', direccion: '', notas: '' });
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [requiereTransporte, setRequiereTransporte] = useState(false);
  const [costoTransporte, setCostoTransporte] = useState('');
  const [requiereDecoracion, setRequiereDecoracion] = useState(false);
  const [costoDecoracion, setCostoDecoracion] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const agregarFilaServicio = () => {
    setServicios(prev => [...prev, { id: Date.now() + Math.random(), nombre: '', cantidad: 1, precio_unitario: '' }]);
  };

  const actualizarServicio = (id, campo, valor) => {
    setServicios(prev => prev.map(s => s.id === id ? { ...s, [campo]: valor } : s));
  };

  const eliminarFilaServicio = (id) => {
    setServicios(prev => prev.filter(s => s.id !== id));
  };

  const totalTransporte = requiereTransporte ? parseFloat(costoTransporte || 0) : 0;
  const totalDecoracion = requiereDecoracion ? parseFloat(costoDecoracion || 0) : 0;
  const totalServicios = servicios.reduce((sum, s) => sum + (parseFloat(s.precio_unitario || 0) * (parseInt(s.cantidad) || 1)), 0);
  const totalReserva = parseFloat(calcularTotal()) + totalServicios + totalTransporte + totalDecoracion;

  const confirmarReservaAdmin = async () => {
    if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona fechas en el calendario primero'); return; }
    if (!items.length) { toast.error('Agrega al menos un artículo a la reserva'); return; }

    setLoadingCheckout(true);
    try {
      const itemsPayload = [
        ...items.map(i => ({ 
          mueble_id: i.esCombo ? null : i.mueble_id, 
          combo_id: i.esCombo ? i.combo_id : null, 
          cantidad: i.cantidad 
        })),
        ...servicios.filter(s => s.nombre.trim() !== '').map(s => ({
          nombre: s.nombre.trim(),
          cantidad: parseInt(s.cantidad) || 1,
          precio_unitario: parseFloat(s.precio_unitario) || 0
        }))
      ];

      if (requiereTransporte) {
        itemsPayload.push({
          nombre: 'Transporte',
          cantidad: 1,
          precio_unitario: parseFloat(costoTransporte) || 0
        });
      }

      if (requiereDecoracion) {
        itemsPayload.push({
          nombre: 'Decoración',
          cantidad: 1,
          precio_unitario: parseFloat(costoDecoracion) || 0
        });
      }

      const { data } = await api.post('/reservas', {
        fecha_inicio: fechas.inicio.toISOString().split('T')[0],
        fecha_fin: fechas.fin.toISOString().split('T')[0],
        alias_cliente: form.alias || null,
        nombre_cliente: form.nombre || null,
        email_cliente: null,
        telefono_cliente: form.telefono || null,
        direccion_entrega: form.direccion || null,
        notas: form.notas,
        items: itemsPayload
      });
      vaciar();
      setServicios([]);
      setRequiereTransporte(false);
      setCostoTransporte('');
      setRequiereDecoracion(false);
      setCostoDecoracion('');
      setForm({ alias: '', nombre: '', telefono: '', direccion: '', notas: '' });
      toast.success('Reserva creada exitosamente');
      navigate(`/confirmacion/${data.reserva.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear la reserva');
    } finally {
      setLoadingCheckout(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const cargar = async (bus = '') => {
    setLoading(true);
    try {
      const params = {};
      if (bus) params.busqueda = bus;
      
      const [mueblesRes, combosRes] = await Promise.all([
        api.get('/muebles', { params }),
        api.get('/combos')
      ]);

      setMuebles(mueblesRes.data);
      if (bus) {
        setCombos(combosRes.data.filter(c => c.nombre.toLowerCase().includes(bus.toLowerCase())));
      } else {
        setCombos(combosRes.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const filtrar = (e) => {
    e.preventDefault();
    cargar(busqueda);
  };

  const calcularStockCombo = (combo) => {
    if (!combo.items || combo.items.length === 0) return 0;
    let minStock = Infinity;
    for (const item of combo.items) {
      const cant = Math.floor(item.stock / item.cantidad);
      if (cant < minStock) {
        minStock = cant;
      }
    }
    return minStock === Infinity ? 0 : minStock;
  };

  // Estilos adaptables para vista compacta de Admin
  const gridStyle = isAdmin 
    ? { ...s.grid, gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' } 
    : s.grid;
    
  const cardStyle = isAdmin 
    ? { ...s.card, fontSize: '13px' } 
    : s.card;
    
  const imgBoxStyle = isAdmin 
    ? { ...s.imgBox, height: 100, fontSize: 32 } 
    : s.imgBox;
    
  const bodyStyle = isAdmin 
    ? { ...s.body, padding: '0.75rem' } 
    : s.body;
    
  const nombreStyle = isAdmin 
    ? { ...s.nombre, fontSize: '0.95rem' } 
    : s.nombre;
    
  const precioStyle = isAdmin 
    ? { ...s.precio, fontSize: '1rem' } 
    : s.precio;
    
  const btnStyle = isAdmin 
    ? { ...s.btn, padding: '6px', fontSize: '12px', marginTop: '0.5rem' } 
    : s.btn;

  return (
    <div style={{ ...s.page, maxWidth: isAdmin ? 1450 : 1200 }}>
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Catálogo */}
        <div style={{ flex: isAdmin ? 2 : 1, minWidth: 320, width: '100%' }}>
          <h1 style={{ marginBottom: '0.25rem' }}>Catálogo de mobiliario</h1>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>Selecciona tus fechas y agrega muebles o combos al carrito</p>

          {/* Rango de fechas */}
          <div style={{ background: '#eef2ff', borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Fecha de inicio</div>
              <DatePicker
                selected={fechas.inicio}
                onChange={d => setFechas(f => ({ ...f, inicio: d }))}
                minDate={new Date()}
                placeholderText="Seleccionar"
                dateFormat="dd/MM/yyyy"
                className="dp-input"
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Fecha de fin</div>
              <DatePicker
                selected={fechas.fin}
                onChange={d => setFechas(f => ({ ...f, fin: d }))}
                minDate={fechas.inicio || new Date()}
                placeholderText="Seleccionar"
                dateFormat="dd/MM/yyyy"
                className="dp-input"
              />
            </div>
            {fechas.inicio && fechas.fin && (
              <div style={{ background: '#4a6cf7', color: '#fff', borderRadius: 8, padding: '6px 16px', fontWeight: 600 }}>
                {Math.ceil((fechas.fin - fechas.inicio) / 86400000) + 1} días
              </div>
            )}
          </div>

          {/* Selector de Vistas / Pestañas */}
          <div style={{ display: 'flex', gap: 10, marginBottom: '1.5rem' }}>
            <button style={s.tabBtn(vista === 'muebles')} onClick={() => setVista('muebles')}>🪑 Muebles Individuales</button>
            <button style={s.tabBtn(vista === 'combos')} onClick={() => setVista('combos')}>🎁 Paquetes y Combos</button>
          </div>

          {/* Buscador */}
          <form onSubmit={filtrar} style={s.filtros}>
            <input style={s.input} placeholder={vista === 'muebles' ? "Buscar mueble..." : "Buscar combo..."} value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            <button type="submit" style={{ ...s.btn, width: 'auto', padding: '8px 20px', marginTop: 0 }}>Buscar</button>
          </form>

          {loading ? (
            <p style={{ color: '#999', textAlign: 'center', padding: '3rem' }}>Cargando catálogo...</p>
          ) : (
            <>
              {vista === 'muebles' ? (
                <div style={gridStyle}>
                  {muebles.map(m => (
                    <div key={m.id} style={cardStyle}>
                      <div style={imgBoxStyle}>
                        {m.imagenes?.[0] ? <img src={m.imagenes[0]} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🪑'}
                      </div>
                      <div style={bodyStyle}>
                        <div>
                          <div style={nombreStyle}>{m.nombre}</div>
                          <div style={{ fontSize: 12, color: '#666', marginBottom: 8, height: isAdmin ? 28 : 36, overflow: 'hidden' }}>{m.descripcion}</div>
                        </div>
                        <div>
                          <div style={precioStyle}>
                            {m.precio_dia && parseFloat(m.precio_dia) > 0 ? `$${parseFloat(m.precio_dia).toFixed(2)}` : 'Precio no especificado'}
                          </div>
                          <div style={{ fontSize: 11, color: m.stock > 0 ? '#22c55e' : '#ef4444', marginTop: 4, fontWeight: 600 }}>Stock: {m.stock} uds</div>
                          <button
                            style={{ ...btnStyle, background: m.stock > 0 ? '#4a6cf7' : '#94a3b8', cursor: m.stock > 0 ? 'pointer' : 'not-allowed' }}
                            disabled={m.stock <= 0}
                            onClick={() => {
                              if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona las fechas primero'); return; }
                              agregar(m, 1, false);
                              toast.success(`${m.nombre} agregado`);
                            }}
                          >
                            {m.stock > 0 ? '+ Agregar' : 'Agotado'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {muebles.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: '2rem' }}>No se encontraron muebles.</p>}
                </div>
              ) : (
                <div style={gridStyle}>
                  {combos.map(c => {
                    const stockCombo = calcularStockCombo(c);
                    return (
                      <div key={c.id} style={cardStyle}>
                        <div style={imgBoxStyle}>
                          🎁
                        </div>
                        <div style={bodyStyle}>
                          <div>
                            <div style={nombreStyle}>{c.nombre}</div>
                            <div style={{ fontSize: 12, color: '#666', marginBottom: 8, height: isAdmin ? 28 : 42, overflow: 'hidden' }}>{c.descripcion}</div>
                            
                            {/* Componentes del combo */}
                            <div style={{ background: '#f8f9ff', padding: 6, borderRadius: 6, marginBottom: 8, fontSize: 11 }}>
                              <strong style={{ display: 'block', marginBottom: 4, color: '#444' }}>Incluye:</strong>
                              {c.items.map(item => (
                                <div key={item.mueble_id} style={{ color: '#555' }}>
                                  • {item.cantidad}x {item.nombre}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div style={precioStyle}>
                              {c.precio_dia && parseFloat(c.precio_dia) > 0 ? `$${parseFloat(c.precio_dia).toFixed(2)}` : 'Precio no especificado'}
                            </div>
                            <div style={{ fontSize: 11, color: stockCombo > 0 ? '#22c55e' : '#ef4444', marginTop: 4, fontWeight: 600 }}>Combos: {stockCombo} uds</div>
                            <button
                              style={{ ...btnStyle, background: stockCombo > 0 ? '#10b981' : '#94a3b8', cursor: stockCombo > 0 ? 'pointer' : 'not-allowed' }}
                              disabled={stockCombo <= 0}
                              onClick={() => {
                                if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona las fechas primero'); return; }
                                agregar(c, 1, true);
                                toast.success(`Combo "${c.nombre}" agregado`);
                              }}
                            >
                              {stockCombo > 0 ? '+ Agregar Combo' : 'Agotado'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {combos.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: '2rem' }}>No hay combos registrados.</p>}
                </div>
              )}
            </>
          )}
        </div>

        {/* Panel lateral derecho (Carrito de compras y datos del cliente para Administrador) */}
        {isAdmin && (
          <div style={{ flex: 1, minWidth: 320, position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', paddingRight: '4px' }}>
            <div style={{ ...s.card, padding: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', boxSizing: 'border-box' }}>
              <h3 style={{ marginTop: 0, fontSize: 16, borderBottom: '1px solid #eee', paddingBottom: 8, color: '#1a1a2e' }}>🛒 Crear Reserva (Admin)</h3>
              
              {/* Artículos seleccionados */}
              <h4 style={{ margin: '12px 0 6px 0', fontSize: 13, color: '#555', fontWeight: 600 }}>Artículos seleccionados</h4>
              {items.length > 0 ? (
                <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
                  {items.map(i => {
                    const id = i.esCombo ? i.combo_id : i.mueble_id;
                    return (
                      <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #f9f9f9', fontSize: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={i.nombre}>
                            {i.esCombo ? `🎁 ${i.nombre}` : i.nombre}
                          </div>
                          <div style={{ fontSize: 11, color: '#888' }}>
                            ${parseFloat(i.precio_dia || 0).toFixed(2)} × {diasSeleccionados} d
                          </div>
                        </div>
                        <input
                          type="number" min="1" value={i.cantidad}
                          onChange={e => actualizar(id, parseInt(e.target.value), i.esCombo)}
                          style={{ width: 42, padding: '2px 4px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center', fontSize: 12 }}
                        />
                        <div style={{ fontWeight: 600, minWidth: 60, textAlign: 'right' }}>
                          ${(parseFloat(i.precio_dia) * i.cantidad * diasSeleccionados).toFixed(2)}
                        </div>
                        <button onClick={() => quitar(id, i.esCombo)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: '#aaa', fontSize: 12, margin: '6px 0 12px 0', fontStyle: 'italic' }}>Ningún artículo agregado.</p>
              )}

              {/* Transporte */}
              <div style={{ margin: '12px 0 12px 0', borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 6px 0' }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: '#555', fontWeight: 600 }}>🚚 Transporte</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#444' }}>
                    <input
                      type="checkbox"
                      checked={requiereTransporte}
                      onChange={e => setRequiereTransporte(e.target.checked)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    Incluir envío
                  </label>
                  {requiereTransporte && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                      <span style={{ fontSize: 11, color: '#666' }}>Costo ($):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={costoTransporte}
                        onChange={e => setCostoTransporte(e.target.value)}
                        style={{ ...s.input, width: 70, padding: '4px 6px', fontSize: 11, marginBottom: 0 }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Decoración */}
              <div style={{ margin: '12px 0 12px 0', borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 6px 0' }}>
                  <h4 style={{ margin: 0, fontSize: 13, color: '#555', fontWeight: 600 }}>✨ Decoración</h4>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 600, color: '#444' }}>
                    <input
                      type="checkbox"
                      checked={requiereDecoracion}
                      onChange={e => setRequiereDecoracion(e.target.checked)}
                      style={{ width: 14, height: 14, cursor: 'pointer' }}
                    />
                    Incluir decoración
                  </label>
                  {requiereDecoracion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                      <span style={{ fontSize: 11, color: '#666' }}>Costo ($):</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={costoDecoracion}
                        onChange={e => setCostoDecoracion(e.target.value)}
                        style={{ ...s.input, width: 70, padding: '4px 6px', fontSize: 11, marginBottom: 0 }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Servicios adicionales */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 0 6px 0' }}>
                <h4 style={{ margin: 0, fontSize: 13, color: '#555', fontWeight: 600 }}>Servicios adicionales</h4>
                <button 
                  type="button" 
                  onClick={agregarFilaServicio} 
                  style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}
                >
                  + Agregar
                </button>
              </div>
              {servicios.length > 0 ? (
                <div style={{ maxHeight: 150, overflowY: 'auto', marginBottom: 12, borderBottom: '1px solid #f0f0f0', paddingBottom: 10 }}>
                  {servicios.map((ser, index) => (
                    <div key={ser.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, fontSize: 12 }}>
                      <input
                        style={{ ...s.input, flex: 2, padding: '4px 6px', fontSize: 11, marginBottom: 0 }}
                        value={ser.nombre}
                        onChange={e => actualizarServicio(ser.id, 'nombre', e.target.value)}
                        placeholder="Transporte / Flete"
                        required
                      />
                      <input
                        type="number"
                        style={{ ...s.input, width: 32, padding: '4px 2px', fontSize: 11, marginBottom: 0, textAlign: 'center' }}
                        value={ser.cantidad}
                        min="1"
                        onChange={e => actualizarServicio(ser.id, 'cantidad', parseInt(e.target.value) || 1)}
                        placeholder="Cant"
                        required
                      />
                      <input
                        type="number"
                        step="0.01"
                        style={{ ...s.input, width: 55, padding: '4px 4px', fontSize: 11, marginBottom: 0 }}
                        value={ser.precio_unitario}
                        min="0"
                        onChange={e => actualizarServicio(ser.id, 'precio_unitario', e.target.value)}
                        placeholder="Precio"
                        required
                      />
                      <div style={{ fontWeight: 600, minWidth: 45, textAlign: 'right', fontSize: 11 }}>
                        ${(parseFloat(ser.precio_unitario || 0) * (parseInt(ser.cantidad) || 1)).toFixed(2)}
                      </div>
                      <button 
                        type="button" 
                        onClick={() => eliminarFilaServicio(ser.id)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14 }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#aaa', fontSize: 12, margin: '6px 0 12px 0', fontStyle: 'italic' }}>Ningún servicio agregado.</p>
              )}

              {/* Datos del cliente */}
              <h4 style={{ margin: '12px 0 6px 0', fontSize: 13, color: '#555', fontWeight: 600 }}>Datos del cliente</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div>
                  <label style={s.label}>Alias del cliente (para identificarlo rápido)</label>
                  <input style={{ ...s.input, padding: '6px 10px', fontSize: 12, marginBottom: 0, width: '100%', boxSizing: 'border-box' }} value={form.alias} onChange={e => set('alias', e.target.value)} placeholder="Ej: Fiesta María / Juan Boda" />
                </div>
                <div>
                  <label style={s.label}>Nombre completo</label>
                  <input style={{ ...s.input, padding: '6px 10px', fontSize: 12, marginBottom: 0, width: '100%', boxSizing: 'border-box' }} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Juan Pérez" />
                </div>
                <div>
                  <label style={s.label}>Teléfono / WhatsApp</label>
                  <input style={{ ...s.input, padding: '6px 10px', fontSize: 12, marginBottom: 0, width: '100%', boxSizing: 'border-box' }} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="6000-0000" />
                </div>
                <div>
                  <label style={s.label}>Dirección de entrega</label>
                  <input style={{ ...s.input, padding: '6px 10px', fontSize: 12, marginBottom: 0, width: '100%', boxSizing: 'border-box' }} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle y ciudad" />
                </div>
                <div>
                  <label style={s.label}>Notas adicionales</label>
                  <textarea style={{ ...s.input, padding: '6px 10px', fontSize: 12, marginBottom: 0, width: '100%', height: 40, resize: 'vertical', boxSizing: 'border-box' }} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Instrucciones especiales..." />
                </div>
              </div>

              {/* Resumen de totales */}
              <div style={{ borderTop: '2px solid #f0f0f0', marginTop: 12, paddingTop: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                  <span>Duración:</span>
                  <strong>{diasSeleccionados} días</strong>
                </div>
                {requiereTransporte && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                    <span>Transporte:</span>
                    <strong>${(parseFloat(costoTransporte) || 0).toFixed(2)}</strong>
                  </div>
                )}
                {requiereDecoracion && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 4 }}>
                    <span>Decoración:</span>
                    <strong>${(parseFloat(costoDecoracion) || 0).toFixed(2)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
                  <span>Total</span>
                  <span style={{ color: '#4a6cf7' }}>${totalReserva.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={confirmarReservaAdmin} 
                disabled={loadingCheckout} 
                style={{ ...s.btn, width: '100%', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 700, fontSize: 14, marginTop: 12 }}
              >
                {loadingCheckout ? 'Creando Reserva...' : '✅ Confirmar reserva'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
