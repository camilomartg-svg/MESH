import { ProjectData } from '../types';

export const DEFAULT_PROJECT_DATA: ProjectData = {
  tasks: [
    // 1. ELEMENTOS ESTRUCTURALES
    {
      id: 'struct-1',
      code: 'BIM-01',
      name: 'Muros de Contención',
      category: 'ELEMENTOS ESTRUCTURALES',
      description: 'Perímetro de sótanos y semisótanos (contención lateral y posterior).',
      durationDays: 4,
      priority: 1,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Verificar niveles de excavación en Revit.',
      targetDeliveryDate: '2026-07-20',
      isDelayed: false,
    },
    {
      id: 'struct-2',
      code: 'BIM-02',
      name: 'Columnas Estructurales',
      category: 'ELEMENTOS ESTRUCTURALES',
      description: 'Columnas rectangulares internas de concreto por todos los niveles.',
      durationDays: 3,
      priority: 2,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Coordinar ejes estructurales.',
      targetDeliveryDate: '2026-07-24',
      isDelayed: false,
    },
    {
      id: 'struct-3',
      code: 'BIM-03',
      name: 'Columna Exenta / Pilote',
      category: 'ELEMENTOS ESTRUCTURALES',
      description: 'Columna de soporte frontal que sostiene la terraza aportada (Eje Este).',
      durationDays: 2,
      priority: 3,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Revisar detalle de conexión en planos.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'struct-4',
      code: 'BIM-04',
      name: 'Vigas de Entrepi./Borde',
      category: 'ELEMENTOS ESTRUCTURALES',
      description: 'Vigas de amarre y vigas aéreas de borde para balcones volados.',
      durationDays: 3,
      priority: 4,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Atención a los voladizos de fachada norte.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'struct-5',
      code: 'BIM-05',
      name: 'Losa de Cimentación',
      category: 'ELEMENTOS ESTRUCTURALES',
      description: 'Placa base / losa de fondo del sótano.',
      durationDays: 4,
      priority: 5,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Espesores según estudio de suelos.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'struct-6',
      code: 'BIM-06',
      name: 'Losas de Entrepaño',
      category: 'ELEMENTOS ESTRUCTURALES',
      description: 'Losa de entrepiso de concreto aligerado.',
      durationDays: 3,
      priority: 6,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Coordinar pases mecánicos.',
      targetDeliveryDate: null,
      isDelayed: false,
    },

    // 2. ENVOLVENTE ARQUITECTÓNICA
    {
      id: 'env-1',
      code: 'BIM-07',
      name: 'Muros de Fachada Claros',
      category: 'ENVOLVENTE ARQUITECTÓNICA',
      description: 'Muros exteriores con acabado de pañete y pintura clara (Pisos 1-4).',
      durationDays: 5,
      priority: 7,
      status: 'Pendiente',
      assigneeId: 'modeler-2',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Definir materialidad de estuco en Revit.',
      targetDeliveryDate: '2026-07-25',
      isDelayed: false,
    },
    {
      id: 'env-2',
      code: 'BIM-08',
      name: 'Muros de Ático Oscuros',
      category: 'ENVOLVENTE ARQUITECTÓNICA',
      description: 'Volumen del último nivel/ático con acabado gris oscuro (Piso 5).',
      durationDays: 3,
      priority: 8,
      status: 'Pendiente',
      assigneeId: 'modeler-2',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Revisar alturas de antepecho.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'env-3',
      code: 'BIM-09',
      name: 'Muros Cortina',
      category: 'ENVOLVENTE ARQUITECTÓNICA',
      description: 'Grandes ventanales de piso a techo en fachada frontal y terrazas.',
      durationDays: 4,
      priority: 9,
      status: 'Pendiente',
      assigneeId: 'modeler-2',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Definir división de paneles de vidrio.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'env-4',
      code: 'BIM-10',
      name: 'Montantes y Paneles',
      category: 'ENVOLVENTE ARQUITECTÓNICA',
      description: 'Perfilería de aluminio y vidrios templados de los muros cortina.',
      durationDays: 3,
      priority: 10,
      status: 'Pendiente',
      assigneeId: 'modeler-2',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Asociar montantes de 2 pulgadas.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'env-5',
      code: 'BIM-11',
      name: 'Cubierta del Ático',
      category: 'ENVOLVENTE ARQUITECTÓNICA',
      description: 'Losa de techo final sobre el último nivel del edificio.',
      durationDays: 3,
      priority: 11,
      status: 'Pendiente',
      assigneeId: 'modeler-2',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Inclinación para desagüe pluvial.',
      targetDeliveryDate: null,
      isDelayed: false,
    },

    // 3. DIVISIONES INTERIORES Y ACABADOS
    {
      id: 'div-1',
      code: 'BIM-12',
      name: 'Muros Divisorios Aptos',
      category: 'DIVISIONES INTERIORES',
      description: 'Muros divisorios entre apartamentos (con espesor para acústica).',
      durationDays: 5,
      priority: 12,
      status: 'Pendiente',
      assigneeId: 'modeler-3',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Verificar asilamiento acústico.',
      targetDeliveryDate: '2026-07-30',
      isDelayed: false,
    },
    {
      id: 'div-2',
      code: 'BIM-13',
      name: 'Muros de Drywall',
      category: 'DIVISIONES INTERIORES',
      description: 'Divisiones internas de habitaciones, clósets y baños (placas de yeso).',
      durationDays: 4,
      priority: 13,
      status: 'Pendiente',
      assigneeId: 'modeler-3',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Estructura metálica interna de muros.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'div-3',
      code: 'BIM-14',
      name: 'Pisos de Porcelanato',
      category: 'DIVISIONES INTERIORES',
      description: 'Acabado de suelo para zonas húmedas internas (cocinas y baños).',
      durationDays: 3,
      priority: 14,
      status: 'Pendiente',
      assigneeId: 'modeler-3',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Definir despiece de porcelanato.',
      targetDeliveryDate: null,
      isDelayed: false,
    },

    // 4. CIRCULACIÓN Y SEGURIDAD ARQUITECTÓNICA
    {
      id: 'circ-1',
      code: 'BIM-15',
      name: 'Escalera Principal',
      category: 'CIRCULACIÓN Y SEGURIDAD',
      description: 'Escalera de evacuación del punto fijo (estructural y acabados).',
      durationDays: 4,
      priority: 15,
      status: 'Pendiente',
      assigneeId: 'modeler-2',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Calcular huella y contrahuella exacta.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'circ-2',
      code: 'BIM-16',
      name: 'Rampa de Acceso PMR',
      category: 'CIRCULACIÓN Y SEGURIDAD',
      description: 'Rampa peatonal exterior para personas con movilidad reducida.',
      durationDays: 3,
      priority: 16,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Pendiente máxima del 8% según norma colombiana.',
      targetDeliveryDate: null,
      isDelayed: false,
    },

    // 5. REMATES Y EXTERIORES
    {
      id: 'rem-1',
      code: 'BIM-17',
      name: 'Pérgola de Ático',
      category: 'REMATES Y EXTERIORES',
      description: 'Pérgola horizontal de lamas metálicas en la terraza superior.',
      durationDays: 3,
      priority: 17,
      status: 'Pendiente',
      assigneeId: 'modeler-3',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Soportes de anclaje estructural.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
    {
      id: 'rem-2',
      code: 'BIM-18',
      name: 'Sólido Topográfico',
      category: 'REMATES Y EXTERIORES',
      description: 'Terreno natural inclinado del lote de Bogotá y excavaciones.',
      durationDays: 4,
      priority: 18,
      status: 'Pendiente',
      assigneeId: 'modeler-1',
      scheduledStart: null,
      scheduledEnd: null,
      notes: 'Modelar curvas de nivel cada 0.5m.',
      targetDeliveryDate: null,
      isDelayed: false,
    },
  ],
  modelers: [
    {
      id: 'modeler-1',
      name: 'Ing. Alejandro Silva (Estructura)',
      color: '#0284c7', // Sky-600
      active: true,
    },
    {
      id: 'modeler-2',
      name: 'Arq. Camila Torres (Arquitectura)',
      color: '#7c3aed', // Violet-600
      active: true,
    },
    {
      id: 'modeler-3',
      name: 'Tec. Nicolás Vargas (Interiores & MEP)',
      color: '#ea580c', // Orange-600
      active: true,
    },
  ],
  settings: {
    startDate: '2026-07-15',
    sendToEmail: 'imagina3ddesign@gmail.com',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPass: '',
    autoAlerts: true,
  },
  emailLogs: [],
  drawings: [
    // SERIE 100
    { id: 'AUT-101', code: 'AUT-101', name: 'Localización, Implantación y Espacio Público', scale: '0,128472222', status: 'Pendiente', observations: 'Relación del antejardín con el andén y la rampa vehicular.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-102', code: 'AUT-102', name: 'Planta Arquitectónica - Nivel Sótano', scale: '1:50', status: 'Pendiente', observations: 'Cuarto de bombas, tanques, celdas de parqueo y depósitos.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-103', code: 'AUT-103', name: 'Planta Arquitectónica - Planta Lobby', scale: '1:50', status: 'Pendiente', observations: 'Acceso peatonal, recepción, portería y antejardín frontal.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-104', code: 'AUT-104', name: 'Planta Arquitectónica - Planta Piso 1', scale: '1:50', status: 'Pendiente', observations: 'Distribución de apartamentos de primer nivel con terrazas/balcones.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-105', code: 'AUT-105', name: 'Planta Arquitectónica - Planta Piso 2', scale: '1:50', status: 'Pendiente', observations: 'Distribución única de apartamentos y balcones frontales.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-106', code: 'AUT-106', name: 'Planta Arquitectónica - Planta Piso 3', scale: '1:50', status: 'Pendiente', observations: 'Distribución con retranqueo y terrazas laterales intermedias.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-107', code: 'AUT-107', name: 'Planta Arquitectónica - Planta Piso 4', scale: '1:50', status: 'Pendiente', observations: 'Distribución con retroceso volumétrico de fachada posterior.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-108', code: 'AUT-108', name: 'Planta Arquitectónica - Planta Terraza', scale: '1:50', status: 'Pendiente', observations: 'Volumen superior con acceso a terraza principal y pérgola.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-109', code: 'AUT-109', name: 'Planta de Sobrecubierta', scale: '1:50', status: 'Pendiente', observations: 'Pendientes de desagüe, canaletas e imbornales finales del edificio.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-110', code: 'AUT-110', name: "Corte Longitudinal A-A' (Punto Fijo)", scale: '1:50', status: 'Pendiente', observations: 'Sección que corta las escaleras y la caja de ascensores.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-111', code: 'AUT-111', name: "Corte Transversal B-B' (Rampas)", scale: '1:50', status: 'Pendiente', observations: 'Sección que corta la rampa de acceso al Nivel Sótano.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-112', code: 'AUT-112', name: 'Fachada Frontal (Este)', scale: '1:50', status: 'Pendiente', observations: 'Vista del acceso, balcones, reja exterior y lamas de la Terraza.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-113', code: 'AUT-113', name: 'Fachada Posterior (Oeste)', scale: '1:50', status: 'Pendiente', observations: 'Vista de los retranqueos posteriores y muros de colindancia.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },
    { id: 'AUT-114', code: 'AUT-114', name: 'Fachadas Laterales (Norte y Sur)', scale: '1:50', status: 'Pendiente', observations: 'Alzados con ventanería de formato medio y marcos tipo cajón.', deliveryDate: null, series: 'SERIE 100: ARQUITECTURA GENERAL (AUT)' },

    // SERIE 200
    { id: 'AM-201', code: 'AM-201', name: 'Albañilería - Nivel Sótano', scale: '1:50', status: 'Pendiente', observations: 'Confinamiento de cuartos técnicos y muros estructurales.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-202', code: 'AM-202', name: 'Albañilería - Planta Lobby', scale: '1:50', status: 'Pendiente', observations: 'Muros de portería, lobby de acceso y apartamentos del nivel.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-203', code: 'AM-203', name: 'Albañilería - Planta Piso 1', scale: '1:50', status: 'Pendiente', observations: 'Distribución e identificación de muros húmedos y secos.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-204', code: 'AM-204', name: 'Albañilería - Planta Piso 2', scale: '1:50', status: 'Pendiente', observations: 'Modulación y pases de redes para apartamentos de Piso 2.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-205', code: 'AM-205', name: 'Albañilería - Planta Piso 3', scale: '1:50', status: 'Pendiente', observations: 'Ajustado a la distribución con retranqueo posterior.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-206', code: 'AM-206', name: 'Albañilería - Planta Piso 4', scale: '1:50', status: 'Pendiente', observations: 'Modulación de mampostería del penúltimo nivel habitable.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-207', code: 'AM-207', name: 'Albañilería - Planta Terraza', scale: '1:50', status: 'Pendiente', observations: 'Cerramientos del volumen cerrado superior y antepechos de terrazas.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-208', code: 'AM-208', name: 'Albañilería - Sobrecubierta y Culatas', scale: '1:50', status: 'Pendiente', observations: 'Muros bajos de remate de culatas de cubiertas y foso de ascensor.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },
    { id: 'AM-220', code: 'AM-220', name: 'Detalles de Mampostería y Juntas', scale: '1:20', status: 'Pendiente', observations: 'Encuentros de muros con estructura, dinteles y juntas sísmicas.', deliveryDate: null, series: 'SERIE 200: ALBAÑILERÍA Y MAMPOSTERÍA (AM)' },

    // SERIE 300
    { id: 'AC-301', code: 'AC-301', name: 'Acabados de Piso - Nivel Sótano', scale: '1:50', status: 'Pendiente', observations: 'Concreto endurecido y pintura epóxica en áreas vehiculares.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-302', code: 'AC-302', name: 'Acabados de Piso - Planta Lobby', scale: '1:50', status: 'Pendiente', observations: 'Porcelanatos/mármoles de alto tráfico y tapetes de acceso en Lobby.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-303', code: 'AC-303', name: 'Acabados de Piso - Planta Piso 1', scale: '1:50', status: 'Pendiente', observations: 'Despiece de madera laminada en aptos. y cerámica en balcones.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-304', code: 'AC-304', name: 'Acabados de Piso - Planta Piso 2', scale: '1:50', status: 'Pendiente', observations: 'Despiece y especificación de guardas por apartamento.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-305', code: 'AC-305', name: 'Acabados de Piso - Planta Piso 3', scale: '1:50', status: 'Pendiente', observations: 'Transiciones en zonas de terrazas exteriores intermedias.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-306', code: 'AC-306', name: 'Acabados de Piso - Planta Piso 4', scale: '1:50', status: 'Pendiente', observations: 'Despiece único de acabados para apartamentos de Piso 4.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-307', code: 'AC-307', name: 'Acabados de Piso - Planta Terraza', scale: '1:50', status: 'Pendiente', observations: 'Detalle de deck de madera transitable y losas impermeabilizadas.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },
    { id: 'AC-320', code: 'AC-320', name: 'Detalles de Transición de Pisos y Bordes', scale: '1:10', status: 'Pendiente', observations: 'Encuentros de perfilería en balcones, juntas y pases de alfajías.', deliveryDate: null, series: 'SERIE 300: ACABADOS, PISOS Y ENCHAPES (AC)' },

    // SERIE 400
    { id: 'CC-401', code: 'CC-401', name: 'Cielorrasos - Planta Lobby', scale: '1:50', status: 'Pendiente', observations: 'Diseño de iluminación indirecta (franjas/iluminación indirecta).', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },
    { id: 'CC-402', code: 'CC-402', name: 'Cielorrasos - Planta Piso 1', scale: '1:50', status: 'Pendiente', observations: 'Drywall estándar e hidrófugo en zonas húmedas de apartamentos.', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },
    { id: 'CC-403', code: 'CC-403', name: 'Cielorrasos - Planta Piso 2', scale: '1:50', status: 'Pendiente', observations: 'Alturas libres del nivel según la estructura del Piso 2.', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },
    { id: 'CC-404', code: 'CC-404', name: 'Cielorrasos - Planta Piso 3', scale: '1:50', status: 'Pendiente', observations: 'Ajustado por pasos de tuberías del nivel superior retranqueado.', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },
    { id: 'CC-405', code: 'CC-405', name: 'Cielorrasos - Planta Piso 4', scale: '1:50', status: 'Pendiente', observations: 'Cielos del Piso 4 y registros de servicio.', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },
    { id: 'CC-406', code: 'CC-406', name: 'Cielorrasos - Planta Terraza', scale: '1:50', status: 'Pendiente', observations: 'Cielos interiores bajo la losa de la Terraza superior.', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },
    { id: 'CC-420', code: 'CC-420', name: 'Detalles de Cielorrasos y Cajillos', scale: '1:10', status: 'Pendiente', observations: 'Detalles de cortineros, juntas de dilatación perimetral y registros.', deliveryDate: null, series: 'SERIE 400: CIELORRASOS REFLEJADOS (CC)' },

    // SERIE 500
    { id: 'ZC-501', code: 'ZC-501', name: 'Detalle Arquitectónico - Lobby de Acceso', scale: '1:25', status: 'Pendiente', observations: 'Alzados interiores con acabados, diseño de la recepción y mueble de portería.', deliveryDate: null, series: 'SERIE 500: DETALLES DE ÁREAS COMUNES (ZC)' },
    { id: 'ZC-502', code: 'ZC-502', name: 'Punto Fijo - Planta y Cortes de Escalera', scale: '1:20', status: 'Pendiente', observations: 'Desarrollo completo del nudo de la escalera desde el Nivel Sótano hasta la Terraza.', deliveryDate: null, series: 'SERIE 500: DETALLES DE ÁREAS COMUNES (ZC)' },
    { id: 'ZC-503', code: 'ZC-503', name: 'Punto Fijo - Planta y Secciones de Ascensor', scale: '1:20', status: 'Pendiente', observations: 'Dimensiones del foso en Sótano, sobrecorrido en Sobrecubierta y anclajes arquitectónicos.', deliveryDate: null, series: 'SERIE 500: DETALLES DE ÁREAS COMUNES (ZC)' },
    { id: 'ZC-504', code: 'ZC-504', name: 'Detalle de Rampa Vehicular y Accesos', scale: '1:25', status: 'Pendiente', observations: 'Planta de demarcación de celdas en Sótano, pendientes y rampas en rampa de concreto.', deliveryDate: null, series: 'SERIE 500: DETALLES DE ÁREAS COMUNES (ZC)' },

    // SERIE 600
    { id: 'AP-601-A', code: 'AP-601-A', name: 'Ficha Técnica - Apartamento Tipo A', scale: '1:25', status: 'Pendiente', observations: 'Planta arquitectónica acotada a ejes de acabados y cuadro de áreas individuales.', deliveryDate: null, series: 'SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)' },
    { id: 'AP-602-A', code: 'AP-602-A', name: 'Alzados e Interiorismo de Cocinas', scale: '1:20', status: 'Pendiente', observations: 'Carpintería de cocina, detalles de muebles altos, bajos, mesón, pases para estufa y campana.', deliveryDate: null, series: 'SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)' },
    { id: 'AP-603-A', code: 'AP-603-A', name: 'Despiece de Enchapes - Baño Principal', scale: '1:20', status: 'Pendiente', observations: 'Planta y los 4 alzados internos. Modulación de porcelanatos, nichos de ducha y lavamanos.', deliveryDate: null, series: 'SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)' },
    { id: 'AP-604-A', code: 'AP-604-A', name: 'Despiece de Enchapes - Baños Auxiliares', scale: '1:20', status: 'Pendiente', observations: 'Desarrollo de baños secundarios y baño social del Lobby. Sobresalientes.', deliveryDate: null, series: 'SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)' },
    { id: 'AP-605-A', code: 'AP-605-A', name: 'Carpintería de Madera - Clósets y Vestieres', scale: '1:20', status: 'Pendiente', observations: 'Detalles constructivos de clósets de habitaciones y muebles de linos en pasillos.', deliveryDate: null, series: 'SERIE 600: DESPIECES DE APARTAMENTOS Y ZONAS HÚMEDAS (AP)' },

    // SERIE 700
    { id: 'CAR-701', code: 'CAR-701', name: 'Cuadro Maestro de Puertas de Madera', scale: '1:20', status: 'Pendiente', observations: 'Especificación de batientes, cerraduras y marcos para accesos y paso interior.', deliveryDate: null, series: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)' },
    { id: 'CAR-702', code: 'CAR-702', name: 'Cuadro de Ventanería - Fachada Frontal (Este)', scale: '1:20', status: 'Pendiente', observations: 'Modulación de lamas de aluminio, cortina de piso a techo y perfiles de aluminio.', deliveryDate: null, series: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)' },
    { id: 'CAR-703', code: 'CAR-703', name: 'Cuadro de Ventanería - Fachadas Laterales', scale: '1:20', status: 'Pendiente', observations: 'Ventanas medianas y el detalle de ensamble con los marcos cajón Salientes.', deliveryDate: null, series: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)' },
    { id: 'CAR-704', code: 'CAR-704', name: 'Cerrajería Metálica - Reja y Portón Exterior', scale: '1:20', status: 'Pendiente', observations: 'Diseño de la reja frontal del antejardín y portón vehicular para el Sótano.', deliveryDate: null, series: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)' },
    { id: 'CAR-705', code: 'CAR-705', name: 'Cerrajería Metálica - Barandas de Fachada', scale: '1:10', status: 'Pendiente', observations: 'Detalle de las barandas metálicas de platina y perfil vertical para balcones y Terraza.', deliveryDate: null, series: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)' },
    { id: 'CAR-706', code: 'CAR-706', name: 'Cerrajería Metálica - Pasamanos de Seguridad', scale: '1:10', status: 'Pendiente', observations: 'Pasamanos anclados a muro en la escalera de evacuación y rampas peatonales.', deliveryDate: null, series: 'SERIE 700: CARPINTERÍA, VENTANERÍA Y CERRAJERÍA (CAR)' },

    // SERIE 800
    { id: 'DTE-821', code: 'DTE-821', name: 'Detalles de Impermeabilización en Sótano', scale: '1:10', status: 'Pendiente', observations: 'Transición entre el muro de contención estructural, terreno natural y drenajes de base.', deliveryDate: null, series: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)' },
    { id: 'DTE-822', code: 'DTE-822', name: 'Detalles de Impermeabilización en Terrazas', scale: '1:10', status: 'Pendiente', observations: 'Encuentro del piso interior con el Deck de madera en el balcón del nivel Terraza.', deliveryDate: null, series: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)' },
    { id: 'DTE-823', code: 'DTE-823', name: 'Detalles de Cubierta y Sobrecubierta', scale: '1:10', status: 'Pendiente', observations: 'Entrega de mantas asfálticas/membranas, ruanas en ventilaciones y remates de culatas.', deliveryDate: null, series: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)' },
    { id: 'DTE-824', code: 'DTE-824', name: 'Detalles de Desagües Pluviales', scale: '1:05', status: 'Pendiente', observations: 'Nudos de sumideros de piso, cajas de inspección pluvial y gárgolas de rebose en balcones.', deliveryDate: null, series: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)' },
    { id: 'DTE-825', code: 'DTE-825', name: 'Detalles de Jardineras Exteriores', scale: '1:10', status: 'Pendiente', observations: 'Filtros, capas de grava, impermeabilización y desagües de las jardineras del Lobby.', deliveryDate: null, series: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)' },
    { id: 'DTE-826', code: 'DTE-826', name: 'Detalle Constructivo - Pérgola Superior', scale: '1:10', status: 'Pendiente', observations: 'Anclaje estructural de la pérgola metálica horizontal sobre las placas de la Terraza.', deliveryDate: null, series: 'SERIE 800: DETALLES CONSTRUCTIVOS DE NUDOS CRÍTICOS (DTE)' },

    // SERIE 900
    { id: 'UTI-901', code: 'UTI-901', name: 'Detalle Técnico - Cuarto de Basuras (U.A.R.)', scale: '1:25', status: 'Pendiente', observations: 'Acabados lavables en muros, despiece de rejilla de piso, acometida sifón y ventilación.', deliveryDate: null, series: 'SERIE 900: INFRAESTRUCTURA DE SERVICIOS (UTI)' },
    { id: 'UTI-902', code: 'UTI-902', name: 'Detalle Técnico - Tanque de Reserva y Bombas', scale: '1:25', status: 'Pendiente', observations: 'Distribución arquitectónica del tanque de agua potable, accesos técnicos y cuarto de bombas.', deliveryDate: null, series: 'SERIE 900: INFRAESTRUCTURA DE SERVICIOS (UTI)' },
    { id: 'UTI-903', code: 'UTI-903', name: 'Detalle Técnico - Subestación y Planta', scale: '1:25', status: 'Pendiente', observations: 'Distribución del cuarto de transformadores y planta de emergencia con ductos.', deliveryDate: null, series: 'SERIE 900: INFRAESTRUCTURA DE SERVICIOS (UTI)' },
    { id: 'UTI-904', code: 'UTI-904', name: 'Planos para Propiedad Horizontal (PH)', scale: 'Var.', status: 'Pendiente', observations: 'Planos definitivos de linderos e identificación de áreas privadas vs. comunes para escrituras.', deliveryDate: null, series: 'SERIE 900: INFRAESTRUCTURA DE SERVICIOS (UTI)' },

    // SERIE 1000 (labeled as SERIE 800: DETALLES Y CORTES POR FACHADA in the drawings list)
    { id: 'DTE-1001', code: 'DTE-1001', name: 'Corte por Fachada - CF1', scale: '1:20', status: 'Pendiente', observations: 'Acceso peatonal, escalinatas exteriores y transición con el andén.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1002', code: 'DTE-1002', name: 'Corte por Fachada - CF2', scale: '1:20', status: 'Pendiente', observations: 'Jardinera frontal, impermeabilización de losa y columna frontal exenta.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1003', code: 'DTE-1003', name: 'Corte por Fachada - CF3', scale: '1:20', status: 'Pendiente', observations: 'Balcones frontales aportados y entrega de ventanería (Pisos 1 al 4).', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1004', code: 'DTE-1004', name: 'Corte por Fachada - CF4', scale: '1:20', status: 'Pendiente', observations: 'Remate superior en Sobrecubierta y comportamiento pluvial de balcones.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1005', code: 'DTE-1005', name: 'Corte por Fachada - CF5', scale: '1:20', status: 'Pendiente', observations: 'Patio posterior de ventilación y muros de contención en Sótano.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1006', code: 'DTE-1006', name: 'Corte por Fachada - CF6', scale: '1:20', status: 'Pendiente', observations: 'Rampa vehicular, portón metálico y losas inclinadas de Sótano.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1007', code: 'DTE-1007', name: 'Corte por Fachada - CF7', scale: '1:20', status: 'Pendiente', observations: 'Retranqueo posterior en nivel Terraza y entrega de losa impermeabilizada.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1008', code: 'DTE-1008', name: 'Corte por Fachada - CF8', scale: '1:20', status: 'Pendiente', observations: 'Muro lateral colindante con junta de dilatación sísmica estructural.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1009', code: 'DTE-1009', name: 'Corte por Fachada - CF9', scale: '1:20', status: 'Pendiente', observations: 'Ventanería de fachadas laterales, antepechos y vierteaguas de concreto.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1010', code: 'DTE-1010', name: 'Corte por Fachada - CF10', scale: '1:20', status: 'Pendiente', observations: 'Balcones laterales en esquina de los Pisos 1 al 4.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1011', code: 'DTE-1011', name: 'Corte por Fachada - CF11', scale: '1:20', status: 'Pendiente', observations: 'Núcleo de punto fijo (escalera/ascensor) y remate de sobrecubierta.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' },
    { id: 'DTE-1020', code: 'DTE-1020', name: 'Detalles de Impermeabilización', scale: '1:05', status: 'Pendiente', observations: 'Detalles de sumideros, ruanas, impermeabilización de techos y gárgolas.', deliveryDate: null, series: 'SERIE 800: DETALLES Y CORTES POR FACHADA (DTE)' }
  ],
};

export function getInitialTaskIdForDrawing(code: string): string | null {
  if (code.startsWith('AUT-101')) return 'env-1';
  if (code.startsWith('AUT-102')) return 'struct-5';
  if (code.startsWith('AUT-103')) return 'env-1';
  if (code.startsWith('AUT-104')) return 'env-1';
  if (code.startsWith('AUT-105')) return 'env-1';
  if (code.startsWith('AUT-106')) return 'env-1';
  if (code.startsWith('AUT-107')) return 'env-1';
  if (code.startsWith('AUT-108')) return 'env-2';
  if (code.startsWith('AUT-109')) return 'env-5';
  if (code.startsWith('AUT-110')) return 'circ-1';
  if (code.startsWith('AUT-111')) return 'circ-2';
  if (code.startsWith('AUT-112')) return 'env-1';
  if (code.startsWith('AUT-113')) return 'env-1';
  if (code.startsWith('AUT-114')) return 'env-1';

  if (code.startsWith('AM-201')) return 'struct-1';
  if (code.startsWith('AM-202')) return 'div-1';
  if (code.startsWith('AM-203')) return 'div-1';
  if (code.startsWith('AM-204')) return 'div-1';
  if (code.startsWith('AM-205')) return 'div-1';
  if (code.startsWith('AM-206')) return 'div-1';
  if (code.startsWith('AM-207')) return 'env-2';
  if (code.startsWith('AM-208')) return 'env-5';
  if (code.startsWith('AM-220')) return 'div-1';

  if (code.startsWith('AC-301')) return 'struct-5';
  if (code.startsWith('AC-302')) return 'div-3';
  if (code.startsWith('AC-303')) return 'div-3';
  if (code.startsWith('AC-304')) return 'div-3';
  if (code.startsWith('AC-305')) return 'div-3';
  if (code.startsWith('AC-306')) return 'div-3';
  if (code.startsWith('AC-307')) return 'env-5';
  if (code.startsWith('AC-320')) return 'div-3';

  if (code.startsWith('CC-401')) return 'div-2';
  if (code.startsWith('CC-402')) return 'div-2';
  if (code.startsWith('CC-403')) return 'div-2';
  if (code.startsWith('CC-404')) return 'div-2';
  if (code.startsWith('CC-405')) return 'div-2';
  if (code.startsWith('CC-406')) return 'env-5';
  if (code.startsWith('CC-420')) return 'div-2';

  if (code.startsWith('ZC-501')) return 'div-1';
  if (code.startsWith('ZC-502')) return 'circ-1';
  if (code.startsWith('ZC-503')) return 'circ-1';
  if (code.startsWith('ZC-504')) return 'circ-2';

  if (code.startsWith('AP-601-A')) return 'div-1';
  if (code.startsWith('AP-602-A')) return 'div-1';
  if (code.startsWith('AP-603-A')) return 'div-3';
  if (code.startsWith('AP-604-A')) return 'div-3';
  if (code.startsWith('AP-605-A')) return 'div-1';

  if (code.startsWith('CAR-701')) return 'div-1';
  if (code.startsWith('CAR-702')) return 'env-3';
  if (code.startsWith('CAR-703')) return 'env-3';
  if (code.startsWith('CAR-704')) return 'struct-1';
  if (code.startsWith('CAR-705')) return 'env-3';
  if (code.startsWith('CAR-706')) return 'circ-1';

  if (code.startsWith('DTE-821')) return 'struct-1';
  if (code.startsWith('DTE-822')) return 'env-5';
  if (code.startsWith('DTE-823')) return 'env-5';
  if (code.startsWith('DTE-824')) return 'env-5';
  if (code.startsWith('DTE-825')) return 'rem-2';
  if (code.startsWith('DTE-826')) return 'rem-1';

  if (code.startsWith('UTI-901')) return 'div-1';
  if (code.startsWith('UTI-902')) return 'struct-1';
  if (code.startsWith('UTI-903')) return 'struct-1';
  if (code.startsWith('UTI-904')) return 'div-1';

  if (code.startsWith('DTE-1001')) return 'env-1';
  if (code.startsWith('DTE-1002')) return 'env-1';
  if (code.startsWith('DTE-1003')) return 'env-1';
  if (code.startsWith('DTE-1004')) return 'env-1';
  if (code.startsWith('DTE-1005')) return 'env-1';
  if (code.startsWith('DTE-1006')) return 'circ-2';
  if (code.startsWith('DTE-1007')) return 'env-2';
  if (code.startsWith('DTE-1008')) return 'env-1';
  if (code.startsWith('DTE-1009')) return 'env-1';
  if (code.startsWith('DTE-1010')) return 'env-1';
  if (code.startsWith('DTE-1011')) return 'circ-1';
  if (code.startsWith('DTE-1020')) return 'env-5';

  return null;
}
