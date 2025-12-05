import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import Sidebar from './Sidebar';
import InstallBanner from './InstallBanner';
import './Layout.css';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

const Layout = () => {
    const { user, logout } = useAuth();
    const { currentClass, clearCurrentClass } = useClass();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const { getTimeText, isSaving, lastSaved } = useSaveStatus();
    const { isInstallable, promptInstall } = useInstallPrompt();

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

                        {/* Global Save Status Indicator */}
                        <div className="header-save-status">
                            <span className={`status-icon ${isSaving ? 'saving' : lastSaved ? 'saved' : 'waiting'}`}>
                                {isSaving ? '⏳' : lastSaved ? '✓' : '○'}
                            </span>
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

