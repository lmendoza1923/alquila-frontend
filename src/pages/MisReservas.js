import { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const estadoColor = { pendiente: '#f59e0b', confirmada: '#3b82f6', activa: '#22c55e', completada: '#6b7280', cancelada: '#ef4444' };

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
      <h1>Mis reservas</h1>
      {!reservas.length ? (
        <p style={{ color: '#666' }}>No tienes reservas aún. <a href="/" style={{ color: '#4a6cf7' }}>Ver catálogo</a></p>
      ) : reservas.map(r => (
        <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13 }}>#{r.id.slice(0,8).toUpperCase()}</span>
              <span style={{ marginLeft: 12, background: estadoColor[r.estado] + '22', color: estadoColor[r.estado], padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{r.estado}</span>
            </div>
            <span style={{ fontWeight: 700, color: '#4a6cf7', fontSize: '1.1rem' }}>${r.total}</span>
          </div>
          <div style={{ color: '#666', fontSize: 14, marginTop: 6 }}>
            📅 {new Date(r.fecha_inicio).toLocaleDateString('es')} → {new Date(r.fecha_fin).toLocaleDateString('es')}
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
