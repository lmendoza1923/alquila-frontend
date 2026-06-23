import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [fechas, setFechas] = useState({ inicio: null, fin: null });

  const agregar = (item, cantidad = 1, esCombo = false) => {
    setItems(prev => {
      if (esCombo) {
        const existe = prev.find(i => i.combo_id === item.id);
        if (existe) return prev.map(i => i.combo_id === item.id ? { ...i, cantidad: i.cantidad + cantidad } : i);
        return [...prev, { combo_id: item.id, nombre: item.nombre, precio_dia: item.precio_dia, imagenes: item.imagenes || [], cantidad, esCombo: true }];
      } else {
        const existe = prev.find(i => i.mueble_id === item.id);
        if (existe) return prev.map(i => i.mueble_id === item.id ? { ...i, cantidad: i.cantidad + cantidad } : i);
        return [...prev, { mueble_id: item.id, nombre: item.nombre, precio_dia: item.precio_dia, imagenes: item.imagenes || [], cantidad, esCombo: false }];
      }
    });
  };

  const quitar = (id, esCombo = false) => {
    setItems(prev => prev.filter(i => esCombo ? i.combo_id !== id : i.mueble_id !== id));
  };

  const actualizar = (id, cantidad, esCombo = false) => {
    if (cantidad <= 0) return quitar(id, esCombo);
    setItems(prev => prev.map(i => {
      const match = esCombo ? (i.combo_id === id) : (i.mueble_id === id);
      return match ? { ...i, cantidad } : i;
    }));
  };

  const vaciar = () => setItems([]);

  const calcularTotal = () => {
    if (!fechas.inicio || !fechas.fin) return 0;
    const dias = Math.ceil((new Date(fechas.fin) - new Date(fechas.inicio)) / 86400000) + 1;
    return items.reduce((sum, i) => sum + parseFloat(i.precio_dia) * i.cantidad * dias, 0).toFixed(2);
  };

  return (
    <CartContext.Provider value={{ 
      items, 
      fechas, 
      setFechas, 
      agregar, 
      quitar, 
      actualizar, 
      vaciar, 
      calcularTotal, 
      diasSeleccionados: fechas.inicio && fechas.fin ? Math.ceil((new Date(fechas.fin) - new Date(fechas.inicio)) / 86400000) + 1 : 0 
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
