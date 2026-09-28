import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

export const normalizarMetodosPago = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((m, idx) => {
      if (typeof m === 'string') return { id: `m-${idx}`, nombre: m, detalle: '' };
      return {
        id: m.id || `m-${idx}`,
        nombre: m.nombre || m.metodo || '',
        detalle: m.detalle || ''
      };
    }).filter(m => (m.nombre && m.nombre.trim().length > 0) || (m.detalle && m.detalle.trim().length > 0));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizarMetodosPago(parsed);
      } catch (e) {}
    }
    // Soporte para formato legacy ej: "Yappy / Efectivo / Banco General"
    let pieces = [trimmed];
    const splitters = ['\n', '·', '/', ','];
    for (const s of splitters) {
      if (pieces.some(p => p.includes(s))) {
        pieces = pieces.flatMap(p => p.split(s));
      }
    }
    return pieces
      .map((p, idx) => ({ id: `m-${idx}`, nombre: p.trim(), detalle: '' }))
      .filter(p => p.nombre.length > 0);
  }
  return [];
};

export const formatearMetodosPagoTexto = (metodos) => {
  const arr = normalizarMetodosPago(metodos);
  if (!arr.length) return '';
  return arr.map(m => {
    if (m.nombre && m.detalle) return `${m.nombre}: ${m.detalle}`;
    return m.nombre || m.detalle;
  }).join(' · ');
};

export const DEFAULT_CONFIG = {
  nombre_empresa: 'Alquila tu Party',
  logo_url: '🎉',
  eslogan: 'Alquiler de Mobiliario y Eventos',
  color_primario: '#4a6cf7',
  color_sidebar: '#1a1a2e',
  telefono_contacto: '',
  email_contacto: '',
  direccion_empresa: '',
  instagram_empresa: '',
  metodos_pago: [],
  sitio_web: '',
  moneda_simbolo: '$',
};

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const cached = localStorage.getItem('app_config');
    if (cached) {
      try {
        const parsed = { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
        parsed.metodos_pago = normalizarMetodosPago(parsed.metodos_pago);
        return parsed;
      } catch (e) {
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  const [loading, setLoading] = useState(false);

  const fetchConfig = async () => {
    try {
      const { data } = await api.get('/configuracion');
      if (data && typeof data === 'object') {
        const merged = { ...DEFAULT_CONFIG, ...data };
        merged.metodos_pago = normalizarMetodosPago(merged.metodos_pago);
        setConfig(merged);
        localStorage.setItem('app_config', JSON.stringify(merged));
      }
    } catch (err) {
      console.warn('No se pudo conectar a /api/configuracion, usando caché/default:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const saveConfig = async (newConfigValues) => {
    setLoading(true);
    try {
      const merged = { ...config, ...newConfigValues };
      await api.put('/configuracion', merged);
      setConfig(merged);
      try {
        localStorage.setItem('app_config', JSON.stringify(merged));
      } catch (storageErr) {
        console.warn('No se pudo guardar en localStorage (cuota excedida?):', storageErr);
      }
      return { ok: true };
    } catch (err) {
      console.error('Error al guardar configuración:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigContext.Provider value={{ config, saveConfig, refreshConfig: fetchConfig, loading }}>
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
