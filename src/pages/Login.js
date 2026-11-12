import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '' });
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const { login, register } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      let loggedUser;
      if (modo === 'login') {
        loggedUser = await login(form.email, form.password);
      } else {
        loggedUser = await register(form.nombre, form.email, form.password, form.telefono);
      }
      toast.success('¡Bienvenido!');
      if (loggedUser && loggedUser.rol === 'admin') {
        navigate('/admin');
      } else {
        navigate('/catalogo');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error de autenticación');
    }
  };

  const colorPrimario = config?.color_primario || '#4f46e5';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 40%), radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.06), transparent 40%), #f8fafc',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 440,
        background: '#ffffff',
        borderRadius: 24,
        padding: '2.5rem 2rem',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 1px 1px rgba(15, 23, 42, 0.05)',
        border: '1px solid #f1f5f9',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        {/* Encabezado y Marca */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '1rem' }}>
            {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
              <img
                src={config.logo_url}
                alt="Logo"
                style={{ maxHeight: 68, maxWidth: 180, objectFit: 'contain', borderRadius: 12 }}
              />
            ) : (
              <div style={{
                width: 58,
                height: 58,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${colorPrimario} 0%, #8b5cf6 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 28,
                color: '#fff',
                boxShadow: '0 8px 16px -4px rgba(79, 70, 229, 0.35)'
              }}>
                {config?.logo_url || '🎉'}
              </div>
            )}
          </div>

          <h2 style={{
            margin: '0 0 6px',
            color: '#0f172a',
            fontSize: '1.5rem',
            fontWeight: 800,
            letterSpacing: '-0.02em'
          }}>
            {config?.nombre_empresa || 'Alquila tu Party'}
          </h2>
          
          <p style={{
            margin: 0,
            color: '#64748b',
            fontSize: 13,
            fontWeight: 500
          }}>
            {config?.eslogan || 'Sistema de reservas y alquiler de mobiliario'}
          </p>
        </div>

        {/* Selector de Modo (Pills modernas) */}
        <div style={{
          display: 'flex',
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 14,
          marginBottom: '1.75rem',
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => setModo('login')}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              background: modo === 'login' ? '#ffffff' : 'transparent',
              color: modo === 'login' ? '#0f172a' : '#64748b',
              boxShadow: modo === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => setModo('register')}
            style={{
              flex: 1,
              padding: '9px 12px',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              background: modo === 'register' ? '#ffffff' : 'transparent',
              color: modo === 'register' ? '#0f172a' : '#64748b',
              boxShadow: modo === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            Registrarse
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {modo === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Nombre completo
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Ej. Juan Pérez"
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Teléfono / WhatsApp
                </label>
                <input
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    fontSize: 14,
                    color: '#0f172a',
                    background: '#f8fafc',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Ej. 6500-1234"
                  value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                />
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Correo electrónico
            </label>
            <input
              type="email"
              style={{
                width: '100%',
                padding: '11px 14px',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                fontSize: 14,
                color: '#0f172a',
                background: '#f8fafc',
                boxSizing: 'border-box'
              }}
              placeholder="tu@correo.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                style={{
                  width: '100%',
                  padding: '11px 44px 11px 14px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: 14,
                  color: '#0f172a',
                  background: '#f8fafc',
                  boxSizing: 'border-box'
                }}
                placeholder="••••••••••••"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(v => !v)}
                title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 6
                }}
              >
                {mostrarPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: '100%',
              marginTop: '0.75rem',
              background: `linear-gradient(135deg, ${colorPrimario} 0%, #6366f1 100%)`,
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              padding: '12px 16px',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease'
            }}
          >
            {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </form>

        {/* Footer sutil */}
        <p style={{
          marginTop: '1.75rem',
          marginBottom: 0,
          textAlign: 'center',
          fontSize: 12,
          color: '#94a3b8'
        }}>
          Acceso protegido y cifrado
        </p>
      </div>
    </div>
  );
}
