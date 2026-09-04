import { cleanupR8Fixture } from './r8-fixture.mjs'
export default async function teardown() { await cleanupR8Fixture() }
