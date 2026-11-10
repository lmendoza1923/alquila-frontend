import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import api from './api';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Confirmacion from './pages/Confirmacion';
import Login from './pages/Login';
import MisReservas from './pages/MisReservas';
import AdminPanel from './pages/AdminPanel';
import FormularioCliente from './pages/FormularioCliente';
import ContratoPublico from './pages/ContratoPublico';

// Iconos vectoriales SVG modernos
const NavIcon = ({ name, size = 18, color = 'currentColor' }) => {
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    chart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    calendar: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    chair: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
        <path d="M3 11a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4z" />
        <path d="M6 16v5" />
        <path d="M18 16v5" />
      </svg>
    ),
    building: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <path d="M9 22v-4h6v4" />
        <line x1="8" y1="6" x2="8.01" y2="6" />
        <line x1="16" y1="6" x2="16.01" y2="6" />
        <line x1="12" y1="6" x2="12.01" y2="6" />
        <line x1="12" y1="10" x2="12.01" y2="10" />
        <line x1="12" y1="14" x2="12.01" y2="14" />
        <line x1="16" y1="10" x2="16.01" y2="10" />
        <line x1="16" y1="14" x2="16.01" y2="14" />
        <line x1="8" y1="10" x2="8.01" y2="10" />
        <line x1="8" y1="14" x2="8.01" y2="14" />
      </svg>
    ),
    gift: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12" />
        <rect x="2" y="7" width="20" height="5" />
        <line x1="12" y1="22" x2="12" y2="7" />
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
      </svg>
    ),
    reports: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
      </svg>
    ),
    fileText: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    cart: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    menu: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="18" x2="21" y2="18" />
      </svg>
    ),
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    )
  };
  return icons[name] || null;
};

function Navbar({ isMobile, mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const { config } = useConfig();
  const location = useLocation();
  const [nuevosClientes, setNuevosClientes] = useState(0);

  const cargarNuevosClientes = useCallback(() => {
    if (user?.rol === 'admin') {
      api.get('/clientes/nuevos-count')
        .then(res => setNuevosClientes(res.data?.nuevos_formulario || 0))
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    cargarNuevosClientes();
  }, [cargarNuevosClientes, location.pathname, location.search]);

  useEffect(() => {
    const handleUpdate = () => cargarNuevosClientes();
    window.addEventListener('clientes-nuevos-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('clientes-nuevos-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [cargarNuevosClientes]);

  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location, isMobile, setMobileMenuOpen]);

  const esRutaPublica = location.pathname.startsWith('/formulario-cliente') || location.pathname.startsWith('/registro-cliente') || location.pathname.startsWith('/contrato/');
  if (!user || esRutaPublica) return null;

  const isActive = (path, tabName) => {
    if (path === '/admin') {
      const currentTab = new URLSearchParams(location.search).get('tab') || 'dashboard';
      if (tabName !== undefined) {
        return location.pathname === '/admin' && currentTab === tabName;
      }
      return location.pathname === '/admin';
    }
    return location.pathname === path;
  };

  const linkStyle = (active, isSubmenu = false) => ({
    color: active ? '#ffffff' : '#94a3b8',
    background: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
    textDecoration: 'none',
    padding: '10px 14px',
    paddingLeft: isSubmenu && !isMobile ? '28px' : '14px',
    borderRadius: 12,
    fontSize: 14,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    transition: 'all 0.18s ease',
    fontWeight: active ? 600 : 500,
    borderLeft: active ? '3px solid #818cf8' : '3px solid transparent',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
    minHeight: 42
  });

  const renderNavLinks = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, width: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      {user?.rol !== 'admin' && (
        <Link to="/mis-reservas" style={linkStyle(isActive('/mis-reservas'))} onClick={() => isMobile && setMobileMenuOpen(false)}>
          <NavIcon name="calendar" color={isActive('/mis-reservas') ? '#818cf8' : '#94a3b8'} />
          <span>Mis reservas</span>
        </Link>
      )}

      {user?.rol === 'admin' && (
        <>
          <Link to="/admin" style={linkStyle(isActive('/admin'))} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="dashboard" color={isActive('/admin') ? '#818cf8' : '#94a3b8'} />
            <span>Admin</span>
          </Link>

          <Link to="/admin?tab=dashboard" style={linkStyle(isActive('/admin', 'dashboard'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="chart" color={isActive('/admin', 'dashboard') ? '#818cf8' : '#94a3b8'} />
            <span>Resumen</span>
          </Link>

          <Link to="/admin?tab=reservas" style={linkStyle(isActive('/admin', 'reservas'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="calendar" color={isActive('/admin', 'reservas') ? '#818cf8' : '#94a3b8'} />
            <span>Reservas</span>
          </Link>

          <Link to="/admin?tab=clientes" style={linkStyle(isActive('/admin', 'clientes'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="users" color={isActive('/admin', 'clientes') ? '#818cf8' : '#94a3b8'} />
            <span>Clientes</span>
            {nuevosClientes > 0 && (
              <span
                title={`${nuevosClientes} nuevo(s) registro(s) por formulario sin revisar`}
                style={{
                  marginLeft: 'auto',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 10,
                  padding: '2px 8px',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.45)'
                }}
              >
                {nuevosClientes}
              </span>
            )}
          </Link>

          <Link to="/admin?tab=mobiliario" style={linkStyle(isActive('/admin', 'mobiliario'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="chair" color={isActive('/admin', 'mobiliario') ? '#818cf8' : '#94a3b8'} />
            <span>Mobiliario</span>
          </Link>

          <Link to="/admin?tab=sucursales" style={linkStyle(isActive('/admin', 'sucursales'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="building" color={isActive('/admin', 'sucursales') ? '#818cf8' : '#94a3b8'} />
            <span>Sucursales</span>
          </Link>

          <Link to="/admin?tab=combos" style={linkStyle(isActive('/admin', 'combos'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="gift" color={isActive('/admin', 'combos') ? '#818cf8' : '#94a3b8'} />
            <span>Combos y Paquetes</span>
          </Link>

          <Link to="/admin?tab=reportes" style={linkStyle(isActive('/admin', 'reportes'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="reports" color={isActive('/admin', 'reportes') ? '#818cf8' : '#94a3b8'} />
            <span>Reportes</span>
          </Link>

          <Link to="/admin?tab=terminos" style={linkStyle(isActive('/admin', 'terminos'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="fileText" color={isActive('/admin', 'terminos') ? '#818cf8' : '#94a3b8'} />
            <span>Términos de Contrato</span>
          </Link>

          <Link to="/admin?tab=configuracion" style={linkStyle(isActive('/admin', 'configuracion'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <NavIcon name="settings" color={isActive('/admin', 'configuracion') ? '#818cf8' : '#94a3b8'} />
            <span>Configuración</span>
          </Link>
        </>
      )}

      {user?.rol !== 'admin' && (
        <Link to="/carrito" style={linkStyle(isActive('/carrito'))} onClick={() => isMobile && setMobileMenuOpen(false)}>
          <NavIcon name="cart" color={isActive('/carrito') ? '#818cf8' : '#94a3b8'} />
          <span>Carrito</span>
          {items.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: 999,
              fontSize: 10,
              padding: '2px 8px',
              fontWeight: 700,
              marginLeft: 'auto',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)'
            }}>{items.length}</span>
          )}
        </Link>
      )}
    </div>
  );

  const userInitials = (user?.nombre || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const renderUserFooter = () => (
    <div style={{
      borderTop: '1px solid rgba(255,255,255,0.08)',
      paddingTop: '1rem',
      marginTop: 'auto',
      width: '100%'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 14,
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
            shrink: 0,
            boxShadow: '0 2px 6px rgba(99, 102, 241, 0.4)'
          }}>
            {userInitials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user.nombre}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, textTransform: 'capitalize' }}>
              {user.rol || 'Cliente'}
            </div>
          </div>
        </div>

        <button 
          onClick={logout} 
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: 6,
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
          onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
        >
          <NavIcon name="logout" size={18} />
        </button>
      </div>
    </div>
  );

  // Móvil: barra superior fija + menú lateral deslizable (drawer)
  if (isMobile) {
    return (
      <>
        {/* Barra superior fija en móviles con estilo translúcido */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '62px',
          background: config?.color_sidebar ? `${config.color_sidebar}f2` : 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Botón hamburguesa */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#fff',
              cursor: 'pointer',
              width: 40,
              height: 40,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Abrir menú"
            aria-label="Abrir menú"
          >
            <NavIcon name="menu" size={20} />
          </button>

          {/* Logo y Nombre al centro */}
          <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
              <img src={config.logo_url} alt="Logo" style={{ maxHeight: 30, maxWidth: 30, objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <span style={{ fontSize: 20 }}>{config?.logo_url || '🎉'}</span>
            )}
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 180, letterSpacing: '-0.01em' }}>
              {config?.nombre_empresa || 'Alquila tu Party'}
            </span>
          </Link>

          {/* Derecha: Carrito o Nombre usuario */}
          {user?.rol !== 'admin' ? (
            <Link to="/carrito" style={{ color: '#fff', textDecoration: 'none', position: 'relative', padding: 8, display: 'flex', alignItems: 'center' }}>
              <NavIcon name="cart" size={22} />
              {items.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 999,
                  fontSize: 10,
                  padding: '2px 5px',
                  fontWeight: 700
                }}>{items.length}</span>
              )}
            </Link>
          ) : (
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {userInitials}
            </div>
          )}
        </header>

        {/* Cajón desplegable (Drawer) para móviles */}
        {mobileMenuOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1050 }}>
            {/* Fondo oscuro traslúcido */}
            <div 
              onClick={() => setMobileMenuOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(4px)'
              }}
            />

            {/* Menú lateral que se desliza */}
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: '280px',
              maxWidth: '85vw',
              background: config?.color_sidebar || '#0f172a',
              zIndex: 1060,
              padding: '1.5rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '8px 0 32px rgba(0,0,0,0.3)',
              boxSizing: 'border-box'
            }}>
              {/* Encabezado del menú móvil */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>
                  {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
                    <img src={config.logo_url} alt="Logo" style={{ maxHeight: 32, maxWidth: 32, objectFit: 'contain', borderRadius: 8 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {config?.logo_url || '🎉'}
                    </div>
                  )}
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 170 }}>
                    {config?.nombre_empresa || 'Alquila tu Party'}
                  </span>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    borderRadius: 8,
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Cerrar menú"
                >
                  <NavIcon name="close" size={18} />
                </button>
              </div>

              {/* Enlaces con etiquetas completas */}
              {renderNavLinks()}

              {/* Footer con información de usuario y salir */}
              {renderUserFooter()}
            </div>
          </div>
        )}
      </>
    );
  }

  // Escritorio: Barra lateral moderna
  return (
    <aside style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '260px',
      background: config?.color_sidebar || '#0f172a',
      zIndex: 1000,
      padding: '1.75rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      boxSizing: 'border-box'
    }}>
      {/* Brand Logo con badge moderno */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', width: '100%' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
            <img src={config.logo_url} alt="Logo" style={{ maxHeight: 36, maxWidth: 36, objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
              fontSize: 18
            }}>
              {config?.logo_url || '🎉'}
            </div>
          )}
          <div style={{ overflow: 'hidden' }}>
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block', letterSpacing: '-0.01em' }}>
              {config?.nombre_empresa || 'Alquila tu Party'}
            </span>
            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
              Gestión Integral
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation Links */}
      {renderNavLinks()}

      {/* User Area at Bottom */}
      {renderUserFooter()}
    </aside>
  );
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.rol === 'admin' ? children : <Navigate to="/" replace />;
}

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function HomeRoute() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.rol === 'admin') {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to="/mis-reservas" replace />;
}

function AppContent() {
  const { user } = useAuth();
  const location = useLocation();
  const [width, setWidth] = useState(window.innerWidth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = width < 768;
  const esRutaPublica = location.pathname.startsWith('/formulario-cliente') || location.pathname.startsWith('/registro-cliente') || location.pathname.startsWith('/contrato/');
  const sidebarWidth = (user && !esRutaPublica) ? (isMobile ? '0px' : '260px') : '0px';
  const paddingTop = (user && !esRutaPublica && isMobile) ? '60px' : '0px';

  return (
    <>
      <Navbar isMobile={isMobile} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      <div style={{ 
        minHeight: '100vh', 
        background: '#f7f8fc',
        paddingLeft: sidebarWidth,
        paddingTop: paddingTop,
        transition: 'padding-left 0.3s ease',
        boxSizing: 'border-box'
      }}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
          <Route path="/carrito" element={<ProtectedRoute><Carrito /></ProtectedRoute>} />
          <Route path="/confirmacion/:id" element={<ProtectedRoute><Confirmacion /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/mis-reservas" element={<ProtectedRoute><MisReservas /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
          <Route path="/clientes" element={<AdminRoute><Navigate to="/admin?tab=clientes" replace /></AdminRoute>} />
          <Route path="/sucursales" element={<AdminRoute><Navigate to="/admin?tab=sucursales" replace /></AdminRoute>} />
          <Route path="/formulario-cliente" element={<FormularioCliente />} />
          <Route path="/registro-cliente" element={<Navigate to="/formulario-cliente" replace />} />
          <Route path="/contrato/:id" element={<ContratoPublico />} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-right" />
            <AppContent />
          </CartProvider>
        </AuthProvider>
      </ConfigProvider>
    </BrowserRouter>
  );
}
