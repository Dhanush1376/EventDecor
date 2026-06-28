import fs from 'fs';
import path from 'path';

const snapshotFile = path.join(__dirname, 'visual_search_snapshot.json');
const newSnapshotFile = path.join(__dirname, 'visual_search_snapshot_new.json');

const oldData = JSON.parse(fs.readFileSync(snapshotFile, 'utf8'));
const newData = JSON.parse(fs.readFileSync(newSnapshotFile, 'utf8'));

let differences = 0;
for (let i = 0; i < oldData.length; i++) {
  const oldSample = oldData[i];
  const newSample = newData[i];

  if (oldSample.name !== newSample.name) {
    console.log(`Mismatch in sample names: ${oldSample.name} vs ${newSample.name}`);
    differences++;
  }

  if (JSON.stringify(oldSample.bestMatch) !== JSON.stringify(newSample.bestMatch)) {
    console.log(`Mismatch in bestMatch for ${oldSample.name}`);
    differences++;
  }

  if (JSON.stringify(oldSample.similar) !== JSON.stringify(newSample.similar)) {
    console.log(`Mismatch in similar for ${oldSample.name}`);
    differences++;
  }

  if (JSON.stringify(oldSample.related) !== JSON.stringify(newSample.related)) {
    console.log(`Mismatch in related for ${oldSample.name}`);
    differences++;
  }
}

if (differences === 0) {
  console.log('Visual Search output is IDENTICAL post-refactoring!');
  process.exit(0);
} else {
  console.error(`Found ${differences} differences in output.`);
  process.exit(1);
}
