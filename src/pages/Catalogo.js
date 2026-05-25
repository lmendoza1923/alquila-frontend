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
  card: { background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'transform .2s' },
  imgBox: { height: 180, background: '#e8eaf6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 },
  body: { padding: '1rem' },
  nombre: { fontWeight: 600, fontSize: '1rem', marginBottom: 4 },
  precio: { color: '#4a6cf7', fontWeight: 700, fontSize: '1.1rem' },
  btn: { width: '100%', marginTop: '0.75rem', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer', fontWeight: 600 },
};

export default function Catalogo() {
  const [muebles, setMuebles] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [loading, setLoading] = useState(true);
  const { agregar, fechas, setFechas } = useCart();

  useEffect(() => {
    api.get('/categorias').then(r => setCategorias(r.data));
    cargar();
  }, []);

  const cargar = async (cat = '', bus = '') => {
    setLoading(true);
    try {
      const params = {};
      if (cat) params.categoria = cat;
      if (bus) params.busqueda = bus;
      const r = await api.get('/muebles', { params });
      setMuebles(r.data);
    } finally {
      setLoading(false);
    }
  };

  const filtrar = (e) => {
    e.preventDefault();
    cargar(categoria, busqueda);
  };

  const iconos = { 'Sillas': '🪑', 'Mesas': '🪵', 'Sofás': '🛋️', 'Decoración': '✨', 'Carpas y toldos': '⛺' };

  return (
    <div style={s.page}>
      <h1 style={{ marginBottom: '0.25rem' }}>Catálogo de mobiliario</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Selecciona tus fechas y agrega muebles al carrito</p>

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

      <form onSubmit={filtrar} style={s.filtros}>
        <input style={s.input} placeholder="Buscar mueble..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select style={s.input} value={categoria} onChange={e => { setCategoria(e.target.value); cargar(e.target.value, busqueda); }}>
          <option value="">Todas las categorías</option>
          {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button type="submit" style={{ ...s.btn, width: 'auto', padding: '8px 20px' }}>Buscar</button>
      </form>

      {loading ? (
        <p style={{ color: '#999', textAlign: 'center', padding: '3rem' }}>Cargando...</p>
      ) : (
        <div style={s.grid}>
          {muebles.map(m => (
            <div key={m.id} style={s.card}>
              <div style={s.imgBox}>
                {m.imagenes?.[0] ? <img src={m.imagenes[0]} alt={m.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (iconos[m.categoria_nombre] || '🪑')}
              </div>
              <div style={s.body}>
                <div style={{ fontSize: 12, color: '#888', marginBottom: 2 }}>{m.categoria_nombre}</div>
                <div style={s.nombre}>{m.nombre}</div>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8, height: 36, overflow: 'hidden' }}>{m.descripcion}</div>
                <div style={s.precio}>${m.precio_dia}/día</div>
                {m.precio_semana && <div style={{ fontSize: 12, color: '#888' }}>${m.precio_semana}/semana · ${m.precio_mes}/mes</div>}
                <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>Stock: {m.stock} unidades</div>
                <button
                  style={s.btn}
                  onClick={() => {
                    if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona las fechas primero'); return; }
                    agregar(m);
                    toast.success(`${m.nombre} agregado al carrito`);
                  }}
                >
                  + Agregar al carrito
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
