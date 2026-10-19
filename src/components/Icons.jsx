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
