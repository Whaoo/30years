const birthdays = [
    { name: 'Nathalie', date: '13-11' }, // 13th November
    { name: 'Eddy', date: '12-04' }, // 12th April
    { name: 'Théophane', date: '16-03' }, // 16th March
    { name: 'Alice', date: '10-12' }, // 10th December
    { name: 'Aziz', date: '05-10' }, // 5th October
    { name: 'Dorian', date: '01-07' }, // 1st July
    { name: 'Hugo', date: '07-08' }, // 7th August
    { name: 'Julian', date: '15-08' }, // 15th August
    { name: 'Louis', date: '19-09' }, // 19th September
    { name: 'Mélissa', date: '16-09' }, // 16th September
    { name: 'Noémie', date: '14-06' }, // 14th June
    { name: 'Clément', date: '30-09' }, // 30th September
    { name: 'Sophie', date: '02-07' }, // 02th July
    { name: 'Sarah', date: '27-12' }, // 
    { name: 'Benjamin', date: '29-04' }, // 
    { name: 'Paul Henri', date: '08-05' }, // 
    { name: 'Pierre', date: '17-05' }, // 
    { name: 'Claire', date: '19-08' }, // 
    { name: 'Guillaume', date: '31-10' }, // 
    { name: 'Soizic', date: '05-12' }, // 
    { name: 'Thomas', date: '30-04' }, // 
    { name: 'Laetitia', date: '17-06' }, // 
    { name: 'Jeremy', date: '25-01' }, // 
    { name: 'Sylvain', date: '25-11' }, // 
    { name: 'Thibault', date: '03-12' }, // 
    { name : 'Khaled', date : '17-08'},
    { name : 'Brieuc', date : '26-03'},
];

function getNextBirthday(dateStr) {
    const now = new Date();
    const [day, month] = dateStr.split('-').map(Number);
    let nextBirthday = new Date(now.getFullYear(), month - 1, day);

    if (nextBirthday < now) {
        nextBirthday.setFullYear(now.getFullYear() + 1);
    }

    return nextBirthday;
}

function checkTodayBirthday(birthdays) {
    const now = new Date();
    const today = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const names = [];

    for (const birthday of birthdays) {
        if (birthday.date === today) {
            names.push(birthday.name);
        }
    }

    return { names, isToday: names.length > 0 };
}

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / (60 * 60 * 24));
    const hours = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
    const min = Math.floor((totalSeconds % (60 * 60)) / 60);
    
    if (days === 0 && hours === 0) {
        return `${min}min`;
    } else if (days === 0 && hours > 0) {
        return `${hours}h`;
    } 
    const days2 = days+1
    return `${days2}j`;
}

function updateCountdowns() {
    const now = new Date().getTime();
    const countdowns = birthdays.map(birthday => {
        const nextBirthday = getNextBirthday(birthday.date);
        const remainingTime = nextBirthday.getTime() - now;
        return { ...birthday, remainingTime };
    });

    // Group birthdays by remaining time
    const groupedCountdowns = countdowns.reduce((acc, curr) => {
        if (!acc[curr.remainingTime]) {
            acc[curr.remainingTime] = [];
        }
        acc[curr.remainingTime].push(curr.name);
        return acc;
    }, {});

    // Sort groups by remaining time
    const sortedTimes = Object.keys(groupedCountdowns).sort((a, b) => a - b);

    const mainCountdown = document.getElementById('main-countdown');
    const shortestCountdowns = document.getElementById('shortest-countdowns');

    // Check if the closest birthday is today
    const mainTime = sortedTimes[0];
    const isToday = mainTime <= 0;

    const todayBirthday = checkTodayBirthday(birthdays);


    if (todayBirthday.isToday) {
        mainCountdown.innerHTML = `
            <div class="main-countdown-time">🎉 Happy Birthday!</div>
            <div class="main-countdown-name">${todayBirthday.names.join(' & ')}</div>
        `;
    } else {
        // Display the main countdown
        mainCountdown.innerHTML = `
            <div class="main-countdown-time">${formatTime(mainTime)}</div>
            <div class="main-countdown-name">${groupedCountdowns[mainTime].join(' & ')}</div>
        `;
    }

    // Display the shortest countdowns
    shortestCountdowns.innerHTML = '<div class="header">Soon...</div>';
    for (let i = todayBirthday.isToday ? 0 : 1; i < (todayBirthday.isToday ? 2 : 4); i++) {
        const time = sortedTimes[i];
        if (time) {
            const div = document.createElement('div');
            div.className = 'countdown';
            div.innerHTML = `
                <div class="countdown-time">${formatTime(time)}</div>
                <div class="countdown-name">${groupedCountdowns[time].join(' & ')}</div>
            `;
            shortestCountdowns.appendChild(div);
        }
    }
}


setInterval(updateCountdowns, 1000);
updateCountdowns(); // Initial call to display countdowns immediately


function getFrenchDayNames() {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const today = new Date();
    const currentDay = today.getDay();
    
    const frenchDays = [
        days[currentDay],
        days[(currentDay + 1) % 7],
        days[(currentDay + 2) % 7]
    ];

    return frenchDays;
}

async function displayWeatherEmote() {


    const { hourlyData, dailyData } = await fetchWeather();

    const morningEmote = getWeatherEmote(hourlyData.hourly.weathercode[8]); // Example: 6 AM
    const afternoonEmote = getWeatherEmote(hourlyData.hourly.weathercode[14]); // Example: 12 PM
    const eveningEmote = getWeatherEmote(hourlyData.hourly.weathercode[20]); // Example: 6 PM

    const todayEmote = getWeatherEmote(dailyData.daily.weathercode[0]); // today
    const tomorrowEmote = getWeatherEmote(dailyData.daily.weathercode[1]); // tomorrow
    const dayAftTomorrowEmote = getWeatherEmote(dailyData.daily.weathercode[2]); //day after tomorrow

    // Get French day names
    const frenchDays = getFrenchDayNames();

    // Update the weather emote element
    const weatherEmoteElement = document.getElementById('weather-emote');
    weatherEmoteElement.innerHTML = `
        <div class="weather-info">
            <div class="weather-details">
                <div>Aujourd'hui: ${todayEmote}</div>
                <div>${frenchDays[1]}: ${tomorrowEmote}</div>
                <div>${frenchDays[2]}: ${dayAftTomorrowEmote}</div>
            </div>
        </div>
    `;

    // Update the greeting element
    const greetingElement = document.getElementById('greeting');
    const today = new Date();
    const day = today.toLocaleDateString('fr-FR', { weekday: 'long' });
    const date = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    greetingElement.innerHTML = `
        <div>${day} ${date}. 😊</div>
        <div>Matin ${morningEmote}, Après-midi ${afternoonEmote}, Soir ${eveningEmote}</div>
    `;

    // Update the greeting element
    const greetingElement2 = document.getElementById('greeting2');
    greetingElement2.innerHTML = `
        <div>Bravo aux coureuses de la parisienne et Thibault 🎉</div>
    `;
}

// Function to fetch weather data from Open-Meteo API
async function fetchWeather() {
    const hourlyResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.91887379083734&longitude=2.3525760991500366&timezone=Europe/Berlin&hourly=weathercode');
    const hourlyData = await hourlyResponse.json();

    const dailyResponse = await fetch('https://api.open-meteo.com/v1/forecast?latitude=48.91887379083734&longitude=2.3525760991500366&timezone=Europe/Berlin&daily=weathercode');
    const dailyData = await dailyResponse.json();

    return { hourlyData, dailyData };
}

// Function to get weather emote based on weather code
function getWeatherEmote(weatherCode) {
    const weatherEmotes = {
        0: '☀️', // Clear sky
        1: '🌤️', // Mainly clear
        2: '⛅', // Partly cloudy
        3: '☁️', // Overcast
        45: '🌫️', // Fog
        48: '🌫️', // Depositing rime fog
        51: '🌦️', // Drizzle: Light
        53: '🌦️', // Drizzle: Moderate
        55: '🌦️', // Drizzle: Dense intensity
        56: '🌧️', // Freezing Drizzle: Light
        57: '🌧️', // Freezing Drizzle: Dense intensity
        61: '🌧️', // Rain: Slight
        63: '🌧️', // Rain: Moderate
        65: '🌧️', // Rain: Heavy intensity
        66: '🌨️', // Freezing Rain: Light
        67: '🌨️', // Freezing Rain: Heavy intensity
        71: '❄️', // Snow fall: Slight
        73: '❄️', // Snow fall: Moderate
        75: '❄️', // Snow fall: Heavy intensity
        77: '❄️', // Snow grains
        80: '🌧️', // Rain showers: Slight
        81: '🌧️', // Rain showers: Moderate
        82: '🌧️', // Rain showers: Violent
        85: '❄️', // Snow showers slight
        86: '❄️', // Snow showers heavy
        95: '⛈️', // Thunderstorm: Slight or moderate
        96: '⛈️', // Thunderstorm with slight hail
        99: '⛈️', // Thunderstorm with heavy hail
    };
    return weatherEmotes[weatherCode] || '❓';
}

// Call the function to display weather emotes
displayWeatherEmote();
