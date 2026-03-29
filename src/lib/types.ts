// To allow dynamic window types, WindowType is now just a string
export type WindowType = string;

export type Size = 'petite' | 'moyenne' | 'grande' | 'tres-grande';
export type Height = 'homme' | 'legere' | 'tres-haute';
export type Dirtiness = 'propre' | 'legere' | 'tres-sale' | 'remise-en-etat';

export interface WindowItem {
    id: string;
    categoryId?: string; // Links this item to a specific category section
    type: WindowType;
    size: Size;
    height: Height;
    dirtiness: Dirtiness;
    quantity: number;
    description?: string; // For "autre"
    prixManuel?: number;  // For "autre"
    note?: string;        // New text
    isFraisDeplacement?: boolean; // For travel cost
}

export const BASE_PRICES: Record<string, number> = {
    'classique': 8,
    'velux': 12,
    'porte-fenetre': 15,
    'vitres-2': 18,
    'baie-vitree': 20,
    'vitres-3': 22,
    'vitres-4': 26,
    'vitres-5': 30,
    'autre': 0,
};

export const MULTIPLIERS = {
    size: {
        'petite': 0.8,
        'moyenne': 1.0,
        'grande': 1.5,
        'tres-grande': 2.0,
    } as Record<Size, number>,
    height: {
        'homme': 1.0,
        'legere': 1.2,
        'tres-haute': 1.5,
    } as Record<Height, number>,
    dirtiness: {
        'propre': 0.9,
        'legere': 1.0,
        'tres-sale': 1.3,
        'remise-en-etat': 2.0,
    } as Record<Dirtiness, number>,
};

export const LABELS = {
    types: {
        'classique': 'Classique',
        'baie-vitree': 'Baie vitrée',
        'porte-fenetre': 'Porte-fenêtre',
        'velux': 'Velux',
        'vitres-2': 'Vitres en 2 parties',
        'vitres-3': 'Vitres en 3 parties',
        'vitres-4': 'Vitres en 4 parties',
        'vitres-5': 'Vitres en 5 parties',
        'autre': '🔧 Autre',
    },
    sizes: {
        'petite': 'Petite',
        'moyenne': 'Moyenne',
        'grande': 'Grande',
        'tres-grande': 'Très grande',
    },
    heights: {
        'homme': "Hauteur d'homme",
        'legere': 'Haute',
        'tres-haute': 'Très haute',
    },
    dirtiness: {
        'propre': 'Propre',
        'legere': 'Légèrement sale',
        'tres-sale': 'Sale',
        'remise-en-etat': 'Remise en état',
    }
};

// Need to import PricingConfig from store to use its structure, but since store imports types, we'll avoid circular dependencies
// by defining a simplified interface or just accepting any object with the same shape.
interface PricingConfigParams {
    prices: Record<WindowType, number>;
    multipliers: {
        size: Record<Size, number>;
        height: Record<Height, number>;
        dirtiness: Record<Dirtiness, number>;
    };
    windowTypes?: { id: string, name: string, price: number }[];
}

export function calculateWindowPrice(item: Omit<WindowItem, 'id'>, config: PricingConfigParams): number {
    if (item.prixManuel !== undefined && item.prixManuel !== null) {
        return item.prixManuel * item.quantity;
    }

    let basePrice = 0;
    if (config.windowTypes) {
        const wt = config.windowTypes.find(w => w.id === item.type);
        if (wt) basePrice = wt.price;
        else basePrice = config.prices[item.type] || 0;
    } else {
        basePrice = config.prices[item.type] || 0;
    }

    const sizeMult = config.multipliers.size[item.size] || 1;
    const heightMult = config.multipliers.height[item.height] || 1;
    const dirtMult = config.multipliers.dirtiness[item.dirtiness] || 1;

    return basePrice * sizeMult * heightMult * dirtMult * item.quantity;
}
