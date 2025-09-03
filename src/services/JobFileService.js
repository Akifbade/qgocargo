import { 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    onSnapshot, 
    serverTimestamp 
} from 'firebase/firestore';

export class JobFileService {
    constructor(db) {
        this.db = db;
        this.cache = [];
        this.listeners = [];
    }

    async saveJobFile(jobData, isUpdate = false) {
        try {
            const docId = jobData.jfn.replace(/\//g, '_');
            
            // Check for duplicates
            if (!isUpdate) {
                const duplicateCheck = await this.checkForDuplicates(jobData);
                if (!duplicateCheck.success) {
                    return duplicateCheck;
                }
            }

            const docRef = doc(this.db, 'jobfiles', docId);
            
            if (isUpdate) {
                const existingDoc = await getDoc(docRef);
                if (existingDoc.exists()) {
                    const existingData = existingDoc.data();
                    jobData.lastUpdatedBy = window.app.currentUser.displayName;
                    jobData.updatedAt = serverTimestamp();
                    
                    // Reset approval status if file was previously approved/checked
                    if (existingData.status === 'approved' || existingData.status === 'checked') {
                        jobData.status = 'pending';
                        jobData.checkedBy = null;
                        jobData.checkedAt = null;
                        jobData.approvedBy = null;
                        jobData.approvedAt = null;
                        jobData.rejectionReason = null;
                        jobData.rejectedBy = null;
                        jobData.rejectedAt = null;
                    }
                }
            } else {
                jobData.createdBy = window.app.currentUser.displayName;
                jobData.createdAt = serverTimestamp();
                jobData.lastUpdatedBy = window.app.currentUser.displayName;
                jobData.updatedAt = serverTimestamp();
                jobData.status = 'pending';
            }

            await setDoc(docRef, jobData, { merge: isUpdate });
            return { success: true, docId };
        } catch (error) {
            console.error('Error saving job file:', error);
            return { success: false, error: error.message };
        }
    }

    async checkForDuplicates(jobData) {
        const checks = [
            { field: 'jfn', value: jobData.jfn, label: 'Job File No.' }
        ];
        
        if (jobData.in) checks.push({ field: 'in', value: jobData.in, label: 'Invoice No.' });
        if (jobData.mawb) checks.push({ field: 'mawb', value: jobData.mawb, label: 'MAWB No.' });

        for (const check of checks) {
            try {
                const q = query(collection(this.db, 'jobfiles'), where(check.field, '==', check.value));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const existingDoc = querySnapshot.docs[0];
                    return { 
                        success: false, 
                        error: `Duplicate ${check.label} "${check.value}" found in job file: ${existingDoc.data().jfn}` 
                    };
                }
            } catch (error) {
                return { success: false, error: 'Error checking for duplicates' };
            }
        }
        
        return { success: true };
    }

    async getJobFile(docId) {
        try {
            const docRef = doc(this.db, 'jobfiles', docId);
            const docSnap = await getDoc(docRef);
            return docSnap.exists() ? { success: true, data: docSnap.data() } : { success: false, error: 'Job file not found' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async updateJobFileStatus(docId, status, additionalData = {}) {
        try {
            const docRef = doc(this.db, 'jobfiles', docId);
            const updateData = {
                status,
                ...additionalData,
                updatedAt: serverTimestamp()
            };
            
            await setDoc(docRef, updateData, { merge: true });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async deleteJobFile(docId) {
        try {
            const docRef = doc(this.db, 'jobfiles', docId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const dataToMove = docSnap.data();
                dataToMove.deletedAt = serverTimestamp();
                dataToMove.deletedBy = window.app.currentUser.displayName;
                
                // Move to recycle bin
                const deletedDocRef = doc(this.db, 'deleted_jobfiles', docId);
                await setDoc(deletedDocRef, dataToMove);
                await deleteDoc(docRef);
                
                return { success: true };
            } else {
                return { success: false, error: 'Job file not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    subscribeToJobFiles(callback) {
        const jobFilesCollection = collection(this.db, 'jobfiles');
        const q = query(jobFilesCollection, orderBy('updatedAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            this.cache = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            callback(this.cache);
        }, (error) => {
            console.error("Error fetching job files:", error);
            callback([]);
        });
        
        this.listeners.push(unsubscribe);
        return unsubscribe;
    }

    getJobFilesCache() {
        return this.cache;
    }

    cleanup() {
        this.listeners.forEach(unsubscribe => unsubscribe());
        this.listeners = [];
    }
}