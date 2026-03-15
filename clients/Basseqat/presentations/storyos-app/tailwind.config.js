/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'arabic': ['IBM Plex Sans Arabic', 'sans-serif'],
                'sans': ['Inter', 'IBM Plex Sans Arabic', 'sans-serif'],
            },
            colors: {
                // Admireworks Brand Colors
                primary: {
                    DEFAULT: '#001A70',
                    dark: '#001050',
                    light: '#1a3080',
                },
                accent: {
                    DEFAULT: '#CC9F53',
                    dark: '#B8884A',
                    light: '#D9B06A',
                },
                surface: {
                    DEFAULT: '#FFFFFF',
                    soft: '#F7F8FB',
                    muted: '#EEF0F6',
                },
                text: {
                    DEFAULT: '#111827',
                    muted: '#6B7280',
                    light: '#9CA3AF',
                },
            },
        },
    },
    plugins: [],
}
