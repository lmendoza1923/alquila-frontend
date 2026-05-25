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

  return (
    <nav style={{ background: '#1a1a2e', padding: '0.75rem 2rem', display: 'flex', alignItems: 'center', gap: '2rem', position: 'sticky', top: 0, zIndex: 100 }}>
      <Link to="/" style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', textDecoration: 'none' }}>
        🪑 AlquilerMuebles
      </Link>
      <div style={{ flex: 1 }} />
      <Link to="/" style={{ color: '#ccc', textDecoration: 'none' }}>Catálogo</Link>
      {user && <Link to="/mis-reservas" style={{ color: '#ccc', textDecoration: 'none' }}>Mis reservas</Link>}
      {user?.rol === 'admin' && <Link to="/admin" style={{ color: '#f4c430', textDecoration: 'none' }}>Admin</Link>}
      <Link to="/carrito" style={{ color: '#ccc', textDecoration: 'none', position: 'relative' }}>
        🛒 Carrito
        {items.length > 0 && (
          <span style={{ background: '#e53e3e', color: '#fff', borderRadius: '50%', fontSize: '11px', padding: '1px 6px', position: 'absolute', top: '-8px', right: '-12px' }}>{items.length}</span>
        )}
      </Link>
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: '#aaa', fontSize: '14px' }}>Hola, {user.nombre.split(' ')[0]}</span>
          <button onClick={logout} style={{ background: 'transparent', border: '1px solid #555', color: '#ccc', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer' }}>Salir</button>
        </div>
      ) : (
        <Link to="/login" style={{ background: '#4a6cf7', color: '#fff', padding: '6px 16px', borderRadius: '6px', textDecoration: 'none' }}>Ingresar</Link>
      )}
    </nav>
  );
}

function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.rol === 'admin' ? children : <Navigate to="/" />;
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
              <Route path="/" element={<Catalogo />} />
              <Route path="/carrito" element={<Carrito />} />
              <Route path="/confirmacion/:id" element={<Confirmacion />} />
              <Route path="/login" element={<Login />} />
              <Route path="/mis-reservas" element={<MisReservas />} />
              <Route path="/admin" element={<AdminRoute><AdminPanel /></AdminRoute>} />
            </Routes>
          </div>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
