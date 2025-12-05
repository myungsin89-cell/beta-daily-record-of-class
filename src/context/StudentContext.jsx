import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useClass } from './ClassContext';
import { useAuth } from './AuthContext';
import useIndexedDB from '../hooks/useIndexedDB';
import { STORES } from '../db/indexedDB';

const StudentContext = createContext();

// Define initial values outside component to avoid recreating on each render
const INITIAL_ARRAY = [];
const INITIAL_OBJECT = {};

export const useStudentContext = () => useContext(StudentContext); // eslint-disable-line react-refresh/only-export-components

export const StudentProvider = ({ children }) => {
    const { currentClass } = useClass();
    const { user } = useAuth();
    const classId = currentClass?.id || 'default';
    const dataKey = user ? `${user.username}_${classId}` : classId;

    const [students, setStudents, isLoadingStudents] = useIndexedDB(STORES.STUDENTS, dataKey, INITIAL_ARRAY);
    const [attendance, setAttendance, isLoadingAttendance] = useIndexedDB(STORES.ATTENDANCE, dataKey, INITIAL_OBJECT);
    const [journals, setJournals, isLoadingJournals] = useIndexedDB(STORES.JOURNALS, dataKey, INITIAL_OBJECT);
    const [evaluations, setEvaluations, isLoadingEvaluations] = useIndexedDB(STORES.EVALUATIONS, dataKey, INITIAL_OBJECT);
    const [finalizedEvaluations, setFinalizedEvaluations, isLoadingFinalized] = useIndexedDB(STORES.FINALIZED_EVALUATIONS, dataKey, INITIAL_OBJECT);

    const isLoading = isLoadingStudents || isLoadingAttendance || isLoadingJournals || isLoadingEvaluations || isLoadingFinalized;

    const addStudent = (student) => {
        setStudents([...students, student]);
    };

    const addStudents = (newStudents) => {
        setStudents([...students, ...newStudents]);
    };

    const removeStudent = (id) => {
        setStudents(students.filter((s) => s.id !== id));
        // Optional: Cleanup attendance and journals for removed student
    };

    const updateAttendance = (date, studentId, status) => {
        setAttendance((prev) => {
            const newAttendance = { ...prev };

            // If status is null, remove the student's attendance for that date
            if (status === null) {
                if (newAttendance[date]) {
                    const updatedDate = { ...newAttendance[date] };
                    delete updatedDate[studentId];

                    // If no students left for this date, remove the date entry
                    if (Object.keys(updatedDate).length === 0) {
                        delete newAttendance[date];
                    } else {
                        newAttendance[date] = updatedDate;
                    }
                }
            } else {
                // Set or update the status
                newAttendance[date] = {
                    ...newAttendance[date],
                    [studentId]: status,
                };
            }

            return newAttendance;
        });
    };

    const addJournalEntry = (studentId, entry) => {
        setJournals((prev) => ({
            ...prev,
            [studentId]: [...(prev[studentId] || []), entry],
        }));
    };

    const saveEvaluation = (studentId, evaluation) => {
        setEvaluations((prev) => ({
            ...prev,
            [studentId]: evaluation,
        }));
    };

    const saveFinalizedEvaluation = (studentId, evaluation) => {
        setFinalizedEvaluations((prev) => ({
            ...prev,
            [studentId]: evaluation,
        }));
    };

    return (
        <StudentContext.Provider
            value={{
                students,
                addStudent,
                addStudents,
                removeStudent,
                attendance,
                updateAttendance,
                journals,
                addJournalEntry,
                evaluations,
                saveEvaluation,
                finalizedEvaluations,
                saveFinalizedEvaluation,
                isLoading,
            }}
        >
            {children}
        </StudentContext.Provider>
    );
};

