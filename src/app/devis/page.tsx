'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { generateAndDownloadDevisPDF } from '@/lib/pdf';
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
import { useAppStore, DevisData, DevisCategory } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { v4 as uuidv4 } from 'uuid';

export default function NouveauDevisPage() {
  const router = useRouter();
  const { config, clients, addDevis, devisHistory, updateDevis, currentDraft, updateCurrentDraft, clearCurrentDraft } = useAppStore();
  const [existingDevisId, setExistingDevisId] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const [categories, setCategories] = useState<DevisCategory[]>([]);
  const [windows, setWindows] = useState<WindowItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const [globalDesignation, setGlobalDesignation] = useState<string>('');
  const [isCustomDesignation, setIsCustomDesignation] = useState<boolean>(false);
  const [customCategoryDesignations, setCustomCategoryDesignations] = useState<Record<string, boolean>>({});
  const [customCategoryNames, setCustomCategoryNames] = useState<Record<string, boolean>>({});
  const [extraTasks, setExtraTasks] = useState<{ id: string, description: string, price: string }[]>([]);

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
          const loadedExtraTasks = devisToEdit.extraTasks?.map(t => ({ ...t, price: t.price.toString() })) || [];
          if (devisToEdit.extraTaskDescription) {
            loadedExtraTasks.push({ id: uuidv4(), description: devisToEdit.extraTaskDescription, price: devisToEdit.extraTaskPrice?.toString() || '' });
          }
          setExtraTasks(loadedExtraTasks);
          setCategories(devisToEdit.categories || []);

          if (existingGlobal) {
            const { config: currentConfig } = useAppStore.getState();
            const isMatch = currentConfig.globalDesignations?.some(gd => gd.label === existingGlobal);
            if (!isMatch) setIsCustomDesignation(true);
          }
          
          const initialCustomCats: Record<string, boolean> = {};
          const initialCustomNames: Record<string, boolean> = {};
          (devisToEdit.categories || []).forEach(c => {
            if (c.globalDesignation) {
               const { config: currentConfig } = useAppStore.getState();
               const isMatch = currentConfig.globalDesignations?.some(gd => gd.label === c.globalDesignation);
               if (!isMatch) initialCustomCats[c.id] = true;
            }
            if (c.name) {
               const { config: currentConfig } = useAppStore.getState();
               const isMatch = currentConfig.sectionTemplates?.some(st => st.name === c.name);
               if (!isMatch) initialCustomNames[c.id] = true;
            }
          });
          setCustomCategoryDesignations(initialCustomCats);
          setCustomCategoryNames(initialCustomNames);
        }
      } else {
        // Resume from draft if it exists
        const draft = useAppStore.getState().currentDraft;
        if (draft) {
          if (draft.clientId) setSelectedClientId(draft.clientId);
          if (draft.items) setWindows(draft.items);
          if (draft.discount !== undefined) setDiscount(draft.discount);
          if (draft.notes) setNotes(draft.notes);
          if (draft.globalDesignation) setGlobalDesignation(draft.globalDesignation);
          if (draft.extraTasks) setExtraTasks(draft.extraTasks.map(t => ({ ...t, price: t.price.toString() })));
          if (draft.categories) {
             setCategories(draft.categories);
             const initialCustomCats: Record<string, boolean> = {};
             const initialCustomNames: Record<string, boolean> = {};
             draft.categories.forEach(c => {
               if (c.globalDesignation) {
                 const { config: currentConfig } = useAppStore.getState();
                 const isMatch = currentConfig.globalDesignations?.some(gd => gd.label === c.globalDesignation);
                 if (!isMatch) initialCustomCats[c.id] = true;
               }
               if (c.name) {
                 const { config: currentConfig } = useAppStore.getState();
                 const isMatch = currentConfig.sectionTemplates?.some(st => st.name === c.name);
                 if (!isMatch) initialCustomNames[c.id] = true;
               }
             });
             setCustomCategoryDesignations(initialCustomCats);
             setCustomCategoryNames(initialCustomNames);
          }
        }
      }
    }
  }, []);

  // Auto-save effect
  useEffect(() => {
    // We only auto-save if we are NOT editing an explicitly saved finalized quote.
    // If we want to auto-save edits too, we can, but it might overwrite the original edit before saving.
    // Let's only auto-save new devis creations for now to be safe, or we can save state indiscriminately since draft is separate.
    if (!existingDevisId) {
      const timer = setTimeout(() => {
        // Only save if there's actually something entered to avoid blank drafts overriding history
        if (windows.length > 0 || selectedClientId || notes || extraTasks.length > 0 || categories.length > 0) {
          updateCurrentDraft({
            clientId: selectedClientId || undefined,
            categories,
            items: windows,
            discount,
            notes,
            globalDesignation: globalDesignation.trim() || undefined,
            extraTasks: extraTasks.filter(t => t.description.trim() !== '').map(t => ({ id: t.id, description: t.description.trim(), price: parseFloat(t.price) || 0 })),
          });
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [windows, selectedClientId, discount, notes, globalDesignation, extraTasks, categories, existingDevisId, updateCurrentDraft]);

  const [showAddMenu, setShowAddMenu] = useState<string | false>(false);

  const addCategory = () => {
    const newId = uuidv4();
    setCategories([...categories, { id: newId, name: '' }]);
    // Select dropdown will show default when empty
  };

  const updateCategory = (id: string, updates: Partial<DevisCategory>) => {
    setCategories(categories.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCategory = (id: string) => {
    if (window.confirm("Voulez-vous supprimer cette section ? Les prestations à l'intérieur seront déplacées vers le haut.")) {
      setCategories(categories.filter(c => c.id !== id));
      setWindows(windows.map(w => w.categoryId === id ? { ...w, categoryId: undefined } : w));
    }
  };

  const addCard = (typeId: string, categoryId?: string) => {
    setWindows([...windows, {
      id: uuidv4(),
      categoryId: categoryId === 'ROOT' ? undefined : categoryId,
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
    const rawTotal = Math.ceil(km * 2) * pricePerKm;
    
    if (rawTotal < 20) {
      setWindows([...windows, {
        id: uuidv4(),
        type: 'autre',
        size: 'moyenne', height: 'homme', dirtiness: 'legere',
        quantity: 1,
        description: `Frais de déplacement (Forfait minimum)`,
        prixManuel: 20,
        isFraisDeplacement: true
      }]);
    } else {
      setWindows([...windows, {
        id: uuidv4(),
        type: 'autre',
        size: 'moyenne', height: 'homme', dirtiness: 'legere',
        quantity: Math.ceil(km * 2),
        description: `Frais de déplacement`,
        prixManuel: pricePerKm,
        isFraisDeplacement: true
      }]);
    }
    setShowTravelCalc(false);
  };

  const subTotal = useMemo(() => {
    const windowsTotal = windows.reduce((acc, current) => acc + calculateWindowPrice(current, config), 0);
    const extraPrice = extraTasks.reduce((acc, task) => acc + (parseFloat(task.price) || 0), 0);
    return windowsTotal + extraPrice;
  }, [windows, config, extraTasks]);

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
        categories,
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
        extraTasks: extraTasks.filter(t => t.description.trim() !== '' && (parseFloat(t.price) || 0) > 0).map(t => ({ id: t.id, description: t.description.trim(), price: parseFloat(t.price) || 0 })),
      };

      if (existingDevisId) {
        updateDevis(existingDevisId, newDevis);
      } else {
        addDevis(newDevis);
        clearCurrentDraft(); // Clear draft on successful creation
      }

      const selectedClient = clients.find(c => c.id === selectedClientId);
      const pdfBase64 = await generateAndDownloadDevisPDF(newDevis, selectedClient, config);

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

  const handleCancel = () => {
    if (window.confirm("Êtes-vous sûr de vouloir annuler ce devis ? Tout le contenu non enregistré sera perdu.")) {
      clearCurrentDraft();
      router.push('/historique');
    }
  };

  const renderWindowCard = (w: WindowItem) => {
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
      );
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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide" title="Prix unitaire personnalisé, ignore les multiplicateurs">Prix U. Libre</span>
            <input
              type="number"
              min="0"
              step="0.5"
              placeholder="Auto"
              value={w.prixManuel !== undefined ? w.prixManuel : ''}
              onChange={(e) => {
                const val = e.target.value;
                updateCard(w.id, { prixManuel: val === '' ? undefined : parseFloat(val) });
              }}
              className="w-full text-center h-11 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800 bg-white placeholder:text-slate-400 placeholder:font-normal shadow-sm"
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
  };

  const renderAddMenu = (categoryId: string) => {
    if (showAddMenu === categoryId) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 bg-white rounded-xl shadow-sm border border-blue-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Plus className="h-5 w-5 text-blue-600" /> Ajouter une prestation</h3>
            <button onClick={() => setShowAddMenu(false)} className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(config.windowTypes || []).map(wt => (
              <button key={wt.id} onClick={() => addCard(wt.id, categoryId)} className="p-3 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl text-sm font-bold text-slate-700 hover:text-blue-700 text-center transition-all shadow-sm flex items-center justify-center">
                <span className="truncate">{wt.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }
    return (
      <Button variant="outline" onClick={() => setShowAddMenu(categoryId)} className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 font-bold py-4 border-dashed bg-white text-base">
        + Ajouter type de vitre
      </Button>
    );
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
        <section className="space-y-6">
          {/* ROOT ITEMS (No category) */}
          <div className="space-y-4">
            {windows.filter(w => !w.categoryId).map((w) => renderWindowCard(w))}
          </div>

          {/* CATEGORIES */}
          {categories.map(cat => (
            <div key={cat.id} className="bg-slate-100 rounded-2xl p-4 border border-slate-200">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <select
                      value={customCategoryNames[cat.id] ? 'custom' : (cat.name || '')}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setCustomCategoryNames(prev => ({ ...prev, [cat.id]: true }));
                          updateCategory(cat.id, { name: '' });
                        } else {
                          setCustomCategoryNames(prev => ({ ...prev, [cat.id]: false }));
                          updateCategory(cat.id, { name: val });
                        }
                      }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3 font-bold text-slate-800 text-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    >
                      <option value="" disabled>-- Choisir un modèle de section --</option>
                      {config.sectionTemplates?.map(st => (
                        <option key={st.id} value={st.name}>{st.name}</option>
                      ))}
                      <option value="custom">Autre (personnalisé)...</option>
                    </select>

                    {customCategoryNames[cat.id] && (
                      <input
                        type="text"
                        value={cat.name}
                        onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
                        className="w-full bg-white border border-blue-300 rounded-lg p-3 font-bold text-slate-800 text-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        placeholder="Saisissez le titre de la section..."
                        autoFocus
                      />
                    )}
                  </div>
                  <button title="Supprimer la section" onClick={() => removeCategory(cat.id)} className="p-3 bg-white border border-slate-300 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-2 mb-4 bg-white p-3 border border-slate-200 rounded-lg">
                  <label className="text-sm font-medium text-slate-600 block">Désignation globale de section (Optionnel)</label>
                  <select
                    value={customCategoryDesignations[cat.id] ? 'custom' : (cat.globalDesignation || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'custom') {
                        setCustomCategoryDesignations(prev => ({ ...prev, [cat.id]: true }));
                        updateCategory(cat.id, { globalDesignation: '' });
                      } else {
                        setCustomCategoryDesignations(prev => ({ ...prev, [cat.id]: false }));
                        updateCategory(cat.id, { globalDesignation: val });
                      }
                    }}
                    className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-800 text-sm focus:ring-2 outline-none"
                  >
                    <option value="">-- Ne pas utiliser de désignation globale --</option>
                    {config.globalDesignations?.map(gd => (
                      <option key={gd.id} value={gd.label}>{gd.label}</option>
                    ))}
                    <option value="custom">Autre (personnalisé)...</option>
                  </select>

                  {customCategoryDesignations[cat.id] && (
                    <input
                      type="text"
                      value={cat.globalDesignation || ''}
                      onChange={(e) => updateCategory(cat.id, { globalDesignation: e.target.value })}
                      className="w-full mt-2 bg-blue-50 border border-blue-300 rounded-lg p-2.5 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      placeholder="Saisissez la désignation personnalisée..."
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {windows.filter(w => w.categoryId === cat.id).map(w => renderWindowCard(w))}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200">
                {renderAddMenu(cat.id)}
              </div>
            </div>
          ))}

          {/* ROOT ADD MENU */}
          <div className="pt-2">
            {renderAddMenu('ROOT')}
          </div>
        </section>

        {/* TRAVEL CALC MODAL */}


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

            <div className="border-t border-slate-100 pt-4 space-y-4">
              <h3 className="text-sm font-medium text-slate-600">Prestations Supplémentaires (Optionnel)</h3>
              {extraTasks.map((task) => (
                <div key={task.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                  <button onClick={() => setExtraTasks(prev => prev.filter(t => t.id !== task.id))} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-slate-500">Description</label>
                    <input
                      type="text"
                      placeholder="Ex: Nettoyage structure métallique"
                      value={task.description}
                      onChange={(e) => setExtraTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: e.target.value } : t))}
                      className="w-full rounded border-slate-300 border p-2 text-slate-800 focus:ring-2 outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500">Prix unitaire (HT)</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={task.price}
                        onChange={(e) => setExtraTasks(prev => prev.map(t => t.id === task.id ? { ...t, price: e.target.value } : t))}
                        className="w-full rounded border-slate-300 border p-2 text-slate-800 focus:ring-2 outline-none pr-8 text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">€</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setShowTravelCalc(true)} className="w-full border-dashed text-orange-600 border-orange-200 hover:bg-orange-50 py-4 h-auto font-bold flex items-center justify-center gap-2 mb-2">
                <MapPin className="h-4 w-4" /> Ajouter des frais de déplacement
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExtraTasks(prev => [...prev, { id: uuidv4(), description: '', price: '' }])} className="w-full border-dashed text-blue-600 border-blue-200 hover:bg-blue-50 py-4 h-auto font-medium">
                + Ajouter une prestation supplémentaire
              </Button>
              <Button variant="outline" size="sm" onClick={addCategory} className="w-full border-dashed text-purple-600 border-purple-200 hover:bg-purple-50 py-4 h-auto font-bold flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Ajouter une section (Ex: Nettoyage panneaux)
              </Button>
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
        <div className="pt-2 pb-8 flex flex-col gap-3">
          <Button onClick={generateAndSaveDevis} disabled={isGenerating} className="w-full h-14 text-lg bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Download className="h-6 w-6" />}
            {existingDevisId ? 'Enregistrer et Générer' : 'Générer le Devis Client'}
          </Button>

          <button 
            onClick={handleCancel}
            className="text-slate-500 hover:text-red-500 font-bold text-sm underline flex items-center justify-center gap-1 py-1 mt-1 mx-auto transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Annuler ce devis
          </button>
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
