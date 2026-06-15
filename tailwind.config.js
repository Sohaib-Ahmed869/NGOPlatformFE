import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Dark variant is scoped to the admin shell only (the public site / SaaS /
  // super-admin are unaffected). `dark:` utilities apply inside any element
  // carrying data-admin-theme="dark".
  darkMode: ["selector", '[data-admin-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        // Resolve through CSS variables so the admin portal + user dashboard can
        // swap to Outfit (see index.css) while the public website keeps its serif
        // look. Where the variable is unset (public site) the serif stack applies.
        heading: ['var(--font-heading, "Times New Roman", Tinos, Times, serif)'],
        body: ['var(--font-body, "Times New Roman", Tinos, Times, serif)'],
        nav: ['var(--font-nav, "Times New Roman", Tinos, Times, serif)'],
        mono: ["JetBrains Mono", "monospace"],
      },
      colors: {
        primary: 'var(--tenant-primary, #2C2418)',
        'primary-light': 'var(--tenant-primary-light, #4A3C2A)',
        accent: 'var(--tenant-accent, #C9A84C)',
        'accent-light': 'var(--tenant-accent-light, #D4B85A)',
        background: 'var(--tenant-bg, #FAF7F2)',
        surface: '#FFFFFF',
        'text-dark': 'var(--tenant-primary, #2C2418)',
        'text-muted': '#8B7E6A',
        danger: '#DC2626',
        'warm-cream': '#F5EDE0',
        'warm-beige': '#EDE4D3',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 60s linear infinite',
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
