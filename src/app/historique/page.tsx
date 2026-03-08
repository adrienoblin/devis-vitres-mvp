'use client';

import { useAppStore } from '@/lib/store';
import { ClipboardList, Check, X, Trash2, FileText, MailCheck, PenTool } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmailModal } from '@/components/EmailModal';
import { DevisData } from '@/lib/store';
import { generateDevisPDF } from '@/lib/pdf';

export default function HistoriquePage() {
    const { devisHistory, clients, updateDevis, deleteDevis, config } = useAppStore();
    const [emailModalDevis, setEmailModalDevis] = useState<DevisData | null>(null);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-6 w-6" />
                        <h1 className="text-xl font-bold">Historique Devis</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 pb-20 space-y-4">
                {devisHistory.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
                        <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-500 font-medium">Aucun devis généré</p>
                        <Link href="/devis" className="mt-4 inline-block text-blue-600 font-bold">
                            + Créer mon premier devis
                        </Link>
                    </div>
                ) : (
                    devisHistory.map(devis => {
                        const client = clients.find(c => c.id === devis.clientId);
                        return (
                            <div key={devis.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">
                                                {client ? client.name : 'Client de passage'}
                                            </h3>
                                            <p className="text-sm text-slate-500">
                                                {format(new Date(devis.date), 'dd/MM/yyyy HH:mm')}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-blue-700">{devis.totalHT.toFixed(2)} €</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 justify-between mt-4">
                                        <button
                                            onClick={() => updateDevis(devis.id, { statut: 'accepte' })}
                                            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${devis.statut === 'accepte' ? 'bg-[#10B981] text-white shadow-inner' : 'bg-slate-100 text-[#10B981] hover:bg-[#10B981]/20'}`}
                                        >
                                            <Check className="h-4 w-4" /> Accepté
                                        </button>
                                        <button
                                            onClick={() => updateDevis(devis.id, { statut: 'refuse' })}
                                            className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-bold transition-colors ${devis.statut === 'refuse' ? 'bg-[#EF4444] text-white shadow-inner' : 'bg-slate-100 text-[#EF4444] hover:bg-[#EF4444]/20'}`}
                                        >
                                            <X className="h-4 w-4" /> Refusé
                                        </button>
                                        <Link
                                            href={`/devis?edit=${devis.id}`}
                                            className="flex-none flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-bold bg-slate-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                        >
                                            <PenTool className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Supprimer définitivement ce devis ?')) {
                                                    deleteDevis(devis.id);
                                                }
                                            }}
                                            className="flex-none flex items-center justify-center gap-1 py-2 px-3 rounded-lg text-sm font-bold bg-slate-100 text-[#6B7280] hover:bg-[#6B7280] hover:text-white transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="mt-2 text-right">
                                        <button
                                            onClick={() => setEmailModalDevis(devis)}
                                            className="w-full text-blue-600 bg-blue-50 hover:bg-blue-100 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-colors"
                                        >
                                            <MailCheck className="h-4 w-4" /> Envoyer par email
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </main>

            {emailModalDevis && (
                <EmailModal
                    recipientEmail={clients.find(c => c.id === emailModalDevis.clientId)?.email || ''}
                    clientName={clients.find(c => c.id === emailModalDevis.clientId)?.name || 'Client'}
                    clientId={emailModalDevis.clientId || ''}
                    devisDate={format(new Date(emailModalDevis.date), 'dd/MM/yyyy')}
                    totalAmount={emailModalDevis.totalHT.toFixed(2)}
                    pdfBase64={generateDevisPDF(emailModalDevis, clients.find(c => c.id === emailModalDevis.clientId), config)}
                    onClose={() => setEmailModalDevis(null)}
                />
            )}
        </div>
    );
}
