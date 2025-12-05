import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSaveStatus } from '../context/SaveStatusContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const defaultMenuItems = [
        { id: 'diary', to: '/', label: '다이어리' },
        { id: 'notepad', to: '/notepad', label: '메모장' },
        { id: 'attendance', to: '/attendance', label: '출석 체크' },
        { id: 'journal', to: '/journal-entry', label: '학생 기록' },
        { id: 'grades', to: '/grades', label: '학생 성적' },
        { id: 'assignments', to: '/assignments', label: '과제 관리' },
        { id: 'budget', to: '/budget', label: '예산관리' },
    ];

    const [menuItems, setMenuItems] = useState(() => {
        const saved = localStorage.getItem('menuOrder');
        if (saved) {
            const savedItems = JSON.parse(saved);
            // 새로운 메뉴 항목이 있으면 추가
            const newItems = defaultMenuItems.filter(
                defaultItem => !savedItems.some(savedItem => savedItem.id === defaultItem.id)
            );
            if (newItems.length > 0) {
                return [...savedItems, ...newItems];
            }
            return savedItems;
        }
        return defaultMenuItems;
    });

    const [draggedItem, setDraggedItem] = useState(null);
    const mainNavRef = useRef(null);
    const location = useLocation();
    const { getTimeText, isSaving, lastSaved } = useSaveStatus();

    useEffect(() => {
        localStorage.setItem('menuOrder', JSON.stringify(menuItems));
    }, [menuItems]);

    // Keep main-nav scroll at top when route changes
    useEffect(() => {
        if (mainNavRef.current) {
            mainNavRef.current.scrollTop = 0;
        }
    }, [location.pathname]);

    const handleDragStart = (e, index) => {
        setDraggedItem(index);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;

        const newItems = [...menuItems];
        const draggedItemContent = newItems[draggedItem];
        newItems.splice(draggedItem, 1);
        newItems.splice(index, 0, draggedItemContent);

        setDraggedItem(index);
        setMenuItems(newItems);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="logo">
                <div className="logo-content">
                    <span>🌿</span> 학급 일지
                </div>
                <button className="close-sidebar-btn" onClick={onClose}>×</button>
            </div>



            <nav className="nav-links">
                {/* Fixed Top Section - Student Management */}
                <div className="top-nav">
                    <NavLink to="/students" className={({ isActive }) => `nav-item fixed-item ${isActive ? 'active' : ''}`}>
                        👥 학생 관리
                    </NavLink>
                </div>

                {/* Separator */}
                <div className="nav-separator"></div>

                {/* Draggable Main Navigation */}
                <div className="main-nav" ref={mainNavRef}>
                    {menuItems.map((item, index) => (
                        <NavLink
                            key={item.id}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                        >
                            <span className="drag-handle">⋮⋮</span>
                            <span className="nav-item-label">{item.label}</span>
                        </NavLink>
                    ))}
                </div>

                {/* Bottom Section - Settings */}
                <div className="bottom-nav">
                    <NavLink to="/settings" className={({ isActive }) => `nav-item settings-item ${isActive ? 'active' : ''}`}>
                        ⚙️ 설정
                    </NavLink>
                    <div className="creator-signature">
                        Made by 초록덕후
                    </div>
                </div>
            </nav>
        </aside>
    );
};

export default Sidebar;
