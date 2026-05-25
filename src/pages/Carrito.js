import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import api from '../api';
import toast from 'react-hot-toast';

const s = {
  page: { maxWidth: 900, margin: '0 auto', padding: '2rem' },
  row: { display: 'flex', gap: '2rem', flexWrap: 'wrap' },
  left: { flex: 2, minWidth: 280 },
  right: { flex: 1, minWidth: 260 },
  card: { background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', marginBottom: '1rem' },
  item: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid #f0f0f0' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, marginBottom: '0.75rem', boxSizing: 'border-box' },
  label: { fontSize: 12, color: '#666', marginBottom: 3, display: 'block' },
  btn: { width: '100%', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' },
};

export default function Carrito() {
  const { items, fechas, actualizar, quitar, calcularTotal, diasSeleccionados, vaciar } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', direccion: '', notas: '' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const confirmar = async () => {
    if (!form.nombre || !form.email || !form.telefono || !form.direccion) {
      toast.error('Completa todos los campos requeridos'); return;
    }
    if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona fechas en el catálogo'); return; }
    if (!items.length) { toast.error('El carrito está vacío'); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/reservas', {
        fecha_inicio: fechas.inicio.toISOString().split('T')[0],
        fecha_fin: fechas.fin.toISOString().split('T')[0],
        nombre_cliente: form.nombre,
        email_cliente: form.email,
        telefono_cliente: form.telefono,
        direccion_entrega: form.direccion,
        notas: form.notas,
        items: items.map(i => ({ mueble_id: i.mueble_id, cantidad: i.cantidad }))
      });
      vaciar();
      navigate(`/confirmacion/${data.reserva.id}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al crear la reserva');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length) return (
    <div style={{ ...s.page, textAlign: 'center', padding: '4rem' }}>
      <div style={{ fontSize: 64 }}>🛒</div>
      <h2>Tu carrito está vacío</h2>
      <a href="/" style={{ color: '#4a6cf7' }}>Ir al catálogo</a>
    </div>
  );

  return (
    <div style={s.page}>
      <h1 style={{ marginBottom: '1.5rem' }}>Finalizar reserva</h1>
      <div style={s.row}>
        <div style={s.left}>
          <div style={s.card}>
            <h3 style={{ marginTop: 0 }}>Muebles seleccionados</h3>
            {items.map(i => (
              <div key={i.mueble_id} style={s.item}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{i.nombre}</div>
                  <div style={{ fontSize: 13, color: '#888' }}>${i.precio_dia}/día × {diasSeleccionados} días</div>
                </div>
                <input
                  type="number" min="1" value={i.cantidad}
                  onChange={e => actualizar(i.mueble_id, parseInt(e.target.value))}
                  style={{ width: 56, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center' }}
                />
                <div style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                  ${(i.precio_dia * i.cantidad * diasSeleccionados).toFixed(2)}
                </div>
                <button onClick={() => quitar(i.mueble_id)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
            ))}
          </div>

          <div style={s.card}>
            <h3 style={{ marginTop: 0 }}>Datos del cliente</h3>
            <label style={s.label}>Nombre completo *</label>
            <input style={s.input} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Juan Pérez" />
            <label style={s.label}>Correo electrónico *</label>
            <input style={s.input} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="juan@email.com" />
            <label style={s.label}>Teléfono / WhatsApp *</label>
            <input style={s.input} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+507 6000-0000" />
            <label style={s.label}>Dirección de entrega *</label>
            <input style={s.input} value={form.direccion} onChange={e => set('direccion', e.target.value)} placeholder="Calle, edificio, ciudad" />
            <label style={s.label}>Notas adicionales</label>
            <textarea style={{ ...s.input, height: 80, resize: 'vertical' }} value={form.notas} onChange={e => set('notas', e.target.value)} placeholder="Instrucciones especiales, horario de entrega..." />
          </div>
        </div>

        <div style={s.right}>
          <div style={{ ...s.card, position: 'sticky', top: 80 }}>
            <h3 style={{ marginTop: 0 }}>Resumen</h3>
            <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              📅 {fechas.inicio?.toLocaleDateString('es', { day: '2-digit', month: 'short' })} → {fechas.fin?.toLocaleDateString('es', { day: '2-digit', month: 'short' })}
            </div>
            <div style={{ fontSize: 14, color: '#666', marginBottom: '1rem' }}>Duración: {diasSeleccionados} días</div>
            {items.map(i => (
              <div key={i.mueble_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{i.nombre} x{i.cantidad}</span>
                <span>${(i.precio_dia * i.cantidad * diasSeleccionados).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ borderTop: '2px solid #f0f0f0', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
              <span>Total</span>
              <span style={{ color: '#4a6cf7' }}>${calcularTotal()}</span>
            </div>
            <button style={{ ...s.btn, marginTop: '1.25rem' }} onClick={confirmar} disabled={loading}>
              {loading ? 'Procesando...' : '✅ Confirmar reserva'}
            </button>
            <p style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 }}>Recibirás un email de confirmación</p>
          </div>
        </div>
      </div>
    </div>
  );
}
