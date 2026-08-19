/**
 * Tenant Subdomain & URL Router (Odoo Multi-Tenant Architecture)
 * Supports Wildcard Subdomains (*.aysed.studio) and URL Query Context (?tenant=... / ?company_id=...)
 */

import { Company } from '../types';

export interface TenantContext {
  tenantSlug: string | null;
  companyId: string | null;
  companyNumber: number | null;
  source: 'subdomain' | 'query_param' | 'storage' | 'default';
  isMasterTenant: boolean;
  hostname: string;
}

/**
 * Extracts tenant slug from window.location.hostname or URL search parameters
 */
export function extractTenantFromLocation(): { tenantSlug: string | null; source: 'subdomain' | 'query_param' | 'default' } {
  if (typeof window === 'undefined') {
    return { tenantSlug: null, source: 'default' };
  }

  // 1. Check URL parameters first (vital for Cloud Run preview iframe & developer testing)
  const searchParams = new URLSearchParams(window.location.search);
  const paramTenant = searchParams.get('tenant') || searchParams.get('company') || searchParams.get('subdomain') || searchParams.get('company_id');
  if (paramTenant && paramTenant.trim() !== '') {
    return {
      tenantSlug: paramTenant.toLowerCase().trim(),
      source: 'query_param'
    };
  }

  // 2. Extract from hostname (e.g., client1.aysed.studio or almanara.aysed.studio)
  const hostname = window.location.hostname.toLowerCase();
  const parts = hostname.split('.');

  // Exclude system domains and root domains
  const isExcludedRoot = 
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'aysed.studio' ||
    hostname === 'www.aysed.studio' ||
    hostname.startsWith('ais-dev-') ||
    hostname.startsWith('ais-pre-') ||
    hostname.includes('.run.app') ||
    hostname.includes('.web.app') ||
    hostname.includes('.firebaseapp.com');

  if (!isExcludedRoot && parts.length >= 3) {
    const subdomain = parts[0].trim();
    if (subdomain && subdomain !== 'www' && subdomain !== 'aysed-kuwait' && subdomain !== 'app' && subdomain !== 'admin') {
      return {
        tenantSlug: subdomain,
        source: 'subdomain'
      };
    }
  }

  return { tenantSlug: null, source: 'default' };
}

/**
 * Resolves a company matching the tenantSlug or companyId
 */
export function resolveCompanyFromTenantSlug(
  tenantSlug: string | null,
  companies: Company[]
): Company | null {
  if (!tenantSlug || !companies || companies.length === 0) return null;

  const normalized = tenantSlug.toLowerCase().trim();

  // Check master tenant keywords
  if (normalized === '1' || normalized === 'comp-1' || normalized === 'manara' || normalized === 'almanara' || normalized === 'master') {
    return companies.find(c => c.id === 'comp-1' || c.companyNumber === 1 || c.isPrimary) || companies[0];
  }

  // Find by exact ID
  const byId = companies.find(c => c.id.toLowerCase() === normalized);
  if (byId) return byId;

  // Find by numeric companyNumber
  const numericId = parseInt(normalized.replace(/[^0-9]/g, ''), 10);
  if (!isNaN(numericId)) {
    const byNum = companies.find(c => c.companyNumber === numericId || c.id === `comp-${numericId}`);
    if (byNum) return byNum;
  }

  // Find by subdomain slug
  const bySubdomain = companies.find(c => c.subdomain?.toLowerCase() === normalized);
  if (bySubdomain) return bySubdomain;

  // Find by English or Arabic name substring
  const byName = companies.find(c => 
    c.nameEn?.toLowerCase().replace(/[^a-z0-9]/g, '').includes(normalized.replace(/[^a-z0-9]/g, '')) ||
    normalized.includes(c.nameEn?.toLowerCase().replace(/[^a-z0-9]/g, '') || '___')
  );
  if (byName) return byName;

  return null;
}

/**
 * Generates the clean subdomain URL for a company
 */
export function getCompanySubdomainUrl(company: Company): string {
  const slug = company.subdomain || `client${company.companyNumber || company.id.replace('comp-', '')}`;
  return `https://${slug}.aysed.studio`;
}

/**
 * Checks if user is Master Owner
 */
export function isMasterAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  return lower === 'admin@aysed.com' || lower === 'elsayedhr1993@gmail.com';
}
