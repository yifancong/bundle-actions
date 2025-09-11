import { getInput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import SizePlugin from 'size-plugin-core';

async function run(octokit, context, token) {
  try {
    const plugin = new SizePlugin({
      compression: getInput('compression'),
      pattern: getInput('pattern') || '**/dist/**/*.{js,mjs,cjs}',
      exclude: getInput('exclude') || '{**/*.map,**/node_modules/**}'
    });

    // 读取当前文件大小
    const newSizes = await plugin.readFromDisk(process.cwd());
    
    // 读取基准文件大小
    const oldSizes = await plugin.readFromDisk(process.cwd());

    // 计算差异
    const diff = await plugin.getDiff(oldSizes, newSizes);

    // 打印差异
    const cliText = await plugin.printSizes(diff);
    console.log('Size Differences:');
    console.log(cliText);

  } catch (e) {
    setFailed(e.message);
  }
}

(async () => {
  const token = getInput('repo-token');
  const octokit = getOctokit(token);
  await run(octokit, context, token);
})();