/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#f9fafb', // neutral-50
        surface: '#ffffff', // white
        border: '#e5e7eb', // neutral-200
        primary: '#111827', // neutral-900
        secondary: '#6b7280', // neutral-500
        accent: {
          DEFAULT: '#4f46e5', // indigo-600
          hover: '#4338ca', // indigo-700
          soft: 'rgba(79, 70, 229, 0.1)',
        },
        positive: '#16a34a', // green-600
        negative: '#dc2626', // red-600
        neutralSentiment: '#9ca3af', // neutral-400
        warning: '#d97706', // amber-600
      },
      borderRadius: {
        DEFAULT: '8px',
        badge: '6px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.05)',
        dialog: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
      },
    },
  },
  plugins: [],
};
