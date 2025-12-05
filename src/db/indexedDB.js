/**
 * IndexedDB Utility Module
 * 
 * Provides core database operations for the Class Diary PWA.
 * Handles storage of student data, journals, attendance, evaluations, and API keys.
 */

const DB_NAME = 'ClassDiaryDB';
const DB_VERSION = 1;

// Object Store names
const STORES = {
    STUDENTS: 'students',
    JOURNALS: 'journals',
    ATTENDANCE: 'attendance',
    EVALUATIONS: 'evaluations',
    FINALIZED_EVALUATIONS: 'finalized_evaluations',
    API_KEYS: 'api_keys',
    SETTINGS: 'settings'
};

/**
 * Initialize IndexedDB and create object stores
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'));
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Create object stores if they don't exist
            if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
                db.createObjectStore(STORES.STUDENTS, { keyPath: 'classId' });
            }

            if (!db.objectStoreNames.contains(STORES.JOURNALS)) {
                db.createObjectStore(STORES.JOURNALS, { keyPath: 'classId' });
            }

            if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
                db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'classId' });
            }

            if (!db.objectStoreNames.contains(STORES.EVALUATIONS)) {
                db.createObjectStore(STORES.EVALUATIONS, { keyPath: 'classId' });
            }

            if (!db.objectStoreNames.contains(STORES.FINALIZED_EVALUATIONS)) {
                db.createObjectStore(STORES.FINALIZED_EVALUATIONS, { keyPath: 'classId' });
            }

            if (!db.objectStoreNames.contains(STORES.API_KEYS)) {
                db.createObjectStore(STORES.API_KEYS, { keyPath: 'id' });
            }

            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
            }
        };
    });
};

/**
 * Generic function to get data from a store
 */
export const getData = async (storeName, key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(new Error(`Failed to get data from ${storeName}`));
        };
    });
};

/**
 * Generic function to save data to a store
 */
export const saveData = async (storeName, data) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(new Error(`Failed to save data to ${storeName}`));
        };
    });
};

/**
 * Generic function to delete data from a store
 */
export const deleteData = async (storeName, key) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            reject(new Error(`Failed to delete data from ${storeName}`));
        };
    });
};

/**
 * Get all data from a store
 */
export const getAllData = async (storeName) => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(new Error(`Failed to get all data from ${storeName}`));
        };
    });
};

// ==================== API Key Management ====================

/**
 * Save API key to IndexedDB
 * @param {string} apiKey - The Gemini API key
 */
export const saveAPIKey = async (apiKey) => {
    return saveData(STORES.API_KEYS, {
        id: 'gemini_api_key',
        key: apiKey,
        updatedAt: new Date().toISOString()
    });
};

/**
 * Get API key from IndexedDB
 * @returns {Promise<string|null>} - The API key or null if not found
 */
export const getAPIKey = async () => {
    try {
        const result = await getData(STORES.API_KEYS, 'gemini_api_key');
        return result ? result.key : null;
    } catch (error) {
        console.error('Failed to get API key:', error);
        return null;
    }
};

/**
 * Delete API key from IndexedDB
 */
export const deleteAPIKey = async () => {
    return deleteData(STORES.API_KEYS, 'gemini_api_key');
};

// ==================== Migration Functions ====================

/**
 * Migrate data from LocalStorage to IndexedDB
 * This runs once on first app load after the update
 */
export const migrateFromLocalStorage = async (classId = 'default') => {
    try {
        // Check if migration has already been done
        const migrationStatus = await getData(STORES.SETTINGS, 'migration_completed');
        if (migrationStatus?.value) {
            console.log('Migration already completed');
            return { success: true, alreadyMigrated: true };
        }

        console.log('Starting LocalStorage to IndexedDB migration...');

        // Migrate students
        const studentsKey = `class_${classId}_students`;
        const studentsData = localStorage.getItem(studentsKey);
        if (studentsData) {
            await saveData(STORES.STUDENTS, {
                classId,
                data: JSON.parse(studentsData)
            });
            console.log('✓ Migrated students');
        }

        // Migrate journals
        const journalsKey = `class_${classId}_journals`;
        const journalsData = localStorage.getItem(journalsKey);
        if (journalsData) {
            await saveData(STORES.JOURNALS, {
                classId,
                data: JSON.parse(journalsData)
            });
            console.log('✓ Migrated journals');
        }

        // Migrate attendance
        const attendanceKey = `class_${classId}_attendance`;
        const attendanceData = localStorage.getItem(attendanceKey);
        if (attendanceData) {
            await saveData(STORES.ATTENDANCE, {
                classId,
                data: JSON.parse(attendanceData)
            });
            console.log('✓ Migrated attendance');
        }

        // Migrate evaluations
        const evaluationsKey = `class_${classId}_evaluations`;
        const evaluationsData = localStorage.getItem(evaluationsKey);
        if (evaluationsData) {
            await saveData(STORES.EVALUATIONS, {
                classId,
                data: JSON.parse(evaluationsData)
            });
            console.log('✓ Migrated evaluations');
        }

        // Migrate finalized evaluations
        const finalizedKey = `class_${classId}_finalized_evaluations`;
        const finalizedData = localStorage.getItem(finalizedKey);
        if (finalizedData) {
            await saveData(STORES.FINALIZED_EVALUATIONS, {
                classId,
                data: JSON.parse(finalizedData)
            });
            console.log('✓ Migrated finalized evaluations');
        }

        // Mark migration as completed
        await saveData(STORES.SETTINGS, {
            key: 'migration_completed',
            value: true,
            completedAt: new Date().toISOString()
        });

        console.log('✅ Migration completed successfully');
        return { success: true, alreadyMigrated: false };

    } catch (error) {
        console.error('Migration failed:', error);
        return { success: false, error: error.message };
    }
};

// ==================== Data Export/Import ====================

/**
 * Export all IndexedDB data to JSON
 * @returns {Promise<object>} - All data as JSON object
 */
export const exportAllData = async () => {
    try {
        const exportData = {
            version: DB_VERSION,
            exportedAt: new Date().toISOString(),
            students: await getAllData(STORES.STUDENTS),
            journals: await getAllData(STORES.JOURNALS),
            attendance: await getAllData(STORES.ATTENDANCE),
            evaluations: await getAllData(STORES.EVALUATIONS),
            finalizedEvaluations: await getAllData(STORES.FINALIZED_EVALUATIONS),
        };

        return exportData;
    } catch (error) {
        console.error('Export failed:', error);
        throw error;
    }
};

/**
 * Import data from JSON to IndexedDB
 * @param {object} importData - Data object to import
 */
export const importAllData = async (importData) => {
    try {
        // Validate data structure
        if (!importData || typeof importData !== 'object') {
            throw new Error('Invalid import data format');
        }

        // Import students
        if (importData.students && Array.isArray(importData.students)) {
            for (const item of importData.students) {
                await saveData(STORES.STUDENTS, item);
            }
        }

        // Import journals
        if (importData.journals && Array.isArray(importData.journals)) {
            for (const item of importData.journals) {
                await saveData(STORES.JOURNALS, item);
            }
        }

        // Import attendance
        if (importData.attendance && Array.isArray(importData.attendance)) {
            for (const item of importData.attendance) {
                await saveData(STORES.ATTENDANCE, item);
            }
        }

        // Import evaluations
        if (importData.evaluations && Array.isArray(importData.evaluations)) {
            for (const item of importData.evaluations) {
                await saveData(STORES.EVALUATIONS, item);
            }
        }

        // Import finalized evaluations
        if (importData.finalizedEvaluations && Array.isArray(importData.finalizedEvaluations)) {
            for (const item of importData.finalizedEvaluations) {
                await saveData(STORES.FINALIZED_EVALUATIONS, item);
            }
        }

        console.log('✅ Import completed successfully');
        return { success: true };

    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
};

export { STORES };
