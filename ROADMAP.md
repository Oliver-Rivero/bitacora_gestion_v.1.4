# Hoja de Ruta - Bitácora Gestión 🚀

Este documento detalla las ideas y funcionalidades planificadas para futuras versiones de la aplicación.

## 📱 Versión Móvil & Ecosistema

### 1. App Móvil (React Native / Capacitor)
- Interfaz optimizada para pantallas pequeñas.
- Acceso rápido a saldos y últimos movimientos.
- Registro de gastos en movilidad.

### 2. Widget de Acceso Rápido
- Widget para iOS/Android para añadir transacciones sin abrir la app.
- Atajos para categorías frecuentes (Café, Transporte, Almuerzo).

### 3. Foto a Factura (OCR)
- Integración de escaneo de recibos mediante cámara.
- Procesamiento inteligente de texto (ML Kit) para extraer:
    - Importe total.
    - Fecha.
    - Comercio/Proveedor.

## ☁️ Infraestructura & Sincronización

### 1. Sincronización en la Nube
- Migración opcional de SQLite local a un backend compartido (ej: **Supabase**).
- Permite el uso simultáneo en múltiples dispositivos (Escritorio + Móvil).
- Copias de seguridad automáticas en la nube.

### 2. Multi-usuario / Compartido
- Posibilidad de gestionar presupuestos familiares compartidos entre diferentes cuentas.

## 📊 Mejoras en Análisis

### 1. Categorización Inteligente
- Sugerencias automáticas de categoría basadas en el historial de transacciones similares.

### 2. Informes Mensuales Automáticos
- Generación de un PDF o resumen visual al final de cada mes con los hitos financieros.
