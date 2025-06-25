// src/lib/data.ts
import { collection, doc, getDoc, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from './firebase';

// Helper para construir o caminho da coleção para um usuário específico
const getCollectionPath = (userId: string, collectionName: string) => {
    return `barbershops/${userId}/${collectionName}`;
};

// Helper para extrair dados e ID de um snapshot
const getData = <T>(snapshot: any): T | undefined => {
  if (!snapshot.exists()) {
    return undefined;
  }
  return { id: snapshot.id, ...snapshot.data() } as T;
};

const getDatas = <T>(snapshot: any): T[] => {
  return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
};

// --- Definições de Tipo ---
type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyStatus: 'Ouro' | 'Prata' | 'Bronze';
  avatarUrl: string;
  serviceHistory: { date: string; service: string; barber: string; cost: number }[];
  preferences: {
    preferredServices: string[];
    preferredBarber: string;
    notes: string;
  };
};

type Staff = {
  id: string;
  name: string;
  specializations: string[];
  commissionRate: number;
  avatarUrl: string;
  bio: string;
};

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
};

// Versão do Appointment no Firestore armazena referências
type AppointmentDocument = {
  id: string;
  clientId: string;
  barberId: string;
  service: string;
  date: string; // Em um app real, use Timestamps do Firestore
  time: string;
  status: 'Concluído' | 'Confirmado' | 'Pendente';
};

type Subscription = {
  id: string;
  name: string;
  price: number;
  frequency: string;
  features: string[];
  popular: boolean;
};

// --- Funções da API usando o Firestore ---

export async function getClients(userId: string) {
  try {
    const clientsCol = collection(db, getCollectionPath(userId, 'clients'));
    const clientSnapshot = await getDocs(clientsCol);
    // Retorna um subconjunto de campos para a lista
    return clientSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            email: data.email,
            phone: data.phone,
            loyaltyStatus: data.loyaltyStatus,
            avatarUrl: data.avatarUrl,
        };
    });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error);
    return [];
  }
}

export async function addClient(userId: string, clientData: Omit<Client, 'id'>) {
    try {
        const clientsCol = collection(db, getCollectionPath(userId, 'clients'));
        await addDoc(clientsCol, clientData);
    } catch (error) {
        console.error("Erro ao adicionar cliente:", error);
        throw new Error("Não foi possível adicionar o cliente.");
    }
}

export async function getClientById(userId: string, id: string): Promise<Client | undefined> {
  try {
    const clientDocRef = doc(db, getCollectionPath(userId, 'clients'), id);
    const clientSnap = await getDoc(clientDocRef);
    return getData<Client>(clientSnap);
  } catch (error) {
    console.error(`Erro ao buscar cliente ${id}:`, error);
    return undefined;
  }
}

export async function getStaff(userId: string): Promise<Staff[]> {
  try {
    const staffCol = collection(db, getCollectionPath(userId, 'staff'));
    const staffSnapshot = await getDocs(staffCol);
    return getDatas<Staff>(staffSnapshot);
  } catch (error) {
    console.error("Erro ao buscar equipe:", error);
    return [];
  }
}

export async function getStaffById(userId: string, id: string): Promise<Staff | undefined> {
  try {
    const staffDocRef = doc(db, getCollectionPath(userId, 'staff'), id);
    const staffSnap = await getDoc(staffDocRef);
    return getData<Staff>(staffSnap);
  } catch (error) {
    console.error(`Erro ao buscar funcionário ${id}:`, error);
    return undefined;
  }
}

export async function addStaff(userId: string, staffData: Omit<Staff, 'id'>) {
    try {
        const staffCol = collection(db, getCollectionPath(userId, 'staff'));
        await addDoc(staffCol, staffData);
    } catch (error) {
        console.error("Erro ao adicionar funcionário:", error);
        throw new Error("Não foi possível adicionar o funcionário.");
    }
}

export async function getServices(userId: string): Promise<Service[]> {
  try {
    const servicesCol = collection(db, getCollectionPath(userId, 'services'));
    const servicesSnapshot = await getDocs(servicesCol);
    return getDatas<Service>(servicesSnapshot);
  } catch (error) {
    console.error("Erro ao buscar serviços:", error);
    return [];
  }
}

export async function addService(userId: string, serviceData: Omit<Service, 'id'>) {
    try {
        const servicesCol = collection(db, getCollectionPath(userId, 'services'));
        await addDoc(servicesCol, serviceData);
    } catch (error) {
        console.error("Erro ao adicionar serviço:", error);
        throw new Error("Não foi possível adicionar o serviço.");
    }
}

// Assinaturas são globais para o aplicativo, não por barbearia.
export async function getSubscriptions(): Promise<Subscription[]> {
    try {
        const subsCol = collection(db, 'subscriptions');
        const subsSnapshot = await getDocs(subsCol);
        return getDatas<Subscription>(subsSnapshot);
    } catch (error) {
        console.error("Erro ao buscar assinaturas:", error);
        return [];
    }
}

async function populateAppointments(userId: string, appointments: AppointmentDocument[]) {
    return Promise.all(
        appointments.map(async (app) => {
            try {
                const clientSnap = await getDoc(doc(db, getCollectionPath(userId, 'clients'), app.clientId));
                const barberSnap = await getDoc(doc(db, getCollectionPath(userId, 'staff'), app.barberId));

                return {
                    ...app,
                    client: getData<{id: string, name: string, avatarUrl: string}>(clientSnap) || { id: 'unknown', name: 'Cliente não encontrado', avatarUrl: ''},
                    barber: getData<{id: string, name: string}>(barberSnap) || { id: 'unknown', name: 'Barbeiro não encontrado'},
                };
            } catch (error) {
                console.error(`Erro ao popular dados para o agendamento ${app.id}:`, error);
                // Retorna um objeto de fallback para não quebrar a UI
                return {
                    ...app,
                    client: { id: app.clientId, name: 'Erro de permissão', avatarUrl: '' },
                    barber: { id: app.barberId, name: 'Erro' },
                };
            }
        })
    );
}

export async function getTodaysAppointments(userId: string) {
  try {
    const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
    // Em um app real, você filtraria pela data de hoje usando um Timestamp.
    const appointmentSnapshot = await getDocs(appointmentsCol);
    const appointments = getDatas<AppointmentDocument>(appointmentSnapshot);
    return await populateAppointments(userId, appointments);
  } catch (error) {
      console.error("Erro ao buscar agendamentos de hoje:", error);
      return [];
  }
}

export async function getAppointmentsForDate(userId: string, date: Date) {
    // Consulta simplificada com strings. Use Timestamps para apps robustos.
    const dateString = date.toISOString().split('T')[0];
  try {
    const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
    const q = query(appointmentsCol, where("date", "==", dateString));
    const appointmentSnapshot = await getDocs(q);
    const appointments = getDatas<AppointmentDocument>(appointmentSnapshot);

    return await populateAppointments(userId, appointments);
  } catch (error) {
      console.error(`Erro ao buscar agendamentos para ${dateString}:`, error);
      // Retorna array vazio em caso de erro para não quebrar a UI
      return [];
  }
}

export async function addAppointment(userId: string, appointmentData: Omit<AppointmentDocument, 'id'>) {
    try {
        const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
        await addDoc(appointmentsCol, appointmentData);
    } catch (error) {
        console.error("Erro ao adicionar agendamento:", error);
        throw new Error("Não foi possível adicionar o agendamento.");
    }
}


// NOTA: Estatísticas de painel geralmente requerem agregações, que são melhor
// tratadas com Cloud Functions. Para simplicidade, manteremos esta função mockada.
export async function getDashboardStats() {
  return {
    todaysRevenue: 85.00,
    todaysAppointments: 5,
    pendingAppointments: 1,
    newClients: 3,
    averageDuration: 48,
  }
}
