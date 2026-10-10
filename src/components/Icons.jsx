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
