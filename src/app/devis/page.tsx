'use client';

import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import {
  Plus,
  Trash2,
  Download,
  Settings2,
  Calculator,
  User,
  Camera,
  Edit2,
  MessageSquare
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
  const { config, clients, addDevis } = useAppStore();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [windows, setWindows] = useState<WindowItem[]>([]);

  const [discount, setDiscount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<WindowType>('classique');
  const [formSize, setFormSize] = useState<Size>('moyenne');
  const [formHeight, setFormHeight] = useState<Height>('homme');
  const [formDirtiness, setFormDirtiness] = useState<Dirtiness>('legere');
  const [formQty, setFormQty] = useState<number>(1);
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPrixManuel, setFormPrixManuel] = useState<number>(0);
  const [formNote, setFormNote] = useState<string>('');

  const resetForm = () => {
    setEditingId(null);
    setFormType('classique');
    setFormSize('moyenne');
    setFormHeight('homme');
    setFormDirtiness('legere');
    setFormQty(1);
    setFormDescription('');
    setFormPrixManuel(0);
    setFormNote('');
  };

  const handleEditWindow = (item: WindowItem) => {
    setEditingId(item.id);
    setFormType(item.type);
    setFormSize(item.size);
    setFormHeight(item.height);
    setFormDirtiness(item.dirtiness);
    setFormQty(item.quantity);
    setFormDescription(item.description || '');
    setFormPrixManuel(item.prixManuel || 0);
    setFormNote(item.note || '');
    // Scroll to top or form smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveWindow = () => {
    if (formQty < 1) return;

    const newItem: WindowItem = {
      id: editingId || uuidv4(),
      type: formType,
      size: formSize,
      height: formHeight,
      dirtiness: formDirtiness,
      quantity: formQty,
      description: formType === 'autre' ? formDescription : undefined,
      prixManuel: formType === 'autre' ? formPrixManuel : undefined,
      note: formNote || undefined,
    };

    if (editingId) {
      setWindows(windows.map(w => w.id === editingId ? newItem : w));
    } else {
      setWindows([...windows, newItem]);
    }

    resetForm();
  };

  const removeWindow = (id: string) => {
    setWindows(windows.filter(w => w.id !== id));
  };

  const subTotal = useMemo(() => {
    return windows.reduce((acc, current) => acc + calculateWindowPrice(current, config), 0);
  }, [windows, config]);

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

    // Save to AppStore history
    const newDevis: DevisData = {
      id: uuidv4(),
      clientId: selectedClientId || undefined,
      date: new Date().toISOString(),
      items: windows,
      subTotal,
      discount,
      totalHT,
      statut: 'brouillon',
      notes,
      photos: [] // Removed per user request since we are simplifying
    };
    addDevis(newDevis);

    // Generate PDF
    const doc = jsPDF ? new jsPDF() : null;
    if (!doc) return;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text(config.enterprise.nom || 'Devis Nettoyage', 14, 25);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Date : ${format(new Date(), 'dd/MM/yyyy')}`, 14, 35);
    doc.text(`Devis #DEV-${Math.floor(Math.random() * 10000)}`, 14, 41);

    // Client Info
    const selectedClient = clients.find(c => c.id === selectedClientId);
    if (selectedClient) {
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Client :", 120, 25);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(selectedClient.name, 120, 31);
      doc.setFont("helvetica", "normal");
      if (selectedClient.address) doc.text(selectedClient.address, 120, 37);
      if (selectedClient.phone) doc.text(selectedClient.phone, 120, 43);
    }

    let yPos = 65;

    // FORFAIT MASQUÉ (User request #3)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text('NETTOYAGE COMPLET VITRERIE', 14, yPos);

    yPos += 15;

    if (selectedClient?.address) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`📍 Intervention : ${selectedClient.address}`, 14, yPos);
      yPos += 15;
    }

    // Big Total Block
    doc.setFillColor(241, 245, 249);
    doc.rect(14, yPos, 182, 25, 'F');
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL FORFAITAIRE : ${totalHT.toFixed(2)} € HTVA`, 20, yPos + 16);

    yPos += 45;

    // Notes
    if (notes) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('Notes / Précisions :', 14, yPos);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const splitNotes = doc.splitTextToSize(notes, 180);
      doc.text(splitNotes, 14, yPos + 8);
      yPos += 15 + (splitNotes.length * 5);
      doc.setTextColor(0, 0, 0);
    }

    // CGV
    if (config.cgv) {
      yPos += 10;
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      const splitCgv = doc.splitTextToSize(config.cgv, 180);
      doc.text(splitCgv, 14, yPos);
      yPos += (splitCgv.length * 4);
      doc.setTextColor(0, 0, 0);
    }

    // PDF Signature placement
    yPos += 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text('Bon pour accord (Signature du client) :', 14, yPos);

    doc.save(`devis-${format(new Date(), 'yyyyMMdd')}.pdf`);
    router.push('/historique');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-800 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-6 w-6" />
            <h1 className="text-xl font-bold">Nouveau Devis</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">

        {/* CLIENT SELECTION */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            Sélectionner un client
          </h2>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full rounded-lg border-slate-300 border p-3 text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
          >
            <option value="">-- Client de passage --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} - {c.phone || c.email}</option>
            ))}
          </select>
        </section>

        {/* ADD / EDIT WINDOW SECTION */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-t-4 border-t-blue-500">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-slate-800">
            {editingId ? <Edit2 className="h-5 w-5 text-blue-600" /> : <Plus className="h-5 w-5 text-blue-600" />}
            {editingId ? 'Modifier la prestation' : 'Ajouter une prestation'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium text-slate-600">Type</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as WindowType)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none">
                {Object.entries(LABELS.types).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>

            {/* AUTRE LOGIC */}
            {formType === 'autre' ? (
              <>
                <div className="space-y-1 col-span-2">
                  <label className="text-sm font-medium text-slate-600">Description personnalisée</label>
                  <input type="text" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Pan véranda sud" className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Prix unitaire (€)</label>
                  <input type="number" min="0" value={formPrixManuel} onChange={(e) => setFormPrixManuel(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Taille</label>
                  <select value={formSize} onChange={(e) => setFormSize(e.target.value as Size)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none">
                    {Object.entries(LABELS.sizes).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Accès</label>
                  <select value={formHeight} onChange={(e) => setFormHeight(e.target.value as Height)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none">
                    {Object.entries(LABELS.heights).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-600">Salissure</label>
                  <select value={formDirtiness} onChange={(e) => setFormDirtiness(e.target.value as Dirtiness)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none">
                    {Object.entries(LABELS.dirtiness).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Qté</label>
              <input type="number" min="1" value={formQty} onChange={(e) => setFormQty(parseInt(e.target.value) || 1)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none" />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium text-slate-600">Note interne (optionnelle)</label>
              <input type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Ex: Difficile d'accès avec échelle" className="w-full rounded-lg border-slate-300 border p-2.5 text-sm bg-slate-50 outline-none" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {editingId && (
              <Button variant="outline" onClick={resetForm} className="flex-1 h-12">
                Annuler
              </Button>
            )}
            <Button onClick={saveWindow} className={`flex-[2] h-12 text-white shadow-sm ${editingId ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? '✓ Enregistrer modif' : 'Ajouter au devis'}
            </Button>
          </div>
        </section>

        {/* LIST SECTION */}
        {windows.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-lg font-bold mb-4 text-slate-800 flex justify-between items-center">
              Détail du devis (Interne)
              <span className="text-sm text-slate-500 font-normal">{windows.length} prestation(s)</span>
            </h2>
            <div className="space-y-3">
              {windows.map((item) => {
                const title = item.type === 'autre' ? item.description || 'Autre prestation' : LABELS.types[item.type];
                return (
                  <div key={item.id} className="flex flex-col p-3 bg-slate-50 border border-slate-200 rounded-xl gap-2">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{item.quantity}x {title}</p>
                        {item.type !== 'autre' && (
                          <p className="text-xs text-slate-500 mt-1">{LABELS.sizes[item.size]} • {LABELS.heights[item.height]} • {LABELS.dirtiness[item.dirtiness]}</p>
                        )}
                        {item.note && (
                          <p className="text-xs text-amber-600 bg-amber-50 inline-block px-2 py-1 rounded mt-1 shadow-sm border border-amber-100">
                            📝 {item.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-black text-blue-700">{calculateWindowPrice(item, config).toFixed(2)} €</p>
                      </div>
                    </div>

                    {/* Actions bar for window */}
                    <div className="flex gap-2 items-center justify-end mt-2 pt-2 border-t border-slate-200">
                      <button onClick={() => handleEditWindow(item)} className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center transition-colors">
                        <Edit2 className="h-3 w-3 mr-1" /> Modifier
                      </button>
                      <button onClick={() => removeWindow(item.id)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg flex items-center transition-colors">
                        <Trash2 className="h-3 w-3 mr-1" /> Suppr
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* TOTALS */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
            <Settings2 className="h-5 w-5 text-blue-600" /> Options de fin
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600">Remise globale (%)</label>
              <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)} className="w-full rounded-lg border-slate-300 border p-2.5 text-slate-800 focus:ring-2 outline-none" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium text-slate-600">Précisions devis (Affiche dans PDF client)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-lg border-slate-300 border p-2.5 text-sm h-16 resize-none outline-none" />
            </div>
          </div>

          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="flex justify-between items-center mt-2">
              <span className="text-lg font-bold text-slate-800">TOTAL FORFAIT (HTVA)</span>
              <span className="text-3xl font-black text-blue-700">{totalHT.toFixed(2)} €</span>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="pt-2 pb-8">
          <Button onClick={generateAndSaveDevis} className="w-full h-14 text-lg bg-blue-800 hover:bg-blue-900 text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
            <Download className="h-6 w-6" /> Générer le Devis Client
          </Button>
        </div>

      </main>
    </div>
  );
}
