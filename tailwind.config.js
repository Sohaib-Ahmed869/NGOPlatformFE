import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        heading: ["Cormorant Garamond", "serif"],
        body: ["Inter", "sans-serif"],
      },
      colors: {
        primary: '#2C2418',
        'primary-light': '#4A3C2A',
        accent: '#C9A84C',
        'accent-light': '#D4B85A',
        background: '#FAF7F2',
        surface: '#FFFFFF',
        'text-dark': '#2C2418',
        'text-muted': '#8B7E6A',
        danger: '#DC2626',
        'warm-cream': '#F5EDE0',
        'warm-beige': '#EDE4D3',
      },
      typography: {
        DEFAULT: {
          css: {
            fontSize: '0.875rem', // 14px
            lineHeight: '1.5',
            p: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            // Headings
            h1: {
              fontSize: '1.5rem',
              marginTop: '0',
              marginBottom: '0.5em',
            },
            h2: {
              fontSize: '1.375rem',
              marginTop: '0',
              marginBottom: '0.5em',
            },
            h3: {
              fontSize: '1.25rem',
              marginTop: '0',
              marginBottom: '0.5em',
            },
            h4: {
              fontSize: '1.125rem',
              marginTop: '0',
              marginBottom: '0.5em',
            },
            // Unordered lists (bullet points)
            ul: {
              marginTop: '1em',
              marginBottom: '1em',
              paddingLeft: '1.25rem',
              li: {
                display: 'list-item', // Force each li to be block-level
                marginTop: '0.25em',
                marginBottom: '0.25em',
              },
            },
            // Ordered lists
            ol: {
              marginTop: '1em',
              marginBottom: '1em',
              paddingLeft: '1.25rem',
              li: {
                display: 'list-item',
                marginTop: '0.25em',
                marginBottom: '0.25em',
              },
            },
          },
        },
      },
    },
  },
  plugins: [typography],
};
