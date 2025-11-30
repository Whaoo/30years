export const birthdays = [
    { name: 'Nathalie', date: '13-11' },
    { name: 'Eddy', date: '12-04' },
    { name: 'Théophane', date: '16-03' },
    { name: 'Alice', date: '10-12' },
    { name: 'Adele', date: '07-08' },
    { name: 'Dorian', date: '01-07' },
    { name: 'Hugo', date: '07-08' },
    { name: 'Julian', date: '15-08' },
    { name: 'Louis', date: '19-09' },
    { name: 'Mélissa', date: '16-09' },
    { name: 'Noémie', date: '14-06' },
    { name: 'Clément', date: '30-01' },
    { name: 'Sophie', date: '02-07' },
    { name: 'Sarah', date: '27-12' },
    { name: 'Benjamin', date: '29-04' },
    { name: 'Paul Henri', date: '08-05' },
    { name: 'Pierre', date: '17-05' },
    { name: 'Claire', date: '19-08' },
    { name: 'Guillaume', date: '31-10' },
    { name: 'Soizic', date: '05-12' },
    { name: 'Thomas', date: '30-04' },
    { name: 'Laetitia', date: '17-06' },
    { name: 'Jeremy', date: '25-01' },
    { name: 'Thibault', date: '03-12' },
    { name: 'Maelys', date: '29-12' },
    { name: 'Brieuc', date: '26-03' },
    { name: 'Aicha', date: '14-07' },
    { name: 'Auderic', date: '11-12' },
    { name: 'Noël', date: '25-12' }
];

export function getNextBirthday(dateStr) {
    const now = new Date();
    const [day, month] = dateStr.split('-').map(Number);
    let nextBirthday = new Date(now.getFullYear(), month - 1, day);

    // Reset time to midnight for accurate day calculation
    nextBirthday.setHours(0, 0, 0, 0);
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0, 0, 0, 0);

    if (nextBirthday < nowMidnight) {
        nextBirthday.setFullYear(now.getFullYear() + 1);
    }

    return nextBirthday;
}

export function getSortedBirthdays() {
    const now = new Date();
    const birthdaysWithTime = birthdays.map(birthday => {
        const nextBirthday = getNextBirthday(birthday.date);
        const remainingTime = nextBirthday.getTime() - now.getTime();
        return { ...birthday, nextBirthday, remainingTime };
    });

    return birthdaysWithTime.sort((a, b) => a.remainingTime - b.remainingTime);
}
