import { ClientData, OfflineTask, useAppStore } from './store';

const API_BASE = '/api/hubspot';

const getHeaders = () => {
    const state = useAppStore.getState();
    const token = state.config.hubspot.token;

    // We send the token unless it's a dummy value from the updated UI,
    // in which case the API route will use process.env.HUBSPOT_TOKEN.
    const isEnvConfigured = token === 'env_configured';

    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (token && !isEnvConfigured) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

export const hubspotApi = {
    async fetchContacts(): Promise<ClientData[]> {
        let allContacts: any[] = [];
        let after: string | undefined = undefined;
        let hasMore = true;

        while (hasMore) {
            let url = `${API_BASE}/crm/v3/objects/contacts?properties=firstname,lastname,phone,email,address&limit=100`;
            if (after) {
                url += `&after=${after}`;
            }

            const response = await fetch(url, {
                headers: getHeaders()
            });

            if (!response.ok) throw new Error("Erreur lors de la récupération des contacts");
            const data = await response.json();

            if (data.results) {
                allContacts = [...allContacts, ...data.results];
            }

            if (data.paging?.next?.after) {
                after = data.paging.next.after;
            } else {
                hasMore = false;
            }
        }

        return allContacts.map((c: any) => ({
            id: c.id,
            firstname: c.properties.firstname || '',
            lastname: c.properties.lastname || '',
            name: `${c.properties.firstname || ''} ${c.properties.lastname || ''}`.trim(),
            phone: c.properties.phone || '',
            email: c.properties.email || '',
            address: c.properties.address || '',
            notes: '',
            createdAt: c.createdAt
        }));
    },

    async createContact(client: Partial<ClientData>): Promise<string> {
        const properties: any = {
            firstname: client.firstname || '',
            lastname: client.lastname || '',
            phone: client.phone || '',
            address: client.address || ''
        };
        // HubSpot throws an error if email is an empty string because it expects a valid email format
        if (client.email && client.email.trim() !== '') {
            properties.email = client.email.trim();
        }

        const response = await fetch(`${API_BASE}/crm/v3/objects/contacts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ properties })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Erreur création contact HubSpot:", errorData);
            throw new Error(errorData.message || "Erreur création contact HubSpot");
        }
        const data = await response.json();
        return data.id;
    },

    async uploadFile(base64: string, filename: string): Promise<string> {
        const state = useAppStore.getState();
        const token = state.config.hubspot.token;
        if (!token) throw new Error("Token HubSpot manquant");

        // Convert base64 to Blob
        const fetchResponse = await fetch(base64);
        const blob = await fetchResponse.blob();

        const formData = new FormData();
        formData.append('file', blob, filename);
        formData.append('folderPath', '/DevisVitresApp');
        formData.append('options', JSON.stringify({ "access": "PUBLIC_INDEXABLE" }));

        const response = await fetch(`${API_BASE}/files/v3/files`, {
            method: 'POST',
            headers: (() => {
                const hdrs = getHeaders();
                delete hdrs['Content-Type']; // Let browser set multipart/form-data with boundary
                return hdrs;
            })(),
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Erreur upload fichier HubSpot:", errorData);
            throw new Error(errorData.message || "Erreur upload fichier HubSpot");
        }
        const data = await response.json();
        return data.id ? data.id.toString() : data.objects[0].id.toString();
    },

    async createNote(contactId: string, message: string, fileId?: string): Promise<void> {
        const properties: any = {
            hs_timestamp: new Date().toISOString(),
            hs_note_body: message,
        };

        if (fileId) {
            properties.hs_attachment_ids = fileId;
        }

        const body = {
            properties,
            associations: [
                {
                    to: { id: contactId },
                    types: [
                        {
                            associationCategory: "HUBSPOT_DEFINED",
                            associationTypeId: 202 // Contact to Note association
                        }
                    ]
                }
            ]
        };

        const response = await fetch(`${API_BASE}/crm/v3/objects/notes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error("Erreur création note HubSpot");
    }
};

export const syncHubspotContacts = async () => {
    try {
        const contacts = await hubspotApi.fetchContacts();
        useAppStore.getState().setClients(contacts);
        useAppStore.getState().updateConfig({
            hubspot: {
                ...useAppStore.getState().config.hubspot,
                lastSync: new Date().toISOString()
            }
        });
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const processOfflineTasks = async () => {
    if (!navigator.onLine) return; // Wait for connection

    const state = useAppStore.getState();
    const token = state.config.hubspot.token;
    if (!token) return;

    for (const task of state.offlineTasks) {
        try {
            if (task.type === 'CREATE_CONTACT') {
                const hsId = await hubspotApi.createContact(task.payload);
                // Update local client with proper hs_object_id
                const localClient = state.clients.find(c => c.id === task.payload.id);
                if (localClient) {
                    // Create a new version with the correct ID and remove offline marker
                    const { needsSync, ...syncedClient } = localClient;
                    useAppStore.getState().deleteClient(localClient.id);
                    useAppStore.getState().addClient({ ...syncedClient, id: hsId });
                }
            } else if (task.type === 'UPLOAD_QUOTE') {
                // Determine contactId
                const { clientId, date, totalHT, pdfBase64 } = task.payload;
                // If the client ID is still a pending UUID instead of HubSpot ID, we must wait.
                // We'll skip this task for now if the contact isn't synced.
                if (clientId.includes('-')) continue;

                const fileId = await hubspotApi.uploadFile(pdfBase64, `Devis_${new Date(date).getTime()}.pdf`);
                await hubspotApi.createNote(clientId, `Devis généré depuis l'application\nTotal: ${totalHT}€`, fileId);
            } else if (task.type === 'EMAIL_SENT') {
                const { clientId, date, totalHT, pdfBase64 } = task.payload;
                if (clientId.includes('-')) continue;

                const fileId = await hubspotApi.uploadFile(pdfBase64, `Devis_Envoye_${new Date(date).getTime()}.pdf`);
                await hubspotApi.createNote(clientId, `📧 Email envoyé au client avec le devis en pièce jointe.\nTotal du devis : ${totalHT}€`, fileId);
            }

            // Remove processed task
            useAppStore.getState().removeOfflineTask(task.id);
        } catch (error) {
            console.error("Erreur OfflineTask processing:", error);
            useAppStore.getState().updateOfflineTask(task.id, { error: String(error) });
        }
    }
};
