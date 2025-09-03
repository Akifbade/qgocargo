import { 
    collection, 
    doc, 
    addDoc, 
    setDoc, 
    deleteDoc, 
    query, 
    onSnapshot, 
    serverTimestamp 
} from 'firebase/firestore';

export class ClientService {
    constructor(db) {
        this.db = db;
        this.cache = [];
        this.listeners = [];
    }

    async saveClient(clientData, clientId = null) {
        try {
            if (clientId) {
                // Update existing client
                const docRef = doc(this.db, 'clients', clientId);
                await setDoc(docRef, { ...clientData, updatedAt: serverTimestamp() }, { merge: true });
            } else {
                // Add new client
                const clientsCollection = collection(this.db, 'clients');
                await addDoc(clientsCollection, { 
                    ...clientData, 
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteClient(clientId) {
        try {
            await deleteDoc(doc(this.db, 'clients', clientId));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    subscribeToClients(callback) {
        const clientsCollection = collection(this.db, 'clients');
        const q = query(clientsCollection);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            this.cache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.cache.sort((a, b) => a.name.localeCompare(b.name));
            callback(this.cache);
        }, (error) => {
            console.error("Error loading clients:", error);
            callback([]);
        });
        
        this.listeners.push(unsubscribe);
        return unsubscribe;
    }

    getClientsCache() {
        return this.cache;
    }

    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
}