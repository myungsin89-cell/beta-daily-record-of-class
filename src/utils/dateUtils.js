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
        const prevDate = new Date(currentGroup[currentGroup.length - 1]);
        const currDate = new Date(sortedDates[i]);

        const diffTime = Math.abs(currDate - prevDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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
 * Converts date string to Korean format (M.D)
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {string} - Korean formatted date (M.D)
 */
export const formatDateKorean = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}.${day}`;
};

/**
 * Checks if a date is a weekend (Saturday or Sunday)
 * @param {string} dateString - Date string (YYYY-MM-DD)
 * @returns {boolean} - True if weekend
 */
export const isWeekend = (dateString) => {
    const date = new Date(dateString);
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
    const start = new Date(startDate);
    const end = new Date(endDate);
    let schoolDays = 0;

    const currentDate = new Date(start);
    while (currentDate <= end) {
        const dateString = currentDate.toISOString().split('T')[0];

        // Count only if not weekend and not holiday
        if (!isWeekend(dateString) && !isHoliday(dateString, holidays)) {
            schoolDays++;
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return schoolDays;
};
