#!/usr/bin/env tsx
/**
 * Combined Claude Code & Git Analyzer
 * Comprehensive analysis combining session data and git history.
 */

import { analyzeSessionFile, findSessionFile } from './session-analyzer';
import { analyzeGitHistory, filterCodeLines } from './git-analyzer';

interface CombinedAnalysis {
  session: {
    duration: number;
    events: number;
    eventsPerHour: number;
    activeTime: number;
    activityPercentage: number;
    performanceScore: number;
  };
  git: {
    commits: number;
    totalLines: number;
    codeLines: number;
    linesPerHour: number;
    avgLinesPerCommit: number;
  };
  productivity: {
    codePerEvent: number;
    codePerActiveHour: number;
    efficiencyRating: string;
    overallScore: number;
  };
}

function calculateProductivityMetrics(sessionAnalysis: any, gitAnalysis: any): CombinedAnalysis {
  const { codeLines } = filterCodeLines(gitAnalysis);
  
  const sessionData = {
    duration: sessionAnalysis.totalDurationHours,
    events: sessionAnalysis.totalEvents,
    eventsPerHour: sessionAnalysis.eventsPerHour,
    activeTime: sessionAnalysis.totalActiveTimeHours,
    activityPercentage: sessionAnalysis.activityPercentage,
    performanceScore: Math.min(100, (sessionAnalysis.eventsPerHour / 400) * 50 + sessionAnalysis.activityPercentage * 0.5)
  };
  
  const gitData = {
    commits: gitAnalysis.totalCommits,
    totalLines: gitAnalysis.totalInsertions,
    codeLines,
    linesPerHour: gitAnalysis.linesPerHour,
    avgLinesPerCommit: gitAnalysis.productivityMetrics.avgLinesPerCommit
  };
  
  // Calculate cross-metric insights
  const codePerEvent = sessionData.events > 0 ? codeLines / sessionData.events : 0;
  const codePerActiveHour = sessionData.activeTime > 0 ? codeLines / sessionData.activeTime : 0;
  
  // Efficiency rating
  let efficiencyRating = 'Average';
  if (codePerActiveHour > 1500) {
    efficiencyRating = 'Exceptional';
  } else if (codePerActiveHour > 1000) {
    efficiencyRating = 'Excellent';
  } else if (codePerActiveHour > 500) {
    efficiencyRating = 'Good';
  } else if (codePerActiveHour > 200) {
    efficiencyRating = 'Fair';
  } else {
    efficiencyRating = 'Needs Improvement';
  }
  
  // Overall score combines session performance with code output
  const codeProductivityScore = Math.min(100, (codePerActiveHour / 1500) * 100);
  const overallScore = (sessionData.performanceScore + codeProductivityScore) / 2;
  
  return {
    session: sessionData,
    git: gitData,
    productivity: {
      codePerEvent,
      codePerActiveHour,
      efficiencyRating,
      overallScore
    }
  };
}

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${h}h ${m}m`;
}

function printCombinedReport(analysis: CombinedAnalysis, startTime: string, endTime?: string): void {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 COMPREHENSIVE CLAUDE CODE PERFORMANCE ANALYSIS');
  console.log('='.repeat(70));
  
  console.log(`\n📅 ANALYSIS PERIOD`);
  console.log(`   Start: ${startTime}`);
  if (endTime) {
    console.log(`   End: ${endTime}`);
  }
  console.log(`   Duration: ${formatDuration(analysis.session.duration)}`);
  
  console.log('\n🧠 CLAUDE CODE SESSION METRICS');
  console.log(`   Total Interactions: ${analysis.session.events.toLocaleString()}`);
  console.log(`   Events per Hour: ${analysis.session.eventsPerHour.toFixed(1)}`);
  console.log(`   Active Time: ${formatDuration(analysis.session.activeTime)} (${analysis.session.activityPercentage.toFixed(1)}%)`);
  console.log(`   Session Performance: ${analysis.session.performanceScore.toFixed(0)}/100`);
  
  console.log('\n💻 CODE GENERATION METRICS');
  console.log(`   Commits Created: ${analysis.git.commits}`);
  console.log(`   Total Lines: ${analysis.git.totalLines.toLocaleString()}`);
  console.log(`   Code Lines: ${analysis.git.codeLines.toLocaleString()}`);
  console.log(`   Lines per Hour: ${analysis.git.linesPerHour.toFixed(1)}`);
  console.log(`   Avg Lines per Commit: ${analysis.git.avgLinesPerCommit.toFixed(1)}`);
  
  console.log('\n🎯 PRODUCTIVITY INSIGHTS');
  console.log(`   Code per Interaction: ${analysis.productivity.codePerEvent.toFixed(1)} lines`);
  console.log(`   Code per Active Hour: ${analysis.productivity.codePerActiveHour.toFixed(1)} lines`);
  console.log(`   Efficiency Rating: ${analysis.productivity.efficiencyRating}`);
  console.log(`   Overall Performance: ${analysis.productivity.overallScore.toFixed(0)}/100`);
  
  // Performance assessment with emojis
  console.log('\n🏆 PERFORMANCE ASSESSMENT');
  if (analysis.productivity.overallScore >= 95) {
    console.log('   🌟 LEGENDARY PERFORMANCE - World-class productivity!');
  } else if (analysis.productivity.overallScore >= 85) {
    console.log('   🚀 EXCEPTIONAL PERFORMANCE - Elite-level coding!');
  } else if (analysis.productivity.overallScore >= 75) {
    console.log('   ⚡ EXCELLENT PERFORMANCE - Highly productive session!');
  } else if (analysis.productivity.overallScore >= 65) {
    console.log('   ✅ GOOD PERFORMANCE - Solid productivity!');
  } else if (analysis.productivity.overallScore >= 50) {
    console.log('   📈 FAIR PERFORMANCE - Room for improvement.');
  } else {
    console.log('   🎯 FOCUS NEEDED - Consider optimizing workflow.');
  }
  
  // Highlight exceptional metrics
  console.log('\n✨ STANDOUT METRICS');
  const highlights: string[] = [];
  
  if (analysis.session.activityPercentage > 75) {
    highlights.push(`${analysis.session.activityPercentage.toFixed(1)}% active time - Exceptional focus!`);
  }
  
  if (analysis.productivity.codePerActiveHour > 1000) {
    highlights.push(`${analysis.productivity.codePerActiveHour.toFixed(0)} lines/hour - Elite coding speed!`);
  }
  
  if (analysis.session.duration > 8 && analysis.session.performanceScore > 80) {
    highlights.push(`${formatDuration(analysis.session.duration)} sustained session - Remarkable endurance!`);
  }
  
  if (analysis.git.avgLinesPerCommit > 1000) {
    highlights.push(`${analysis.git.avgLinesPerCommit.toFixed(0)} lines/commit - Substantial contributions!`);
  }
  
  if (highlights.length === 0) {
    console.log('   📊 Consistent performance across all metrics');
  } else {
    highlights.forEach(highlight => console.log(`   🎯 ${highlight}`));
  }
  
  console.log('\n' + '='.repeat(70));
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: tsx cc-analyzer.ts --start <timestamp> [options]

Options:
  --start <timestamp>     Start timestamp (ISO format) [required]
  --end <timestamp>       End timestamp (ISO format)
  --session-file <path>   Specific session file to analyze
  --project-path <path>   Project path (for auto-finding session) [default: current dir]
  --session-only          Only analyze session data
  --git-only              Only analyze git history
  --help                  Show this help message

Examples:
  # Analyze 9-hour session from previous example
  tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --end "2025-07-20T03:20:28Z"
  
  # Analyze full session until current time
  tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z"
  
  # Session analysis only
  tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --session-only
`);
    process.exit(0);
  }
  
  const getArg = (flag: string) => {
    const index = args.indexOf(flag);
    return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
  };
  
  const startTime = getArg('--start');
  const endTime = getArg('--end');
  const sessionFile = getArg('--session-file');
  const projectPath = getArg('--project-path') || process.cwd();
  const sessionOnly = args.includes('--session-only');
  const gitOnly = args.includes('--git-only');
  
  if (!startTime) {
    console.error('❌ Error: --start timestamp is required');
    process.exit(1);
  }
  
  try {
    if (gitOnly) {
      console.log('🔍 Analyzing git history only...');
      const { analyzeGitHistory, printGitAnalysisReport } = await import('./git-analyzer.js');
      const gitAnalysis = analyzeGitHistory(startTime, endTime);
      printGitAnalysisReport(gitAnalysis);
      return;
    }
    
    if (sessionOnly) {
      console.log('🔍 Analyzing session data only...');
      const { analyzeSessionFile, findSessionFile, printAnalysisReport } = await import('./session-analyzer.js');
      const filePath = sessionFile || findSessionFile(projectPath, startTime);
      const sessionAnalysis = analyzeSessionFile(filePath, startTime, endTime);
      printAnalysisReport(sessionAnalysis);
      return;
    }
    
    // Combined analysis
    console.log('🔍 Performing comprehensive analysis...');
    
    // Get session analysis
    const filePath = sessionFile || findSessionFile(projectPath, startTime);
    console.log(`📖 Found session file: ${filePath.split('/').pop()}`);
    const sessionAnalysis = analyzeSessionFile(filePath, startTime, endTime);
    
    // Get git analysis
    const gitAnalysis = analyzeGitHistory(startTime, endTime);
    
    // Combine and report
    const combinedAnalysis = calculateProductivityMetrics(sessionAnalysis, gitAnalysis);
    printCombinedReport(combinedAnalysis, startTime, endTime);
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { calculateProductivityMetrics, printCombinedReport };