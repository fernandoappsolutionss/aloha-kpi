import { defineConfig } from '@playwright/test'
import { remoteSettings } from './tests/e2e/helpers/remote-readonly.mjs'
const settings=remoteSettings()
process.env.PLAYWRIGHT_NO_COPY_PROMPT='1'
export default defineConfig({testDir:'./tests/e2e',testMatch:/remote-readonly\.spec\.js/,workers:1,fullyParallel:false,timeout:120000,retries:0,preserveOutput:'never',reporter:[['./tests/e2e/helpers/remote-reporter.mjs']],use:{baseURL:settings.baseURL,channel:'chrome',storageState:undefined,trace:'off',screenshot:'off',video:'off'},projects:[{name:settings.mode,use:{viewport:{width:390,height:844}}}]})
