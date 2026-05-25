import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [fechas, setFechas] = useState({ inicio: null, fin: null });

  const agregar = (mueble, cantidad = 1) => {
    setItems(prev => {
      const existe = prev.find(i => i.mueble_id === mueble.id);
      if (existe) return prev.map(i => i.mueble_id === mueble.id ? { ...i, cantidad: i.cantidad + cantidad } : i);
      return [...prev, { mueble_id: mueble.id, nombre: mueble.nombre, precio_dia: mueble.precio_dia, imagenes: mueble.imagenes, cantidad }];
    });
  };

  const quitar = (mueble_id) => setItems(prev => prev.filter(i => i.mueble_id !== mueble_id));

  const actualizar = (mueble_id, cantidad) => {
    if (cantidad <= 0) return quitar(mueble_id);
    setItems(prev => prev.map(i => i.mueble_id === mueble_id ? { ...i, cantidad } : i));
  };

  const vaciar = () => setItems([]);

  const calcularTotal = () => {
    if (!fechas.inicio || !fechas.fin) return 0;
    const dias = Math.ceil((new Date(fechas.fin) - new Date(fechas.inicio)) / 86400000) + 1;
    return items.reduce((sum, i) => sum + i.precio_dia * i.cantidad * dias, 0).toFixed(2);
  };

  return (
    <CartContext.Provider value={{ items, fechas, setFechas, agregar, quitar, actualizar, vaciar, calcularTotal, diasSeleccionados: fechas.inicio && fechas.fin ? Math.ceil((new Date(fechas.fin) - new Date(fechas.inicio)) / 86400000) + 1 : 0 }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
