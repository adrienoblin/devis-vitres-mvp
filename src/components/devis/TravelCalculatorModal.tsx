import React, { useState, useEffect } from 'react';
import { MapPin, X, Loader2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { useAppStore } from '@/lib/store';

interface TravelCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetAddress: string;
    onAddTravel: (km: number, pricePerKm: number) => void;
}

export function TravelCalculatorModal({ isOpen, onClose, targetAddress, onAddTravel }: TravelCalculatorModalProps) {
    const { config } = useAppStore();
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
        if (targetAddress) setTravelEnd(targetAddress);
    }, [targetAddress]);

    // Reset calculated state when modal opens
    useEffect(() => {
        if (isOpen) {
            setTravelCalculatedKm(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleLocateMe = () => {
        if (!navigator.geolocation) {
            toast.error("La géolocalisation n'est pas supportée par votre navigateur");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setTravelEnd(`${latitude},${longitude}`);
                setIsLocating(false);
                toast.success("Position trouvée !");
            },
            (error) => {
                console.error(error);
                setIsLocating(false);
                toast.error("Erreur de localisation. Assurez-vous d'avoir autorisé l'accès à votre position.");
            },
            { enableHighAccuracy: true }
        );
    };

    const calculateDistance = async () => {
        if (!travelStart || !travelEnd) {
            toast.error("Veuillez saisir les deux adresses pour le calcul");
            return;
        }
        setIsCalculating(true);
        try {
            const response = await fetch(`/api/distance?origins=${encodeURIComponent(travelStart)}&destinations=${encodeURIComponent(travelEnd)}`);
            if (!response.ok) throw new Error("Erreur réseau");
            const data = await response.json();

            if (data.rows && data.rows[0].elements[0].status === 'OK') {
                const distanceMeters = data.rows[0].elements[0].distance.value;
                const distanceKm = distanceMeters / 1000;
                setTravelCalculatedKm(distanceKm);
                toast.success(`Distance calculée: ${distanceKm.toFixed(1)} km`);
            } else {
                toast.error("Impossible de calculer l'itinéraire via Google Maps.");
            }
        } catch (e: any) {
            toast.error(e instanceof Error ? e.message : "Erreur de calcul");
        } finally {
            setIsCalculating(false);
        }
    };

    const handleAdd = () => {
        if (travelCalculatedKm !== null) {
            onAddTravel(travelCalculatedKm, travelPricePerKm);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-orange-600 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Frais de déplacement
                    </h3>
                    <button onClick={onClose} className="text-orange-200 hover:text-white font-bold p-1"><X className="h-5 w-5" /></button>
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
                        <Button variant="outline" onClick={onClose} className="flex-1 h-12 font-bold text-slate-600">Annuler</Button>
                        <Button onClick={handleAdd} disabled={travelCalculatedKm === null} className="flex-[2] bg-orange-600 hover:bg-orange-700 text-white h-12 font-bold text-base">
                            Valider ce tarif
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
