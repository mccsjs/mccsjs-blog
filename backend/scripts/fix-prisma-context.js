const fs = require('fs');
const path = require('path');

const routeFiles = [
  'src/routes/categories.ts',
  'src/routes/tags.ts',
  'src/routes/comments.ts',
  'src/routes/settings.ts',
  'src/routes/menus.ts',
  'src/routes/visitor-logs.ts',
  'src/routes/friends/index.ts',
  'src/routes/friends/check.ts',
  'src/routes/friends/rss.ts',
];

for (const file of routeFiles) {
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove 'prisma' from context destructuring
  // Matches: async ({ prisma, ... }) or async ({ prisma }: any)
  const prismaPattern = /\{\s*prisma\s*,/g;
  const prismaPattern2 = /\{\s*prisma\s*\}/g;
  
  if (content.match(prismaPattern) || content.match(prismaPattern2)) {
    content = content.replace(/\{\s*prisma\s*,/g, '{');
    content = content.replace(/\{\s*prisma\s*\}/g, '{}');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No changes needed: ${file}`);
  }
}

console.log('\nDone! Files fixed. Now restart the backend.');
