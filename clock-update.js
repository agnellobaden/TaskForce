// Dashboard Clock and Date Update Script
// Updates the clock and date cards in real-time

function updateDashboardClockAndDate() {
    const now = new Date();

    // Update Clock Section
    const clockValues = document.querySelectorAll('.clock-value-dynamic');
    const clockWeekdays = document.querySelectorAll('.clock-weekday-dynamic');
    const clockSeconds = document.querySelectorAll('.clock-seconds-dynamic');

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

    clockValues.forEach(el => el.textContent = `${hours}:${minutes}`);
    clockSeconds.forEach(el => el.textContent = seconds);
    clockWeekdays.forEach(el => el.textContent = weekdays[now.getDay()]);

    // Update Date Section
    const dateValues = document.querySelectorAll('.clock-date-dynamic');
    const yearValues = document.querySelectorAll('.clock-year-dynamic');
    const fullDateWeekdays = document.querySelectorAll('.clock-full-date-dynamic');

    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');

    dateValues.forEach(el => el.textContent = `${day}.${month}.`);
    yearValues.forEach(el => el.textContent = now.getFullYear());
    fullDateWeekdays.forEach(el => el.textContent = `${now.getDate()}. ${months[now.getMonth()]}`);

    // Also update header clock if it exists
    const headerClock = document.querySelector('.clock-time');
    if (headerClock) {
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        headerClock.textContent = `${hours}:${minutes}`;
    }

    const headerDate = document.getElementById('headerDate');
    if (headerDate) {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        headerDate.textContent = `${day}.${month}.`;
    }
}

// Update immediately on load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboardClockAndDate();

    // Update every second for smooth clock animation
    setInterval(updateDashboardClockAndDate, 1000);
});

// Also update when page becomes visible (for mobile/tab switching)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateDashboardClockAndDate();
    }
});
