/** Mantener en sync con config/ports.json (empaquetado no incluye ese archivo). */
export const POS_PORTS = {
  frontend: 58173,
  api: 58001,
  afip: 58086,
  remoteRelay: 58090,
  remotePortal: 58174,
} as const;
