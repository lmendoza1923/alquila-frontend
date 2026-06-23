import { useState, useEffect } from 'react';
import api from '../api';
import { useCart } from '../context/CartContext';
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
  tabBtn: (active) => ({ padding: '10px 24px', borderRadius: 8, border: 'none', background: active ? '#4a6cf7' : '#e8eaf6', color: active ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 })
};

export default function Catalogo() {
  const [muebles, setMuebles] = useState([]);
  const [combos, setCombos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [vista, setVista] = useState('muebles'); // 'muebles' o 'combos'
  const [loading, setLoading] = useState(true);
  const { agregar, fechas, setFechas } = useCart();

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
      // Filtrar combos localmente por búsqueda si se requiere
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

  const iconos = { 'Sillas': '🪑', 'Mesas': '🪵', 'Sofás': '🛋️', 'Decoración': '✨', 'Carpas y toldos': '⛺' };

  return (
    <div style={s.page}>
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
            <div style={s.grid}>
              {muebles.map(m => (
                <div key={m.id} style={s.card}>
                  <div style={s.imgBox}>
                    {m.imagenes?.[0] ? <img src={m.imagenes[0]} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🪑'}
                  </div>
                  <div style={s.body}>
                    <div>
                      <div style={s.nombre}>{m.nombre}</div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 8, height: 36, overflow: 'hidden' }}>{m.descripcion}</div>
                    </div>
                    <div>
                      <div style={s.precio}>
                        {m.precio_dia && parseFloat(m.precio_dia) > 0 ? `$${parseFloat(m.precio_dia).toFixed(2)}` : 'Precio no especificado'}
                      </div>
                      <div style={{ fontSize: 12, color: m.stock > 0 ? '#22c55e' : '#ef4444', marginTop: 4, fontWeight: 600 }}>Stock: {m.stock} unidades</div>
                      <button
                        style={{ ...s.btn, background: m.stock > 0 ? '#4a6cf7' : '#94a3b8', cursor: m.stock > 0 ? 'pointer' : 'not-allowed' }}
                        disabled={m.stock <= 0}
                        onClick={() => {
                          if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona las fechas primero'); return; }
                          agregar(m, 1, false);
                          toast.success(`${m.nombre} agregado al carrito`);
                        }}
                      >
                        {m.stock > 0 ? '+ Agregar al carrito' : 'Agotado'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {muebles.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: '2rem' }}>No se encontraron muebles.</p>}
            </div>
          ) : (
            <div style={s.grid}>
              {combos.map(c => {
                const stockCombo = calcularStockCombo(c);
                return (
                  <div key={c.id} style={s.card}>
                    <div style={s.imgBox}>
                      🎁
                    </div>
                    <div style={s.body}>
                      <div>
                        <div style={s.nombre}>{c.nombre}</div>
                        <div style={{ fontSize: 13, color: '#666', marginBottom: 8, height: 42, overflow: 'hidden' }}>{c.descripcion}</div>
                        
                        {/* Componentes del combo */}
                        <div style={{ background: '#f8f9ff', padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                          <strong style={{ display: 'block', marginBottom: 4, color: '#444' }}>Incluye:</strong>
                          {c.items.map(item => (
                            <div key={item.mueble_id} style={{ color: '#555' }}>
                              • {item.cantidad}x {item.nombre}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={s.precio}>
                          {c.precio_dia && parseFloat(c.precio_dia) > 0 ? `$${parseFloat(c.precio_dia).toFixed(2)}` : 'Precio no especificado'}
                        </div>
                        <div style={{ fontSize: 12, color: stockCombo > 0 ? '#22c55e' : '#ef4444', marginTop: 4, fontWeight: 600 }}>Combos Disponibles: {stockCombo}</div>
                        <button
                          style={{ ...s.btn, background: stockCombo > 0 ? '#10b981' : '#94a3b8', cursor: stockCombo > 0 ? 'pointer' : 'not-allowed' }}
                          disabled={stockCombo <= 0}
                          onClick={() => {
                            if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona las fechas primero'); return; }
                            agregar(c, 1, true);
                            toast.success(`Combo "${c.nombre}" agregado al carrito`);
                          }}
                        >
                          {stockCombo > 0 ? '+ Agregar Combo' : 'Componente Agotado'}
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
  );
}
