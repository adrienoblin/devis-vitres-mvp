import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DevisData, PricingConfig, ClientData } from '@/lib/store';
import { calculateWindowPrice } from '@/lib/types';

export function buildDevisPDFDoc(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): jsPDF {
    const doc = new jsPDF();

    // =====================================
    // TOP GREEN HEADER (0 to 60)
    // =====================================
    doc.setFillColor(185, 221, 187); // Pastel green from image
    doc.rect(0, 0, 210, 60, 'F');

    // White Box for Logo
    doc.setFillColor(255, 255, 255);
    doc.rect(95, 5, 20, 15, 'F');
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("-W-", 105, 12, { align: "center" });
    doc.setFontSize(6);
    doc.text("Wash Up", 105, 17, { align: "center" });

    // "De" Section
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("De", 15, 25);
    doc.setFontSize(12);
    doc.text(config.enterprise.nom || "WASH UP CORP", 15, 30);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Chaussée de la seigneurie 60a", 15, 35);
    doc.text("4800 Petit Rechain", 15, 40);
    doc.text("Belgique", 15, 45);
    doc.text("TVA: BE0688635662", 15, 53);

    // "Pour" Section
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Pour", 195, 25, { align: "right" });
    doc.setFontSize(12);
    doc.text(client?.name || "Client de passage", 195, 30, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (client?.address) {
        const addrLines = doc.splitTextToSize(client.address, 60);
        let curY = 35;
        addrLines.forEach((line: string) => {
            doc.text(line, 195, curY, { align: "right" });
            curY += 5;
        });
    }

    // =====================================
    // TITLE & DATES
    // =====================================
    let yPos = 80;

    // DEVIS HUGE
    doc.setTextColor(200, 204, 208); // light gray
    doc.setFontSize(36);
    doc.setFont("helvetica", "normal");
    doc.text("DEVIS", 15, yPos);

    // DEVIS IDs
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    const formattedDate = new Date(devis.date);
    const devisId = `DEVIS ${format(formattedDate, 'yyyy')}-${devis.id.substring(0, 3).toUpperCase()}`;
    doc.text(devisId, 195, yPos - 10, { align: "right" });

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Émis le: ${format(formattedDate, 'dd MMM yyyy', { locale: fr })}`, 195, yPos - 5, { align: "right" });
    const validityDate = new Date(formattedDate);
    validityDate.setDate(validityDate.getDate() + 30);
    doc.text(`Valide jusqu'au: ${format(validityDate, 'dd MMM yyyy', { locale: fr })}`, 195, yPos, { align: "right" });

    yPos += 20;

    // =====================================
    // TABLE HEADERS
    // =====================================
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Description", 15, yPos);
    doc.text("Prix (HTVA)", 110, yPos);
    doc.text("Taux de TVA", 140, yPos);
    doc.text("Quantité", 170, yPos);
    doc.text("Total", 195, yPos, { align: "right" });
    yPos += 8;

    // Group items by type for PDF
    const grouped = devis.items.reduce((acc, item) => {
        let typeName = '';
        if (item.isFraisDeplacement) {
            typeName = item.description || 'Déplacement';
        } else if (item.type === 'autre') {
            typeName = item.description || 'Autre prestation';
        } else {
            typeName = config.windowTypes?.find(w => w.id === item.type)?.name || item.type;
        }

        if (!acc[typeName]) acc[typeName] = { quantity: 0, total: 0, isTravel: item.isFraisDeplacement };
        acc[typeName].quantity += item.quantity;
        acc[typeName].total += calculateWindowPrice(item, config);
        return acc;
    }, {} as Record<string, { quantity: number, total: number, isTravel?: boolean }>);

    doc.setFont("helvetica", "normal");
    Object.entries(grouped).forEach(([name, data]) => {
        const splitName = doc.splitTextToSize(name, 90);

        let unitPrice = data.total / (data.quantity || 1);
        let displayQuantity = data.quantity.toString();
        let displayUnitPrice = unitPrice.toFixed(2) + " €";

        if (data.isTravel && config.travel?.pricePerKm) {
            // For travel, show the per KM price and qty = total KM.
            displayUnitPrice = config.travel.pricePerKm.toFixed(2) + " €";
            // If the total was directly derived from travelPricePerKm * qty, qty should match km
            // we don't need to recalculate displayQuantity here, it's just `data.quantity` (km * 2).
            // However, if manual overrides happened, the unit price will be total/km.
        }

        doc.text(splitName, 15, yPos);
        doc.text(displayUnitPrice, 110, yPos);
        doc.text("21 %", 140, yPos);
        doc.text(displayQuantity, 170, yPos);
        doc.text(`${data.total.toFixed(2)} €`, 195, yPos, { align: "right" });

        yPos += 5 * splitName.length;

        if (data.isTravel) {
            doc.setFontSize(8);
            doc.setTextColor(80, 80, 80);
            doc.text(`(Km allez-retour) x ${config.travel?.pricePerKm || 0.57}€`, 15, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            yPos += 5;
        }
        yPos += 4;
    });

    yPos += 15;

    // =====================================
    // TOTALS
    // =====================================
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Sous-total HTVA", 150, yPos);
    doc.text(`${devis.totalHT.toFixed(2)} €`, 195, yPos, { align: "right" });
    yPos += 6;

    const tva = devis.totalHT * 0.21;
    doc.text("TVA (21%)", 150, yPos);
    doc.text(`${tva.toFixed(2)} €`, 195, yPos, { align: "right" });
    yPos += 6;

    doc.setFont("helvetica", "bold");
    const totalTTC = devis.totalHT + tva;
    doc.text("Montant", 150, yPos);
    doc.text(`${totalTTC.toFixed(2)} €`, 195, yPos, { align: "right" });

    yPos += 20;

    // =====================================
    // CGV
    // =====================================
    doc.setFont("helvetica", "normal");
    doc.text("Conditions générales", 15, yPos); yPos += 6;
    doc.text("Wash Up Corp – Adrien Oblin", 15, yPos); yPos += 4;
    doc.text("Contact : adrien.oblin@gmail.com - 0475/32.35.70", 15, yPos); yPos += 4;
    doc.text("Entreprise de nettoyage – Verviers, Liège, Sprimont & alentours", 15, yPos); yPos += 8;

    if (config.cgv) {
        doc.setFontSize(8);
        const splitCgv = doc.splitTextToSize(config.cgv, 180);
        let linesDrawn = 0;
        while (linesDrawn < splitCgv.length) {
            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }
            const spaceRemaining = 270 - yPos;
            const linesFit = Math.floor(spaceRemaining / 4);
            const textChunk = splitCgv.slice(linesDrawn, linesDrawn + linesFit);
            doc.text(textChunk, 15, yPos);
            yPos += textChunk.length * 4;
            linesDrawn += textChunk.length;
        }
    }

    // Notes
    if (devis.notes && devis.notes.trim()) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        yPos += 5;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.text("Notes additionnelles:", 15, yPos);
        yPos += 5;
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(devis.notes, 180);
        doc.text(splitNotes, 15, yPos);
        yPos += splitNotes.length * 5;
    }

    if (devis.signature) {
        if (yPos > 230) {
            doc.addPage();
            yPos = 20;
        }
        yPos += 15;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text('Bon pour accord :', 15, yPos);
        doc.addImage(devis.signature, 'PNG', 15, yPos + 5, 50, 25);
    }

    // =====================================
    // FOOTER
    // =====================================
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text("IBAN: BE96 0689 5332 3505", 15, 285);
        doc.text("adrien.oblin@gmail.com\n+32475323570", 195, 280, { align: "right" });
    }

    return doc;
}

export function generateDevisPDF(
    devis: DevisData,
    client: ClientData | undefined,
    config: PricingConfig
): string {
    const doc = buildDevisPDFDoc(devis, client, config);
    return doc.output('datauristring');
}
