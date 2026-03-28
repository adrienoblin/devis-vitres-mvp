import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DevisData, PricingConfig, ClientData } from '@/lib/store';
import { calculateWindowPrice } from '@/lib/types';

// Styling for React-PDF
const styles = StyleSheet.create({
    page: {
        backgroundColor: '#FFFFFF',
        fontFamily: 'Helvetica',
        fontSize: 10,
        color: '#1E293B',
        paddingTop: 140,
        paddingBottom: 60,
    },
    headerBg: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
        backgroundColor: '#f1f5f9', // Light UI clean background
        borderBottom: '2px solid #e2e8f0'
    },
    headerContent: {
        position: 'absolute',
        top: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    companyBox: {
        width: '33%',
    },
    logoCentered: {
        width: '33%',
        alignItems: 'center',
    },
    logoBox: {
        width: 40,
        height: 40,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        marginBottom: 10,
    },
    logoText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2563eb'
    },
    logoImage: {
        width: 38,
        height: 38,
        objectFit: 'contain',
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 4,
    },
    companyDetails: {
        fontSize: 9,
        color: '#64748b',
        lineHeight: 1.4,
    },
    clientBox: {
        width: '33%',
        alignItems: 'flex-end',
        textAlign: 'right',
    },
    clientSubLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    clientName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 4,
    },
    clientDetails: {
        fontSize: 10,
        color: '#475569',
        lineHeight: 1.4,
    },
    documentTitleSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: 30,
        paddingHorizontal: 40,
        marginBottom: 30,
    },
    titleHuge: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2563eb', // Blue brand
        letterSpacing: 2,
    },
    titleDetailsBox: {
        alignItems: 'flex-end',
    },
    devisNumberLabel: {
        fontSize: 11,
        color: '#64748b',
    },
    devisNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    devisDate: {
        fontSize: 10,
        color: '#64748b',
        marginTop: 4,
    },
    tableContainer: {
        marginHorizontal: 40,
        marginBottom: 30,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    thDescription: { flex: 4, fontWeight: 'bold', fontSize: 10, color: '#475569' },
    thQty: { flex: 1, fontWeight: 'bold', fontSize: 10, textAlign: 'center', color: '#475569' },
    thPriceUnit: { flex: 2, fontWeight: 'bold', fontSize: 10, textAlign: 'right', color: '#475569' },
    thTotal: { flex: 2, fontWeight: 'bold', fontSize: 10, textAlign: 'right', color: '#475569' },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1px solid #f1f5f9',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#ffffff'
    },
    tdDescriptionBox: { flex: 4 },
    tdDescriptionTitle: { fontWeight: 'bold', color: '#1e293b', marginBottom: 3, fontSize: 10 },
    tdDescriptionSub: { color: '#64748b', fontSize: 9 },
    tdQty: { flex: 1, textAlign: 'center', color: '#334155' },
    tdPriceUnit: { flex: 2, textAlign: 'right', color: '#334155' },
    tdTotal: { flex: 2, textAlign: 'right', fontWeight: 'bold', color: '#0f172a' },
    totalsSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 40,
        marginBottom: 40,
    },
    totalsBox: {
        width: 200,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        backgroundColor: '#ffffff',
        overflow: 'hidden'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        borderBottom: '1px solid #f1f5f9',
    },
    totalRowLast: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 12,
        backgroundColor: '#f8fafc',
    },
    totalLabel: { color: '#64748b', fontSize: 10 },
    totalValue: { fontWeight: 'bold', color: '#334155', fontSize: 10 },
    grandTotalLabel: { fontWeight: 'bold', color: '#2563eb', fontSize: 14 },
    grandTotalValue: { fontWeight: 'bold', color: '#2563eb', fontSize: 14 },
    cgvSection: {
        paddingHorizontal: 40,
        marginTop: 20,
    },
    cgvTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    cgvText: {
        fontSize: 8,
        color: '#64748b',
        lineHeight: 1.5,
    },
    signatureBox: {
        width: 150,
    },
    signatureLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#1e293b',
        marginBottom: 10,
    },
    signatureImage: {
        width: 120,
        height: 60,
        borderBottom: '1px solid #e2e8f0',
    },
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        backgroundColor: '#1e293b',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    footerText: {
        color: '#94a3b8',
        fontSize: 8,
    },
    footerStrong: {
        color: '#f8fafc',
        fontWeight: 'bold',
    }
});

interface DevisDocumentProps {
    devis: DevisData;
    client?: ClientData;
    config: PricingConfig;
}

export const DevisDocument = ({ devis, client, config }: DevisDocumentProps) => {
    const formattedDate = format(new Date(devis.date), 'dd MMMM yyyy', { locale: fr });
    const formattedDateId = format(new Date(devis.date), 'yyyyMMdd');
    const displayId = `DEV-${formattedDateId}-${devis.id.substring(0, 4).toUpperCase()}`;

    const totalHT = devis.totalHT;
    const tva = totalHT * 0.21;
    const totalTTC = totalHT + tva;

    const rows: { name: string, quantity?: number, total?: number, isTravel?: boolean, isCategoryTitle?: boolean }[] = [];
    const normalItems = devis.items.filter(i => !i.isFraisDeplacement);

    if (devis.globalDesignation) {
        const globalTotal = normalItems.reduce((acc, item) => acc + calculateWindowPrice(item, config), 0);
        if (globalTotal > 0) {
            rows.push({
                name: devis.globalDesignation,
                quantity: 1,
                total: globalTotal,
                isTravel: false
            });
        }
    } else {
        // Separate items by category
        const categorizedItems: Record<string, typeof normalItems> = {};
        const uncategorizedItems: typeof normalItems = [];

        normalItems.forEach(item => {
            if (item.categoryId) {
                if (!categorizedItems[item.categoryId]) categorizedItems[item.categoryId] = [];
                categorizedItems[item.categoryId].push(item);
            } else {
                uncategorizedItems.push(item);
            }
        });

        // Helper to group items by type name and add to rows
        const addItemsToRows = (items: typeof normalItems) => {
            const grouped = items.reduce((acc, item) => {
                const typeName = item.type === 'autre' ? (item.description || 'Autre prestation') : (config.windowTypes?.find(w => w.id === item.type)?.name || item.type);
                if (!acc[typeName]) acc[typeName] = { quantity: 0, total: 0 };
                acc[typeName].quantity += (item.quantity || 1);
                acc[typeName].total += calculateWindowPrice(item, config);
                return acc;
            }, {} as Record<string, { quantity: number, total: number }>);

            Object.entries(grouped).forEach(([name, data]) => {
                rows.push({ name, quantity: data.quantity, total: data.total, isTravel: false });
            });
        };

        // Add uncategorized items first
        if (uncategorizedItems.length > 0) {
            addItemsToRows(uncategorizedItems);
        }

        // Add categorized items
        if (devis.categories && devis.categories.length > 0) {
            devis.categories.forEach(cat => {
                const catItems = categorizedItems[cat.id];
                if (catItems && catItems.length > 0) {
                    rows.push({ name: cat.name, isCategoryTitle: true });
                    
                    if (cat.globalDesignation) {
                        const catTotal = catItems.reduce((acc, item) => acc + calculateWindowPrice(item, config), 0);
                        if (catTotal > 0) {
                            rows.push({
                                name: cat.globalDesignation,
                                quantity: 1,
                                total: catTotal,
                                isTravel: false
                            });
                        }
                    } else {
                        addItemsToRows(catItems);
                    }
                }
            });
        }
    }

    // Handle multiple extra tasks and old devis format fallback
    const allExtraTasks = devis.extraTasks ? [...devis.extraTasks] : [];
    if (devis.extraTaskDescription && devis.extraTaskPrice && allExtraTasks.length === 0) {
        allExtraTasks.push({ id: 'legacy', description: devis.extraTaskDescription, price: devis.extraTaskPrice });
    }

    allExtraTasks.forEach(task => {
        rows.push({
            name: task.description,
            quantity: 1,
            total: task.price,
            isTravel: false
        });
    });

    const travelItems = devis.items.filter(i => i.isFraisDeplacement);
    travelItems.forEach(item => {
        rows.push({
            name: item.description || 'Frais de déplacement',
            quantity: item.quantity || 1,
            total: calculateWindowPrice(item, config),
            isTravel: true
        });
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Background */}
                <View style={styles.headerBg} fixed />

                {/* Header Content */}
                <View style={styles.headerContent} fixed>
                    <View style={styles.companyBox}>
                        <Text style={styles.companyName}>{config.enterprise.nom || "WASH UP CORP"}</Text>
                        <Text style={styles.companyDetails}>Chaussée de la seigneurie 60a</Text>
                        <Text style={styles.companyDetails}>4800 Petit Rechain, Belgique</Text>
                        <Text style={styles.companyDetails}>TVA: BE0688635662</Text>
                    </View>

                    <View style={styles.logoCentered}>
                        <View style={!(config.enterprise.logo) ? styles.logoBox : { marginBottom: 10 }}>
                            {config.enterprise.logo ? (
                                <Image src={config.enterprise.logo} style={styles.logoImage} />
                            ) : (
                                <Text style={styles.logoText}>W—</Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.clientBox}>
                        <Text style={styles.clientSubLabel}>Pour</Text>
                        <Text style={styles.clientName}>{client?.name || "Client de passage"}</Text>
                        {client?.address && (
                            <Text style={styles.clientDetails}>
                                {client.address}
                            </Text>
                        )}
                        {client?.phone && <Text style={styles.clientDetails}>{client.phone}</Text>}
                        {client?.email && <Text style={styles.clientDetails}>{client.email}</Text>}
                    </View>
                </View>

                {/* Title */}
                <View style={styles.documentTitleSection}>
                    <Text style={styles.titleHuge}>DEVIS</Text>
                    <View style={styles.titleDetailsBox}>
                        <Text style={styles.devisNumberLabel}>Réf: <Text style={styles.devisNumber}>{displayId}</Text></Text>
                        <Text style={styles.devisDate}>{formattedDate}</Text>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.thDescription}>Désignation</Text>
                        <Text style={styles.thQty}>Qté</Text>
                        <Text style={styles.thPriceUnit}>Prix unitaire (HT)</Text>
                        <Text style={styles.thTotal}>Total (HT)</Text>
                    </View>

                    {rows.map((row, index) => {
                        if (row.isCategoryTitle) {
                            return (
                                <View style={[styles.tableRow, { backgroundColor: '#f1f5f9', paddingVertical: 8 }]} key={`cat-${index}`}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: 'bold', fontSize: 11, color: '#1e293b', textTransform: 'uppercase' }}>
                                            {row.name}
                                        </Text>
                                    </View>
                                </View>
                            );
                        }

                        const qty = row.quantity || 1;
                        const rowTotal = row.total || 0;
                        let pU = rowTotal / qty;

                        // Display quantity handling: if globalDesignation is used for the row, keep 1.
                        let displayQuantity = qty.toString();
                        if (devis.globalDesignation && row.name === devis.globalDesignation) {
                            displayQuantity = "1";
                            pU = rowTotal;
                        }

                        let displayUnitPrice = pU.toFixed(2) + " €";
                        if (row.isTravel && config.travel?.pricePerKm) {
                            displayUnitPrice = config.travel.pricePerKm.toFixed(2) + " €";
                        }

                        return (
                            <View style={styles.tableRow} key={`row-${index}`}>
                                <View style={styles.tdDescriptionBox}>
                                    <Text style={styles.tdDescriptionTitle}>
                                        {row.name}
                                    </Text>
                                </View>
                                <Text style={styles.tdQty}>{displayQuantity}</Text>
                                <Text style={styles.tdPriceUnit}>{displayUnitPrice}</Text>
                                <Text style={styles.tdTotal}>{rowTotal.toFixed(2)} €</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
                    {/* Left side: Signature */}
                    <View style={styles.signatureBox}>
                        {devis.signature && (
                            <>
                                <Text style={styles.signatureLabel}>Bon pour accord :</Text>
                                <Image src={devis.signature} style={styles.signatureImage} />
                                <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>Signé le {formattedDate}</Text>
                            </>
                        )}
                    </View>

                    {/* Right side: Totals */}
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Sous-total (HTVA)</Text>
                            <Text style={styles.totalValue}>{totalHT.toFixed(2)} €</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TVA (21%)</Text>
                            <Text style={styles.totalValue}>{tva.toFixed(2)} €</Text>
                        </View>
                        <View style={styles.totalRowLast}>
                            <Text style={styles.grandTotalLabel}>Total(TTC)</Text>
                            <Text style={styles.grandTotalValue}>{totalTTC.toFixed(2)} €</Text>
                        </View>
                    </View>
                </View>

                {/* CGV and Notes on a new page */}
                <View break style={{ paddingHorizontal: 40 }}>
                    {devis.notes && (
                        <View style={{ marginBottom: 15 }}>
                            <Text style={styles.cgvTitle}>Notes Additionnelles</Text>
                            <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.4 }}>{devis.notes}</Text>
                        </View>
                    )}

                    {travelItems.length > 0 && devis.categories && devis.categories.length > 1 && (
                        <View style={{ marginBottom: 15 }}>
                            <Text style={styles.cgvTitle}>Information sur les frais de déplacement</Text>
                            <Text style={{ fontSize: 9, color: '#1e293b', fontWeight: 'bold', lineHeight: 1.4 }}>
                                Les frais de déplacement ne seront affectés que sur la prestation choisie ou sur le groupe de prestations si vous en validez plusieurs.
                            </Text>
                        </View>
                    )}

                    <Text style={styles.cgvTitle}>Conditions Générales</Text>
                    <Text style={styles.cgvText}>
                        Wash Up Corp – Adrien Oblin{'\n'}
                        Contact: adrien.oblin@gmail.com - 0475/32.35.70{'\n'}
                        {config.cgv || "Entreprise de nettoyage – Verviers, Liège, Sprimont & alentours."}
                    </Text>
                </View>

                {/* Footer Background */}
                <View style={styles.footerContainer} fixed>
                    <Text style={styles.footerText}>
                        <Text style={styles.footerStrong}>Wash Up Corp</Text> – Chaussée de la seigneurie 60a, 4800 Petit Rechain, BE
                    </Text>
                    <Text style={styles.footerText}>
                        IBAN BE96 0689 5332 3505 | TVA BE0688635662
                    </Text>
                </View>
            </Page>
        </Document>
    );
};

export default DevisDocument;
