import React, { useState } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { useConfig } from '../context/ConfigContext';

export default function FormularioCliente() {
  const { config } = useConfig();

  const [form, setForm] = useState({
    nombre: '',
    alias: '',
    cedula: '',
    telefono: '',
    email: '',
    direccion: '',
    notas: ''
  });

  const [enviando, setEnviando] = useState(false);
  const [enviadoExito, setEnviadoExito] = useState(false);
  const [clienteRegistrado, setClienteRegistrado] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.nombre.trim()) {
      toast.error('Por favor ingresa tu nombre completo');
      return;
    }

    if (!form.telefono.trim()) {
      toast.error('Por favor ingresa tu número de teléfono / WhatsApp');
      return;
    }

    setEnviando(true);
    try {
      const res = await api.post('/clientes/publico', form);
      setClienteRegistrado(res.data.cliente || form);
      setEnviadoExito(true);
      toast.success('¡Datos registrados con éxito!');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Hubo un error al enviar tu información. Por favor intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const handleReiniciar = () => {
    setForm({
      nombre: '',
      alias: '',
      cedula: '',
      telefono: '',
      email: '',
      direccion: '',
      notas: ''
    });
    setEnviadoExito(false);
    setClienteRegistrado(null);
  };

  // Enlace a WhatsApp de la empresa si está configurado
  const whatsappEmpresa = config?.telefono_contacto ? config.telefono_contacto.replace(/[^0-9]/g, '') : null;
  const linkWhatsAppEmpresa = whatsappEmpresa 
    ? `https://wa.me/${whatsappEmpresa.length === 8 ? '507' + whatsappEmpresa : whatsappEmpresa}?text=${encodeURIComponent(`¡Hola! Ya llené el formulario con mis datos para la reserva a nombre de ${form.nombre || form.alias}.`)}`
    : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem 1rem',
      boxSizing: 'border-box'
    }}>
      <div style={{
        maxWidth: 640,
        width: '100%',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Cabecera con Branding de la Empresa */}
        <div style={{
          background: config?.color_sidebar || '#1a1a2e',
          color: '#fff',
          padding: '1.75rem 1.5rem',
          textAlign: 'center',
          position: 'relative'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}>
            {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
              <img
                src={config.logo_url}
                alt="Logo"
                style={{ maxHeight: 48, maxWidth: 120, objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontSize: 40 }}>{config?.logo_url || '🎉'}</span>
            )}
          </div>

          <h1 style={{
            margin: '0 0 6px 0',
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: '-0.02em'
          }}>
            {config?.nombre_empresa || 'Alquila tu Party'}
          </h1>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: '#cbd5e1',
            lineHeight: 1.4
          }}>
            Formulario de Registro para tu Reserva
          </p>
        </div>

        {/* Pantalla de Éxito / Confirmación */}
        {enviadoExito ? (
          <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{
              fontSize: 54,
              marginBottom: '1rem',
              lineHeight: 1
            }}>
              🎉
            </div>

            <h2 style={{
              margin: '0 0 8px 0',
              color: '#1e293b',
              fontSize: '1.4rem',
              fontWeight: 700
            }}>
              ¡Información enviada con éxito!
            </h2>

            <p style={{
              margin: '0 0 1.75rem 0',
              color: '#64748b',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }}>
              Muchas gracias, <strong>{clienteRegistrado?.nombre || form.nombre}</strong>. Tus datos han sido recibidos correctamente en nuestro sistema y ya están listos para coordinar tu reserva.
            </p>

            {/* Resumen de los datos enviados */}
            <div style={{
              background: '#f8fafc',
              borderRadius: 12,
              padding: '1.25rem',
              border: '1px solid #e2e8f0',
              textAlign: 'left',
              marginBottom: '1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              fontSize: 14
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Nombre:</span> <strong>{form.nombre}</strong>
              </div>
              {form.alias && (
                <div>
                  <span style={{ color: '#64748b' }}>Evento / Alias:</span> <strong>{form.alias}</strong>
                </div>
              )}
              {form.cedula && (
                <div>
                  <span style={{ color: '#64748b' }}>Cédula:</span> <strong>{form.cedula}</strong>
                </div>
              )}
              <div>
                <span style={{ color: '#64748b' }}>Teléfono / WhatsApp:</span> <strong>{form.telefono}</strong>
              </div>
              {form.direccion && (
                <div>
                  <span style={{ color: '#64748b' }}>Dirección de Entrega:</span> <strong>{form.direccion}</strong>
                </div>
              )}
              {form.notas && (
                <div>
                  <span style={{ color: '#64748b' }}>Detalles / Notas:</span> <em>{form.notas}</em>
                </div>
              )}
            </div>

            {/* Botón de WhatsApp a la empresa si aplica */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {linkWhatsAppEmpresa && (
                <a
                  href={linkWhatsAppEmpresa}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: '#25D366',
                    color: '#fff',
                    textDecoration: 'none',
                    padding: '12px 20px',
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 15,
                    boxShadow: '0 3px 10px rgba(37, 211, 102, 0.3)'
                  }}
                >
                  <span>💬</span>
                  <span>Notificar por WhatsApp a la empresa</span>
                </a>
              )}

              <button
                onClick={handleReiniciar}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  padding: '11px 20px',
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Llenar otro formulario
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Registro */
          <form onSubmit={handleSubmit} style={{ padding: '1.75rem 1.5rem' }}>
            <p style={{
              margin: '0 0 1.5rem 0',
              color: '#475569',
              fontSize: '0.95rem',
              lineHeight: 1.5,
              background: '#f0fdf4',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #bbf7d0'
            }}>
              👋 ¡Hola! Por favor completa tus datos para registrarte en el sistema y poder gestionar tu reserva de mobiliario.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Nombre Completo */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 5
                }}>
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: Juan Pérez"
                  required
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Alias / Nombre del Evento */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 5
                }}>
                  Alias / Motivo del Evento
                </label>
                <input
                  type="text"
                  value={form.alias}
                  onChange={e => setForm({ ...form, alias: e.target.value })}
                  placeholder="Ej: Boda Juan y María / Cumpleaños de Sofía"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: 11, color: '#64748b', marginTop: 3, display: 'block' }}>
                  Nos ayuda a identificar y etiquetar rápidamente tu evento o reserva.
                </span>
              </div>

              {/* Cédula y Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 5
                  }}>
                    Cédula / Pasaporte (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.cedula}
                    onChange={e => setForm({ ...form, cedula: e.target.value })}
                    placeholder="Ej: 8-888-8888"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 16,
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: 5
                  }}>
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    value={form.telefono}
                    onChange={e => setForm({ ...form, telefono: e.target.value })}
                    placeholder="Ej: 6000-0000"
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: 16,
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Correo Electrónico */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 5
                }}>
                  Correo Electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="ejemplo@correo.com"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Dirección de Entrega */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 5
                }}>
                  Dirección de Entrega del Mobiliario
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={e => setForm({ ...form, direccion: e.target.value })}
                  placeholder="Calle, edificio, urbanización, barriada o punto de referencia"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 16,
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Notas Adicionales / Fecha tentativa / Instrucciones */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: 5
                }}>
                  Detalles del Evento o Notas Adicionales
                </label>
                <textarea
                  value={form.notas}
                  onChange={e => setForm({ ...form, notas: e.target.value })}
                  placeholder="Fecha tentativa del evento, horario de entrega deseado, número de contacto adicional, etc."
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 16,
                    height: 90,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={enviando}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  background: '#4a6cf7',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 20px',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: enviando ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(74, 108, 247, 0.3)',
                  transition: 'background 0.2s',
                  opacity: enviando ? 0.75 : 1
                }}
              >
                {enviando ? 'Enviando información...' : 'Enviar Información de Reserva 🚀'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
