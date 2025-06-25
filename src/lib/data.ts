// In a real app, this data would come from a database.
// For this UI-focused example, we're using mock data.

const clients = [
  {
    id: '1',
    name: 'João da Silva',
    email: 'joao.silva@example.com',
    phone: '123-456-7890',
    address: 'Rua Principal, 123, Cidade Qualquer, Brasil',
    loyaltyStatus: 'Ouro',
    avatarUrl: 'https://placehold.co/100x100.png',
    serviceHistory: [
      { date: '2024-07-01', service: 'Corte Clássico', barber: 'Sam Smith', cost: 40 },
      { date: '2024-06-15', service: 'Aparar Barba', barber: 'Sam Smith', cost: 20 },
      { date: '2024-05-20', service: 'Toalha Quente e Navalha', barber: 'Janaína Pereira', cost: 35 },
    ],
    preferences: {
      preferredServices: ['Corte Clássico', 'Aparar Barba'],
      preferredBarber: 'Sam Smith',
      notes: 'Gosta de um pouco de textura no topo. Prefere produto com acabamento fosco.',
    },
  },
  {
    id: '2',
    name: 'Miguel Johnson',
    email: 'miguel.j@example.com',
    phone: '234-567-8901',
    address: 'Avenida Carvalho, 456, Cidade Qualquer, Brasil',
    loyaltyStatus: 'Prata',
    avatarUrl: 'https://placehold.co/100x100.png',
    serviceHistory: [
      { date: '2024-07-10', service: 'Corte Degradê Moderno', barber: 'Alex Chen', cost: 45 },
      { date: '2024-06-12', service: 'Corte Degradê Moderno', barber: 'Alex Chen', cost: 45 },
    ],
    preferences: {
      preferredServices: ['Corte Degradê Moderno'],
      preferredBarber: 'Alex Chen',
      notes: 'Muito específico sobre a altura do degradê. Alto e justo.',
    },
  },
  {
    id: '3',
    name: 'Davi Williams',
    email: 'davi.w@example.com',
    phone: '345-678-9012',
    address: 'Travessa Pinheiros, 789, Cidade Qualquer, Brasil',
    loyaltyStatus: 'Bronze',
    avatarUrl: 'https://placehold.co/100x100.png',
    serviceHistory: [
      { date: '2024-07-05', service: 'Corte Infantil', barber: 'Janaína Pereira', cost: 30 },
    ],
    preferences: {
      preferredServices: ['Corte Infantil'],
      preferredBarber: 'Janaína Pereira',
      notes: 'O filho fica nervoso, precisa de um barbeiro paciente.',
    },
  },
];

const staff = [
  {
    id: '1',
    name: 'Sam Smith',
    specializations: ['Cortes Clássicos', 'Modelagem de Barba'],
    commissionRate: 0.5,
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Um mestre da barbearia tradicional com mais de 15 anos de experiência. Sam é especialista em cortes clássicos na tesoura e trabalho meticuloso com barba.'
  },
  {
    id: '2',
    name: 'Janaína Pereira',
    specializations: ['Toalha Quente e Navalha', 'Coloração'],
    commissionRate: 0.55,
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Janaína traz um toque moderno para a barbearia, conhecida por seus incríveis tratamentos com toalha quente e navalha e colorações criativas.'
  },
  {
    id: '3',
    name: 'Alex Chen',
    specializations: ['Degradês Modernos', 'Desenhos no Cabelo'],
    commissionRate: 0.6,
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'O barbeiro ideal para estilos arrojados e contemporâneos. Alex se destaca em degradês de precisão e desenhos de cabelo intrincados.'
  },
];

const services = [
  { id: '1', name: 'Corte Clássico', duration: 45, price: 40, description: 'Um corte atemporal na tesoura ou máquina, estilizado à perfeição.' },
  { id: '2', name: 'Corte Degradê Moderno', duration: 50, price: 45, description: 'Um degradê de precisão à sua escolha (alto, médio, baixo) com o topo estilizado.' },
  { id: '3', name: 'Toalha Quente e Navalha', duration: 40, price: 35, description: 'Um barbear luxuoso com navalha, toalhas quentes e óleos premium.' },
  { id: '4', name: 'Aparar Barba', duration: 20, price: 20, description: 'Modele, apare e alinhe sua barba.' },
  { id: '5', name: 'Serviço Completo', duration: 90, price: 75, description: 'Corte clássico e toalha quente com navalha para a experiência de cuidado definitiva.' },
  { id: '6', name: 'Corte Infantil', duration: 30, price: 30, description: 'Um corte paciente e estiloso para crianças de até 12 anos.' },
];

const appointments = [
    { id: '1', client: clients[0], barber: staff[0], service: 'Corte Clássico', date: '2024-07-28', time: '10:00', status: 'Concluído' },
    { id: '2', client: clients[1], barber: staff[2], service: 'Corte Degradê Moderno', date: '2024-07-28', time: '11:00', status: 'Concluído' },
    { id: '3', client: clients[2], barber: staff[1], service: 'Corte Infantil', date: '2024-07-28', time: '12:00', status: 'Confirmado' },
    { id: '4', client: {id: '4', name: 'Chris Brown', avatarUrl: 'https://placehold.co/40x40.png'}, barber: staff[0], service: 'Aparar Barba', date: '2024-07-28', time: '14:00', status: 'Confirmado' },
    { id: '5', client: {id: '5', name: 'Robert Davis', avatarUrl: 'https://placehold.co/40x40.png'}, barber: staff[2], service: 'Serviço Completo', date: '2024-07-28', time: '15:00', status: 'Pendente' },
];

const subscriptions = [
  {
    id: '1',
    name: 'O Regular',
    price: 35,
    frequency: 'monthly',
    features: ['1 Corte Clássico por mês', '5% de desconto em todos os produtos', 'Agendamento prioritário'],
    popular: false,
  },
  {
    id: '2',
    name: 'O Cavalheiro',
    price: 65,
    frequency: 'monthly',
    features: ['2 serviços à sua escolha por mês', '10% de desconto em todos os produtos', 'Agendamento prioritário', 'Bebida de cortesia'],
    popular: true,
  },
  {
    id: '3',
    name: 'O Conhecedor',
    price: 100,
    frequency: 'monthly',
    features: ['Cortes de cabelo ilimitados', '1 Aparo de Barba ou Barbear por mês', '15% de desconto em todos os produtos', 'Agendamento com a mais alta prioridade', 'Convites para eventos exclusivos'],
    popular: false,
  },
];


// API-like functions to simulate data fetching
export async function getClients() {
  return clients.map(({ serviceHistory, preferences, ...client }) => client);
}

export async function getClientById(id: string) {
  return clients.find(c => c.id === id);
}

export async function getStaff() {
  return staff;
}

export async function getStaffById(id:string) {
  return staff.find(s => s.id === id);
}

export async function getServices() {
  return services;
}

export async function getTodaysAppointments() {
  // In a real app, you'd filter by today's date
  return appointments;
}

export async function getAppointmentsForDate(date: Date) {
  // a mock function that returns more appointments for a selected date
  return [
    { id: '10', client: clients[0], barber: staff[0], service: 'Corte Clássico', date: date.toDateString(), time: '09:00', status: 'Confirmado' },
    { id: '11', client: clients[1], barber: staff[2], service: 'Corte Degradê Moderno', date: date.toDateString(), time: '09:30', status: 'Confirmado' },
    { id: '12', client: clients[2], barber: staff[1], service: 'Toalha Quente e Navalha', date: date.toDateString(), time: '10:30', status: 'Confirmado' },
  ]
}

export async function getDashboardStats() {
  return {
    todaysRevenue: 85.00,
    todaysAppointments: 5,
    pendingAppointments: 1,
    newClients: 3,
    averageDuration: 48,
  }
}

export async function getSubscriptions() {
  return subscriptions;
}
