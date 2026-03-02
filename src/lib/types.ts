export type WindowType =
    | 'classique'
    | 'baie-vitree'
    | 'porte-fenetre'
    | 'velux'
    | 'vitres-2'
    | 'vitres-3'
    | 'vitres-4'
    | 'vitres-5'
    | 'autre';

export type Size = 'petite' | 'moyenne' | 'grande' | 'tres-grande';
export type Height = 'homme' | 'legere' | 'tres-haute';
export type Dirtiness = 'propre' | 'legere' | 'tres-sale' | 'remise-en-etat';

export interface WindowItem {
    id: string;
    type: WindowType;
    size: Size;
    height: Height;
    dirtiness: Dirtiness;
    quantity: number;
    description?: string; // For "autre"
    prixManuel?: number;  // For "autre"
    note?: string;        // New text
}

export const BASE_PRICES: Record<WindowType, number> = {
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
        'homme': 'Hauteur d\'homme',
        'legere': 'Légèrement haute',
        'tres-haute': 'Très haute',
    },
    dirtiness: {
        'propre': 'Propre',
        'legere': 'Légèrement sale',
        'tres-sale': 'Très sale',
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
}

export function calculateWindowPrice(item: Omit<WindowItem, 'id'>, config: PricingConfigParams): number {
    if (item.type === 'autre' && item.prixManuel !== undefined) {
        return item.prixManuel * item.quantity;
    }
    const basePrice = config.prices[item.type] || 0;
    const sizeMult = config.multipliers.size[item.size] || 1;
    const heightMult = config.multipliers.height[item.height] || 1;
    const dirtMult = config.multipliers.dirtiness[item.dirtiness] || 1;

    return basePrice * sizeMult * heightMult * dirtMult * item.quantity;
}
