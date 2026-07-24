import { NextResponse } from 'next/server';

export function middleware(request) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // Exclude next static assets, public assets, and api paths
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/assets') ||
    url.pathname.startsWith('/api') ||
    url.pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Detect subdomains (e.g. apex.localhost:3000 or apex.lexora.app)
  const isLocalhost = hostname.includes('localhost');
  const domainParts = hostname.split('.');

  let subdomain = '';
  if (isLocalhost) {
    // For local dev: [tenant].localhost:3000
    if (domainParts.length > 1 && domainParts[0] !== 'localhost' && domainParts[0] !== 'www') {
      subdomain = domainParts[0];
    }
  } else {
    // For production: [tenant].lexora.app
    // Avoid treating Vercel's default deployment subdomains as tenant subdomains
    const isVercelPrimary = hostname.includes("vercel.app") && 
      (domainParts[0].startsWith("lexora-new") || domainParts[0].includes("joshua-omatsuli") || domainParts[0].startsWith("lexora-gcirx4mzl"));

    if (domainParts.length > 2 && domainParts[0] !== 'www' && !isVercelPrimary) {
      subdomain = domainParts[0];
    }
  }

  // If subdomain is 'admin', rewrite root route to the Admin page
  if (subdomain === 'admin') {
    url.pathname = `/admin${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // If a custom tenant subdomain is found (excluding app portals)
  if (subdomain && subdomain !== 'app') {
    // Rewrite path to the tenant dynamic page router
    url.pathname = `/_tenant/${subdomain}${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}
