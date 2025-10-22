"use strict";
var __webpack_modules__ = {
    "@actions/github": function(module) {
        module.exports = require("@actions/github");
    }
};
var __webpack_module_cache__ = {};
function __webpack_require__(moduleId) {
    var cachedModule = __webpack_module_cache__[moduleId];
    if (void 0 !== cachedModule) return cachedModule.exports;
    var module = __webpack_module_cache__[moduleId] = {
        exports: {}
    };
    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    return module.exports;
}
(()=>{
    __webpack_require__.n = (module)=>{
        var getter = module && module.__esModule ? ()=>module['default'] : ()=>module;
        __webpack_require__.d(getter, {
            a: getter
        });
        return getter;
    };
})();
(()=>{
    __webpack_require__.d = (exports1, definition)=>{
        for(var key in definition)if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports1, key)) Object.defineProperty(exports1, key, {
            enumerable: true,
            get: definition[key]
        });
    };
})();
(()=>{
    __webpack_require__.o = (obj, prop)=>Object.prototype.hasOwnProperty.call(obj, prop);
})();
var __webpack_exports__ = {};
(()=>{
    const core_namespaceObject = require("@actions/core");
    const artifact_namespaceObject = require("@actions/artifact");
    const external_path_namespaceObject = require("path");
    var external_path_default = /*#__PURE__*/ __webpack_require__.n(external_path_namespaceObject);
    const external_fs_namespaceObject = require("fs");
    const external_child_process_namespaceObject = require("child_process");
    async function uploadArtifact(filePath, commitHash) {
        const artifactClient = new artifact_namespaceObject.DefaultArtifactClient();
        const hash = commitHash || (0, external_child_process_namespaceObject.execSync)('git rev-parse --short=10 HEAD', {
            encoding: 'utf8'
        }).trim();
        const targetFilePath = filePath;
        if (!targetFilePath || !external_fs_namespaceObject.existsSync(targetFilePath)) throw new Error(`Target file not found: ${targetFilePath}`);
        const fileName = external_path_default().basename(targetFilePath);
        const relativePath = external_path_default().relative(process.cwd(), targetFilePath);
        const pathParts = relativePath.split(external_path_default().sep);
        const fileNameWithoutExt = external_path_default().parse(fileName).name;
        const fileExt = external_path_default().parse(fileName).ext;
        const artifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${hash}${fileExt}`;
        console.log(`Uploading artifact: ${artifactName}`);
        console.log(`From file: ${targetFilePath}`);
        const uploadResponse = await artifactClient.uploadArtifact(artifactName, [
            targetFilePath
        ], external_path_default().dirname(targetFilePath));
        return uploadResponse;
    }
    var github_ = __webpack_require__("@actions/github");
    class GitHubService {
        octokit;
        repository;
        constructor(){
            this.octokit = (0, github_.getOctokit)((0, core_namespaceObject.getInput)('github_token', {
                required: true
            }));
            const { context } = __webpack_require__("@actions/github");
            this.repository = {
                owner: context.repo.owner,
                repo: context.repo.repo
            };
            console.log(`🔧 GitHub Service initialized for: ${this.repository.owner}/${this.repository.repo}`);
        }
        getCurrentCommitHash() {
            return (0, external_child_process_namespaceObject.execSync)('git rev-parse --short=10 HEAD', {
                encoding: 'utf8'
            }).trim();
        }
        getTargetBranch() {
            const targetBranch = (0, core_namespaceObject.getInput)('target_branch') || 'main';
            return targetBranch;
        }
        async listWorkflowRuns(params) {
            const { owner, repo } = this.repository;
            const runsResponse = await this.octokit.rest.actions.listWorkflowRuns({
                owner,
                repo,
                branch: params.branch,
                status: params.status || 'completed',
                per_page: (params.limit || 10) + (params.skipCommits || 0)
            });
            return runsResponse.data;
        }
        async getTargetBranchLatestCommit() {
            const targetBranch = this.getTargetBranch();
            console.log(`🔍 Attempting to get latest commit for target branch: ${targetBranch}`);
            console.log(`📋 Repository: ${this.repository.owner}/${this.repository.repo}`);
            try {
                console.log(`📡 Trying to get latest commit from GitHub API...`);
                const { owner, repo } = this.repository;
                try {
                    const branchResponse = await this.octokit.rest.repos.getBranch({
                        owner,
                        repo,
                        branch: targetBranch
                    });
                    if (branchResponse.data && branchResponse.data.commit) {
                        const commitHash = branchResponse.data.commit.sha.substring(0, 10);
                        console.log(`✅ Found commit hash from GitHub API: ${commitHash}`);
                        return commitHash;
                    }
                } catch (apiError) {
                    console.warn(`⚠️  GitHub API failed: ${apiError.message}`);
                    const alternativeBranches = [
                        'master',
                        'main',
                        'develop'
                    ];
                    for (const altBranch of alternativeBranches)if (altBranch !== targetBranch) try {
                        console.log(`🔄 Trying alternative branch: ${altBranch}`);
                        const altResponse = await this.octokit.rest.repos.getBranch({
                            owner,
                            repo,
                            branch: altBranch
                        });
                        if (altResponse.data && altResponse.data.commit) {
                            const commitHash = altResponse.data.commit.sha.substring(0, 10);
                            console.log(`✅ Found commit hash from alternative branch ${altBranch}: ${commitHash}`);
                            return commitHash;
                        }
                    } catch (altError) {
                        console.log(`❌ Alternative branch ${altBranch} also failed: ${altError.message}`);
                    }
                }
                console.log(`📋 Trying to get from workflow runs...`);
                try {
                    const runs = await this.listWorkflowRuns({
                        branch: targetBranch,
                        status: 'completed',
                        limit: 10
                    });
                    if (runs.workflow_runs && runs.workflow_runs.length > 0) {
                        console.log(`Found ${runs.workflow_runs.length} workflow runs for ${targetBranch}`);
                        const successfulRun = runs.workflow_runs.find((run)=>'success' === run.conclusion);
                        if (successfulRun) {
                            console.log(`✅ Found successful workflow run for ${targetBranch}: ${successfulRun.head_sha}`);
                            return successfulRun.head_sha.substring(0, 10);
                        }
                        const latestRun = runs.workflow_runs[0];
                        console.log(`⚠️  No successful runs found, using latest workflow run for ${targetBranch}: ${latestRun.head_sha}`);
                        return latestRun.head_sha.substring(0, 10);
                    }
                } catch (workflowError) {
                    console.warn(`⚠️  Failed to get workflow runs: ${workflowError.message}`);
                }
                console.log(`🔧 No workflow runs found for ${targetBranch}, trying to fetch from remote...`);
                try {
                    console.log(`📥 Running: git fetch origin`);
                    (0, external_child_process_namespaceObject.execSync)('git fetch origin', {
                        encoding: 'utf8'
                    });
                    console.log(`📥 Running: git rev-parse --short=10 origin/${targetBranch}`);
                    const commitHash = (0, external_child_process_namespaceObject.execSync)(`git rev-parse --short=10 origin/${targetBranch}`, {
                        encoding: 'utf8'
                    }).trim();
                    console.log(`✅ Found commit hash from git: ${commitHash}`);
                    return commitHash;
                } catch (gitError) {
                    console.warn(`❌ Git fetch failed: ${gitError}`);
                    try {
                        console.log(`📥 Trying alternative: git ls-remote origin ${targetBranch}`);
                        const remoteRef = (0, external_child_process_namespaceObject.execSync)(`git ls-remote origin ${targetBranch}`, {
                            encoding: 'utf8'
                        }).trim();
                        if (remoteRef) {
                            const commitHash = remoteRef.split('\t')[0].substring(0, 10);
                            console.log(`✅ Found commit hash from git ls-remote: ${commitHash}`);
                            return commitHash;
                        }
                    } catch (altError) {
                        console.warn(`❌ Alternative git command failed: ${altError}`);
                    }
                }
                console.error(`❌ All methods to get target branch commit have failed`);
                throw new Error(`Unable to get target branch (${targetBranch}) commit hash. Please ensure the branch exists and you have correct permissions.`);
            } catch (error) {
                console.error(`❌ Failed to get target branch commit: ${error}`);
                console.error(`Repository: ${this.repository.owner}/${this.repository.repo}`);
                console.error(`Target branch: ${targetBranch}`);
                throw new Error(`Failed to get target branch (${targetBranch}) commit: ${error.message}`);
            }
        }
        async listArtifacts() {
            const { owner, repo } = this.repository;
            const artifactsResponse = await this.octokit.rest.actions.listArtifactsForRepo({
                owner,
                repo,
                per_page: 100
            });
            return artifactsResponse.data;
        }
        async findArtifactByNamePattern(pattern) {
            const artifacts = await this.listArtifacts();
            console.log(`Looking for artifacts matching pattern: ${pattern}`);
            console.log(`Available artifacts: ${artifacts.artifacts.map((a)=>a.name).join(', ')}`);
            const matchingArtifacts = artifacts.artifacts.filter((artifact)=>artifact.name.includes(pattern));
            if (matchingArtifacts.length > 0) {
                console.log(`Found ${matchingArtifacts.length} matching artifacts:`, matchingArtifacts.map((a)=>a.name));
                return matchingArtifacts.sort((a, b)=>b.id - a.id)[0];
            }
            console.log(`No artifacts found matching pattern: ${pattern}`);
            return null;
        }
        async downloadArtifact(artifactId) {
            const { owner, repo } = this.repository;
            const downloadResponse = await this.octokit.rest.actions.downloadArtifact({
                owner,
                repo,
                artifact_id: artifactId,
                archive_format: 'zip'
            });
            return downloadResponse.data;
        }
    }
    const external_yauzl_namespaceObject = require("yauzl");
    async function downloadArtifact(artifactId, fileName) {
        console.log(`📥 Downloading artifact ID: ${artifactId}`);
        const githubService = new GitHubService();
        try {
            const downloadResponse = await githubService.downloadArtifact(artifactId);
            const tempDir = external_path_default().join(process.cwd(), 'temp-artifact');
            await external_fs_namespaceObject.promises.mkdir(tempDir, {
                recursive: true
            });
            const zipPath = external_path_default().join(tempDir, 'artifact.zip');
            const buffer = Buffer.from(downloadResponse);
            await external_fs_namespaceObject.promises.writeFile(zipPath, buffer);
            console.log(`✅ Downloaded artifact zip to: ${zipPath}`);
            await new Promise((resolve, reject)=>{
                external_yauzl_namespaceObject.open(zipPath, {
                    lazyEntries: true
                }, (err, zipfile)=>{
                    if (err) return reject(err);
                    zipfile.readEntry();
                    zipfile.on('entry', (entry)=>{
                        if (/\/$/.test(entry.fileName)) zipfile.readEntry();
                        else zipfile.openReadStream(entry, (err, readStream)=>{
                            if (err) return reject(err);
                            const outputPath = external_path_default().join(tempDir, entry.fileName);
                            const outputDir = external_path_default().dirname(outputPath);
                            external_fs_namespaceObject.promises.mkdir(outputDir, {
                                recursive: true
                            }).then(()=>{
                                const writeStream = external_fs_namespaceObject.createWriteStream(outputPath);
                                readStream.pipe(writeStream);
                                writeStream.on('close', ()=>zipfile.readEntry());
                            });
                        });
                    });
                    zipfile.on('end', ()=>resolve());
                    zipfile.on('error', reject);
                });
            });
            console.log(`✅ Extracted artifact to: ${tempDir}`);
            const extractedFiles = await external_fs_namespaceObject.promises.readdir(tempDir, {
                recursive: true
            });
            console.log(`📁 Extracted files: ${extractedFiles.join(', ')}`);
            let targetFilePath = null;
            for (const file of extractedFiles)if (file === fileName || file.endsWith(fileName)) {
                targetFilePath = external_path_default().join(tempDir, file);
                break;
            }
            if (!targetFilePath) throw new Error(`Target file ${fileName} not found in extracted artifact`);
            console.log(`📄 Found target file: ${targetFilePath}`);
            const fileContent = await external_fs_namespaceObject.promises.readFile(targetFilePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);
            console.log('--- Downloaded Artifact JSON Data ---');
            await external_fs_namespaceObject.promises.unlink(zipPath);
            return {
                downloadPath: tempDir,
                jsonData: jsonData
            };
        } catch (error) {
            console.error(`❌ Failed to download and extract artifact: ${error.message}`);
            throw error;
        }
    }
    async function downloadArtifactByCommitHash(commitHash, fileName) {
        console.log(`🔍 Looking for artifact with commit hash: ${commitHash}`);
        const githubService = new GitHubService();
        console.log(`📋 Searching for artifacts matching commit hash: ${commitHash}`);
        const artifact = await githubService.findArtifactByNamePattern(commitHash);
        if (!artifact) {
            console.log(`❌ No artifact found for commit hash: ${commitHash}`);
            console.log(`💡 This might mean:`);
            console.log("   - The target branch hasn't been built yet");
            console.log("   - The artifact name pattern doesn't match");
            console.log("   - The artifact has expired (GitHub artifacts expire after 90 days)");
            throw new Error(`No artifact found for commit hash: ${commitHash}`);
        }
        console.log(`✅ Found artifact: ${artifact.name} (ID: ${artifact.id})`);
        try {
            const artifacts = await githubService.listArtifacts();
            const artifactDetails = artifacts.artifacts.find((a)=>a.id === artifact.id);
            if (artifactDetails) {
                console.log(`📊 Artifact details:`);
                console.log(`   - Created: ${artifactDetails.created_at}`);
                console.log(`   - Expired: ${artifactDetails.expired_at || 'Not expired'}`);
                console.log(`   - Size: ${artifactDetails.size_in_bytes} bytes`);
                if (artifactDetails.expired_at) console.log(`⚠️  Warning: This artifact has expired and may not be downloadable`);
            }
        } catch (detailError) {
            console.warn(`⚠️  Could not get artifact details: ${detailError.message}`);
        }
        console.log(`📥 Downloading artifact...`);
        try {
            return await downloadArtifact(artifact.id, fileName);
        } catch (downloadError) {
            console.error(`❌ Download failed with error: ${downloadError.message}`);
            console.error(`💡 This usually means:`);
            console.error("   - Token lacks 'actions:read' permission for downloading artifacts");
            console.error("   - Artifact is from a different workflow run");
            console.error("   - Artifact download URL is expired or invalid");
            console.error("   - Network or GitHub API issues");
            throw downloadError;
        }
    }
    function formatBytes(bytes) {
        if (0 === bytes) return '0 B';
        const k = 1024;
        const sizes = [
            'B',
            'KB',
            'MB',
            'GB'
        ];
        const isNegative = bytes < 0;
        const absBytes = Math.abs(bytes);
        if (0 === absBytes) return '0 B';
        const i = Math.floor(Math.log(absBytes) / Math.log(k));
        const value = (absBytes / Math.pow(k, i)).toFixed(1);
        return `${isNegative ? '-' : ''}${value} ${sizes[i]}`;
    }
    function parseRsdoctorData(filePath) {
        try {
            if (!external_fs_namespaceObject.existsSync(filePath)) {
                console.log(`❌ Rsdoctor data file not found: ${filePath}`);
                console.log(`📁 Current working directory: ${process.cwd()}`);
                console.log(`📂 Available files in current directory:`);
                try {
                    const files = external_fs_namespaceObject.readdirSync(process.cwd());
                    files.forEach((file)=>console.log(`  - ${file}`));
                } catch (e) {
                    console.log(`  Error reading directory: ${e}`);
                }
                return null;
            }
            const data = JSON.parse(external_fs_namespaceObject.readFileSync(filePath, 'utf8'));
            const { assets, chunks } = data.data.chunkGraph;
            let totalSize = 0;
            let jsSize = 0;
            let cssSize = 0;
            let htmlSize = 0;
            let otherSize = 0;
            const assetAnalysis = assets.map((asset)=>{
                totalSize += asset.size;
                let type = 'other';
                if (asset.path.endsWith('.js')) {
                    type = 'js';
                    jsSize += asset.size;
                } else if (asset.path.endsWith('.css')) {
                    type = 'css';
                    cssSize += asset.size;
                } else if (asset.path.endsWith('.html')) {
                    type = 'html';
                    htmlSize += asset.size;
                } else otherSize += asset.size;
                return {
                    path: asset.path,
                    size: asset.size,
                    type
                };
            });
            const chunkAnalysis = chunks.map((chunk)=>({
                    name: chunk.name,
                    size: chunk.size,
                    isInitial: chunk.initial
                }));
            return {
                totalSize,
                jsSize,
                cssSize,
                htmlSize,
                otherSize,
                assets: assetAnalysis,
                chunks: chunkAnalysis
            };
        } catch (error) {
            console.error(`Failed to parse rsdoctor data from ${filePath}:`, error);
            return null;
        }
    }
    function loadSizeData(filePath) {
        try {
            if (!external_fs_namespaceObject.existsSync(filePath)) {
                console.log(`Size data file not found: ${filePath}`);
                return null;
            }
            const data = JSON.parse(external_fs_namespaceObject.readFileSync(filePath, 'utf8'));
            if (!data.totalSize && data.files) data.totalSize = data.files.reduce((sum, file)=>sum + (file.size || 0), 0);
            return data;
        } catch (error) {
            console.error(`Failed to load size data from ${filePath}:`, error);
            return null;
        }
    }
    function calculateDiff(current, baseline) {
        if (!baseline || 0 === baseline || isNaN(baseline)) return {
            value: 'N/A',
            emoji: '❓'
        };
        if (isNaN(current)) return {
            value: 'N/A',
            emoji: '❓'
        };
        const diff = current - baseline;
        const percent = diff / baseline * 100;
        if (Math.abs(percent) < 1) return {
            value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`,
            emoji: '➡️'
        };
        if (diff > 0) return {
            value: `+${formatBytes(diff)} (+${percent.toFixed(1)}%)`,
            emoji: '📈'
        };
        return {
            value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`,
            emoji: '📉'
        };
    }
    function generateBundleAnalysisMarkdown(current, baseline) {
        let markdown = '## 📦 Bundle Analysis Report\n\n';
        if (!baseline) markdown += '> ⚠️ **No baseline data found** - Unable to perform comparison analysis\n\n';
        markdown += '| Metric | Current | Baseline | Change |\n';
        markdown += '|--------|---------|----------|--------|\n';
        markdown += `| 📊 Total Size | ${formatBytes(current.totalSize)} | ${baseline ? formatBytes(baseline.totalSize) : formatBytes(current.totalSize)} | ${baseline ? calculateDiff(current.totalSize, baseline.totalSize).value : 'N/A'} |\n`;
        markdown += `| 📄 JavaScript | ${formatBytes(current.jsSize)} | ${baseline ? formatBytes(baseline.jsSize) : formatBytes(current.jsSize)} | ${baseline ? calculateDiff(current.jsSize, baseline.jsSize).value : 'N/A'} |\n`;
        markdown += `| 🎨 CSS | ${formatBytes(current.cssSize)} | ${baseline ? formatBytes(baseline.cssSize) : formatBytes(current.cssSize)} | ${baseline ? calculateDiff(current.cssSize, baseline.cssSize).value : 'N/A'} |\n`;
        markdown += `| 🌐 HTML | ${formatBytes(current.htmlSize)} | ${baseline ? formatBytes(baseline.htmlSize) : formatBytes(current.htmlSize)} | ${baseline ? calculateDiff(current.htmlSize, baseline.htmlSize).value : 'N/A'} |\n`;
        markdown += `| 📁 Other Assets | ${formatBytes(current.otherSize)} | ${baseline ? formatBytes(baseline.otherSize) : formatBytes(current.otherSize)} | ${baseline ? calculateDiff(current.otherSize, baseline.otherSize).value : 'N/A'} |\n`;
        markdown += '\n*Generated by Bundle Size Action*\n';
        return markdown;
    }
    async function generateBundleAnalysisReport(current, baseline) {
        await core_namespaceObject.summary.addHeading('📦 Bundle Analysis Report', 2);
        if (baseline) await core_namespaceObject.summary.addSeparator();
        else await core_namespaceObject.summary.addRaw('> ⚠️ **No baseline data found** - Unable to perform comparison analysis').addSeparator();
        const mainTable = [
            [
                {
                    data: 'Metric',
                    header: true
                },
                {
                    data: 'Current',
                    header: true
                },
                {
                    data: 'Baseline',
                    header: true
                },
                {
                    data: 'Change',
                    header: true
                }
            ],
            [
                {
                    data: '📊 Total Size',
                    header: false
                },
                {
                    data: formatBytes(current.totalSize),
                    header: false
                },
                {
                    data: baseline ? formatBytes(baseline.totalSize) : formatBytes(current.totalSize),
                    header: false
                },
                {
                    data: baseline ? calculateDiff(current.totalSize, baseline.totalSize).value : 'N/A',
                    header: false
                }
            ],
            [
                {
                    data: '📄 JavaScript',
                    header: false
                },
                {
                    data: formatBytes(current.jsSize),
                    header: false
                },
                {
                    data: baseline ? formatBytes(baseline.jsSize) : formatBytes(current.jsSize),
                    header: false
                },
                {
                    data: baseline ? calculateDiff(current.jsSize, baseline.jsSize).value : 'N/A',
                    header: false
                }
            ],
            [
                {
                    data: '🎨 CSS',
                    header: false
                },
                {
                    data: formatBytes(current.cssSize),
                    header: false
                },
                {
                    data: baseline ? formatBytes(baseline.cssSize) : formatBytes(current.cssSize),
                    header: false
                },
                {
                    data: baseline ? calculateDiff(current.cssSize, baseline.cssSize).value : 'N/A',
                    header: false
                }
            ],
            [
                {
                    data: '🌐 HTML',
                    header: false
                },
                {
                    data: formatBytes(current.htmlSize),
                    header: false
                },
                {
                    data: baseline ? formatBytes(baseline.htmlSize) : formatBytes(current.htmlSize),
                    header: false
                },
                {
                    data: baseline ? calculateDiff(current.htmlSize, baseline.htmlSize).value : 'N/A',
                    header: false
                }
            ],
            [
                {
                    data: '📁 Other Assets',
                    header: false
                },
                {
                    data: formatBytes(current.otherSize),
                    header: false
                },
                {
                    data: baseline ? formatBytes(baseline.otherSize) : formatBytes(current.otherSize),
                    header: false
                },
                {
                    data: baseline ? calculateDiff(current.otherSize, baseline.otherSize).value : 'N/A',
                    header: false
                }
            ]
        ];
        await core_namespaceObject.summary.addTable(mainTable).addSeparator();
        await core_namespaceObject.summary.addSeparator().addRaw('<sub>Generated by Bundle Size Action</sub>');
        await core_namespaceObject.summary.write();
        console.log('✅ Bundle analysis report generated successfully');
    }
    async function generateSizeReport(current, baseline) {
        await core_namespaceObject.summary.addHeading('📦 Bundle Size Report', 2).addSeparator();
        const reportTable = [
            [
                {
                    data: 'Metric',
                    header: true
                },
                {
                    data: 'Current',
                    header: true
                },
                {
                    data: 'Baseline',
                    header: true
                }
            ],
            [
                {
                    data: '📊 Total Size',
                    header: false
                },
                {
                    data: formatBytes(current.totalSize),
                    header: false
                },
                {
                    data: baseline ? formatBytes(baseline.totalSize) : 'N/A',
                    header: false
                }
            ]
        ];
        await core_namespaceObject.summary.addTable(reportTable).addSeparator();
        if (current.files && current.files.length > 0) {
            await core_namespaceObject.summary.addHeading('📄 File Details', 3);
            const fileTable = [
                [
                    {
                        data: 'File',
                        header: true
                    },
                    {
                        data: 'Size',
                        header: true
                    }
                ]
            ];
            for (const file of current.files)fileTable.push([
                {
                    data: file.path,
                    header: false
                },
                {
                    data: formatBytes(file.size),
                    header: false
                }
            ]);
            await core_namespaceObject.summary.addTable(fileTable);
        }
        await core_namespaceObject.summary.addSeparator().addRaw('<sub>Generated by Bundle Size Action</sub>');
        await core_namespaceObject.summary.write();
        console.log('✅ Bundle size report card generated successfully');
    }
    const external_util_namespaceObject = require("util");
    const execFileAsync = (0, external_util_namespaceObject.promisify)(external_child_process_namespaceObject.execFile);
    function isMergeEvent() {
        const { context } = __webpack_require__("@actions/github");
        return 'push' === context.eventName && context.payload.ref === `refs/heads/${context.payload.repository.default_branch}`;
    }
    function isPullRequestEvent() {
        const { context } = __webpack_require__("@actions/github");
        return 'pull_request' === context.eventName;
    }
    function runRsdoctorViaNode(requirePath, args = []) {
        const nodeExec = process.execPath;
        console.log('process.execPath =', nodeExec);
        console.log('Running:', nodeExec, requirePath, args.join(' '));
        const r = (0, external_child_process_namespaceObject.spawnSync)(nodeExec, [
            requirePath,
            ...args
        ], {
            stdio: 'inherit'
        });
        if (r.error) throw r.error;
        if (0 !== r.status) throw new Error(`rsdoctor exited with code ${r.status}`);
    }
    (async ()=>{
        try {
            const githubService = new GitHubService();
            const filePath = (0, core_namespaceObject.getInput)('file_path');
            if (!filePath) throw new Error('file_path is required');
            const fullPath = external_path_default().resolve(process.cwd(), filePath);
            console.log(`Full path: ${fullPath}`);
            const fileName = external_path_default().basename(filePath);
            const relativePath = external_path_default().relative(process.cwd(), fullPath);
            const pathParts = relativePath.split(external_path_default().sep);
            const fileNameWithoutExt = external_path_default().parse(fileName).name;
            const fileExt = external_path_default().parse(fileName).ext;
            const currentCommitHash = githubService.getCurrentCommitHash();
            console.log(`Current commit hash: ${currentCommitHash}`);
            const artifactNamePattern = `${pathParts.join('-')}-${fileNameWithoutExt}-`;
            console.log(`Artifact name pattern: ${artifactNamePattern}`);
            if (isMergeEvent()) {
                console.log('🔄 Detected merge event - uploading current branch artifact only');
                const uploadResponse = await uploadArtifact(fullPath, currentCommitHash);
                if ('number' != typeof uploadResponse.id) throw new Error('Artifact upload failed: No artifact ID returned.');
                console.log(`✅ Successfully uploaded artifact with ID: ${uploadResponse.id}`);
                const currentBundleAnalysis = parseRsdoctorData(fullPath);
                if (currentBundleAnalysis) await generateBundleAnalysisReport(currentBundleAnalysis);
                else {
                    const currentSizeData = loadSizeData(fullPath);
                    if (currentSizeData) await generateSizeReport(currentSizeData);
                }
            } else if (isPullRequestEvent()) {
                console.log('📥 Detected pull request event - downloading target branch artifact if exists');
                const currentBundleAnalysis = parseRsdoctorData(fullPath);
                if (!currentBundleAnalysis) throw new Error(`Failed to load current bundle analysis from: ${fullPath}`);
                let baselineBundleAnalysis = null;
                let baselineJsonPath = null;
                try {
                    console.log('🔍 Getting target branch commit hash...');
                    const targetCommitHash = await githubService.getTargetBranchLatestCommit();
                    console.log(`✅ Target branch commit hash: ${targetCommitHash}`);
                    const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
                    console.log(`🔍 Looking for target artifact: ${targetArtifactName}`);
                    try {
                        console.log('📥 Attempting to download target branch artifact...');
                        const downloadResult = await downloadArtifactByCommitHash(targetCommitHash, fileName);
                        const downloadedBaselinePath = external_path_default().join(downloadResult.downloadPath, fileName);
                        baselineJsonPath = downloadedBaselinePath;
                        console.log(`📁 Downloaded baseline file path: ${downloadedBaselinePath}`);
                        console.log(`📊 Parsing baseline rsdoctor data...`);
                        baselineBundleAnalysis = parseRsdoctorData(downloadedBaselinePath);
                        if (!baselineBundleAnalysis) throw new Error('Failed to parse baseline rsdoctor data');
                        console.log('✅ Successfully downloaded and parsed target branch artifact');
                    } catch (downloadError) {
                        console.log(`❌ Failed to download target branch artifact: ${downloadError}`);
                        console.log('ℹ️  No baseline data found - target branch artifact does not exist');
                        console.log('📝 No baseline data available for comparison');
                        baselineBundleAnalysis = null;
                    }
                } catch (error) {
                    console.error(`❌ Failed to get target branch commit: ${error}`);
                    console.log('📝 No baseline data available for comparison');
                    baselineBundleAnalysis = null;
                }
                try {
                    if (baselineJsonPath) {
                        const tempOutDir = process.cwd();
                        try {
                            const cliEntry = require.resolve('@rsdoctor/cli', {
                                paths: [
                                    process.cwd()
                                ]
                            });
                            const binCliEntry = external_path_default().join(external_path_default().dirname(external_path_default().dirname(cliEntry)), 'bin', 'rsdoctor');
                            console.log(`🔍 Found rsdoctor CLI at: ${binCliEntry}`);
                            runRsdoctorViaNode(binCliEntry, [
                                'bundle-diff',
                                '--html',
                                `--baseline=${baselineJsonPath}`,
                                `--current=${fullPath}`
                            ]);
                        } catch (e) {
                            console.log(`⚠️ rsdoctor CLI not found in node_modules: ${e}`);
                            try {
                                const shellCmd = `npx @rsdoctor/cli bundle-diff --html --baseline="${baselineJsonPath}" --current="${fullPath}"`;
                                console.log(`🛠️ Running rsdoctor via npx: ${shellCmd}`);
                                await execFileAsync('sh', [
                                    '-c',
                                    shellCmd
                                ], {
                                    cwd: tempOutDir
                                });
                            } catch (npxError) {
                                console.log(`⚠️ npx approach also failed: ${npxError}`);
                                throw new Error(`Failed to run rsdoctor: ${e.message}`);
                            }
                        }
                        const diffHtmlPath = external_path_default().join(tempOutDir, 'rsdoctor-diff.html');
                        try {
                            const uploadRes = await uploadArtifact(diffHtmlPath, currentCommitHash);
                            console.log(`✅ Uploaded bundle diff HTML, artifact id: ${uploadRes.id}`);
                            const runLink = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
                            await core_namespaceObject.summary.addHeading('🧮 Bundle Diff (Rsdoctor)', 3).addLink('Open workflow run to download the diff HTML', runLink).addSeparator();
                            if (isPullRequestEvent()) {
                                const { context } = __webpack_require__("@actions/github");
                                const octokit = __webpack_require__("@actions/github").getOctokit((0, core_namespaceObject.getInput)('github_token', {
                                    required: true
                                }));
                                const bundleAnalysisMarkdown = generateBundleAnalysisMarkdown(currentBundleAnalysis, baselineBundleAnalysis || void 0);
                                const commentBody = `## Rsdoctor Bundle Diff Analysis
              
  A detailed bundle diff analysis has been generated using Rsdoctor. You can download and view the interactive HTML report from the workflow artifacts.

  📦 **Download Link**: [Download Bundle Diff Report](${runLink})

  ${bundleAnalysisMarkdown}

  *Generated by Bundle Size Action*`;
                                try {
                                    await octokit.rest.issues.createComment({
                                        owner: context.repo.owner,
                                        repo: context.repo.repo,
                                        issue_number: context.payload.pull_request.number,
                                        body: commentBody
                                    });
                                    console.log('✅ Added bundle diff comment to PR');
                                } catch (commentError) {
                                    console.warn(`⚠️ Failed to add comment to PR: ${commentError}`);
                                }
                            }
                        } catch (e) {
                            console.warn(`⚠️ Failed to upload or link rsdoctor diff html: ${e}`);
                        }
                    }
                } catch (e) {
                    console.warn(`⚠️ rsdoctor bundle-diff failed: ${e}`);
                }
                await generateBundleAnalysisReport(currentBundleAnalysis, baselineBundleAnalysis || void 0);
            } else {
                console.log('ℹ️ Skipping artifact operations - this action only runs on merge events and pull requests');
                console.log('Current event:', process.env.GITHUB_EVENT_NAME);
                return;
            }
        } catch (error) {
            if (error instanceof Error) (0, core_namespaceObject.setFailed)(error.message);
            else (0, core_namespaceObject.setFailed)(String(error));
        }
    })();
})();
for(var __webpack_i__ in __webpack_exports__)exports[__webpack_i__] = __webpack_exports__[__webpack_i__];
Object.defineProperty(exports, '__esModule', {
    value: true
});
