import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAPIKey } from '../context/APIKeyContext';
import { exportAllData, importAllData } from '../db/indexedDB';
import Button from '../components/Button';
import './Settings.css';

const Settings = () => {
    const { apiKey, isConnected, saveAPIKey, deleteAPIKey, testConnection } = useAPIKey();
    const navigate = useNavigate();

    const [inputKey, setInputKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const handleSaveAPIKey = async () => {
        if (!inputKey.trim()) {
            setMessage({ type: 'error', text: 'API 키를 입력해주세요.' });
            return;
        }

        setIsSaving(true);
        setMessage({ type: '', text: '' });

        const result = await saveAPIKey(inputKey.trim());

        setIsSaving(false);

        if (result.success) {
            setMessage({ type: 'success', text: '✅ API 키가 성공적으로 저장되었습니다!' });
            setInputKey('');
        } else {
            setMessage({ type: 'error', text: `❌ ${result.error}` });
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setMessage({ type: '', text: '' });

        const result = await testConnection();

        setIsTesting(false);

        if (result.success) {
            setMessage({ type: 'success', text: '✅ API 연결 성공! 정상 작동합니다.' });
        } else {
            setMessage({ type: 'error', text: `❌ ${result.error}` });
        }
    };

    const handleDeleteAPIKey = async () => {
        if (!window.confirm('정말로 API 키를 삭제하시겠습니까? AI 기능을 사용할 수 없게 됩니다.')) {
            return;
        }

        setMessage({ type: '', text: '' });
        const result = await deleteAPIKey();

        if (result.success) {
            setInputKey(''); // Clear input field after successful deletion
            setMessage({ type: 'success', text: '✅ API 키가 삭제되었습니다.' });
        } else {
            setMessage({ type: 'error', text: `❌ ${result.error}` });
        }
    };

    const handleExportData = async () => {
        try {
            const data = await exportAllData();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `class-diary-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            setMessage({ type: 'success', text: '✅ 데이터가 성공적으로 내보내졌습니다!' });
        } catch (error) {
            setMessage({ type: 'error', text: `❌ 데이터 내보내기 실패: ${error.message}` });
        }
    };

    const handleImportData = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!confirm('기존 데이터를 모두 덮어쓰시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                event.target.value = '';
                return;
            }

            await importAllData(data);
            setMessage({ type: 'success', text: '✅ 데이터가 성공적으로 복원되었습니다! 페이지를 새로고침하세요.' });

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            setMessage({ type: 'error', text: `❌ 데이터 복원 실패: ${error.message}` });
        }

        event.target.value = '';
    };

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>⚙️ 설정</h1>
                <Button variant="secondary" onClick={() => navigate(-1)}>
                    ← 뒤로가기
                </Button>
            </div>

            {/* AI Connection Section */}
            <div className="settings-section">
                <h2>🤖 AI 연결 설정</h2>

                {/* Connection Status */}
                <div className={`connection-status-card ${isConnected ? 'connected' : 'disconnected'}`}>
                    <div className="status-header">
                        <div className="status-icon">
                            {isConnected ? '✅' : '⚠️'}
                        </div>
                        <div className="status-info">
                            <h3>{isConnected ? 'AI 연결됨' : 'AI 연결 필요'}</h3>
                            <p>
                                {isConnected
                                    ? 'Google Gemini AI와 연결되어 있습니다.'
                                    : 'AI 평가 작성 기능을 사용하려면 API 키가 필요합니다.'}
                            </p>
                        </div>
                    </div>

                    {isConnected && (
                        <div className="connection-actions">
                            <Button
                                variant="secondary"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                size="small"
                            >
                                {isTesting ? '테스트 중...' : '🔍 연결 테스트'}
                            </Button>
                            <button
                                className="delete-api-button"
                                onClick={handleDeleteAPIKey}
                                type="button"
                            >
                                삭제
                            </button>
                        </div>
                    )}
                </div>

                {/* API Key Setup */}
                {!isConnected && (
                    <div className="api-setup-card">
                        <div className="setup-header">
                            <h3>🚀 3단계로 무료 설정하기</h3>
                            <span className="free-badge">무료</span>
                        </div>

                        <div className="setup-steps">
                            <div className="setup-step">
                                <div className="step-number">1</div>
                                <div className="step-content">
                                    <strong>API 키 발급</strong>
                                    <p>아래 버튼을 눌러 Google AI Studio에서 API 키를 무료로 발급받으세요.</p>
                                    <a
                                        href="https://aistudio.google.com/apikey"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="api-link-button"
                                    >
                                        🔑 API 키 발급받기
                                    </a>
                                </div>
                            </div>

                            <div className="setup-step">
                                <div className="step-number">2</div>
                                <div className="step-content">
                                    <strong>API 키 복사</strong>
                                    <p>"Create API key" 버튼을 눌러 생성된 키(AIza...로 시작)를 복사하세요.</p>
                                </div>
                            </div>

                            <div className="setup-step">
                                <div className="step-number">3</div>
                                <div className="step-content">
                                    <strong>아래 입력창에 붙여넣기</strong>
                                    <p>복사한 API 키를 붙여넣고 저장 버튼을 누르세요.</p>
                                </div>
                            </div>
                        </div>

                        <div className="help-tip">
                            💡 Gmail 계정으로 로그인되어 있어야 하며, 발급받은 키는 안전하게 보관하세요.
                        </div>
                    </div>
                )}

                {/* API Key Input */}
                <div className="api-key-input-card">
                    <label className="input-label">
                        {isConnected ? 'API 키 변경' : 'API 키 입력'}
                    </label>
                    <div className="input-group">
                        <div className="input-with-toggle">
                            <input
                                type={showKey ? 'text' : 'password'}
                                className="api-key-input"
                                placeholder="AIza로 시작하는 API 키를 입력하세요"
                                value={inputKey}
                                onChange={(e) => setInputKey(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveAPIKey()}
                            />
                            <button
                                type="button"
                                className="toggle-visibility-btn"
                                onClick={() => setShowKey(!showKey)}
                                title={showKey ? '키 숨기기' : '키 보기'}
                            >
                                {showKey ? '숨기기' : '보기'}
                            </button>
                        </div>
                        <Button
                            variant="primary"
                            onClick={handleSaveAPIKey}
                            disabled={isSaving || !inputKey.trim()}
                        >
                            {isSaving ? '저장 중...' : '💾 저장'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Data Backup Section */}
            <div className="settings-section">
                <h2>💾 데이터 백업 및 복구</h2>
                <p className="section-description">
                    모든 학급 데이터를 안전하게 백업하고 다른 기기에서 복원할 수 있습니다.
                </p>

                <div className="backup-actions">
                    <Button
                        variant="primary"
                        onClick={handleExportData}
                    >
                        📥 데이터 내보내기
                    </Button>
                    <label className="import-button-wrapper">
                        <Button variant="secondary" as="span">
                            📤 데이터 가져오기
                        </Button>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            style={{ display: 'none' }}
                        />
                    </label>
                </div>
            </div>

            {/* Feedback Section */}
            <div className="settings-section">
                <h2>📝 수정 및 요청사항</h2>
                <p className="section-description">
                    개선이 필요한 부분이나 새로운 기능을 자유롭게 제안해주세요.
                </p>
                <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSekXmDyk3mOjrxqRLCnSz8XHHabIUTgE3p1Sy4YJ0Uj-GPawA/viewform?usp=header"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="feedback-link-button"
                >
                    📮 피드백 보내기
                </a>
            </div>

            {/* App Info Section */}
            <div className="settings-section app-info-section">
                <h2>ℹ️ 앱 정보</h2>
                <div className="info-grid">
                    <div className="info-item">
                        <span className="info-label">버전</span>
                        <span className="info-value">베타테스트</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">저장 방식</span>
                        <span className="info-value">IndexedDB (로컬)</span>
                    </div>
                    <div className="info-item">
                        <span className="info-label">AI 모델</span>
                        <span className="info-value">Google Gemini 2.0</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
