import * as core from '@actions/core';
import github from '@actions/github';

declare interface Logger {
    error(message: string): void;
    warn(message: string): void;
    info(message: string): void;
    debug(message: string): void;
}

export default (github.context.action
    ? {
          error: core.error,
          warn: core.warning,
          debug: core.debug,
          info: core.info,
      }
    : console) satisfies Logger;
