import React, { useState, useEffect } from 'react';
import './InstallBanner.css';

const InstallBanner = ({ isInstallable, onInstall }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if already installed (running as PWA)
        const isRunningAsPWA = window.matchMedia('(display-mode: standalone)').matches ||
                               window.navigator.standalone === true;

        // Check if user dismissed the banner before
        const dismissedBefore = localStorage.getItem('pwa-banner-dismissed') === 'true';

        // Show banner if: not running as PWA and not dismissed
        // We show it even if not installable yet (for testing and visibility)
        setIsVisible(!isRunningAsPWA && !dismissedBefore);
        setIsDismissed(dismissedBefore);
    }, [isInstallable]);

    const handleDismiss = () => {
        localStorage.setItem('pwa-banner-dismissed', 'true');
        setIsVisible(false);
        setIsDismissed(true);
    };

    const handleInstall = async () => {
        await onInstall();
        // 설치가 완료되면 배너를 숨김
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="install-banner">
            <div className="install-banner-content">
                <div className="install-banner-icon">📱</div>
                <div className="install-banner-text">
                    <h3>앱으로 설치하기</h3>
                    <p>홈 화면에 추가하고 오프라인에서도 사용하세요!</p>
                </div>
                <div className="install-banner-actions">
                    <button className="install-banner-btn-install" onClick={handleInstall}>
                        ⬇️ 설치
                    </button>
                    <button className="install-banner-btn-close" onClick={handleDismiss} title="닫기">
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InstallBanner;
