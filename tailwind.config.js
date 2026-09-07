module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'neutral-50',
        surface: 'white',
        border: 'neutral-200',
        primary: 'neutral-900',
        secondary: 'neutral-500',
        accent: 'indigo-600',
        accentSoft: 'rgba(99,102,241,0.1)', // indigo-600 low opacity
        positive: 'green-600',
        negative: 'red-600',
        neutralSentiment: 'neutral-400',
        warning: 'amber-600',
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '24px',
        6: '32px',
        7: '48px',
      },
      borderRadius: {
        DEFAULT: '8px', // cards, inputs
        badge: '6px', // badges/buttons
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
