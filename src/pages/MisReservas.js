import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const estadoColor = { pendiente: '#f59e0b', confirmada: '#3b82f6', activa: '#22c55e', completada: '#6b7280', cancelada: '#ef4444' };

const formatFecha = (fechaStr, options) => {
  if (!fechaStr) return '';
  const [yyyy, mm, dd] = fechaStr.substring(0, 10).split('-');
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  return date.toLocaleDateString('es', options);
};

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    api.get('/reservas').then(r => setReservas(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ padding: '2rem', color: '#999' }}>Cargando...</p>;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ margin: 0 }}>Mis reservas</h1>
        <Link 
          to="/catalogo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            background: '#4a6cf7',
            color: '#fff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(74, 108, 247, 0.25)',
            transition: 'background 0.2s'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#3b5bdb'}
          onMouseOut={e => e.currentTarget.style.background = '#4a6cf7'}
        >
          <span>➕</span>
          <span>Nueva Reserva</span>
        </Link>
      </div>
      {!reservas.length ? (
        <p style={{ color: '#666' }}>No tienes reservas aún. <Link to="/catalogo" style={{ color: '#4a6cf7', fontWeight: 600 }}>Crear nueva reserva</Link></p>
      ) : reservas.map(r => (
        <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>#{r.id.slice(0,8).toUpperCase()}</span>
              {r.alias_cliente && (
                <span style={{ marginLeft: 12, fontWeight: 600, color: '#333', background: '#f3f4f6', padding: '2px 8px', borderRadius: 6, fontSize: 13 }}>{r.alias_cliente}</span>
              )}
              <span style={{ marginLeft: 12, background: estadoColor[r.estado] + '22', color: estadoColor[r.estado], padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{r.estado}</span>
            </div>
            <span style={{ fontWeight: 700, color: '#4a6cf7', fontSize: '1.1rem' }}>${r.total}</span>
          </div>
          <div style={{ color: '#666', fontSize: 14, marginTop: 6 }}>
            📅 {formatFecha(r.fecha_inicio)} → {formatFecha(r.fecha_fin)}
          </div>
          {r.items && r.items[0]?.mueble && (
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>
              {r.items.map(i => i.mueble).filter(Boolean).join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
