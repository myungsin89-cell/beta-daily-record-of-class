import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ClassContext = createContext();

export const useClass = () => {
    const context = useContext(ClassContext);
    if (!context) {
        throw new Error('useClass must be used within a ClassProvider');
    }
    return context;
};

export const ClassProvider = ({ children }) => {
    const { user } = useAuth();
    const [currentClass, setCurrentClass] = useState(null);
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        if (user) {
            // 사용자별 학급 목록 로드
            const classesKey = `${user.username}_classes`;
            const savedClasses = localStorage.getItem(classesKey);
            if (savedClasses) {
                setClasses(JSON.parse(savedClasses));
            }

            // 현재 선택된 학급 로드
            const savedCurrentClass = localStorage.getItem('currentClass');
            if (savedCurrentClass) {
                setCurrentClass(JSON.parse(savedCurrentClass));
            }
        } else {
            setClasses([]);
            setCurrentClass(null);
        }
    }, [user]);

    const createClass = (classData) => {
        const newClass = {
            id: Date.now().toString(),
            ...classData,
            createdAt: new Date().toISOString()
        };

        const updatedClasses = [...classes, newClass];
        const classesKey = `${user.username}_classes`;

        localStorage.setItem(classesKey, JSON.stringify(updatedClasses));
        setClasses(updatedClasses);

        return newClass;
    };

    const selectClass = (classData) => {
        localStorage.setItem('currentClass', JSON.stringify(classData));
        setCurrentClass(classData);
    };

    const deleteClass = (classId) => {
        const updatedClasses = classes.filter(c => c.id !== classId);
        const classesKey = `${user.username}_classes`;

        localStorage.setItem(classesKey, JSON.stringify(updatedClasses));
        setClasses(updatedClasses);

        // 현재 선택된 학급이 삭제되는 경우
        if (currentClass?.id === classId) {
            localStorage.removeItem('currentClass');
            setCurrentClass(null);
        }
    };

    const clearCurrentClass = () => {
        localStorage.removeItem('currentClass');
        setCurrentClass(null);
    };

    const value = {
        currentClass,
        classes,
        createClass,
        selectClass,
        deleteClass,
        clearCurrentClass
    };

    return <ClassContext.Provider value={value}>{children}</ClassContext.Provider>;
};
