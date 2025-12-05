import React, { useState, useEffect, useRef } from 'react';
import './UpdatePrompt.css';
import { getLatestUpdate } from '../data/changelog';

const UpdatePrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const hasShownPrompt = useRef(false);

    useEffect(() => {
        const handleSWWaiting = (event) => {
            console.log('[UpdatePrompt] Service worker waiting detected');

            // Check if user dismissed recently (within 24 hours)
            const dismissedUntil = localStorage.getItem('update-prompt-dismissed-until');
            if (dismissedUntil) {
                const dismissTime = new Date(dismissedUntil);
                if (new Date() < dismissTime) {
                    console.log('[UpdatePrompt] User dismissed recently, not showing');
                    return;
                }
            }

            // Prevent duplicate prompts in the same session
            if (hasShownPrompt.current) {
                console.log('[UpdatePrompt] Prompt already shown in this session');
                return;
            }

            hasShownPrompt.current = true;
            setShowPrompt(true);
        };

        window.addEventListener('swWaiting', handleSWWaiting);

        return () => {
            window.removeEventListener('swWaiting', handleSWWaiting);
        };
    }, []);

    const handleUpdate = () => {
        console.log('[UpdatePrompt] User clicked update');

        // Use the global updateSW function from Vite PWA
        if (window.updateServiceWorker) {
            window.updateServiceWorker(true);
        }

        // Clear dismiss flag when user actively updates
        localStorage.removeItem('update-prompt-dismissed-until');
        setShowPrompt(false);
        hasShownPrompt.current = false;
    };

    const handleDismiss = () => {
        // Set dismiss flag for 24 hours
        const dismissUntil = new Date();
        dismissUntil.setHours(dismissUntil.getHours() + 24);
        localStorage.setItem('update-prompt-dismissed-until', dismissUntil.toISOString());

        console.log('[UpdatePrompt] User dismissed, will not show until:', dismissUntil);
        setShowPrompt(false);
    };

    const toggleChangelog = () => {
        setShowChangelog(!showChangelog);
    };

    if (!showPrompt) return null;

    const latestUpdate = getLatestUpdate();

    return (
        <div className="update-prompt-overlay">
            <div className={`update-prompt ${showChangelog ? 'expanded' : ''}`}>
                <div className="update-prompt-icon">🔄</div>
                <div className="update-prompt-content">
                    <h3>새 버전이 있습니다!</h3>
                    <p>앱을 업데이트하여 최신 기능을 사용하세요.</p>

                    <button className="changelog-toggle" onClick={toggleChangelog}>
                        {showChangelog ? '△ 간단히 보기' : '▽ 상세내역 확인하기'}
                    </button>

                    {showChangelog && latestUpdate && (
                        <div className="changelog-details">
                            <div className="changelog-header">
                                <h4>{latestUpdate.title}</h4>
                                <span className="changelog-date">{latestUpdate.date}</span>
                            </div>
                            {latestUpdate.changes.map((section, idx) => (
                                <div key={idx} className="changelog-section">
                                    <h5>{section.category}</h5>
                                    <ul>
                                        {section.items.map((item, itemIdx) => (
                                            <li key={itemIdx}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="update-prompt-actions">
                    <button className="update-btn" onClick={handleUpdate}>
                        업데이트
                    </button>
                    <button className="dismiss-btn" onClick={handleDismiss}>
                        나중에
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdatePrompt;
