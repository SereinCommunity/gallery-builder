import { config } from 'dotenv';
import { Octokit } from 'octokit';
import logger from './logger.ts';

config();

export const octokit = new Octokit({
    userAgent: 'galleryBuilder',
    auth: process.env.TOKEN,
    log: logger,
});
