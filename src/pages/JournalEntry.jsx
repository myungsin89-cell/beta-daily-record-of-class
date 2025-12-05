import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useStudentContext } from '../context/StudentContext';
import { useAPIKey } from '../context/APIKeyContext';
import { useSaveStatus } from '../context/SaveStatusContext';
import { generateStudentEvaluation } from '../services/aiService';
import './JournalEntry.css';

// Hidden system instructions that are always included in AI evaluation
const SYSTEM_INSTRUCTIONS = `
[역할 및 페르소나 설정]
당신은 학생들의 학교생활기록부 행동특성 및 종합의견을 작성하는 경력 10년 이상의 베테랑 담임교사입니다. 제공된 학생 관찰 내용을 바탕으로 전문적이고 깊이 있는 평가 글을 작성해야 합니다.

[매우 중요 - 학생 이름 사용 절대 금지]
**학생의 이름을 절대로 언급하지 마십시오.**
**평가 내용에 학생 이름, 성, 별명 등 어떠한 개인 식별 정보도 포함하지 마십시오.**
**"김○○", "이학생", "OOO학생" 등의 표현도 절대 사용 금지입니다.**
**바로 평가 내용으로 시작하십시오. 예: "성실하게 학교생활에 임하고 있으며..."**

[작성 목표 및 형식 규정]
- 목표: 학생의 행동 발달 특성을 평가하고, 개선이 필요한 부분을 발전 가능성을 담아 긍정적으로 포장하여 서술합니다.
- **길이: 반드시 공백 포함 300자 내외로 작성합니다. (최소 250자 이상)** 너무 짧게 작성하지 말고, 4-6개의 완전한 문장으로 구성하여 충분한 분량을 확보하십시오.
- 문체: 문장 끝은 "~함", "~임", "~하고 있음"과 같이 간결하고 전문적인 종결어로 처리합니다.
- 칭찬 수위: '뛰어난' 등 최고격 표현은 관찰된 사실이 명확하게 입증될 때만 사용하며, 대부분은 잠재력과 현재의 모습을 부드럽게 표현하여 긍정적인 의미를 유지합니다.
- **입력 반영: 제공된 '누가기록'과 '추가 특이사항'을 반드시 내용에 포함시켜야 합니다. 없는 내용을 지어내지 마십시오.**
- **출력 형식: 학생 이름 없이 바로 평가 내용으로 시작합니다.**

[글의 구성 순서]
1. 학생의 전체적인 특성 및 장점 (성격, 태도 등) - 현재형으로 서술
2. 수업 시간 태도 및 학습 참여 자세 (구체적 과목 언급 가능 시 포함) - 현재형으로 서술
3. 교우 관계 및 공동체 생활에서의 모습 (리더십, 배려, 협력 등) - 현재형으로 서술
4. 종합 의견 - **부정적 내용이 있었다면 순화 표현으로, 없다면 현재형으로 마무리**

[평가 내용 분석 및 순화/출력 지침]
1. **입력 내용 분석:** 입력된 관찰 내용의 각 문장을 다음 두 가지 주요 유형으로 분류하십시오:
   * **A. 순화 필요 유형 (부정적 내용):** 개선 필요 사항, 미흡한 행동, 지적 사항, 문제 행동 등.
   * **B. 현재 서술 유형 (긍정적/중립적 내용):** 현재 성취, 긍정적 특성, 모범적인 행동 등 이미 긍정적이거나 객관적인 사실.

2. **유형별 순화 및 출력 규칙:**
   * **A 유형 (부정적 내용) 처리:**
     * **반드시** 긍정적인 변화의 가능성을 시사하는 문장으로 **순화**하십시오.
     * 미래 지향적 표현 사용: '~발전이 기대된다', '~성장이 기대된다', '~향상이 기대된다' 등
     * 예시: "수업 시간에 집중하지 못함" → "앞으로 수업 집중도가 향상될 것으로 기대됨"
   
   * **B 유형 (긍정적/중립적 내용) 처리:**
     * 현재의 성취나 특성을 직접적으로 서술하며 **완료형** 또는 **현재 진행형** 문장을 사용하십시오.
     * 사용 가능한 종결어: '~하고 있음', '~함', '~보임', '~됨', '~나타남'
     * 예시: "친구들과 잘 어울림" → "교우들과 원만하게 지내고 있음"
     * **[절대 금지]** 이미 긍정적이거나 중립적인 내용에는 '~발전이 기대된다', '~성장이 기대된다', '~할 것으로 기대됨', '~보여줄 것이다' 등 어떠한 미래 지향적 표현도 절대 사용하지 마십시오.

3. **미래 지향적 표현 사용 조건 (매우 중요 - 반드시 준수):**
   * **오직 A 유형(부정적 내용)을 순화할 때만** 미래 지향적 표현을 사용합니다.
   * 입력된 관찰 내용에 **부정적 내용이 전혀 없고** 모두 긍정적/중립적 내용만 있다면:
     * 평가 전체에서 '~발전이 기대된다', '~성장이 기대된다', '~향상이 기대된다', '~보여줄 것이다', '~할 것으로 기대됨' 등의 표현을 **단 한 번도 사용하지 마십시오**.
     * 마지막 문장도 반드시 현재형으로 마무리하십시오.
   * 긍정적인 학생의 평가는 현재의 모습을 있는 그대로 서술하며 '~함', '~하고 있음', '~보임'으로 마무리합니다.
   
4. **잘못된 예시 (절대 금지):**
   ❌ "김○○ 학생은 성실하게 학교생활에 임하고 있음." (이름 포함 금지!)
   ❌ "이학생은 원만한 교우 관계를 유지하고 있음." (이름 표현 금지!)
   ❌ "원만한 교우 관계를 유지하며 공동체 활동에도 적극적으로 참여하는 바, 앞으로도 긍정적인 마음가짐을 바탕으로 더욱 발전된 모습을 보여줄 것이라 기대됨." (부정적 내용 없는데 미래형 사용 금지!)
   ❌ "성실하게 학교생활에 임하고 있어 앞으로의 성장이 기대됨." (부정적 내용 없는데 미래형 사용 금지!)
   ❌ "친구들과 잘 어울리며 앞으로도 좋은 모습을 보일 것으로 기대됨." (부정적 내용 없는데 미래형 사용 금지!)

5. **올바른 예시 (긍정적 내용만 있을 경우):**
   ✅ "성실하게 학교생활에 임하며 학급 규칙을 잘 준수하고 있음. 수업 시간에 집중하여 적극적으로 참여하는 모습을 보이고 있으며..."
   ✅ "원만한 교우 관계를 유지하며 공동체 활동에도 적극적으로 참여하고 있음. 친구들과 협력하여 과제를 수행하는 모습이 인상적이며..."
   ✅ "밝고 긍정적인 성격으로 학급 분위기 조성에 기여하고 있음. 교우들과 잘 어울리며 조화로운 관계를 유지하고 있음."

6. **다양화 규칙 (A 유형 다수 시 발동):**
   * **'A 유형(부정적 내용)'의 문장이 3개 이상**이거나, 전체 내용 중 **30% 이상**을 차지하는 경우에만 아래의 규칙을 적용합니다.
   * **반복 방지:** '발전이 기대된다', '성장이 기대된다'와 같은 표현이 한 단락 내에서 **2회 이상 반복되지 않도록** 주의하십시오.
   * **대안 표현 활용:** 다양한 어휘와 문장 구조를 사용하여 순화 문구를 생성하십시오.
     * **권장 대안 표현:** ~ 잠재력을 보여주고 있음, ~ 개선 여지가 충분하며 긍정적 변화를 보이고 있음, ~ 앞으로의 변화가 주목됨, ~ 노력하는 모습이 인상적임, ~ 점진적인 향상이 관찰됨.

[최종 출력 지침]
- **[절대 금지] 학생의 이름, 성, 별명을 절대로 언급하지 마십시오. "OOO", "김○○", "이학생" 등도 모두 금지입니다.**
- **바로 평가 내용으로 시작하십시오.** 예: "성실하게 학교생활에 임하며..."
- 문장이 길지 않고 명료함.
- **긍정적인 내용에는 '~함', '~임', '~보임', '~됨', '~나타남', '~하고 있음' 등의 현재형 종결어만 사용함.**
- **부정적인 내용을 순화할 때만 '~발전이 기대됨', '~성장이 기대됨' 등의 미래형 종결어를 사용함.**
- 강점은 구체적으로 서술하며, 약점이나 개선점은 위의 순화 규칙에 따라 처리함.
- 평가의 시점이 객관적이고 관찰 중심적임.
- 분석 및 지침이 적용된 자연스럽고 매끄러운 행동발달평가 문구를 완성하십시오.

[최종 점검 체크리스트 - 출력 전 반드시 확인]
작성한 평가를 출력하기 전에 다음을 반드시 확인하십시오:
1. **[최우선] 학생 이름이나 개인 식별 정보가 포함되어 있지 않은가?** → 있다면 즉시 제거!
2. **평가가 바로 내용으로 시작하는가?** (이름 없이)
3. 입력된 내용에 부정적 내용이 있었는가?
   - **없음** → 평가 전체에 '~기대됨', '~것이다', '~보여줄 것' 등의 미래형 표현이 **단 한 개도 없는지** 확인
   - **있음** → 해당 부정적 내용만 순화했는지 확인
4. 마지막 문장이 현재형('~함', '~하고 있음')으로 끝나는가? (부정적 내용이 없는 경우)
5. 긍정적 내용에 미래형 표현을 사용하지 않았는가?

[정보 부족 시 대처 방안]
- 제공된 관찰 기록이 부족하거나 없는 경우에도 평가를 작성해야 합니다.
- 이 경우 일반적이고 무난하며 긍정적인 표현을 사용하여 보통 수준의 학생에게 적절한 평가를 작성합니다.
- **반드시 현재형 종결어를 사용하며, 이름 없이 바로 시작**: "성실하게 학교생활에 임하고 있음", "기본 생활 습관이 형성되어 있음", "학급 규칙을 준수하며 생활함", "교우들과 원만하게 지내고 있음", "주어진 과제를 성실히 수행함" 등의 표현을 활용합니다.
`;


const JournalEntry = () => {
    const { students, journals, addJournalEntry, evaluations, saveEvaluation, finalizedEvaluations, saveFinalizedEvaluation, attendance } = useStudentContext();
    const { hasAPIKey, isConnected } = useAPIKey();
    const navigate = useNavigate();
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [entryContent, setEntryContent] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
    const [customInstructions, setCustomInstructions] = useState('');
    const [referenceFile, setReferenceFile] = useState(null);
    const [referenceFileContent, setReferenceFileContent] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [showAttendanceDetails, setShowAttendanceDetails] = useState(false);
    const [revisionRequest, setRevisionRequest] = useState('');
    const [isEvaluationExpanded, setIsEvaluationExpanded] = useState(true);
    const [aiError, setAiError] = useState('');

    // Auto-save states
    const [lastSaved, setLastSaved] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const autoSaveTimerRef = useRef(null);


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

        // Read file content
        try {
            const text = await file.text();
            setReferenceFileContent(text);
        } catch (error) {
            console.error('Failed to read file:', error);
            alert('파일을 읽는 중 오류가 발생했습니다.');
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
                        onClick={() => navigate('/evaluation-view')}
                        style={{ fontSize: '0.95rem' }}
                    >
                        📋 행동발달평가 확인
                    </Button>
                </div>
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
                            <div className="journal-form" style={{ marginBottom: '1rem', backgroundColor: '#f0f9ff', borderColor: '#bae6fd', transition: 'all 0.3s ease' }}>
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
                                            color: '#0369a1',
                                            width: '20px',
                                            textAlign: 'center'
                                        }}>
                                            ▶
                                        </span>
                                        <h3 style={{ color: '#0369a1', margin: 0 }}>🤖 AI 행동발달평가</h3>
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
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e0f2fe', paddingTop: '1rem' }}>

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
                                            <label className="form-label" style={{ color: '#0369a1', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                📝 추가 특이사항
                                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'normal' }}>(선택)</span>
                                            </label>
                                            <textarea
                                                className="journal-textarea"
                                                placeholder="AI 평가 생성 전에 추가로 고려할 특이사항을 입력하세요... (예: 학급 활동 참여도, 리더십 발휘 사례 등)"
                                                value={additionalNotes}
                                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                                style={{ minHeight: '100px', fontSize: '0.9rem', backgroundColor: 'white' }}
                                            />
                                        </div>

                                        {/* 2. Advanced Options (Moved below notes) */}
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <button
                                                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#0369a1',
                                                    fontSize: '0.9rem',
                                                    cursor: 'pointer',
                                                    padding: '0',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {showAdvancedOptions ? '▼ 상세 설정 닫기' : '▶ 상세 설정 (AI 요청사항, 참고자료)'}
                                            </button>

                                            {showAdvancedOptions && (
                                                <div style={{ marginTop: '0.5rem', padding: '1rem', backgroundColor: 'white', borderRadius: 'var(--radius-md)', border: '1px solid #bae6fd' }}>
                                                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                                                        <label className="form-label" style={{ color: '#0369a1', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            📋 평가 작성 가이드
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(평가 작성 시 이 가이드를 우선 반영합니다)</span>
                                                        </label>
                                                        <textarea
                                                            className="journal-textarea"
                                                            placeholder="예시: 구체적인 사례 중심으로 서술하고, 간결하고 명료한 문장으로 작성해주세요. 긍정적이고 따뜻한 어조를 유지하되 과장하지 말아주세요."
                                                            value={customInstructions}
                                                            onChange={(e) => setCustomInstructions(e.target.value)}
                                                            style={{ minHeight: '80px', fontSize: '0.9rem' }}
                                                        />
                                                    </div>

                                                    <div className="form-group">
                                                        <label className="form-label" style={{ color: '#0369a1', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            📄 어투 학습용 참고 자료
                                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 'normal' }}>(선생님의 이전 평가 예시를 업로드하면 동일한 어투로 작성합니다)</span>
                                                        </label>
                                                        <input
                                                            type="file"
                                                            accept=".txt"
                                                            onChange={handleFileChange}
                                                            className="form-input"
                                                            style={{ padding: '0.5rem' }}
                                                        />
                                                        {referenceFile && (
                                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                                                ✓ {referenceFile.name} (AI가 이 파일의 작성 스타일을 학습합니다)
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 3. Result Area */}
                                        {currentEvaluation && (
                                            <>
                                                <div className="evaluation-content" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                                                    {currentEvaluation}
                                                </div>


                                                {/* Revision Request Section */}
                                                <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                                        <span style={{ fontSize: '1.1rem' }}>✏️</span>
                                                        <label className="form-label" style={{ color: '#0369a1', fontWeight: '600', margin: 0 }}>AI 평가 수정 요청</label>
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
