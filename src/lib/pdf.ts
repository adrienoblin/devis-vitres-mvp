import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { DevisData, PricingConfig, ClientData } from '@/lib/store';
import { calculateWindowPrice } from '@/lib/types';

export function generateDevisPDF(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): string {
    const doc = new jsPDF();
    let yPos = 65;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(config.enterprise.nom || 'Devis Nettoyage', 14, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Date : ${format(new Date(devis.date), 'dd/MM/yyyy')}`, 14, 35);
    // Optional: keep devis ID or something if you'd stored it, but falling back to fallback
    doc.text(`Devis #DEV-${devis.id.substring(0, 4).toUpperCase()}`, 14, 41);

    // Client Info
    if (client) {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Client :", 120, 25);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(client.name, 120, 31);
        doc.setFont("helvetica", "normal");
        if (client.address) doc.text(client.address, 120, 37);
        if (client.phone) doc.text(client.phone, 120, 43);
    }

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text('NETTOYAGE COMPLET VITRERIE', 14, yPos);
    yPos += 15;

    if (client?.address) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`📍 Intervention : ${client.address}`, 14, yPos);
        yPos += 15;
    }

    // Group items by type for PDF
    const grouped = devis.items.reduce((acc, item) => {
        let typeName = '';
        if (item.isFraisDeplacement) {
            typeName = item.description || 'Frais de déplacement';
        } else if (item.type === 'autre') {
            typeName = item.description || 'Autre prestation';
        } else {
            typeName = config.windowTypes?.find(w => w.id === item.type)?.name || item.type;
        }

        if (!acc[typeName]) acc[typeName] = { quantity: 0, total: 0 };
        acc[typeName].quantity += item.quantity;
        acc[typeName].total += calculateWindowPrice(item, config);
        return acc;
    }, {} as Record<string, { quantity: number, total: number }>);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text('Désignation', 14, yPos);
    doc.text('Qté', 140, yPos);
    doc.text('Total HT', 170, yPos);
    yPos += 8;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    Object.entries(grouped).forEach(([name, data]) => {
        const splitName = doc.splitTextToSize(name, 110);
        doc.text(splitName, 14, yPos);
        doc.text(data.quantity.toString(), 140, yPos);
        doc.text(`${data.total.toFixed(2)} €`, 170, yPos);
        yPos += 8 * splitName.length;
    });

    yPos += 10;
    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos, 182, 20, 'F');
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL FORFAITAIRE : ${devis.totalHT.toFixed(2)} € HTVA`, 20, yPos + 14);
    yPos += 35;

    // Notes
    if (devis.notes) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Notes / Précisions :', 14, yPos);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const splitNotes = doc.splitTextToSize(devis.notes, 180);
        doc.text(splitNotes, 14, yPos + 8);
        yPos += 15 + (splitNotes.length * 5);
        doc.setTextColor(0, 0, 0);
    }

    // CGV
    if (config.cgv) {
        yPos += 10;
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const splitCgv = doc.splitTextToSize(config.cgv, 180);

        let linesDrawn = 0;
        while (linesDrawn < splitCgv.length) {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
            const spaceRemaining = 280 - yPos;
            const linesFit = Math.floor(spaceRemaining / 4);
            const textChunk = splitCgv.slice(linesDrawn, linesDrawn + linesFit);
            doc.text(textChunk, 14, yPos);
            yPos += textChunk.length * 4;
            linesDrawn += textChunk.length;
        }
        doc.setTextColor(0, 0, 0);
    }

    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    yPos += 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Bon pour accord (Signature) :', 14, yPos);

    if (devis.signature) {
        doc.addImage(devis.signature, 'PNG', 14, yPos + 5, 80, 40);
    }

    return doc.output('datauristring');
}
