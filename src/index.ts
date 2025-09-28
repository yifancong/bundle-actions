import { setFailed, getInput } from '@actions/core';
import { uploadArtifact } from './upload';
import { downloadArtifactByCommitHash } from './download';
import { GitHubService } from './github';
import { loadSizeData, generateSizeReport, getDemoBaselineData, parseRsdoctorData, generateBundleAnalysisReport, BundleAnalysis } from './report';
import path from 'path';

// Helper function to determine if this is a merge event
function isMergeEvent(): boolean {
  const { context } = require('@actions/github');
  return context.eventName === 'push' && context.payload.ref === `refs/heads/${context.payload.repository.default_branch}`;
}

// Helper function to determine if this is a PR event
function isPullRequestEvent(): boolean {
  const { context } = require('@actions/github');
  return context.eventName === 'pull_request';
}

(async () => {
  try {
    const githubService = new GitHubService();
    
    const filePath = getInput('file_path');
    if (!filePath) {
      throw new Error('file_path is required');
    }
    const fullPath = path.resolve(process.cwd(), filePath);
    console.log(`Full path: ${fullPath}`);
    
    const fileName = path.basename(filePath);
    const relativePath = path.relative(process.cwd(), fullPath);
    const pathParts = relativePath.split(path.sep);
    const fileNameWithoutExt = path.parse(fileName).name;
    const fileExt = path.parse(fileName).ext;
    
    // Get current commit hash
    const currentCommitHash = githubService.getCurrentCommitHash();
    console.log(`Current commit hash: ${currentCommitHash}`);
    
    // Create artifact name pattern
    const artifactNamePattern = `${pathParts.join('-')}-${fileNameWithoutExt}-`;
    console.log(`Artifact name pattern: ${artifactNamePattern}`);
    
    if (isMergeEvent()) {
      // MR 合入时：只上传当前分支的工件
      console.log('🔄 Detected merge event - uploading current branch artifact only');
      
      const uploadResponse = await uploadArtifact(currentCommitHash, fullPath);
      
      if (typeof uploadResponse.id !== 'number') {
        throw new Error('Artifact upload failed: No artifact ID returned.');
      }
      
      console.log(`✅ Successfully uploaded artifact with ID: ${uploadResponse.id}`);
      
      // Generate simple report for uploaded data
      const currentBundleAnalysis = parseRsdoctorData(fullPath);
      if (currentBundleAnalysis) {
        await generateBundleAnalysisReport(currentBundleAnalysis);
      } else {
        // Fallback to legacy format
        const currentSizeData = loadSizeData(fullPath);
        if (currentSizeData) {
          await generateSizeReport(currentSizeData);
        }
      }
      
    } else if (isPullRequestEvent()) {
      // MR 提交时：只下载目标分支的工件（如果存在）并生成比较报告
      console.log('📥 Detected pull request event - downloading target branch artifact if exists');
      
      // Load current bundle analysis
      const currentBundleAnalysis = parseRsdoctorData(fullPath);
      if (!currentBundleAnalysis) {
        throw new Error(`Failed to load current bundle analysis from: ${fullPath}`);
      }
      
      let baselineBundleAnalysis: BundleAnalysis | null = null;
      
      try {
        // Get target branch latest commit hash
        const targetCommitHash = await githubService.getTargetBranchLatestCommit();
        console.log(`Target branch commit hash: ${targetCommitHash}`);
        
        // Create artifact name for target branch (same naming pattern)
        const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
        console.log(`Looking for target artifact: ${targetArtifactName}`);
        
        // Try to find and download target branch artifact
        try {
          const downloadResult = await downloadArtifactByCommitHash(targetCommitHash, fileName);
          const downloadedBaselinePath = path.join(downloadResult.downloadPath, fileName);
          baselineBundleAnalysis = parseRsdoctorData(downloadedBaselinePath);
          if (!baselineBundleAnalysis) {
            throw new Error('Failed to parse baseline rsdoctor data');
          }
          console.log('✅ Successfully downloaded target branch artifact');
        } catch (downloadError) {
          console.log('ℹ️  No baseline data found - target branch artifact does not exist');
          console.log('📝 Using demo baseline data for comparison');
          
          // Use built-in demo data as baseline for comparison (convert to BundleAnalysis format)
          const demoSizeData = getDemoBaselineData();
          baselineBundleAnalysis = {
            totalSize: demoSizeData.totalSize,
            jsSize: demoSizeData.files.filter(f => f.path.endsWith('.js')).reduce((sum, f) => sum + f.size, 0),
            cssSize: demoSizeData.files.filter(f => f.path.endsWith('.css')).reduce((sum, f) => sum + f.size, 0),
            htmlSize: demoSizeData.files.filter(f => f.path.endsWith('.html')).reduce((sum, f) => sum + f.size, 0),
            otherSize: demoSizeData.files.filter(f => !f.path.endsWith('.js') && !f.path.endsWith('.css') && !f.path.endsWith('.html')).reduce((sum, f) => sum + f.size, 0),
            assets: demoSizeData.files.map(f => ({
              path: f.path,
              size: f.size,
              type: f.path.endsWith('.js') ? 'js' as const : f.path.endsWith('.css') ? 'css' as const : f.path.endsWith('.html') ? 'html' as const : 'other' as const
            })),
            chunks: []
          };
          console.log('✅ Successfully loaded demo baseline data');
        }
        
      } catch (error) {
        console.warn(`⚠️  Failed to get target branch commit: ${error}`);
        console.log('📝 Using demo baseline data for comparison');
        
        // Use built-in demo data as baseline for comparison (convert to BundleAnalysis format)
        const demoSizeData = getDemoBaselineData();
        baselineBundleAnalysis = {
          totalSize: demoSizeData.totalSize,
          jsSize: demoSizeData.files.filter(f => f.path.endsWith('.js')).reduce((sum, f) => sum + f.size, 0),
          cssSize: demoSizeData.files.filter(f => f.path.endsWith('.css')).reduce((sum, f) => sum + f.size, 0),
          htmlSize: demoSizeData.files.filter(f => f.path.endsWith('.html')).reduce((sum, f) => sum + f.size, 0),
          otherSize: demoSizeData.files.filter(f => !f.path.endsWith('.js') && !f.path.endsWith('.css') && !f.path.endsWith('.html')).reduce((sum, f) => sum + f.size, 0),
          assets: demoSizeData.files.map(f => ({
            path: f.path,
            size: f.size,
            type: f.path.endsWith('.js') ? 'js' as const : f.path.endsWith('.css') ? 'css' as const : f.path.endsWith('.html') ? 'html' as const : 'other' as const
          })),
          chunks: []
        };
        console.log('✅ Successfully loaded demo baseline data');
      }
      
      // Generate report card
      await generateBundleAnalysisReport(currentBundleAnalysis, baselineBundleAnalysis || undefined);
      
    } else {
      // 其他情况：默认行为（上传并尝试下载）
      console.log('🔄 Default behavior - uploading and downloading artifacts');
      
      const uploadResponse = await uploadArtifact(currentCommitHash, fullPath);
      
      if (typeof uploadResponse.id !== 'number') {
        throw new Error('Artifact upload failed: No artifact ID returned.');
      }
      
      console.log(`✅ Successfully uploaded artifact with ID: ${uploadResponse.id}`);
      
      // Try to download target branch artifact
      try {
        const targetCommitHash = await githubService.getTargetBranchLatestCommit();
        console.log(`Target branch commit hash: ${targetCommitHash}`);
        
        const targetArtifactName = `${pathParts.join('-')}-${fileNameWithoutExt}-${targetCommitHash}${fileExt}`;
        console.log(`Looking for target artifact: ${targetArtifactName}`);
        
        const downloadResult = await downloadArtifactByCommitHash(targetCommitHash, fileName);
        const downloadedBaselinePath = path.join(downloadResult.downloadPath, fileName);
        const baselineBundleAnalysis = parseRsdoctorData(downloadedBaselinePath);
        
        // Generate report card
        const currentBundleAnalysis = parseRsdoctorData(fullPath);
        if (currentBundleAnalysis) {
          await generateBundleAnalysisReport(currentBundleAnalysis, baselineBundleAnalysis || undefined);
        } else {
          // Fallback to legacy format
          const currentSizeData = loadSizeData(fullPath);
          const baselineSizeData = loadSizeData(downloadedBaselinePath);
          if (currentSizeData) {
            await generateSizeReport(currentSizeData, baselineSizeData || undefined);
          }
        }
        
        console.log('✅ Successfully downloaded target branch artifact');
      } catch (error) {
        console.warn(`⚠️  Failed to download target branch artifact: ${error}`);
        console.log('📝 Using demo baseline data for comparison');
        
        // Generate report card with demo baseline
        const currentBundleAnalysis = parseRsdoctorData(fullPath);
        if (currentBundleAnalysis) {
          const demoSizeData = getDemoBaselineData();
          const demoBaseline: BundleAnalysis = {
            totalSize: demoSizeData.totalSize,
            jsSize: demoSizeData.files.filter(f => f.path.endsWith('.js')).reduce((sum, f) => sum + f.size, 0),
            cssSize: demoSizeData.files.filter(f => f.path.endsWith('.css')).reduce((sum, f) => sum + f.size, 0),
            htmlSize: demoSizeData.files.filter(f => f.path.endsWith('.html')).reduce((sum, f) => sum + f.size, 0),
            otherSize: demoSizeData.files.filter(f => !f.path.endsWith('.js') && !f.path.endsWith('.css') && !f.path.endsWith('.html')).reduce((sum, f) => sum + f.size, 0),
            assets: demoSizeData.files.map(f => ({
              path: f.path,
              size: f.size,
              type: f.path.endsWith('.js') ? 'js' as const : f.path.endsWith('.css') ? 'css' as const : f.path.endsWith('.html') ? 'html' as const : 'other' as const
            })),
            chunks: []
          };
          await generateBundleAnalysisReport(currentBundleAnalysis, demoBaseline);
        } else {
          // Fallback to legacy format
          const currentSizeData = loadSizeData(fullPath);
          if (currentSizeData) {
            const demoBaseline = getDemoBaselineData();
            await generateSizeReport(currentSizeData, demoBaseline);
          }
        }
      }
    }

  } catch (error) {
    if (error instanceof Error) {
      setFailed(error.message);
    } else {
      setFailed(String(error));
    }
  }
})();