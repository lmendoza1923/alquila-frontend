import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

export const DEFAULT_CONFIG = {
  nombre_empresa: 'Alquila tu Party',
  logo_url: '🎉',
  eslogan: 'Alquiler de Mobiliario y Eventos',
  color_primario: '#4a6cf7',
  color_sidebar: '#1a1a2e',
  telefono_contacto: '+507 6000-0000',
  email_contacto: 'contacto@alquilatuparty.com',
  direccion_empresa: 'Ciudad de Panamá, Panamá',
  moneda_simbolo: '$',
};

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(() => {
    const cached = localStorage.getItem('app_config');
    if (cached) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(cached) };
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
      localStorage.setItem('app_config', JSON.stringify(merged));
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
