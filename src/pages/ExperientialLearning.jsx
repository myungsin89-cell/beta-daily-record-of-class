import React, { useState, useMemo } from 'react';
import { useStudentContext } from '../context/StudentContext';
import { useClass } from '../context/ClassContext';
import { groupConsecutiveDates, formatDateKorean, calculateSchoolDays } from '../utils/dateUtils';
import * as XLSX from 'xlsx';
import './ExperientialLearning.css';

const ExperientialLearning = () => {
    const { students, attendance, fieldTrips, saveFieldTripMetadata, updateAttendance, holidays } = useStudentContext();
    const { currentClass } = useClass();
    const [sortConfig, setSortConfig] = useState({ key: 'application', direction: 'asc' });
    const [isEditMode, setIsEditMode] = useState(false);

    // Process data to find field trips
    const tripData = useMemo(() => {
        const trips = [];

        students.forEach(student => {
            // 1. Find all dates marked as 'fieldtrip' for this student
            const studentFieldTripDates = [];

            Object.keys(attendance).forEach(date => {
                const status = typeof attendance[date][student.id] === 'object'
                    ? attendance[date][student.id].status
                    : attendance[date][student.id];

                if (status === 'fieldtrip') {
                    studentFieldTripDates.push(date);
                }
            });

            // 2. Group consecutive dates (considering weekends and holidays)
            if (studentFieldTripDates.length > 0) {
                const groupedTrips = groupConsecutiveDates(studentFieldTripDates, holidays);

                // 3. Merge with metadata
                groupedTrips.forEach(group => {
                    // Create a unique key for this trip
                    const tripId = `${student.id}_${group.startDate}_${group.endDate}`;
                    const metadata = fieldTrips[student.id]?.[tripId] || {};

                    // Calculate school days
                    const schoolDays = calculateSchoolDays(group.startDate, group.endDate, holidays);

                    // Format dates in Korean
                    const startFormatted = formatDateKorean(group.startDate);
                    const endFormatted = formatDateKorean(group.endDate);

                    // Generate affiliation (Grade-Class-Number)
                    let grade = '?';
                    let classNumber = '?';

                    if (currentClass) {
                        // First try to get from properties
                        grade = currentClass.grade || '?';
                        classNumber = currentClass.classNumber || '?';

                        // If not available, extract from name (e.g., "3학년 2반")
                        if ((grade === '?' || classNumber === '?') && currentClass.name) {
                            const nameMatch = currentClass.name.match(/(\d+)학년\s*(\d+)반/);
                            if (nameMatch) {
                                grade = nameMatch[1];
                                classNumber = nameMatch[2];
                            }
                        }
                    }
                    const affiliation = `${grade}-${classNumber}-${student.attendanceNumber}`;

                    trips.push({
                        id: tripId,
                        studentId: student.id,
                        studentName: student.name,
                        attendanceNumber: student.attendanceNumber,
                        affiliation: affiliation,
                        startDate: group.startDate,
                        endDate: group.endDate,
                        allDates: group.allDates,
                        startFormatted,
                        endFormatted,
                        dateRange: `${startFormatted} ~ ${endFormatted}`,
                        schoolDays: schoolDays,
                        applicationDate: metadata.applicationDate || group.startDate,
                        activityName: metadata.activityName || '교외체험학습',
                        location: metadata.location || '',
                        content: metadata.content || '가족동반여행',
                        isSubmitted: metadata.isSubmitted || false
                    });
                });
            }
        });

        // Sort trips
        return trips.sort((a, b) => {
            if (sortConfig.key === 'application') {
                return sortConfig.direction === 'asc'
                    ? a.applicationDate.localeCompare(b.applicationDate)
                    : b.applicationDate.localeCompare(a.applicationDate);
            }
            if (sortConfig.key === 'student') {
                return sortConfig.direction === 'asc'
                    ? a.attendanceNumber - b.attendanceNumber
                    : b.attendanceNumber - a.attendanceNumber;
            }
            return 0;
        });
    }, [students, attendance, fieldTrips, holidays, currentClass, sortConfig]);

    const handleMetadataChange = (tripId, studentId, field, value) => {
        const studentTrips = fieldTrips[studentId] || {};

        const updatedMetadata = {
            ...studentTrips,
            [tripId]: {
                ...(studentTrips[tripId] || {}),
                [field]: value
            }
        };

        saveFieldTripMetadata(studentId, updatedMetadata);
    };

    const handleDeleteTrip = (trip) => {
        const confirmMessage = `${trip.studentName}의 체험학습 (${trip.dateRange})을 삭제하시겠습니까?\n\n출석 체크에서도 모두 제거됩니다.`;

        if (!window.confirm(confirmMessage)) {
            return;
        }

        // 1. Delete attendance records for all dates
        trip.allDates.forEach(date => {
            updateAttendance(date, trip.studentId, null);
        });

        // 2. Delete field trip metadata
        const studentTrips = fieldTrips[trip.studentId] || {};
        const updatedMetadata = { ...studentTrips };
        delete updatedMetadata[trip.id];

        saveFieldTripMetadata(trip.studentId, updatedMetadata);
    };

    const handleExport = () => {
        const exportData = tripData.map((trip, index) => ({
            '순': index + 1,
            '소속': trip.affiliation,
            '이름': trip.studentName,
            '시작일': trip.startFormatted,
            '종료일': trip.endFormatted,
            '교육과정일수': trip.schoolDays,
            '체험활동명': trip.activityName,
            '장소(기관)': trip.location,
            '활동내용': trip.content,
            '서류완결확인': trip.isSubmitted ? 'O' : 'X'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "체험학습대장");

        XLSX.writeFile(wb, `체험학습대장_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="experiential-learning-container">
            <div className="header-section">
                <h1>🚌 체험학습 관리</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        className={`edit-mode-btn ${isEditMode ? 'active' : ''}`}
                        onClick={() => setIsEditMode(!isEditMode)}
                    >
                        {isEditMode ? '✓ 완료' : '✏️ 편집'}
                    </button>
                    <button className="export-btn" onClick={handleExport}>
                        📥 엑셀 다운로드
                    </button>
                </div>
            </div>

            <div className="info-note">
                <p>💡 <strong>교육과정일수</strong>: 주말과 공휴일을 제외한 실제 수업일수입니다.</p>
                <p>📅 공휴일 관리는 <strong>설정</strong> 메뉴에서 할 수 있습니다.</p>
            </div>

            <div className="table-container">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th width="60">순</th>
                            <th width="100">소속</th>
                            <th width="100">이름</th>
                            <th width="120">시작일</th>
                            <th width="120">종료일</th>
                            <th width="100">교육과정일수</th>
                            <th width="150">체험활동명</th>
                            <th width="150">장소(기관)</th>
                            <th>활동내용</th>
                            <th width="80">서류완결</th>
                            {isEditMode && <th width="80">삭제</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {tripData.map((trip, index) => (
                            <tr key={trip.id}>
                                <td className="text-center">{index + 1}</td>
                                <td className="text-center">{trip.affiliation}</td>
                                <td>{trip.studentName}</td>
                                <td className="text-center">{trip.startFormatted}</td>
                                <td className="text-center">{trip.endFormatted}</td>
                                <td className="text-center"><strong>{trip.schoolDays}일</strong></td>
                                <td>
                                    <input
                                        type="text"
                                        className="cell-input"
                                        value={trip.activityName}
                                        onChange={(e) => handleMetadataChange(trip.id, trip.studentId, 'activityName', e.target.value)}
                                        placeholder="교외체험학습"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="cell-input"
                                        value={trip.location}
                                        onChange={(e) => handleMetadataChange(trip.id, trip.studentId, 'location', e.target.value)}
                                        placeholder="장소 입력"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="text"
                                        className="cell-input"
                                        value={trip.content}
                                        onChange={(e) => handleMetadataChange(trip.id, trip.studentId, 'content', e.target.value)}
                                        placeholder="가족동반여행"
                                    />
                                </td>
                                <td className="text-center">
                                    <input
                                        type="checkbox"
                                        checked={trip.isSubmitted}
                                        onChange={(e) => handleMetadataChange(trip.id, trip.studentId, 'isSubmitted', e.target.checked)}
                                    />
                                </td>
                                {isEditMode && (
                                    <td className="text-center">
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteTrip(trip)}
                                            title="삭제"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ExperientialLearning;
