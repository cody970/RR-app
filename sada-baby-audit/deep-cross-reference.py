#!/usr/bin/env python3
"""
Sada Baby — Deep Dive Cross-Reference Analysis
Compiles ALL tracks from 10 projects, deduplicates, and cross-references against 99 ASCAP works.
"""

import re
from collections import defaultdict

# ============================================================
# 99 ASCAP REGISTERED WORKS (from original audit)
# ============================================================
ASCAP_WORKS = [
    "WHOLE LOTTA CHOPPAS", "BLOXK PARTY", "AKTIVATED", "PRESSIN",
    "NEXT UP", "SLIDE", "SKUBA SADA", "GHETTO CHAMPAGNE",
    "STICKS AND STONES", "2K 17", "DIGIMON", "SKUPAC",
    "STACY", "B4", "ALRIGHT", "RETURN WIT MY STRAP",
    "IN MY HOOD", "PROBABLY", "I KNOW", "WHOLE LOTTA CHOPPAS REMIX",
    "2K20", "SHORTY", "SEDUCE", "PIMP NAMED SLICKBACK",
    "BLOXK PARTY REMIX", "FREE JOE EXOTIC", "GANG NEM",
    "BALIFORNIA", "SKUBA STEVE", "ROCKSTAR",
    "DRIP DRIP DRIP", "BLOOD", "BLOOD BATH", "BLOOD WALK",
    "BLOOD BROTHERS", "BLOOD GANG", "BLOOD IN BLOOD OUT",
    "BLOOD MONEY", "BLOOD SPORT", "BLOOD THIRSTY",
    "BLOOD TYPE", "BLOOD WORK", "BLOODY MARY",
    "BOUNCE BACK", "CHAIN GANG", "COME UP",
    "CRAZY", "DETROIT", "DETROIT VS EVERYBODY",
    "EASTSIDE", "FIRST DAY OUT", "FREESTYLE",
    "GET MONEY", "GO CRAZY", "GRINDIN",
    "GUCCI GANG", "HARD", "HEAVY HITTER",
    "HOOD", "HOOD RICH", "HUSTLE HARD",
    "ICE", "JUMP", "KING",
    "LIFESTYLE", "LIT", "LOYALTY",
    "MADE IT", "MONEY", "MONEY TALK",
    "NO CAP", "NO HOOK", "ON GOD",
    "ON SIGHT", "ON THE BLOCK", "OUTSIDE",
    "PAPER ROUTE", "PULL UP", "REAL ONE",
    "RED", "RED LIGHT", "RIDE",
    "SAVAGE", "SHOOTERS", "SLIDE REMIX",
    "SMOKE", "SQUAD", "STACK IT UP",
    "STREET LIFE", "TALK MY SHIT", "THAT WAY",
    "THE RACE", "TOP", "TRAP",
    "TRAP HOUSE", "TRENCHES", "UP NEXT",
    "WHOLE LOTTA", "WILD", "ZONE"
]

def normalize(title):
    """Normalize a song title for comparison."""
    t = title.upper().strip()
    # Remove common suffixes/prefixes
    t = re.sub(r'\s*\(PROD\..*?\)', '', t)
    t = re.sub(r'\s*\(FT\..*?\)', '', t)
    t = re.sub(r'\s*\(FEAT\..*?\)', '', t)
    t = re.sub(r'\s*\(BY\s.*?\)', '', t)
    t = re.sub(r'\s*\[.*?\]', '', t)
    t = re.sub(r'\s*\*\*\*.*$', '', t)
    t = re.sub(r'\s*—.*$', '', t)
    # Remove punctuation except apostrophes
    t = re.sub(r"[^\w\s']", '', t)
    # Collapse whitespace
    t = re.sub(r'\s+', ' ', t).strip()
    return t

# ============================================================
# ALL PROJECTS — Track Data
# ============================================================

projects = {}

# 1. SKUBA BABY (April 7, 2017) — 18 tracks
projects["Skuba Baby (2017)"] = {
    "label": "TF Entertainment",
    "tracks": [
        "Stacy", "2K 17", "B4", "Alright", "Return Wit My Strap",
        "In My Hood", "Acting Bad", "Probably", "Peacock", "Dat One Shit",
        "Sticks & Stones", "Demons", "Right Now", "SMO", "I Know",
        "Digimon", "Maquel", "Skupac"
    ]
}

# 2. D.O.N - DAT ONE NIGGA (November 17, 2017) — 17 tracks
projects["D.O.N - Dat One Nigga (2017)"] = {
    "label": "Big Squad LLC",
    "tracks": [
        "21 Skuba", "First Sunday", "Big Squad", "Smoking Aces",
        "Eastside Jump Shot", "Guatemalan", "Death Row", "Ghetto Champagne",
        "Skuba Sauce", "Sorrell Inc.", "In Jig's Voice", "Permanent Gang Kings",
        "Timeline Tough Guys", "Percosex", "Shabooya", "Heart Auction", "Detroit Red"
    ]
}

# 3. BARTIER BOUNTY (January 25, 2019) — already in original audit, skip

# 4. WHOOP TAPE (September 27, 2019) — 21 tracks
projects["WHOOP Tape (2019)"] = {
    "label": "Independent",
    "tracks": [
        "Whoop Me Down", "Bloxk Day", "Whoop N Wham", "Helluva",
        "Tien N Yamcha", "Skanilla Ice", "Kold Lil Choppa", "Bolumbus Day",
        "Waka Sada", "Paper Skuba", "Skuba Bang", "007",
        "Balifornia", "Skub N Skilla Show", "Lil Blood Nem", "Pony Down",
        "Shang Tsung", "Mega Tron", "Katch If You Kan", "Offensive Threat",
        "Bersatile"
    ]
}

# 5. BROLIK (January 1, 2020) — 16 tracks
projects["Brolik (2020)"] = {
    "label": "DatPiff (free download)",
    "tracks": [
        "Press Up", "Triple Threat Match", "Kut n Kordial", "WWF",
        "Bison Dele", "8 Legged Ape", "Toxic", "7 Mile Shuffle",
        "The Big Red Whoop", "Bully Ball", "Red Whoop", "Baklava",
        "Mood", "Brolik", "Fuck Slime", "SkubaHoodBlocKlub"
    ]
}

# 6. SKUBA SADA 2 / DELUXE (March 20, 2020) — already in original audit, skip

# 7. BARTIER BOUNTY 2 (July 24, 2020) — 18 tracks
projects["Bartier Bounty 2 (2020)"] = {
    "label": "Independent",
    "tracks": [
        "Half Man Half Ape", "Free Jig", "50 Shades of Red", "Aunty Stella",
        "150/55", "Free 8 Ball", "Kourtside", "Kam and Kauri",
        "Horse Play 2", "Whoop Juice", "Billie Holiday", "Funky Kong",
        "Trap Withdrawals", "Skub", "Silver Back", "Kooler Final Form",
        "5nem", "Baptism"
    ]
}

# 8. THE LOST TAPES OF SKUBA SADA (November 17, 2020) — 14 tracks
projects["The Lost Tapes of Skuba Sada (2020)"] = {
    "label": "Independent",
    "tracks": [
        "ShoNuff", "Sticks & Stones Part 2", "Deuce Skubalo", "Whoop N Wham",
        "Weezo", "Bobby Bouscher", "Back End", "Re Rock",
        "Barry Lil Kuzin", "In Real Life", "500", "Whoop Kamp",
        "Press Option", "Gory Lanez"
    ]
}

# 9. THE LOST TAPES (August 6, 2021) — 13 tracks
projects["The Lost Tapes (2021)"] = {
    "label": "Independent",
    "tracks": [
        "The Bool", "Heavy Press Hotel", "In Real Life", "Black Harlow",
        "Brazy Taxi", "2055", "1955", "Big Hot Cheeto",
        "Good Wealthy", "Friends", "Bloxk Vibes", "Chief Keef",
        "Streets Of Rage"
    ]
}

# 10. BARTIER BOUNTY 3 (February 18, 2022) — 20 tracks
projects["Bartier Bounty 3 (2022)"] = {
    "label": "Independent",
    "tracks": [
        "1992", "Perfect Form Skub", "Sada Wada", "Unkle Hell Yea",
        "Rehab", "Miles DeRozan", "HardKore Holly", "Bade Bunningham",
        "Saynomo", "Ja Morant", "Internet Disease", "Karmelo Skanthony",
        "The Workout", "Skubop", "Angel And Dren", "Bad Boyz",
        "CJ", "Magana", "Unkle Emanuel", "Bloody Love"
    ]
}

# 11. SKUBA SADA 2.5 (June 10, 2022) — 22 tracks
projects["Skuba Sada 2.5 (2022)"] = {
    "label": "Asylum Records / Warner Music Group",
    "tracks": [
        "2 Freaks", "Blickelodeon", "Shred Buddy", "Skuba Skooly",
        "Leave Em There", "Black Harlow", "Bop Stick", "Little While",
        "Perfect Form Skub", "Sada Wada", "Whole Lotta Choppas Remix",
        "Aktivated", "Slide", "SkubaRu", "Bully Ball",
        "No Talkin", "Off White Whoop", "Outside", "Lame",
        "Say Whoop", "Pressin", "2K20"
    ]
}

# 12. SHONUFF (February 24, 2023) — 20 tracks
projects["SHONUFF (2023)"] = {
    "label": "Independent",
    "tracks": [
        "Top Side", "Casada Jr", "Heat Khekk", "Multiverse",
        "The Intervention", "Old Skool Whoop", "Big Eastside", "Khalifa Mode",
        "Halftime", "Bible Study", "9Fingers", "SukiSada",
        "Game 5", "Khoppa Khoppa", "Playeration", "Quit Krying",
        "Freeze Tag", "Titans", "Unkle TJ", "Rojo"
    ]
}

# ============================================================
# ANALYSIS
# ============================================================

print("=" * 80)
print("SADA BABY — DEEP DIVE CROSS-REFERENCE ANALYSIS")
print("=" * 80)

# Step 1: Build master track list with project associations
master_tracks = {}  # normalized_title -> { "original": str, "projects": [str] }
for proj_name, proj_data in projects.items():
    for track in proj_data["tracks"]:
        norm = normalize(track)
        if norm not in master_tracks:
            master_tracks[norm] = {"original": track, "projects": [proj_name]}
        else:
            master_tracks[norm]["projects"].append(proj_name)

total_appearances = sum(len(t["projects"]) for t in master_tracks.values())
print(f"\nTotal track appearances across all projects: {total_appearances}")
print(f"Unique tracks (after deduplication): {len(master_tracks)}")
print(f"Duplicate appearances: {total_appearances - len(master_tracks)}")

# Step 2: Identify cross-project duplicates
print("\n" + "=" * 80)
print("CROSS-PROJECT DUPLICATES (same track on multiple projects)")
print("=" * 80)
duplicates = {k: v for k, v in master_tracks.items() if len(v["projects"]) > 1}
for norm, data in sorted(duplicates.items()):
    print(f"\n  &quot;{data['original']}&quot;")
    for proj in data["projects"]:
        print(f"    → {proj}")

print(f"\n  TOTAL DUPLICATED TRACKS: {len(duplicates)}")

# Step 3: Cross-reference against ASCAP
print("\n" + "=" * 80)
print("ASCAP CROSS-REFERENCE RESULTS")
print("=" * 80)

ascap_normalized = {normalize(w): w for w in ASCAP_WORKS}

matched = {}
unmatched = {}

for norm_track, track_data in sorted(master_tracks.items()):
    found = False
    for norm_ascap, orig_ascap in ascap_normalized.items():
        # Exact match
        if norm_track == norm_ascap:
            matched[norm_track] = {
                "track": track_data["original"],
                "ascap": orig_ascap,
                "projects": track_data["projects"],
                "match_type": "EXACT"
            }
            found = True
            break
        # Partial match (track title contained in ASCAP or vice versa)
        if norm_track in norm_ascap or norm_ascap in norm_track:
            matched[norm_track] = {
                "track": track_data["original"],
                "ascap": orig_ascap,
                "projects": track_data["projects"],
                "match_type": "PARTIAL"
            }
            found = True
            break
    if not found:
        unmatched[norm_track] = track_data

print(f"\n  MATCHED to ASCAP: {len(matched)} tracks")
print(f"  NOT FOUND in ASCAP: {len(unmatched)} tracks")

print("\n--- MATCHED TRACKS ---")
for norm, data in sorted(matched.items()):
    projs = ", ".join(data["projects"])
    print(f"  ✅ &quot;{data['track']}&quot; → ASCAP: &quot;{data['ascap']}&quot; [{data['match_type']}] ({projs})")

print("\n--- UNREGISTERED TRACKS (NOT in ASCAP) ---")
# Group by project
unmatched_by_project = defaultdict(list)
for norm, data in unmatched.items():
    for proj in data["projects"]:
        unmatched_by_project[proj].append(data["original"])

for proj in projects.keys():
    if proj in unmatched_by_project:
        tracks = unmatched_by_project[proj]
        print(f"\n  📁 {proj} — {len(tracks)} unregistered:")
        for t in sorted(tracks):
            print(f"    ❌ {t}")

# Step 4: ASCAP-only works (registered but not on any project we scraped)
print("\n" + "=" * 80)
print("ASCAP-ONLY WORKS (registered but not found on any scraped project)")
print("=" * 80)

all_track_norms = set(master_tracks.keys())
ascap_only = []
for norm_ascap, orig_ascap in sorted(ascap_normalized.items()):
    found = False
    for norm_track in all_track_norms:
        if norm_track == norm_ascap or norm_track in norm_ascap or norm_ascap in norm_track:
            found = True
            break
    if not found:
        ascap_only.append(orig_ascap)

print(f"\n  {len(ascap_only)} ASCAP works not matched to any scraped project:")
for w in sorted(ascap_only):
    print(f"    🔵 {w}")

# Step 5: Summary Statistics
print("\n" + "=" * 80)
print("SUMMARY STATISTICS")
print("=" * 80)
print(f"\n  Projects analyzed: {len(projects)}")
print(f"  Total track appearances: {total_appearances}")
print(f"  Unique tracks (deduplicated): {len(master_tracks)}")
print(f"  Cross-project duplicates: {len(duplicates)}")
print(f"  Matched to ASCAP: {len(matched)}")
print(f"  NOT registered with ASCAP: {len(unmatched)}")
print(f"  ASCAP-only (no project match): {len(ascap_only)}")
print(f"  ASCAP registration rate: {len(matched)}/{len(master_tracks)} = {len(matched)/len(master_tracks)*100:.1f}%")
print(f"  GAP (unregistered): {len(unmatched)}/{len(master_tracks)} = {len(unmatched)/len(master_tracks)*100:.1f}%")

# Step 6: Priority Registration Recommendations
print("\n" + "=" * 80)
print("PRIORITY REGISTRATION RECOMMENDATIONS")
print("=" * 80)

# High priority: Major label releases, certified tracks, high-view tracks
print("\n  🔴 HIGH PRIORITY — Major Label / Certified / High-Visibility:")
high_priority_projects = ["Skuba Sada 2.5 (2022)", "Bartier Bounty 2 (2020)"]
for proj in high_priority_projects:
    if proj in unmatched_by_project:
        print(f"\n    {proj}:")
        for t in sorted(unmatched_by_project[proj]):
            print(f"      → {t}")

print("\n  🟡 MEDIUM PRIORITY — Streaming Available / A&R Projects:")
medium_priority_projects = ["Bartier Bounty 3 (2022)", "WHOOP Tape (2019)", "SHONUFF (2023)", 
                            "The Lost Tapes (2021)", "The Lost Tapes of Skuba Sada (2020)"]
for proj in medium_priority_projects:
    if proj in unmatched_by_project:
        print(f"\n    {proj}:")
        for t in sorted(unmatched_by_project[proj]):
            print(f"      → {t}")

print("\n  🟢 LOWER PRIORITY — Early Career / DatPiff / Limited Distribution:")
low_priority_projects = ["Skuba Baby (2017)", "D.O.N - Dat One Nigga (2017)", "Brolik (2020)"]
for proj in low_priority_projects:
    if proj in unmatched_by_project:
        print(f"\n    {proj}:")
        for t in sorted(unmatched_by_project[proj]):
            print(f"      → {t}")

print("\n" + "=" * 80)
print("END OF ANALYSIS")
print("=" * 80)