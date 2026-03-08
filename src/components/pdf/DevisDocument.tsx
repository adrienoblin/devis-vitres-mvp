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
        paddingBottom: 60,
    },
    headerSpace: {
        height: 120,
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
        width: '45%',
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
        width: '45%',
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
        justifyContent: 'flex-end',
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
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 40,
        marginTop: 40,
        marginBottom: 20
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

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header Background */}
                <View style={styles.headerBg} fixed />

                {/* Header Content */}
                <View style={styles.headerContent} fixed>
                    <View style={styles.companyBox}>
                        <View style={styles.logoBox}>
                            <Text style={styles.logoText}>W—</Text>
                        </View>
                        <Text style={styles.companyName}>{config.enterprise.nom || "WASH UP CORP"}</Text>
                        <Text style={styles.companyDetails}>Chaussée de la seigneurie 60a</Text>
                        <Text style={styles.companyDetails}>4800 Petit Rechain, Belgique</Text>
                        <Text style={styles.companyDetails}>TVA: BE0688635662</Text>
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

                {/* Padding for header */}
                <View style={styles.headerSpace} />

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

                    {devis.items.map((w, index) => {
                        const wt = config.windowTypes?.find(type => type.id === w.type);
                        const isFrais = w.isFraisDeplacement || w.type === 'autre';
                        const wTotal = calculateWindowPrice(w, config);
                        const qty = w.quantity || 1;
                        const pU = wTotal / qty;

                        return (
                            <View style={styles.tableRow} key={w.id || index}>
                                <View style={styles.tdDescriptionBox}>
                                    <Text style={styles.tdDescriptionTitle}>
                                        {w.description || (isFrais ? 'Frais de déplacement' : (wt?.name || w.type))}
                                    </Text>
                                    {!isFrais && (
                                        <Text style={styles.tdDescriptionSub}>
                                            Taille: {w.size} - Hauteur: {w.height} - Saleté: {w.dirtiness}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.tdQty}>{qty}</Text>
                                <Text style={styles.tdPriceUnit}>{pU.toFixed(2)} €</Text>
                                <Text style={styles.tdTotal}>{wTotal.toFixed(2)} €</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Totals */}
                <View style={styles.totalsSection}>
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

                {/* Notes and Signature */}
                <View style={styles.signatureSection}>
                    <View style={{ flex: 1, paddingRight: 40 }}>
                        {devis.notes && (
                            <View style={{ marginBottom: 15 }}>
                                <Text style={styles.cgvTitle}>Notes Additionnelles</Text>
                                <Text style={{ fontSize: 9, color: '#475569', lineHeight: 1.4 }}>{devis.notes}</Text>
                            </View>
                        )}
                        <Text style={styles.cgvTitle}>Conditions Générales</Text>
                        <Text style={styles.cgvText}>
                            Wash Up Corp – Adrien Oblin{'\n'}
                            Contact: adrien.oblin@gmail.com - 0475/32.35.70{'\n'}
                            {config.cgv || "Entreprise de nettoyage – Verviers, Liège, Sprimont & alentours."}
                        </Text>
                    </View>

                    {devis.signature && (
                        <View style={styles.signatureBox}>
                            <Text style={styles.signatureLabel}>Bon pour accord :</Text>
                            <Image src={devis.signature} style={styles.signatureImage} />
                            <Text style={{ fontSize: 8, color: '#94a3b8', marginTop: 4 }}>Signé  le {formattedDate}</Text>
                        </View>
                    )}
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
