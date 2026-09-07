// Derived from whatever host the browser actually loaded the page from - not hardcoded to
// "localhost" - so the same built bundle works whether it's opened as http://localhost:4200
// or from another device on the LAN as http://<this-machine's-ip>:4200. The backend ports
// are fixed (auth-service always :3000, trade-api always :8081 per docker-compose.yml), only
// the host varies.
const apiHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const environment = {
  production: false,
  authServiceUrl: `http://${apiHost}:3000`,
  tradeApiUrl: `http://${apiHost}:8081`,
};
