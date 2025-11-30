// Advent calendar data: messages and chocolate shapes for each day
export const adventData = [
    {
        day: 1,
        message: "🎄 Welcome to December! Let the festive countdown begin!",
        chocolate: "🍫" // Classic chocolate bar
    },
    {
        day: 2,
        message: "✨ Every birthday is a gift. Cherish the moments!",
        chocolate: "🧁" // Cupcake chocolate
    },
    {
        day: 3,
        message: "🎅 Ho ho ho! Santa is starting his journey!",
        chocolate: "🍬" // Candy chocolate
    },
    {
        day: 4,
        message: "⭐ Make a wish! The stars are brighter in December.",
        chocolate: "⭐" // Star-shaped chocolate
    },
    {
        day: 5,
        message: "🎁 The best gift is being together with loved ones.",
        chocolate: "🎁" // Gift box chocolate
    },
    {
        day: 6,
        message: "❄️ Each snowflake is unique, just like every birthday!",
        chocolate: "❄️" // Snowflake chocolate
    },
    {
        day: 7,
        message: "🔔 Jingle all the way! Keep spreading joy and laughter.",
        chocolate: "🔔" // Bell-shaped chocolate
    },
    {
        day: 8,
        message: "🌟 You're a shining star! Never forget how special you are.",
        chocolate: "🌟" // Glowing star chocolate
    },
    {
        day: 9,
        message: "🎊 Celebrate every moment, big or small!",
        chocolate: "🎊" // Party chocolate
    },
    {
        day: 10,
        message: "🕯️ Light up the world with your smile today!",
        chocolate: "🕯️" // Candle chocolate
    },
    {
        day: 11,
        message: "🎵 Life is a song. Sing it with joy!",
        chocolate: "🎵" // Music note chocolate
    },
    {
        day: 12,
        message: "🌲 Like a pine tree, stand tall and stay evergreen!",
        chocolate: "🌲" // Christmas tree chocolate
    },
    {
        day: 13,
        message: "💝 Love and kindness are the sweetest gifts of all.",
        chocolate: "💝" // Heart chocolate
    },
    {
        day: 14,
        message: "🎪 Life is a beautiful circus. Enjoy the show!",
        chocolate: "🎪" // Fun chocolate
    },
    {
        day: 15,
        message: "🌈 After every storm comes a rainbow. Keep hoping!",
        chocolate: "🌈" // Rainbow chocolate
    },
    {
        day: 16,
        message: "🎂 Another year older, another year wiser!",
        chocolate: "🎂" // Cake chocolate
    },
    {
        day: 17,
        message: "🦌 Rudolph's nose shines bright, just like your spirit!",
        chocolate: "🦌" // Reindeer chocolate
    },
    {
        day: 18,
        message: "🎀 You're a gift to this world. Unwrap your potential!",
        chocolate: "🎀" // Ribbon chocolate
    },
    {
        day: 19,
        message: "🏔️ Reach for the peaks! Great things await you.",
        chocolate: "🏔️" // Mountain chocolate
    },
    {
        day: 20,
        message: "🎺 Announce your dreams to the world!",
        chocolate: "🎺" // Trumpet chocolate
    },
    {
        day: 21,
        message: "🌙 Dream big! The longest night brings the brightest stars.",
        chocolate: "🌙" // Moon chocolate
    },
    {
        day: 22,
        message: "🎪 Three more days! The magic is building!",
        chocolate: "🍭" // Lollipop chocolate
    },
    {
        day: 23,
        message: "✨ Almost there! Tomorrow is Christmas Eve!",
        chocolate: "✨" // Sparkle chocolate
    },
    {
        day: 24,
        message: "🎄 Merry Christmas Eve! Santa arrives tomorrow! 🎅",
        chocolate: "🎅" // Santa chocolate
    },
    {
        day: 25,
        message: "🎅 MERRY CHRISTMAS! Have a wonderful day! 🎁",
        chocolate: "👑" // Crown/Special
    }
];

// Get current day in December (1-25, or 0 if not December 1-25)
export function getCurrentDecemberDay() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate(); // 1-31

    // For testing: return a specific day (ENABLE FOR TESTING)
    return 1;

    // Production code (uncomment when ready for December):
    // if (month === 11 && day >= 1 && day <= 25) {
    //     return day;
    // }
    // return 0; // Not in advent period
}
