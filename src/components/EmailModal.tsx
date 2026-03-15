import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Send, X, Paperclip, Loader2, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface EmailModalProps {
    recipientEmail: string;
    clientName: string;
    clientId: string; // Add clientId to attach note
    devisDate: string;
    totalAmount: string;
    pdfBase64?: string;
    onClose: () => void;
}

export function EmailModal({ recipientEmail, clientName, clientId, devisDate, totalAmount, pdfBase64, onClose }: EmailModalProps) {
    const { config } = useAppStore();
    const [email, setEmail] = useState(recipientEmail);
    const [subject, setSubject] = useState(`Devis du ${devisDate} - ${config.enterprise.nom}`);
    
    // Initialise avec le template dynamique
    const defaultTemplate = `Bonjour {clientName},\n\nVeuillez trouver ci-joint votre devis du {devisDate} pour un montant total de {totalAmount} €.\n\nRestant à votre disposition pour toute question.\n\nCordialement,\n{enterpriseName}`;
    const rawTemplate = config.email?.template || defaultTemplate;
    const initialMessage = rawTemplate
        .replace(/{clientName}/g, clientName)
        .replace(/{devisDate}/g, devisDate)
        .replace(/{totalAmount}/g, totalAmount)
        .replace(/{enterpriseName}/g, config.enterprise.nom);

    const [message, setMessage] = useState(initialMessage);
    const [isSending, setIsSending] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const canSendDirectly = Boolean(config.email?.address && config.email?.password && pdfBase64);

    const handleSend = async () => {
        if (!canSendDirectly) {
            // Fallback to mailto link
            const mailtoLink = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
            window.location.href = mailtoLink;
            onClose();
            return;
        }

        setIsSending(true);
        setStatus('idle');
        try {
            const res = await fetch('/api/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email,
                    subject,
                    text: message,
                    pdfBase64,
                    credentials: {
                        address: config.email.address,
                        password: config.email.password
                    }
                })
            });

            if (!res.ok) throw new Error("Erreur d'envoi");

            if (config.hubspot.token && clientId && pdfBase64) {
                import('@/lib/hubspot').then(({ processOfflineTasks }) => {
                    useAppStore.getState().addOfflineTask({
                        id: Date.now().toString(),
                        type: 'EMAIL_SENT',
                        payload: { clientId, date: devisDate, totalHT: totalAmount, pdfBase64 },
                        createdAt: new Date().toISOString()
                    });
                    processOfflineTasks();
                });
            }

            setStatus('success');
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            setStatus('error');
            console.error(error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-blue-800 text-white p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><Send className="h-4 w-4" /> Envoyer par email</h3>
                    <button onClick={onClose} className="text-blue-200 hover:text-white font-bold p-1"><X className="h-5 w-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Destinataire</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sujet</label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Message</label>
                        <textarea
                            rows={6}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            className="w-full rounded-lg border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>

                    {canSendDirectly ? (
                        <div className="bg-blue-50 rounded-lg p-3 flex items-start gap-2 border border-blue-200">
                            <Send className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-800">
                                <strong>Envoi automatique :</strong> Le devis PDF sera automatiquement envoyé en pièce jointe grâce à votre intégration Gmail.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2 border border-amber-200">
                            <Paperclip className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-800">
                                <strong>Important :</strong> En cliquant sur Envoyer, votre application d'emails (Mail, Gmail) s'ouvrira.
                                <strong> Vous devrez joindre manuellement le PDF avant d'envoyer.</strong> Configurez votre compte Email Pro dans les paramètres pour un envoi automatique.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <p className="text-sm text-red-600 font-bold bg-red-50 p-2 rounded">
                            Erreur lors de l'envoi. Vérifiez votre mot de passe d'application dans les Paramètres.
                        </p>
                    )}

                    <div className="pt-2 flex gap-3">
                        {status === 'success' ? (
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold pointer-events-none">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Email envoyé avec succès !
                            </Button>
                        ) : (
                            <>
                                <Button variant="outline" onClick={onClose} disabled={isSending} className="flex-1">Annuler</Button>
                                <Button onClick={handleSend} disabled={isSending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                                    {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                                    {isSending ? "Envoi..." : canSendDirectly ? "Envoyer l'email" : "Ouvrir l'email"}
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
