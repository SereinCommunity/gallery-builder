import * as core from '@actions/core';
import { program } from 'commander';
import { existsSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import galleryGenerator from './services/galleryGenerator.ts';
import logger from './services/logger.ts';
import pluginsManager from './services/pluginsManager.ts';
import { reportApiUsage, reportCheck } from './services/reporter.ts';
import websiteGenerator from './services/websiteGenerator.ts';
import { Result } from './types/result.ts';
import pathConstants from './utils/pathConstants.ts';

if (existsSync(pathConstants.root)) {
    rmSync(pathConstants.root, { recursive: true, force: true });
}

program.requiredOption('-p, --path <path>', '插件目录');
program.command('all', { isDefault: true }).action(buildAll);
program.command('gallery').action(buildGallery);
program.command('website').action(buildWebsite);
program.command('check [id]').action(check);
program.parse();

async function buildGallery(result?: Result) {
    const path = join(program.opts().path, 'src', pathConstants.plugins);
    if (!existsSync(path)) {
        throw '目录不存在';
    }

    const r =
        result?.success && result?.failed
            ? result
            : await pluginsManager.check(path);

    galleryGenerator.generate(r);
}

async function buildWebsite(result?: Result) {
    const path = join(program.opts().path, 'src', pathConstants.plugins);
    if (!existsSync(path)) {
        throw '目录不存在';
    }

    const r =
        result?.success && result?.failed
            ? result
            : await pluginsManager.check(path);

    websiteGenerator.generate(path, r);
}

async function check(id?: string) {
    if (!existsSync(program.opts().path)) {
        throw '目录不存在';
    }

    if (id) {
        try {
            await pluginsManager.checkSingle(
                join(program.opts().path, 'src', pathConstants.plugins),
                id
            );
            logger.info(`[${id}] 检查成功`);
        } catch (error) {
            logger.error(`[${id}] 检查失败：${error}`);
            core.setFailed(`[${id}] 检查失败`);
        }

        return;
    }

    const result = await pluginsManager.check(
        join(program.opts().path, 'src', pathConstants.plugins)
    );

    const count = result.failed.size;
    if (count > 0) {
        core.setFailed(
            `${count}个插件检查失败：${Array.from(result.failed.keys()).join(
                ', '
            )}`
        );
    }

    reportCheck(result);
    await reportApiUsage();
}

async function buildAll() {
    const result = await pluginsManager.check(
        join(program.opts().path, 'src', pathConstants.plugins)
    );
    await buildGallery(result);
    await buildWebsite(result);
    await reportApiUsage();
}
