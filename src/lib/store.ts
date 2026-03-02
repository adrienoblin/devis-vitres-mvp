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
}

export interface ClientData {
    id: string;
    name: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
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
}

interface AppState {
    config: PricingConfig;
    clients: ClientData[];
    devisHistory: DevisData[];

    setConfig: (config: PricingConfig) => void;
    updateConfig: (configPartial: Partial<PricingConfig>) => void;

    addClient: (client: ClientData) => void;
    updateClient: (id: string, client: Partial<ClientData>) => void;
    deleteClient: (id: string) => void;

    addDevis: (devis: DevisData) => void;
    updateDevis: (id: string, devis: Partial<DevisData>) => void;
    deleteDevis: (id: string) => void;
}

const DEFAULT_CONFIG: PricingConfig = {
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
        nom: "ProDevis Vitres",
        logo: "",
    }
};

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            config: DEFAULT_CONFIG,
            clients: [],
            devisHistory: [],

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
            }))
        }),
        {
            name: 'prodevis-storage',
        }
    )
);
