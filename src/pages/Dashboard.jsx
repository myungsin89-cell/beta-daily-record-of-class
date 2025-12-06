import React, { useState, useEffect, useRef } from 'react';
import Button from '../components/Button';
import Card from '../components/Card';
import MiniCalendar from '../components/MiniCalendar';
import { useSaveStatus } from '../context/SaveStatusContext';
import { useClass } from '../context/ClassContext';
import { useAuth } from '../context/AuthContext';
import { useStudentContext } from '../context/StudentContext';

// TodoItem Component with Style Editor
const TodoItem = ({ todo, index, dateStr, toggleTodo, deleteTodo, updateTodoStyle, updateTodoText, onDragStart, onDragOver, onDrop }) => {
    const [showEditor, setShowEditor] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(todo.text);
    const editorRef = useRef(null);
    const inputRef = useRef(null);

    // Close editor when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (editorRef.current && !editorRef.current.contains(event.target)) {
                setShowEditor(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleDoubleClick = () => {
        setIsEditing(true);
        setEditText(todo.text);
    };

    const handleSaveEdit = () => {
        if (editText.trim() && editText !== todo.text) {
            updateTodoText(dateStr, todo.id, editText.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSaveEdit();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setEditText(todo.text);
        }
    };

    const handleStyleChange = (property, value) => {
        const currentStyle = todo.style || {};
        const newStyle = { ...currentStyle, [property]: value };
        updateTodoStyle(dateStr, todo.id, newStyle);
    };

    const toggleStyle = (property, valueOn, valueOff) => {
        const currentStyle = todo.style || {};
        const newValue = currentStyle[property] === valueOn ? valueOff : valueOn;
        handleStyleChange(property, newValue);
    };

    const colors = ['#000000', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const sizes = [
        { label: 'S', value: '0.85rem' },
        { label: 'M', value: '1rem' },
        { label: 'L', value: '1.25rem' }
    ];

    return (
        <div
            className="todo-item"
            draggable
            onDragStart={(e) => onDragStart(e, dateStr, index)}
            onDragOver={(e) => onDragOver(e)}
            onDrop={(e) => onDrop(e, dateStr, index)}
        >
            {/* Drag Handle */}
            <span className="drag-handle" title="드래그하여 이동">⋮⋮</span>

            <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(dateStr, todo.id)}
                className="todo-checkbox"
            />
            {isEditing ? (
                <input
                    ref={inputRef}
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={handleKeyDown}
                    className="todo-edit-input"
                    style={{
                        color: todo.style?.color || 'inherit',
                        fontWeight: todo.style?.fontWeight || 'normal',
                        fontStyle: todo.style?.fontStyle || 'normal',
                        fontSize: todo.style?.fontSize || '1rem',
                    }}
                />
            ) : (
                <span
                    className={todo.completed ? 'completed' : ''}
                    onDoubleClick={handleDoubleClick}
                    style={{
                        color: todo.style?.color || 'inherit',
                        fontWeight: todo.style?.fontWeight || 'normal',
                        fontStyle: todo.style?.fontStyle || 'normal',
                        fontSize: todo.style?.fontSize || '1rem',
                        cursor: 'text',
                    }}
                    title="더블클릭하여 수정"
                >
                    {todo.text}
                </span>
            )}

            {/* Style Trigger Button */}
            <button
                className="icon-btn style-btn"
                onClick={() => setShowEditor(!showEditor)}
                title="스타일 꾸미기"
            >
                🎨
            </button>

            {/* Delete Button */}
            <button
                className="icon-btn delete-btn"
                onClick={() => deleteTodo(dateStr, todo.id)}
                title="삭제"
            >
                ×
            </button>

            {/* Style Editor Popover */}
            {showEditor && (
                <div className="style-editor" ref={editorRef}>
                    <div className="style-row">
                        {colors.map(color => (
                            <button
                                key={color}
                                className={`color-swatch ${todo.style?.color === color ? 'active' : ''}`}
                                style={{ backgroundColor: color }}
                                onClick={() => handleStyleChange('color', color)}
                            />
                        ))}
                    </div>
                    <div className="style-row">
                        <button
                            className={`style-toggle ${todo.style?.fontWeight === 'bold' ? 'active' : ''}`}
                            onClick={() => toggleStyle('fontWeight', 'bold', 'normal')}
                            style={{ fontWeight: 'bold' }}
                        >
                            B
                        </button>
                        <button
                            className={`style-toggle ${todo.style?.fontStyle === 'italic' ? 'active' : ''}`}
                            onClick={() => toggleStyle('fontStyle', 'italic', 'normal')}
                            style={{ fontStyle: 'italic' }}
                        >
                            I
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const Dashboard = () => {
    const { currentClass } = useClass();
    const { user } = useAuth();
    const { holidays } = useStudentContext();
    const rawClassId = currentClass?.id || 'default';
    const classId = user ? `${user.username}_${rawClassId}` : rawClassId;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [todos, setTodos] = useState({});
    const [weeklyNotes, setWeeklyNotes] = useState({});
    const { updateSaveStatus } = useSaveStatus();
    const [isLoaded, setIsLoaded] = useState(false);
    const [showMiniCalendar, setShowMiniCalendar] = useState(false);

    // Helper to format date as YYYY-MM-DD in local timezone
    const formatDateLocal = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Load data from localStorage on mount or when class changes
    useEffect(() => {
        const todosKey = `teacher_diary_todos_${classId}`;
        const notesKey = `teacher_diary_notes_${classId}`;

        const savedTodos = localStorage.getItem(todosKey);
        const savedNotes = localStorage.getItem(notesKey);

        if (savedTodos) {
            setTodos(JSON.parse(savedTodos));
        } else {
            setTodos({});
        }

        if (savedNotes) {
            setWeeklyNotes(JSON.parse(savedNotes));
        } else {
            setWeeklyNotes({});
        }

        setIsLoaded(true);
    }, [classId]);

    // Save data to localStorage whenever it changes
    useEffect(() => {
        if (!isLoaded) return;
        const todosKey = `teacher_diary_todos_${classId}`;
        localStorage.setItem(todosKey, JSON.stringify(todos));
        updateSaveStatus();
    }, [todos, updateSaveStatus, isLoaded, classId]);

    useEffect(() => {
        if (!isLoaded) return;
        const notesKey = `teacher_diary_notes_${classId}`;
        localStorage.setItem(notesKey, JSON.stringify(weeklyNotes));
        updateSaveStatus();
    }, [weeklyNotes, updateSaveStatus, isLoaded, classId]);

    // Helper to get the start of the week (Monday)
    const getStartOfWeek = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    const startOfWeek = getStartOfWeek(currentDate);
    const weekKey = formatDateLocal(startOfWeek);

    // Generate 7 days of the week
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        return d;
    });

    const handlePrevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const handleNextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleDateClick = (date) => {
        setCurrentDate(date);
        setShowMiniCalendar(false); // 날짜 선택 후 달력 닫기
    };

    // 공휴일 확인 함수
    const getHolidayInfo = (date) => {
        const dateStr = formatDateLocal(date);
        const holiday = holidays.find(h => {
            const holidayDate = typeof h === 'string' ? h : h.date;
            return holidayDate === dateStr;
        });
        if (!holiday) return null;
        return typeof holiday === 'string' ? { date: holiday, name: '공휴일' } : holiday;
    };

    // Todo Handlers
    const addTodo = (dateStr, text) => {
        if (!text.trim()) return;
        const newTodo = {
            id: Date.now(),
            text,
            completed: false,
            style: { color: '#000000', fontSize: '1rem', fontWeight: 'normal', fontStyle: 'normal' }
        };
        setTodos(prev => ({
            ...prev,
            [dateStr]: [...(prev[dateStr] || []), newTodo]
        }));
    };

    const toggleTodo = (dateStr, todoId) => {
        setTodos(prev => ({
            ...prev,
            [dateStr]: prev[dateStr].map(todo =>
                todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
            )
        }));
    };

    const deleteTodo = (dateStr, todoId) => {
        setTodos(prev => ({
            ...prev,
            [dateStr]: prev[dateStr].filter(todo => todo.id !== todoId)
        }));
    };

    const updateTodoStyle = (dateStr, todoId, newStyle) => {
        setTodos(prev => ({
            ...prev,
            [dateStr]: prev[dateStr].map(todo =>
                todo.id === todoId ? { ...todo, style: newStyle } : todo
            )
        }));
    };

    const updateTodoText = (dateStr, todoId, newText) => {
        setTodos(prev => ({
            ...prev,
            [dateStr]: prev[dateStr].map(todo =>
                todo.id === todoId ? { ...todo, text: newText } : todo
            )
        }));
    };

    // Drag and Drop Handlers
    const handleDragStart = (e, dateStr, index) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({ dateStr, index }));
        e.dataTransfer.effectAllowed = 'move';
        // Add a class to the dragged element for styling
        e.target.classList.add('dragging');
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // Necessary to allow dropping
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, targetDateStr, targetIndex) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;

        const { dateStr: sourceDateStr, index: sourceIndex } = JSON.parse(data);

        // Remove dragging class
        const draggingEl = document.querySelector('.dragging');
        if (draggingEl) draggingEl.classList.remove('dragging');

        // If moving within the same list
        if (sourceDateStr === targetDateStr) {
            if (sourceIndex === targetIndex) return;

            setTodos(prev => {
                const newList = [...(prev[sourceDateStr] || [])];
                const [movedItem] = newList.splice(sourceIndex, 1);
                newList.splice(targetIndex, 0, movedItem);

                return {
                    ...prev,
                    [sourceDateStr]: newList
                };
            });
        } else {
            // Moving between days (Optional, but implemented for completeness)
            setTodos(prev => {
                const sourceList = [...(prev[sourceDateStr] || [])];
                const targetList = [...(prev[targetDateStr] || [])];

                const [movedItem] = sourceList.splice(sourceIndex, 1);
                targetList.splice(targetIndex, 0, movedItem);

                return {
                    ...prev,
                    [sourceDateStr]: sourceList,
                    [targetDateStr]: targetList
                };
            });
        }
    };

    // Notes Handler
    const handleNoteChange = (text) => {
        setWeeklyNotes(prev => ({
            ...prev,
            [weekKey]: text
        }));
    };

    // Auto-refresh time display every minute
    const [, setTick] = useState(0);
    useEffect(() => {
        const timer = setInterval(() => {
            setTick(prev => prev + 1);
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // ESC key to close calendar modal
    useEffect(() => {
        const handleEscKey = (e) => {
            if (e.key === 'Escape' && showMiniCalendar) {
                setShowMiniCalendar(false);
            }
        };
        window.addEventListener('keydown', handleEscKey);
        return () => window.removeEventListener('keydown', handleEscKey);
    }, [showMiniCalendar]);

    return (
        <div className="dashboard-container">
            {/* Header & Navigation */}
            <div className="flex justify-between items-center mb-lg">
                <div className="flex items-center gap-md">
                    <h1>📅 다이어리</h1>
                    <span className="text-muted" style={{ fontSize: '1.1rem' }}>
                        {startOfWeek.toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Button
                        variant={showMiniCalendar ? "primary" : "secondary"}
                        onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                    >
                        📆 {showMiniCalendar ? '달력 닫기' : '달력 보기'}
                    </Button>
                    <div className="flex gap-sm">
                        <Button variant="secondary" onClick={handlePrevWeek}>&lt; 이전 주</Button>
                        <Button variant="secondary" onClick={handleToday}>오늘</Button>
                        <Button variant="secondary" onClick={handleNextWeek}>다음 주 &gt;</Button>
                    </div>
                </div>
            </div>

            {/* Mini Calendar Modal */}
            {showMiniCalendar && (
                <div className="calendar-modal-overlay" onClick={() => setShowMiniCalendar(false)}>
                    <div className="calendar-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="calendar-modal-close"
                            onClick={() => setShowMiniCalendar(false)}
                            title="닫기"
                        >
                            ×
                        </button>
                        <MiniCalendar todos={todos} onDateClick={handleDateClick} holidays={holidays} />
                    </div>
                </div>
            )}

            {/* Weekly Grid */}
            <div className="weekly-grid">
                {/* Weekdays (Mon-Fri) */}
                {weekDays.slice(0, 5).map((day) => {
                    const dateStr = formatDateLocal(day);
                    const isToday = formatDateLocal(new Date()) === dateStr;
                    const dayTodos = todos[dateStr] || [];
                    const dayName = day.toLocaleDateString('ko-KR', { weekday: 'short' });
                    const dateNum = day.getDate();
                    const holidayInfo = getHolidayInfo(day);

                    return (
                        <div key={dateStr} className={`day-column ${isToday ? 'today' : ''}`}>
                            <div className="day-header">
                                <span className="day-name">{dayName}</span>
                                <span className="day-num">{dateNum}</span>
                            </div>
                            {holidayInfo && (
                                <div className="holiday-badge">
                                    🎉 {holidayInfo.name}
                                </div>
                            )}

                            <div className="todo-list">
                                {Array.isArray(dayTodos) && dayTodos.map((todo, index) => (
                                    <TodoItem
                                        key={todo.id}
                                        index={index}
                                        todo={todo}
                                        dateStr={dateStr}
                                        toggleTodo={toggleTodo}
                                        deleteTodo={deleteTodo}
                                        updateTodoStyle={updateTodoStyle}
                                        updateTodoText={updateTodoText}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    />
                                ))}
                            </div>

                            <div className="add-todo-form">
                                <input
                                    type="text"
                                    placeholder="+ 할 일 추가"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addTodo(dateStr, e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}

                {/* Weekend (Sat + Sun combined) */}
                <div className="day-column weekend-column">
                    <div className="day-header weekend-header">
                        <span className="day-name">주말</span>
                        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <span>{weekDays[5].getDate()}</span>
                            <span>·</span>
                            <span>{weekDays[6].getDate()}</span>
                        </div>
                    </div>

                    <div className="weekend-content">
                        {/* Saturday */}
                        <div className="weekend-day">
                            <div className="weekend-day-label" style={{ color: '#3b82f6' }}>
                                <span>토</span>
                                <span className="weekend-date-num">{weekDays[5].getDate()}일</span>
                            </div>
                            {getHolidayInfo(weekDays[5]) && (
                                <div className="holiday-badge weekend-holiday-badge">
                                    🎉 {getHolidayInfo(weekDays[5]).name}
                                </div>
                            )}
                            <div className="todo-list weekend-todo-list">
                                {Array.isArray(todos[formatDateLocal(weekDays[5])]) && todos[formatDateLocal(weekDays[5])].map((todo, index) => (
                                    <TodoItem
                                        key={todo.id}
                                        index={index}
                                        todo={todo}
                                        dateStr={formatDateLocal(weekDays[5])}
                                        toggleTodo={toggleTodo}
                                        deleteTodo={deleteTodo}
                                        updateTodoStyle={updateTodoStyle}
                                        updateTodoText={updateTodoText}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    />
                                ))}
                            </div>
                            <div className="add-todo-form">
                                <input
                                    type="text"
                                    placeholder="+ 할 일 추가"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addTodo(formatDateLocal(weekDays[5]), e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.5rem 0' }} />

                        {/* Sunday */}
                        <div className="weekend-day">
                            <div className="weekend-day-label" style={{ color: '#ef4444' }}>
                                <span>일</span>
                                <span className="weekend-date-num">{weekDays[6].getDate()}일</span>
                            </div>
                            {getHolidayInfo(weekDays[6]) && (
                                <div className="holiday-badge weekend-holiday-badge">
                                    🎉 {getHolidayInfo(weekDays[6]).name}
                                </div>
                            )}
                            <div className="todo-list weekend-todo-list">
                                {Array.isArray(todos[formatDateLocal(weekDays[6])]) && todos[formatDateLocal(weekDays[6])].map((todo, index) => (
                                    <TodoItem
                                        key={todo.id}
                                        index={index}
                                        todo={todo}
                                        dateStr={formatDateLocal(weekDays[6])}
                                        toggleTodo={toggleTodo}
                                        deleteTodo={deleteTodo}
                                        updateTodoStyle={updateTodoStyle}
                                        updateTodoText={updateTodoText}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    />
                                ))}
                            </div>
                            <div className="add-todo-form">
                                <input
                                    type="text"
                                    placeholder="+ 할 일 추가"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            addTodo(formatDateLocal(weekDays[6]), e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Notes Section */}
            <div className="weekly-notes mt-lg">
                <Card>
                    <h3 className="mb-sm">📝 이번 주 메모 / 목표</h3>
                    <textarea
                        className="notes-textarea"
                        placeholder="이번 주에 기억해야 할 내용이나 목표를 자유롭게 작성하세요..."
                        value={weeklyNotes[weekKey] || ''}
                        onChange={(e) => handleNoteChange(e.target.value)}
                    />
                </Card>
            </div>

            <style>{`
                .weekly-grid {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 0.5rem;
                    min-height: 500px;
                }
                
                .day-column {
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative; /* For popover positioning context if needed */
                }

                .day-column.weekend-column {
                    grid-column: span 1;
                }

                .day-column.today {
                    border: 2px solid var(--color-primary);
                    background-color: #f0f9ff;
                }

                .day-header {
                    padding: 0.75rem;
                    border-bottom: 1px solid var(--color-border);
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #f8fafc;
                }

                .day-header.weekend-header {
                    background: linear-gradient(135deg, #dbeafe 0%, #fecaca 100%);
                }

                .day-column.today .day-header {
                    background: #e0f2fe;
                    color: var(--color-primary);
                }

                .holiday-badge {
                    background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
                    color: #991b1b;
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.35rem 0.6rem;
                    border-radius: 6px;
                    margin: 0.5rem 0.75rem 0.25rem 0.75rem;
                    text-align: center;
                    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
                    border: 1px solid #fecaca;
                }

                .weekend-holiday-badge {
                    margin: 0.25rem 0.5rem;
                    font-size: 0.7rem;
                    padding: 0.25rem 0.5rem;
                }

                .weekend-content {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 0.5rem;
                }

                .weekend-day {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .weekend-day-label {
                    font-weight: 600;
                    font-size: 0.85rem;
                    padding: 0.25rem 0.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .weekend-date-num {
                    font-size: 0.75rem;
                    opacity: 0.7;
                }

                .weekend-todo-list {
                    padding: 0;
                    flex: 1;
                }

                .todo-list {
                    flex: 1;
                    padding: 0.5rem;
                    overflow-y: auto;
                    overflow-x: visible; /* Allow popover to show */
                }

                .todo-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.25rem 0.25rem 0.25rem 12px;
                    font-size: 1rem;
                    position: relative;
                    cursor: grab;
                    transition: background-color 0.2s, transform 0.2s;
                    border-radius: 4px;
                    width: 100%;
                    min-width: 0;
                }

                .todo-item.dragging {
                    opacity: 0.4;
                    background-color: #e0e7ff;
                    cursor: grabbing;
                    transform: scale(1.02);
                    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                }

                .todo-item:hover {
                    background-color: #f8fafc;
                }

                .todo-list.drag-over {
                    background-color: #dbeafe;
                    border: 2px dashed var(--color-primary);
                    border-radius: 8px;
                }

                .drag-handle {
                    position: absolute;
                    left: -1px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--color-text-muted);
                    cursor: grab;
                    font-size: 0.85rem;
                    line-height: 1;
                    opacity: 0.25;
                    transition: opacity 0.2s, color 0.2s, transform 0.2s;
                    user-select: none;
                    width: 12px;
                    text-align: center;
                }

                .todo-item:hover .drag-handle {
                    opacity: 0.6;
                }

                .todo-item:hover .drag-handle:hover {
                    opacity: 1;
                    color: var(--color-primary);
                    transform: translateY(-50%) scale(1.1);
                }

                .drag-handle:active {
                    cursor: grabbing;
                }

                .todo-item .todo-checkbox {
                    cursor: pointer;
                    width: 16px;
                    height: 16px;
                    min-width: 16px;
                    flex-shrink: 0;
                    align-self: center;
                    accent-color: var(--color-primary);
                }

                .todo-edit-input {
                    flex: 1;
                    border: 1px solid var(--color-primary);
                    background: white;
                    padding: 0.2rem 0.4rem;
                    border-radius: 4px;
                    outline: none;
                    font-family: inherit;
                    font-size: 1rem;
                    line-height: 1.5;
                    width: 0;
                    min-width: 0;
                    max-width: 100%;
                }

                .todo-item span {
                    flex: 1;
                    word-break: break-all;
                    line-height: 1.5;
                    text-align: left;
                }

                .todo-item span.completed {
                    text-decoration: line-through;
                    color: var(--color-text-muted);
                    opacity: 0.7;
                }

                .icon-btn {
                    border: none;
                    background: none;
                    cursor: pointer;
                    font-size: 1rem;
                    line-height: 1;
                    padding: 0.2rem;
                    opacity: 0;
                    transition: opacity 0.2s;
                    color: var(--color-text-muted);
                    position: absolute;
                    top: 2px;
                }

                .delete-btn {
                    right: 0;
                }

                .style-btn {
                    right: 24px;
                }

                .todo-item:hover .icon-btn {
                    opacity: 1;
                }

                .icon-btn:hover {
                    color: var(--color-primary);
                    background-color: #f1f5f9;
                    border-radius: 4px;
                }
                
                .delete-btn:hover {
                    color: var(--color-error);
                }

                /* Style Editor Popover */
                .style-editor {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: white;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-md);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                    padding: 0.75rem;
                    z-index: 50;
                    min-width: 180px;
                }

                .style-row {
                    display: flex;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                    align-items: center;
                }

                .style-row:last-child {
                    margin-bottom: 0;
                }

                .color-swatch {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 1px solid #e2e8f0;
                    cursor: pointer;
                    padding: 0;
                }

                .color-swatch.active {
                    border: 2px solid var(--color-primary);
                    transform: scale(1.1);
                }

                .style-toggle {
                    border: 1px solid var(--color-border);
                    background: white;
                    border-radius: 4px;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    font-size: 0.8rem;
                }

                .style-toggle.active {
                    background-color: var(--color-primary);
                    color: white;
                    border-color: var(--color-primary);
                }

                .size-selector {
                    display: flex;
                    border: 1px solid var(--color-border);
                    border-radius: 4px;
                    overflow: hidden;
                }

                .size-btn {
                    border: none;
                    background: white;
                    padding: 0.2rem 0.4rem;
                    font-size: 0.75rem;
                    cursor: pointer;
                    border-right: 1px solid var(--color-border);
                }

                .size-btn:last-child {
                    border-right: none;
                }

                .size-btn.active {
                    background-color: #f1f5f9;
                    font-weight: bold;
                }

                .add-todo-form {
                    padding: 0.5rem;
                    border-top: 1px solid var(--color-border);
                }

                .add-todo-form input {
                    width: 100%;
                    border: none;
                    background: transparent;
                    font-size: 1rem;
                    line-height: 1.5;
                    outline: none;
                }

                .add-todo-form input::placeholder {
                    color: var(--color-text-muted);
                    opacity: 0.7;
                }

                .notes-textarea {
                    width: 100%;
                    min-height: 150px;
                    padding: 1rem;
                    border: 1px solid var(--color-border);
                    border-radius: var(--radius-sm);
                    resize: vertical;
                    font-family: inherit;
                    font-size: 1rem;
                    line-height: 1.5;
                    outline: none;
                }

                .notes-textarea:focus {
                    border-color: var(--color-primary);
                    box-shadow: 0 0 0 2px var(--color-primary-light);
                }

                @media (max-width: 1024px) {
                    .weekly-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }

                @media (max-width: 640px) {
                    .weekly-grid {
                        grid-template-columns: 1fr;
                    }
                }

                /* Calendar Modal Styles */
                .calendar-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                .calendar-modal-content {
                    position: relative;
                    background: white;
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                    max-width: 90vw;
                    max-height: 90vh;
                    overflow: auto;
                    animation: slideUp 0.3s ease-out;
                }

                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }

                .calendar-modal-close {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    font-size: 2rem;
                    cursor: pointer;
                    color: var(--color-text-muted);
                    line-height: 1;
                    padding: 0.25rem;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background-color 0.2s, color 0.2s;
                }

                .calendar-modal-close:hover {
                    background-color: #f1f5f9;
                    color: var(--color-text);
                }

                @media (max-width: 640px) {
                    .calendar-modal-content {
                        padding: 1rem;
                        max-width: 95vw;
                    }

                    .calendar-modal-close {
                        top: 0.5rem;
                        right: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Dashboard;
