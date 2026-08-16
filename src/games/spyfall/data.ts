export type SpyfallLocation = {
  id: string;
  name: string;
  roles: readonly string[];
};

export const SPYFALL_LOCATIONS: readonly SpyfallLocation[] = [
  {
    id: 'playa',
    name: 'Playa',
    roles: ['Bañista', 'Socorrista', 'Heladero', 'Surfista', 'Fotógrafo', 'Chiringuito', 'Niño con cubo', 'Vendedor ambulante'],
  },
  {
    id: 'hospital',
    name: 'Hospital',
    roles: ['Médico', 'Enfermero', 'Paciente', 'Cirujano', 'Recepcionista', 'Familiar', 'Celador', 'Farmacéutico'],
  },
  {
    id: 'colegio',
    name: 'Colegio',
    roles: ['Profesor', 'Alumno', 'Director', 'Conserje', 'Cocinero', 'Padre', 'Bibliotecario', 'Entrenador'],
  },
  {
    id: 'avion',
    name: 'Avión',
    roles: ['Piloto', 'Azafata', 'Pasajero', 'Copiloto', 'Seguridad', 'Bebé llorón', 'Turista', 'Mecánico'],
  },
  {
    id: 'restaurante',
    name: 'Restaurante',
    roles: ['Camarero', 'Chef', 'Cliente', 'Sumiller', 'Lavaplatos', 'Crítico', 'Hostess', 'Repartidor'],
  },
  {
    id: 'cine',
    name: 'Cine',
    roles: ['Taquillero', 'Acomodador', 'Espectador', 'Proyeccionista', 'Palomitas', 'Crítico', 'Actor en cameo', 'Limpieza'],
  },
  {
    id: 'supermercado',
    name: 'Supermercado',
    roles: ['Cajero', 'Reponedor', 'Cliente', 'Seguridad', 'Gerente', 'Carnicero', 'Repartidor', 'Ladronzuelo'],
  },
  {
    id: 'oficina',
    name: 'Oficina',
    roles: ['Jefe', 'Becario', 'RRHH', 'Informático', 'Contable', 'Comercial', 'Recepcionista', 'Limpiador'],
  },
  {
    id: 'zoo',
    name: 'Zoo',
    roles: ['Cuidador', 'Visitante', 'Veterinario', 'Guía', 'Fotógrafo', 'Niño perdido', 'Vendedor de chuches', 'Director'],
  },
  {
    id: 'boda',
    name: 'Boda',
    roles: ['Novio', 'Novia', 'Padrino', 'Fotógrafo', 'DJ', 'Camarero', 'Invitado', 'Cura'],
  },
  {
    id: 'gimnasio',
    name: 'Gimnasio',
    roles: ['Entrenador', 'Socio', 'Recepcionista', 'Fisioterapeuta', 'Influencer', 'Limpieza', 'Nutricionista', 'Principiantes'],
  },
  {
    id: 'barco',
    name: 'Barco pirata',
    roles: ['Capitán', 'Contramaestre', 'Cocinero', 'Cañonero', 'Prisionero', 'Loro', 'Timonel', 'Novato'],
  },
  {
    id: 'estacion',
    name: 'Estación de tren',
    roles: ['Revisor', 'Viajero', 'Maquinista', 'Vendedor', 'Limpieza', 'Policía', 'Mochilero', 'Turista perdido'],
  },
  {
    id: 'spa',
    name: 'Spa',
    roles: ['Masajista', 'Cliente', 'Recepcionista', 'Esteticista', 'Socorrista de piscina', 'Chef detox', 'Influencer', 'Gerente'],
  },
  {
    id: 'teatro',
    name: 'Teatro',
    roles: ['Actor', 'Director', 'Tramoyista', 'Público', 'Maestro de ceremonias', 'Vestuario', 'Taquilla', 'Crítico'],
  },
  {
    id: 'casino',
    name: 'Casino',
    roles: ['Crupier', 'Jugador', 'Seguridad', 'Camarero', 'Cantante', 'Gerente', 'Tramposo', 'Afortunado'],
  },
];
