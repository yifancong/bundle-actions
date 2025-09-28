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

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Default demo baseline data
 */
const DEFAULT_DEMO_DATA: SizeData = {
  totalSize: 103809024,
  files: [
    {
      path: "dist/main.js",
      size: 51380224,
      gzipSize: 10276045,
      brotliSize: 8220836
    },
    {
      path: "dist/vendor.js",
      size: 41943040,
      gzipSize: 8388608,
      brotliSize: 6291456
    },
    {
      path: "dist/styles.css",
      size: 10485760,
      gzipSize: 2097152,
      brotliSize: 1572864
    }
  ]
};

/**
 * Parse rsdoctor data and extract bundle analysis
 */
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

/**
 * Load size data from JSON file (legacy support)
 */
export function loadSizeData(filePath: string): SizeData | null {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`Size data file not found: ${filePath}`);
      return null;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Calculate total size if not provided
    if (!data.totalSize && data.files) {
      data.totalSize = data.files.reduce((sum: number, file: any) => sum + (file.size || 0), 0);
    }
    
    return data;
  } catch (error) {
    console.error(`Failed to load size data from ${filePath}:`, error);
    return null;
  }
}

/**
 * Get demo baseline data
 */
export function getDemoBaselineData(): SizeData {
  return { ...DEFAULT_DEMO_DATA };
}

/**
 * Calculate size difference and format with emoji
 */
function calculateDiff(current: number, baseline: number): { value: string; emoji: string } {
  if (!baseline) return { value: 'N/A', emoji: '❓' };
  
  const diff = current - baseline;
  const percent = baseline > 0 ? (diff / baseline) * 100 : 0;
  
  if (Math.abs(percent) < 1) {
    return { value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`, emoji: '➡️' };
  } else if (diff > 0) {
    return { value: `+${formatBytes(diff)} (+${percent.toFixed(1)}%)`, emoji: '📈' };
  } else {
    return { value: `${formatBytes(diff)} (${percent.toFixed(1)}%)`, emoji: '📉' };
  }
}

/**
 * Generate detailed bundle analysis report
 */
export async function generateBundleAnalysisReport(current: BundleAnalysis, baseline?: BundleAnalysis): Promise<void> {
  // Start building the summary
  await summary
    .addHeading('📦 Bundle Analysis Report', 2)
    .addSeparator();
  
  // Create main metrics table
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
      { data: baseline ? formatBytes(baseline.totalSize) : 'N/A', header: false },
      { data: baseline ? calculateDiff(current.totalSize, baseline.totalSize).value : 'N/A', header: false }
    ],
    [
      { data: '📄 JavaScript', header: false },
      { data: formatBytes(current.jsSize), header: false },
      { data: baseline ? formatBytes(baseline.jsSize) : 'N/A', header: false },
      { data: baseline ? calculateDiff(current.jsSize, baseline.jsSize).value : 'N/A', header: false }
    ],
    [
      { data: '🎨 CSS', header: false },
      { data: formatBytes(current.cssSize), header: false },
      { data: baseline ? formatBytes(baseline.cssSize) : 'N/A', header: false },
      { data: baseline ? calculateDiff(current.cssSize, baseline.cssSize).value : 'N/A', header: false }
    ],
    [
      { data: '🌐 HTML', header: false },
      { data: formatBytes(current.htmlSize), header: false },
      { data: baseline ? formatBytes(baseline.htmlSize) : 'N/A', header: false },
      { data: baseline ? calculateDiff(current.htmlSize, baseline.htmlSize).value : 'N/A', header: false }
    ],
    [
      { data: '📁 Other Assets', header: false },
      { data: formatBytes(current.otherSize), header: false },
      { data: baseline ? formatBytes(baseline.otherSize) : 'N/A', header: false },
      { data: baseline ? calculateDiff(current.otherSize, baseline.otherSize).value : 'N/A', header: false }
    ]
  ];
  
  await summary
    .addTable(mainTable)
    .addSeparator();
  
  // Add assets breakdown
  if (current.assets && current.assets.length > 0) {
    await summary.addHeading('📄 Assets Breakdown', 3);
    
    const assetTable = [
      [
        { data: 'File', header: true },
        { data: 'Type', header: true },
        { data: 'Size', header: true },
        { data: 'Change', header: true }
      ]
    ];
    
    for (const asset of current.assets) {
      const baselineAsset = baseline?.assets.find(a => a.path === asset.path);
      const change = baselineAsset ? calculateDiff(asset.size, baselineAsset.size) : { value: 'N/A', emoji: '❓' };
      
      assetTable.push([
        { data: asset.path, header: false },
        { data: asset.type.toUpperCase(), header: false },
        { data: formatBytes(asset.size), header: false },
        { data: `${change.emoji} ${change.value}`, header: false }
      ]);
    }
    
    await summary.addTable(assetTable);
    await summary.addSeparator();
  }
  
  // Add chunks analysis
  if (current.chunks && current.chunks.length > 0) {
    await summary.addHeading('🧩 Chunks Analysis', 3);
    
    const chunkTable = [
      [
        { data: 'Chunk Name', header: true },
        { data: 'Size', header: true },
        { data: 'Type', header: true },
        { data: 'Change', header: true }
      ]
    ];
    
    for (const chunk of current.chunks) {
      const baselineChunk = baseline?.chunks.find(c => c.name === chunk.name);
      const change = baselineChunk ? calculateDiff(chunk.size, baselineChunk.size) : { value: 'N/A', emoji: '❓' };
      
      chunkTable.push([
        { data: chunk.name, header: false },
        { data: formatBytes(chunk.size), header: false },
        { data: chunk.isInitial ? 'Initial' : 'Async', header: false },
        { data: `${change.emoji} ${change.value}`, header: false }
      ]);
    }
    
    await summary.addTable(chunkTable);
  }
  
  // Add footer
  await summary
    .addSeparator()
    .addRaw('<sub>Generated by Bundle Size Action</sub>');
  
  // Write the summary
  await summary.write();
  
  console.log('✅ Bundle analysis report generated successfully');
}

/**
 * Generate bundle size report card for GitHub Actions summary (legacy)
 */
export async function generateSizeReport(current: SizeData, baseline?: SizeData): Promise<void> {
  // Start building the summary
  await summary
    .addHeading('📦 Bundle Size Report', 2)
    .addSeparator();
  
  // Create size report card
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
    ],
    [
      { data: '📁 Files Count', header: false },
      { data: current.files ? current.files.length.toString() : '0', header: false },
      { data: baseline?.files ? baseline.files.length.toString() : 'N/A', header: false }
    ]
  ];
  
  await summary
    .addTable(reportTable)
    .addSeparator();
  
  // Add file details if available
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
  
  // Add footer
  await summary
    .addSeparator()
    .addRaw('<sub>Generated by Bundle Size Action</sub>');
  
  // Write the summary
  await summary.write();
  
  console.log('✅ Bundle size report card generated successfully');
}
