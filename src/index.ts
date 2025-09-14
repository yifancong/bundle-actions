import { setFailed, summary } from '@actions/core';
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

    // Ensure jsonData is an array for table generation
    const dataForTable = Array.isArray(jsonData) ? jsonData : [jsonData];

    // Generate and write summary table
    if (dataForTable.length > 0) {
      const headers = Object.keys(dataForTable[0]);
      const headerRow = headers.map(h => ({ data: h, header: true }));
      const bodyRows = dataForTable.map(row => headers.map(header => {
        const cellData = row[header];
        // Stringify objects/arrays for proper display in the table
        if (typeof cellData === 'object' && cellData !== null) {
          return JSON.stringify(cellData);
        }
        return String(cellData ?? '');
      }));

      await summary
        .addHeading('Artifact Content')
        .addTable([headerRow, ...bodyRows])
        .write();
      console.log('Successfully wrote artifact content to job summary.');
    } else {
      console.log('JSON data is empty, skipping table generation.');
    }

  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(String(error));
    }
  }
})();