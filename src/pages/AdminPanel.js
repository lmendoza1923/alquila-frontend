import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';

const estadoColor = { pendiente: '#f59e0b', confirmada: '#3b82f6', activa: '#22c55e', completada: '#6b7280', cancelada: '#ef4444' };

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [tab, setTab] = useState('dashboard');

  useEffect(() => {
    api.get('/admin/stats').then(r => setStats(r.data));
    api.get('/admin/reservas-recientes').then(r => setReservas(r.data));
  }, []);

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/reservas/${id}/estado`, { estado });
      setReservas(prev => prev.map(r => r.id === id ? { ...r, estado } : r));
      toast.success('Estado actualizado');
    } catch { toast.error('Error al actualizar'); }
  };

  const tabs = ['dashboard', 'reservas'];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem' }}>
      <h1>Panel de administración</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: tab === t ? '#4a6cf7' : '#e8eaf6', color: tab === t ? '#fff' : '#555', cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>
            {t === 'dashboard' ? 'Resumen' : 'Reservas'}
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
    </div>
  );
}
