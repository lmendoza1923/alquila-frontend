import { useState } from 'react';
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

function Navbar() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const [menuAbierto, setMenuAbierto] = useState(false);

  return (
    <>
      <nav style={{ background: '#1a1a2e', padding: '0.75rem 2rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            🎉 Alquila tu Party
          </Link>

          {/* Botón hamburguesa */}
          <button
            onClick={() => setMenuAbierto(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 5, padding: 8 }}
            aria-label="Menú"
          >
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#fff', borderRadius: 2 }} />
          </button>
        </div>
      </nav>

      {/* Backdrop / Overlay */}
      {menuAbierto && (
        <div 
          onClick={() => setMenuAbierto(false)} 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(0,0,0,0.5)', 
            backdropFilter: 'blur(4px)',
            zIndex: 999 
          }} 
        />
      )}

      {/* Sidebar Lateral */}
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '280px',
        background: '#1a1a2e',
        zIndex: 1000,
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.3)',
        transform: menuAbierto ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out',
        boxSizing: 'border-box'
      }}>
        {/* Cabecera del sidebar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>🎉 Menú</span>
          <button 
            onClick={() => setMenuAbierto(false)} 
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', padding: 4 }}
          >
            ✕
          </button>
        </div>

        {/* Links de navegación */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          <Link to="/catalogo" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', padding: '12px 16px', borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            🛍️ Catálogo
          </Link>

          {user && (
            <Link to="/mis-reservas" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', padding: '12px 16px', borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              📋 Mis reservas
            </Link>
          )}

          {user?.rol === 'admin' && (
            <Link to="/admin" onClick={() => setMenuAbierto(false)} style={{ color: '#f4c430', textDecoration: 'none', padding: '12px 16px', borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              ⚙️ Admin
            </Link>
          )}

          <Link to="/carrito" onClick={() => setMenuAbierto(false)} style={{ color: '#ccc', textDecoration: 'none', padding: '12px 16px', borderRadius: 8, fontSize: 16, display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            🛒 Carrito
            {items.length > 0 && (
              <span style={{ background: '#e53e3e', color: '#fff', borderRadius: '50%', fontSize: 11, padding: '2px 6px', fontWeight: 700, marginLeft: 6 }}>{items.length}</span>
            )}
          </Link>
        </div>

        {/* Sección inferior del usuario */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: 'auto' }}>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ color: '#aaa', fontSize: 14 }}>Hola, <strong>{user.nombre}</strong></span>
              <button 
                onClick={() => { logout(); setMenuAbierto(false); }} 
                style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 14, width: '100%', fontWeight: 600 }}
              >
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link to="/login" onClick={() => setMenuAbierto(false)} style={{ background: '#4a6cf7', color: '#fff', padding: '12px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: 14, display: 'block', textAlign: 'center' }}>
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </>
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Toaster position="top-right" />
          <Navbar />
          <div style={{ minHeight: '100vh', background: '#f7f8fc' }}>
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
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
