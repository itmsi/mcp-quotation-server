const iso = () => new Date().toISOString();

export const log = {
  info: (msg: string, meta?: unknown) =>
    console.log(JSON.stringify({ time: iso(), level: "INFO", msg, ...(meta ? { meta } : {}) })),
  error: (msg: string, meta?: unknown) =>
    console.log(JSON.stringify({ time: iso(), level: "ERROR", msg, ...(meta ? { meta } : {}) })),
};
