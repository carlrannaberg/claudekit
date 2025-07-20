#!/usr/bin/env python3
"""
Claude Code Session Analyzer
Analyzes Claude Code session files for productivity metrics and patterns.
"""

import json
import sys
import argparse
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Tuple
import statistics

def parse_timestamp(ts_str: str) -> datetime:
    """Parse ISO timestamp string to datetime object."""
    return datetime.fromisoformat(ts_str.replace('Z', '+00:00'))

def format_duration(seconds: float) -> str:
    """Format duration in seconds to human readable format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    return f"{hours}h {minutes}m {secs}s"

def calculate_gaps(timestamps: List[datetime]) -> List[float]:
    """Calculate gaps between consecutive timestamps in minutes."""
    gaps = []
    for i in range(1, len(timestamps)):
        gap = (timestamps[i] - timestamps[i-1]).total_seconds() / 60
        gaps.append(gap)
    return gaps

def analyze_session_file(file_path: Path, start_time: str = None, end_time: str = None) -> Dict[str, Any]:
    """Analyze a single Claude Code session file."""
    
    timestamps = []
    total_events = 0
    
    start_dt = parse_timestamp(start_time) if start_time else None
    end_dt = parse_timestamp(end_time) if end_time else None
    
    print(f"📖 Reading session file: {file_path.name}")
    
    with open(file_path, 'r') as f:
        for line in f:
            try:
                entry = json.loads(line.strip())
                if 'timestamp' in entry:
                    ts = parse_timestamp(entry['timestamp'])
                    
                    # Filter by time range if specified
                    if start_dt and ts < start_dt:
                        continue
                    if end_dt and ts > end_dt:
                        continue
                        
                    timestamps.append(ts)
                    total_events += 1
            except json.JSONDecodeError:
                continue
    
    if not timestamps:
        return {"error": "No valid timestamps found in range"}
    
    # Calculate basic metrics
    session_start = timestamps[0]
    session_end = timestamps[-1]
    total_duration = (session_end - session_start).total_seconds()
    
    # Calculate gaps and activity patterns
    gaps = calculate_gaps(timestamps)
    
    # Classify gaps
    short_gaps = [g for g in gaps if g < 5]  # < 5 minutes
    moderate_gaps = [g for g in gaps if 5 <= g < 30]  # 5-30 minutes
    long_gaps = [g for g in gaps if g >= 30]  # >= 30 minutes
    
    # Calculate active vs idle time
    total_idle_time = sum(long_gaps)
    total_active_time = (total_duration / 60) - total_idle_time
    
    # Activity intensity by hour
    hourly_activity = {}
    for ts in timestamps:
        hour = ts.hour
        hourly_activity[hour] = hourly_activity.get(hour, 0) + 1
    
    # Calculate productivity metrics
    events_per_hour = total_events / (total_duration / 3600) if total_duration > 0 else 0
    events_per_minute = total_events / (total_duration / 60) if total_duration > 0 else 0
    active_events_per_minute = total_events / total_active_time if total_active_time > 0 else 0
    
    return {
        "session_start": session_start.isoformat(),
        "session_end": session_end.isoformat(),
        "total_duration_hours": total_duration / 3600,
        "total_events": total_events,
        "events_per_hour": events_per_hour,
        "events_per_minute": events_per_minute,
        "active_events_per_minute": active_events_per_minute,
        "total_active_time_hours": total_active_time / 60,
        "total_idle_time_hours": total_idle_time / 60,
        "activity_percentage": (total_active_time / (total_duration / 60)) * 100 if total_duration > 0 else 0,
        "gap_analysis": {
            "short_gaps": len(short_gaps),
            "moderate_gaps": len(moderate_gaps),
            "long_gaps": len(long_gaps),
            "avg_moderate_gap": statistics.mean(moderate_gaps) if moderate_gaps else 0,
            "longest_gap": max(gaps) if gaps else 0
        },
        "hourly_activity": dict(sorted(hourly_activity.items())),
        "peak_hours": sorted(hourly_activity.items(), key=lambda x: x[1], reverse=True)[:3]
    }

def find_session_file(project_path: Path, start_time: str) -> Path:
    """Find the session file that contains the given start time."""
    session_dir = Path.home() / ".claude" / "projects" / f"-{str(project_path).replace('/', '-')}"
    
    if not session_dir.exists():
        raise FileNotFoundError(f"Session directory not found: {session_dir}")
    
    start_dt = parse_timestamp(start_time)
    
    # Check each session file
    for session_file in session_dir.glob("*.jsonl"):
        try:
            # Check first and last timestamps
            with open(session_file, 'r') as f:
                first_line = f.readline().strip()
                if first_line:
                    first_entry = json.loads(first_line)
                    first_ts = parse_timestamp(first_entry['timestamp'])
                    
                    # Read last line
                    f.seek(0, 2)  # Go to end
                    file_size = f.tell()
                    f.seek(max(0, file_size - 1000))  # Go back 1000 chars
                    lines = f.readlines()
                    last_line = lines[-1].strip() if lines else first_line
                    last_entry = json.loads(last_line)
                    last_ts = parse_timestamp(last_entry['timestamp'])
                    
                    # Check if start_time falls within this session
                    if first_ts <= start_dt <= last_ts:
                        return session_file
        except (json.JSONDecodeError, KeyError):
            continue
    
    raise FileNotFoundError(f"No session file found containing timestamp {start_time}")

def print_analysis_report(analysis: Dict[str, Any]) -> None:
    """Print a formatted analysis report."""
    print("\n" + "="*60)
    print("🚀 CLAUDE CODE SESSION ANALYSIS REPORT")
    print("="*60)
    
    print(f"\n📅 SESSION OVERVIEW")
    print(f"   Start: {analysis['session_start']}")
    print(f"   End: {analysis['session_end']}")
    print(f"   Duration: {format_duration(analysis['total_duration_hours'] * 3600)}")
    
    print(f"\n📊 PRODUCTIVITY METRICS")
    print(f"   Total Events: {analysis['total_events']:,}")
    print(f"   Events/Hour: {analysis['events_per_hour']:.1f}")
    print(f"   Events/Minute: {analysis['events_per_minute']:.1f}")
    print(f"   Active Events/Minute: {analysis['active_events_per_minute']:.1f}")
    
    print(f"\n⚡ ACTIVITY ANALYSIS")
    print(f"   Active Time: {format_duration(analysis['total_active_time_hours'] * 3600)} ({analysis['activity_percentage']:.1f}%)")
    print(f"   Idle Time: {format_duration(analysis['total_idle_time_hours'] * 3600)}")
    
    gaps = analysis['gap_analysis']
    print(f"\n🔄 BREAK PATTERNS")
    print(f"   Short gaps (<5min): {gaps['short_gaps']}")
    print(f"   Moderate gaps (5-30min): {gaps['moderate_gaps']}")
    print(f"   Long gaps (>30min): {gaps['long_gaps']}")
    if gaps['moderate_gaps'] > 0:
        print(f"   Avg moderate gap: {gaps['avg_moderate_gap']:.1f} minutes")
    print(f"   Longest gap: {gaps['longest_gap']:.1f} minutes")
    
    print(f"\n🕐 PEAK ACTIVITY HOURS")
    for hour, events in analysis['peak_hours']:
        print(f"   Hour {hour:02d}: {events} events ({events/analysis['total_events']*100:.1f}%)")
    
    # Performance assessment
    efficiency_score = min(100, (analysis['events_per_hour'] / 400) * 100)
    endurance_score = min(100, analysis['activity_percentage'])
    overall_score = (efficiency_score + endurance_score) / 2
    
    print(f"\n🏆 PERFORMANCE SCORES")
    print(f"   Efficiency: {efficiency_score:.0f}/100")
    print(f"   Endurance: {endurance_score:.0f}/100")
    print(f"   Overall: {overall_score:.0f}/100")
    
    if overall_score >= 90:
        print("   🌟 EXCEPTIONAL PERFORMANCE!")
    elif overall_score >= 80:
        print("   🚀 EXCELLENT WORK!")
    elif overall_score >= 70:
        print("   ✅ SOLID PRODUCTIVITY")
    else:
        print("   📈 ROOM FOR IMPROVEMENT")

def main():
    parser = argparse.ArgumentParser(description='Analyze Claude Code session data')
    parser.add_argument('--start', required=True, help='Start timestamp (ISO format)')
    parser.add_argument('--end', help='End timestamp (ISO format)')
    parser.add_argument('--session-file', help='Specific session file to analyze')
    parser.add_argument('--project-path', default='.', help='Project path (for auto-finding session)')
    
    args = parser.parse_args()
    
    try:
        if args.session_file:
            session_file = Path(args.session_file)
        else:
            session_file = find_session_file(Path(args.project_path).resolve(), args.start)
        
        print(f"🔍 Analyzing session: {session_file}")
        analysis = analyze_session_file(session_file, args.start, args.end)
        
        if "error" in analysis:
            print(f"❌ Error: {analysis['error']}")
            return 1
        
        print_analysis_report(analysis)
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())