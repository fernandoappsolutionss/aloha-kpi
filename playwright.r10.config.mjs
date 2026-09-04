import { defineConfig } from '@playwright/test'
import { requireR10Gate } from './tests/e2e/helpers/r10-fixture.mjs'
requireR10Gate()
process.env.PLAYWRIGHT_NO_COPY_PROMPT='1'
const env={...process.env,E2E_NEXT_PROFILE:'center-reports',E2E_NEXT_PORT:'3000',CRM_API_URL:'http://127.0.0.1:4317',E2E_DELIVERY_MODE:'stub'}
const sizes=[[320,568],[375,667],[390,844],[430,932],[768,1024],[1440,900],[1024,900],[1025,900]]
export default defineConfig({
  testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:120000,expect:{timeout:15000},
  outputDir:'test-results/r10',preserveOutput:'never',reporter:[['./tests/e2e/helpers/r10-reporter.mjs']],
  globalSetup:'./tests/e2e/helpers/r10-global-setup.mjs',globalTeardown:'./tests/e2e/helpers/r10-global-teardown.mjs',
  use:{baseURL:'http://127.0.0.1:3000',channel:'chrome',trace:'off',screenshot:'off',video:'off',actionTimeout:15000,navigationTimeout:45000},
  webServer:[{command:'node tests/e2e/helpers/start-next.mjs',url:'http://127.0.0.1:3000',reuseExistingServer:false,timeout:120000,env},
    {command:'node tests/e2e/helpers/crm-readonly-stub.mjs',url:'http://127.0.0.1:4317/health',reuseExistingServer:false,env:{...env,NODE_ENV:'development'}}],
  projects:[{name:'r10-setup',testMatch:/r10-auth\.setup\.js/},
    ...sizes.map(([width,height])=>({name:`r10-${width}`,dependencies:['r10-setup'],testMatch:/(center-reports|full-route-audit|center-user|responsive-states|accessibility)\.spec\.js/,use:{viewport:{width,height}}})),
    {name:'r10-private',dependencies:['r10-setup'],testMatch:/r10-private\.spec\.js/,use:{trace:'off',screenshot:'off',video:'off'}}],
})
