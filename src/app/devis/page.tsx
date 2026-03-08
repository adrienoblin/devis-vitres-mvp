'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { buildDevisPDFDoc, generateDevisPDF } from '@/lib/pdf';
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


import {
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
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [globalDesignation, setGlobalDesignation] = useState<string>('');
  const [isCustomDesignation, setIsCustomDesignation] = useState<boolean>(false);
  const [extraTaskDescription, setExtraTaskDescription] = useState<string>('');
  const [extraTaskPrice, setExtraTaskPrice] = useState<string>('');

  const [showEmailModal, setShowEmailModal] = useState<DevisData | null>(null);
  const signaturePadRef = useRef<SignaturePadRef>(null);

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
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [travelPricePerKm, setTravelPricePerKm] = useState(0);
  const [travelCalculatedKm, setTravelCalculatedKm] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (config.travel) {
      setTravelStart(prev => prev || config.travel.startAddress);
      setTravelPricePerKm(prev => prev || config.travel.pricePerKm);
    }
  }, [config.travel]);

  useEffect(() => {
    if (selectedClientId && selectedClientId !== 'passage') {
      const c = clients.find(cl => cl.id === selectedClientId);
      if (c && c.address) setTravelEnd(c.address);
    }
  }, [selectedClientId, clients]);

  const handleLocateMe = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
        const data = await res.json();
        if (data && data.display_name) setTravelEnd(data.display_name);
      } catch (e) { }
      setIsLocating(false);
    }, () => {
      alert("Erreur de localisation");
      setIsLocating(false);
    });
  };

  const calculateDistance = async () => {
    if (!travelStart || !travelEnd) return alert("Veuillez saisir les deux adresses");
    setIsCalculating(true);
    setTravelCalculatedKm(null);
    try {
      const getCoords = async (addr: string) => {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`);
        const data = await res.json();
        if (data && data.length > 0) return { lat: data[0].lat, lon: data[0].lon };
        return null;
      };
      const startCoords = await getCoords(travelStart);
      const endCoords = await getCoords(travelEnd);
      if (!startCoords || !endCoords) throw new Error("Impossible de trouver l'une des adresses. Soyez plus précis.");

      const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=false`);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        setTravelCalculatedKm(data.routes[0].distance / 1000);
      } else {
        throw new Error("Impossible de calculer l'itinéraire");
      }
    } catch (e: any) {
      alert(e.message);
    }
    setIsCalculating(false);
  };

  const addTravelToDevis = () => {
    if (travelCalculatedKm === null) return;
    setWindows([...windows, {
      id: uuidv4(),
      type: 'autre',
      size: 'moyenne', height: 'homme', dirtiness: 'legere',
      quantity: Math.ceil(travelCalculatedKm * 2),
      description: `Déplacement`,
      prixManuel: travelPricePerKm,
      isFraisDeplacement: true
    }]);
    setShowTravelCalc(false);
    setTravelCalculatedKm(null);
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

  const generateAndSaveDevis = () => {
    if (windows.length === 0) {
      alert("Ajoutez d'abord des prestations au devis.");
      return;
    }

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
    const doc = buildDevisPDFDoc(newDevis, selectedClient || undefined, config);
    if (!doc) return;

    const pdfBase64 = doc.output('datauristring');
    doc.save(`devis-${format(new Date(), 'yyyyMMdd')}-${newDevis.id.substring(0, 4)}.pdf`);

    if (config.hubspot.token && selectedClientId) {
      useAppStore.getState().addOfflineTask({
        id: uuidv4(), type: 'UPLOAD_QUOTE', payload: { clientId: selectedClientId, date: newDevis.date, totalHT, pdfBase64 }, createdAt: new Date().toISOString()
      });
      processOfflineTasks();
    }

    if (selectedClientId && selectedClientId !== 'passage') {
      setShowEmailModal(newDevis);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/historique');
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
                {clientSearchQuery && clients.filter(c => c.name.toLowerCase().includes(clientSearchQuery.toLowerCase()) || (c.phone && c.phone.includes(clientSearchQuery))).map(c => (
                  <div key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearchQuery(''); }} className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                ))}
                {!clientSearchQuery && clients.slice(0, 5).map(c => (
                  <div key={c.id} onClick={() => { setSelectedClientId(c.id); setClientSearchQuery(''); }} className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <p className="font-bold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-500">{c.phone}</p>
                  </div>
                ))}
                <div onClick={() => setSelectedClientId('passage')} className="p-3 bg-slate-50 text-slate-600 cursor-pointer font-medium hover:bg-slate-100 text-center text-sm border-t border-slate-200">
                  Continuer sans client (Client de passage)
                </div>
              </div>
            </div>
          )}
        </section>

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
        {showTravelCalc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-orange-600 text-white p-4 flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Frais de déplacement
                </h3>
                <button onClick={() => setShowTravelCalc(false)} className="text-orange-200 hover:text-white font-bold p-1"><X className="h-5 w-5" /></button>
              </div>

              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600 uppercase">Adresse de départ</label>
                  <input type="text" value={travelStart} onChange={(e) => setTravelStart(e.target.value)} className="w-full rounded-lg border-slate-300 border p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-orange-500 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <label className="text-sm font-bold text-slate-600 uppercase">Adresse d'arrivée client</label>
                    <button onClick={handleLocateMe} disabled={isLocating} className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                      {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                      Me localiser
                    </button>
                  </div>
                  <input type="text" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)} className="w-full rounded-lg border-slate-300 border p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-orange-500 font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600 uppercase">Prix par km (€)</label>
                  <input type="number" step="0.01" value={travelPricePerKm} onChange={(e) => setTravelPricePerKm(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border-slate-300 border p-3 text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-orange-500 font-black text-lg" />
                </div>

                {travelCalculatedKm !== null ? (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center mt-6">
                    <p className="text-sm text-orange-800 mb-2 font-medium">Trajet aller estimé : <strong>{travelCalculatedKm.toFixed(1)} km</strong></p>
                    <p className="text-xl font-black text-orange-600">Total (A/R) : {(travelCalculatedKm * 2 * travelPricePerKm).toFixed(2)} €</p>
                  </div>
                ) : (
                  <Button onClick={calculateDistance} disabled={isCalculating} className="w-full bg-slate-800 hover:bg-slate-900 text-white h-12 text-base font-bold mt-4">
                    {isCalculating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Calculer les frais"}
                  </Button>
                )}

                <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setShowTravelCalc(false)} className="flex-1 h-12 font-bold text-slate-600">Annuler</Button>
                  <Button onClick={addTravelToDevis} disabled={travelCalculatedKm === null} className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white h-12 font-bold text-base">
                    Valider ce tarif
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <Button onClick={generateAndSaveDevis} className="w-full h-14 text-lg bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            <Download className="h-6 w-6" /> {existingDevisId ? 'Enregistrer et Générer' : 'Générer le Devis Client'}
          </Button>
        </div>

        {showEmailModal && selectedClientId && selectedClientId !== 'passage' && (
          <EmailModal
            recipientEmail={clients.find(c => c.id === selectedClientId)?.email || ''}
            clientName={clients.find(c => c.id === selectedClientId)?.name || ''}
            clientId={selectedClientId}
            devisDate={format(new Date(showEmailModal.date), 'dd/MM/yyyy')}
            totalAmount={showEmailModal.totalHT.toFixed(2)}
            pdfBase64={generateDevisPDF(showEmailModal, clients.find(c => c.id === selectedClientId), config)}
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
