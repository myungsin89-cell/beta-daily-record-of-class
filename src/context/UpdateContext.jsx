import { createContext, useContext, useState, useEffect } from 'react';

import { registerSW } from 'virtual:pwa-register';

const UpdateContext = createContext();

export const useUpdate = () => useContext(UpdateContext);

export const UpdateProvider = ({ children }) => {
    const [needRefresh, setNeedRefresh] = useState(false);
    const [updateServiceWorkerFn, setUpdateServiceWorkerFn] = useState(null);

    useEffect(() => {
        const updateSW = registerSW({
            onNeedRefresh() {
                console.log('[UpdateContext] New content available, update needed.');
                setNeedRefresh(true);
            },
            onOfflineReady() {
                console.log('[UpdateContext] App ready to work offline');
            },
        });

        setUpdateServiceWorkerFn(() => updateSW);
    }, []);

    const updateServiceWorker = () => {
        if (updateServiceWorkerFn) {
            updateServiceWorkerFn(true);
        }
    };

    return (
        <UpdateContext.Provider value={{ needRefresh, updateServiceWorker }}>
            {children}
        </UpdateContext.Provider>
    );
};
