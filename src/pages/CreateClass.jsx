import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClass } from '../context/ClassContext';
import './CreateClass.css';

const CreateClass = () => {
    const navigate = useNavigate();
    const { createClass, selectClass } = useClass();
    const currentYear = new Date().getFullYear();

    const [formData, setFormData] = useState({
        grade: '',
        classNumber: '',
        year: currentYear.toString()
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // 학급명 자동 생성 (예: "3학년 2반")
        const className = `${formData.grade}학년 ${formData.classNumber}반`;

        const newClass = createClass({
            name: className,
            grade: formData.grade,
            classNumber: formData.classNumber,
            year: formData.year
        });

        selectClass(newClass);
        navigate('/');
    };

    const handleCancel = () => {
        navigate('/select-class');
    };

    return (
        <div className="create-class-container">
            <div className="create-class-card">
                <div className="create-class-header">
                    <div className="header-icon">🏫</div>
                    <h1>새 학급 만들기</h1>
                    <p>학급 정보를 입력하세요</p>
                </div>

                <form onSubmit={handleSubmit} className="create-class-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="grade">학년 *</label>
                            <select
                                id="grade"
                                name="grade"
                                value={formData.grade}
                                onChange={handleChange}
                                required
                                autoFocus
                            >
                                <option value="">선택</option>
                                <option value="1">1학년</option>
                                <option value="2">2학년</option>
                                <option value="3">3학년</option>
                                <option value="4">4학년</option>
                                <option value="5">5학년</option>
                                <option value="6">6학년</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="classNumber">반 *</label>
                            <select
                                id="classNumber"
                                name="classNumber"
                                value={formData.classNumber}
                                onChange={handleChange}
                                required
                            >
                                <option value="">선택</option>
                                <option value="1">1반</option>
                                <option value="2">2반</option>
                                <option value="3">3반</option>
                                <option value="4">4반</option>
                                <option value="5">5반</option>
                                <option value="6">6반</option>
                                <option value="7">7반</option>
                                <option value="8">8반</option>
                                <option value="9">9반</option>
                                <option value="10">10반</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="year">연도</label>
                        <input
                            type="number"
                            id="year"
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            min="2020"
                            max="2100"
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" onClick={handleCancel} className="cancel-btn">
                            취소
                        </button>
                        <button type="submit" className="submit-btn">
                            학급 만들기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateClass;
