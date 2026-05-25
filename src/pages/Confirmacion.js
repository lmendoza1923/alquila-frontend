// src/pages/Confirmacion.js
import { useParams, Link } from 'react-router-dom';

export default function Confirmacion() {
  const { id } = useParams();
  return (
    <div style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: 72, marginBottom: '1rem' }}>🎉</div>
      <h1 style={{ color: '#22c55e' }}>¡Reserva confirmada!</h1>
      <p style={{ color: '#666', marginBottom: '0.5rem' }}>Tu solicitud ha sido registrada exitosamente.</p>
      <p style={{ color: '#888', fontSize: 14, marginBottom: '1.5rem' }}>
        Número de reserva: <strong style={{ fontFamily: 'monospace' }}>{id?.slice(0,8).toUpperCase()}</strong>
      </p>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Revisa tu correo para la confirmación. Nos pondremos en contacto para coordinar la entrega.
      </p>
      <Link to="/" style={{ background: '#4a6cf7', color: '#fff', padding: '12px 28px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>
        Volver al catálogo
      </Link>
    </div>
  );
}
