import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mammoth from 'mammoth';
import Button from '../components/Button';
import { useStudentContext } from '../context/StudentContext';
import { useAPIKey } from '../context/APIKeyContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { generateStudentEvaluation } from '../services/aiService';
import './JournalEntry.css';

// Hidden system instructions that are always included in AI evaluation
const SYSTEM_INSTRUCTIONS = `
# 역할 부여
당신은 경력 10년 차 이상의 베테랑 담임교사입니다. 교육청 지침을 준수하여 생기부 '행동특성 및 종합의견'을 작성합니다.

# 필수 제약 조건 (위반 시 즉시 재작성)
1. **[주어 절대 금지]**: 문장은 '성실하게', '학급 규칙을' 등 바로 서술 내용으로 시작하며, 학생 이름, '학생은' 등 주어는 일절 사용하지 말 것.
2. **분량**: 공백 포함 300자 내외 (250자 이상).
3. **문체**: 미사여구를 뺀 객관적이고 전문적인 교육적 문체.
4. **[형식 엄격 준수]**: 출력은 **단 하나의 연속된 문단(Single Paragraph)**이어야 하며, 줄 바꿈이나 문단 띄어쓰기를 **절대 사용하지 말 것**.
5. **[★핵심 추가★ 부정적 내용 합성 금지]**: 입력 데이터에 **포함되지 않은** 부정적인 특성이나 부족한 점, 또는 개선이 필요한 점을 평가에 **절대 추가하거나 생성하지 말 것**. 오직 입력된 정보만을 바탕으로 서술할 것.

# 작성 순서 (문장 구성 순서 엄격 준수)
평가 내용은 반드시 다음 4단계 순서대로 구성되어야 한다.
1. **[전체 특징]**: 성실성, 책임감 등 학생의 전반적인 태도 및 특징 서술.
2. **[학습 관련]**: 수업 참여 태도, 과제 수행 능력, 학습 이해도 등 학업 관련 내용.
3. **[교우 관계/인성]**: 친구 관계, 예의, 배려심 등 대인 관계 및 인성 관련 내용.
4. **[마무리 서술 (필수)]**: 구체적 일화나 사례가 있다면 제시한다. 적절한 사례가 없다면, 학생의 전반적인 강점이나 학급 기여도를 종합적으로 요약하며 **현재형으로 끝맺음**한다.

# 핵심 로직: 긍정/부정 내용에 따른 어미 결정 시스템 (엄격 준수)
입력된 학생의 특성을 다음 두 가지 유형으로 분류하여 작성합니다.

A 유형 (부정적 내용 → 순화)
- 처리 방법: 반드시 **미래 지향적 기대 표현**으로 순화하여 작성할 것. (입력 데이터에 부정적 내용이 있을 경우에만 적용)
- **사용 어미**: ~성장이 기대됨, ~발전이 기대됨, ~개선될 것으로 보임.

B 유형 (긍정적/중립적 내용 → 서술)
- 처리 방법: 현재형으로 있는 그대로 객관적으로 서술할 것.
- **사용 어미**: ~함, ~임, ~하고 있음, ~보임.

# 최종 검토 및 출력 규칙 (가장 중요)
1. **[미래형 표현 사용처 한정]**: 미래형 표현 ('~기대됨')은 **오직 A 유형(부정적 특성 순화)**을 서술하는 문장에서만 사용한다.
2. **[결론 문장 작성 금지]**: 문단 전체를 요약하거나, 일반적인 형태의 **결론 문장을 절대 작성하지 말 것**.
3. **[최종 문장 어미 점검]**: 문단의 **마지막 문장**이 **A 유형(부정 순화)**에 해당하지 않는다면, 무조건 **B 유형(현재형/서술형 어미)**으로 끝내야 한다.
4. **입력 반영**: 제공된 '누가기록'과 '추가 특이사항'을 반드시 내용에 포함시키되, 없는 내용을 지어내지 말 것.
`;


const JournalEntry = () => {
    const { students, journals, addJournalEntry, evaluations, saveEvaluation, finalizedEvaluations, saveFinalizedEvaluation, attendance } = useStudentContext();
    const { hasAPIKey, isConnected } = useAPIKey();
    const { user } = useAuth();
    const { currentClass } = useClass();
    const navigate = useNavigate();
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [entryContent, setEntryContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGlobalSettings, setShowGlobalSettings] = useState(false);
    const [customInstructions, setCustomInstructions] = useState('');
    const [referenceFile, setReferenceFile] = useState(null);
    const [referenceFileContent, setReferenceFileContent] = useState('');
    const [additionalNotesMap, setAdditionalNotesMap] = useState({});

    // Derive current additional notes from map
    const additionalNotes = selectedStudentId ? (additionalNotesMap[selectedStudentId] || '') : '';

    const handleAdditionalNotesChange = (e) => {
        if (!selectedStudentId) return;
        const value = e.target.value;
        setAdditionalNotesMap(prev => ({
            ...prev,
            [selectedStudentId]: value
        }));
    };
    const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
    const [revisionRequest, setRevisionRequest] = useState('');
    const [isEvaluationExpanded, setIsEvaluationExpanded] = useState(true);
    const [aiError, setAiError] = useState('');

    // Auto-save states
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const autoSaveTimerRef = useRef(null);

    // Load global AI settings from localStorage
    useEffect(() => {
        if (user && currentClass) {
            const settingsKey = `${user.username}_${currentClass.id}_ai_settings`;
            const savedSettings = localStorage.getItem(settingsKey);
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                setCustomInstructions(settings.customInstructions || '');
                setReferenceFileContent(settings.referenceFileContent || '');
            }
        }
    }, [user, currentClass]);

    // Save global AI settings to localStorage
    useEffect(() => {
        if (user && currentClass) {
            const settingsKey = `${user.username}_${currentClass.id}_ai_settings`;
            const settings = {
                customInstructions,
                referenceFileContent
            };
            localStorage.setItem(settingsKey, JSON.stringify(settings));
        }
    }, [customInstructions, referenceFileContent, user, currentClass]);

    const handleAddEntry = () => {
        if (!selectedStudentId || !entryContent.trim()) return;

        const newEntry = {
            id: Date.now(),
            date: new Date(selectedDate).toISOString(),
            content: entryContent,
        };

        addJournalEntry(selectedStudentId, newEntry);
        setEntryContent('');
        updateSaveStatus();
    };

    // Auto-save function
    const autoSave = async () => {
        if (!selectedStudentId || !entryContent.trim() || !hasUnsavedChanges) return;

        setIsSaving(true);
        try {
            const newEntry = {
                id: Date.now(),
                date: new Date(selectedDate).toISOString(),
                content: entryContent,
            };

            addJournalEntry(selectedStudentId, newEntry);
            setLastSaved(new Date());
            setHasUnsavedChanges(false);
            setEntryContent('');
            updateSaveStatus(); // Update global save status
        } catch (error) {
            console.error('Auto-save failed:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Track content changes
    useEffect(() => {
        if (entryContent.trim() && selectedStudentId) {
            setHasUnsavedChanges(true);
        }
    }, [entryContent, selectedStudentId]);

    // 30-second auto-save
    useEffect(() => {
        if (autoSaveTimerRef.current) {
            clearInterval(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setInterval(() => {
            if (hasUnsavedChanges) {
                autoSave();
            }
        }, 30000); // 30 seconds

        return () => {
            if (autoSaveTimerRef.current) {
                clearInterval(autoSaveTimerRef.current);
            }
        };
    }, [hasUnsavedChanges, entryContent, selectedStudentId]);

    // Save before closing
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges && entryContent.trim()) {
                e.preventDefault();
                e.returnValue = '';
                autoSave();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [hasUnsavedChanges, entryContent]);

    // Auto-refresh time display every minute
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);


    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setReferenceFile(null);
            setReferenceFileContent('');
            return;
        }

        setReferenceFile(file);

        // Read file content based on file type
        try {
            let text = '';

            if (file.name.endsWith('.txt')) {
                // Text file - read as text
                text = await file.text();
            } else if (file.name.endsWith('.docx')) {
                // Word document - extract text using mammoth
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                text = result.value;
            } else {
                throw new Error('지원하지 않는 파일 형식입니다.');
            }

            setReferenceFileContent(text);
        } catch (error) {
            console.error('Failed to read file:', error);
            alert('파일을 읽는 중 오류가 발생했습니다. 지원 형식: .txt, .docx');
            setReferenceFile(null);
            setReferenceFileContent('');
        }
    };

    const handleGenerateEvaluation = async (withRevision = false) => {
        if (!selectedStudentId) return;

        setIsGenerating(true);
        setAiError('');
        try {
            const student = students.find(s => s.id === selectedStudentId);
            const studentJournals = journals[selectedStudentId] || [];

            const evaluation = await generateStudentEvaluation(
                student.name,
                studentJournals,
                SYSTEM_INSTRUCTIONS,
                customInstructions,
                referenceFileContent, // Pass file content instead of filename
                additionalNotes,
                withRevision ? revisionRequest : ''
            );
            saveEvaluation(selectedStudentId, evaluation);
            if (withRevision) {
                setRevisionRequest(''); // Clear revision request after successful regeneration
            }
        } catch (error) {
            console.error("Evaluation generation failed", error);
            if (error.message && error.message.includes('API 키가 설정되지 않았습니다')) {
                setAiError(error.message);
            } else {
                alert("평가 생성 중 오류가 발생했습니다.");
            }
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveFinalizedEvaluation = () => {
        if (!selectedStudentId || !currentEvaluation) return;

        saveFinalizedEvaluation(selectedStudentId, currentEvaluation);
        alert('✅ 행동발달평가가 저장되었습니다!');
    };

    const selectedStudent = students.find(s => s.id === selectedStudentId);
    const studentJournals = selectedStudentId ? (journals[selectedStudentId] || []) : [];
    const currentEvaluation = selectedStudentId ? evaluations[selectedStudentId] : null;

    // Group journals by date (descending)
    const groupedJournals = studentJournals.reduce((groups, entry) => {
        const dateKey = new Date(entry.date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(entry);
        return groups;
    }, {});

    // Sort dates in descending order and sort entries within each date by time
    const sortedDateGroups = Object.entries(groupedJournals)
        .sort((a, b) => {
            const dateA = new Date(groupedJournals[a[0]][0].date);
            const dateB = new Date(groupedJournals[b[0]][0].date);
            return dateB - dateA;
        })
        .map(([dateKey, entries]) => ({
            dateKey,
            entries: entries.sort((a, b) => new Date(a.date) - new Date(b.date))
        }));

    // Sort students by attendance number
    const sortedStudents = [...students].sort((a, b) => a.attendanceNumber - b.attendanceNumber);

    // Format date for display
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });
    };

    // Format time for display
    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get student attendance summary
    const getStudentAttendanceSummary = () => {
        if (!selectedStudentId) return [];

        const summary = [];

        // Get all dates with attendance records
        Object.keys(attendance).forEach(dateKey => {
            const dayAttendance = attendance[dateKey];
            const studentRecord = dayAttendance[selectedStudentId];

            if (studentRecord) {
                const status = typeof studentRecord === 'string' ? studentRecord : studentRecord.status;
                const reason = typeof studentRecord === 'object' ? studentRecord.reason : '';

                // Only include special statuses (not present)
                if (status && status !== 'present') {
                    summary.push({
                        date: new Date(dateKey),
                        dateString: new Date(dateKey).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short'
                        }),
                        status: status,
                        reason: reason
                    });
                }
            }
        });

        // Sort by date descending
        return summary.sort((a, b) => b.date - a.date);
    };

    const getStatusLabel = (status) => {
        const statusMap = {
            late: '지각',
            sick: '병결',
            fieldtrip: '체험학습',
            other: '기타'
        };
        return statusMap[status] || status;
    };

    const getStatusColor = (status) => {
        const colorMap = {
            late: '#f59e0b',
            sick: '#3b82f6',
            fieldtrip: '#8b5cf6',
            other: '#6b7280'
        };
        return colorMap[status] || '#6b7280';
    };

    const attendanceSummary = getStudentAttendanceSummary();

    // Calculate attendance statistics
    const getAttendanceStats = () => {
        if (!selectedStudentId) return {};

        const stats = {
            late: 0,
            sick: 0,
            fieldtrip: 0,
            other: 0
        };

        attendanceSummary.forEach(record => {
            if (stats.hasOwnProperty(record.status)) {
                stats[record.status]++;
            }
        });

        return stats;
    };

    const attendanceStats = getAttendanceStats();

    return (
        <>
            <div className="flex justify-between items-center mb-lg">
                <h1>학생 기록</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>


                    <Button
                        variant="primary"
                        onClick={() => navigate('/evaluation')}
                        style={{ fontSize: '0.95rem' }}
                    >
                        📋 행동발달평가 확인
                    </Button>
                </div>
            </div>

            <div style={{
                marginBottom: '1.5rem',
                border: '1px solid #fcd34d', // amber-300
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                transition: 'box-shadow 0.2s ease'
            }}>
                <div
                    onClick={() => setShowGlobalSettings(!showGlobalSettings)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1.25rem 1.5rem',
                        cursor: 'pointer',
                        backgroundColor: '#fffbeb', // amber-50
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fef3c7'; // amber-100
                        e.currentTarget.parentElement.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fffbeb'; // amber-50
                        e.currentTarget.parentElement.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                        <span style={{ fontSize: '1.75rem' }}>💬</span>
                        <div>
                            <h3 style={{ margin: 0, color: '#92400e', fontSize: '1.1rem', fontWeight: '600' }}>
                                나만의 평가 스타일 설정
                            </h3>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#b45309' }}>
                                기본 평가 형식은 이미 준비되어 있어요. 여기서 선생님만의 스타일을 추가하세요!
                            </p>
                        </div>
                    </div>
                    <span style={{
                        fontSize: '1.25rem',
                        color: '#92400e',
                        transform: showGlobalSettings ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        display: 'inline-block'
                    }}>
                        ▼
                    </span>
                </div>

                {showGlobalSettings && (
                    <div style={{
                        padding: '1.75rem 1.5rem',
                        backgroundColor: 'white',
                        borderTop: '1px solid #fcd34d'
                    }}>
                        {/* 시스템 기본 설정 안내 박스 */}
                        <div style={{
                            backgroundColor: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            padding: '1rem 1.25rem',
                            marginBottom: '1.5rem'
                        }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.75rem'
                            }}>
                                <span style={{ fontSize: '1.1rem' }}>ℹ️</span>
                                <h4 style={{
                                    margin: 0,
                                    fontSize: '0.95rem',
                                    fontWeight: '600',
                                    color: '#1e40af'
                                }}>
                                    시스템 기본 설정
                                </h4>
                            </div>
                            <ul style={{
                                margin: 0,
                                paddingLeft: '1.25rem',
                                fontSize: '0.85rem',
                                color: '#1e40af',
                                lineHeight: '1.6'
                            }}>
                                <li>개조식 종결 (~함, ~임 등)</li>
                                <li>분량 300자 내외</li>
                                <li>긍정적·발전적 표현</li>
                                <li>장점 부각 및 개선점은 성장 가능성으로 표현</li>
                            </ul>
                            <p style={{
                                margin: '0.75rem 0 0 0',
                                fontSize: '0.85rem',
                                color: '#3b82f6',
                                fontWeight: '500'
                            }}>
                                → 아래에서 선생님만의 특별한 요청사항이나 말투를 추가할 수 있어요!
                            </p>
                        </div>

                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.625rem',
                                color: '#92400e',
                                fontWeight: '600',
                                fontSize: '0.95rem'
                            }}>
                                📝 추가 요청사항
                                <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 'normal' }}>
                                    (선택사항 - 선생님만의 스타일을 추가하세요)
                                </span>
                            </label>
                            <textarea
                                className="journal-textarea"
                                placeholder="예시: ~함, ~임 체로 종결하고 구체적인 사례를 들어 작성해주세요."
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#f59e0b';
                                    e.target.style.outline = '2px solid #fde68a';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#cbd5e1';
                                    e.target.style.outline = 'none';
                                }}
                                style={{
                                    minHeight: '100px',
                                    fontSize: '0.9rem',
                                    padding: '0.875rem',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    width: '100%',
                                    resize: 'vertical',
                                    transition: 'all 0.2s ease'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginBottom: '0.625rem',
                                color: '#92400e',
                                fontWeight: '600',
                                fontSize: '0.95rem'
                            }}>
                                📄 내 평가 예시 업로드
                                <span style={{ fontSize: '0.75rem', color: '#78350f', fontWeight: 'normal' }}>
                                    (이전 평가를 올리면 AI가 선생님 말투를 배워요)
                                </span>
                            </label>

                            <div style={{ marginBottom: '0.5rem' }}>
                                <input
                                    type="file"
                                    accept=".txt,.docx"
                                    onChange={handleFileChange}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#f59e0b';
                                        e.target.style.outline = '2px solid #fde68a';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#cbd5e1';
                                        e.target.style.outline = 'none';
                                    }}
                                    style={{
                                        padding: '0.625rem',
                                        border: '1px solid #cbd5e1',
                                        borderRadius: '8px',
                                        width: '100%',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: '#fff'
                                    }}
                                />
                                <div style={{
                                    marginTop: '0.5rem',
                                    fontSize: '0.85rem',
                                    color: '#4b5563',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    ✅ <strong>지원 가능 파일:</strong> .txt (메모장), .docx (워드)
                                </div>
                            </div>

                            {referenceFile && (
                                <div style={{
                                    marginTop: '0.625rem',
                                    padding: '0.625rem 0.875rem',
                                    backgroundColor: '#fffbeb',
                                    borderRadius: '6px',
                                    fontSize: '0.875rem',
                                    color: '#92400e',
                                    border: '1px solid #fcd34d'
                                }}>
                                    ✅ <strong>{referenceFile.name}</strong> 업로드 완료!
                                </div>
                            )}

                            {/* 파일 형식 가이드 - Simplified */}
                            <div style={{ marginTop: '1rem' }}>
                                <details style={{
                                    backgroundColor: '#fff7ed', // orange-50
                                    padding: '0.875rem',
                                    borderRadius: '8px',
                                    border: '1px solid #fed7aa' // orange-200
                                }}>
                                    <summary style={{
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        color: '#ea580c', // orange-600
                                        fontSize: '0.9rem',
                                        userSelect: 'none',
                                        outline: 'none'
                                    }}>
                                        📝 HWP(한글) 파일을 사용하고 싶으신가요?
                                    </summary>

                                    <div style={{ marginTop: '1rem', lineHeight: '1.6', fontSize: '0.9rem', color: '#431407' }}>
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            한글(.hwp) 파일은 바로 사용할 수 없습니다. <br />
                                            다음과 같이 <strong>Word(.docx)</strong> 형식으로 저장하여 올려주세요:
                                        </div>

                                        <ol style={{
                                            marginLeft: '1.5rem',
                                            marginTop: '0.5rem',
                                            backgroundColor: 'white',
                                            padding: '1rem 1rem 1rem 2.5rem',
                                            borderRadius: '6px',
                                            border: '1px solid #ffedd5'
                                        }}>
                                            <li style={{ marginBottom: '0.5rem' }}>한글 프로그램에서 파일을 엽니다.</li>
                                            <li style={{ marginBottom: '0.5rem' }}>상단 메뉴의 <strong>[파일] &gt; [다른 이름으로 저장하기]</strong>를 클릭합니다.</li>
                                            <li style={{ marginBottom: '0.5rem' }}>파일 형식을 <strong>MS Word 문서 (*.docx)</strong>로 선택합니다.</li>
                                            <li>저장 후 생성된 파일을 이곳에 업로드하세요.</li>
                                        </ol>
                                    </div>
                                </details>
                            </div>
                        </div>

                        <div style={{
                            marginTop: '1.25rem',
                            padding: '0.875rem 1rem',
                            backgroundColor: '#fffbeb',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            color: '#92400e',
                            borderLeft: '4px solid #f59e0b'
                        }}>
                            💡 <strong>팁:</strong> 설정하신 내용은 자동으로 저장되며, 다음에 다시 입력할 필요가 없습니다.
                        </div>
                    </div>
                )}
            </div>

            <div className="journal-container">
                <div className="student-selector">
                    <h3 className="mb-md text-lg font-semibold">학생 목록</h3>
                    {sortedStudents.length === 0 ? (
                        <p className="text-muted">등록된 학생이 없습니다.</p>
                    ) : (
                        sortedStudents.map((student) => (
                            <div
                                key={student.id}
                                className={`student-item ${selectedStudentId === student.id ? 'active' : ''}`}
                                onClick={() => setSelectedStudentId(student.id)}
                            >
                                <span>{student.attendanceNumber}.</span> {student.name} <span style={{ fontSize: '0.85em', opacity: 0.7 }}>({student.gender})</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="journal-content">
                    {selectedStudentId ? (
                        <>
                            {/* AI Evaluation Section */}
                            <div className="journal-form" style={{ marginBottom: '1rem', backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', transition: 'all 0.3s ease' }}>
                                {/* Header */}
                                <div
                                    className="flex justify-between items-center"
                                    style={{ cursor: 'pointer', padding: '0.25rem 0' }}
                                    onClick={() => setIsEvaluationExpanded(!isEvaluationExpanded)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span style={{
                                            display: 'inline-block',
                                            transition: 'transform 0.3s ease',
                                            transform: isEvaluationExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                            fontSize: '1.1rem',
                                            color: '#15803d',
                                            width: '20px',
                                            textAlign: 'center'
                                        }}>
                                            ▶
                                        </span>
                                        <h3 style={{ color: '#15803d', margin: 0 }}>🤖 AI 행동발달평가</h3>
                                    </div>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="accent"
                                            onClick={handleGenerateEvaluation}
                                            disabled={isGenerating}
                                        >
                                            {isGenerating ? '생성 중...' : 'AI 행동평가 생성'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isEvaluationExpanded && (
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #dcfce7', paddingTop: '1rem' }}>

                                        {/* API Key Notice - Compact */}
                                        {!hasAPIKey && (
                                            <div style={{
                                                backgroundColor: '#fffbeb',
                                                border: '1px solid #fcd34d',
                                                borderRadius: '6px',
                                                padding: '0.75rem 1rem',
                                                marginBottom: '1rem',
                                                fontSize: '0.9rem',
                                                color: '#92400e',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem'
                                            }}>
                                                <span style={{ fontSize: '1.25rem' }}>🔑</span>
                                                <div style={{ flex: 1 }}>
                                                    AI 기능 사용을 위해 <strong>Gemini API 키</strong>를 등록해주세요.
                                                </div>
                                                <Button
                                                    variant="secondary"
                                                    onClick={() => navigate('/settings')}
                                                    style={{
                                                        fontSize: '0.85rem',
                                                        padding: '0.4rem 0.75rem',
                                                        whiteSpace: 'nowrap',
                                                        backgroundColor: '#fbbf24',
                                                        borderColor: '#f59e0b',
                                                        color: '#78350f'
                                                    }}
                                                >
                                                    설정 이동
                                                </Button>
                                            </div>
                                        )}

                                        {/* 1. Additional Notes (Moved to top) */}
                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label className="form-label" style={{ color: '#15803d', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                📝 추가 특이사항
                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>(선택)</span>
                                            </label>
                                            <textarea
                                                className="journal-textarea"
                                                placeholder="AI 평가 생성 전에 추가로 고려할 특이사항을 입력하세요... (예: 학급 활동 참여도, 리더십 발휘 사례 등)"
                                                value={additionalNotes}
                                                onChange={handleAdditionalNotesChange}
                                                style={{ minHeight: '100px', fontSize: '0.9rem', backgroundColor: 'white' }}
                                            />
                                        </div>

                                        {/* 2. Result Area */}
                                        {currentEvaluation && (
                                            <>
                                                <div className="evaluation-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                                                    {currentEvaluation}
                                                </div>


                                                {/* Revision Request Section */}
                                                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                        <span style={{ fontSize: '1.1rem' }}>✏️</span>
                                                        <label className="form-label" style={{ color: '#15803d', fontWeight: '600', margin: 0 }}>AI 평가 수정 요청</label>
                                                    </div>
                                                    <textarea
                                                        className="journal-textarea"
                                                        placeholder="수정이 필요한 부분을 구체적으로 작성해주세요... (예: 리더십 부분을 더 강조해주세요, 협동심에 대한 내용을 추가해주세요)"
                                                        value={revisionRequest}
                                                        onChange={(e) => setRevisionRequest(e.target.value)}
                                                        style={{ minHeight: '80px', fontSize: '0.9rem', backgroundColor: 'white', marginBottom: '0.75rem' }}
                                                    />
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                                                            {revisionRequest.trim() ? `✓ 수정 요청사항이 입력되었습니다` : '수정 요청사항을 입력하고 재생성 버튼을 눌러주세요'}
                                                        </p>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => handleGenerateEvaluation(true)}
                                                            disabled={isGenerating || !revisionRequest.trim()}
                                                            style={{
                                                                fontSize: '0.9rem',
                                                                padding: '0.6rem 1.2rem',
                                                                backgroundColor: revisionRequest.trim() ? '#0369a1' : undefined,
                                                                color: revisionRequest.trim() ? 'white' : undefined,
                                                                fontWeight: '500'
                                                            }}
                                                        >
                                                            {isGenerating ? '🔄 수정 중...' : '🔄 재생성'}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex justify-end" style={{ gap: '0.75rem' }}>
                                                    <Button
                                                        variant="primary"
                                                        onClick={handleSaveFinalizedEvaluation}
                                                        style={{ fontSize: '0.9rem', backgroundColor: '#10b981' }}
                                                    >
                                                        💾 평가 저장
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                {!isEvaluationExpanded && !currentEvaluation && (
                                    <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.5rem', marginLeft: '1.8rem' }}>
                                        학생의 누가기록을 바탕으로 AI가 행동발달사항을 자동으로 생성해줍니다.
                                    </p>
                                )}
                            </div>

                            {/* Record Entry Form */}
                            <div className="journal-form">
                                <h3 className="mb-md">{formatDate(selectedDate)} {selectedStudent.name} 학생 행동 기록</h3>

                                <div className="date-selector-inline" style={{ marginBottom: '1rem' }}>
                                    <label className="form-label" style={{ marginRight: '0.5rem' }}>기록 날짜:</label>
                                    <input
                                        type="date"
                                        className="date-input"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        max={new Date().toISOString().split('T')[0]}
                                    />
                                </div>

                                <textarea
                                    className="journal-textarea"
                                    placeholder="오늘 관찰한 행동이나 특이사항을 기록하세요..."
                                    value={entryContent}
                                    onChange={(e) => setEntryContent(e.target.value)}
                                />
                                <div className="flex justify-end">
                                    <Button variant="primary" onClick={handleAddEntry}>기록 저장</Button>
                                </div>
                            </div>

                            {/* Attendance Summary */}
                            {attendanceSummary.length > 0 && (
                                <div className="attendance-summary-section" style={{ marginBottom: '1rem' }}>
                                    <h3 className="mb-md">📊 출결 특이사항</h3>

                                    {/* Statistics Summary */}
                                    <div className="attendance-stats-grid">
                                        {attendanceStats.late > 0 && (
                                            <div className="stat-card" style={{ borderLeftColor: '#f59e0b' }}>
                                                <div className="stat-label">지각</div>
                                                <div className="stat-value" style={{ color: '#f59e0b' }}>{attendanceStats.late}회</div>
                                            </div>
                                        )}
                                        {attendanceStats.sick > 0 && (
                                            <div className="stat-card" style={{ borderLeftColor: '#3b82f6' }}>
                                                <div className="stat-label">병결</div>
                                                <div className="stat-value" style={{ color: '#3b82f6' }}>{attendanceStats.sick}회</div>
                                            </div>
                                        )}
                                        {attendanceStats.fieldtrip > 0 && (
                                            <div className="stat-card" style={{ borderLeftColor: '#8b5cf6' }}>
                                                <div className="stat-label">체험학습</div>
                                                <div className="stat-value" style={{ color: '#8b5cf6' }}>{attendanceStats.fieldtrip}회</div>
                                            </div>
                                        )}
                                        {attendanceStats.other > 0 && (
                                            <div className="stat-card" style={{ borderLeftColor: '#6b7280' }}>
                                                <div className="stat-label">기타</div>
                                                <div className="stat-value" style={{ color: '#6b7280' }}>{attendanceStats.other}회</div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Toggle Button for Details */}
                                    <div style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
                                        <button
                                            onClick={() => setShowAttendanceDetails(!showAttendanceDetails)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--color-primary)',
                                                fontSize: '0.9rem',
                                                cursor: 'pointer',
                                                padding: '0.25rem 0',
                                                textDecoration: 'underline',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {showAttendanceDetails ? '▼ 상세 내역 닫기' : '▶ 상세 내역 보기'}
                                        </button>
                                    </div>

                                    {/* Detailed Table - Collapsible */}
                                    {showAttendanceDetails && (
                                        <>
                                            <h4 className="mb-sm" style={{ marginTop: '1rem', fontSize: '0.95rem', fontWeight: '600' }}>상세 내역</h4>
                                            <table className="attendance-table">
                                                <thead>
                                                    <tr>
                                                        <th>날짜</th>
                                                        <th>상태</th>
                                                        <th>사유</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {attendanceSummary.map((record, index) => (
                                                        <tr key={index}>
                                                            <td>{record.dateString}</td>
                                                            <td>
                                                                <span
                                                                    className="status-badge"
                                                                    style={{
                                                                        backgroundColor: getStatusColor(record.status),
                                                                        color: 'white',
                                                                        padding: '0.25rem 0.5rem',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.85rem',
                                                                        fontWeight: '600'
                                                                    }}
                                                                >
                                                                    {getStatusLabel(record.status)}
                                                                </span>
                                                            </td>
                                                            <td style={{ color: 'var(--color-text-muted)' }}>
                                                                {record.reason || '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Cumulative Records */}
                            <div className="cumulative-records">
                                <h3 className="mb-sm">누가기록 내역</h3>
                                {sortedDateGroups.length === 0 ? (
                                    <p className="text-muted">작성된 기록이 없습니다.</p>
                                ) : (
                                    sortedDateGroups.map(({ dateKey, entries }) => (
                                        <div key={dateKey} className="date-group">
                                            <div className="date-header">
                                                📅 {dateKey}
                                            </div>
                                            <div className="date-entries">
                                                {entries.map((entry) => (
                                                    <div key={entry.id} className="record-item">
                                                        <span className="record-time">{formatTime(entry.date)}</span>
                                                        <span className="record-content">{entry.content}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted">
                            학생 행동을 기록하거나 조회할 학생을 선택해주세요.
                        </div>
                    )}
                </div>
            </div >
        </>
    );
};

export default JournalEntry;
