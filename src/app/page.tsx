'use client';

import { useState, useMemo } from 'react';
import { useAppStore, DevisData } from '@/lib/store';
import { Home, TrendingUp, CheckCircle2, Calculator, FileText, User } from 'lucide-react';
import { format, isThisMonth, isThisWeek, subDays } from 'date-fns';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

type FilterType = 'all' | 'month' | 'week';

export default function DashboardPage() {
    const { devisHistory, clients } = useAppStore();
    const [filter, setFilter] = useState<FilterType>('month');

    const filteredDevis = useMemo(() => {
        return devisHistory.filter(devis => {
            const date = new Date(devis.date);
            if (filter === 'month') return isThisMonth(date);
            if (filter === 'week') return isThisWeek(date);
            return true;
        });
    }, [devisHistory, filter]);

    const stats = useMemo(() => {
        const totalCount = filteredDevis.length;
        const totalAmount = filteredDevis.reduce((acc, d) => acc + d.totalHT, 0);
        const acceptedDevis = filteredDevis.filter(d => d.statut === 'accepte');
        const acceptedCount = acceptedDevis.length;
        const acceptedAmount = acceptedDevis.reduce((acc, d) => acc + d.totalHT, 0);
        const acceptRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;
        const averageDevis = totalCount > 0 ? (totalAmount / totalCount) : 0;

        return { totalCount, totalAmount, acceptedCount, acceptedAmount, acceptRate, averageDevis };
    }, [filteredDevis]);

    const recentDevis = [...devisHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10 pb-[2px]">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Home className="h-6 w-6" />
                        <h1 className="text-xl font-bold tracking-tight">Tableau de bord</h1>
                    </div>
                </div>

                {/* TABS FILTRAGE */}
                <div className="bg-blue-900 px-4 py-2 flex gap-2 overflow-x-auto hide-scrollbar">
                    <button
                        onClick={() => setFilter('week')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'week' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Cette semaine
                    </button>
                    <button
                        onClick={() => setFilter('month')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'month' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Ce mois
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-white text-blue-900' : 'text-blue-200 hover:bg-blue-800'}`}
                    >
                        Tous
                    </button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-6 pb-20">

                {/* STATS HERO */}
                <section className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-5 text-white shadow-lg shadow-blue-200">
                        <p className="text-blue-100 text-sm font-medium mb-1">Chiffre d'affaires potentiel</p>
                        <h2 className="text-4xl font-black mb-4">{stats.totalAmount.toFixed(0)} €</h2>
                        <div className="flex justify-between items-center text-sm border-t border-blue-500/50 pt-3">
                            <span>{stats.totalCount} devis</span>
                            <span className="font-bold text-green-300">
                                Acceptés : {stats.acceptedAmount.toFixed(0)} €
                            </span>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Taux conversion</p>
                        <p className="text-2xl font-black text-slate-800">{stats.acceptRate}%</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <p className="text-slate-500 text-xs font-medium mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Moyen / Devis</p>
                        <p className="text-2xl font-black text-slate-800">{stats.averageDevis.toFixed(0)} €</p>
                    </div>
                </section>

                {/* RECENT DEVIS */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-2">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            5 Derniers Devis
                        </h2>
                        <Link href="/historique" className="text-sm font-medium text-blue-600">Tout voir</Link>
                    </div>

                    <div className="space-y-3">
                        {recentDevis.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Aucun devis récent.</p>
                        ) : (
                            recentDevis.map(devis => {
                                const client = clients.find(c => c.id === devis.clientId);
                                return (
                                    <Link key={devis.id} href="/historique" className="block relative">
                                        <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800 flex items-center gap-1">
                                                    {client ? <><User className="h-3 w-3 text-slate-400" /> {client.name}</> : 'Client de passage'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {format(new Date(devis.date), 'dd/MM')} • {devis.items.reduce((acc, i) => acc + i.quantity, 0)} fen.
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-blue-700">{devis.totalHT.toFixed(2)}€</p>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${devis.statut === 'accepte' ? 'bg-green-100 text-green-700' :
                                                    devis.statut === 'refuse' ? 'bg-red-100 text-red-700' :
                                                        'bg-slate-200 text-slate-600'
                                                    }`}>
                                                    {devis.statut === 'accepte' ? 'Accepté' : devis.statut === 'refuse' ? 'Refusé' : 'En attente'}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        )}
                    </div>
                </section>

                {/* QUICK ACTIONS */}
                <section className="grid grid-cols-2 gap-3 pb-8">
                    <Link href="/devis" className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-800 rounded-xl font-bold shadow-sm hover:bg-blue-100 transition-colors gap-2">
                        <Calculator className="h-6 w-6" />
                        Nouveau Devis
                    </Link>
                    <Link href="/clients" className="flex flex-col items-center justify-center p-4 bg-indigo-50 text-indigo-800 rounded-xl font-bold shadow-sm hover:bg-indigo-100 transition-colors gap-2">
                        <User className="h-6 w-6" />
                        Nouveau Client
                    </Link>
                </section>

            </main>
        </div>
    );
}
