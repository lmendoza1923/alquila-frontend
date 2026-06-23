import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const s = {
  page: { maxWidth: 420, margin: '3rem auto', padding: '2rem' },
  card: { background: '#fff', borderRadius: 16, padding: '2rem', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, marginBottom: '1rem', boxSizing: 'border-box' },
  btn: { width: '100%', background: '#4a6cf7', color: '#fff', border: 'none', borderRadius: 8, padding: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' },
  tab: (active) => ({ flex: 1, padding: '10px', border: 'none', background: active ? '#4a6cf7' : '#f0f0f0', color: active ? '#fff' : '#666', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }),
};

export default function Login() {
  const [modo, setModo] = useState('login');
  const [form, setForm] = useState({ nombre: '', email: '', password: '', telefono: '' });
  const { login, register } = useAuth();
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

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: '1.5rem' }}>Acceder</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem' }}>
          <button style={s.tab(modo === 'login')} onClick={() => setModo('login')}>Iniciar sesión</button>
          <button style={s.tab(modo === 'register')} onClick={() => setModo('register')}>Registrarse</button>
        </div>
        <form onSubmit={submit}>
          {modo === 'register' && <>
            <input style={s.input} placeholder="Nombre completo" value={form.nombre} onChange={e => set('nombre', e.target.value)} required />
            <input style={s.input} placeholder="Teléfono" value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </>}
          <input style={s.input} type="email" placeholder="Correo electrónico" value={form.email} onChange={e => set('email', e.target.value)} required />
          <input style={s.input} type="password" placeholder="Contraseña" value={form.password} onChange={e => set('password', e.target.value)} required />
          <button type="submit" style={s.btn}>{modo === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
        </form>
      </div>
    </div>
  );
}
