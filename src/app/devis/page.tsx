'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { generateDevisPDF, downloadDevisPDF } from '@/lib/pdf';
import { EmailModal } from '@/components/EmailModal';
import {
  Plus,
  Trash2,
  Download,
  Settings2,
  Calculator,
  User,
  PenTool,
  Search,
  X,
  MapPin,
  Loader2,
  Navigation,
  Copy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import SignaturePad, { SignaturePadRef } from '@/components/SignaturePad';
import { processOfflineTasks } from '@/lib/hubspot';
import { toast } from 'react-hot-toast';

import { ClientSelector } from '@/components/devis/ClientSelector';
import { TravelCalculatorModal } from '@/components/devis/TravelCalculatorModal'; import {
  WindowItem,
  WindowType,
  Size,
  Height,
  Dirtiness,
  LABELS,
  calculateWindowPrice
} from '@/lib/types';
import { useAppStore, DevisData } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { v4 as uuidv4 } from 'uuid';

export default function NouveauDevisPage() {
  const router = useRouter();
  const { config, clients, addDevis, devisHistory, updateDevis } = useAppStore();
  const [existingDevisId, setExistingDevisId] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [globalDesignation, setGlobalDesignation] = useState<string>('');
  const [isCustomDesignation, setIsCustomDesignation] = useState<boolean>(false);
  const [extraTaskDescription, setExtraTaskDescription] = useState<string>('');
  const [extraTaskPrice, setExtraTaskPrice] = useState<string>('');

  const [showEmailModal, setShowEmailModal] = useState<{ devis: DevisData, base64: string } | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const u = new URLSearchParams(window.location.search);
      const cId = u.get('client');
      if (cId) setSelectedClientId(cId);

      const editId = u.get('edit');
      if (editId) {
        setExistingDevisId(editId);
        const devisToEdit = useAppStore.getState().devisHistory.find(d => d.id === editId);
        if (devisToEdit) {
          if (devisToEdit.clientId) setSelectedClientId(devisToEdit.clientId);
          setWindows(devisToEdit.items || []);
          setDiscount(devisToEdit.discount || 0);
          setNotes(devisToEdit.notes || '');
          const existingGlobal = devisToEdit.globalDesignation || '';
          setGlobalDesignation(existingGlobal);
          setExtraTaskDescription(devisToEdit.extraTaskDescription || '');
          setExtraTaskPrice(devisToEdit.extraTaskPrice ? devisToEdit.extraTaskPrice.toString() : '');

          if (existingGlobal) {
            const { config: currentConfig } = useAppStore.getState();
            const isMatch = currentConfig.globalDesignations?.some(gd => gd.label === existingGlobal);
            if (!isMatch) setIsCustomDesignation(true);
          }
        }
      }
    }
  }, []);

  const [showAddMenu, setShowAddMenu] = useState(false);

  const addCard = (typeId: string) => {
    setWindows([...windows, {
      id: uuidv4(),
      type: typeId,
      size: 'moyenne',
      height: 'homme',
      dirtiness: 'legere', // We map 'legere' to "Légèrement sale" in labels
      quantity: 1
    }]);
    setShowAddMenu(false);
  };

  const duplicateCard = (card: WindowItem) => {
    setWindows([...windows, { ...card, id: uuidv4() }]);
  };

  const updateCard = (id: string, updates: Partial<WindowItem>) => {
    setWindows(windows.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const removeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const [showTravelCalc, setShowTravelCalc] = useState(false);
  const selectedClientAddress = clients.find(c => c.id === selectedClientId)?.address || '';

  const addTravelToDevis = (km: number, pricePerKm: number) => {
    setWindows([...windows, {
      id: uuidv4(),
      type: 'autre',
      size: 'moyenne', height: 'homme', dirtiness: 'legere',
      quantity: Math.ceil(km * 2),
      description: `Déplacement`,
      prixManuel: pricePerKm,
      isFraisDeplacement: true
    }]);
    setShowTravelCalc(false);
  };

  const subTotal = useMemo(() => {
    const windowsTotal = windows.reduce((acc, current) => acc + calculateWindowPrice(current, config), 0);
    const extraPrice = parseFloat(extraTaskPrice) || 0;
    return windowsTotal + extraPrice;
  }, [windows, config, extraTaskPrice]);

  const discountAmount = useMemo(() => {
    return subTotal * (discount / 100);
  }, [subTotal, discount]);

  const totalHT = useMemo(() => {
    return subTotal - discountAmount;
  }, [subTotal, discountAmount]);

  const generateAndSaveDevis = async () => {
    if (windows.length === 0) {
      toast.error("Ajoutez d'abord des prestations au devis.");
      return;
    }

    setIsGenerating(true);
    try {
      const currentSignature = signaturePadRef.current?.getSignature() || null;

      const newDevis: DevisData = {
        id: existingDevisId || uuidv4(),
        clientId: selectedClientId || undefined,
        date: existingDevisId ? (useAppStore.getState().devisHistory.find(d => d.id === existingDevisId)?.date || new Date().toISOString()) : new Date().toISOString(),
        items: windows,
        subTotal,
        discount,
        totalHT,
        statut: 'brouillon',
        notes,
        signature: currentSignature || undefined,
        photos: [],
        needsSync: true,
        globalDesignation: globalDesignation.trim() || undefined,
        extraTaskDescription: extraTaskDescription.trim() || undefined,
        extraTaskPrice: parseFloat(extraTaskPrice) || undefined
      };

      if (existingDevisId) {
        updateDevis(existingDevisId, newDevis);
      } else {
        addDevis(newDevis);
      }

      const selectedClient = clients.find(c => c.id === selectedClientId);
      const pdfBase64 = await generateDevisPDF(newDevis, selectedClient, config);
      await downloadDevisPDF(newDevis, selectedClient, config);

      if (config.hubspot.token && selectedClientId) {
        useAppStore.getState().addOfflineTask({
          id: uuidv4(), type: 'UPLOAD_QUOTE', payload: { clientId: selectedClientId, date: newDevis.date, totalHT, pdfBase64 }, createdAt: new Date().toISOString()
        });
        processOfflineTasks();
      }

      if (selectedClientId && selectedClientId !== 'passage') {
        setShowEmailModal({ devis: newDevis, base64: pdfBase64 });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success(existingDevisId ? "Devis modifié avec succès!" : "Devis créé avec succès !");
      } else {
        toast.success(existingDevisId ? "Devis modifié avec succès!" : "Devis créé avec succès !");
        router.push('/historique');
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du devis PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            <h1 className="text-xl font-bold">{existingDevisId ? 'Modifier le devis' : 'Nouveau Devis'}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">

        {/* CLIENT SELECTION */}
        <ClientSelector selectedClientId={selectedClientId} setSelectedClientId={setSelectedClientId} />

        {/* CARDS SECTION */}
        <section className="space-y-4">
          {windows.map((w) => {
            const wt = config.windowTypes?.find(type => type.id === w.type);
            const title = w.type === 'autre' ? (w.description || 'Frais de déplacement') : (wt?.name || w.type);

            if (w.isFraisDeplacement) {
              return (
                <div key={w.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 relative">
                  <button onClick={() => removeWindow(w.id)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500"><Trash2 className="h-5 w-5" /></button>
                  <div className="pr-8">
                    <h3 className="font-bold text-lg text-slate-800 mb-2 whitespace-pre-wrap">{title}</h3>
                    <p className="font-black text-blue-700 text-xl">{calculateWindowPrice(w, config).toFixed(2)} €</p>
                  </div>
                </div>
              )
            }

            return (
              <div key={w.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 relative flex flex-col gap-4">

                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-slate-800">{title}</h3>
                  <div className="flex items-center gap-2">
                    <button onClick={() => duplicateCard(w)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 shadow-sm"><Copy className="h-5 w-5" /></button>
                    <button onClick={() => removeWindow(w.id)} className="p-1.5 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors border border-slate-200 shadow-sm"><Trash2 className="h-5 w-5" /></button>
                  </div>
                </div>

                {/* ROW 1: SIZE */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Taille</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(LABELS.sizes) as Size[]).map(s => (
                      <button
                        key={s}
                        onClick={() => updateCard(w.id, { size: s })}
                        className={`py-2 px-1 text-xs rounded-lg font-bold transition-all border shadow-sm flex items-center justify-center ${w.size === s ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <span className="truncate w-full text-center px-0.5">{LABELS.sizes[s]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ROW 2: HEIGHT */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Hauteur</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(LABELS.heights) as Height[]).map(h => (
                      <button
                        key={h}
                        onClick={() => updateCard(w.id, { height: h })}
                        className={`py-2 px-2 text-xs rounded-lg font-bold transition-all border shadow-sm flex items-center justify-center ${w.height === h ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <span className="truncate w-full text-center px-0.5">{LABELS.heights[h]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ROW 3: DIRTINESS */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Salissure</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(LABELS.dirtiness) as Dirtiness[]).filter(d => d !== 'propre').map(d => (
                      <button
                        key={d}
                        onClick={() => updateCard(w.id, { dirtiness: d })}
                        className={`py-2 px-2 text-xs rounded-lg font-bold transition-all border shadow-sm flex items-center justify-center ${w.dirtiness === d ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        <span className="truncate w-full text-center px-0.5">{LABELS.dirtiness[d]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 mt-2 border-t border-slate-100">
                  <div className="flex-1 space-y-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notes (Optionnel)</span>
                    <input
                      type="text"
                      value={w.note || ''}
                      onChange={(e) => updateCard(w.id, { note: e.target.value })}
                      placeholder="Ex: Difficile d'accès"
                      className="w-full text-sm p-2.5 rounded-lg border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    />
                  </div>

                  <div className="w-full sm:w-[130px] flex flex-col gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Quantité</span>
                    <div className="flex items-center justify-between border border-slate-300 rounded-lg overflow-hidden h-11 bg-white shadow-sm">
                      <button onClick={() => updateCard(w.id, { quantity: Math.max(0, w.quantity - 1) })} className="w-11 h-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xl border-r border-slate-200 flex justify-center items-center transition-colors">-</button>
                      <input
                        type="number"
                        min="0"
                        value={w.quantity}
                        onChange={(e) => updateCard(w.id, { quantity: parseInt(e.target.value) || 0 })}
                        className="w-10 text-center font-black text-slate-800 outline-none text-lg bg-transparent"
                      />
                      <button onClick={() => updateCard(w.id, { quantity: w.quantity + 1 })} className="w-11 h-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-black text-xl border-l border-slate-200 flex justify-center items-center transition-colors">+</button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-blue-50/50 p-3 rounded-lg border border-blue-100/50 mt-2">
                  <span className="text-sm font-bold text-blue-900">Sous-total :</span>
                  <span className="font-black text-blue-700 text-xl">{calculateWindowPrice(w, config).toFixed(2)} €</span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mt-4 border-t-4 border-t-blue-500">
          {showAddMenu ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600" /> Ajouter une prestation</h3>
                <button onClick={() => setShowAddMenu(false)} className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {(config.windowTypes || []).map(wt => (
                  <button key={wt.id} onClick={() => addCard(wt.id)} className="p-4 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl text-sm font-bold text-slate-700 hover:text-blue-700 text-center transition-all shadow-sm flex items-center justify-center">
                    <span className="truncate">{wt.name}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-100 pt-4">
                <Button variant="outline" onClick={() => { setShowTravelCalc(true); setShowAddMenu(false); }} className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 flex items-center justify-center gap-2 font-bold py-6 border-dashed">
                  <MapPin className="h-5 w-5" /> Ajouter des frais de déplacement
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={() => setShowAddMenu(true)} className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 font-bold py-6 border-dashed bg-white text-base">
                + Ajouter type de vitre
              </Button>
            </div>
          )}
        </section>

        {/* TRAVEL CALC MODAL */}
        <TravelCalculatorModal
          isOpen={showTravelCalc}
          onClose={() => setShowTravelCalc(false)}
          targetAddress={selectedClientAddress}
          onAddTravel={addTravelToDevis}
        />

        {/* TOTALS */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Settings2 className="h-5 w-5 text-blue-600" /> Personnalisation de l'affichage PDF
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600 block">Désignation globale pour toutes les vitres</label>
              <p className="text-xs text-slate-400 mb-2">Au lieu de détailler chaque encart, ce texte condensera l'ensemble de vos fenêtres en une seule ligne de facturation.</p>
              <select
                value={isCustomDesignation ? 'custom' : globalDesignation}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomDesignation(true);
                    setGlobalDesignation('');
                  } else {
                    setIsCustomDesignation(false);
                    setGlobalDesignation(val);
                  }
                }}
                className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-800 focus:ring-2 outline-none mb-2"
              >
                <option value="">-- Ne pas utiliser de désignation globale --</option>
                {config.globalDesignations?.map(gd => (
                  <option key={gd.id} value={gd.label}>{gd.label}</option>
                ))}
                <option value="custom">Autre (personnalisé)...</option>
              </select>

              {isCustomDesignation && (
                <input
                  type="text"
                  placeholder="Ex: Nettoyage complet de façade vitrée"
                  value={globalDesignation}
                  onChange={(e) => setGlobalDesignation(e.target.value)}
                  className="w-full rounded-lg border-blue-300 border p-2.5 text-slate-800 focus:ring-2 outline-none bg-blue-50"
                  autoFocus
                />
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-slate-600">Prestation Supplémentaire (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Nettoyage structure métallique"
                  value={extraTaskDescription}
                  onChange={(e) => setExtraTaskDescription(e.target.value)}
                  className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-800 focus:ring-2 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Prix unitaire (HTVA)</label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="0.00"
                    value={extraTaskPrice}
                    onChange={(e) => setExtraTaskPrice(e.target.value)}
                    className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-800 focus:ring-2 outline-none pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">€</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-600">Remise globale (%)</label>
                <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-800 focus:ring-2 outline-none" />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium text-slate-600">Notes & Précisions (Affiche dans PDF client)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm h-16 resize-none outline-none" />
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">Total (HTVA)</span>
              <span className="text-lg font-bold text-slate-700">{totalHT.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between items-center mt-1 pt-2 border-t border-blue-200/50">
              <span className="text-lg font-bold text-slate-800">MONTANT (TVAC)</span>
              <span className="text-3xl font-black text-blue-700">{(totalHT * 1.21).toFixed(2)} €</span>
            </div>
          </div>
        </section>

        {/* SIGNATURE SECTION */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <PenTool className="h-5 w-5 text-blue-600" /> Signature du client
          </h2>
          <SignaturePad ref={signaturePadRef} />
        </section>

        {/* ACTIONS */}
        <div className="pt-2 pb-8">
          <Button onClick={generateAndSaveDevis} disabled={isGenerating} className="w-full h-14 text-lg bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
            {existingDevisId ? 'Enregistrer et Générer' : 'Générer le Devis Client'}
          </Button>
        </div>

        {showEmailModal && selectedClientId && selectedClientId !== 'passage' && (
          <EmailModal
            recipientEmail={clients.find(c => c.id === selectedClientId)?.email || ''}
            clientName={clients.find(c => c.id === selectedClientId)?.name || ''}
            clientId={selectedClientId}
            devisDate={format(new Date(showEmailModal.devis.date), 'dd/MM/yyyy')}
            totalAmount={showEmailModal.devis.totalHT.toFixed(2)}
            pdfBase64={showEmailModal.base64}
            onClose={() => {
              setShowEmailModal(null);
              router.push('/historique');
            }}
          />
        )}
      </main>
    </div>
  );
}
