import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/lib/store';

interface ClientSelectorProps {
    selectedClientId: string;
    setSelectedClientId: (id: string) => void;
}

export function ClientSelector({ selectedClientId, setSelectedClientId }: ClientSelectorProps) {
    const router = useRouter();
    const { clients } = useAppStore();
    const [clientSearchQuery, setClientSearchQuery] = useState('');

    const handleSelect = (id: string) => {
        setSelectedClientId(id);
        setClientSearchQuery('');
    };

    const filteredClients = clientSearchQuery
        ? clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || (c.phone && c.phone.includes(clientSearchQuery)))
        : clients.slice(0, 5);

    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <User className="h-5 w-5 text-blue-600" />
                    Client
                </h2>
                <Button variant="outline" size="sm" onClick={() => router.push('/clients?new=true')}>
                    + Nouveau client
                </Button>
            </div>

            {selectedClientId ? (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="font-bold text-blue-900">{selectedClientId === 'passage' ? "Client de passage" : clients.find(c => c.id === selectedClientId)?.name}</p>
                        <p className="text-xs text-blue-700">{clients.find(c => c.id === selectedClientId)?.phone || ''}</p>
                    </div>
                    <button onClick={() => setSelectedClientId('')} className="text-blue-500 hover:text-blue-700 text-sm font-bold">Changer</button>
                </div>
            ) : (
                <div className="space-y-2 relative">
                    <div className="relative">
                        <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un client (nom, email...)"
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            className="w-full rounded-lg border-slate-300 border p-3 pl-10 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                        />
                    </div>
                    <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-sm mt-2">
                        {filteredClients.map(c => (
                            <div key={c.id} onClick={() => handleSelect(c.id)} className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                                <p className="font-bold text-slate-800">{c.name}</p>
                                <p className="text-xs text-slate-500">{c.phone}</p>
                            </div>
                        ))}
                        <div onClick={() => handleSelect('passage')} className="p-3 bg-slate-50 text-slate-600 cursor-pointer font-medium hover:bg-slate-100 text-center text-sm border-t border-slate-200">
                            Continuer sans client (Client de passage)
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
