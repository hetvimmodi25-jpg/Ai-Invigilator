/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--c-background)',
        'on-background': 'var(--c-on-background)',

        surface: 'var(--c-surface)',
        'on-surface': 'var(--c-on-surface)',
        'surface-variant': 'var(--c-surface-variant)',
        'on-surface-variant': 'var(--c-on-surface-variant)',
        'surface-dim': 'var(--c-surface-dim)',
        'surface-container': 'var(--c-surface-container)',
        'surface-container-low': 'var(--c-surface-container-low)',
        'surface-container-high': 'var(--c-surface-container-high)',
        'surface-container-highest': 'var(--c-surface-container-highest)',
        'surface-container-lowest': 'var(--c-surface-container-lowest)',
        'inverse-surface': 'var(--c-inverse-surface)',

        primary: {
          DEFAULT: 'var(--c-primary)',
          fixed: 'var(--c-primary-fixed)',
          container: 'var(--c-primary-container)',
        },
        'on-primary': 'var(--c-on-primary)',
        'on-primary-container': 'var(--c-on-primary-container)',
        'on-primary-fixed-variant': 'var(--c-on-primary-fixed-variant)',

        secondary: {
          DEFAULT: 'var(--c-secondary)',
          container: 'var(--c-secondary-container)',
        },
        'on-secondary': 'var(--c-on-secondary)',
        'on-secondary-container': 'var(--c-on-secondary-container)',

        tertiary: {
          DEFAULT: 'var(--c-tertiary)',
          container: 'var(--c-tertiary-container)',
        },
        'on-tertiary': 'var(--c-on-tertiary)',
        'on-tertiary-container': 'var(--c-on-tertiary-container)',

        error: {
          DEFAULT: 'var(--c-error)',
          container: 'var(--c-error-container)',
        },
        'on-error': 'var(--c-on-error)',
        'on-error-container': 'var(--c-on-error-container)',

        outline: 'var(--c-outline)',
        'outline-variant': 'var(--c-outline-variant)',
      },
      fontFamily: {
        sans: 'var(--f-sans)',
        mono: 'var(--f-mono)',
      },
      fontSize: {
        'display-lg': ['var(--fs-display-lg-size)', { lineHeight: 'var(--fs-display-lg-lh)', fontWeight: 'var(--fs-display-lg-fw)' }],
        'headline-lg': ['var(--fs-headline-lg-size)', { lineHeight: 'var(--fs-headline-lg-lh)', fontWeight: 'var(--fs-headline-lg-fw)' }],
        'headline-md': ['var(--fs-headline-md-size)', { lineHeight: 'var(--fs-headline-md-lh)', fontWeight: 'var(--fs-headline-md-fw)' }],
        'title-lg': ['var(--fs-title-lg-size)', { lineHeight: 'var(--fs-title-lg-lh)', fontWeight: 'var(--fs-title-lg-fw)' }],
        'body-lg': ['var(--fs-body-lg-size)', { lineHeight: 'var(--fs-body-lg-lh)' }],
        'body-md': ['var(--fs-body-md-size)', { lineHeight: 'var(--fs-body-md-lh)' }],
        'label-md': ['var(--fs-label-md-size)', { lineHeight: 'var(--fs-label-md-lh)', fontWeight: 'var(--fs-label-md-fw)' }],
        'mono-sm': ['var(--fs-mono-sm-size)', { lineHeight: 'var(--fs-mono-sm-lh)' }],
      },
      spacing: {
        xs: 'var(--sp-xs)',
        sm: 'var(--sp-sm)',
        base: 'var(--sp-base)',
        md: 'var(--sp-md)',
        lg: 'var(--sp-lg)',
        xl: 'var(--sp-xl)',
        gutter: 'var(--sp-gutter)',
      },
      maxWidth: {
        'container-max': '1280px',
      },
    },
  },
  plugins: [],
}
