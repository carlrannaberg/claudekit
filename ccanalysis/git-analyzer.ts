#!/usr/bin/env tsx
/**
 * Git History Analyzer
 * Analyzes git commits and code generation during specified time periods.
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

interface CommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: number;
  insertions: number;
  deletions: number;
  fileStats: Array<{
    filename: string;
    insertions: number;
    deletions: number;
  }>;
}

interface CodeAnalysis {
  totalCommits: number;
  totalFiles: number;
  totalLines: number;
  totalInsertions: number;
  totalDeletions: number;
  netLines: number;
  linesPerHour: number;
  commits: CommitInfo[];
  languageBreakdown: Record<string, number>;
  fileTypeBreakdown: Record<string, number>;
  largestCommit: CommitInfo | null;
  productivityMetrics: {
    avgLinesPerCommit: number;
    avgFilesPerCommit: number;
    codeQualityScore: number;
  };
}

function execGit(command: string): string {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8', cwd: process.cwd() });
  } catch (error) {
    throw new Error(`Git command failed: ${command}`);
  }
}

function parseTimestamp(timeStr: string): Date {
  return new Date(timeStr);
}

function getFileExtension(filename: string): string {
  const match = filename.match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : 'no-ext';
}

function getLanguage(filename: string): string {
  const ext = getFileExtension(filename);
  const langMap: Record<string, string> = {
    'ts': 'TypeScript',
    'js': 'JavaScript',
    'tsx': 'TypeScript React',
    'jsx': 'JavaScript React',
    'py': 'Python',
    'rs': 'Rust',
    'go': 'Go',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'h': 'C/C++ Header',
    'md': 'Markdown',
    'json': 'JSON',
    'yaml': 'YAML',
    'yml': 'YAML',
    'toml': 'TOML',
    'sh': 'Shell',
    'bash': 'Bash',
    'zsh': 'Zsh'
  };
  return langMap[ext] || `Other (${ext})`;
}

function parseCommitStats(statsOutput: string): Array<{ filename: string; insertions: number; deletions: number }> {
  const lines = statsOutput.trim().split('\n');
  const fileStats: Array<{ filename: string; insertions: number; deletions: number }> = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const insertions = parseInt(parts[0]) || 0;
      const deletions = parseInt(parts[1]) || 0;
      const filename = parts[2];
      fileStats.push({ filename, insertions, deletions });
    }
  }
  
  return fileStats;
}

function analyzeGitHistory(startTime: string, endTime?: string): CodeAnalysis {
  console.log('🔍 Analyzing git history...');
  
  if (!existsSync('.git')) {
    throw new Error('Not a git repository');
  }
  
  // Build git log command
  let timeRange = `--since="${startTime}"`;
  if (endTime) {
    timeRange += ` --until="${endTime}"`;
  }
  
  // Get commit list
  const logFormat = '--pretty=format:%H|%an|%ai|%s';
  const logOutput = execGit(`log ${timeRange} ${logFormat}`);
  
  if (!logOutput.trim()) {
    return {
      totalCommits: 0,
      totalFiles: 0,
      totalLines: 0,
      totalInsertions: 0,
      totalDeletions: 0,
      netLines: 0,
      linesPerHour: 0,
      commits: [],
      languageBreakdown: {},
      fileTypeBreakdown: {},
      largestCommit: null,
      productivityMetrics: {
        avgLinesPerCommit: 0,
        avgFilesPerCommit: 0,
        codeQualityScore: 0
      }
    };
  }
  
  const commits: CommitInfo[] = [];
  const languageBreakdown: Record<string, number> = {};
  const fileTypeBreakdown: Record<string, number> = {};
  
  let totalInsertions = 0;
  let totalDeletions = 0;
  let totalFiles = 0;
  
  // Parse each commit
  const commitLines = logOutput.trim().split('\n');
  for (const line of commitLines) {
    const [hash, author, date, ...messageParts] = line.split('|');
    const message = messageParts.join('|');
    
    try {
      // Get detailed stats for this commit
      const statsOutput = execGit(`show --numstat --format="" ${hash}`);
      const fileStats = parseCommitStats(statsOutput);
      
      const commitInsertions = fileStats.reduce((sum, file) => sum + file.insertions, 0);
      const commitDeletions = fileStats.reduce((sum, file) => sum + file.deletions, 0);
      const commitFiles = fileStats.length;
      
      // Update language breakdown
      for (const file of fileStats) {
        const language = getLanguage(file.filename);
        const extension = getFileExtension(file.filename);
        
        languageBreakdown[language] = (languageBreakdown[language] || 0) + file.insertions;
        fileTypeBreakdown[extension] = (fileTypeBreakdown[extension] || 0) + file.insertions;
      }
      
      commits.push({
        hash,
        author,
        date,
        message,
        files: commitFiles,
        insertions: commitInsertions,
        deletions: commitDeletions,
        fileStats
      });
      
      totalInsertions += commitInsertions;
      totalDeletions += commitDeletions;
      totalFiles += commitFiles;
      
    } catch (error) {
      console.warn(`⚠️  Could not analyze commit ${hash}: ${error}`);
    }
  }
  
  // Calculate time-based metrics
  const startDate = parseTimestamp(startTime);
  const endDate = endTime ? parseTimestamp(endTime) : new Date();
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  const linesPerHour = durationHours > 0 ? totalInsertions / durationHours : 0;
  
  // Find largest commit
  const largestCommit = commits.length > 0 
    ? commits.reduce((max, commit) => commit.insertions > max.insertions ? commit : max)
    : null;
  
  // Calculate productivity metrics
  const avgLinesPerCommit = commits.length > 0 ? totalInsertions / commits.length : 0;
  const avgFilesPerCommit = commits.length > 0 ? totalFiles / commits.length : 0;
  
  // Code quality score (higher deletion ratio = more refactoring = higher quality)
  const deletionRatio = totalInsertions > 0 ? totalDeletions / totalInsertions : 0;
  const codeQualityScore = Math.min(100, 50 + (deletionRatio * 50));
  
  return {
    totalCommits: commits.length,
    totalFiles,
    totalLines: totalInsertions,
    totalInsertions,
    totalDeletions,
    netLines: totalInsertions - totalDeletions,
    linesPerHour,
    commits,
    languageBreakdown,
    fileTypeBreakdown,
    largestCommit,
    productivityMetrics: {
      avgLinesPerCommit,
      avgFilesPerCommit,
      codeQualityScore
    }
  };
}

function filterCodeLines(analysis: CodeAnalysis): {
  codeLines: number;
  nonCodeLines: number;
  codeBreakdown: Record<string, number>;
} {
  const codeExtensions = new Set(['ts', 'js', 'tsx', 'jsx', 'py', 'rs', 'go', 'java', 'cpp', 'c', 'h']);
  const docExtensions = new Set(['md', 'txt', 'rst']);
  const configExtensions = new Set(['json', 'yaml', 'yml', 'toml', 'xml']);
  
  let codeLines = 0;
  let docLines = 0;
  let configLines = 0;
  let otherLines = 0;
  
  const codeBreakdown: Record<string, number> = {};
  
  for (const [ext, lines] of Object.entries(analysis.fileTypeBreakdown)) {
    if (codeExtensions.has(ext)) {
      codeLines += lines;
      const language = getLanguage(`dummy.${ext}`);
      codeBreakdown[language] = (codeBreakdown[language] || 0) + lines;
    } else if (docExtensions.has(ext)) {
      docLines += lines;
    } else if (configExtensions.has(ext)) {
      configLines += lines;
    } else {
      otherLines += lines;
    }
  }
  
  return {
    codeLines,
    nonCodeLines: docLines + configLines + otherLines,
    codeBreakdown
  };
}

function printGitAnalysisReport(analysis: CodeAnalysis): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 GIT HISTORY ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📈 COMMIT OVERVIEW');
  console.log(`   Total Commits: ${analysis.totalCommits}`);
  console.log(`   Total Files: ${analysis.totalFiles}`);
  console.log(`   Total Lines Added: ${analysis.totalInsertions.toLocaleString()}`);
  console.log(`   Total Lines Deleted: ${analysis.totalDeletions.toLocaleString()}`);
  console.log(`   Net Lines: ${analysis.netLines.toLocaleString()}`);
  
  const { codeLines, nonCodeLines, codeBreakdown } = filterCodeLines(analysis);
  
  console.log('\n💻 CODE GENERATION');
  console.log(`   Code Lines: ${codeLines.toLocaleString()}`);
  console.log(`   Non-Code Lines: ${nonCodeLines.toLocaleString()}`);
  console.log(`   Lines/Hour: ${analysis.linesPerHour.toFixed(1)}`);
  
  console.log('\n🏗️ LANGUAGE BREAKDOWN (Code Only)');
  const sortedCodeLangs = Object.entries(codeBreakdown)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  for (const [language, lines] of sortedCodeLangs) {
    const percentage = (lines / codeLines) * 100;
    console.log(`   ${language}: ${lines.toLocaleString()} lines (${percentage.toFixed(1)}%)`);
  }
  
  console.log('\n📊 PRODUCTIVITY METRICS');
  console.log(`   Avg Lines/Commit: ${analysis.productivityMetrics.avgLinesPerCommit.toFixed(1)}`);
  console.log(`   Avg Files/Commit: ${analysis.productivityMetrics.avgFilesPerCommit.toFixed(1)}`);
  console.log(`   Code Quality Score: ${analysis.productivityMetrics.codeQualityScore.toFixed(0)}/100`);
  
  if (analysis.largestCommit) {
    console.log('\n🚀 LARGEST COMMIT');
    console.log(`   Hash: ${analysis.largestCommit.hash.substring(0, 8)}`);
    console.log(`   Lines: ${analysis.largestCommit.insertions.toLocaleString()}`);
    console.log(`   Files: ${analysis.largestCommit.files}`);
    console.log(`   Message: ${analysis.largestCommit.message.substring(0, 60)}${analysis.largestCommit.message.length > 60 ? '...' : ''}`);
  }
  
  console.log('\n📋 RECENT COMMITS');
  const recentCommits = analysis.commits.slice(0, 5);
  for (const commit of recentCommits) {
    console.log(`   ${commit.hash.substring(0, 8)}: +${commit.insertions} -${commit.deletions} (${commit.files} files)`);
    console.log(`      ${commit.message.substring(0, 80)}${commit.message.length > 80 ? '...' : ''}`);
  }
  
  // Performance assessment
  let performanceLevel = '📈 ROOM FOR IMPROVEMENT';
  if (analysis.linesPerHour > 1000) {
    performanceLevel = '🌟 EXCEPTIONAL PERFORMANCE!';
  } else if (analysis.linesPerHour > 500) {
    performanceLevel = '🚀 EXCELLENT PRODUCTIVITY!';
  } else if (analysis.linesPerHour > 200) {
    performanceLevel = '✅ SOLID PRODUCTIVITY';
  }
  
  console.log(`\n🏆 ASSESSMENT: ${performanceLevel}`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: tsx git-analyzer.ts --start <timestamp> [options]

Options:
  --start <timestamp>     Start timestamp (ISO format) [required]
  --end <timestamp>       End timestamp (ISO format)
  --help                  Show this help message
`);
    process.exit(0);
  }
  
  const getArg = (flag: string) => {
    const index = args.indexOf(flag);
    return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
  };
  
  const startTime = getArg('--start');
  const endTime = getArg('--end');
  
  if (!startTime) {
    console.error('❌ Error: --start timestamp is required');
    process.exit(1);
  }
  
  try {
    const analysis = analyzeGitHistory(startTime, endTime);
    printGitAnalysisReport(analysis);
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeGitHistory, printGitAnalysisReport, filterCodeLines };