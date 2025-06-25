
// src/lib/data.ts
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, DocumentReference, runTransaction, increment } from 'firebase/firestore';
import { db } from './firebase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  loyaltyPoints: number;
  avatarUrl: string;
  preferences: {
    preferredServices: string[];
    preferredBarber: string;
    notes: string;
  };
  createdAt?: any; // Firestore Timestamp
};

export type Staff = {
  id: string;
  name: string;
  specializations: string[];
  serviceCommissionRate: number;
  productCommissionRate: number;
  avatarUrl: string;
  bio: string;
};

export type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  purchasePrice: number;
  stock: number;
};

// Versão do Appointment no Firestore armazena referências
export type AppointmentDocument = {
  id: string;
  clientId: string;
  barberId: string;
  service: string;
  date: string; // Em um app real, use Timestamps do Firestore
  time: string;
  status: 'Concluído' | 'Confirmado' | 'Pendente' | 'Em atendimento';
  paymentMethod?: string;
  soldProducts?: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
};

export type AppointmentStatus = 'Concluído' | 'Confirmado' | 'Pendente' | 'Em atendimento';

type Subscription = {
  id: string;
  name: string;
  price: number;
  frequency: string;
  features: string[];
  popular: boolean;
};

export type DayHours = {
    [key in 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday']: {
        open: boolean;
        start: string;
        end: string;
    };
};

export type LoyaltyProgramSettings = {
  enabled: boolean;
  rewards: {
    serviceId: string;
    serviceName: string;
    pointsCost: number;
    pointsGenerated: number;
  }[];
  pointsPerService?: number; // Keep for backward compatibility during migration
}

type BarbershopSettings = {
    name: string;
    avatarUrl: string;
    operatingHours: DayHours;
    appointmentInterval: 30 | 60;
    loyaltyProgram: LoyaltyProgramSettings;
}

export type FinancialOverview = {
  totalRevenue: number;
  totalAppointments: number;
  averageTicket: number;
  totalCommissions: number;
  revenueByService: { service: string; revenue: number }[];
  revenueByBarber: { barberName: string; revenue: number; commission: number }[];
  revenueByPaymentMethod: { method: string; revenue: number; count: number }[];
  recentTransactions: {
    id: string;
    date: string;
    clientName: string;
    service: string;
    barberName: string;
    value: number;
    paymentMethod?: string;
  }[];
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

export async function addClient(userId: string, clientData: Omit<Client, 'id'>): Promise<string> {
    try {
        const clientsCol = collection(db, getCollectionPath(userId, 'clients'));
        const docRef: DocumentReference = await addDoc(clientsCol, clientData);
        return docRef.id;
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

export async function getServiceHistoryForClient(userId: string, clientId: string) {
    try {
        const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
        const q = query(appointmentsCol, 
            where('clientId', '==', clientId), 
            where('status', '==', 'Concluído')
        );

        const [appointmentsSnap, servicesSnap, staffSnap] = await Promise.all([
            getDocs(q),
            getDocs(collection(db, getCollectionPath(userId, 'services'))),
            getDocs(collection(db, getCollectionPath(userId, 'staff'))),
        ]);

        const appointments = getDatas<AppointmentDocument>(appointmentsSnap);
        const serviceMap = new Map(servicesSnap.docs.map(doc => {
            const data = doc.data() as Service;
            return [data.name, { price: data.price, id: doc.id }];
        }));
        const staffMap = new Map(staffSnap.docs.map(doc => [doc.id, doc.data() as Staff]));
        
        const history = appointments.map(app => {
            const serviceInfo = serviceMap.get(app.service);
            const barberInfo = staffMap.get(app.barberId);
            const dateObject = new Date(`${app.date}T12:00:00Z`); // Assume UTC to avoid timezone shifts
            const isCourtesy = app.paymentMethod?.startsWith('Cortesia');
            const productsTotal = (app.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
            const totalValue = (serviceInfo?.price || 0) + productsTotal;
            
            return {
                date: format(dateObject, 'dd/MM/yyyy'),
                service: app.service,
                barber: barberInfo?.name || 'N/A',
                cost: isCourtesy ? 0 : totalValue,
            };
        });
        
        history.sort((a, b) => {
             const dateA = new Date(a.date.split('/').reverse().join('-'));
             const dateB = new Date(b.date.split('/').reverse().join('-'));
             return dateB.getTime() - dateA.getTime();
        });

        return history;
    } catch (error) {
        console.error("Erro ao buscar histórico de serviços do cliente:", error);
        return [];
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

export async function updateStaff(userId: string, staffId: string, staffData: Partial<Omit<Staff, 'id'>>) {
    try {
        const staffDocRef = doc(db, getCollectionPath(userId, 'staff'), staffId);
        await updateDoc(staffDocRef, staffData);
    } catch (error) {
        console.error("Erro ao atualizar funcionário:", error);
        throw new Error("Não foi possível atualizar os dados do funcionário.");
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

export async function getProducts(userId: string): Promise<Product[]> {
  try {
    const productsCol = collection(db, getCollectionPath(userId, 'products'));
    const productsSnapshot = await getDocs(productsCol);
    return getDatas<Product>(productsSnapshot);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return [];
  }
}

export async function addProduct(userId: string, productData: Omit<Product, 'id'>) {
    try {
        const productsCol = collection(db, getCollectionPath(userId, 'products'));
        await addDoc(productsCol, productData);
    } catch (error) {
        console.error("Erro ao adicionar produto:", error);
        throw new Error("Não foi possível adicionar o produto.");
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
    const todayString = new Date().toISOString().split('T')[0];
    const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
    const q = query(appointmentsCol, where("date", "==", todayString));
    const appointmentSnapshot = await getDocs(q);
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

export async function getBarberAppointmentsForDate(userId: string, barberId: string, date: Date) {
  const dateString = date.toISOString().split('T')[0];
  try {
    const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
    const q = query(appointmentsCol, 
      where("date", "==", dateString), 
      where("barberId", "==", barberId)
    );
    const appointmentSnapshot = await getDocs(q);
    return getDatas<AppointmentDocument>(appointmentSnapshot);
  } catch (error) {
      console.error(`Erro ao buscar agendamentos para o barbeiro ${barberId} em ${dateString}:`, error);
      // Retorna array vazio em caso de erro para não quebrar a UI
      return [];
  }
}

export async function addAppointment(userId: string, appointmentData: Omit<AppointmentDocument, 'id' | 'soldProducts'>) {
    try {
        const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
        await addDoc(appointmentsCol, {
          ...appointmentData,
          soldProducts: [],
        });
    } catch (error) {
        console.error("Erro ao adicionar agendamento:", error);
        throw new Error("Não foi possível adicionar o agendamento.");
    }
}

export async function updateAppointmentProducts(userId: string, appointmentId: string, soldProducts: any[]) {
    const appointmentDocRef = doc(db, getCollectionPath(userId, 'appointments'), appointmentId);
    try {
        await updateDoc(appointmentDocRef, { soldProducts });
    } catch (error) {
        console.error(`Erro ao atualizar produtos do agendamento ${appointmentId}:`, error);
        throw new Error("Não foi possível atualizar os produtos do agendamento.");
    }
}

export async function updateAppointmentStatus(userId: string, appointmentId: string, status: AppointmentStatus, paymentMethod?: string) {
    const appointmentDocRef = doc(db, getCollectionPath(userId, 'appointments'), appointmentId);

    if (status !== 'Concluído') {
        // Se o status não for 'Concluído', apenas atualize. O erro será propagado para o chamador.
        await updateDoc(appointmentDocRef, { status: status });
        return;
    }

    // A lógica para 'Concluído' é mais complexa e precisa ser atômica.
    // Qualquer erro aqui será propagado para a função de chamada (na UI).
    await runTransaction(db, async (transaction) => {
        const appointmentSnap = await transaction.get(appointmentDocRef);

        if (!appointmentSnap.exists() || appointmentSnap.data().status === 'Concluído') {
            if (appointmentSnap.data()?.status === 'Concluído') {
                console.log("Agendamento já está concluído. Nenhuma ação tomada.");
            }
            return;
        }

        const appointmentData = appointmentSnap.data() as AppointmentDocument;
        const clientDocRef = doc(db, getCollectionPath(userId, 'clients'), appointmentData.clientId);
        const clientSnap = await transaction.get(clientDocRef);
        
        if (!clientSnap.exists()) {
            throw new Error("Cliente não encontrado na transação.");
        }
        
        const barbershopSettingsDocRef = doc(db, 'barbershops', userId);
        const barbershopSettingsSnap = await transaction.get(barbershopSettingsDocRef);

        if (!barbershopSettingsSnap.exists()) {
            throw new Error("Configurações da barbearia não encontradas.");
        }
        const barbershopSettings = barbershopSettingsSnap.data() as BarbershopSettings;
        
        const loyaltySettings = barbershopSettings?.loyaltyProgram;
        const loyaltyEnabled = loyaltySettings?.enabled || false;
        const isCourtesy = paymentMethod?.startsWith('Cortesia');

        if (loyaltyEnabled) {
            if (paymentMethod === 'Cortesia (Pontos Fidelidade)') {
                const rewardInfo = loyaltySettings?.rewards?.find(r => r.serviceName === appointmentData.service);
                const pointsCost = Number(rewardInfo?.pointsCost || 0);

                if (pointsCost === 0) {
                    throw new Error(`Este serviço não está configurado para resgate com pontos.`);
                }
                
                const currentPoints = Number(clientSnap.data()?.loyaltyPoints || 0);
                if (currentPoints < pointsCost) {
                    throw new Error(`Pontos insuficientes. Necessário: ${pointsCost}, Disponível: ${currentPoints}`);
                }
                
                transaction.update(clientDocRef, { loyaltyPoints: increment(-pointsCost) });

            } else if (!isCourtesy) {
                const serviceRule = loyaltySettings?.rewards?.find(r => r.serviceName === appointmentData.service);
                const pointsToAdd = Number(serviceRule?.pointsGenerated ?? loyaltySettings?.pointsPerService ?? 1);

                if (pointsToAdd > 0) {
                    transaction.update(clientDocRef, { loyaltyPoints: increment(pointsToAdd) });
                }
            }
        }
        
        transaction.update(appointmentDocRef, {
            status: 'Concluído',
            paymentMethod: paymentMethod || 'Não especificado',
        });
    });
}


export async function getDashboardStats(userId: string) {
    try {
        const servicesCol = collection(db, getCollectionPath(userId, 'services'));
        const clientsCol = collection(db, getCollectionPath(userId, 'clients'));
        
        const todayString = new Date().toISOString().split('T')[0];
        const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
        const appointmentsQuery = query(appointmentsCol, where("date", "==", todayString));

        const [servicesSnapshot, clientsSnapshot, appointmentsSnapshot] = await Promise.all([
            getDocs(servicesCol),
            getDocs(clientsCol),
            getDocs(appointmentsQuery)
        ]);
        
        const services = getDatas<Service>(servicesSnapshot);
        const clients = getDatas<Client>(clientsSnapshot);
        const todayAppointments = getDatas<AppointmentDocument>(appointmentsSnapshot);

        const servicePriceMap = new Map(services.map(s => [s.name, s.price]));
        const serviceDurationMap = new Map(services.map(s => [s.name, s.duration]));
        
        const todaysRevenue = todayAppointments
            .filter(a => a.status === 'Concluído' && !a.paymentMethod?.startsWith('Cortesia'))
            .reduce((sum, app) => {
                const servicePrice = servicePriceMap.get(app.service) || 0;
                const productsTotal = (app.soldProducts || []).reduce((acc, p) => acc + (p.price * p.quantity), 0);
                return sum + servicePrice + productsTotal;
            }, 0);

        const todaysAppointmentsCount = todayAppointments.length;

        const pendingAppointments = todayAppointments.filter(a => a.status === 'Pendente').length;

        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        const newClients = clients.filter(c => {
            if (!c.createdAt) return false;
            const createdAtDate = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
            return createdAtDate > oneMonthAgo;
        }).length;

        const totalDuration = todayAppointments
            .reduce((sum, app) => sum + (serviceDurationMap.get(app.service) || 0), 0);
        
        const averageDuration = todaysAppointmentsCount > 0 
            ? Math.round(totalDuration / todaysAppointmentsCount) 
            : 0;

        return {
            todaysRevenue,
            todaysAppointments: todaysAppointmentsCount,
            pendingAppointments,
            newClients,
            averageDuration,
        };

    } catch (error) {
        console.error("Erro ao buscar estatísticas do painel:", error);
        return {
            todaysRevenue: 0,
            todaysAppointments: 0,
            pendingAppointments: 0,
            newClients: 0,
            averageDuration: 0,
        };
    }
}


// --- Funções de Configurações ---

export async function getBarbershopSettings(userId: string): Promise<BarbershopSettings | undefined> {
    try {
        const barbershopDocRef = doc(db, 'barbershops', userId);
        const docSnap = await getDoc(barbershopDocRef);
        return getData<BarbershopSettings>(docSnap);
    } catch (error) {
        console.error("Erro ao buscar configurações da barbearia:", error);
        return undefined;
    }
}

export async function updateBarbershopProfile(userId: string, data: { name: string; avatarUrl: string }) {
    try {
        const barbershopDocRef = doc(db, 'barbershops', userId);
        await updateDoc(barbershopDocRef, data);
    } catch (error) {
        console.error("Erro ao atualizar perfil da barbearia:", error);
        throw new Error("Não foi possível atualizar o perfil.");
    }
}

export async function updateOperatingHours(userId: string, data: { hours: DayHours; appointmentInterval: number }) {
    try {
        const barbershopDocRef = doc(db, 'barbershops', userId);
        await updateDoc(barbershopDocRef, {
             operatingHours: data.hours,
             appointmentInterval: data.appointmentInterval,
        });
    } catch (error) {
        console.error("Erro ao atualizar horários:", error);
        throw new Error("Não foi possível atualizar os horários.");
    }
}

export async function updateLoyaltySettings(userId: string, data: { enabled: boolean; rewards: LoyaltyProgramSettings['rewards'] }) {
    try {
        const barbershopDocRef = doc(db, 'barbershops', userId);
        // Create a new object to ensure `pointsPerService` is not part of the new settings.
        const settingsToSave = {
            enabled: data.enabled,
            rewards: data.rewards,
        };
        await updateDoc(barbershopDocRef, {
             loyaltyProgram: settingsToSave,
        });
    } catch (error) {
        console.error("Erro ao atualizar configurações de fidelidade:", error);
        throw new Error("Não foi possível salvar as configurações de fidelidade.");
    }
}

export async function getFinancialOverview(
  userId: string,
  dateRange?: { from: Date; to: Date }
): Promise<FinancialOverview> {
  try {
    const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
    const q = query(appointmentsCol, where('status', '==', 'Concluído'));
    
    const [appointmentsSnap, servicesSnap, staffSnap, clientsSnap] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, getCollectionPath(userId, 'services'))),
      getDocs(collection(db, getCollectionPath(userId, 'staff'))),
      getDocs(collection(db, getCollectionPath(userId, 'clients'))),
    ]);

    let completedAppointments = getDatas<AppointmentDocument>(appointmentsSnap);
    
    if (dateRange?.from && dateRange?.to) {
        const startDateString = format(dateRange.from, 'yyyy-MM-dd');
        const endDateString = format(dateRange.to, 'yyyy-MM-dd');
        completedAppointments = completedAppointments.filter(app => {
            return app.date >= startDateString && app.date <= endDateString;
        });
    }

    const services = getDatas<Service>(servicesSnap);
    const staff = getDatas<Staff>(staffSnap);
    const clients = getDatas<Client>(clientsSnap);

    const serviceMap = new Map(services.map(s => [s.name, { price: s.price, id: s.id }]));
    const staffMap = new Map(staff.map(s => [s.id, { name: s.name, serviceCommissionRate: s.serviceCommissionRate, productCommissionRate: s.productCommissionRate }]));
    const clientMap = new Map(clients.map(c => [c.id, { name: c.name }]));

    let totalRevenue = 0;
    const revenueByService: { [key: string]: number } = {};
    const revenueByBarber: { [key: string]: { revenue: number; commission: number } } = {};
    const revenueByPaymentMethod: { [key: string]: { revenue: number, count: number } } = {};


    const recentTransactions = completedAppointments
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(app => {
        const serviceInfo = serviceMap.get(app.service);
        const staffInfo = staffMap.get(app.barberId);
        const clientInfo = clientMap.get(app.clientId);

        const isCourtesy = app.paymentMethod?.startsWith('Cortesia');
        const serviceValue = serviceInfo?.price || 0;
        const productsValue = (app.soldProducts || []).reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const value = isCourtesy ? 0 : serviceValue + productsValue;
        
        totalRevenue += value;

        // Revenue by Service
        if (app.service && !isCourtesy) {
            revenueByService[app.service] = (revenueByService[app.service] || 0) + serviceValue + productsValue;
        }

        // Revenue by Barber
        if (staffInfo && !isCourtesy) {
            if (!revenueByBarber[staffInfo.name]) {
                revenueByBarber[staffInfo.name] = { revenue: 0, commission: 0 };
            }
            const serviceCommission = serviceValue * (staffInfo.serviceCommissionRate || 0);
            const productCommission = productsValue * (staffInfo.productCommissionRate || 0);
            revenueByBarber[staffInfo.name].revenue += value;
            revenueByBarber[staffInfo.name].commission += serviceCommission + productCommission;
        }

        // Revenue by Payment Method
        const paymentMethod = app.paymentMethod || 'Não especificado';
        if (!revenueByPaymentMethod[paymentMethod]) {
            revenueByPaymentMethod[paymentMethod] = { revenue: 0, count: 0 };
        }
        revenueByPaymentMethod[paymentMethod].revenue += value;
        revenueByPaymentMethod[paymentMethod].count += 1;


        return {
          id: app.id,
          date: app.date,
          clientName: clientInfo?.name || 'Cliente de Balcão',
          service: app.service,
          barberName: staffInfo?.name || 'N/A',
          value: value,
          paymentMethod: app.paymentMethod,
        };
      });
      
    const totalAppointments = completedAppointments.length;
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
    const totalCommissions = Object.values(revenueByBarber).reduce((sum, barber) => sum + barber.commission, 0);

    return {
      totalRevenue,
      totalAppointments,
      averageTicket,
      totalCommissions,
      revenueByService: Object.entries(revenueByService).map(([service, revenue]) => ({ service, revenue })),
      revenueByBarber: Object.entries(revenueByBarber).map(([barberName, data]) => ({ barberName, ...data })),
      revenueByPaymentMethod: Object.entries(revenueByPaymentMethod).map(([method, data]) => ({ method, ...data })),
      recentTransactions: recentTransactions.slice(0, 10), // Limit to 10 recent
    };

  } catch (error) {
    console.error("Erro ao buscar dados financeiros:", error);
    return {
      totalRevenue: 0,
      totalAppointments: 0,
      averageTicket: 0,
      totalCommissions: 0,
      revenueByService: [],
      revenueByBarber: [],
      revenueByPaymentMethod: [],
      recentTransactions: [],
    };
  }
}

export async function getCommissionsForPeriod(userId: string, barberId: string, startDate: Date, endDate: Date) {
    try {
        const [services, staffMember] = await Promise.all([
            getServices(userId),
            getStaffById(userId, barberId)
        ]);

        if (!staffMember) {
            throw new Error("Funcionário não encontrado.");
        }

        const servicePriceMap = new Map(services.map(s => [s.name, s.price]));
        const serviceCommissionRate = staffMember.serviceCommissionRate;
        const productCommissionRate = staffMember.productCommissionRate || 0;
        const startDateString = format(startDate, 'yyyy-MM-dd');
        const endDateString = format(endDate, 'yyyy-MM-dd');

        const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
        const q = query(appointmentsCol,
            where('barberId', '==', barberId)
        );

        const querySnapshot = await getDocs(q);
        const allAppointmentsForBarber = getDatas<AppointmentDocument>(querySnapshot);

        const appointmentsInPeriod = allAppointmentsForBarber.filter(app => 
            app.status === 'Concluído' &&
            app.date >= startDateString &&
            app.date <= endDateString &&
            !app.paymentMethod?.startsWith('Cortesia')
        );

        let totalServiceCommission = 0;
        let totalProductCommission = 0;

        appointmentsInPeriod.forEach((app) => {
            const servicePrice = servicePriceMap.get(app.service) || 0;
            totalServiceCommission += (servicePrice * serviceCommissionRate);

            const productsValue = (app.soldProducts || []).reduce((sum, p) => sum + (p.price * p.quantity), 0);
            totalProductCommission += (productsValue * productCommissionRate);
        });

        return {
            totalServiceCommission,
            totalProductCommission,
            totalCommission: totalServiceCommission + totalProductCommission,
            appointmentCount: appointmentsInPeriod.length,
        };

    } catch (error) {
        console.error("Erro ao calcular comissões por período:", error);
        throw error;
    }
}
