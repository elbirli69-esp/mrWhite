export type CamaleonCategory = {
  id: string;
  name: string;
  words: readonly string[];
};

/** Tableros de 16 palabras (estilo Camaleón). */
export const CAMALEON_CATEGORIES: readonly CamaleonCategory[] = [
  {
    id: 'comida',
    name: 'Comida',
    words: [
      'Pizza', 'Sushi', 'Tacos', 'Paella', 'Hamburguesa', 'Pasta', 'Ensalada', 'Curry',
      'Croissant', 'Gazpacho', 'Ramen', 'Empanada', 'Falafel', 'Tortilla', 'Ceviche', 'Bocadillo',
    ],
  },
  {
    id: 'animales',
    name: 'Animales',
    words: [
      'Perro', 'Gato', 'León', 'Elefante', 'Pingüino', 'Delfín', 'Águila', 'Serpiente',
      'Caballo', 'Oso', 'Tiburón', 'Búho', 'Jirafa', 'Koala', 'Cocodrilo', 'Mariposa',
    ],
  },
  {
    id: 'viajes',
    name: 'Viajes',
    words: [
      'Playa', 'Montaña', 'Hotel', 'Aeropuerto', 'Mochila', 'Pasaporte', 'Mapa', 'Crucero',
      'Camping', 'Museo', 'Taxi', 'Souvenir', 'Selfie', 'Guía', 'Maleta', 'Hostel',
    ],
  },
  {
    id: 'cine',
    name: 'Cine',
    words: [
      'Terror', 'Comedia', 'Palomitas', 'Trailer', 'Director', 'Oscar', 'Secuela', 'Extra',
      'Guion', 'Estreno', 'Doblaje', 'Cameo', 'Blockbuster', 'Indie', 'Crítica', 'Remake',
    ],
  },
  {
    id: 'deportes',
    name: 'Deportes',
    words: [
      'Fútbol', 'Tenis', 'Natación', 'Baloncesto', 'Ciclismo', 'Boxeo', 'Yoga', 'Golf',
      'Esquí', 'Running', 'Voleibol', 'Surf', 'Ajedrez', 'Atletismo', 'Hockey', 'Rugby',
    ],
  },
  {
    id: 'casa',
    name: 'Casa',
    words: [
      'Cocina', 'Sofá', 'Ventana', 'Almohada', 'Nevera', 'Ducha', 'Escalera', 'Balcón',
      'Lámpara', 'Armario', 'Alfombra', 'Espejo', 'Lavadora', 'Jardín', 'Desván', 'Pasillo',
    ],
  },
  {
    id: 'musica',
    name: 'Música',
    words: [
      'Guitarra', 'Concierto', 'Batería', 'Micrófono', 'Playlist', 'Rap', 'Ópera', 'Festival',
      'Auricular', 'DJ', 'Coro', 'Piano', 'Vinilo', 'Karaoke', 'Saxofón', 'Remix',
    ],
  },
  {
    id: 'escuela',
    name: 'Escuela',
    words: [
      'Examen', 'Recreo', 'Mochila', 'Pizarra', 'Profesor', 'Biblioteca', 'Deberes', 'Comedor',
      'Notas', 'Uniforme', 'Laboratorio', 'Autobús', 'Directora', 'Tiza', 'Patio', 'Agenda',
    ],
  },
  {
    id: 'ciudad',
    name: 'Ciudad',
    words: [
      'Metro', 'Parque', 'Semáforo', 'Terraza', 'Farmacia', 'Mercado', 'Puente', 'Estadio',
      'Ayuntamiento', 'Fuente', 'Rascacielos', 'Callejón', 'Museo', 'Plaza', 'Bici', 'Taxi',
    ],
  },
  {
    id: 'naturaleza',
    name: 'Naturaleza',
    words: [
      'Bosque', 'Río', 'Volcán', 'Desierto', 'Cascada', 'Arrecife', 'Glaciar', 'Selva',
      'Cueva', 'Pradera', 'Isla', 'Lago', 'Cañón', 'Arce', 'Coral', 'Aurora',
    ],
  },
  {
    id: 'trabajo',
    name: 'Trabajo',
    words: [
      'Reunión', 'Email', 'Jefe', 'Deadline', 'Oficina', 'Café', 'Nómina', 'Portátil',
      'Vacaciones', 'Currículum', 'Zoom', 'Ascensor', 'Impresora', 'Becario', 'Fichaje', 'Equipo',
    ],
  },
  {
    id: 'fiesta',
    name: 'Fiesta',
    words: [
      'Tarta', 'Globo', 'Disfraz', 'Karaoke', 'Piñata', 'Brindis', 'DJ', 'Confeti',
      'Invitación', 'Fotomatón', 'Cóctel', 'After', 'Playlist', 'Regalo', 'Baile', 'Host',
    ],
  },
];
