// Icônes au trait (style Lucide), sans dépendance
const CLOUD_BASE = 'M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2';

const PATHS = {
    lock: (
        <>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
    ),
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </>
    ),
    moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
    cloud: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />,
    'cloud-sun': (
        <>
            <path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.95 12.65a4 4 0 0 0-5.93-4.13" />
            <path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z" />
        </>
    ),
    fog: (
        <>
            <path d={CLOUD_BASE} />
            <path d="M16 17H7M17 21H9" />
        </>
    ),
    rain: (
        <>
            <path d={CLOUD_BASE} />
            <path d="M16 14v6M8 14v6M12 16v6" />
        </>
    ),
    snow: (
        <>
            <path d={CLOUD_BASE} />
            <path d="M8 15h.01M8 19h.01M12 17h.01M12 21h.01M16 15h.01M16 19h.01" />
        </>
    ),
    storm: (
        <>
            <path d="M6 16.33A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.97" />
            <path d="m13 12-3 5h4l-3 5" />
        </>
    ),
    play: <path d="M7 4.5v15l12.5-7.5Z" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    trophy: (
        <>
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0Z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
        </>
    ),
    snowball: (
        <>
            <circle cx="12" cy="12" r="8" />
            <path d="M9 10h.01M14 9h.01M12 14h.01M15.5 13.5h.01" />
        </>
    ),
    fish: (
        <>
            <path d="M6.5 12c3-5 9-6 13 0-4 6-10 5-13 0Z" />
            <path d="M6.5 12 2.5 8.5v7Z" />
            <path d="M16 11h.01" />
        </>
    ),
    jump: (
        <>
            <path d="M3 20h18" />
            <path d="M5 16c2.5-7 8-9.5 12.5-7.5" />
            <path d="m15 5.5 3 3-4 1.5" />
        </>
    ),
    cards: (
        <>
            <rect x="3" y="6" width="11" height="14" rx="2" />
            <path d="M10 4h9a2 2 0 0 1 2 2v12" />
        </>
    ),
    cube: (
        <>
            <path d="M12 3 4 7.5v9L12 21l8-4.5v-9Z" />
            <path d="M4 7.5 12 12l8-4.5M12 12v9" />
        </>
    ),
    umbrella: (
        <>
            <path d="M3 12a9 9 0 0 1 18 0Z" />
            <path d="M12 12v6a2 2 0 0 1-4 0" />
        </>
    ),
    curling: (
        <>
            <path d="M4 15.5c0-2.5 3.6-4.5 8-4.5s8 2 8 4.5S16.4 20 12 20s-8-2-8-4.5Z" />
            <path d="M9 11V8a2 2 0 0 1 2-2h5" />
        </>
    ),
    sled: (
        <>
            <path d="M3 17h15a3 3 0 0 0 3-3" />
            <path d="M6 17v-4h10v4" />
            <path d="M9 13V9h4v4" />
        </>
    ),
    slide: (
        <>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M7 12h10m-3-3 3 3-3 3" />
        </>
    ),
    tower: (
        <>
            <rect x="7" y="15" width="10" height="6" rx="3" />
            <rect x="8" y="9" width="8" height="6" rx="3" />
            <circle cx="12" cy="6" r="3" />
        </>
    ),
    music: (
        <>
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
        </>
    ),
    castle: (
        <>
            <path d="M3 21V9h3v2h3V9h3v2h3V9h3v2h3V9" />
            <path d="M3 21h18V9" />
            <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
        </>
    ),
    house: (
        <>
            <path d="M3 11 12 4l9 7" />
            <path d="M5 10v11h14V10" />
            <path d="M15 6V3h3v5.5" />
            <path d="M10 21v-5h4v5" />
        </>
    ),
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
        </>
    ),
    plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
    car: (
        <>
            <path d="M5 17h14v-5l-2-5H7l-2 5v5Z" />
            <circle cx="8" cy="17" r="2" />
            <circle cx="16" cy="17" r="2" />
            <path d="M5 12h14" />
        </>
    ),
    grid: (
        <>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
    ),
    history: (
        <>
            <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
            <path d="M3 3v5h5M12 7v5l3.5 2" />
        </>
    ),
    lantern: (
        <>
            <path d="M8 4h8M9 4l-1 3h8l-1-3M7 7h10v2H7zM8 9l1 7h6l1-7M6 16h12M10 16v3h4v-3M8 21h8" />
        </>
    ),
    tree: (
        <>
            <path d="M12 3l-4 5h2.5L7 12.5h3L6 17h12l-4-4.5h3L13.5 8H16zM11 17v4h2v-4" />
        </>
    ),
    flag: (
        <>
            <path d="M6 22V3" />
            <path d="M6 3l11 4-11 4" />
            <ellipse cx="13" cy="20" rx="5" ry="1.6" />
        </>
    ),
    balloon: (
        <>
            <path d="M12 2a7 7 0 0 0-7 7c0 3.5 3 6.5 5 8h4c2-1.5 5-4.5 5-8a7 7 0 0 0-7-7Z" />
            <path d="M10 17l.5 3h3l.5-3M12 2c-2 2-2.5 4.5-2.5 7s.5 5.5 2.5 8c2-2.5 2.5-5.5 2.5-8S14 4 12 2Z" />
        </>
    ),
    sail: (
        <>
            <path d="M12 3v14M12 3l7 12h-7M12 6 6 15h6" />
            <path d="M3 18h18l-2 3H5Z" />
        </>
    ),
    scooter: (
        <>
            <circle cx="6" cy="17" r="2.5" />
            <circle cx="18" cy="17" r="2.5" />
            <path d="M8.5 17h6l3-7h-3M15 6h3l1 4M4 13h6l2 4" />
            <rect x="4" y="7" width="5" height="5" rx="1" />
        </>
    ),
    train: (
        <>
            <rect x="5" y="3" width="14" height="13" rx="3" />
            <path d="M5 10h14M9 21l-2-3M15 21l2-3" />
            <circle cx="9" cy="13" r="0.8" />
            <circle cx="15" cy="13" r="0.8" />
        </>
    ),
    question: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14" />
            <path d="M12 17h.01" />
        </>
    ),
    map: (
        <>
            <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
            <path d="M9 4v14M15 6v14" />
        </>
    ),
    cake: (
        <>
            <path d="M4 21h16" />
            <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
            <path d="M5 16c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0" />
            <path d="M12 12V8" />
            <path d="M12 5.5c.8-.7.8-1.8 0-2.5-.8.7-.8 1.8 0 2.5Z" />
        </>
    ),
    gift: (
        <>
            <rect x="4" y="10" width="16" height="10" rx="1.5" />
            <rect x="3" y="7" width="18" height="3" rx="1" />
            <path d="M12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1ZM12 7c1.5-3 5-3 5-1s-3 1-5 1Z" />
        </>
    ),
    flask: (
        <>
            <path d="M9 3h6M10 3v6.5L4.8 18.2A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.8L14 9.5V3" />
            <path d="M7.5 15h9" />
        </>
    ),
    calendar: (
        <>
            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
            <path d="M3.5 10h17M8 3v4M16 3v4" />
        </>
    ),
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
    gamepad: (
        <>
            <path d="M6 11h4M8 9v4M15 12h.01M18 10h.01" />
            <path d="M17.3 5H6.7a4 4 0 0 0-4 3.6l-.6 5.4a3 3 0 0 0 3 3.3c.7 0 1.4-.3 1.8-.9l1.5-1.9h7.2l1.5 1.9c.4.6 1.1.9 1.8.9a3 3 0 0 0 3-3.3l-.6-5.4a4 4 0 0 0-4-3.6Z" />
        </>
    )
};

export default function Icon({ name, size = 18 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {PATHS[name] || PATHS.cloud}
        </svg>
    );
}
