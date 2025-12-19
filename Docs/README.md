# NexoralDNS Documentation Website

Official technical documentation website for NexoralDNS - Advanced DNS Management & Surveillance System.

## Overview

This is a Next.js 16 application featuring a comprehensive documentation portal with:
- Technical dark theme with glass morphism design
- Responsive sidebar navigation
- Complete API reference
- Installation and command guides
- Architecture documentation
- Interactive code blocks with copy functionality

## Getting Started

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the documentation site.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
Documentation/
├── app/
│   ├── docs/
│   │   ├── installation/       # Installation guide
│   │   ├── architecture/       # System architecture
│   │   ├── features/          # Feature comparison
│   │   ├── api/               # API reference
│   │   ├── security/          # Security policy
│   │   ├── contributing/      # Contribution guidelines
│   │   ├── troubleshooting/   # Troubleshooting guide
│   │   └── commands/          # CLI commands docs
│   │       ├── install/
│   │       ├── start/
│   │       ├── stop/
│   │       ├── update/
│   │       └── remove/
│   ├── page.tsx              # Home page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── Sidebar.tsx           # Navigation sidebar
│   ├── CopyCodeBlock.tsx     # Copy-to-clipboard code blocks
│   └── Footer.tsx            # Page footer
└── public/
    ├── favicon.svg           # NexoralDNS favicon
    ├── favicon.ico           # Fallback favicon
    └── nexoraldns-logo.svg   # Full logo
```

## Features

- **Modern Design**: Glass morphism with dark theme
- **Responsive**: Mobile-first design with hamburger menu
- **Interactive**: Copy-to-clipboard code blocks
- **SEO Optimized**: Proper metadata and semantic HTML
- **Fast**: Next.js 16 with optimized fonts and assets
- **Accessible**: ARIA labels and keyboard navigation

## Tech Stack

- **Framework**: Next.js 16
- **Styling**: Tailwind CSS 4
- **Fonts**: Geist Sans & Geist Mono
- **TypeScript**: Full type safety
- **Icons**: Custom SVG logo

## Deployment

Deploy to Vercel, Netlify, or any Next.js hosting platform:

```bash
npm run build
```

The site is production-ready and optimized for performance.

## License

Part of NexoralDNS - See main project [LICENSE](../LICENSE) for details.
