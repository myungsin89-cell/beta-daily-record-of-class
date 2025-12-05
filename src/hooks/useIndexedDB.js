import { useState, useEffect, useCallback } from 'react';
import { getData, saveData, STORES } from '../db/indexedDB';

/**
 * Custom hook for managing IndexedDB data with React state
 * Provides a similar API to useState but persists data in IndexedDB
 * 
 * @param {string} storeName - Name of the IndexedDB object store
 * @param {string} key - Key to identify the data (typically classId)
 * @param {*} initialValue - Default value if no data exists
 * @returns {[any, Function]} - [storedValue, setValue] tuple
 */
function useIndexedDB(storeName, key, initialValue) {
    const [storedValue, setStoredValue] = useState(initialValue);
    const [isLoading, setIsLoading] = useState(true);

    // Load data from IndexedDB on mount
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const result = await getData(storeName, key);

                if (result && result.data !== undefined) {
                    setStoredValue(result.data);
                } else {
                    // If no data exists, save the initial value
                    await saveData(storeName, {
                        classId: key,
                        data: initialValue
                    });
                    setStoredValue(initialValue);
                }
            } catch (error) {
                console.error(`Failed to load data from ${storeName}:`, error);
                setStoredValue(initialValue);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [storeName, key]); // Only run on mount or when key changes

    // Function to update value in both state and IndexedDB
    const setValue = useCallback(async (value) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            // Update React state
            setStoredValue(valueToStore);

            // Save to IndexedDB
            await saveData(storeName, {
                classId: key,
                data: valueToStore
            });
        } catch (error) {
            console.error(`Failed to save data to ${storeName}:`, error);
        }
    }, [storeName, key, storedValue]);

    return [storedValue, setValue, isLoading];
}

export default useIndexedDB;
