#!/usr/bin/env python3
"""
Bloody Jay Registration Templates Generator
Generates BMI, SoundExchange, and MLC registration templates for all tracks
"""

import json
from datetime import datetime
from pathlib import Path

# Load the audit data
with open("data/full_audit_data.json", "r") as f:
    audit_data = json.load(f)

ARTIST_INFO = audit_data["artist"]
ACTIONS = audit_data["actions"]

# Writer Information Template (to be confirmed)
WRITER_INFO = {
    "name": "Justin Ushery",
    "stage_name": "Bloody Jay",
    "pro": "BMI",  # Recommended - to be confirmed
    "ipi_number": "PENDING",
    "publisher": "Bloody Jay Publishing",  # Recommended publisher name
    "publisher_pro": "BMI",
    "split": 50,  # Default writer split - adjust based on actual agreements
    "role": "Writer/Performer"
}

def generate_bmi_template(track):
    """Generate BMI work registration template"""
    template = f"""
================================================================================
BMI WORK REGISTRATION - {track['track_title']}
================================================================================

PORTAL: https://www.bmi.com/register-works

WORK INFORMATION:
  Work Title: {track['track_title']}
  Alternative Title: 
  Work Type: Musical Work
  Content Type: {track['type']}

WRITER INFORMATION:
  Writer Name: {WRITER_INFO['name']}
  Writer IPI #: {WRITER_INFO['ipi_number']}
  Role: Writer
  Split: {WRITER_INFO['split']}%
  
PUBLISHER INFORMATION:
  Publisher Name: {WRITER_INFO['publisher']}
  PRO: {WRITER_INFO['publisher_pro']}
  Split: {WRITER_INFO['split']}%

RELEASE INFORMATION:
  Year: {track['year']}
  Label: {track['label']}
  Project: {track['project']}
  
ISRC: PENDING
ISWC: PENDING (will be assigned by BMI)

REGISTRATION STATUS: PENDING
ACTION: REGISTER

================================================================================
"""
    return template

def generate_soundexchange_template(track):
    """Generate SoundExchange registration template"""
    template = f"""
================================================================================
SOUNDEXCHANGE REGISTRATION - {track['track_title']}
================================================================================

PORTAL: https://www.soundexchange.com/registration/

RECORDING INFORMATION:
  Track Title: {track['track_title']}
  Featured Artist: {WRITER_INFO['stage_name']}
  Primary Artist: {WRITER_INFO['stage_name']}
  Label: {track['label']}
  Release Year: {track['year']}
  
ISRC: PENDING

PERFORMER INFORMATION:
  Performer Name: {WRITER_INFO['name']}
  Role: Featured Artist / Primary Artist
  Payee Status: Featured Artist
  
REGISTRATION STATUS: PENDING
ACTION: REGISTER

NOTES:
  SoundExchange collects digital performance royalties from:
  - SiriusXM Satellite Radio
  - Pandora
  - Spotify
  - Apple Music
  - Other non-interactive streaming services
  
================================================================================
"""
    return template

def generate_mlc_template(track):
    """Generate MLC work registration template"""
    template = f"""
================================================================================
MLC WORK REGISTRATION - {track['track_title']}
================================================================================

PORTAL: https://www.themlc.com/

WORK INFORMATION:
  Work Title: {track['track_title']}
  ISWC: PENDING (will be assigned)
  
WRITER INFORMATION:
  Writer Name: {WRITER_INFO['name']}
  PRO: {WRITER_INFO['pro']}
  IPI #: {WRITER_INFO['ipi_number']}
  Role: Writer
  Split: {WRITER_INFO['split']}%
  
PUBLISHER INFORMATION:
  Publisher Name: {WRITER_INFO['publisher']}
  PRO: {WRITER_INFO['publisher_pro']}
  Split: {WRITER_INFO['split']}%

RECORDING INFORMATION:
  ISRC: PENDING
  Release Year: {track['year']}
  Label: {track['label']}
  
REGISTRATION STATUS: PENDING
ACTION: REGISTER

NOTES:
  MLC collects mechanical royalties from:
  - Spotify
  - Apple Music
  - Amazon Music
  - YouTube Music
  - Other interactive streaming services

================================================================================
"""
    return template

def generate_consolidated_templates():
    """Generate consolidated templates for all tracks"""
    output_lines = []
    output_lines.append("=" * 80)
    output_lines.append("BLOODY JAY REGISTRATION TEMPLATES - CONSOLIDATED")
    output_lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    output_lines.append(f"Total Tracks: {len(ACTIONS)}")
    output_lines.append("Assumption: ZERO REGISTRATIONS ACROSS ALL PROs")
    output_lines.append("=" * 80)
    output_lines.append("")
    
    # Sort by priority
    priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}
    sorted_actions = sorted(ACTIONS, key=lambda x: priority_order.get(x["priority"], 4))
    
    for i, track in enumerate(sorted_actions, 1):
        output_lines.append(f"\n{'=' * 80}")
        output_lines.append(f"TRACK {i} OF {len(ACTIONS)} - PRIORITY: {track['priority']}")
        output_lines.append(f"Project: {track['project']} ({track['year']})")
        output_lines.append(f"{'=' * 80}")
        
        output_lines.append(generate_bmi_template(track))
        output_lines.append(generate_soundexchange_template(track))
        output_lines.append(generate_mlc_template(track))
        
        output_lines.append(f"""
VERIFICATION CHECKLIST:
  [ ] Confirm writer information is correct
  [ ] Obtain ISRC from distributor/streaming platform
  [ ] Submit BMI work registration
  [ ] Submit SoundExchange registration
  [ ] Submit MLC work registration
  [ ] Confirm registration confirmations received
  [ ] Add to tracking spreadsheet

EXPECTED TIMELINE:
  - BMI Registration: 2-4 weeks
  - SoundExchange Registration: 2-4 weeks
  - MLC Registration: 2-4 weeks
  - First Royalty Payment: 6-9 months after registration

================================================================================
""")
    
    return "\n".join(output_lines)

def generate_quick_start_templates():
    """Generate quick-start templates for CRITICAL priority tracks only"""
    critical_tracks = [a for a in ACTIONS if a["priority"] == "CRITICAL"]
    
    quick_start = f"""
================================================================================
BLOODY JAY - QUICK START REGISTRATION GUIDE
================================================================================
CRITICAL PRIORITY TRACKS: {len(critical_tracks)}

These tracks should be registered FIRST due to:
- Young Thug collaborations (high streaming value)
- Label-backed releases (A1, Good Life Music Group)
- Standout records with proven streaming performance

================================================================================
STEP 1: REGISTER WITH BMI
================================================================================

1. Go to: https://www.bmi.com/registration
2. Create songwriter account for: Justin Ushery
3. Create publisher account for: Bloody Jay Publishing
4. Register works in order of priority:

CRITICAL TRACKS TO REGISTER:
"""
    
    for i, track in enumerate(critical_tracks, 1):
        quick_start += f"  {i}. {track['track_title']} ({track['project']}, {track['year']})\n"
    
    quick_start += f"""

================================================================================
STEP 2: REGISTER WITH SOUNDEXCHANGE
================================================================================

1. Go to: https://www.soundexchange.com/registration/
2. Create artist account for: Bloody Jay (Justin Ushery)
3. Register all recordings as featured artist
4. Link to BMI writer account

================================================================================
STEP 3: REGISTER WITH MLC
================================================================================

1. Go to: https://www.themlc.com/
2. Create member account
3. Register all works for mechanical royalties
4. Link to BMI publisher account

================================================================================
IMPORTANT NOTES
================================================================================

- Always use consistent name spelling: "Bloody Jay" and "Justin Ushery"
- Keep track of ISRCs for each recording
- Document all co-writers and their splits
- Save confirmation numbers from each registration

================================================================================
"""
    return quick_start

def save_templates():
    """Save all templates to files"""
    # Create output directory
    Path("docs").mkdir(exist_ok=True)
    
    # Save consolidated templates
    consolidated = generate_consolidated_templates()
    with open("docs/registration_templates_consolidated.txt", "w", encoding="utf-8") as f:
        f.write(consolidated)
    
    # Save quick start guide
    quick_start = generate_quick_start_templates()
    with open("docs/quick_start_registration_guide.txt", "w", encoding="utf-8") as f:
        f.write(quick_start)
    
    # Save critical tracks list
    critical_tracks = [a for a in ACTIONS if a["priority"] == "CRITICAL"]
    with open("docs/critical_priority_tracks.txt", "w", encoding="utf-8") as f:
        f.write(f"BLOODY JAY - CRITICAL PRIORITY TRACKS ({len(critical_tracks)} total)\n")
        f.write("=" * 80 + "\n\n")
        for i, track in enumerate(critical_tracks, 1):
            f.write(f"{i}. {track['track_title']}\n")
            f.write(f"   Project: {track['project']}\n")
            f.write(f"   Year: {track['year']}\n")
            f.write(f"   Label: {track['label']}\n")
            f.write(f"   Revenue Impact: {track['estimated_revenue_impact']}\n\n")
    
    return len(critical_tracks)

if __name__ == "__main__":
    print("Generating registration templates for Bloody Jay...")
    print(f"Total tracks: {len(ACTIONS)}")
    
    critical_count = save_templates()
    
    print(f"\nTemplates generated:")
    print(f"  - docs/registration_templates_consolidated.txt")
    print(f"  - docs/quick_start_registration_guide.txt")
    print(f"  - docs/critical_priority_tracks.txt")
    print(f"\nCritical priority tracks: {critical_count}")