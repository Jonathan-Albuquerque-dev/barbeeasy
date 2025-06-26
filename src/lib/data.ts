
// src/lib/data.ts
import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, DocumentReference, runTransaction, increment, deleteDoc } from 'firebase/firestore';
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
export type Client = {
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
  subscriptionId?: string;
  subscriptionName?: string;
  subscriptionPaymentMethod?: string;
  subscriptionStartDate?: any;
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

export type SubscriptionService = {
  serviceId: string;
  serviceName: string;
  discount: number;
};

export type Subscription = {
  id: string;
  name: string;
  price: number;
  includedServices: SubscriptionService[];
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
  transactions: {
    id: string;
    date: string;
    clientName: string;
    service: string;
    barberName: string;
    value: number;
    paymentMethod?: string;
    soldProducts?: {
      productId: string;
      name: string;
      quantity: number;
      price: number;
    }[];
  }[];
};

export type SubscriptionStats = {
    totalSubscribers: number;
    monthlyAppointments: number;
    monthlyRevenue: number;
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
            subscriptionName: data.subscriptionName || null,
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
                date: format(dateObject, 'dd/MM/yyyy', { locale: ptBR }),
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

// --- Funções de Assinatura ---
export async function getSubscriptions(userId: string): Promise<Subscription[]> {
    try {
        const subsCol = collection(db, getCollectionPath(userId, 'subscriptions'));
        const subsSnapshot = await getDocs(subsCol);
        return getDatas<Subscription>(subsSnapshot);
    } catch (error) {
        console.error("Erro ao buscar assinaturas:", error);
        return [];
    }
}

export async function addSubscription(userId: string, subscriptionData: Omit<Subscription, 'id'>) {
    try {
        const subsCol = collection(db, getCollectionPath(userId, 'subscriptions'));
        await addDoc(subsCol, subscriptionData);
    } catch (error) {
        console.error("Erro ao adicionar assinatura:", error);
        throw new Error("Não foi possível adicionar a assinatura.");
    }
}

async function populateAppointments(userId: string, appointments: AppointmentDocument[], subscriptions: Subscription[]) {
    const subscriptionsMap = new Map(subscriptions.map(sub => [sub.id, sub]));

    return Promise.all(
        appointments.map(async (app) => {
            try {
                const clientSnap = await getDoc(doc(db, getCollectionPath(userId, 'clients'), app.clientId));
                const barberSnap = await getDoc(doc(db, getCollectionPath(userId, 'staff'), app.barberId));

                const baseClient = getData<{id: string, name: string, avatarUrl: string, subscriptionId?: string}>(clientSnap) || { id: 'unknown', name: 'Cliente não encontrado', avatarUrl: ''};
                
                const client = {
                    ...baseClient,
                    subscription: baseClient.subscriptionId ? subscriptionsMap.get(baseClient.subscriptionId) : undefined
                };

                return {
                    ...app,
                    client,
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
    
    const [appointmentSnapshot, subscriptionsSnap] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, getCollectionPath(userId, 'subscriptions')))
    ]);
    const appointments = getDatas<AppointmentDocument>(appointmentSnapshot);
    const subscriptions = getDatas<Subscription>(subscriptionsSnap);

    return await populateAppointments(userId, appointments, subscriptions);
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

    const [appointmentSnapshot, subscriptionsSnap] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, getCollectionPath(userId, 'subscriptions')))
    ]);
    const appointments = getDatas<AppointmentDocument>(appointmentSnapshot);
    const subscriptions = getDatas<Subscription>(subscriptionsSnap);

    return await populateAppointments(userId, appointments, subscriptions);
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
        await updateDoc(appointmentDocRef, { status: status });
        return;
    }

    try {
        await runTransaction(db, async (transaction) => {
            // --- READ PHASE ---
            const appointmentSnap = await transaction.get(appointmentDocRef);
            if (!appointmentSnap.exists()) return;
            if (appointmentSnap.data().status === 'Concluído') {
                console.log("Agendamento já está concluído. Nenhuma ação tomada.");
                return;
            }

            const appointmentData = appointmentSnap.data() as AppointmentDocument;
            const clientDocRef = doc(db, getCollectionPath(userId, 'clients'), appointmentData.clientId);
            const barbershopSettingsDocRef = doc(db, 'barbershops', userId);
            
            const [clientSnap, barbershopSettingsSnap] = await Promise.all([
                transaction.get(clientDocRef),
                transaction.get(barbershopSettingsDocRef)
            ]);
            
            if (!clientSnap.exists()) throw new Error("Cliente não encontrado na transação.");
            if (!barbershopSettingsSnap.exists()) throw new Error("Configurações da barbearia não encontradas.");

            const clientData = clientSnap.data() as Client;
            const barbershopSettings = barbershopSettingsSnap.data() as BarbershopSettings;
            const soldProducts = appointmentData.soldProducts || [];
            
            let subscriptionSnap;
            if (clientData.subscriptionId) {
                const subscriptionDocRef = doc(db, getCollectionPath(userId, 'subscriptions'), clientData.subscriptionId);
                subscriptionSnap = await transaction.get(subscriptionDocRef);
            }

            const productReads = soldProducts.map(p => 
                transaction.get(doc(db, getCollectionPath(userId, 'products'), p.productId))
            );
            const productSnaps = await Promise.all(productReads);

            // --- LOGIC / VALIDATION PHASE ---
            if (paymentMethod === 'Assinante') {
                if (!subscriptionSnap || !subscriptionSnap.exists()) {
                    throw new Error("Este cliente não é um assinante ou o plano não foi encontrado.");
                }
                const subscriptionData = subscriptionSnap!.data() as Subscription;
                const serviceIsIncluded = subscriptionData.includedServices.some(s => s.serviceName === appointmentData.service);
                if (!serviceIsIncluded) {
                    throw new Error(`O serviço "${appointmentData.service}" não está incluso na assinatura deste cliente.`);
                }
            }
            
            for (let i = 0; i < productSnaps.length; i++) {
                const productSnap = productSnaps[i];
                const soldProduct = soldProducts[i];
                if (!productSnap.exists()) {
                    throw new Error(`Produto "${soldProduct.name}" não foi encontrado no estoque.`);
                }
                const currentStock = productSnap.data().stock;
                if (currentStock < soldProduct.quantity) {
                    throw new Error(`Estoque insuficiente para "${soldProduct.name}". Disponível: ${currentStock}, Pedido: ${soldProduct.quantity}.`);
                }
            }
            
            // --- WRITE PHASE ---
            const loyaltySettings = barbershopSettings.loyaltyProgram;
            const loyaltyEnabled = loyaltySettings?.enabled || false;
            if (loyaltyEnabled) {
                if (paymentMethod === 'Cortesia (Pontos Fidelidade)') {
                    const rewardInfo = loyaltySettings?.rewards?.find(r => r.serviceName === appointmentData.service);
                    const pointsCost = Number(rewardInfo?.pointsCost || 0);

                    if (pointsCost === 0) throw new Error(`Este serviço não está configurado para resgate com pontos.`);
                    
                    const currentPoints = Number(clientData.loyaltyPoints || 0);
                    if (currentPoints < pointsCost) throw new Error(`Pontos insuficientes. Necessário: ${pointsCost}, Disponível: ${currentPoints}`);
                    
                    transaction.update(clientDocRef, { loyaltyPoints: increment(-pointsCost) });

                } else if (!paymentMethod?.startsWith('Cortesia') && paymentMethod !== 'Assinante') {
                    const serviceRule = loyaltySettings?.rewards?.find(r => r.serviceName === appointmentData.service);
                    const pointsToAdd = Number(serviceRule?.pointsGenerated ?? loyaltySettings?.pointsPerService ?? 1);

                    if (pointsToAdd > 0) {
                        transaction.update(clientDocRef, { loyaltyPoints: increment(pointsToAdd) });
                    }
                }
            }

            for (let i = 0; i < productSnaps.length; i++) {
                const productSnap = productSnaps[i];
                const soldProduct = soldProducts[i];
                transaction.update(productSnap.ref, {
                    stock: increment(-soldProduct.quantity)
                });
            }
            
            transaction.update(appointmentDocRef, {
                status: 'Concluído',
                paymentMethod: paymentMethod || 'Não especificado',
            });
        });
    } catch(error) {
        console.error("Erro na transação de conclusão do agendamento:", error);
        throw error;
    }
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
                const isSubscription = app.paymentMethod === 'Assinante';
                const servicePrice = isSubscription ? 0 : (servicePriceMap.get(app.service) || 0);
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
    
    const [appointmentsSnap, servicesSnap, staffSnap, clientsSnap, subscriptionsSnap] = await Promise.all([
      getDocs(q),
      getDocs(collection(db, getCollectionPath(userId, 'services'))),
      getDocs(collection(db, getCollectionPath(userId, 'staff'))),
      getDocs(collection(db, getCollectionPath(userId, 'clients'))),
      getDocs(collection(db, getCollectionPath(userId, 'subscriptions'))),
    ]);

    let completedAppointments = getDatas<AppointmentDocument>(appointmentsSnap);
    const services = getDatas<Service>(servicesSnap);
    const staff = getDatas<Staff>(staffSnap);
    const clients = getDatas<Client>(clientsSnap);
    const subscriptions = getDatas<Subscription>(subscriptionsSnap);

    if (dateRange?.from && dateRange?.to) {
        const startDateString = format(dateRange.from, 'yyyy-MM-dd');
        const endDateString = format(dateRange.to, 'yyyy-MM-dd');
        completedAppointments = completedAppointments.filter(app => {
            return app.date >= startDateString && app.date <= endDateString;
        });
    }

    const serviceMap = new Map(services.map(s => [s.name, { price: s.price, id: s.id }]));
    const staffMap = new Map(staff.map(s => [s.id, { name: s.name, serviceCommissionRate: s.serviceCommissionRate, productCommissionRate: s.productCommissionRate }]));
    const clientMap = new Map(clients.map(c => [c.id, { name: c.name }]));
    const subscriptionMap = new Map(subscriptions.map(s => [s.id, { price: s.price, name: s.name }]));

    let appointmentRevenue = 0;
    const revenueByService: { [key: string]: number } = {};
    const revenueByBarber: { [key: string]: { revenue: number; commission: number } } = {};
    const revenueByPaymentMethod: { [key: string]: { revenue: number, count: number } } = {};
    const allTransactions: FinancialOverview['transactions'] = [];

    completedAppointments.forEach(app => {
        const serviceInfo = serviceMap.get(app.service);
        const staffInfo = staffMap.get(app.barberId);
        const clientInfo = clientMap.get(app.clientId);

        const isCourtesy = app.paymentMethod?.startsWith('Cortesia');
        const isSubscription = app.paymentMethod === 'Assinante';

        const serviceValue = serviceInfo?.price || 0;
        const productsValue = (app.soldProducts || []).reduce((sum, p) => sum + (p.price * p.quantity), 0);
        
        const transactionValue = isSubscription 
            ? productsValue
            : isCourtesy 
                ? 0 
                : serviceValue + productsValue;

        if (!isCourtesy) {
            appointmentRevenue += transactionValue;

            if (staffInfo) {
                if (!revenueByBarber[staffInfo.name]) {
                    revenueByBarber[staffInfo.name] = { revenue: 0, commission: 0 };
                }
                const serviceCommission = isSubscription ? 0 : serviceValue * (staffInfo.serviceCommissionRate || 0);
                const productCommission = productsValue * (staffInfo.productCommissionRate || 0);
                
                revenueByBarber[staffInfo.name].revenue += transactionValue;
                revenueByBarber[staffInfo.name].commission += serviceCommission + productCommission;
            }
        }
        
        if (app.service && !isCourtesy && !isSubscription) {
            revenueByService[app.service] = (revenueByService[app.service] || 0) + serviceValue;
        }

        const paymentMethod = app.paymentMethod || 'Não especificado';
        if (!revenueByPaymentMethod[paymentMethod]) {
            revenueByPaymentMethod[paymentMethod] = { revenue: 0, count: 0 };
        }
        revenueByPaymentMethod[paymentMethod].revenue += transactionValue;
        revenueByPaymentMethod[paymentMethod].count += 1;

        allTransactions.push({
          id: app.id,
          date: app.date,
          clientName: clientInfo?.name || 'Cliente de Balcão',
          service: app.service,
          barberName: staffInfo?.name || 'N/A',
          value: transactionValue,
          paymentMethod: app.paymentMethod,
          soldProducts: app.soldProducts || [],
        });
    });
      
    let subscriptionRevenue = 0;
    const subscribedClients = clients.filter(c => c.subscriptionId && c.subscriptionStartDate);
    
    subscribedClients.forEach(client => {
        const subInfo = subscriptionMap.get(client.subscriptionId!);
        if (!subInfo) return;

        const subStartDate = client.subscriptionStartDate.toDate();
        if (dateRange?.from && dateRange?.to) {
            if (subStartDate < dateRange.from || subStartDate > dateRange.to) {
                return;
            }
        }

        const subValue = subInfo.price;
        subscriptionRevenue += subValue;
        
        const paymentMethod = client.subscriptionPaymentMethod || 'Não especificado';
        if (!revenueByPaymentMethod[paymentMethod]) {
            revenueByPaymentMethod[paymentMethod] = { revenue: 0, count: 0 };
        }
        revenueByPaymentMethod[paymentMethod].revenue += subValue;
        revenueByPaymentMethod[paymentMethod].count += 1;

        const subServiceName = `Assinatura: ${subInfo.name}`;
        revenueByService[subServiceName] = (revenueByService[subServiceName] || 0) + subValue;

        allTransactions.push({
            id: `sub_${client.id}`,
            date: format(subStartDate, 'yyyy-MM-dd'),
            clientName: client.name,
            service: subServiceName,
            barberName: 'Sistema',
            value: subValue,
            paymentMethod: paymentMethod,
            soldProducts: [],
        });
    });

    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalRevenue = appointmentRevenue + subscriptionRevenue;
    const totalAppointments = completedAppointments.length;
    const averageTicket = totalAppointments > 0 ? appointmentRevenue / totalAppointments : 0;
    const totalCommissions = Object.values(revenueByBarber).reduce((sum, barber) => sum + barber.commission, 0);

    return {
      totalRevenue,
      totalAppointments,
      averageTicket,
      totalCommissions,
      revenueByService: Object.entries(revenueByService).map(([service, revenue]) => ({ service, revenue })),
      revenueByBarber: Object.entries(revenueByBarber).map(([barberName, data]) => ({ barberName, ...data })),
      revenueByPaymentMethod: Object.entries(revenueByPaymentMethod).map(([method, data]) => ({ method, ...data })),
      transactions: allTransactions,
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
      transactions: [],
    };
  }
}

export async function getCommissionsForPeriod(userId: string, barberId: string, startDate: Date, endDate: Date) {
    try {
        const [services, staffMember, clientsSnap] = await Promise.all([
            getServices(userId),
            getStaffById(userId, barberId),
            getDocs(collection(db, getCollectionPath(userId, 'clients')))
        ]);

        if (!staffMember) {
            throw new Error("Funcionário não encontrado.");
        }

        const allClients = getDatas<Client>(clientsSnap);
        const clientMap = new Map(allClients.map(c => [c.id, c.name]));

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
            app.date <= endDateString
        );

        let totalServiceCommission = 0;
        let totalProductCommission = 0;
        const detailedServices: { date: string; clientName: string; serviceName: string; servicePrice: number; commission: number; }[] = [];
        const detailedProducts: { date: string; clientName: string; productName: string; quantity: number; productPrice: number; subtotal: number, commission: number; }[] = [];

        appointmentsInPeriod.forEach((app) => {
            const clientName = clientMap.get(app.clientId) || 'Cliente de Balcão';
            
            const isSubscription = app.paymentMethod === 'Assinante';
            const isCourtesy = app.paymentMethod?.startsWith('Cortesia');
            const servicePrice = servicePriceMap.get(app.service) || 0;
            let serviceCommission = 0;

            if (!isSubscription && !isCourtesy) {
                serviceCommission = servicePrice * serviceCommissionRate;
                totalServiceCommission += serviceCommission;
            }

            detailedServices.push({
                date: format(new Date(`${app.date}T12:00:00Z`), 'dd/MM/yyyy', { locale: ptBR }),
                clientName,
                serviceName: app.service,
                servicePrice: servicePrice,
                commission: serviceCommission
            });

            if (app.soldProducts) {
                app.soldProducts.forEach(p => {
                    const subtotal = p.price * p.quantity;
                    const commission = subtotal * productCommissionRate;
                    totalProductCommission += commission;
                    detailedProducts.push({
                        date: format(new Date(`${app.date}T12:00:00Z`), 'dd/MM/yyyy', { locale: ptBR }),
                        clientName,
                        productName: p.name,
                        quantity: p.quantity,
                        productPrice: p.price,
                        subtotal,
                        commission
                    });
                });
            }
        });

        return {
            totalServiceCommission,
            totalProductCommission,
            totalCommission: totalServiceCommission + totalProductCommission,
            appointmentCount: appointmentsInPeriod.length,
            services: detailedServices,
            products: detailedProducts,
        };

    } catch (error) {
        console.error("Erro ao calcular comissões por período:", error);
        throw error;
    }
}

export async function deleteAppointment(userId: string, appointmentId: string) {
    const appointmentDocRef = doc(db, getCollectionPath(userId, 'appointments'), appointmentId);
    try {
        await deleteDoc(appointmentDocRef);
    } catch (error) {
        console.error(`Erro ao excluir agendamento ${appointmentId}:`, error);
        throw new Error("Não foi possível excluir o agendamento.");
    }
}

export async function assignSubscriptionToClient(userId: string, clientId: string, subscriptionId: string, subscriptionName: string, paymentMethod: string) {
    try {
        const clientDocRef = doc(db, getCollectionPath(userId, 'clients'), clientId);
        await updateDoc(clientDocRef, {
            subscriptionId,
            subscriptionName,
            subscriptionPaymentMethod: paymentMethod,
            subscriptionStartDate: new Date(),
        });
    } catch (error) {
        console.error(`Erro ao vincular assinatura ao cliente ${clientId}:`, error);
        throw new Error("Não foi possível vincular a assinatura.");
    }
}

export async function getSubscriptionStats(userId: string): Promise<SubscriptionStats> {
    try {
        const clientsCol = collection(db, getCollectionPath(userId, 'clients'));
        const subscriptionsCol = collection(db, getCollectionPath(userId, 'subscriptions'));
        
        // This query will only find clients that actually have the subscriptionId field.
        const [clientsSnap, subscriptionsSnap] = await Promise.all([
            getDocs(query(clientsCol, where('subscriptionId', '!=', null))),
            getDocs(subscriptionsCol),
        ]);

        const subscribedClients = getDatas<Client>(clientsSnap);
        const subscriptions = getDatas<Subscription>(subscriptionsSnap);
        const subscriptionMap = new Map(subscriptions.map(s => [s.id, s.price]));

        const totalSubscribers = subscribedClients.length;

        const monthlyRevenue = subscribedClients.reduce((total, client) => {
            if (client.subscriptionId) {
                const price = subscriptionMap.get(client.subscriptionId) || 0;
                return total + price;
            }
            return total;
        }, 0);

        // This is a placeholder. A real implementation would need to:
        // 1. Get the list of subscribed client IDs.
        // 2. Query appointments for this month where the clientId is in the list of subscribers.
        const monthlyAppointments = 0; 

        return {
            totalSubscribers,
            monthlyAppointments,
            monthlyRevenue,
        };

    } catch (error) {
        console.error("Erro ao buscar estatísticas de assinaturas:", error);
        return {
            totalSubscribers: 0,
            monthlyAppointments: 0,
            monthlyRevenue: 0,
        };
    }
}

export async function getStaffPerformanceHistory(
    userId: string, 
    staffId: string,
    dateRange?: { from: Date; to: Date }
) {
    try {
        const appointmentsCol = collection(db, getCollectionPath(userId, 'appointments'));
        const q = query(appointmentsCol, 
            where('barberId', '==', staffId), 
            where('status', '==', 'Concluído')
        );

        const [appointmentsSnap, servicesSnap, clientsSnap] = await Promise.all([
            getDocs(q),
            getDocs(collection(db, getCollectionPath(userId, 'services'))),
            getDocs(collection(db, getCollectionPath(userId, 'clients'))),
        ]);

        let appointments = getDatas<AppointmentDocument>(appointmentsSnap);
        const serviceMap = new Map(servicesSnap.docs.map(doc => {
            const data = doc.data() as Service;
            return [data.name, { price: data.price }];
        }));
        const clientMap = new Map(clientsSnap.docs.map(doc => [doc.id, doc.data().name]));

        if (dateRange?.from && dateRange?.to) {
            const startDateString = format(dateRange.from, 'yyyy-MM-dd');
            const endDateString = format(dateRange.to, 'yyyy-MM-dd');
            appointments = appointments.filter(app => {
                return app.date >= startDateString && app.date <= endDateString;
            });
        }


        const servicesHistory: { date: string; clientName: string; service: string; value: string | number }[] = [];
        const productsHistory: { date: string; clientName: string; product: string; quantity: number; value: number }[] = [];

        for (const app of appointments) {
            const clientName = clientMap.get(app.clientId) || 'Cliente de Balcão';
            
            // Handle service
            let serviceValue: string | number;
            if (app.paymentMethod === 'Assinante') {
                serviceValue = 'Assinatura';
            } else if (app.paymentMethod?.startsWith('Cortesia')) {
                serviceValue = 'Cortesia';
            } else {
                serviceValue = serviceMap.get(app.service)?.price || 0;
            }

            servicesHistory.push({
                date: app.date,
                clientName: clientName,
                service: app.service,
                value: serviceValue,
            });

            // Handle sold products
            if (app.soldProducts && app.soldProducts.length > 0) {
                app.soldProducts.forEach(p => {
                    productsHistory.push({
                        date: app.date,
                        clientName: clientName,
                        product: p.name,
                        quantity: p.quantity,
                        value: p.price * p.quantity,
                    });
                });
            }
        }
        
        const sortByDate = (a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime();
        servicesHistory.sort(sortByDate);
        productsHistory.sort(sortByDate);

        return { services: servicesHistory, products: productsHistory };

    } catch (error) {
        console.error("Erro ao buscar histórico do funcionário:", error);
        return { services: [], products: [] };
    }
}
