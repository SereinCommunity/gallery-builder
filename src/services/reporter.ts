import * as core from '@actions/core';
import github from '@actions/github';
import { Result } from '../types/result.ts';
import logger from './logger.ts';
import { octokit } from './octokitFactory.ts';

export function reportCheck({ success, failed }: Result) {
    if (github.context.action) {
        core.summary.addHeading('检查结果', 1);
        core.summary.addHeading('成功', 2);

        if (success.size > 0) {
            core.summary.addList([...success.keys()]);
        } else {
            core.summary.addRaw('-');
        }

        core.summary.addHeading('失败', 2);

        if (failed.size > 0) {
            for (const pair of failed.entries()) {
                core.summary.addHeading(pair[0], 3);
                core.summary.addCodeBlock(pair[1], 'txt');
            }
        } else {
            core.summary.addRaw('-');
        }

        core.summary.write();
    } else {
        logger.info();
        logger.info('成功：' + Array.from(success.keys()).join(', '));

        if (failed.size > 0) {
            logger.error('失败：');
            for (const pair of failed.entries()) {
                logger.error(`- ${pair[0]}: ${pair[1]}`);
            }
        }
    }
}

export async function reportApiUsage() {
    const r = await octokit.rest.rateLimit.get();
    logger.info(
        `Api用量：${r.data.resources.core.remaining}/${r.data.resources.core.limit}`
    );

    if (github.context.action) {
        core.summary.addDetails(
            'REST API用量',
            `${r.data.resources.core.remaining}/${r.data.resources.core.limit}`
        );
        core.summary.write();
    }
}
