import { summary } from '@actions/core';
import * as fs from 'fs';

export interface SizeData {
  totalSize: number;
  files: Array<{
    path: string;
    size: number;
    gzipSize?: number;
    brotliSize?: number;
  }>;
}

export interface RsdoctorData {
  data: {
    chunkGraph: {
      assets: Array<{
        id: number;
        path: string;
        size: number;
        chunks: string[];
      }>;
      chunks: Array<{
        id: string;
        name: string;
        initial: boolean;
        size: number;
        assets: string[];
      }>;
    };
  };
}

export interface BundleAnalysis {
  totalSize: number;
  jsSize: number;
  cssSize: number;
  htmlSize: number;
  otherSize: number;
  assets: Array<{
    path: string;
    size: number;
    type: 'js' | 'css' | 'html' | 'other';
  }>;
  chunks: Array<{
    name: string;
    size: number;
    isInitial: boolean;
  }>;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  
  const isNegative = bytes < 0;
  const absBytes = Math.abs(bytes);
  
  if (absBytes === 0) return '0 B';
  
  const i = Math.floor(Math.log(absBytes) / Math.log(k));
  const value = (absBytes / Math.pow(k, i)).toFixed(1);
  
  return `${isNegative ? '-' : ''}${value} ${sizes[i]}`;
}

export function parseRsdoctorData(filePath: string): BundleAnalysis | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Rsdoctor data file not found: ${filePath}`);
      console.log(`📁 Current working directory: ${process.cwd()}`);
      console.log(`📂 Available files in current directory:`);
      try {
        const files = fs.readdirSync(process.cwd());
        files.forEach(file => console.log(`  - ${file}`));
      } catch (e) {
        console.log(`  Error reading directory: ${e}`);
      }
      return null;
    }
    
    const data: RsdoctorData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const { assets, chunks } = data.data.chunkGraph;
    
    let totalSize = 0;
    let jsSize = 0;
    let cssSize = 0;
    let htmlSize = 0;
    let otherSize = 0;
    
    const assetAnalysis = assets.map(asset => {
      totalSize += asset.size;
      
      let type: 'js' | 'css' | 'html' | 'other' = 'other';
      if (asset.path.endsWith('.js')) {
        type = 'js';
        jsSize += asset.size;
      } else if (asset.path.endsWith('.css')) {
        type = 'css';
        cssSize += asset.size;
      } else if (asset.path.endsWith('.html')) {
        type = 'html';
        htmlSize += asset.size;
      } else {
        otherSize += asset.size;
      }
      
      return {
        path: asset.path,
        size: asset.size,
        type
      };
    });
    
    const chunkAnalysis = chunks.map(chunk => ({
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

export function loadSizeData(filePath: string): SizeData | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Size data file not found: ${filePath}`);
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!data.totalSize && data.files) {
      data.totalSize = data.files.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to load size data from ${filePath}:`, error);
    return null;
  }
}

function calculateDiff(current: number, baseline: number): { value: string; emoji: string } {
  if (!baseline || baseline === 0 || isNaN(baseline)) {
    return { value: 'N/A', emoji: '❓' };
  }
  
  if (isNaN(current)) {
    return { value: 'N/A', emoji: '❓' };
  }
  
  const diff = current - baseline;
  const percent = (diff / baseline) * 100;
  
  if (Math.abs(percent) < 1) {
    return { value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`, emoji: '➡️' };
  } else if (diff > 0) {
    return { value: `+${formatBytes(diff)} (+${percent.toFixed(1)}%)`, emoji: '📈' };
  } else {
    return { value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`, emoji: '📉' };
  }
}

export function generateBundleAnalysisMarkdown(current: BundleAnalysis, baseline?: BundleAnalysis): string {
  let markdown = '## 📦 Bundle Analysis Report\n\n';
  
  if (!baseline) {
    markdown += '> ⚠️ **No baseline data found** - Unable to perform comparison analysis\n\n';
  }
  
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

export async function generateBundleAnalysisReport(
  current: BundleAnalysis, 
  baseline?: BundleAnalysis,
  options?: {
    conclusion?: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out';
    status?: 'queued' | 'in_progress' | 'completed';
    checkRunName?: string;
    annotations?: Array<{
      path: string;
      start_line: number;
      end_line: number;
      annotation_level: 'notice' | 'warning' | 'failure';
      message: string;
      title?: string;
    }>;
  }
): Promise<void> {
  const { context } = require('@actions/github');
  const { getOctokit } = require('@actions/github');
  const { getInput } = require('@actions/core');
  
  const octokit = getOctokit(getInput('github_token', { required: true }));
  
  // Determine conclusion based on bundle size changes
  let conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' = 'success';
  let annotations: any[] = [];
  
  if (baseline) {
    const totalDiff = current.totalSize - baseline.totalSize;
    const totalPercent = (totalDiff / baseline.totalSize) * 100;
    
    // Set conclusion based on size increase
    if (totalPercent > 10) {
      conclusion = 'failure';
      annotations.push({
        path: 'bundle-analysis',
        start_line: 1,
        end_line: 1,
        annotation_level: 'failure' as const,
        message: `Bundle size increased by ${formatBytes(totalDiff)} (${totalPercent.toFixed(1)}%)`,
        title: 'Bundle Size Increase'
      });
    } else if (totalPercent > 5) {
      conclusion = 'neutral';
      annotations.push({
        path: 'bundle-analysis',
        start_line: 1,
        end_line: 1,
        annotation_level: 'warning' as const,
        message: `Bundle size increased by ${formatBytes(totalDiff)} (${totalPercent.toFixed(1)}%)`,
        title: 'Bundle Size Increase'
      });
    } else if (totalPercent < -5) {
      annotations.push({
        path: 'bundle-analysis',
        start_line: 1,
        end_line: 1,
        annotation_level: 'notice' as const,
        message: `Bundle size decreased by ${formatBytes(Math.abs(totalDiff))} (${Math.abs(totalPercent).toFixed(1)}%)`,
        title: 'Bundle Size Decrease'
      });
    }
  }
  
  // Override conclusion if provided
  if (options?.conclusion) {
    conclusion = options.conclusion;
  }
  
  // Add custom annotations if provided
  if (options?.annotations) {
    annotations.push(...options.annotations);
  }
  
  const checkRunSummary = `## 📦 Bundle Analysis Report
  
${!baseline ? '> ⚠️ **No baseline data found** - Unable to perform comparison analysis' : ''}

${generateBundleAnalysisMarkdown(current, baseline)}

*Generated by Bundle Size Action*`;

  try {
    // Create check run
    const checkRun = await octokit.rest.checks.create({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: options?.checkRunName || 'Bundle Size Analysis',
      head_sha: context.sha,
      status: options?.status || 'completed',
      conclusion: conclusion,
      output: {
        title: 'Bundle Size Analysis Complete',
        summary: checkRunSummary,
        text: generateBundleAnalysisMarkdown(current, baseline),
        annotations: annotations.length > 0 ? annotations : undefined
      }
    });
    
    console.log(`✅ Created check run: ${checkRun.data.html_url}`);
    console.log(`📊 Check run conclusion: ${conclusion}`);
    if (annotations.length > 0) {
      console.log(`📝 Added ${annotations.length} annotations`);
    }
  } catch (error) {
    console.error(`❌ Failed to create check run: ${error}`);
    
    // Fallback to GitHub summary
    await summary
      .addHeading('📦 Bundle Analysis Report', 2);
    
    if (!baseline) {
      await summary
        .addRaw('> ⚠️ **No baseline data found** - Unable to perform comparison analysis')
        .addSeparator();
    } else {
      await summary.addSeparator();
    }
    
    const mainTable = [
      [
        { data: 'Metric', header: true },
        { data: 'Current', header: true },
        { data: 'Baseline', header: true },
        { data: 'Change', header: true }
      ],
      [
        { data: '📊 Total Size', header: false },
        { data: formatBytes(current.totalSize), header: false },
        { data: baseline ? formatBytes(baseline.totalSize) : formatBytes(current.totalSize), header: false },
        { data: baseline ? calculateDiff(current.totalSize, baseline.totalSize).value : 'N/A', header: false }
      ],
      [
        { data: '📄 JavaScript', header: false },
        { data: formatBytes(current.jsSize), header: false },
        { data: baseline ? formatBytes(baseline.jsSize) : formatBytes(current.jsSize), header: false },
        { data: baseline ? calculateDiff(current.jsSize, baseline.jsSize).value : 'N/A', header: false }
      ],
      [
        { data: '🎨 CSS', header: false },
        { data: formatBytes(current.cssSize), header: false },
        { data: baseline ? formatBytes(baseline.cssSize) : formatBytes(current.cssSize), header: false },
        { data: baseline ? calculateDiff(current.cssSize, baseline.cssSize).value : 'N/A', header: false }
      ],
      [
        { data: '🌐 HTML', header: false },
        { data: formatBytes(current.htmlSize), header: false },
        { data: baseline ? formatBytes(baseline.htmlSize) : formatBytes(current.htmlSize), header: false },
        { data: baseline ? calculateDiff(current.htmlSize, baseline.htmlSize).value : 'N/A', header: false }
      ],
      [
        { data: '📁 Other Assets', header: false },
        { data: formatBytes(current.otherSize), header: false },
        { data: baseline ? formatBytes(baseline.otherSize) : formatBytes(current.otherSize), header: false },
        { data: baseline ? calculateDiff(current.otherSize, baseline.otherSize).value : 'N/A', header: false }
      ]
    ];
    
    await summary
      .addTable(mainTable)
      .addSeparator();
    
    await summary
      .addSeparator()
      .addRaw('<sub>Generated by Bundle Size Action</sub>');
    
    await summary.write();
    
    console.log('✅ Bundle analysis report generated successfully (fallback to summary)');
  }
}

export async function generateSizeReport(current: SizeData, baseline?: SizeData): Promise<void> {
  await summary
    .addHeading('📦 Bundle Size Report', 2)
    .addSeparator();
  
  const reportTable = [
    [
      { data: 'Metric', header: true },
      { data: 'Current', header: true },
      { data: 'Baseline', header: true }
    ],
    [
      { data: '📊 Total Size', header: false },
      { data: formatBytes(current.totalSize), header: false },
      { data: baseline ? formatBytes(baseline.totalSize) : 'N/A', header: false }
    ]
  ];
  
  await summary
    .addTable(reportTable)
    .addSeparator();
  
  if (current.files && current.files.length > 0) {
    await summary.addHeading('📄 File Details', 3);
    
    const fileTable = [
      [
        { data: 'File', header: true },
        { data: 'Size', header: true }
      ]
    ];
    
    for (const file of current.files) {
      fileTable.push([
        { data: file.path, header: false },
        { data: formatBytes(file.size), header: false }
      ]);
    }
    
    await summary.addTable(fileTable);
  }
  
  await summary
    .addSeparator()
    .addRaw('<sub>Generated by Bundle Size Action</sub>');
  
  await summary.write();
  
  console.log('✅ Bundle size report card generated successfully');
}
