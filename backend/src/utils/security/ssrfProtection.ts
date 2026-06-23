import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import logger from '../../config/logger';

const lookup = promisify(dns.lookup);

/**
 * Validates a user-provided URL against SSRF (Server-Side Request Forgery) attacks.
 * It prevents the backend from making requests to local/internal IP addresses or reserved ranges.
 *
 * @param urlString The URL to validate
 * @returns boolean True if safe, False if potentially malicious
 */
export const isSafeUrl = async (urlString: string): Promise<boolean> => {
  try {
    const url = new URL(urlString);

    // Only allow HTTP/HTTPS (block file://, ftp://, gopher://, dict://, etc.)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }

    // Block obvious localhost/internal hostnames
    const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (blockedHostnames.includes(url.hostname)) {
      return false;
    }
    if (url.hostname.endsWith('.internal') || url.hostname.endsWith('.local')) {
      return false;
    }

    // Resolve IP to check for reserved ranges
    // This catches cases where an external domain maps to an internal IP (DNS rebinding / SSRF)
    const { address } = await lookup(url.hostname);

    return !isReservedIp(address);
  } catch {
    // If it can't be parsed or resolved, it's not safe
    return false;
  }
};

/**
 * Checks if an IP address belongs to a reserved/internal range (IPv4 & IPv6).
 */
const isReservedIp = (ip: string): boolean => {
  // IPv4 Loopback (127.0.0.0/8)
  if (ip.startsWith('127.')) return true;

  // IPv4 Private (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('192.168.')) return true;

  const parts = ip.split('.');
  if (parts.length === 4) {
    if (parts[0] === '172') {
      const secondOctet = parseInt(parts[1], 10);
      if (secondOctet >= 16 && secondOctet <= 31) return true;
    }
    // IPv4 Link-local (169.254.0.0/16) - used for AWS IMDS (metadata service)
    if (parts[0] === '169' && parts[1] === '254') return true;
    // Current network (0.0.0.0/8)
    if (parts[0] === '0') return true;
  }

  // IPv6 Loopback / Unspecified
  if (ip === '::1' || ip === '::' || ip === '0:0:0:0:0:0:0:1') return true;
  // IPv6 Unique Local (fc00::/7)
  if (ip.toLowerCase().startsWith('fc') || ip.toLowerCase().startsWith('fd')) return true;
  // IPv6 Link-local (fe80::/10)
  if (
    ip.toLowerCase().startsWith('fe8') ||
    ip.toLowerCase().startsWith('fe9') ||
    ip.toLowerCase().startsWith('fea') ||
    ip.toLowerCase().startsWith('feb')
  )
    return true;

  return false;
};

/**
 * Wraps native fetch with SSRF protection.
 * Use this instead of global fetch() when requesting user-supplied URLs.
 */
export const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const safe = await isSafeUrl(url);
  if (!safe) {
    logger.error(`[SECURITY] Blocked SSRF attempt to URL: ${url}`);
    throw new Error('SSRF Protection: Invalid or reserved destination address');
  }

  return fetch(url, {
    ...options,
    // Provide sensible defaults to prevent resource exhaustion
    signal: options?.signal || AbortSignal.timeout(10000),
    redirect: 'manual', // Prevent arbitrary redirect following
  });
};
