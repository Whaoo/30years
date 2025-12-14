// Advent calendar data: messages and chocolate shapes for each day
export const adventData = [
    {
        day: 1,
        message: "🎄 Bienvenue en décembre ! Le compte à rebour est lancé !",
        chocolate: "🎄" // Classic chocolate bar
    },
    {
        day: 2,
        message: "✨ Les étoiles filantes ne sont pas visible depuis Paris.",
        chocolate: "✨" // Cupcake chocolate
    },
    {
        day: 3,
        message: "🎁 C'est l'anniversaire de Thibault - Pensez à le croissanter si possible.",
        chocolate: "🎁" // Gift box chocolate
    }
    ,
    {
        day: 4,
        message: "⭐ Le père Noël s'appelle Kanakaloka à Hawaii - https://www.youtube.com/watch?v=aAkMkVFwAoo",
        chocolate: "⭐" // Star-shaped chocolate
    },
    {
        day: 5,
        message: "🎅 Le Rubik's cube était le jouet le plus vendu en 1980 - https://www.youtube.com/watch?v=v5ryZdpEHqM",
        chocolate: "🍬" // Candy chocolate
    },
    {
        day: 6,
        message: "❄️ Each snowflake is unique - and i'm not talking about Snowpark queries! - https://www.youtube.com/watch?v=E8gmARGvPlI",
        chocolate: "❄️" // Snowflake chocolate
    },
    {
        day: 7,
        message: "🔔 La première guirelande électrique a été inventée par Edward Hibberd Johnson en 1882 - https://www.youtube.com/watch?v=sE3uRRFVsmc",
        chocolate: "🔔" // Bell-shaped chocolate
    },
    {
        day: 8,
        message: "🌟 'Christmass'est aussi une île - https://www.youtube.com/watch?v=V-PD5iz7qdE",
        chocolate: "🌟" // Glowing star chocolate
    },
    {
        day: 9,
        message: "🎊 Celebrate every moment, big or small! - https://www.youtube.com/watch?v=d82Xzey-4B4",
        chocolate: "🎊" // Party chocolate
    },
    {
        day: 10,
        message: "🕯️ Light up the world with your smile today! - https://www.youtube.com/watch?v=vWw9AEe0i38",
        chocolate: "🕯️" // Candle chocolate
    },
    {
        day: 11,
        message: "🎵 Diner de roi à la cantine",
        chocolate: "🎵" // Music note chocolate
    },
    {
        day: 12,
        message: "🌲 Grinch a un coeur trop petit pour aimer Noël - https://www.youtube.com/watch?v=nlR0MkrRklg",
        chocolate: "🌲" // Christmas tree chocolate
    },
    {
        day: 13,
        message: "💝 Chocolat chaud sous la couette pour ce temps gris.",
        chocolate: "💝" // Heart chocolate
    },
    {
        day: 14,
        message: "🎪 Life is a beautiful circus. Enjoy the show!",
        chocolate: "🎪" // Fun chocolate
    },
    {
        day: 15,
        message: "😏 Les LEAKS!",
        chocolate: "😏" // Rainbow chocolate
    },
    {
        day: 16,
        message: "🍵 The tea!",
        chocolate: "🍵" // Tea hot chocolate
    },
    {
        day: 17,
        message: "🦌",
        chocolate: "🦌" // Reindeer chocolate
    },
    {
        day: 18,
        message: "🎀",
        chocolate: "🎀" // Ribbon chocolate
    },
    {
        day: 19,
        message: "🏔️",
        chocolate: "🏔️" // Mountain chocolate
    },
    {
        day: 20,
        message: "🎺",
        chocolate: "🎺" // Trumpet chocolate
    },
    {
        day: 21,
        message: "🌙",
        chocolate: "🌙" // Moon chocolate
    },
    {
        day: 22,
        message: "🍭",
        chocolate: "🍭" // Lollipop chocolate
    },
    {
        day: 23,
        message: "✨ ALORS PEUT-ETRE! - ",
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
        chocolate: "🎄" // Crown/Special
    }
];

// Get current day in December (1-25, or 0 if not December 1-25)
export function getCurrentDecemberDay() {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const day = now.getDate(); // 1-31

    // For testing: return a specific day (ENABLE FOR TESTING)
    // return 25;

    // Production code (uncomment when ready for December):
    if (month === 11 && day >= 1 && day <= 25) {
        return day;
    }
    return 0; // Not in advent period
}
