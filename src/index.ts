import { getInput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import SizePlugin from 'size-plugin-core';
import artifact from '@actions/artifact';
import path from 'path';

async function run(octokit, context, token) {
  try {
    const plugin = new SizePlugin({
      compression: getInput('compression'),
      pattern: getInput('pattern') || '**/dist/**/*.{js,mjs,cjs}',
      exclude: getInput('exclude') || '{**/*.map,**/node_modules/**}'
    });

    // 读取当前文件大小
    const newSizes = await plugin.readFromDisk(process.cwd());
    
    // 获取工作流运行列表
    const { repository } = context;
    const runsResponse = await octokit.rest.actions.listWorkflowRuns({
      owner: repository.owner.login,
      repo: repository.name,
      branch: getInput('branch') || context.ref.replace('refs/heads/', ''),
      status: 'completed',
      per_page: 1
    });

    // 如果有之前的运行记录，下载其构建产物
    let oldSizes = newSizes;
    if (runsResponse.data.total_count > 0) {
      const { data: artifacts } = await octokit.rest.actions.listWorkflowRunArtifacts({
        owner: repository.owner.login,
        repo: repository.name,
        run_id: runsResponse.data.workflow_runs[0].id
      });

      if (artifacts.total_count > 0) {
        const downloadResponse = await artifact.downloadArtifact(artifacts.artifacts[0].id);
        oldSizes = JSON.parse(downloadResponse.toString());
      }
    }

    // 计算差异
    const diff = await plugin.getDiff(oldSizes, newSizes);

    // 打印差异
    const cliText = await plugin.printSizes(diff);
    console.log('Size Differences:');
    console.log(cliText);

    // 上传当前大小数据作为构建产物
    await artifact.uploadArtifact(
      'size-snapshot',
      [path.join(process.cwd(), 'artifacts', '1.json')],
      process.cwd()
    );

  } catch (e) {
    setFailed(e.message);
  }
}

(async () => {
  const token = getInput('repo-token');
  const octokit = getOctokit(token);
  await run(octokit, context, token);
})();