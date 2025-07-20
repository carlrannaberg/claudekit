#!/usr/bin/env tsx
/**
 * Claude Code Session Analyzer
 * Analyzes Claude Code session files for productivity metrics and patterns.
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface SessionEntry {
  timestamp: string;
  [key: string]: any;
}

interface GapAnalysis {
  shortGaps: number;
  moderateGaps: number;
  longGaps: number;
  avgModerateGap: number;
  longestGap: number;
}

interface SessionAnalysis {
  sessionStart: string;
  sessionEnd: string;
  totalDurationHours: number;
  totalEvents: number;
  eventsPerHour: number;
  eventsPerMinute: number;
  activeEventsPerMinute: number;
  totalActiveTimeHours: number;
  totalIdleTimeHours: number;
  activityPercentage: number;
  gapAnalysis: GapAnalysis;
  hourlyActivity: Record<number, number>;
  peakHours: Array<[number, number]>;
}

function parseTimestamp(tsStr: string): Date {
  return new Date(tsStr);
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
}

function calculateGaps(timestamps: Date[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const gap = (timestamps[i].getTime() - timestamps[i - 1].getTime()) / (1000 * 60);
    gaps.push(gap);
  }
  return gaps;
}

function findSessionFile(projectPath: string, startTime: string): string {
  const sessionDir = join(homedir(), '.claude', 'projects', `-${projectPath.replace(/\//g, '-')}`);
  
  if (!existsSync(sessionDir)) {
    throw new Error(`Session directory not found: ${sessionDir}`);
  }
  
  const startDt = parseTimestamp(startTime);
  
  const sessionFiles = readdirSync(sessionDir).filter(f => f.endsWith('.jsonl'));
  
  for (const sessionFile of sessionFiles) {
    try {
      const filePath = join(sessionDir, sessionFile);
      const content = readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n');
      
      if (lines.length === 0) continue;
      
      const firstEntry = JSON.parse(lines[0]) as SessionEntry;
      const lastEntry = JSON.parse(lines[lines.length - 1]) as SessionEntry;
      
      const firstTs = parseTimestamp(firstEntry.timestamp);
      const lastTs = parseTimestamp(lastEntry.timestamp);
      
      if (firstTs <= startDt && startDt <= lastTs) {
        return filePath;
      }
    } catch (error) {
      continue;
    }
  }
  
  throw new Error(`No session file found containing timestamp ${startTime}`);
}

function analyzeSessionFile(filePath: string, startTime?: string, endTime?: string): SessionAnalysis {
  console.log(`📖 Reading session file: ${filePath.split('/').pop()}`);
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  const timestamps: Date[] = [];
  let totalEvents = 0;
  
  const startDt = startTime ? parseTimestamp(startTime) : null;
  const endDt = endTime ? parseTimestamp(endTime) : null;
  
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as SessionEntry;
      if (entry.timestamp) {
        const ts = parseTimestamp(entry.timestamp);
        
        if (startDt && ts < startDt) continue;
        if (endDt && ts > endDt) continue;
        
        timestamps.push(ts);
        totalEvents++;
      }
    } catch (error) {
      continue;
    }
  }
  
  if (timestamps.length === 0) {
    throw new Error('No valid timestamps found in range');
  }
  
  // Calculate basic metrics
  const sessionStart = timestamps[0];
  const sessionEnd = timestamps[timestamps.length - 1];
  const totalDuration = (sessionEnd.getTime() - sessionStart.getTime()) / 1000;
  
  // Calculate gaps and activity patterns
  const gaps = calculateGaps(timestamps);
  
  // Classify gaps
  const shortGaps = gaps.filter(g => g < 5);
  const moderateGaps = gaps.filter(g => g >= 5 && g < 30);
  const longGaps = gaps.filter(g => g >= 30);
  
  // Calculate active vs idle time
  const totalIdleTime = longGaps.reduce((sum, gap) => sum + gap, 0);
  const totalActiveTime = (totalDuration / 60) - totalIdleTime;
  
  // Activity intensity by hour
  const hourlyActivity: Record<number, number> = {};
  for (const ts of timestamps) {
    const hour = ts.getHours();
    hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
  }
  
  // Calculate productivity metrics
  const eventsPerHour = totalDuration > 0 ? totalEvents / (totalDuration / 3600) : 0;
  const eventsPerMinute = totalDuration > 0 ? totalEvents / (totalDuration / 60) : 0;
  const activeEventsPerMinute = totalActiveTime > 0 ? totalEvents / totalActiveTime : 0;
  
  // Peak hours
  const peakHours = Object.entries(hourlyActivity)
    .map(([hour, events]) => [parseInt(hour), events] as [number, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  
  return {
    sessionStart: sessionStart.toISOString(),
    sessionEnd: sessionEnd.toISOString(),
    totalDurationHours: totalDuration / 3600,
    totalEvents,
    eventsPerHour,
    eventsPerMinute,
    activeEventsPerMinute,
    totalActiveTimeHours: totalActiveTime / 60,
    totalIdleTimeHours: totalIdleTime / 60,
    activityPercentage: totalDuration > 0 ? (totalActiveTime / (totalDuration / 60)) * 100 : 0,
    gapAnalysis: {
      shortGaps: shortGaps.length,
      moderateGaps: moderateGaps.length,
      longGaps: longGaps.length,
      avgModerateGap: moderateGaps.length > 0 ? moderateGaps.reduce((a, b) => a + b, 0) / moderateGaps.length : 0,
      longestGap: gaps.length > 0 ? Math.max(...gaps) : 0
    },
    hourlyActivity,
    peakHours
  };
}

function printAnalysisReport(analysis: SessionAnalysis): void {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 CLAUDE CODE SESSION ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  console.log('\n📅 SESSION OVERVIEW');
  console.log(`   Start: ${analysis.sessionStart}`);
  console.log(`   End: ${analysis.sessionEnd}`);
  console.log(`   Duration: ${formatDuration(analysis.totalDurationHours * 3600)}`);
  
  console.log('\n📊 PRODUCTIVITY METRICS');
  console.log(`   Total Events: ${analysis.totalEvents.toLocaleString()}`);
  console.log(`   Events/Hour: ${analysis.eventsPerHour.toFixed(1)}`);
  console.log(`   Events/Minute: ${analysis.eventsPerMinute.toFixed(1)}`);
  console.log(`   Active Events/Minute: ${analysis.activeEventsPerMinute.toFixed(1)}`);
  
  console.log('\n⚡ ACTIVITY ANALYSIS');
  console.log(`   Active Time: ${formatDuration(analysis.totalActiveTimeHours * 3600)} (${analysis.activityPercentage.toFixed(1)}%)`);
  console.log(`   Idle Time: ${formatDuration(analysis.totalIdleTimeHours * 3600)}`);
  
  const gaps = analysis.gapAnalysis;
  console.log('\n🔄 BREAK PATTERNS');
  console.log(`   Short gaps (<5min): ${gaps.shortGaps}`);
  console.log(`   Moderate gaps (5-30min): ${gaps.moderateGaps}`);
  console.log(`   Long gaps (>30min): ${gaps.longGaps}`);
  if (gaps.moderateGaps > 0) {
    console.log(`   Avg moderate gap: ${gaps.avgModerateGap.toFixed(1)} minutes`);
  }
  console.log(`   Longest gap: ${gaps.longestGap.toFixed(1)} minutes`);
  
  console.log('\n🕐 PEAK ACTIVITY HOURS');
  for (const [hour, events] of analysis.peakHours) {
    console.log(`   Hour ${hour.toString().padStart(2, '0')}: ${events} events (${(events/analysis.totalEvents*100).toFixed(1)}%)`);
  }
  
  // Performance assessment
  const efficiencyScore = Math.min(100, (analysis.eventsPerHour / 400) * 100);
  const enduranceScore = Math.min(100, analysis.activityPercentage);
  const overallScore = (efficiencyScore + enduranceScore) / 2;
  
  console.log('\n🏆 PERFORMANCE SCORES');
  console.log(`   Efficiency: ${efficiencyScore.toFixed(0)}/100`);
  console.log(`   Endurance: ${enduranceScore.toFixed(0)}/100`);
  console.log(`   Overall: ${overallScore.toFixed(0)}/100`);
  
  if (overallScore >= 90) {
    console.log('   🌟 EXCEPTIONAL PERFORMANCE!');
  } else if (overallScore >= 80) {
    console.log('   🚀 EXCELLENT WORK!');
  } else if (overallScore >= 70) {
    console.log('   ✅ SOLID PRODUCTIVITY');
  } else {
    console.log('   📈 ROOM FOR IMPROVEMENT');
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Usage: tsx session-analyzer.ts --start <timestamp> [options]

Options:
  --start <timestamp>     Start timestamp (ISO format) [required]
  --end <timestamp>       End timestamp (ISO format)
  --session-file <path>   Specific session file to analyze
  --project-path <path>   Project path (for auto-finding session) [default: current dir]
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
  const sessionFile = getArg('--session-file');
  const projectPath = getArg('--project-path') || process.cwd();
  
  if (!startTime) {
    console.error('❌ Error: --start timestamp is required');
    process.exit(1);
  }
  
  try {
    const filePath = sessionFile || findSessionFile(projectPath, startTime);
    
    console.log(`🔍 Analyzing session: ${filePath}`);
    const analysis = analyzeSessionFile(filePath, startTime, endTime);
    
    printAnalysisReport(analysis);
    
  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeSessionFile, findSessionFile, printAnalysisReport };