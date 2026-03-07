#!/usr/bin/env python3
"""
Bloody Jay Discography Builder
Creates comprehensive track listing from multiple sources
"""

import json
from datetime import datetime

# Artist Information
ARTIST_INFO = {
    "stage_name": "Bloody Jay",
    "real_name": "Justin Ushery",
    "hometown": "Atlanta, GA",
    "label_history": ["A1 Records (Rocko)", "ABG Ent.", "Good Life Music Group"],
    "spotify_id": "398uOjIcboA7cfnsTjn2yw",
    "apple_music_id": "586018658",
    "notable_collaborations": ["Young Thug", "YFN Lucci", "Boosie Badazz", "Trouble", "Lil Baby"]
}

# Discography from Discogs + Apple Music
DISCOGRAPHY = {
    "albums": [
        {
            "title": "Blatlanta (Bigger Than Rap)",
            "year": 2012,
            "label": "A1 Recordings / ABG Ent.",
            "type": "Mixtape",
            "tracks": 16,
            "source": "Discogs"
        },
        {
            "title": "Blatlanta II: Brazy",
            "year": 2013,
            "label": "ABG Ent.",
            "type": "Mixtape",
            "tracks": 16,
            "source": "Discogs"
        },
        {
            "title": "Get It In Blood",
            "year": 2013,
            "label": "A1 Recordings",
            "type": "Mixtape",
            "tracks": 14,
            "source": "Discogs"
        },
        {
            "title": "#NAWFR",
            "year": 2014,
            "label": "Independent",
            "type": "Mixtape",
            "tracks": 13,
            "source": "Discogs"
        },
        {
            "title": "Blatlanta 3: Respect",
            "year": 2015,
            "label": "Independent",
            "type": "Mixtape",
            "tracks": 18,
            "source": "Discogs"
        },
        {
            "title": "The Dark Night",
            "year": 2015,
            "label": "Trap-A-Holics",
            "type": "Mixtape",
            "tracks": 10,
            "source": "Discogs"
        },
        {
            "title": "Real Forever",
            "year": 2019,
            "label": "Good Life Music Group",
            "type": "Album",
            "tracks": 12,
            "source": "Discogs/Apple Music"
        },
        {
            "title": "Iykyk",
            "year": 2020,
            "label": "Independent",
            "type": "Album",
            "tracks": None,
            "source": "Apple Music"
        },
        {
            "title": "King Bloody",
            "year": 2022,
            "label": "Independent",
            "type": "Album",
            "tracks": None,
            "source": "Apple Music"
        },
        {
            "title": "Minor Setback",
            "year": 2024,
            "label": "Independent",
            "type": "Album",
            "tracks": None,
            "source": "Apple Music"
        },
        {
            "title": "Letter 2 My Fans",
            "year": 2024,
            "label": "Independent",
            "type": "Album",
            "tracks": None,
            "source": "Apple Music"
        },
        {
            "title": "Escape Route",
            "year": 2024,
            "label": "Independent",
            "type": "Album",
            "tracks": None,
            "source": "Apple Music"
        },
        {
            "title": "ART (A Real Testimony)",
            "year": 2025,
            "label": "Independent",
            "type": "Album",
            "tracks": None,
            "source": "Apple Music"
        }
    ],
    "collaborations": [
        {
            "title": "Black Portland",
            "year": 2014,
            "label": "Propane Media",
            "type": "Collaboration Mixtape",
            "tracks": 11,
            "artist": "Young Thug & Bloody Jay",
            "source": "Discogs"
        },
        {
            "title": "Real Niggas Losing",
            "year": 2017,
            "label": "ABG Ent.",
            "type": "Mixtape",
            "tracks": 7,
            "artist": "Trap-A-Holics & Bloody Jay",
            "source": "Discogs"
        }
    ],
    "singles_eps": [
        {"title": "Since They Pushed My Shit Back", "year": 2019, "type": "EP", "tracks": 4},
        {"title": "Streets R Us", "year": 2026, "type": "EP", "tracks": 5},
        {"title": "Old School Mac", "year": 2025, "type": "Single"},
        {"title": "M.O.N.E.Y.", "year": 2025, "type": "Single"},
        {"title": "No Sympathy", "year": 2025, "type": "Single"},
        {"title": "Long Live Ruck", "year": 2025, "type": "Single"},
        {"title": "Blood Home", "year": 2025, "type": "Single"},
        {"title": "Freak Mode (feat. Ola Wu & Newway)", "year": 2020, "type": "Single"}
    ],
    "known_tracks": [
        # From XXL interview - standout records
        {"title": "Get It In Blood", "notable": True},
        {"title": "Florida Water", "notable": True},
        {"title": "Blood In My Eyes", "notable": True},
        {"title": "Strange World", "notable": True},
        {"title": "Warning", "notable": False},
        {"title": "Don't Know", "notable": False},
        # From Apple Music Top Songs
        {"title": "I Know (feat. Trae Pound & Bloody Jay)", "notable": True},
        {"title": "Wish Me Well", "notable": False},
        {"title": "All Type of Drugs (feat. Bloody Jay, Ola Playa & Thug)", "notable": True},
        {"title": "Pull Up With a 100 (feat. Bloody Jay)", "notable": False},
        {"title": "Keep Going (feat. YFN Lucci & Boosie Badazz)", "notable": True},
        {"title": "We Bros (Remix) [feat. Bloody Jay & Bird Gang Greedy]", "notable": False},
        {"title": "Grind On", "notable": False},
        {"title": "Stay the Same (feat. Derez De'Shon & Trouble)", "notable": False},
        {"title": "Dirty Game (feat. Alley Boy)", "notable": False},
        {"title": "Lil Homie Died (feat. Bloody Jay)", "notable": False}
    ]
}

def calculate_total_tracks():
    """Calculate estimated total tracks in catalog"""
    total = 0
    for album in DISCOGRAPHY["albums"]:
        if album["tracks"]:
            total += album["tracks"]
    for collab in DISCOGRAPHY["collaborations"]:
        if collab["tracks"]:
            total += collab["tracks"]
    for single in DISCOGRAPHY["singles_eps"]:
        if single.get("tracks"):
            total += single["tracks"]
    return total

def generate_summary():
    """Generate summary report"""
    total_tracks = calculate_total_tracks()
    
    summary = f"""
================================================================================
BLOODY JAY DISCOGRAPHY SUMMARY
================================================================================

ARTIST INFORMATION:
  Stage Name: {ARTIST_INFO['stage_name']}
  Real Name: {ARTIST_INFO['real_name']}
  Hometown: {ARTIST_INFO['hometown']}
  Labels: {', '.join(ARTIST_INFO['label_history'])}
  Spotify ID: {ARTIST_INFO['spotify_id']}
  Apple Music ID: {ARTIST_INFO['apple_music_id']}

CATALOG OVERVIEW:
  Albums/Mixtapes: {len(DISCOGRAPHY['albums'])}
  Collaborations: {len(DISCOGRAPHY['collaborations'])}
  Singles/EPs: {len(DISCOGRAPHY['singles_eps'])}
  Estimated Total Tracks: {total_tracks}

PROJECT TIMELINE:
"""
    
    # Add timeline
    all_projects = []
    for album in DISCOGRAPHY["albums"]:
        all_projects.append((album["year"], album["title"], album["type"], album["label"]))
    for collab in DISCOGRAPHY["collaborations"]:
        all_projects.append((collab["year"], f"{collab['title']} (with {collab['artist']})", collab["type"], collab["label"]))
    
    all_projects.sort(key=lambda x: x[0])
    
    for year, title, ptype, label in all_projects:
        summary += f"  {year}: {title} ({ptype}) - {label}\n"
    
    summary += f"""
NOTABLE COLLABORATIONS:
  {', '.join(ARTIST_INFO['notable_collaborations'])}

KNOWN STANDOUT TRACKS:
"""
    for track in DISCOGRAPHY["known_tracks"]:
        if track["notable"]:
            summary += f"  * {track['title']}\n"
    
    return summary

def save_discography_json():
    """Save discography as JSON for further processing"""
    data = {
        "artist": ARTIST_INFO,
        "discography": DISCOGRAPHY,
        "metadata": {
            "generated": datetime.now().isoformat(),
            "source": "Discogs + Apple Music + XXL Mag"
        }
    }
    
    with open("data/discography.json", "w") as f:
        json.dump(data, f, indent=2)
    
    return data

if __name__ == "__main__":
    print(generate_summary())
    data = save_discography_json()
    print("\nDiscography saved to data/discography.json")
    print(f"Total projects: {len(DISCOGRAPHY['albums']) + len(DISCOGRAPHY['collaborations'])}")