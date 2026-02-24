// --- Silence console ---
jest.spyOn(console, 'log').mockImplementation(() => { });
jest.spyOn(console, 'warn').mockImplementation(() => { });
jest.spyOn(console, 'error').mockImplementation(() => { });
jest.spyOn(console, 'debug').mockImplementation(() => { });

// sllence NestJS Logger globally
import { Logger } from '@nestjs/common';

// disable all Nest logs
Logger.overrideLogger(false);

// no-op all instance methods
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => { });
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => { });
