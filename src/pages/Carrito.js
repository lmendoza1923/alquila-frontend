import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [form, setForm] = useState({ nombre: '', telefono: '', direccion: '', notas: '' });
  const [loading, setLoading] = useState(false);
  const [servicios, setServicios] = useState([]);
  const [requiereTransporte, setRequiereTransporte] = useState(false);
  const [costoTransporte, setCostoTransporte] = useState('');

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
  const totalServicios = servicios.reduce((sum, s) => sum + (parseFloat(s.precio_unitario || 0) * (parseInt(s.cantidad) || 1)), 0);
  const totalReserva = parseFloat(calcularTotal()) + totalServicios + totalTransporte;

  const confirmar = async () => {
    if (!fechas.inicio || !fechas.fin) { toast.error('Selecciona fechas en el catálogo'); return; }
    if (!items.length) { toast.error('El carrito está vacío'); return; }

    setLoading(true);
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

      const { data } = await api.post('/reservas', {
        fecha_inicio: fechas.inicio.toISOString().split('T')[0],
        fecha_fin: fechas.fin.toISOString().split('T')[0],
        nombre_cliente: form.nombre || null,
        email_cliente: null,
        telefono_cliente: form.telefono || null,
        direccion_entrega: form.direccion || null,
        notas: form.notas,
        items: itemsPayload
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
      <Link to="/catalogo" style={{ color: '#4a6cf7', fontWeight: 600 }}>Ir al catálogo</Link>
    </div>
  );

  return (
    <div style={s.page}>
      <h1 style={{ marginBottom: '1.5rem' }}>Finalizar reserva</h1>
      <div style={s.row}>
        <div style={s.left}>
          <div style={s.card}>
            <h3 style={{ marginTop: 0 }}>Artículos seleccionados</h3>
            {items.map(i => {
              const id = i.esCombo ? i.combo_id : i.mueble_id;
              return (
                <div key={id} style={s.item}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>
                      {i.esCombo ? `🎁 Combo: ${i.nombre}` : i.nombre}
                    </div>
                    <div style={{ fontSize: 13, color: '#888' }}>
                      {i.precio_dia && parseFloat(i.precio_dia) > 0 ? `$${parseFloat(i.precio_dia).toFixed(2)}` : 'Precio no especificado'} × {diasSeleccionados} {diasSeleccionados === 1 ? 'día' : 'días'}
                    </div>
                  </div>
                  <input
                    type="number" min="1" value={i.cantidad}
                    onChange={e => actualizar(id, parseInt(e.target.value), i.esCombo)}
                    style={{ width: 56, padding: '4px 8px', border: '1px solid #ddd', borderRadius: 6, textAlign: 'center' }}
                  />
                  <div style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                    ${(parseFloat(i.precio_dia) * i.cantidad * diasSeleccionados).toFixed(2)}
                  </div>
                  <button onClick={() => quitar(id, i.esCombo)} style={{ background: 'none', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
              );
            })}
          </div>

          {/* Transporte */}
          <div style={s.card}>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚚 Transporte</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={requiereTransporte}
                  onChange={e => setRequiereTransporte(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                Incluir costo de envío / transporte
              </label>
              {requiereTransporte && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                  <label style={{ fontSize: 13, color: '#666', fontWeight: 600 }}>Costo ($):</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={costoTransporte}
                    onChange={e => setCostoTransporte(e.target.value)}
                    style={{ ...s.input, width: 110, marginBottom: 0, padding: '6px 10px' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Servicios adicionales */}
          <div style={s.card}>
            <h3 style={{ marginTop: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🔧 Servicios adicionales</span>
              <button 
                type="button" 
                onClick={agregarFilaServicio} 
                style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
              >
                + Agregar servicio
              </button>
            </h3>
            {servicios.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {servicios.map((ser, index) => (
                  <div key={ser.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      style={{ ...s.input, flex: 2, marginBottom: 0 }}
                      value={ser.nombre}
                      onChange={e => actualizarServicio(ser.id, 'nombre', e.target.value)}
                      placeholder="Ej: Transporte / Montaje de toldo"
                      required
                    />
                    <input
                      type="number"
                      style={{ ...s.input, width: 60, flex: 'none', marginBottom: 0, textAlign: 'center' }}
                      value={ser.cantidad}
                      min="1"
                      onChange={e => actualizarServicio(ser.id, 'cantidad', parseInt(e.target.value) || 1)}
                      placeholder="Cant"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      style={{ ...s.input, width: 90, flex: 'none', marginBottom: 0 }}
                      value={ser.precio_unitario}
                      min="0"
                      onChange={e => actualizarServicio(ser.id, 'precio_unitario', e.target.value)}
                      placeholder="Precio ($)"
                      required
                    />
                    <div style={{ fontWeight: 600, minWidth: 60, textAlign: 'right', fontSize: 14 }}>
                      ${(parseFloat(ser.precio_unitario || 0) * (parseInt(ser.cantidad) || 1)).toFixed(2)}
                    </div>
                    <button 
                      type="button" 
                      onClick={() => eliminarFilaServicio(ser.id)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}
                      title="Eliminar servicio"
                    >
                      ✕
                    </button>
                  </div>
                 ))}
               </div>
            ) : (
              <p style={{ color: '#aaa', fontSize: 13, margin: 0 }}>No hay servicios adicionales agregados.</p>
            )}
          </div>

          <div style={s.card}>
            <h3 style={{ marginTop: 0 }}>Datos del cliente</h3>
            <label style={s.label}>Nombre completo</label>
            <input style={s.input} value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej: Juan Pérez" />
            <label style={s.label}>Teléfono / WhatsApp</label>
            <input style={s.input} value={form.telefono} onChange={e => set('telefono', e.target.value)} placeholder="6000-0000" />
            <label style={s.label}>Dirección de entrega</label>
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
            {items.map(i => {
              const id = i.esCombo ? i.combo_id : i.mueble_id;
              return (
                <div key={id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, gap: 10 }}>
                  <span style={{ flex: 1 }}>{i.esCombo ? `🎁 ${i.nombre}` : i.nombre} x{i.cantidad}</span>
                  <span style={{ fontWeight: 600 }}>${(parseFloat(i.precio_dia) * i.cantidad * diasSeleccionados).toFixed(2)}</span>
                </div>
              );
            })}
            {servicios.filter(s => s.nombre.trim() !== '').map(ser => (
              <div key={ser.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, gap: 10 }}>
                <span style={{ flex: 1 }}>🔧 {ser.nombre} x{ser.cantidad}</span>
                <span style={{ fontWeight: 600 }}>${(parseFloat(ser.precio_unitario || 0) * (parseInt(ser.cantidad) || 1)).toFixed(2)}</span>
              </div>
            ))}
            {requiereTransporte && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, gap: 10 }}>
                <span style={{ flex: 1 }}>🚚 Transporte</span>
                <span style={{ fontWeight: 600 }}>${(parseFloat(costoTransporte) || 0).toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: '2px solid #f0f0f0', marginTop: '0.75rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.1rem' }}>
              <span>Total</span>
              <span style={{ color: '#4a6cf7' }}>${totalReserva.toFixed(2)}</span>
            </div>
            <button style={{ ...s.btn, marginTop: '1.25rem' }} onClick={confirmar} disabled={loading}>
              {loading ? 'Procesando...' : '✅ Confirmar reserva'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
