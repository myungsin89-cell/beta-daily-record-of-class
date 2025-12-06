import React, { useState } from 'react';

const MiniCalendar = ({ todos, onDateClick, holidays = [] }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // 날짜를 YYYY-MM-DD 형식으로 변환
    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // 달의 첫날과 마지막날 구하기
    const getMonthData = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // 첫 주의 시작 (월요일 기준)
        const startDay = new Date(firstDay);
        const dayOfWeek = firstDay.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startDay.setDate(firstDay.getDate() + diff);

        return { firstDay, lastDay, startDay };
    };

    const { firstDay, lastDay, startDay } = getMonthData(currentMonth);

    // 6주 × 7일 = 42일의 날짜 배열 생성
    const days = [];
    const tempDate = new Date(startDay);
    for (let i = 0; i < 42; i++) {
        days.push(new Date(tempDate));
        tempDate.setDate(tempDate.getDate() + 1);
    }

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const handleToday = () => {
        setCurrentMonth(new Date());
    };

    const handleDateClick = (date) => {
        if (onDateClick) {
            onDateClick(date);
        }
    };

    const isToday = (date) => {
        const today = new Date();
        return formatDateLocal(date) === formatDateLocal(today);
    };

    const isCurrentMonth = (date) => {
        return date.getMonth() === currentMonth.getMonth();
    };

    const getTodoCount = (date) => {
        const dateStr = formatDateLocal(date);
        const dayTodos = todos[dateStr] || [];
        return dayTodos.length;
    };

    const getCompletedCount = (date) => {
        const dateStr = formatDateLocal(date);
        const dayTodos = todos[dateStr] || [];
        return dayTodos.filter(todo => todo.completed).length;
    };

    const isHoliday = (date) => {
        const dateStr = formatDateLocal(date);
        return holidays.some(h => {
            const holidayDate = typeof h === 'string' ? h : h.date;
            return holidayDate === dateStr;
        });
    };

    const getHolidayName = (date) => {
        const dateStr = formatDateLocal(date);
        const holiday = holidays.find(h => {
            const holidayDate = typeof h === 'string' ? h : h.date;
            return holidayDate === dateStr;
        });
        if (!holiday) return '';
        return typeof holiday === 'string' ? '공휴일' : holiday.name || '공휴일';
    };

    return (
        <div className="mini-calendar">
            {/* Header */}
            <div className="mini-calendar-header">
                <button onClick={handlePrevMonth} className="mini-nav-btn" title="이전 달">
                    ‹
                </button>
                <div className="mini-calendar-title">
                    {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </div>
                <button onClick={handleNextMonth} className="mini-nav-btn" title="다음 달">
                    ›
                </button>
            </div>

            {/* Today Button */}
            <div className="mini-calendar-today-btn-container">
                <button onClick={handleToday} className="mini-today-btn">
                    오늘
                </button>
            </div>

            {/* Weekday Headers */}
            <div className="mini-calendar-weekdays">
                <div>월</div>
                <div>화</div>
                <div>수</div>
                <div>목</div>
                <div>금</div>
                <div className="weekend">토</div>
                <div className="weekend">일</div>
            </div>

            {/* Days Grid */}
            <div className="mini-calendar-days">
                {days.map((date, index) => {
                    const todoCount = getTodoCount(date);
                    const completedCount = getCompletedCount(date);
                    const pendingCount = todoCount - completedCount;
                    const dayOfWeek = date.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isHolidayDate = isHoliday(date);
                    const holidayName = isHolidayDate ? getHolidayName(date) : '';

                    return (
                        <div
                            key={index}
                            className={`mini-calendar-day ${!isCurrentMonth(date) ? 'other-month' : ''} ${
                                isToday(date) ? 'today' : ''
                            } ${todoCount > 0 ? 'has-todos' : ''} ${isWeekend ? 'weekend-day' : ''} ${isHolidayDate ? 'holiday-day' : ''}`}
                            onClick={() => handleDateClick(date)}
                            title={holidayName}
                        >
                            <div className="mini-day-number">{date.getDate()}</div>
                            {todoCount > 0 && (
                                <div className="mini-todo-indicators">
                                    {/* 미완료 할일 점 (최대 3개) */}
                                    {Array.from({ length: Math.min(pendingCount, 3) }).map((_, i) => (
                                        <span key={`pending-${i}`} className="todo-dot pending"></span>
                                    ))}
                                    {/* 완료된 할일 점 (최대 3개, 미완료와 합쳐서 최대 3개) */}
                                    {Array.from({ length: Math.min(completedCount, Math.max(0, 3 - pendingCount)) }).map((_, i) => (
                                        <span key={`completed-${i}`} className="todo-dot completed"></span>
                                    ))}
                                </div>
                            )}
                            {todoCount > 3 && (
                                <div className="mini-todo-count">+{todoCount - 3}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            <style>{`
                .mini-calendar {
                    background: white;
                    border-radius: var(--radius-md);
                    padding: 1rem;
                    max-width: 450px;
                    margin: 0 auto;
                }

                .mini-calendar-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }

                .mini-calendar-title {
                    font-weight: 600;
                    font-size: 1rem;
                    color: var(--color-text);
                }

                .mini-nav-btn {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    padding: 0.25rem 0.5rem;
                    color: var(--color-text-muted);
                    transition: color 0.2s, background-color 0.2s;
                    border-radius: 4px;
                    line-height: 1;
                }

                .mini-nav-btn:hover {
                    color: var(--color-primary);
                    background-color: #f1f5f9;
                }

                .mini-calendar-today-btn-container {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 0.75rem;
                }

                .mini-today-btn {
                    background: var(--color-primary);
                    color: white;
                    border: none;
                    padding: 0.35rem 1rem;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .mini-today-btn:hover {
                    background: #0369a1;
                }

                .mini-calendar-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 0.25rem;
                    margin-bottom: 0.5rem;
                    text-align: center;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: var(--color-text-muted);
                }

                .mini-calendar-weekdays .weekend {
                    color: #ef4444;
                }

                .mini-calendar-days {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 0.25rem;
                }

                .mini-calendar-day {
                    aspect-ratio: 1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 0.25rem;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s, transform 0.1s;
                    position: relative;
                    min-height: 45px;
                }

                .mini-calendar-day:hover {
                    background-color: #f1f5f9;
                    transform: scale(1.05);
                }

                .mini-calendar-day.other-month {
                    opacity: 0.3;
                }

                .mini-calendar-day.today {
                    background-color: #dbeafe;
                    border: 2px solid var(--color-primary);
                    font-weight: bold;
                }

                .mini-calendar-day.has-todos {
                    background-color: #f0fdf4;
                }

                .mini-calendar-day.has-todos.today {
                    background-color: #bfdbfe;
                }

                .mini-calendar-day.weekend-day .mini-day-number {
                    color: #ef4444;
                }

                .mini-calendar-day.holiday-day .mini-day-number {
                    color: #ef4444;
                    font-weight: 700;
                }

                .mini-day-number {
                    font-size: 0.85rem;
                    margin-bottom: 0.15rem;
                }

                .mini-todo-indicators {
                    display: flex;
                    gap: 2px;
                    flex-wrap: wrap;
                    justify-content: center;
                    min-height: 8px;
                }

                .todo-dot {
                    width: 5px;
                    height: 5px;
                    border-radius: 50%;
                    display: inline-block;
                }

                .todo-dot.pending {
                    background-color: #10b981;
                }

                .todo-dot.completed {
                    background-color: #9ca3af;
                }

                .mini-todo-count {
                    font-size: 0.65rem;
                    color: var(--color-text-muted);
                    margin-top: 0.1rem;
                }

                @media (max-width: 640px) {
                    .mini-calendar {
                        padding: 0.75rem;
                    }

                    .mini-calendar-day {
                        min-height: 35px;
                        padding: 0.2rem;
                    }

                    .mini-day-number {
                        font-size: 0.75rem;
                    }

                    .todo-dot {
                        width: 4px;
                        height: 4px;
                    }
                }
            `}</style>
        </div>
    );
};

export default MiniCalendar;
