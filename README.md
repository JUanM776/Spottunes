<div align="center">

# 🎵 Spot-Tunes

**Un reproductor de música web moderno inspirado en Spotify**

Busca, reproduce y organiza tu música favorita con previews de 30 segundos desde iTunes.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

</div>

---

## 📸 Vista previa

| Home | Playlist Detail | Perfil de Artista |
|------|----------------|-------------------|
| Saludo personalizado, acceso rápido, géneros y tendencias | Hero dinámico, tracklist con filtros y ordenamiento | Canciones del artista con artwork en alta resolución |

---

## ✨ Características

### 🎧 Reproducción
- Búsqueda en tiempo real con la API de iTunes (previews de 30s)
- Reproducción automática al agregar canciones
- Modos shuffle y repeat (todo / una canción)
- Cola de reproducción con panel lateral
- Crossfade entre canciones
- Visualizador de audio con Web Audio API (waveform en sidebar + barras en fullscreen)
- Barras ecualizadoras animadas en la canción actual

### 📋 Playlists
- Crear, eliminar y gestionar playlists personalizadas
- Playlists automáticas por género musical (10 géneros)
- Perfiles de artista desde la sección de tendencias
- Drag & drop para reordenar canciones
- Filtrar y ordenar canciones (por título, artista)
- Favoritos con acceso rápido
- Persistencia completa en localStorage

### 🎨 Interfaz
- Diseño de 3 columnas: iconbar compacta + contenido + sidebar derecho
- Sistema de vistas: Home y Playlist Detail con navegación fluida
- Hero banner con color dinámico extraído del artwork
- Gradiente animado en el hero
- Cards de género con imágenes reales
- Notificación flotante al cambiar de canción
- Toasts en vez de alerts nativos
- Modo fullscreen con visualizador
- Responsive design (desktop y mobile)

### 👤 Personalización
- Perfil de usuario con nombre y avatar (iniciales)
- 6 colores de acento seleccionables que cambian toda la interfaz
- Saludo dinámico personalizado (Buenos días/tardes/noches)
- Historial de búsquedas recientes
- Sección "Escuchado recientemente"

### ⌨️ Atajos de teclado
| Atajo | Acción |
|-------|--------|
| `Espacio` | Play / Pausa |
| `←` `→` | Anterior / Siguiente |
| `↑` `↓` | Volumen |
| `S` | Aleatorio |
| `R` | Repetir |
| `F` | Pantalla completa |
| `Ctrl+K` | Buscar |
| `?` | Ver atajos |
| `Esc` | Cerrar paneles |

---

## 🛠️ Tecnologías

- **HTML5** — Estructura semántica
- **CSS3** — Variables CSS, Grid, Flexbox, animaciones, backdrop-filter
- **JavaScript** (Vanilla) — Sin frameworks ni dependencias
- **Web Audio API** — Visualizador de audio en tiempo real
- **iTunes Search API** — Búsqueda de canciones y previews
- **localStorage** — Persistencia de datos del usuario

---

## 📁 Estructura del proyecto

```
spot-tunes/
├── index.html          # Estructura principal de la app
├── styles.css          # Estilos completos
├── playlist.js         # Lógica de la aplicación
├── Spot-tunes.svg      # Logo vectorial
├── pop.jpg             # Imágenes de géneros
├── rock.jpg
├── hiphop.jpg
├── reggaeton.jpg
├── Electronica.jpg
├── R&B.jpg
├── Jazz.jpg
├── Clasica.jpg
├── Latina.jpg
├── indie.jpg
├── package.json
└── README.md
```

---

## 🚀 Instalación

No requiere instalación. Es una aplicación 100% estática.

### Opción 1: Abrir directamente
```
Abre index.html en tu navegador
```

### Opción 2: Servidor local
```bash
# Con Python
python -m http.server 8080

# Con Node.js
npx serve .

# Con VS Code
# Usa la extensión Live Server
```

### Opción 3: Deploy en Vercel
1. Sube el proyecto a GitHub
2. Importa el repositorio en [vercel.com](https://vercel.com)
3. Configura:
   - **Application Preset:** Other
   - **Build Command:** _(vacío)_
   - **Output Directory:** `.`
4. Deploy

---

## 🏗️ Arquitectura

### Estructura de datos
La playlist utiliza una **lista doblemente enlazada** (Doubly Linked List) como estructura de datos principal, permitiendo:
- Inserción O(1) al inicio y final
- Navegación bidireccional entre canciones
- Eliminación eficiente por cursor o por ID
- Reordenamiento mediante drag & drop

### Sistema de vistas
La navegación entre Home y Playlist Detail se maneja con un sistema de vistas basado en DOM, con animaciones CSS de transición.

### Persistencia
Todos los datos del usuario se almacenan en `localStorage`:
- Playlists y canciones
- Favoritos
- Perfil de usuario (nombre, color)
- Historial de reproducción
- Búsquedas recientes
- Preferencias (volumen, shuffle, repeat)

---

## 📄 Licencia

Este proyecto es de código abierto. Úsalo, modifícalo y compártelo libremente.

---

<div align="center">

Hecho con 🎶 por **Spot-Tunes**

</div>
