import type { SpyfallLocation } from './data';

/** Lugares +18 para Spyfall (solo con Versión adultos). */
export const ADULT_SPYFALL_LOCATIONS: readonly SpyfallLocation[] = [
  {
    id: 'puticlub',
    name: 'Puticlub',
    roles: ['Bailarina erótica', 'Cliente borracho', 'Portero', 'Camarera', 'DJ', 'Gerente', 'Ligurón', 'Seguridad'],
  },
  {
    id: 'darkroom',
    name: 'Cuarto oscuro',
    roles: ['Habitual', 'Novato nervioso', 'Barman', 'Portero', 'Mirón', 'Exhibicionista', 'Pareja', 'Limpiador'],
  },
  {
    id: 'sauna',
    name: 'Sauna gay',
    roles: ['Cliente', 'Masajista', 'Recepcionista', 'Socorrista', 'Limpiador', 'Mirón', 'Habitual', 'Turista'],
  },
  {
    id: 'motel',
    name: 'Motel por horas',
    roles: ['Recepcionista', 'Amante', 'Infiel', 'Limpiadora', 'Seguridad', 'Acompañante de pago', 'Cliente nervioso', 'Camarero del bar'],
  },
  {
    id: 'despedida',
    name: 'Despedida de soltero/a',
    roles: ['Novio/a', 'Padrino', 'Bailarina erótica', 'Amigo borracho', 'Organizador', 'Camarera', 'Fotógrafo', 'El que graba'],
  },
  {
    id: 'sexshop',
    name: 'Tienda erótica',
    roles: ['Dependiente', 'Cliente tímido', 'Cliente experto', 'Repartidor', 'Influencer', 'Pareja curiosa', 'Limpieza', 'Gerente'],
  },
  {
    id: 'rodaje',
    name: 'Rodaje porno',
    roles: ['Actor', 'Actriz', 'Director', 'Camarógrafo', 'Maquillaje', 'Productor', 'Guionista', 'Técnico de luces'],
  },
  {
    id: 'bdsm',
    name: 'Mazmorra sadomaso',
    roles: ['Dominadora', 'Sumiso', 'Maestro de la mazmorra', 'Novato', 'Fotógrafo', 'Barman', 'Seguridad', 'Mirón'],
  },
  {
    id: 'after',
    name: 'Fiesta ilegal de madrugada',
    roles: ['DJ', 'Portero', 'Camello', 'Borracho', 'Organizador', 'Policía infiltrado', 'Influencer', 'Limpiador'],
  },
  {
    id: 'glory',
    name: 'Agujero del placer',
    roles: ['Participante A', 'Participante B', 'Mirón', 'Limpiador', 'Portero', 'Nervioso', 'Habitual', 'Pareja'],
  },
  {
    id: 'swingers',
    name: 'Club swingers',
    roles: ['Pareja abierta', 'Soltero', 'Anfitrión', 'Barman', 'Mirón', 'Primera vez', 'Habitual', 'Seguridad'],
  },
  {
    id: 'tinder',
    name: 'Quedada de app de ligue',
    roles: ['Ligue A', 'Ligue B', 'Camarero', 'Amigo espía', 'Ex que aparece', 'Suplantador', 'Influencer', 'Portero'],
  },
  {
    id: 'playa-nudista',
    name: 'Playa nudista',
    roles: ['Nudista veterano', 'Primera vez', 'Voyeur con toalla', 'Socorrista', 'Vendedor ambulante', 'Pareja', 'Fotógrafo pillado', 'Guardia'],
  },
  {
    id: 'jacuzzi',
    name: 'Jacuzzi de hotel',
    roles: ['Huésped caliente', 'Recepcionista', 'Botones', 'Pareja de luna de miel', 'Influencer', 'Limpiador', 'Camarero del bar', 'Vecino mirón'],
  },
  {
    id: 'probador',
    name: 'Probador de tienda',
    roles: ['Cliente', 'Dependiente sospechoso', 'Seguridad', 'Pareja', 'Encargado', 'Mirón del pasillo', 'Repartidor', 'Cajero'],
  },
  {
    id: 'parking',
    name: 'Parking nocturno',
    roles: ['Pareja en el coche', 'Vigilante', 'Mirón', 'Camello', 'Conductor perdido', 'VTC', 'Policía', 'Limpiacoches'],
  },
  {
    id: 'farmacia',
    name: 'Farmacia de guardia',
    roles: ['Farmacéutico', 'Cliente con condones', 'Cliente con test', 'Cliente avergonzado', 'Repartidor', 'Seguridad', 'Pareja nerviosa', 'Turno de noche'],
  },
  {
    id: 'gine',
    name: 'Consulta ginecológica',
    roles: ['Ginecólogo', 'Paciente', 'Enfermera', 'Pareja en sala', 'Recepcionista', 'Celador', 'Estudiante en prácticas', 'Farmacéutico de paso'],
  },
  {
    id: 'uro',
    name: 'Consulta urológica',
    roles: ['Urólogo', 'Paciente nervioso', 'Enfermero', 'Recepcionista', 'Pareja', 'Celador', 'Estudiante', 'Farmacéutico'],
  },
  {
    id: 'telegram',
    name: 'Canal adulto de mensajería',
    roles: ['Administrador', 'Suscriptor', 'Observador silencioso', 'Vendedor de packs', 'Estafador', 'Moderador', 'Novato', 'Robot'],
  },
  {
    id: 'onlyfans-studio',
    name: 'Piso de contenido para fans',
    roles: ['Creador', 'Camarógrafo', 'Editor', 'Representante', 'Compañero de piso', 'Vecino', 'Repartidor', 'Maquillaje'],
  },
  {
    id: 'lovehotel',
    name: 'Hotel del amor',
    roles: ['Recepcionista', 'Pareja', 'Turista confuso', 'Limpiadora', 'Técnico de jacuzzi', 'Vendedor de snack', 'Voyeur de pasillo', 'Gerente'],
  },
  {
    id: 'masaje',
    name: 'Masaje con final feliz',
    roles: ['Masajista', 'Cliente', 'Recepcionista', 'Portero', 'Cliente regular', 'Novato', 'Limpiador', 'Gerente'],
  },
  {
    id: 'tren',
    name: 'Coche de tren vacío',
    roles: ['Viajero A', 'Viajero B', 'Revisor', 'Mirón', 'Turista', 'Conductor', 'Limpiador', 'Policía de andén'],
  },
  {
    id: 'avion',
    name: 'Baño de avión',
    roles: ['Pasajero A', 'Pasajero B', 'Azafata', 'Piloto en pausa', 'Niño llorón fuera', 'Seguridad', 'Mecánico', 'Otro pasajero en cola'],
  },
  {
    id: 'festival',
    name: 'Festival de música (zona after)',
    roles: ['DJ', 'Fiesteros colocados', 'Seguridad', 'Camello', 'Influencer', 'Camarero', 'Médico de campaña', 'Organizador'],
  },
  {
    id: 'orgiapiso',
    name: 'Piso de orgía doméstica',
    roles: ['Anfitrión', 'Primera vez', 'Habitual', 'Barman improvisado', 'DJ del móvil', 'Voyeur del sofá', 'Pareja', 'El que limpia mañana'],
  },
  {
    id: 'sexshop-taller',
    name: 'Taller de juguetes sexuales',
    roles: ['Monitor', 'Alumno tímido', 'Alumno experto', 'Pareja', 'Repartidor de stock', 'Dependiente', 'Influencer', 'Fotógrafo'],
  },
];
