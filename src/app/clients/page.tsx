'use client';

import { useState, useRef } from 'react';
import { useAppStore, ClientData, DevisData } from '@/lib/store';
import { Users, Plus, Edit2, Trash2, ChevronLeft, MapPin, Phone, Mail, FileText, Camera, MailCheck, X, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmailModal } from '@/components/EmailModal';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { syncHubspotContacts, processOfflineTasks } from '@/lib/hubspot';
import { generateDevisPDF, downloadDevisPDF } from '@/lib/pdf';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

type ViewMode = 'list' | 'detail' | 'form';

export default function ClientsPage() {
    const { clients, addClient, updateClient, deleteClient, devisHistory, config, addOfflineTask } = useAppStore();
    const [view, setView] = useState<ViewMode>('list');
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const u = new URLSearchParams(window.location.search);
            if (u.get('new') === 'true') {
                handleCreateNew();
                window.history.replaceState(null, '', '/clients');
            }
        }
    }, []);

    // Form state
    const [formData, setFormData] = useState<Partial<ClientData>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateNew = () => {
        setFormData({
            firstname: '', lastname: '', name: '', phone: '', email: '', address: '', notes: '', photo: ''
        });
        setSelectedClient(null);
        setView('form');
    };

    const handleEdit = (client: ClientData, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setFormData(client);
        setSelectedClient(client);
        setView('form');
    };

    const handleSave = () => {
        if (!formData.firstname && !formData.name) {
            toast.error('Le prénom ou nom est requis');
            return;
        }

        const fullname = formData.name || `${formData.firstname || ''} ${formData.lastname || ''}`.trim();

        if (selectedClient) {
            updateClient(selectedClient.id, { ...formData, name: fullname });
        } else {
            const newId = uuidv4();
            const newClient: ClientData = {
                ...formData,
                id: newId,
                name: fullname,
                firstname: formData.firstname || '',
                lastname: formData.lastname || '',
                createdAt: new Date().toISOString(),
                needsSync: true
            } as ClientData;

            addClient(newClient);
            addOfflineTask({
                id: uuidv4(),
                type: 'CREATE_CONTACT',
                payload: newClient,
                createdAt: new Date().toISOString()
            });
            processOfflineTasks();
        }
        setView('list');
    };

    const handleDelete = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (window.confirm('Voulez-vous vraiment supprimer ce client ?')) {
            deleteClient(id);
            if (selectedClient?.id === id) setView('list');
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSync = async () => {
        if (!config.hubspot.token) {
            toast.error('Veuillez configurer votre token HubSpot dans les paramètres.');
            return;
        }
        setIsSyncing(true);
        await processOfflineTasks(); // Try to upload offline stuff first
        const success = await syncHubspotContacts();
        setIsSyncing(false);
        if (success) {
            toast.success('Synchronisation réussie !');
        } else {
            toast.error('Erreur lors de la synchronisation.');
        }
    };

    const filteredClients = clients.filter(c => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (c.firstname?.toLowerCase().includes(q) ||
            c.lastname?.toLowerCase().includes(q) ||
            c.name?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q));
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const renderClientList = () => (
        <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex gap-2">
                <input
                    type="text"
                    placeholder="Rechercher (nom, email, tél...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-slate-50 border-none outline-none px-3 py-2 text-sm rounded-lg"
                />
                <Button variant="secondary" size="sm" onClick={handleSync} disabled={isSyncing} className="whitespace-nowrap">
                    {isSyncing ? 'Sync...' : '🔄 Sync HubSpot'}
                </Button>
            </div>

            {filteredClients.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500">
                    Aucun client trouvé.
                </div>
            ) : (
                filteredClients.map(client => (
                    <div
                        key={client.id}
                        onClick={() => { setSelectedClient(client); setView('detail'); }}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 active:scale-[0.98] transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{client.name}</h3>
                                <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
                                    <Phone className="h-3 w-3" /> {client.phone || 'Non renseigné'}
                                </p>
                                <p className="text-slate-500 text-sm flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> <span className="truncate max-w-[200px]">{client.address || 'Non renseignée'}</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => handleEdit(client, e)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                                    <Edit2 className="h-4 w-4 text-blue-600" />
                                </button>
                                <button onClick={(e) => handleDelete(client.id, e)} className="p-2 text-slate-400 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                            </div>
                        </div>
                        {(client.lastDevisTotal || client.lastVisitDate) && (
                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                                {client.lastVisitDate && <span>📅 Visite: {format(new Date(client.lastVisitDate), 'dd/MM/yyyy')}</span>}
                                {client.lastDevisTotal !== undefined && <span>💰 Dernier: {client.lastDevisTotal.toFixed(2)}€</span>}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );

    const [showModal, setShowModal] = useState<DevisData | null>(null);
    const [showEmailModal, setShowEmailModal] = useState<{ devis: DevisData, base64: string } | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
    const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

    useEffect(() => {
        let active = true;
        let objectUrl = '';
        if (showModal && selectedClient) {
            generateDevisPDF(showModal, selectedClient, config).then(b64 => {
                if (!active) return;
                fetch(b64).then(res => res.blob()).then(blob => {
                    if (!active) return;
                    objectUrl = URL.createObjectURL(blob);
                    setPdfPreviewUrl(objectUrl);
                });
            });
        }
        return () => {
            active = false;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            setPdfPreviewUrl('');
        };
    }, [showModal, selectedClient, config]);

    const renderClientDetail = () => {
        if (!selectedClient) return null;
        const clientDevis = devisHistory.filter(d => d.clientId === selectedClient.id);

        return (
            <div className="space-y-4">
                <button onClick={() => setView('list')} className="flex items-center text-blue-600 text-sm font-medium mb-2">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Retour aux clients
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {selectedClient.photo ? (
                        <div className="h-48 w-full bg-slate-200 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={selectedClient.photo} alt="Maison" className="object-cover w-full h-full" />
                        </div>
                    ) : (
                        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-800" />
                    )}

                    <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                            <h2 className="text-2xl font-black text-slate-800">{selectedClient.name}</h2>
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => router.push(`/devis?client=${selectedClient.id}`)}><FileText className="h-4 w-4 mr-1" /> Devis</Button>
                                <Button size="sm" variant="outline" onClick={() => handleEdit(selectedClient)}><Edit2 className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-3 text-slate-600">
                                <Phone className="h-5 w-5 text-blue-500" /> <a href={`tel:${selectedClient.phone}`}>{selectedClient.phone || 'N/A'}</a>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <Mail className="h-5 w-5 text-blue-500" /> <a href={`mailto:${selectedClient.email}`}>{selectedClient.email || 'N/A'}</a>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600">
                                <MapPin className="h-5 w-5 text-blue-500" />
                                <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedClient.address)}`} target="_blank" rel="noopener noreferrer">
                                    {selectedClient.address || 'N/A'}
                                </a>
                            </div>
                        </div>

                        {selectedClient.notes && (
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-6">
                                <h4 className="font-bold text-amber-800 flex items-center text-sm mb-1"><FileText className="h-4 w-4 mr-1" /> Notes d'intervention</h4>
                                <p className="text-sm text-amber-900 whitespace-pre-wrap">{selectedClient.notes}</p>
                            </div>
                        )}

                        <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Historique des devis</h3>
                        <div className="space-y-2">
                            {clientDevis.length === 0 ? (
                                <p className="text-sm text-slate-500">Aucun devis pour ce client</p>
                            ) : (
                                clientDevis.map(devis => (
                                    <div key={devis.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div>
                                            <span className="font-medium text-slate-700 block text-sm">{format(new Date(devis.date), 'dd/MM/yyyy')}</span>
                                            <span className="text-xs text-slate-500">{devis.items.reduce((acc, i) => acc + i.quantity, 0)} fenêtres</span>
                                        </div>
                                        <div className="flex gap-4 items-center">
                                            <div className="text-right">
                                                <span className="font-bold text-blue-700 block">{devis.totalHT.toFixed(2)}€</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${devis.statut === 'accepte' ? 'bg-green-100 text-green-700' :
                                                    devis.statut === 'refuse' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    {devis.statut === 'accepte' ? 'Accepté' : devis.statut === 'refuse' ? 'Refusé' : 'En attente'}
                                                </span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <button
                                                    onClick={() => setShowModal(devis)}
                                                    className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-sm justify-center w-full"
                                                >
                                                    👁️ Résumé
                                                </button>
                                                <button
                                                    onClick={() => router.push(`/devis?edit=${devis.id}`)}
                                                    className="bg-slate-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center shadow-sm hover:bg-slate-200 w-full"
                                                >
                                                    <PenTool className="h-3 w-3 mr-1" /> Modifier
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL RÉSUMÉ / PDF PREVIEW */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex flex-col p-4 bg-black/80 backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-4 text-white">
                            <h3 className="font-bold text-lg">Aperçu du Devis</h3>
                            <button onClick={() => setShowModal(null)} className="p-2 hover:bg-white/10 rounded-full"><X className="h-6 w-6" /></button>
                        </div>

                        <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-2xl mb-4 relative">
                            {/* iFrame for PDF Preview */}
                            {pdfPreviewUrl ? (
                                <iframe
                                    src={pdfPreviewUrl}
                                    className="w-full h-full border-none"
                                    title="Aperçu PDF"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                    Chargement de l'aperçu...
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setShowModal(null)} className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20 h-14">
                                Fermer
                            </Button>
                            <Button onClick={async () => {
                                setIsGeneratingEmail(true);
                                try {
                                    const b64 = await generateDevisPDF(showModal, selectedClient, config);
                                    setShowEmailModal({ devis: showModal, base64: b64 });
                                } finally {
                                    setIsGeneratingEmail(false);
                                }
                            }} disabled={isGeneratingEmail} className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold h-14 shadow-lg">
                                {isGeneratingEmail ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <MailCheck className="h-5 w-5 mr-2" />} Envoyer par email
                            </Button>
                        </div>
                    </div>
                )}

                {showEmailModal && selectedClient && (
                    <EmailModal
                        recipientEmail={selectedClient.email || ''}
                        clientName={selectedClient.name}
                        clientId={selectedClient.id!}
                        devisDate={format(new Date(showEmailModal.devis.date), 'dd/MM/yyyy')}
                        totalAmount={showEmailModal.devis.totalHT.toFixed(2)}
                        pdfBase64={showEmailModal.base64}
                        onClose={() => setShowEmailModal(null)}
                    />
                )}
            </div>
        );
    };

    const renderForm = () => (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setView('list')} className="flex items-center text-slate-500 text-sm font-medium">
                    <ChevronLeft className="h-4 w-4 mr-1" /> Annuler
                </button>
                <h2 className="font-bold text-slate-800">{selectedClient ? 'Modifier client' : 'Nouveau client'}</h2>
                <div className="w-16" /> {/* Spacer for centering */}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Prénom</label>
                        <input
                            type="text"
                            value={formData.firstname || ''}
                            onChange={(e) => setFormData(p => ({ ...p, firstname: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Jean"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Nom</label>
                        <input
                            type="text"
                            value={formData.lastname || ''}
                            onChange={(e) => setFormData(p => ({ ...p, lastname: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Dupont"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Téléphone</label>
                        <input
                            type="tel"
                            value={formData.phone || ''}
                            onChange={(e) => setFormData(p => ({ ...p, phone: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={formData.email || ''}
                            onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Adresse complète</label>
                    <textarea
                        rows={2}
                        value={formData.address || ''}
                        onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
                        className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Notes importantes (chiens, accès...)</label>
                    <textarea
                        rows={3}
                        value={formData.notes || ''}
                        onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                        className="w-full bg-amber-50 rounded-lg border-amber-200 border p-2.5 focus:ring-2 focus:ring-amber-500 outline-none resize-none placeholder:text-amber-300/50"
                        placeholder="Attention gros chien dans le jardin, portail rouge..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Photo de la maison</label>
                    <div className="flex gap-4 items-center">
                        {formData.photo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={formData.photo} alt="Aperçu" className="h-16 w-16 object-cover rounded-lg border border-slate-200" />
                        )}
                        <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
                            <Camera className="h-4 w-4" /> Ajouter une photo
                        </Button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handlePhotoUpload}
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg">
                        Enregistrer le client
                    </Button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-6 w-6" />
                        <h1 className="text-xl font-bold">Base Clients</h1>
                    </div>
                    {view === 'list' && (
                        <Button size="sm" onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-500 border-none">
                            <Plus className="h-4 w-4 mr-1" /> Ajouter
                        </Button>
                    )}
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 pb-20">
                {view === 'list' && renderClientList()}
                {view === 'detail' && renderClientDetail()}
                {view === 'form' && renderForm()}
            </main>
        </div>
    );
}
