import { format } from 'date-fns';
import { DevisData, PricingConfig, ClientData } from '@/lib/store';
import { pdf, Document } from '@react-pdf/renderer';
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
        
        const base64 = await new Promise<string>((resolve, reject) => {
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
        
        // Cleanup Yoga memory leak
        asPdf.updateContainer(createElement(Document, {} as any));
        return base64;
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
        
        const formattedDateId = format(new Date(devis.date), 'yyyyMMdd');
        const filename = `devis-${formattedDateId}-${devis.id.substring(0, 4)}.pdf`;

        // Native share on mobile (PWA safe)
        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                const file = new File([blob], filename, { type: 'application/pdf' });
                if (navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: `Devis Wash Up`,
                    });
                } else {
                    triggerStandardDownload(blob, filename);
                }
            } catch (err: any) {
                // AbortError = user dismissed the share sheet, not a real error
                if (err?.name !== 'AbortError') {
                    console.warn("Share failed, falling back to download", err);
                    triggerStandardDownload(blob, filename);
                }
            }
        } else {
            triggerStandardDownload(blob, filename);
        }

        // Cleanup Yoga memory leak
        asPdf.updateContainer(createElement(Document, {} as any));
    } catch (e) {
        console.error("Erreur lors du téléchargement du PDF", e);
        throw e;
    }
}

export async function generateAndDownloadDevisPDF(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): Promise<string> {
    try {
        const asPdf = pdf(createElement(DevisDocument, { devis, client, config }) as any);
        const blob = await asPdf.toBlob();

        const formattedDateId = format(new Date(devis.date), 'yyyyMMdd');
        const filename = `devis-${formattedDateId}-${devis.id.substring(0, 4)}.pdf`;

        // Only generate Base64 here, no native share or download.

        // Convert to Base64 for the email modal & sync
        const base64 = await new Promise<string>((resolve, reject) => {
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

        // Cleanup Yoga memory leak
        asPdf.updateContainer(createElement(Document, {} as any));

        return base64;
    } catch (e) {
        console.error("Erreur dans generateAndDownloadDevisPDF", e);
        throw e;
    }
}

export async function previewDevisPDF(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): Promise<void> {
    // Open window synchronously to avoid popup blockers
    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
        previewWindow.document.write('<div style="font-family:sans-serif;padding:20px;text-align:center;">Génération de l\\'aperçu en cours...</div>');
    }

    try {
        const asPdf = pdf(createElement(DevisDocument, { devis, client, config }) as any);
        const blob = await asPdf.toBlob();
        const url = URL.createObjectURL(blob);
        
        if (previewWindow) {
            previewWindow.location.href = url;
        } else {
            // Fallback if blocked
            window.open(url, '_blank') || (window.location.href = url);
        }

        // Cleanup
        asPdf.updateContainer(createElement(Document, {} as any));
    } catch (e) {
        if (previewWindow) previewWindow.close();
        console.error("Erreur lors de l'aperçu", e);
        throw e;
    }
}

function triggerStandardDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 500); // 500ms safer for heavy blobs
}

