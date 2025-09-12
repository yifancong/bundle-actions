import { setFailed } from '@actions/core';
import { DefaultArtifactClient } from '@actions/artifact';
import path from 'path';
import * as fs from 'fs';

(async () => {
  try {
    const artifactClient = new DefaultArtifactClient();
    const artifactName = 'size-snapshot';
    const artifactDirectory = path.join(process.cwd(), 'artifacts');
    const fileName = '1.json';
    const filePath = path.join(artifactDirectory, fileName);

    // Upload the artifact
    const uploadResponse = await artifactClient.uploadArtifact(
      artifactName,
      [filePath],
      artifactDirectory,
      {
        retentionDays: 90
      }
    );

    if (!uploadResponse.id) {
      throw new Error('Artifact upload failed: No ID returned.');
    }

    console.log(`Successfully uploaded artifact with ID: ${uploadResponse.id}`);

    // Download the artifact
    const downloadResponse = await artifactClient.downloadArtifact(uploadResponse.id);

    if (!downloadResponse.downloadPath) {
      throw new Error('Artifact download failed: No download path returned.');
    }

    console.log(`Successfully downloaded artifact to: ${downloadResponse.downloadPath}`);

    // Read and log the JSON data from the downloaded artifact
    const downloadedFilePath = path.join(downloadResponse.downloadPath, fileName);
    const fileContent = await fs.promises.readFile(downloadedFilePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);

    console.log('--- Downloaded Artifact JSON Data ---');
    console.log(jsonData);
    console.log('------------------------------------');

  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(String(error));
    }
  }
})();