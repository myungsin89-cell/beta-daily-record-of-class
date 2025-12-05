import React, { useState, useEffect } from 'react';
import './UpdatePrompt.css';

const UpdatePrompt = () => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [registration, setRegistration] = useState(null);

    useEffect(() => {
        const handleSWWaiting = (event) => {
            console.log('[UpdatePrompt] Service worker waiting detected');
            setRegistration(event.detail.registration);
            setShowPrompt(true);
        };

        window.addEventListener('swWaiting', handleSWWaiting);

        return () => {
            window.removeEventListener('swWaiting', handleSWWaiting);
        };
    }, []);

    const handleUpdate = () => {
        if (registration && registration.waiting) {
            // Send message to waiting service worker to skip waiting
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="update-prompt-overlay">
            <div className="update-prompt">
                <div className="update-prompt-icon">🔄</div>
                <div className="update-prompt-content">
                    <h3>새 버전이 있습니다!</h3>
                    <p>앱을 업데이트하여 최신 기능을 사용하세요.</p>
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
