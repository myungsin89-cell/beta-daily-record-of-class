/**
 * Groups consecutive dates into range objects.
 * @param {string[]} dates - Array of date strings (YYYY-MM-DD).
 * @returns {object[]} - Array of grouped date objects.
 */
export const groupConsecutiveDates = (dates) => {
    if (!dates || !dates.length) return [];

    const sortedDates = [...dates].sort();
    const groups = [];
    let currentGroup = [sortedDates[0]];

    for (let i = 1; i < sortedDates.length; i++) {
        const prevDateStr = currentGroup[currentGroup.length - 1];
        const currDateStr = sortedDates[i];

        // Parse dates as local dates (not UTC) to avoid timezone issues
        const [prevYear, prevMonth, prevDay] = prevDateStr.split('-').map(Number);
        const [currYear, currMonth, currDay] = currDateStr.split('-').map(Number);

        const prevDate = new Date(prevYear, prevMonth - 1, prevDay);
        const currDate = new Date(currYear, currMonth - 1, currDay);

        // Calculate difference in days
        const diffTime = currDate.getTime() - prevDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            currentGroup.push(sortedDates[i]);
        } else {
            groups.push(currentGroup);
            currentGroup = [sortedDates[i]];
        }
    }
    groups.push(currentGroup);

    return groups.map(group => ({
        startDate: group[0],
        endDate: group[group.length - 1],
        totalDays: group.length,
        allDates: group
    }));
};

/**
 * Converts Date object to YYYY-MM-DD string in local timezone
 * @param {Date} date - Date object
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Converts date string to Korean format (M.D)
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} - Korean formatted date (M.D)
 */
export const formatDateKorean = (dateString) => {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    return `${month}.${day}`;
};

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {boolean} - True if weekend
 */
export const isWeekend = (dateString) => {
    // Parse as local date to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
};

/**
 * Checks if a date is a holiday
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @param {string[]} holidays - Array of holiday date strings
 * @returns {boolean} - True if holiday
 */
export const isHoliday = (dateString, holidays = []) => {
    return holidays.includes(dateString);
};

/**
 * Calculates school days (excluding weekends and holidays)
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string[]} holidays - Array of holiday date strings
 * @returns {number} - Number of school days
 */
export const calculateSchoolDays = (startDate, endDate, holidays = []) => {
    // Parse as local dates to avoid timezone issues
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    let schoolDays = 0;

    const currentDate = new Date(start);
    while (currentDate <= end) {
        // Format date as YYYY-MM-DD
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // Count only if not weekend and not holiday
        if (!isWeekend(dateString) && !isHoliday(dateString, holidays)) {
            schoolDays++;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return schoolDays;
};
