import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import Catalogo from './pages/Catalogo';
import Carrito from './pages/Carrito';
import Confirmacion from './pages/Confirmacion';
import Login from './pages/Login';
import MisReservas from './pages/MisReservas';
import AdminPanel from './pages/AdminPanel';

function Navbar({ isMobile }) {
  const { user, logout } = useAuth();
  const { items } = useCart();

  if (!user) return null;

  const sidebarWidth = isMobile ? '70px' : '260px';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: sidebarWidth,
      background: '#1a1a2e',
      zIndex: 1000,
      padding: isMobile ? '2rem 0.5rem' : '2rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: isMobile ? 'center' : 'stretch',
      boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      boxSizing: 'border-box',
      transition: 'width 0.3s ease, padding 0.3s ease'
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem', width: '100%' }}>
        <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: isMobile ? '1.5rem' : '1.25rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          {isMobile ? '🎉' : '🎉 Alquila tu Party'}
        </Link>
      </div>

      {/* Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, width: '100%' }}>
        <Link to="/catalogo" style={{
          color: '#ccc',
          textDecoration: 'none',
          padding: '12px',
          borderRadius: 8,
          fontSize: 16,
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'flex-start',
          alignItems: 'center',
          gap: isMobile ? 0 : 12,
          transition: 'background 0.2s'
        }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          title="Catálogo"
        >
          <span>🛍️</span>
          {!isMobile && <span>Catálogo</span>}
        </Link>

        <Link to="/mis-reservas" style={{
          color: '#ccc',
          textDecoration: 'none',
          padding: '12px',
          borderRadius: 8,
          fontSize: 16,
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'flex-start',
          alignItems: 'center',
          gap: isMobile ? 0 : 12,
          transition: 'background 0.2s'
        }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          title="Mis reservas"
        >
          <span>📋</span>
          {!isMobile && <span>Mis reservas</span>}
        </Link>

        {user?.rol === 'admin' && (
          <Link to="/admin" style={{
            color: '#f4c430',
            textDecoration: 'none',
            padding: '12px',
            borderRadius: 8,
            fontSize: 16,
            display: 'flex',
            justifyContent: isMobile ? 'center' : 'flex-start',
            alignItems: 'center',
            gap: isMobile ? 0 : 12,
            transition: 'background 0.2s'
          }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            title="Administración"
          >
            <span>⚙️</span>
            {!isMobile && <span>Admin</span>}
          </Link>
        )}

        <Link to="/carrito" style={{
          color: '#ccc',
          textDecoration: 'none',
          padding: '12px',
          borderRadius: 8,
          fontSize: 16,
          display: 'flex',
          justifyContent: isMobile ? 'center' : 'flex-start',
          alignItems: 'center',
          gap: isMobile ? 0 : 12,
          position: 'relative',
          transition: 'background 0.2s'
        }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          title="Carrito"
        >
          <span>🛒</span>
          {!isMobile && <span>Carrito</span>}
          {items.length > 0 && (
            <span style={{
              position: isMobile ? 'absolute' : 'static',
              top: isMobile ? 4 : 'auto',
              right: isMobile ? 4 : 'auto',
              background: '#e53e3e',
              color: '#fff',
              borderRadius: '50%',
              fontSize: 10,
              padding: isMobile ? '2px 5px' : '2px 6px',
              fontWeight: 700,
              marginLeft: isMobile ? 0 : 6
            }}>{items.length}</span>
          )}
        </Link>
      </div>

      {/* User Area at Bottom */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: 'auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'center' : 'stretch', gap: 12 }}>
          {!isMobile ? (
            <>
              <span style={{ color: '#aaa', fontSize: 13, padding: '0 8px' }}>Hola, <strong>{user.nombre}</strong></span>
              <button 
                onClick={logout} 
                style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, width: '100%', fontWeight: 600 }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button 
              onClick={logout} 
              style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 20, padding: 8 }}
              title="Cerrar sesión"
            >
              🚪
            </button>
          )}
        </div>
      </div>
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
  return <Navigate to="/catalogo" replace />;
}

function AppContent() {
  const { user } = useAuth();
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = width < 768;
  const sidebarWidth = user ? (isMobile ? '70px' : '260px') : '0px';

  return (
    <>
      <Navbar isMobile={isMobile} />
      <div style={{ 
        minHeight: '100vh', 
        background: '#f7f8fc',
        paddingLeft: sidebarWidth,
        transition: 'padding-left 0.3s ease'
      }}>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/catalogo" element={<ProtectedRoute><Catalogo /></ProtectedRoute>} />
          <Route path="/carrito" element={<ProtectedRoute><Carrito /></ProtectedRoute>} />
          <Route path="/confirmacion/:id" element={<ProtectedRoute><Confirmacion /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/mis-reservas" element={<ProtectedRoute><MisReservas /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
        </Routes>
      </div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-right" />
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
