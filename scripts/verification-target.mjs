/** @param {string} name @param {number} fallback @param {number} [maximum] */
function port(name, fallback, maximum = 65535) {
  const input = process.env[name] ?? String(fallback);
  const value = Number(input);
  if (!/^\d+$/.test(input) || value < 1024 || value > maximum)
    throw new Error(`Invalid isolated verification port: ${name}`);
  return value;
}

export const apiPort = port("LIFTOFF_VERIFY_API_PORT", 59471, 65527);
export const dbPort = apiPort + 1;
export const shadowPort = apiPort + 8;
export const browserPort = port("LIFTOFF_VERIFY_BROWSER_PORT", 4176);
const ports = [apiPort, dbPort, shadowPort, browserPort];
if (
  new Set(ports).size !== ports.length ||
  ports.some((p) => [4173, 4175, 58421, 58422, 58429, 55421, 55422, 59422].includes(p))
)
  throw new Error(
    "Verification ports overlap with each other or a known application stack.",
  );

export const api = `http://127.0.0.1:${apiPort}`;
export const browser = `http://127.0.0.1:${browserPort}`;
export const project = `liftoff-verification-${apiPort}`;
export const workDirectory = `isolated-verification-${apiPort}`;
