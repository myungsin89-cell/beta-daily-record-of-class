import React, { createContext, useContext, useState, useEffect } from 'react';
import { useClass } from './ClassContext';
import useIndexedDB from '../hooks/useIndexedDB';
import { STORES } from '../db/indexedDB';

const StudentContext = createContext();

export const useStudentContext = () => useContext(StudentContext); // eslint-disable-line react-refresh/only-export-components

export const StudentProvider = ({ children }) => {
    const { currentClass } = useClass();
    const classId = currentClass?.id || 'default';

    const [students, setStudents] = useIndexedDB(STORES.STUDENTS, classId, []);
    const [attendance, setAttendance] = useIndexedDB(STORES.ATTENDANCE, classId, {});
    const [journals, setJournals] = useIndexedDB(STORES.JOURNALS, classId, {});
    const [evaluations, setEvaluations] = useIndexedDB(STORES.EVALUATIONS, classId, {});
    const [finalizedEvaluations, setFinalizedEvaluations] = useIndexedDB(STORES.FINALIZED_EVALUATIONS, classId, {});

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
            }}
        >
            {children}
        </StudentContext.Provider>
    );
};

