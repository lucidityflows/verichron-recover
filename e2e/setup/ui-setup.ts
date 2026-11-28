import { runUiDevSeed } from '../seeding';

export async function uiSetupCommand() {
  await runUiDevSeed();
}
