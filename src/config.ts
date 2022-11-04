const configLoader: any = require;
export const CONFIG = configLoader('../.config')();
const auth = Buffer.from(`${CONFIG.admin.username}:${CONFIG.admin.password}`).toString('base64');
CONFIG.auth = `Basic ${auth}`;
