'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { LABELS, WindowType, Size, Height, Dirtiness } from '@/lib/types';
import { Settings, Save, Building2, FileText, CheckCircle2, Cloud, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ParamsPage() {
    const { config, updateConfig } = useAppStore();
    const [localConfig, setLocalConfig] = useState(config);
    const [saved, setSaved] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'prestations' | 'pdf' | 'integrations'>('general');
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    useEffect(() => {
        setLocalConfig(config);
        setIsClient(true); // Indicate that the component has mounted on the client side
    }, [config]);

    if (!isClient) return <div className="p-8 text-center text-slate-500">Chargement...</div>;

    const handleSave = () => {
        updateConfig(localConfig);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleResetApp = () => {
        if (window.confirm("Êtes-vous sûr de vouloir tout réinitialiser ? Toutes les données (devis, clients, paramètres) seront perdues.")) {
            localStorage.clear(); // Clear all local storage
            window.location.href = '/'; // Reload the app
        }
    };

    const handleAddWindowType = () => {
        setLocalConfig(prev => ({
            ...prev,
            windowTypes: [...(prev.windowTypes || []), { id: `type-${Date.now()}`, name: 'Nouvelle prestation', price: 0 }]
        }));
    };

    const handleUpdateWindowType = (id: string, key: 'name' | 'price', value: string | number) => {
        setLocalConfig(prev => ({
            ...prev,
            windowTypes: prev.windowTypes?.map(w => w.id === id ? { ...w, [key]: value } : w) || []
        }));
    };

    const handleRemoveWindowType = (id: string) => {
        setLocalConfig(prev => ({
            ...prev,
            windowTypes: prev.windowTypes?.filter(w => w.id !== id) || []
        }));
    };

    const handleAddGlobalDesignation = () => {
        setLocalConfig(prev => ({
            ...prev,
            globalDesignations: [...(prev.globalDesignations || []), { id: `gd-${Date.now()}`, label: 'Nouveau choix' }]
        }));
    };

    const handleUpdateGlobalDesignation = (id: string, label: string) => {
        setLocalConfig(prev => ({
            ...prev,
            globalDesignations: prev.globalDesignations?.map(g => g.id === id ? { ...g, label } : g) || []
        }));
    };

    const handleRemoveGlobalDesignation = (id: string) => {
        setLocalConfig(prev => ({
            ...prev,
            globalDesignations: prev.globalDesignations?.filter(g => g.id !== id) || []
        }));
    };

    const handleMultChange = (category: 'size' | 'height' | 'dirtiness', key: string, value: number) => {
        setLocalConfig(prev => ({
            ...prev,
            multipliers: {
                ...prev.multipliers,
                [category]: { ...prev.multipliers[category], [key]: value }
            }
        }));
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10 pb-[2px]">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        <h1 className="text-xl font-bold tracking-tight">Paramètres</h1>
                    </div>
                </div>

                {/* TABS FILTRAGE */}
                <div className="bg-blue-900 px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'general' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Général
                    </button>
                    <button
                        onClick={() => setActiveTab('prestations')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'prestations' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Prestations & Prix
                    </button>
                    <button
                        onClick={() => setActiveTab('pdf')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'pdf' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Devis PDF
                    </button>
                    <button
                        onClick={() => setActiveTab('integrations')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'integrations' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Intégrations
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-6 flex-1 w-full pb-24">

                {activeTab === 'general' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* ENTREPRISE */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Building2 className="h-5 w-5 text-blue-600" />
                                Entreprise
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Nom de l'entreprise</label>
                                    <input
                                        type="text"
                                        value={localConfig.enterprise.nom}
                                        onChange={(e) => setLocalConfig(prev => ({ ...prev, enterprise: { ...prev.enterprise, nom: e.target.value } }))}
                                        className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-2">Logo Entreprise</label>
                                    <div className="flex items-center gap-4">
                                        {localConfig.enterprise.logo && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={localConfig.enterprise.logo} alt="Logo preview" className="h-16 w-16 object-contain bg-slate-50 border border-slate-200 rounded p-1" />
                                        )}
                                        <label className="cursor-pointer flex items-center justify-center bg-white border border-slate-300 px-4 py-2 rounded-lg text-slate-700 font-medium shadow-sm hover:bg-slate-50 transition-colors">
                                            <span className="text-sm">Parcourir ou Prendre photo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setLocalConfig(prev => ({
                                                                ...prev,
                                                                enterprise: { ...prev.enterprise, logo: reader.result as string }
                                                            }));
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        {localConfig.enterprise.logo && (
                                            <button
                                                onClick={() => setLocalConfig(prev => ({ ...prev, enterprise: { ...prev.enterprise, logo: '' } }))}
                                                className="text-xs text-red-500 hover:text-red-700 font-medium"
                                            >
                                                Effacer
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'integrations' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* HUBSPOT */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Cloud className="h-5 w-5 text-orange-500" />
                                Intégration HubSpot
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-slate-600 bg-orange-50 p-3 rounded-lg border border-orange-100 mb-4">
                                        Pour des raisons de <strong>sécurité</strong>, le jeton (token) HubSpot n'est plus stocké dans le navigateur. Vous devez configurer la variable d'environnement <code className="bg-white px-1 py-0.5 rounded border border-orange-200 text-xs">HUBSPOT_TOKEN</code> côté serveur (ex: sur Vercel).
                                    </p>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.hubspot?.token === 'env_configured'}
                                            onChange={(e) => setLocalConfig(prev => ({
                                                ...prev,
                                                hubspot: { ...prev.hubspot, token: e.target.checked ? 'env_configured' : '' }
                                            }))}
                                            className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Activer l'interface HubSpot.</span>
                                    </label>
                                    <p className="text-xs text-slate-500 mt-2 ml-8">
                                        Cochez cette case une fois que vous avez configuré la variable d'environnement pour activer les boutons de synchronisation.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* EMAIL */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Mail className="h-5 w-5 text-indigo-500" />
                                Envoi d'Emails (Gmail Pro)
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Mon adresse Email (Expéditeur)</label>
                                    <input
                                        type="email"
                                        value={localConfig.email?.address || ''}
                                        onChange={(e) => setLocalConfig(prev => ({
                                            ...prev,
                                            email: { ...prev.email, address: e.target.value }
                                        }))}
                                        className="w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                                        placeholder="contact@washupcorp.com"
                                    />
                                </div>

                                <div>
                                    <p className="text-sm text-slate-600 bg-indigo-50 p-3 rounded-lg border border-indigo-100 mb-4">
                                        Pour des raisons de <strong>sécurité</strong>, le mot de passe d'application Gmail n'est plus stocké dans le navigateur. Configurez les variables <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 text-xs">SMTP_EMAIL</code> et <code className="bg-white px-1 py-0.5 rounded border border-indigo-200 text-xs">SMTP_PASSWORD</code> côté serveur.
                                    </p>
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={localConfig.email?.password === 'env_configured'}
                                            onChange={(e) => setLocalConfig(prev => ({
                                                ...prev,
                                                email: { ...prev.email, password: e.target.checked ? 'env_configured' : '' }
                                            }))}
                                            className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm font-bold text-slate-700">Activer le bouton "Envoyer par email"</span>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'prestations' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* PRESTATIONS (CARTES) */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Prestations (Cartes)</h2>
                            <div className="space-y-3">
                                {localConfig.windowTypes?.map(wt => (
                                    <div key={wt.id} className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={wt.name}
                                            onChange={(e) => handleUpdateWindowType(wt.id, 'name', e.target.value)}
                                            className="flex-1 rounded border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <input
                                            type="number"
                                            step="0.5"
                                            value={wt.price}
                                            onChange={(e) => handleUpdateWindowType(wt.id, 'price', parseFloat(e.target.value) || 0)}
                                            className="w-24 rounded border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <span className="text-slate-500">€</span>
                                        <button
                                            onClick={() => handleRemoveWindowType(wt.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={handleAddWindowType} className="mt-2 w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                                    + Ajouter une prestation
                                </Button>
                                {(!localConfig.windowTypes || localConfig.windowTypes.length === 0) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            import('@/lib/store').then(m => {
                                                setLocalConfig(prev => ({
                                                    ...prev,
                                                    windowTypes: m.DEFAULT_CONFIG.windowTypes
                                                }));
                                            });
                                        }}
                                        className="mt-2 w-full text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                        Restaurer les cartes par défaut
                                    </Button>
                                )}
                            </div>
                        </section>
                    </div>
                )}

                {activeTab === 'pdf' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {/* PRÉFÉRENCES DESIGNATIONS GLOBALES */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Désignations Globales (PDF)</h2>
                            <p className="text-xs text-slate-500 mb-4">Gérez la liste des textes de remplacement rapides pour le devis PDF.</p>
                            <div className="space-y-3">
                                {localConfig.globalDesignations?.map(gd => (
                                    <div key={gd.id} className="flex items-center gap-3">
                                        <input
                                            type="text"
                                            value={gd.label}
                                            onChange={(e) => handleUpdateGlobalDesignation(gd.id, e.target.value)}
                                            className="flex-1 rounded border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                        <button
                                            onClick={() => handleRemoveGlobalDesignation(gd.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={handleAddGlobalDesignation} className="mt-2 w-full text-blue-600 border-blue-200 hover:bg-blue-50">
                                    + Ajouter un choix
                                </Button>
                                {(!localConfig.globalDesignations || localConfig.globalDesignations.length === 0) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            import('@/lib/store').then(m => {
                                                setLocalConfig(prev => ({
                                                    ...prev,
                                                    globalDesignations: m.DEFAULT_CONFIG.globalDesignations
                                                }));
                                            });
                                        }}
                                        className="mt-2 w-full text-green-600 border-green-200 hover:bg-green-50"
                                    >
                                        Restaurer les choix par défaut
                                    </Button>
                                )}
                            </div>
                        </section>

                        {/* TRAJET */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 mb-4">Frais de déplacement</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Adresse de départ par défaut</label>
                                    <input
                                        type="text"
                                        value={localConfig.travel?.startAddress || ''}
                                        onChange={(e) => setLocalConfig({ ...localConfig, travel: { ...localConfig.travel, startAddress: e.target.value } })}
                                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-1">Prix par km (€)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={localConfig.travel?.pricePerKm || 0}
                                        onChange={(e) => setLocalConfig({ ...localConfig, travel: { ...localConfig.travel, pricePerKm: parseFloat(e.target.value) || 0 } })}
                                        className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* CGV */}
                        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <FileText className="h-5 w-5 text-blue-600" />
                                CGV & Mentions en bas de devis
                            </h2>
                            <textarea
                                rows={5}
                                value={localConfig.cgv}
                                onChange={(e) => setLocalConfig(prev => ({ ...prev, cgv: e.target.value }))}
                                className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                            />
                        </section>
                    </div>
                )}

                {/* FIXED BOTOM ACTIONS */}
                <div className="fixed bottom-16 left-0 right-0 p-4 pb-6 bg-white border-t border-slate-200 z-40">
                    <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Button
                            onClick={handleSave}
                            className="w-full h-12 text-base bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg transition-all"
                        >
                            {saved ? <CheckCircle2 className="mr-2" /> : <Save className="mr-2" />}
                            {saved ? 'Enregistré !' : 'Enregistrer'}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleResetApp}
                            className="hidden md:flex w-full text-red-600 border-red-200 hover:bg-red-50 h-12 font-bold"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Réinitialiser
                        </Button>
                    </div>
                </div>
            </main>
        </div>
    );
}
