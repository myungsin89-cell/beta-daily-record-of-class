import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import Card from '../components/Card';
import Button from '../components/Button';
import { useStudentContext } from '../context/StudentContext';
import './StudentManager.css';

// localStorage key for draft data
const DRAFT_KEY = 'student_manager_draft';

const StudentManager = () => {
    const { students, addStudent, addStudents, removeStudent, isLoading } = useStudentContext();
    const [name, setName] = useState('');
    const [attendanceNumber, setAttendanceNumber] = useState('');
    const [gender, setGender] = useState('남');
    const [uploadMessage, setUploadMessage] = useState('');
    const [recentlyAddedIds, setRecentlyAddedIds] = useState([]);
    const studentListRef = React.useRef(null);

    // Load draft from localStorage on mount
    useEffect(() => {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (draft) {
            try {
                const { name: draftName, attendanceNumber: draftNum, gender: draftGender } = JSON.parse(draft);
                if (draftName) setName(draftName);
                if (draftNum) setAttendanceNumber(draftNum);
                if (draftGender) setGender(draftGender);
            } catch (error) {
                console.error('Failed to load draft:', error);
            }
        }
    }, []);

    // Auto-save draft to localStorage
    useEffect(() => {
        if (name || attendanceNumber) {
            const draft = { name, attendanceNumber, gender };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [name, attendanceNumber, gender]);

    if (isLoading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>데이터를 불러오는 중...</div>;
    }

    const handleAddStudent = (e) => {
        e.preventDefault();
        if (!name || !attendanceNumber) return;

        const newStudent = {
            id: Date.now(),
            name,
            attendanceNumber: parseInt(attendanceNumber),
            gender,
        };

        addStudent(newStudent);
        setName('');
        setAttendanceNumber('');
        setGender('남');
        setUploadMessage('');

        // Clear draft from localStorage after successful submission
        localStorage.removeItem(DRAFT_KEY);
    };

    const handleExcelUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                let successCount = 0;
                let errorCount = 0;
                const baseTime = Date.now(); // Capture timestamp once before the loop
                const validStudents = []; // Collect all valid students here

                jsonData.forEach((row, index) => {
                    try {
                        // Validate required fields
                        if (!row['이름'] || !row['출석번호'] || !row['성별']) {
                            console.error(`행 ${index + 2}: 필수 필드 누락`);
                            errorCount++;
                            return;
                        }

                        // Validate gender
                        if (row['성별'] !== '남' && row['성별'] !== '여') {
                            console.error(`행 ${index + 2}: 성별은 '남' 또는 '여'여야 합니다`);
                            errorCount++;
                            return;
                        }

                        // Validate attendance number
                        const attNum = parseInt(row['출석번호']);
                        if (isNaN(attNum) || attNum < 1) {
                            console.error(`행 ${index + 2}: 출석번호는 1 이상의 숫자여야 합니다`);
                            errorCount++;
                            return;
                        }

                        const newStudent = {
                            id: baseTime + (index * 1000), // Use base time + index * 1000 for unique IDs
                            name: row['이름'].toString().trim(),
                            attendanceNumber: attNum,
                            gender: row['성별'],
                        };

                        validStudents.push(newStudent); // Add to array instead of calling addStudent
                        successCount++;
                    } catch (error) {
                        console.error(`행 ${index + 2} 처리 중 오류:`, error);
                        errorCount++;
                    }
                });

                // Add all valid students at once
                if (validStudents.length > 0) {
                    addStudents(validStudents);

                    // Track recently added student IDs for highlighting
                    const newIds = validStudents.map(s => s.id);
                    setRecentlyAddedIds(newIds);

                    // Auto-scroll to student list
                    setTimeout(() => {
                        if (studentListRef.current) {
                            studentListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                    }, 100);

                    // Remove highlight after 3 seconds
                    setTimeout(() => {
                        setRecentlyAddedIds([]);
                    }, 3000);
                }

                setUploadMessage(`✅ ${successCount}명 추가 완료${errorCount > 0 ? `, ${errorCount}명 실패` : ''}`);

                // Auto-hide message after 5 seconds
                setTimeout(() => {
                    setUploadMessage('');
                }, 5000);

                e.target.value = ''; // Reset file input
            } catch (error) {
                console.error('엑셀 파일 처리 오류:', error);
                setUploadMessage('❌ 파일 처리 중 오류가 발생했습니다. 파일 형식을 확인해주세요.');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const downloadExampleFile = () => {
        try {
            const exampleData = [
                { '출석번호': 1, '이름': '김철수', '성별': '남' },
                { '출석번호': 2, '이름': '이영희', '성별': '여' },
                { '출석번호': 3, '이름': '박민수', '성별': '남' },
                { '출석번호': 4, '이름': '최지혜', '성별': '여' },
                { '출석번호': 5, '이름': '정우진', '성별': '남' },
            ];

            const worksheet = XLSX.utils.json_to_sheet(exampleData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, '학생명단');

            // Set column widths
            worksheet['!cols'] = [
                { wch: 10 }, // 출석번호
                { wch: 10 }, // 이름
                { wch: 8 },  // 성별
            ];

            // Generate buffer
            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

            // Create Blob
            const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

            // Create download link
            const url = window.URL.createObjectURL(data);
            const link = document.createElement('a');
            link.href = url;
            link.download = '학생_명단_예시.xlsx';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error downloading example file:', error);
            alert('예시 파일 다운로드 중 오류가 발생했습니다.');
        }
    };

    // Sort students by attendance number
    const sortedStudents = [...students].sort((a, b) => a.attendanceNumber - b.attendanceNumber);

    return (
        <>
            <div className="flex justify-between items-center mb-lg">
                <h1>학생 관리</h1>
            </div>

            {/* Excel Upload Section */}
            <Card style={{ marginBottom: '1.5rem', backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                <h3 style={{ color: '#0369a1', marginBottom: '1rem' }}>📊 엑셀 파일로 학생 일괄 등록</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <Button
                        variant="secondary"
                        onClick={downloadExampleFile}
                        style={{ marginRight: '1rem' }}
                    >
                        📥 예시 파일 다운로드
                    </Button>
                    <label className="file-upload-label">
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleExcelUpload}
                            style={{ display: 'none' }}
                        />
                        <Button variant="accent" as="span">
                            📤 엑셀 파일 업로드
                        </Button>
                    </label>
                </div>
                {uploadMessage && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '1.25rem 1.5rem',
                        backgroundColor: uploadMessage.includes('✅') ? '#d1fae5' : '#fee2e2',
                        border: `2px solid ${uploadMessage.includes('✅') ? '#10b981' : '#ef4444'}`,
                        borderRadius: '12px',
                        fontSize: '1rem',
                        color: uploadMessage.includes('✅') ? '#065f46' : '#991b1b',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        animation: 'slideDown 0.3s ease-out'
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>
                            {uploadMessage.includes('✅') ? '🎉' : '⚠️'}
                        </span>
                        <span>{uploadMessage}</span>
                    </div>
                )}
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>
                    💡 예시 파일을 다운로드하여 학생 정보를 입력한 후 업로드하세요.
                </p>
            </Card>

            {/* Manual Add Form */}
            {/* Manual Add Form */}
            <Card style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--color-text)' }}>✏️ 학생 직접 등록</h3>
                <form className="student-form-grid" onSubmit={handleAddStudent}>
                    <div className="form-group">
                        <label className="form-label">이름</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="예: 김철수"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">출석번호</label>
                        <input
                            type="number"
                            className="form-input"
                            placeholder="예: 1"
                            min="1"
                            value={attendanceNumber}
                            onChange={(e) => setAttendanceNumber(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">성별</label>
                        <div className="gender-toggle-group">
                            <button
                                type="button"
                                className={`gender-toggle-btn ${gender === '남' ? 'active male' : ''}`}
                                onClick={() => setGender('남')}
                            >
                                남
                            </button>
                            <button
                                type="button"
                                className={`gender-toggle-btn ${gender === '여' ? 'active female' : ''}`}
                                onClick={() => setGender('여')}
                            >
                                여
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ visibility: 'hidden' }}>추가</label>
                        <Button type="submit" variant="primary" style={{ width: '100%', height: '42px' }}>
                            학생 추가
                        </Button>
                    </div>
                </form>
            </Card>

            <div className="student-list" ref={studentListRef}>
                {sortedStudents.length === 0 ? (
                    <Card className="col-span-full text-center">
                        <p>등록된 학생이 없습니다. 학생을 추가해주세요.</p>
                    </Card>
                ) : (
                    sortedStudents.map((student) => (
                        <Card
                            key={student.id}
                            className="student-card-container"
                            style={{
                                border: recentlyAddedIds.includes(student.id) ? '3px solid #10b981' : undefined,
                                boxShadow: recentlyAddedIds.includes(student.id) ? '0 4px 12px rgba(16, 185, 129, 0.3)' : undefined,
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <button
                                className="student-card-delete-btn"
                                onClick={() => removeStudent(student.id)}
                                title="삭제"
                            >
                                ×
                            </button>
                            <div className="student-card-content">
                                <span className="student-card-number">{student.attendanceNumber}번</span>
                                <span className="student-card-name">{student.name}</span>
                                <span className="student-card-gender">({student.gender})</span>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </>
    );
};

export default StudentManager;
