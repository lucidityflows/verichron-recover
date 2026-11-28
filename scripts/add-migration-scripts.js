const fs = require('fs');
const path = require('path');

const appsDir = path.join(__dirname, '../apps');
const apiServices = [
  'api-users',
  'api-organizations',
  'api-debts',
  'api-debtors',
  'api-transactions',
  'api-communications',
  'api-collectors',
  'api-voice',
  'api-workflows',
  'api-automations',
];

const migrationScripts = {
  "migration:generate": "dotenv -e ../../.env.dev -- typeorm-ts-node-commonjs migration:generate -d datasource.ts",
  "migration:create": "dotenv -e ../../.env.dev -- typeorm-ts-node-commonjs migration:create",
  "migration:run": "dotenv -e ../../.env.dev -- typeorm-ts-node-commonjs migration:run -d datasource.ts",
  "migration:revert": "dotenv -e ../../.env.dev -- typeorm-ts-node-commonjs migration:revert -d datasource.ts",
  "migration:show": "dotenv -e ../../.env.dev -- typeorm-ts-node-commonjs migration:show -d datasource.ts"
};

apiServices.forEach(service => {
  const packageJsonPath = path.join(appsDir, service, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    let modified = false;
    if (!packageJson.scripts) {
      packageJson.scripts = {};
    }

    for (const [key, value] of Object.entries(migrationScripts)) {
      if (!packageJson.scripts[key]) {
        packageJson.scripts[key] = value;
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
      console.log(`Updated ${service}/package.json`);
    } else {
      console.log(`No changes needed for ${service}`);
    }
  } else {
    console.warn(`Warning: ${service} does not have a package.json`);
  }
});
