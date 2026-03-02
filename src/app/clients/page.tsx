'use client';

import { useState, useRef } from 'react';
import { useAppStore, ClientData, DevisData } from '@/lib/store';
import { Users, Plus, Edit2, Trash2, ChevronLeft, MapPin, Phone, Mail, FileText, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

type ViewMode = 'list' | 'detail' | 'form';

export default function ClientsPage() {
    const { clients, addClient, updateClient, deleteClient, devisHistory } = useAppStore();
    const [view, setView] = useState<ViewMode>('list');
    const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<ClientData>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreateNew = () => {
        setFormData({
            name: '', phone: '', email: '', address: '', notes: '', photo: ''
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
        if (!formData.name) return alert('Le nom est requis');

        if (selectedClient) {
            updateClient(selectedClient.id, formData);
        } else {
            const newClient: ClientData = {
                ...formData,
                id: uuidv4(),
                createdAt: new Date().toISOString(),
            } as ClientData;
            addClient(newClient);
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

    const renderClientList = () => (
        <div className="space-y-4">
            {clients.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl shadow-sm border border-slate-200 text-slate-500">
                    Aucun client trouvé. Cliquez sur Ajouter un client.
                </div>
            ) : (
                clients.map(client => (
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
                            <Button size="sm" variant="outline" onClick={() => handleEdit(selectedClient)}><Edit2 className="h-4 w-4 mr-2" /> Modifier</Button>
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
                                            <button
                                                onClick={() => setShowModal(devis)}
                                                className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center shadow-sm"
                                            >
                                                👁️ Résumé
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* MODAL RÉSUMÉ */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="bg-blue-800 text-white p-4 flex justify-between items-center">
                                <h3 className="font-bold">Devis du {format(new Date(showModal.date), 'dd/MM/yy')}</h3>
                                <button onClick={() => setShowModal(null)} className="text-blue-200 hover:text-white font-bold p-1">X</button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Client</p>
                                    <p className="font-bold text-slate-800">{selectedClient.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Total</p>
                                    <p className="text-2xl font-black text-blue-700">{showModal.totalHT.toFixed(2)} € <span className="text-sm font-medium text-slate-500">HTVA</span></p>
                                </div>
                                <div className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Détail {showModal.items.length} prestations</p>
                                    <ul className="space-y-1">
                                        {showModal.items.map((i: any) => (
                                            <li key={i.id} className="text-sm text-slate-700 flex justify-between">
                                                <span>✅ {i.quantity}x {i.type === 'autre' ? (i.description || 'Prestation') : i.type}</span>
                                                {i.note && <span className="text-xs text-amber-600 block pl-5 truncate bg-amber-50 px-1 rounded">({i.note})</span>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                {showModal.notes && (
                                    <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                                        <strong>Notes globales :</strong> {showModal.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
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
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Nom Complet *</label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                        className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Jean Dupont"
                    />
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
