'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { LABELS, WindowType, Size, Height, Dirtiness } from '@/lib/types';
import { Settings, Save, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function ParamsPage() {
    const { config, updateConfig } = useAppStore();
    const [localConfig, setLocalConfig] = useState(config);
    const [saved, setSaved] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setLocalConfig(config);
        setMounted(true);
    }, [config]);

    if (!mounted) return null;

    const handleSave = () => {
        updateConfig(localConfig);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handlePriceChange = (type: WindowType, value: number) => {
        setLocalConfig(prev => ({
            ...prev,
            prices: { ...prev.prices, [type]: value }
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
        <div className="min-h-screen bg-slate-50">
            <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    <h1 className="text-xl font-bold">Paramètres</h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-6">

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

                {/* PRIX DE BASE */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Prix de base (€)</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {(Object.keys(LABELS.types) as WindowType[]).map(type => (
                            <div key={type}>
                                <label className="block text-xs font-medium text-slate-600 mb-1">{LABELS.types[type]}</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    value={localConfig.prices[type]}
                                    onChange={(e) => handlePriceChange(type, parseFloat(e.target.value) || 0)}
                                    className="w-full rounded-lg border-slate-300 border p-2 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* MULTIPLICATEURS */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-6">
                    <h2 className="text-lg font-bold text-slate-800">Multiplicateurs</h2>

                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Taille</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(LABELS.sizes) as Size[]).map(size => (
                                <div key={size} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 flex-1">{LABELS.sizes[size]}</span>
                                    <input type="number" step="0.1" value={localConfig.multipliers.size[size]} onChange={(e) => handleMultChange('size', size, parseFloat(e.target.value) || 0)} className="w-16 rounded border-slate-300 border p-1 text-xs text-center outline-none" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Hauteur</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(LABELS.heights) as Height[]).map(height => (
                                <div key={height} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 flex-1">{LABELS.heights[height]}</span>
                                    <input type="number" step="0.1" value={localConfig.multipliers.height[height]} onChange={(e) => handleMultChange('height', height, parseFloat(e.target.value) || 0)} className="w-16 rounded border-slate-300 border p-1 text-xs text-center outline-none" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-700 mb-2 border-b pb-1">Salissure</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(LABELS.dirtiness) as Dirtiness[]).map(dirt => (
                                <div key={dirt} className="flex items-center gap-2">
                                    <span className="text-xs text-slate-600 flex-1">{LABELS.dirtiness[dirt]}</span>
                                    <input type="number" step="0.1" value={localConfig.multipliers.dirtiness[dirt]} onChange={(e) => handleMultChange('dirtiness', dirt, parseFloat(e.target.value) || 0)} className="w-16 rounded border-slate-300 border p-1 text-xs text-center outline-none" />
                                </div>
                            ))}
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

                {/* SAVE BUTTON */}
                <div className="pb-8 pt-2">
                    <Button
                        onClick={handleSave}
                        className="w-full h-14 text-lg bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg transition-all"
                    >
                        {saved ? <CheckCircle2 className="mr-2" /> : <Save className="mr-2" />}
                        {saved ? 'Enregistré !' : 'Enregistrer les paramètres'}
                    </Button>
                </div>

            </main>
        </div>
    );
}
