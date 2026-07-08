/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: '#12100f',
        surf: '#1d1a17',
        surf2: '#272219',
        surf3: '#322b21',
        lime: '#c4f542',
        purple: '#a78bfa',
        text: '#f6f3ee',
        muted: '#9a9288',
        warm: '#ff7a4d',
      },
      fontFamily: {
        sora: ['Sora_400Regular'],
        'sora-600': ['Sora_600SemiBold'],
        'sora-700': ['Sora_700Bold'],
        'sora-800': ['Sora_800ExtraBold'],
        mono: ['SpaceMono_400Regular'],
        'mono-700': ['SpaceMono_700Bold'],
      },
    },
  },
  plugins: [],
};
