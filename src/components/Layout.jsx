import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import Sidebar from './Sidebar';
import InstallBanner from './InstallBanner';
import './Layout.css';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

import { useUpdate } from '../context/UpdateContext';

const Layout = () => {
    const { user, logout } = useAuth();
    const { currentClass, clearCurrentClass } = useClass();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const { getTimeText, isSaving, lastSaved } = useSaveStatus();
    const { isInstallable, promptInstall } = useInstallPrompt();
    const { needRefresh } = useUpdate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleChangeClass = () => {
        clearCurrentClass();
        navigate('/select-class');
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        setIsSidebarOpen(false);
    };

    return (
        <div className="layout">
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div className="mobile-sidebar-overlay" onClick={closeSidebar}></div>
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

            <main className="main-content">
                <div className="main-header">
                    <div className="header-left">
                        <button className="hamburger-btn" onClick={toggleSidebar}>
                            ☰
                        </button>
                        <div className="class-info">
                            <h2>{currentClass?.name}</h2>
                            <p>{currentClass?.year}년</p>
                        </div>

                        {needRefresh && (
                            <div className="update-notification" style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', backgroundColor: '#eff6ff', padding: '0.25rem 0.75rem', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                                <span style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: '500' }}>
                                    🔔 업데이트가 준비되었습니다. 설정에서 업데이트 하세요.
                                </span>
                            </div>
                        )}

                        {/* Global Save Status Indicator */}
                        <div className="header-save-status">
                            <span className="status-text">{getTimeText()}</span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button onClick={handleChangeClass} className="change-class-btn">
                            학급 변경
                        </button>
                        <button onClick={handleLogout} className="logout-btn-header">
                            로그아웃
                        </button>
                    </div>
                </div>
                <div className="page-content">
                    <Outlet />
                </div>
            </main>

            {/* PWA Install Banner */}
            <InstallBanner isInstallable={isInstallable} onInstall={promptInstall} />
        </div>
    );
};

export default Layout;

