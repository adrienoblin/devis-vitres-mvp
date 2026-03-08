import { format } from 'date-fns';
import { DevisData, PricingConfig, ClientData } from '@/lib/store';
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { DevisDocument } from '@/components/pdf/DevisDocument';

export async function generateDevisPDF(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): Promise<string> {
    try {
        const asPdf = pdf(createElement(DevisDocument, { devis, client, config }) as any);
        const blob = await asPdf.toBlob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (reader.result) {
                    resolve(reader.result as string);
                } else {
                    reject(new Error("Failed to read blob as Base64"));
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.error("Erreur lors de la génération du PDF (Base64)", e);
        throw e;
    }
}

export async function downloadDevisPDF(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): Promise<void> {
    try {
        const asPdf = pdf(createElement(DevisDocument, { devis, client, config }) as any);
        const blob = await asPdf.toBlob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis-${format(new Date(devis.date), 'yyyyMMdd')}-${devis.id.substring(0, 4)}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.error("Erreur lors du téléchargement du PDF", e);
        throw e;
    }
}
