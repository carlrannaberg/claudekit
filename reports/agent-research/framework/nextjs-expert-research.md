# Next.js Framework Expert Research

## Executive Summary

This document provides comprehensive research for developing a Next.js framework expert agent. Next.js is a React framework that enables building full-stack web applications with features like server-side rendering, static site generation, API routes, and performance optimization. The expert should focus on App Router patterns, Server Components, performance optimization, and deployment strategies.

## 1. Scope Definition

**One-sentence scope**: "Next.js framework optimization, App Router patterns, performance tuning, deployment strategies, and full-stack development"

### Top 15 Recurring Problems (frequency × complexity)

1. **App Router vs Pages Router migration and architecture decisions** (medium freq, high complexity)
   - Migration patterns from Pages Router to App Router
   - Component boundary decisions (Server vs Client Components)
   - Data fetching pattern changes

2. **Server and Client Component patterns and optimization** (high freq, high complexity)
   - Proper use of 'use client' directive
   - Bundle size optimization through selective Client Components
   - Hydration mismatch issues

3. **Static Site Generation (SSG) and Server-Side Rendering (SSR) configuration** (high freq, high complexity)
   - generateStaticParams implementation
   - Dynamic vs static rendering decisions
   - ISR (Incremental Static Regeneration) setup

4. **Performance optimization and Core Web Vitals improvement** (high freq, high complexity)
   - Image optimization with next/image
   - Font optimization strategies
   - Bundle analysis and code splitting

5. **API Routes development and serverless function optimization** (high freq, medium complexity)
   - Route Handlers in App Router
   - Edge runtime vs Node.js runtime decisions
   - Response caching and optimization

6. **Image optimization and Next.js Image component usage** (high freq, medium complexity)
   - Custom image loaders
   - Priority and loading strategies
   - Responsive image patterns

7. **Routing and navigation patterns in App Router** (high freq, medium complexity)
   - Dynamic routes with generateStaticParams
   - Parallel routes and intercepting routes
   - Loading and error boundaries

8. **Middleware implementation and edge function development** (medium freq, high complexity)
   - Authentication middleware patterns
   - Request rewriting and redirects
   - Edge Config integration

9. **Authentication and session management patterns** (medium freq, high complexity)
   - Cookie-based sessions
   - JWT token handling
   - Route protection with middleware

10. **Database integration and data fetching optimization** (medium freq, medium complexity)
    - ORM integration patterns (Prisma, Drizzle)
    - Connection pooling strategies
    - Data revalidation patterns

11. **Deployment configuration for Vercel and other platforms** (medium freq, medium complexity)
    - Environment variable management
    - Build optimization settings
    - Edge function deployment

12. **Build optimization and bundle analysis** (medium freq, medium complexity)
    - Tree shaking configuration
    - Dynamic imports and lazy loading
    - Bundle size monitoring

13. **TypeScript integration and type safety patterns** (high freq, low complexity)
    - Route parameter typing
    - API response typing
    - Component prop validation

14. **Testing strategies for Next.js applications** (medium freq, medium complexity)
    - Unit testing Server Components
    - Integration testing Route Handlers
    - E2E testing with modern frameworks

15. **Internationalization (i18n) and localization setup** (low freq, high complexity)
    - Static generation for multiple locales
    - Dynamic locale routing
    - Content management patterns

### Sub-domain Expert Recommendations

- **React Expert**: For complex component architecture, state management, and React-specific patterns
- **TypeScript Expert**: For advanced type definitions, generic patterns, and type safety
- **Performance Expert**: For Core Web Vitals optimization, bundle analysis, and performance monitoring

## 2. Topic Categories

### Category 1: App Router & Server Components
- Server Component architecture patterns
- Client Component boundary optimization
- Data fetching in Server Components
- Streaming and Suspense integration

### Category 2: Rendering Strategies (SSG/SSR/ISR)
- Static site generation with generateStaticParams
- Server-side rendering patterns
- Incremental Static Regeneration configuration
- Dynamic vs static rendering decisions

### Category 3: Performance & Core Web Vitals
- Image optimization with next/image
- Font loading strategies
- Bundle size optimization
- Core Web Vitals monitoring

### Category 4: API Routes & Full-Stack Patterns
- Route Handlers implementation
- Middleware patterns
- Edge runtime optimization
- Database integration

### Category 5: Deployment & Production Optimization
- Vercel deployment strategies
- Environment configuration
- Build optimization
- Monitoring and analytics

### Category 6: Advanced Features & Migration
- Pages Router to App Router migration
- Advanced routing patterns
- Internationalization setup
- Third-party integrations

## 3. Environment Detection

### Next.js Version Detection
```bash
# Check Next.js version
npx next --version
# Check in package.json
grep -o '"next": "[^"]*"' package.json
```

### Router Type Detection
```bash
# App Router detection
[ -d "app" ] && echo "App Router" || echo "Pages Router"
# Check for both
[ -d "app" ] && [ -d "pages" ] && echo "Mixed Router Setup"
```

### Rendering Strategy Detection
```javascript
// Server Components (App Router)
// Look for async components and direct fetch calls

// SSG Detection (Pages Router)
// Look for getStaticProps, getStaticPaths

// SSR Detection (Pages Router)  
// Look for getServerSideProps
```

### Deployment Target Detection
```javascript
// Vercel detection
// Check for vercel.json or VERCEL_URL env var

// Self-hosted detection
// Check for Dockerfile, docker-compose.yml

// Static export detection
// Check for "output: 'export'" in next.config.js
```

## 4. Source Material Priority

### Primary Sources
1. **Next.js Official Documentation** - Latest patterns and best practices
2. **Vercel Blog and Guides** - Performance optimization insights
3. **Next.js GitHub Repository** - Latest features and examples
4. **React Team Communications** - Server Components evolution

### Key Documentation Areas
- App Router migration guide
- Performance optimization documentation
- Deployment guides for various platforms
- API reference for Route Handlers and middleware

### Community Resources
- Next.js GitHub discussions
- Vercel community examples
- Performance case studies
- Real-world migration stories

## 5. Core Patterns and Anti-Patterns

### App Router Best Practices

#### Server Component Optimization
```javascript
// ✅ Good: Async Server Component with direct data fetching
export default async function BlogPost({ params }) {
  const { slug } = await params
  const post = await fetch(`https://api.example.com/posts/${slug}`)
  const postData = await post.json()
  
  return (
    <article>
      <h1>{postData.title}</h1>
      <PostContent data={postData} />
    </article>
  )
}

// ❌ Avoid: Using useEffect in Server Components
export default function BlogPost({ params }) {
  const [post, setPost] = useState(null)
  
  useEffect(() => {
    // This won't work in Server Components
    fetchPost(params.slug).then(setPost)
  }, [params.slug])
  
  return <div>{post?.title}</div>
}
```

#### Client Component Boundary Optimization
```javascript
// ✅ Good: Minimal Client Component boundary
'use client'

export default function SearchInput({ onSearch }) {
  const [query, setQuery] = useState('')
  
  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onSubmit={() => onSearch(query)}
    />
  )
}

// ❌ Avoid: Large Client Component boundaries
'use client'

export default function Layout({ children }) {
  // This makes the entire layout client-side
  return (
    <div>
      <Header />
      <SearchInput />
      {children} {/* All children become client-side */}
    </div>
  )
}
```

### Performance Optimization Patterns

#### Image Optimization
```javascript
// ✅ Good: Optimized image with priority
import Image from 'next/image'

export default function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={800}
      height={600}
      priority
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  )
}
```

#### Data Fetching with Caching
```javascript
// ✅ Good: Static data fetching (default cache behavior)
async function getStaticData() {
  const res = await fetch('https://api.example.com/data', {
    // Default: cache: 'force-cache'
  })
  return res.json()
}

// ✅ Good: Dynamic data fetching
async function getDynamicData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'no-store' // Similar to getServerSideProps
  })
  return res.json()
}

// ✅ Good: ISR pattern
async function getISRData() {
  const res = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 } // Revalidate every hour
  })
  return res.json()
}
```

### API Routes and Middleware

#### Route Handlers Pattern
```javascript
// ✅ Good: Type-safe Route Handler with error handling
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID parameter required' },
        { status: 400 }
      )
    }
    
    const data = await fetchData(id)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ✅ Good: Caching for static data
export const dynamic = 'force-static'

export async function GET() {
  const data = await fetch('https://api.example.com/static-data')
  return Response.json(data)
}
```

#### Middleware Patterns
```javascript
// ✅ Good: Authentication middleware
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/lib/session'

const protectedRoutes = ['/dashboard', '/profile']
const publicRoutes = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => 
    path.startsWith(route)
  )
  
  if (isProtectedRoute) {
    const session = request.cookies.get('session')?.value
    const user = await decrypt(session)
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
```

## 6. Common Error Patterns and Solutions

### Hydration Mismatches
```javascript
// ❌ Problem: Server/client mismatch
export default function TimeDisplay() {
  return <div>{new Date().toLocaleString()}</div>
}

// ✅ Solution: Use dynamic import with SSR disabled
import dynamic from 'next/dynamic'

const TimeDisplay = dynamic(() => import('./TimeDisplay'), {
  ssr: false,
  loading: () => <div>Loading...</div>
})
```

### Bundle Size Issues
```javascript
// ❌ Problem: Large client bundle
'use client'

import { useState } from 'react'
import { MassiveLibrary } from 'massive-library'

export default function Layout({ children }) {
  return (
    <div>
      <Navigation />
      {children}
    </div>
  )
}

// ✅ Solution: Selective client boundaries
import Navigation from './Navigation' // Server Component

export default function Layout({ children }) {
  return (
    <div>
      <Navigation />
      {children}
    </div>
  )
}

// Navigation.tsx (Client Component only where needed)
'use client'
import { useState } from 'react'

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false)
  // Interactive logic here
}
```

## 7. Migration Strategies

### Pages Router to App Router Migration

#### Data Fetching Migration
```javascript
// Before: Pages Router
export async function getServerSideProps() {
  const data = await fetch('https://api.example.com/data')
  return { props: { data: await data.json() } }
}

export default function Page({ data }) {
  return <div>{data.title}</div>
}

// After: App Router
async function getData() {
  const res = await fetch('https://api.example.com/data', {
    cache: 'no-store' // Equivalent to getServerSideProps
  })
  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}
```

#### API Routes Migration
```javascript
// Before: Pages API Route
export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json({ message: 'Hello' })
  }
}

// After: App Router Route Handler
export async function GET() {
  return Response.json({ message: 'Hello' })
}
```

## 8. Performance Optimization Checklist

### Core Web Vitals Optimization
1. **Largest Contentful Paint (LCP)**
   - Optimize images with next/image
   - Implement resource hints (preload, preconnect)
   - Use Server Components for faster initial rendering

2. **First Input Delay (FID)**
   - Minimize client-side JavaScript
   - Use selective hydration
   - Implement code splitting

3. **Cumulative Layout Shift (CLS)**
   - Specify image dimensions
   - Reserve space for dynamic content
   - Use font-display: swap

### Build Optimization
```javascript
// next.config.js optimization
module.exports = {
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  
  // Bundle analysis
  experimental: {
    bundlePagesRouterDependencies: true,
  },
  
  // Compression
  compress: true,
}
```

## 9. Testing Strategies

### Server Component Testing
```javascript
// Test Server Components with @testing-library/react
import { render, screen } from '@testing-library/react'
import BlogPost from './BlogPost'

jest.mock('./lib/api', () => ({
  fetchPost: jest.fn(() => 
    Promise.resolve({ title: 'Test Post', content: 'Content' })
  )
}))

test('renders blog post', async () => {
  render(await BlogPost({ params: { slug: 'test' } }))
  expect(screen.getByText('Test Post')).toBeInTheDocument()
})
```

### Route Handler Testing
```javascript
// Test Route Handlers
import { GET } from './route'
import { NextRequest } from 'next/server'

test('GET returns user data', async () => {
  const request = new NextRequest('http://localhost:3000/api/user?id=1')
  const response = await GET(request)
  const data = await response.json()
  
  expect(response.status).toBe(200)
  expect(data).toHaveProperty('id', '1')
})
```

## 10. Deployment Best Practices

### Vercel Deployment
```javascript
// vercel.json optimization
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Environment Configuration
```javascript
// Environment variable validation
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'NEXT_PUBLIC_APP_URL'
]

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
})
```

## 11. Monitoring and Analytics

### Web Vitals Reporting
```javascript
// _app.tsx or layout.tsx
import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // Send to analytics service
    analytics.track('Web Vital', {
      name: metric.name,
      value: metric.value,
      label: metric.label,
      id: metric.id,
    })
  })
}
```

## 12. Advanced Patterns

### Streaming with Suspense
```javascript
import { Suspense } from 'react'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading posts...</div>}>
        <PostsFeed />
      </Suspense>
      <Suspense fallback={<div>Loading analytics...</div>}>
        <Analytics />
      </Suspense>
    </div>
  )
}
```

### Edge Runtime Optimization
```javascript
// Route Handler with Edge Runtime
export const runtime = 'edge'

export async function GET(request: Request) {
  // Fast edge computation
  const data = await processAtEdge()
  return Response.json(data)
}
```

## Conclusion

This research provides a comprehensive foundation for building a Next.js framework expert agent. The focus should be on App Router patterns, performance optimization, and full-stack development capabilities while maintaining awareness of migration paths from Pages Router and deployment best practices.

Key areas of expertise should include:
- Server vs Client Component architecture decisions
- Performance optimization through Core Web Vitals
- Modern data fetching patterns with caching strategies
- Route Handlers and middleware implementation
- Deployment optimization for various platforms

The expert should proactively suggest performance improvements, architectural optimizations, and modern Next.js patterns while being aware of common pitfalls and migration challenges.