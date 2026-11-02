/**
 * Bootstrap Node's c-ares DNS resolver before loading Mongoose/the MongoDB driver.
 * On some Windows + Node.js 24 setups, dns.getServers() incorrectly reports
 * 127.0.0.1, causing mongodb+srv SRV lookups to fail with ECONNREFUSED.
 */
import dns from 'node:dns';
import 'dotenv/config';

const configuredDnsServers = (process.env.NODE_DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

try {
  dns.setServers(configuredDnsServers);
  console.log(`Node.js DNS resolver configured: ${dns.getServers().join(', ')}`);
} catch (error) {
  console.error('Could not configure Node.js DNS resolver:', error.message);
  process.exit(1);
}

// Dynamic import is intentional: it ensures DNS is configured before
// server.js loads Mongoose and the MongoDB driver.
await import('./server.js');
