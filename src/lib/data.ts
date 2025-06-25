// In a real app, this data would come from a database.
// For this UI-focused example, we're using mock data.

const clients = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '123-456-7890',
    address: '123 Main St, Anytown, USA',
    loyaltyStatus: 'Gold',
    avatarUrl: 'https://placehold.co/100x100.png',
    serviceHistory: [
      { date: '2024-07-01', service: 'Classic Haircut', barber: 'Sam Smith', cost: 40 },
      { date: '2024-06-15', service: 'Beard Trim', barber: 'Sam Smith', cost: 20 },
      { date: '2024-05-20', service: 'Hot Towel Shave', barber: 'Jane Doe', cost: 35 },
    ],
    preferences: {
      preferredServices: ['Classic Haircut', 'Beard Trim'],
      preferredBarber: 'Sam Smith',
      notes: 'Likes a bit of texture on top. Prefers a matte finish product.',
    },
  },
  {
    id: '2',
    name: 'Michael Johnson',
    email: 'michael.j@example.com',
    phone: '234-567-8901',
    address: '456 Oak Ave, Anytown, USA',
    loyaltyStatus: 'Silver',
    avatarUrl: 'https://placehold.co/100x100.png',
    serviceHistory: [
      { date: '2024-07-10', service: 'Modern Fade', barber: 'Alex Chen', cost: 45 },
      { date: '2024-06-12', service: 'Modern Fade', barber: 'Alex Chen', cost: 45 },
    ],
    preferences: {
      preferredServices: ['Modern Fade'],
      preferredBarber: 'Alex Chen',
      notes: 'Very specific about the fade height. High and tight.',
    },
  },
  {
    id: '3',
    name: 'David Williams',
    email: 'david.w@example.com',
    phone: '345-678-9012',
    address: '789 Pine Ln, Anytown, USA',
    loyaltyStatus: 'Bronze',
    avatarUrl: 'https://placehold.co/100x100.png',
    serviceHistory: [
      { date: '2024-07-05', service: 'Kids Cut', barber: 'Jane Doe', cost: 30 },
    ],
    preferences: {
      preferredServices: ['Kids Cut'],
      preferredBarber: 'Jane Doe',
      notes: 'Son gets nervous, needs a patient barber.',
    },
  },
];

const staff = [
  {
    id: '1',
    name: 'Sam Smith',
    specializations: ['Classic Cuts', 'Beard Sculpting'],
    commissionRate: 0.5,
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'A master of traditional barbering with over 15 years of experience. Sam specializes in classic scissor cuts and meticulous beard work.'
  },
  {
    id: '2',
    name: 'Jane Doe',
    specializations: ['Hot Towel Shaves', 'Coloring'],
    commissionRate: 0.55,
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'Jane brings a modern touch to the shop, known for her incredible hot towel shaves and creative color treatments.'
  },
  {
    id: '3',
    name: 'Alex Chen',
    specializations: ['Modern Fades', 'Graphic Designs'],
    commissionRate: 0.6,
    avatarUrl: 'https://placehold.co/100x100.png',
    bio: 'The go-to barber for sharp, contemporary styles. Alex excels at precision fades and intricate hair designs.'
  },
];

const services = [
  { id: '1', name: 'Classic Haircut', duration: 45, price: 40, description: 'A timeless scissor or clipper cut, styled to perfection.' },
  { id: '2', name: 'Modern Fade', duration: 50, price: 45, description: 'A precision fade of your choice (high, mid, low) with a styled top.' },
  { id: '3', name: 'Hot Towel Shave', duration: 40, price: 35, description: 'A luxurious straight-razor shave with hot towels and premium oils.' },
  { id: '4', name: 'Beard Trim', duration: 20, price: 20, description: 'Shape, trim, and line up your beard.' },
  { id: '5', name: 'The Works', duration: 90, price: 75, description: 'Classic haircut and a hot towel shave for the ultimate grooming experience.' },
  { id: '6', name: 'Kids Cut', duration: 30, price: 30, description: 'A patient and stylish cut for children 12 and under.' },
];

const appointments = [
    { id: '1', client: clients[0], barber: staff[0], service: 'Classic Haircut', date: '2024-07-28', time: '10:00 AM', status: 'Completed' },
    { id: '2', client: clients[1], barber: staff[2], service: 'Modern Fade', date: '2024-07-28', time: '11:00 AM', status: 'Completed' },
    { id: '3', client: clients[2], barber: staff[1], service: 'Kids Cut', date: '2024-07-28', time: '12:00 PM', status: 'Confirmed' },
    { id: '4', client: {id: '4', name: 'Chris Brown', avatarUrl: 'https://placehold.co/40x40.png'}, barber: staff[0], service: 'Beard Trim', date: '2024-07-28', time: '02:00 PM', status: 'Confirmed' },
    { id: '5', client: {id: '5', name: 'Robert Davis', avatarUrl: 'https://placehold.co/40x40.png'}, barber: staff[2], service: 'The Works', date: '2024-07-28', time: '03:00 PM', status: 'Pending' },
];

const subscriptions = [
  {
    id: '1',
    name: 'The Regular',
    price: 35,
    frequency: 'monthly',
    features: ['1 Classic Haircut per month', '5% off all products', 'Priority booking'],
    popular: false,
  },
  {
    id: '2',
    name: 'The Gentleman',
    price: 65,
    frequency: 'monthly',
    features: ['2 services of your choice per month', '10% off all products', 'Priority booking', 'Complimentary beverage'],
    popular: true,
  },
  {
    id: '3',
    name: 'The Connoisseur',
    price: 100,
    frequency: 'monthly',
    features: ['Unlimited haircuts', '1 Beard Trim or Shave per month', '15% off all products', 'Highest priority booking', 'Exclusive event invites'],
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
    { id: '10', client: clients[0], barber: staff[0], service: 'Classic Haircut', date: date.toDateString(), time: '09:00 AM', status: 'Confirmed' },
    { id: '11', client: clients[1], barber: staff[2], service: 'Modern Fade', date: date.toDateString(), time: '09:30 AM', status: 'Confirmed' },
    { id: '12', client: clients[2], barber: staff[1], service: 'Hot Towel Shave', date: date.toDateString(), time: '10:30 AM', status: 'Confirmed' },
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
