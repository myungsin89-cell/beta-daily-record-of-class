import React, { useState, useEffect } from 'react';
import { useStudentContext } from '../context/StudentContext';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import './AssignmentManager.css';

import { useSaveStatus } from '../context/SaveStatusContext';

const AssignmentManager = () => {
    const { currentClass } = useClass();
    const { user } = useAuth();
    const rawClassId = currentClass?.id || 'default';
    const classId = user ? `${user.username}_${rawClassId}` : rawClassId;
    const { students } = useStudentContext();
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
    const [newAssignmentTitle, setNewAssignmentTitle] = useState('');
    const { updateSaveStatus } = useSaveStatus();
    const [isLoaded, setIsLoaded] = useState(false);

    // Load assignments from localStorage when class changes
    useEffect(() => {
        const assignmentsKey = `assignments_${classId}`;
        const savedAssignments = localStorage.getItem(assignmentsKey);
        if (savedAssignments) {
            setAssignments(JSON.parse(savedAssignments));
        } else {
            setAssignments([]);
        }
        setIsLoaded(true);
    }, [classId]);

    // Save assignments to localStorage
    useEffect(() => {
        if (!isLoaded) return;

        const assignmentsKey = `assignments_${classId}`;
        if (assignments.length > 0) {
            localStorage.setItem(assignmentsKey, JSON.stringify(assignments));
        } else {
            localStorage.setItem(assignmentsKey, JSON.stringify([]));
        }
        updateSaveStatus();
    }, [assignments, updateSaveStatus, isLoaded, classId]);

    const handleAddAssignment = () => {
        if (!newAssignmentTitle.trim()) {
            alert('과제명을 입력해주세요.');
            return;
        }

        const newAssignment = {
            id: Date.now().toString(),
            title: newAssignmentTitle.trim(),
            date: new Date().toISOString(),
            submissions: {} // { studentId: { status: 'completed' | 'incomplete', note: '' } }
        };

        // Initialize submissions for all current students
        if (students) {
            students.forEach(student => {
                newAssignment.submissions[student.id] = {
                    status: 'incomplete',
                    note: ''
                };
            });
        }

        setAssignments([newAssignment, ...assignments]);
        setNewAssignmentTitle('');
        setSelectedAssignmentId(newAssignment.id);
    };

    const handleDeleteAssignment = (id) => {
        if (window.confirm('이 과제를 삭제하시겠습니까?')) {
            const updatedAssignments = assignments.filter(a => a.id !== id);
            setAssignments(updatedAssignments);
            if (selectedAssignmentId === id) {
                setSelectedAssignmentId(null);
            }
        }
    };

    const toggleSubmission = (assignmentId, studentId) => {
        setAssignments(assignments.map(assignment => {
            if (assignment.id === assignmentId) {
                const currentStatus = assignment.submissions[studentId]?.status || 'incomplete';
                const newStatus = currentStatus === 'completed' ? 'incomplete' : 'completed';

                return {
                    ...assignment,
                    submissions: {
                        ...assignment.submissions,
                        [studentId]: {
                            ...assignment.submissions[studentId],
                            status: newStatus
                        }
                    }
                };
            }
            return assignment;
        }));
    };

    const updateNote = (assignmentId, studentId, note) => {
        setAssignments(assignments.map(assignment => {
            if (assignment.id === assignmentId) {
                return {
                    ...assignment,
                    submissions: {
                        ...assignment.submissions,
                        [studentId]: {
                            ...assignment.submissions[studentId],
                            note: note
                        }
                    }
                };
            }
            return assignment;
        }));
    };

    const selectedAssignment = assignments.find(a => a.id === selectedAssignmentId);

    // Calculate stats
    const getStats = (assignment) => {
        const total = students ? students.length : 0;
        if (total === 0) return { completed: 0, rate: 0 };

        const completed = Object.values(assignment.submissions).filter(s => s.status === 'completed').length;
        return {
            completed,
            rate: Math.round((completed / total) * 100)
        };
    };

    return (
        <div className="assignment-container">
            <h1>📝 과제 관리</h1>

            <div className="assignment-layout">
                {/* Left Sidebar: Assignment List */}
                <div className="assignment-sidebar">
                    <div className="add-assignment-box">
                        <input
                            type="text"
                            placeholder="새 과제명 입력"
                            value={newAssignmentTitle}
                            onChange={(e) => setNewAssignmentTitle(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddAssignment()}
                        />
                        <Button onClick={handleAddAssignment}>추가</Button>
                    </div>

                    <div className="assignment-list">
                        {assignments.map(assignment => (
                            <div
                                key={assignment.id}
                                className={`assignment-item ${selectedAssignmentId === assignment.id ? 'active' : ''}`}
                                onClick={() => setSelectedAssignmentId(assignment.id)}
                            >
                                <div className="assignment-info">
                                    <span className="assignment-title">{assignment.title}</span>
                                    <span className="assignment-date">
                                        {new Date(assignment.date).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    className="delete-btn-mini"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAssignment(assignment.id);
                                    }}
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content: Student List */}
                <div className="assignment-content">
                    {selectedAssignment ? (
                        <>
                            <div className="assignment-header">
                                <h2>{selectedAssignment.title}</h2>
                                <div className="progress-bar-container">
                                    <div className="progress-text">
                                        제출 현황: {getStats(selectedAssignment).completed} / {students ? students.length : 0}
                                        ({getStats(selectedAssignment).rate}%)
                                    </div>
                                    <div className="progress-track">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${getStats(selectedAssignment).rate}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            <div className="student-grid">
                                {students && students.map(student => {
                                    const submission = selectedAssignment.submissions[student.id] || { status: 'incomplete', note: '' };
                                    const isCompleted = submission.status === 'completed';

                                    return (
                                        <div
                                            key={student.id}
                                            className={`student-card ${isCompleted ? 'completed' : 'incomplete'}`}
                                        >
                                            <div
                                                className="student-main"
                                                onClick={() => toggleSubmission(selectedAssignment.id, student.id)}
                                            >
                                                <div className="student-info">
                                                    <span className="student-number">{student.attendanceNumber}번</span>
                                                    <span className="student-name">{student.name}</span>
                                                </div>
                                                <span className="assignment-status-wrapper">
                                                    {isCompleted ? (
                                                        <span className="status-label completed">
                                                            <span className="status-emoji">✅</span>
                                                            <span className="status-text">제출완료</span>
                                                        </span>
                                                    ) : (
                                                        <span className="status-label incomplete">
                                                            <span className="status-emoji">❌</span>
                                                            <span className="status-text">미제출</span>
                                                        </span>
                                                    )}
                                                </span>
                                            </div>

                                            {!isCompleted && (
                                                <div className="note-input-container">
                                                    <input
                                                        type="text"
                                                        placeholder="미제출 사유 입력"
                                                        value={submission.note || ''}
                                                        onChange={(e) => updateNote(selectedAssignment.id, student.id, e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <p>왼쪽에서 과제를 선택하거나 새로운 과제를 추가해주세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AssignmentManager;
