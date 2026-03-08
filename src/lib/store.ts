import type { WindowType, Size, Height, Dirtiness, WindowItem } from './types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PricingConfig {
    prices: Record<WindowType, number>;
    multipliers: {
        size: Record<Size, number>;
        height: Record<Height, number>;
        dirtiness: Record<Dirtiness, number>;
    };
    cgv: string;
    enterprise: {
        nom: string;
        logo?: string;
    };
    hubspot: {
        token: string;
        lastSync: string | null;
    };
    email: {
        address: string;
        password: string;
    };
    windowTypes: {
        id: string;
        name: string;
        price: number;
    }[];
    travel: {
        startAddress: string;
        pricePerKm: number;
    };
    globalDesignations?: {
        id: string;
        label: string;
    }[];
}

export interface ClientData {
    id: string; // will be hs_object_id if synced
    firstname: string;
    lastname: string;
    name: string; // fullname for backward compatibility
    phone: string;
    email: string;
    address: string;
    notes: string;
    needsSync?: boolean;
    photo?: string; // base64
    lastDevisTotal?: number;
    lastVisitDate?: string;
    createdAt: string;
}

export interface DevisData {
    id: string;
    clientId?: string;
    date: string;
    items: WindowItem[];
    subTotal: number;
    discount: number;
    totalHT: number;
    statut: 'brouillon' | 'accepte' | 'refuse';
    notes: string;
    signature?: string;
    photos: { windowId: string; photoBase64: string }[];
    needsSync?: boolean; // if we need to upload this quote to hubspot
    globalDesignation?: string;
    extraTaskDescription?: string;
    extraTaskPrice?: number;
}

export interface OfflineTask {
    id: string;
    type: 'CREATE_CONTACT' | 'UPLOAD_QUOTE' | 'EMAIL_SENT';
    payload: any;
    createdAt: string;
    error?: string;
}

interface AppState {
    config: PricingConfig;
    clients: ClientData[];
    devisHistory: DevisData[];
    offlineTasks: OfflineTask[];

    setConfig: (config: PricingConfig) => void;
    updateConfig: (configPartial: Partial<PricingConfig>) => void;

    addClient: (client: ClientData) => void;
    updateClient: (id: string, client: Partial<ClientData>) => void;
    deleteClient: (id: string) => void;

    addDevis: (devis: DevisData) => void;
    updateDevis: (id: string, devis: Partial<DevisData>) => void;
    deleteDevis: (id: string) => void;

    setClients: (clients: ClientData[]) => void;
    addOfflineTask: (task: OfflineTask) => void;
    removeOfflineTask: (id: string) => void;
    updateOfflineTask: (id: string, updates: Partial<OfflineTask>) => void;
}

export const DEFAULT_CONFIG: PricingConfig = {
    prices: {
        'classique': 12,
        'baie-vitree': 25,
        'porte-fenetre': 15,
        'velux': 18,
        'vitres-2': 20,
        'vitres-3': 28,
        'vitres-4': 35,
        'vitres-5': 42,
        'autre': 0,
    },
    multipliers: {
        size: {
            'petite': 0.8,
            'moyenne': 1.0,
            'grande': 1.3,
            'tres-grande': 1.8,
        },
        height: {
            'homme': 1.0,
            'legere': 1.2,
            'tres-haute': 1.6,
        },
        dirtiness: {
            'propre': 1.0,
            'legere': 1.3,
            'tres-sale': 1.7,
            'remise-en-etat': 2.2,
        },
    },
    cgv: "1. Les devis sont valables 30 jours.\n2. Le paiement est dû à réception de la facture.\n3. En cas de non-paiement, des pénalités de retard pourront être appliquées.",
    enterprise: {
        nom: "Wash Up Corp",
        logo: "",
    },
    hubspot: {
        token: "",
        lastSync: null,
    },
    email: {
        address: "",
        password: "",
    },
    windowTypes: [
        { id: 'classique', name: 'Classique', price: 12 },
        { id: 'porte-fenetre', name: 'Porte fenêtre', price: 15 },
        { id: 'baie-vitree', name: 'Baie vitrée', price: 25 },
        { id: 'velux', name: 'Vélux', price: 18 },
        { id: 'pans-veranda', name: 'Pans véranda', price: 20 },
        { id: 'bulle', name: 'Bulle', price: 30 }
    ],
    travel: {
        startAddress: "Rue de sendrogne 91 4141 Sprimont",
        pricePerKm: 0.57
    },
    globalDesignations: [
        { id: '1', label: 'Nettoyage intérieur et extérieur de vos vitres' },
        { id: '2', label: 'Nettoyage de vos vitres, uniquement faces extérieures' },
        { id: '3', label: 'Nettoyage des vitres de votre véranda' },
        { id: '4', label: 'Nettoyage intérieur et extérieur de vos vitrines et vitres' }
    ]
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            config: DEFAULT_CONFIG,
            clients: [],
            devisHistory: [],
            offlineTasks: [],

            setConfig: (config) => set({ config }),
            updateConfig: (configPartial) => set((state) => ({
                config: { ...state.config, ...configPartial }
            })),

            addClient: (client) => set((state) => ({
                clients: [...state.clients, client]
            })),
            updateClient: (id, clientPartial) => set((state) => ({
                clients: state.clients.map(c => c.id === id ? { ...c, ...clientPartial } : c)
            })),
            deleteClient: (id) => set((state) => ({
                clients: state.clients.filter(c => c.id !== id)
            })),

            addDevis: (devis) => set((state) => ({
                devisHistory: [devis, ...state.devisHistory]
            })),
            updateDevis: (id, devisPartial) => set((state) => ({
                devisHistory: state.devisHistory.map(d => d.id === id ? { ...d, ...devisPartial } : d)
            })),
            deleteDevis: (id) => set((state) => ({
                devisHistory: state.devisHistory.filter(d => d.id !== id)
            })),

            setClients: (clients) => set({ clients }),

            addOfflineTask: (task) => set((state) => ({
                offlineTasks: [...state.offlineTasks, task]
            })),
            removeOfflineTask: (id) => set((state) => ({
                offlineTasks: state.offlineTasks.filter(t => t.id !== id)
            })),
            updateOfflineTask: (id, updates) => set((state) => ({
                offlineTasks: state.offlineTasks.map(t => t.id === id ? { ...t, ...updates } : t)
            }))
        }),
        {
            name: 'prodevis-storage',
            merge: (persistedState: any, currentState: AppState) => {
                const p = persistedState as AppState;
                if (!p || !p.config) return { ...currentState, ...p };

                return {
                    ...currentState,
                    ...p,
                    config: {
                        ...currentState.config,
                        ...p.config,
                        windowTypes: p.config.windowTypes || currentState.config.windowTypes,
                        travel: p.config.travel || currentState.config.travel,
                    }
                };
            }
        }
    )
);
