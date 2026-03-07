#!/usr/bin/env python3
"""
Cross-reference Sada Baby's full discography against ASCAP/Songview registered works.
"""

# ============================================================
# SECTION 1: ASCAP/Songview Registered Works (99 works found)
# From previous session's ASCAP ACE Repertory search for "SADA BABY"
# ============================================================

ascap_registered = [
    "ACT3",
    "AKTIVATED",
    "B ROLL",
    "BALIFORNIA",
    "BILLY EILISH",
    "BLOXK PARTY",
    "BOOTY TALK FIFTYFIVE",
    "BULLY BALL",
    "CAPTAIN CRUNCH",
    "CAUGHT IN 4K",
    "CHEAT CODE",
    "DEATH ROW",
    "DREADZ N BREAD REMIX",
    "DRIPLE DOUBLE",
    "DUCK SAUCE",
    "DUMBASS",
    "EDMORE",
    "FREE JOE EXOTIC",
    "FRIDAY NIGHT CYPHER",
    "GHETTO CHAMPAGNE",
    "GOOD MORNING",
    "GRAND THEFT AUTO",
    "GUCCI BAG",
    "HAYSTACK",
    "HOOD RICH SKUBA",
    "HONEST",
    "HORSEPLAY",
    "KING OF THE JUNGLE",
    "LAME",
    "LITTLE WHILE",
    "LLYG MISTA",
    "LUNCH ROOM",
    "MONEY BAG SKUBA",
    "MUTUMBO",
    "NEXT UP",
    "NO TALKIN",
    "NOT REGULAR",
    "OFF WHITE WHOOP",
    "OLADIPO",
    "ON GANG",
    "OUTSIDE",
    "PIMP NAMED DRIP DAT",
    "PRESSIN",
    "ROCKSTAR",
    "SAY WHOOP",
    "SHORTY",
    "SKUBA DOLPH",
    "SKUBA SAYS",
    "SKUBARU",
    "SLIDE",
    "STUNT",
    "UNKLE DREW",
    "WHOLE LOTTA CHOPPAS",
    "WHOLE LOTTA CHOPPAS REMIX",
    "2K20",
    "AUNTY MELODY",
    "BONNIE AND BLYDE",
    "BARTIER BOUNTY",
    "BARTIER BOUNTY 2",
    "BARTIER BOUNTY 3",
    "BIG STEPPA",
    "BROLIK",
    "CARMELO BRYANT",
    "DO MY DANCE",
    "DRIPPLE DRAGONS",
    "FIRE EMOJI",
    "GANG GANG",
    "GHETTO GOSPEL",
    "HAMMER TIME",
    "I KNEW THIS WOULD HAPPEN",
    "JANKY",
    "JOHN MADDEN",
    "KING JAMES",
    "LAST DANCE",
    "LOUIS V UMBRELLA",
    "MOBSTERS",
    "NO SCALE",
    "PIMP SHIT",
    "PLUG LUV",
    "PRESSIN REMIX",
    "ROCK WITH US",
    "SCARY MOVIE",
    "SHONUFF",
    "SKUBA SADA",
    "SLIDE ON EM",
    "SMOKE",
    "TALK MY SHIT",
    "TALK VI",
    "THE FIELD",
    "THE PACK ATTACK",
    "TOUR",
    "TRAP HOUSE",
    "WEIRD",
    "WHOOP TAPE",
    "YESTERDAY",
    "YOU KNOW WHAT IT IS",
    "762S",
    "2 FA 5",
    "3 SPOTS",
]

# ============================================================
# SECTION 2: Full Discography - All known tracks
# Sources: Wikipedia, Genius, Apple Music
# ============================================================

# --- STUDIO ALBUM: Skuba Sada 2 (Deluxe) ---
skuba_sada_2_deluxe = [
    "Aktivated",
    "Slide",
    "SkubaRu",
    "Bully Ball",
    "No Talkin",
    "Off White Whoop",
    "Outside",  # ft. Trap Manny
    "Lame",
    "Say Whoop",
    "Pressin",  # ft. King Von
    "2K20",
]

# --- MIXTAPE: Bartier Bounty ---
bartier_bounty = [
    "Hood Rich Skuba",  # ft. Hoodrich Pablo Juan
    "Bonnie & Blyde",  # ft. Ashley Sorrell
    "Edmore",
    "Horseplay",
    "LLYG Mista",
    "Aunty Melody",
    "Skuba Says",
    "On Gang",
    "Pimp Named Drip Dat",
    "Mutumbo",
    "Dumbass",
    "Honest",
    "Lunch Room",
    "Skuba Dolph",
    "Driple Double",
    "Oladipo",
    "Unkle Drew",
    "Money Bag Skuba",
    "Bloxk Party",  # ft. Drego
    "Cheat Code",
]

# --- MIXTAPE: Skuba Sada (2017) ---
skuba_sada_1 = [
    "Skuba Sada",  # title track / project
    # Individual tracks not fully documented on Wikipedia/Genius
]

# --- MIXTAPE: D.O.N - Dat One Nigga (2017) ---
don_mixtape = [
    # Individual tracks not fully documented
]

# --- MIXTAPE: Whoop Tape (2019) ---
whoop_tape = [
    "Whoop Tape",  # project title
    # SoundCloud/DatPiff exclusive - individual tracks not fully cataloged
]

# --- MIXTAPE: Brolik (2020) ---
brolik = [
    "Brolik",  # project title
    # DatPiff exclusive - individual tracks not fully cataloged
]

# --- MIXTAPE: Bartier Bounty 2 (2020) ---
bartier_bounty_2 = [
    "Bartier Bounty 2",  # project title
    # Tracks from this project
]

# --- MIXTAPE: The Lost Tapes (2021) ---
lost_tapes = [
    # Big Squad LLC release
]

# --- MIXTAPE: Bartier Bounty 3 (2022) ---
bartier_bounty_3 = [
    "Bartier Bounty 3",  # project title
]

# --- MIXTAPE: Skuba Sada 2.5 (2022) ---
skuba_sada_25 = [
    # Asylum release
]

# --- ALBUM: SHONUFF (2023) - from Genius, NOT on Wikipedia ---
shonuff = [
    "SHONUFF",  # project title
]

# --- The Lost Tapes of Skuba Sada (2020) - from Genius, NOT on Wikipedia ---
lost_tapes_skuba = [
    # Additional project
]

# --- SINGLES ---
singles = [
    "Bloxk Party",
    "Aktivated",
    "Pressin",
    "Whole Lotta Choppas",
    "Whole Lotta Choppas Remix",  # ft. Nicki Minaj
    "Next Up",  # ft. Tee Grizzley
    "Free Joe Exotic",  # ft. on BFB Da Packman track
]

# --- GUEST APPEARANCES (Wikipedia) ---
guest_appearances = [
    # 2016
    "Corey Brewer",
    # 2017
    "Bag Flipper",
    "I Really Mean That",
    "You Just Talk Shit",
    "What U Do Today",
    "Jordan Vs Bird",
    "Over Time",
    "You Know What It Is",
    "Spyder",
    "Tripple Over Time",
    "Winning",
    "On Purpose",
    "U.D.W.N",
    "Message",
    "Yesterday",
    "The Field",
    "90's Baby",
    "Leg Work",
    # 2018
    "25 Rounds",
    "Tell Her To",
    "Like This Song",
    "Say It Then",
    "Fidgeting",
    "Still Fuckin Wid It",
    "My Dawg",
    "The Pack Attack",
    "Google My Name",
    "Hot 107.5",
    "New Bmf",
    "Dirty Dancing",
    "Plug Luv",
    "Bag Drop",
    "Big Dawg",
    # 2019
    "How",
    "Weird",
    "Just My Luck",
    "One Me",
    "Big Dawg Status Remix",
    "Print This Money",
    "Pimp Shit",
    "Start This Bitch Over",
    "Left Me in the Mud",
    "3 Spots",
    "Shoot Front the Reverend",
    "Baw Baw",
    "2 Fa 5",
    "762's",
    # 2020
    "No Scale",
    "Louis V Umbrella",
    "Carmelo Bryant",
    "I Knew This Would Happen",
    "Smoke",
    "Talk My Shit",
    "Dripple Dragons",
    "Mobsters",
    "Across the Map",
    "Talk VI",
    "Tour",
    "Not Regular",
    "Friday Night Cypher",
    "Do My Dance",
    "Slide On Em",
    "Big Steppa",
    # 2021
    "Captain Crunch",
    # 2025
    "SPRAY",
    "VOID",
]

# ============================================================
# SECTION 3: Normalize and Cross-Reference
# ============================================================

def normalize(title):
    """Normalize a song title for comparison."""
    t = title.upper().strip()
    # Remove common punctuation
    for ch in ["'", "'", "'", '"', ",", ".", "!", "?", "(", ")", "&", "-", "/"]:
        t = t.replace(ch, "")
    # Normalize spaces
    t = " ".join(t.split())
    return t

# Build master discography list (deduplicated)
all_discography_tracks = set()
for track_list in [skuba_sada_2_deluxe, bartier_bounty, singles, guest_appearances]:
    for track in track_list:
        all_discography_tracks.add(normalize(track))

# Also add project titles as they may be registered
project_titles = [
    "Skuba Sada", "Skuba Sada 2", "Bartier Bounty", "Bartier Bounty 2",
    "Bartier Bounty 3", "Whoop Tape", "Brolik", "The Lost Tapes",
    "Skuba Sada 2.5", "SHONUFF", "D.O.N", "Dat One Nigga"
]
for title in project_titles:
    all_discography_tracks.add(normalize(title))

# Normalize ASCAP registered works
ascap_normalized = {}
for work in ascap_registered:
    ascap_normalized[normalize(work)] = work

# Normalize discography
disco_normalized = {}
for track in all_discography_tracks:
    disco_normalized[track] = track

# ============================================================
# SECTION 4: Find Matches and Gaps
# ============================================================

# Find discography tracks that ARE registered
matched = []
# Find discography tracks that are NOT registered
unregistered = []
# Find ASCAP works not in our discography (may be deep cuts, loosies, etc.)
ascap_only = []

for disco_norm in sorted(disco_normalized.keys()):
    found = False
    for ascap_norm in ascap_normalized.keys():
        # Check exact match or close match
        if disco_norm == ascap_norm:
            found = True
            break
        # Check if one contains the other (for slight variations)
        if disco_norm in ascap_norm or ascap_norm in disco_norm:
            found = True
            break
    if found:
        matched.append(disco_norm)
    else:
        unregistered.append(disco_norm)

for ascap_norm, ascap_orig in sorted(ascap_normalized.items()):
    found = False
    for disco_norm in disco_normalized.keys():
        if ascap_norm == disco_norm:
            found = True
            break
        if disco_norm in ascap_norm or ascap_norm in disco_norm:
            found = True
            break
    if not found:
        ascap_only.append(ascap_orig)

# ============================================================
# SECTION 5: Generate Report
# ============================================================

print("=" * 80)
print("SADA BABY — DISCOGRAPHY vs. ASCAP/SONGVIEW CROSS-REFERENCE REPORT")
print("=" * 80)
print()

print(f"TOTAL DISCOGRAPHY TRACKS ANALYZED: {len(all_discography_tracks)}")
print(f"TOTAL ASCAP/SONGVIEW REGISTERED WORKS: {len(ascap_registered)}")
print()

print("-" * 80)
print(f"✅ MATCHED (In Discography AND Registered): {len(matched)} tracks")
print("-" * 80)
for m in sorted(matched):
    print(f"  ✅ {m}")

print()
print("-" * 80)
print(f"🔴 UNREGISTERED (In Discography but NOT in ASCAP): {len(unregistered)} tracks")
print("-" * 80)
print("  *** THESE REPRESENT POTENTIAL UNCLAIMED ROYALTIES ***")
print()
for u in sorted(unregistered):
    print(f"  🔴 {u}")

print()
print("-" * 80)
print(f"🟡 ASCAP-ONLY (Registered but NOT in Wikipedia discography): {len(ascap_only)} works")
print("-" * 80)
print("  (These may be loosies, deep cuts, or alternate registrations)")
print()
for a in sorted(ascap_only):
    print(f"  🟡 {a}")

print()
print("=" * 80)
print("RISK ANALYSIS & RECOMMENDATIONS")
print("=" * 80)
print()

# Categorize unregistered by type
guest_unregistered = []
own_unregistered = []
for u in unregistered:
    # Check if it's a guest appearance
    is_guest = False
    for ga in guest_appearances:
        if normalize(ga) == u:
            is_guest = True
            break
    if is_guest:
        guest_unregistered.append(u)
    else:
        own_unregistered.append(u)

print(f"UNREGISTERED OWN TRACKS (highest priority): {len(own_unregistered)}")
for t in sorted(own_unregistered):
    print(f"  ⚠️  {t}")

print()
print(f"UNREGISTERED GUEST APPEARANCES: {len(guest_unregistered)}")
for t in sorted(guest_unregistered):
    print(f"  📋 {t}")

print()
print("KEY FINDINGS:")
print("-" * 40)
print(f"1. {len(matched)} of {len(all_discography_tracks)} known tracks are registered ({len(matched)*100//len(all_discography_tracks)}%)")
print(f"2. {len(unregistered)} tracks appear UNREGISTERED — potential unclaimed royalties")
print(f"3. {len(guest_unregistered)} unregistered tracks are guest appearances (may be registered under other artists)")
print(f"4. {len(own_unregistered)} unregistered tracks are his OWN releases — HIGHEST PRIORITY")
print(f"5. {len(ascap_only)} ASCAP works don't match Wikipedia discography (loosies/deep cuts)")
print()
print("CRITICAL GAPS TO INVESTIGATE:")
print("-" * 40)
print("• Skuba Sada (2017) & D.O.N (2017) — early mixtape tracks likely unregistered")
print("• Whoop Tape (2019) — SoundCloud/DatPiff exclusive, individual tracks unknown")
print("• Brolik (2020) — DatPiff exclusive, individual tracks unknown")
print("• Bartier Bounty 2 (2020) — full tracklist needs verification")
print("• The Lost Tapes (2021) — full tracklist needs verification")
print("• Bartier Bounty 3 (2022) — full tracklist needs verification")
print("• Skuba Sada 2.5 (2022) — full tracklist needs verification")
print("• SHONUFF (2023) — full tracklist needs verification")
print("• The Lost Tapes of Skuba Sada (2020) — not even on Wikipedia")
print()
print("NOTE: This analysis covers ASCAP/Songview (performance royalties) only.")
print("Additional databases to check: MLC (mechanicals), SoundExchange (digital),")
print("BMI (if any works registered there), HFA, CMRRA (Canada).")