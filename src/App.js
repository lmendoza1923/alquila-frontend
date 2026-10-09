import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Confirmacion from './pages/Confirmacion';
import Login from './pages/Login';
import MisReservas from './pages/MisReservas';
import AdminPanel from './pages/AdminPanel';
import FormularioCliente from './pages/FormularioCliente';

function Navbar({ isMobile, mobileMenuOpen, setMobileMenuOpen }) {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const { config } = useConfig();
  const location = useLocation();

  useEffect(() => {
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  }, [location, isMobile, setMobileMenuOpen]);

  if (!user) return null;

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
    color: active ? '#fff' : '#ccc',
    background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
    textDecoration: 'none',
    padding: '12px 14px',
    paddingLeft: isSubmenu && !isMobile ? '32px' : '14px',
    borderRadius: 8,
    fontSize: 15,
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    transition: 'background 0.2s, color 0.2s',
    fontWeight: active ? 600 : 500,
    opacity: isSubmenu ? 0.95 : 1,
    minHeight: 44
  });

  const renderNavLinks = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, width: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      {user?.rol !== 'admin' && (
        <Link to="/mis-reservas" style={linkStyle(isActive('/mis-reservas'))} onClick={() => isMobile && setMobileMenuOpen(false)}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span>Mis reservas</span>
        </Link>
      )}

      {user?.rol === 'admin' && (
        <>
          <Link to="/admin" style={linkStyle(isActive('/admin'))} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>⚙️</span>
            <span>Admin</span>
          </Link>

          <Link to="/admin?tab=dashboard" style={linkStyle(isActive('/admin', 'dashboard'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span>Resumen</span>
          </Link>

          <Link to="/admin?tab=reservas" style={linkStyle(isActive('/admin', 'reservas'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span>Reservas</span>
          </Link>

          <Link to="/admin?tab=clientes" style={linkStyle(isActive('/admin', 'clientes'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>👥</span>
            <span>Clientes</span>
          </Link>

          <Link to="/admin?tab=mobiliario" style={linkStyle(isActive('/admin', 'mobiliario'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>🪑</span>
            <span>Mobiliario</span>
          </Link>

          <Link to="/admin?tab=sucursales" style={linkStyle(isActive('/admin', 'sucursales'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>🏢</span>
            <span>Sucursales</span>
          </Link>

          <Link to="/admin?tab=combos" style={linkStyle(isActive('/admin', 'combos'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>🎁</span>
            <span>Combos y Paquetes</span>
          </Link>

          <Link to="/admin?tab=reportes" style={linkStyle(isActive('/admin', 'reportes'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>📈</span>
            <span>Reportes</span>
          </Link>

          <Link to="/admin?tab=terminos" style={linkStyle(isActive('/admin', 'terminos'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>📄</span>
            <span>Términos de Contrato</span>
          </Link>

          <Link to="/admin?tab=configuracion" style={linkStyle(isActive('/admin', 'configuracion'), true)} onClick={() => isMobile && setMobileMenuOpen(false)}>
            <span style={{ fontSize: 18 }}>🎨</span>
            <span>Configuración</span>
          </Link>
        </>
      )}

      {user?.rol !== 'admin' && (
        <Link to="/carrito" style={linkStyle(isActive('/carrito'))} onClick={() => isMobile && setMobileMenuOpen(false)}>
          <span style={{ fontSize: 18 }}>🛒</span>
          <span>Carrito</span>
          {items.length > 0 && (
            <span style={{
              background: '#e53e3e',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 11,
              padding: '2px 7px',
              fontWeight: 700,
              marginLeft: 'auto'
            }}>{items.length}</span>
          )}
        </Link>
      )}
    </div>
  );

  const renderUserFooter = () => (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem', marginTop: 'auto', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ color: '#aaa', fontSize: 13, padding: '0 4px' }}>Hola, <strong>{user.nombre}</strong></span>
        <button 
          onClick={logout} 
          style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, width: '100%', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  // Móvil: barra superior fija + menú lateral deslizable (drawer)
  if (isMobile) {
    return (
      <>
        {/* Barra superior fija en móviles */}
        <header style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: config?.color_sidebar || '#1a1a2e',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Botón hamburguesa */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: 'none',
              color: '#fff',
              fontSize: 22,
              cursor: 'pointer',
              width: 42,
              height: 42,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Abrir menú"
            aria-label="Abrir menú"
          >
            ☰
          </button>

          {/* Logo y Nombre al centro */}
          <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.05rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
              <img src={config.logo_url} alt="Logo" style={{ maxHeight: 24, maxWidth: 24, objectFit: 'contain', borderRadius: 4 }} />
            ) : (
              <span>{config?.logo_url || '🎉'}</span>
            )}
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {config?.nombre_empresa || 'Alquila tu Party'}
            </span>
          </Link>

          {/* Derecha: Carrito o Nombre usuario */}
          {user?.rol !== 'admin' ? (
            <Link to="/carrito" style={{ color: '#fff', textDecoration: 'none', position: 'relative', padding: 8, fontSize: 20 }}>
              🛒
              {items.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  background: '#e53e3e',
                  color: '#fff',
                  borderRadius: '50%',
                  fontSize: 10,
                  padding: '2px 5px',
                  fontWeight: 700
                }}>{items.length}</span>
              )}
            </Link>
          ) : (
            <div style={{ color: '#ccc', fontSize: 13, fontWeight: 600 }}>
              {user.nombre?.split(' ')[0]}
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
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(3px)'
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
              background: config?.color_sidebar || '#1a1a2e',
              zIndex: 1060,
              padding: '1.5rem 1.25rem',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
              boxSizing: 'border-box'
            }}>
              {/* Encabezado del menú móvil */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: '1.05rem' }}>
                  {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
                    <img src={config.logo_url} alt="Logo" style={{ maxHeight: 24, maxWidth: 24, objectFit: 'contain', borderRadius: 4 }} />
                  ) : (
                    <span>{config?.logo_url || '🎉'}</span>
                  )}
                  <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 170 }}>
                    {config?.nombre_empresa || 'Alquila tu Party'}
                  </span>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: 'none',
                    color: '#fff',
                    fontSize: 18,
                    cursor: 'pointer',
                    borderRadius: '50%',
                    width: 34,
                    height: 34,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Cerrar menú"
                >
                  ✕
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

  // Escritorio: Barra lateral clásica de 260px
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: '260px',
      background: config?.color_sidebar || '#1a1a2e',
      zIndex: 1000,
      padding: '2rem 1.25rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      boxSizing: 'border-box'
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem', width: '100%' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.15rem', textDecoration: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          {config?.logo_url && (config.logo_url.startsWith('http') || config.logo_url.startsWith('data:')) ? (
            <img src={config.logo_url} alt="Logo" style={{ maxHeight: 28, maxWidth: 28, objectFit: 'contain', borderRadius: 4 }} />
          ) : (
            <span>{config?.logo_url || '🎉'}</span>
          )}
          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{config?.nombre_empresa || 'Alquila tu Party'}</span>
        </Link>
      </div>

      {/* Navigation Links */}
      {renderNavLinks()}

      {/* User Area at Bottom */}
      {renderUserFooter()}
    </div>
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
  const [width, setWidth] = useState(window.innerWidth);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = width < 768;
  const sidebarWidth = user ? (isMobile ? '0px' : '260px') : '0px';
  const paddingTop = user && isMobile ? '60px' : '0px';

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
