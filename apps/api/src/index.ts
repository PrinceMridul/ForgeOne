import { createApp } from './app';
import { config } from './config';
import { createLogger } from '@forgeone/logger';

const logger = createLogger({ name: 'api', level: config.logLevel });

async function main(): Promise<void> {
  const app = await createApp();
  try {
    await app.listen({ host: config.host, port: config.port });
    logger.info(`🚀 ForgeOne API at http://${config.host}:${config.port}`);
  } catch (err) {
    logger.fatal(err, 'Failed to start');
    process.exit(1);
  }
}

main();
