/**
 * Local development bootstrap.
 *
 * Windows + Node.js 24 on some networks can report localhost (127.0.0.1) as
 * Node's DNS server and fail MongoDB Atlas SRV lookups. Apply the public DNS
 * workaround only on Windows or when explicitly configured. On Vercel/Linux,
 * retain the platform's default DNS resolver.
 */
import dns from 'node:dns';
import 'dotenv/config';

const dnsServers = process.env.NODE_DNS_SERVERS
  ? process.env.NODE_DNS_SERVERS.split(',').map((value) => value.trim()).filter(Boolean)
  : process.platform === 'win32'
    ? ['1.1.1.1', '8.8.8.8']
    : null;

if (dnsServers?.length) {
  try {
    dns.setServers(dnsServers);
    console.log(`Node.js DNS resolver configured: ${dns.getServers().join(', ')}`);
  } catch (error) {
    console.error('Could not configure Node.js DNS resolver:', error.message);
    process.exitCode = 1;
    throw error;
  }
}

// Dynamic import is intentional: configure DNS before loading Mongoose.
const { default: app, initializeDatabase } = await import('./server.js');

// Vercel uses server.js as its Express entrypoint and consumes its default
// export. bootstrap.js is for local npm run dev / npm start only.
if (!process.env.VERCEL) {
  await initializeDatabase();
  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => console.log(`Aurelia Fit API running on port ${port}`));
}

export default app;
