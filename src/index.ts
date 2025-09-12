import { setFailed } from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';
import path from 'path';

(async () => {
  try {
    const artifactClient = new DefaultArtifactClient();
    const snapshotPath = path.join(process.cwd(), 'artifacts', '1.json');

    await artifactClient.uploadArtifact(
      'size-snapshot',
      [snapshotPath],
      process.cwd(),
      {
        retentionDays: 90
      }
    );

    console.log('Successfully uploaded artifact.');

  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    }
  }
})();