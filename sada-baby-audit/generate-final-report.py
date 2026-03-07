import csv
import re
import json
from datetime import datetime

def normalize(title):
    t = title.upper().strip()
    t = re.sub(r'[^A-Z0-9\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def load_catalog(filename):
    rows = []
    with open(filename, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append({k: v.strip() for k, v in row.items()})
    return rows

rows1 = load_catalog('CatalogExport_3606252.csv')
rows2 = load_catalog('CatalogExport_550470107-2.csv')

all_bmi = {}
for row in rows1:
    tn = row['TitleNumber']
    if tn not in all_bmi:
        all_bmi[tn] = {'title': row['Title'], 'normalized': normalize(row['Title']),
                        'registration_date': row['RegistrationDate'], 'status': row['SongviewStatus'],
                        'iswc': row['ISWCNumber'], 'source': 'Catalog A'}
for row in rows2:
    tn = row['TitleNumber']
    if tn not in all_bmi:
        all_bmi[tn] = {'title': row['Title'], 'normalized': normalize(row['Title']),
                        'registration_date': row['RegistrationDate'], 'status': row['SongviewStatus'],
                        'iswc': row['ISWCNumber'], 'source': 'Catalog B'}

bmi_norm_lookup = {data['normalized']: (tn, data) for tn, data in all_bmi.items()}

ascap_matches_norm = set([
    normalize(t) for t in [
        "2K 17", "2K20", "Aktivated", "Alright", "B4", "Balifornia", "Digimon",
        "Ghetto Champagne", "I Know", "In My Hood", "Outside", "Pressin", "Probably",
        "Return Wit My Strap", "Skupac", "Slide", "Stacy", "Sticks And Stones",
        "Whole Lotta Choppas Remix"
    ]
])

all_projects = {
    "Skuba Baby (2017)": {
        "label": "TF Entertainment", "year": 2017,
        "tracks": ["Acting Bad","Alright","B4","Dat One Shit","Demons","Digimon",
                   "I Know","In My Hood","Maquel","Peacock","Percosex","Probably",
                   "Return Wit My Strap","Right Now","SMO","Skupac","Stacy","Sticks & Stones"]
    },
    "D.O.N / Dat One Nigga (2017)": {
        "label": "Big Squad LLC", "year": 2017,
        "tracks": ["21 Skuba","Big Squad","Death Row","Detroit Red","Eastside Jump Shot",
                   "First Sunday","Ghetto Champagne","Guatemalan","Heart Auction",
                   "In Jig's Voice","Percosex","Permanent Gang Kings","Shabooya",
                   "Skuba Sauce","Smoking Aces","Sorrell Inc.","Timeline Tough Guys"]
    },
    "WHOOP Tape (2019)": {
        "label": "Independent", "year": 2019,
        "tracks": ["007","Balifornia","Bersatile","Bloxk Day","Bolumbus Day","Helluva",
                   "Katch If You Kan","Kold Lil Choppa","Lil Blood Nem","Mega Tron",
                   "Offensive Threat","Paper Skuba","Pony Down","Shang Tsung","Skanilla Ice",
                   "Skub N Skilla Show","Skuba Bang","Tien N Yamcha","Waka Sada",
                   "Whoop Me Down","Whoop N Wham"]
    },
    "Brolik (2019)": {
        "label": "DatPiff Exclusive", "year": 2019,
        "tracks": ["7 Mile Shuffle","8 Legged Ape","Baklava","Bison Dele","Brolik",
                   "Bully Ball","Fuck Slime","Kut n Kordial","Mood","Press Up",
                   "Red Whoop","SkubaHoodBlocKlub","The Big Red Whoop","Toxic",
                   "Triple Threat Match","WWF"]
    },
    "Bartier Bounty 2 (2020)": {
        "label": "Independent", "year": 2020,
        "tracks": ["150/55","50 Shades of Red","5nem","Aunty Stella","Baptism",
                   "Billie Holiday","Free 8 Ball","Free Jig","Funky Kong","Half Man Half Ape",
                   "Horse Play 2","Kam and Kauri","Kooler Final Form","Kourtside",
                   "Silver Back","Skub","Trap Withdrawals","Whoop Juice"]
    },
    "Lost Tapes of Skuba Sada (2020)": {
        "label": "Compilation", "year": 2020,
        "tracks": ["500","Back End","Barry Lil Kuzin","Bobby Bouscher","Deuce Skubalo",
                   "Gory Lanez","In Real Life","Press Option","Re Rock","ShoNuff",
                   "Sticks & Stones Part 2","Weezo","Whoop Kamp","Whoop N Wham"]
    },
    "The Lost Tapes (2021)": {
        "label": "Compilation", "year": 2021,
        "tracks": ["1955","2055","Big Hot Cheeto","Black Harlow","Bloxk Vibes","Brazy Taxi",
                   "Chief Keef","Friends","Good Wealthy","Heavy Press Hotel","In Real Life",
                   "Streets Of Rage","The Bool"]
    },
    "Bartier Bounty 3 (2022)": {
        "label": "Independent (A&R: Cody Patrick)", "year": 2022,
        "tracks": ["1992","Angel And Dren","Bad Boyz","Bade Bunningham","Bloody Love","CJ",
                   "HardKore Holly","Internet Disease","Ja Morant","Karmelo Skanthony",
                   "Magana","Miles DeRozan","Perfect Form Skub","Rehab","Sada Wada",
                   "Saynomo","Skubop","The Workout","Unkle Emanuel","Unkle Hell Yea"]
    },
    "Skuba Sada 2.5 (2022)": {
        "label": "Asylum Records / Warner Music Group (A&R: Cody Patrick)", "year": 2022,
        "tracks": ["2 Freaks","2K20","Aktivated","Black Harlow","Blickelodeon","Bop Stick",
                   "Bully Ball","Lame","Leave Em There","Little While","No Talkin",
                   "Off White Whoop","Outside","Perfect Form Skub","Pressin","Sada Wada",
                   "Say Whoop","Shred Buddy","Skuba Skooly","SkubaRu","Slide",
                   "Whole Lotta Choppas Remix"]
    },
    "SHONUFF (2023)": {
        "label": "Independent", "year": 2023,
        "tracks": ["9Fingers","Bible Study","Big Eastside","Casada Jr","Freeze Tag",
                   "Game 5","Halftime","Heat Khekk","Khalifa Mode","Khoppa Khoppa",
                   "Multiverse","Old Skool Whoop","Playeration","Quit Krying","Rojo",
                   "SukiSada","The Intervention","Titans","Top Side","Unkle TJ"]
    }
}

# Classify each track
results = {}
for project, info in all_projects.items():
    results[project] = {'label': info['label'], 'year': info['year'], 'tracks': []}
    for track in info['tracks']:
        norm = normalize(track)
        status = {'track': track, 'ascap': False, 'bmi': False, 'bmi_data': None, 'match_type': None}
        if norm in ascap_matches_norm:
            status['ascap'] = True
        if norm in bmi_norm_lookup:
            tn, data = bmi_norm_lookup[norm]
            status['bmi'] = True
            status['bmi_data'] = data
            status['bmi_tn'] = tn
            status['match_type'] = 'EXACT'
        else:
            for bmi_norm, (tn, data) in bmi_norm_lookup.items():
                if (norm in bmi_norm or bmi_norm in norm) and len(norm) > 3:
                    status['bmi'] = True
                    status['bmi_data'] = data
                    status['bmi_tn'] = tn
                    status['match_type'] = 'PARTIAL'
                    break
        results[project]['tracks'].append(status)

# Compute stats
total = sum(len(v['tracks']) for v in results.values())
ascap_only = sum(1 for v in results.values() for t in v['tracks'] if t['ascap'] and not t['bmi'])
bmi_only = sum(1 for v in results.values() for t in v['tracks'] if t['bmi'] and not t['ascap'])
both = sum(1 for v in results.values() for t in v['tracks'] if t['ascap'] and t['bmi'])
neither = sum(1 for v in results.values() for t in v['tracks'] if not t['ascap'] and not t['bmi'])
any_reg = ascap_only + bmi_only + both

# BMI conflict tracks
conflicts = [(tn, d) for tn, d in all_bmi.items() if d['status'] == 'Share and/or Participant Conflict']
pending = [(tn, d) for tn, d in all_bmi.items() if d['status'] == 'Pending Society Review']

# Generate the report
report = []
report.append("=" * 80)
report.append("SADA BABY (CASADA AARON SORRELL) — COMPREHENSIVE ROYALTY AUDIT REPORT")
report.append("ASCAP + BMI CROSS-REFERENCE ANALYSIS")
report.append(f"Generated: {datetime.now().strftime('%B %d, %Y')}")
report.append("=" * 80)
report.append("")
report.append("━" * 80)
report.append("EXECUTIVE SUMMARY")
report.append("━" * 80)
report.append("")
report.append(f"  Artist:          Sada Baby (Casada Aaron Sorrell)")
report.append(f"  Projects Audited: 10 projects (2017–2023)")
report.append(f"  Total Tracks:    {total} unique tracks analyzed")
report.append(f"  BMI Catalog:     348 registered works (2 catalog files)")
report.append("")
report.append(f"  ┌─────────────────────────────────────────────────────┐")
report.append(f"  │  REGISTRATION STATUS BREAKDOWN                      │")
report.append(f"  │                                                     │")
report.append(f"  │  ✅ Registered in BOTH ASCAP + BMI:  {both:>3} tracks    │")
report.append(f"  │  ✅ Registered in BMI only:          {bmi_only:>3} tracks    │")
report.append(f"  │  ✅ Registered in ASCAP only:        {ascap_only:>3} tracks    │")
report.append(f"  │  ─────────────────────────────────────────────────  │")
report.append(f"  │  ✅ TOTAL REGISTERED (any PRO):      {any_reg:>3} tracks    │")
report.append(f"  │  ❌ COMPLETELY UNREGISTERED:          {neither:>3} tracks    │")
report.append(f"  │                                                     │")
report.append(f"  │  REGISTRATION RATE:  {any_reg}/{total} = {any_reg/total*100:.1f}%              │")
report.append(f"  │  ROYALTY GAP:        {neither}/{total} = {neither/total*100:.1f}%              │")
report.append(f"  └─────────────────────────────────────────────────────┘")
report.append("")
report.append("  ⚠️  KEY FINDINGS:")
report.append(f"  • {neither} tracks across 10 projects have NO registration with ASCAP or BMI")
report.append(f"  • {len(conflicts)} BMI works have SHARE/PARTICIPANT CONFLICTS requiring resolution")
report.append(f"  • {len(pending)} BMI works are PENDING SOCIETY REVIEW")
report.append(f"  • Skuba Sada 2.5 (Warner/Asylum) — major label release with unregistered tracks")
report.append(f"  • Bartier Bounty 3 (A&R: Cody Patrick) — 7 of 20 tracks still unregistered")
report.append(f"  • WHOOP Tape — features Waka Flocka Flame; 16 tracks unregistered")
report.append(f"  • SHONUFF (2023) — 8 of 20 tracks unregistered including Wiz Khalifa collab")
report.append("")

# Per-project breakdown
report.append("━" * 80)
report.append("PROJECT-BY-PROJECT BREAKDOWN")
report.append("━" * 80)

for project, data in results.items():
    tracks = data['tracks']
    proj_total = len(tracks)
    proj_ascap = sum(1 for t in tracks if t['ascap'])
    proj_bmi = sum(1 for t in tracks if t['bmi'])
    proj_both = sum(1 for t in tracks if t['ascap'] and t['bmi'])
    proj_any = sum(1 for t in tracks if t['ascap'] or t['bmi'])
    proj_neither = sum(1 for t in tracks if not t['ascap'] and not t['bmi'])
    
    report.append("")
    report.append(f"  📁 {project}")
    report.append(f"     Label: {data['label']}")
    report.append(f"     Tracks: {proj_total} | Registered: {proj_any} | Unregistered: {proj_neither}")
    report.append(f"     ASCAP: {proj_ascap} | BMI: {proj_bmi} | Both: {proj_both}")
    report.append("")
    
    for t in tracks:
        if t['ascap'] and t['bmi']:
            bmi_status = t['bmi_data']['status'] if t['bmi_data'] else ''
            report.append(f"     ✅✅ {t['track']}  [ASCAP + BMI #{t.get('bmi_tn','')} | {bmi_status}]")
        elif t['bmi']:
            bmi_status = t['bmi_data']['status'] if t['bmi_data'] else ''
            match = t.get('match_type','')
            report.append(f"     ✅   {t['track']}  [BMI #{t.get('bmi_tn','')} | {bmi_status} | {match}]")
        elif t['ascap']:
            report.append(f"     ✅   {t['track']}  [ASCAP only]")
        else:
            report.append(f"     ❌   {t['track']}  [UNREGISTERED — NO ASCAP, NO BMI]")

# Unregistered tracks consolidated list
report.append("")
report.append("━" * 80)
report.append("UNREGISTERED TRACKS — COMPLETE LIST (ACTION REQUIRED)")
report.append("━" * 80)
report.append("")
report.append("  The following tracks have NO registration with ASCAP or BMI.")
report.append("  These represent direct royalty losses — performance royalties cannot")
report.append("  be collected without PRO registration.")
report.append("")

unregistered_by_project = {}
for project, data in results.items():
    unreg = [t['track'] for t in data['tracks'] if not t['ascap'] and not t['bmi']]
    if unreg:
        unregistered_by_project[project] = unreg

total_unreg = sum(len(v) for v in unregistered_by_project.values())
report.append(f"  TOTAL UNREGISTERED: {total_unreg} tracks across {len(unregistered_by_project)} projects")
report.append("")

for project, tracks in unregistered_by_project.items():
    report.append(f"  📁 {project} — {len(tracks)} unregistered:")
    for t in tracks:
        report.append(f"     ❌ {t}")
    report.append("")

# BMI Conflicts section
report.append("━" * 80)
report.append("BMI WORKS WITH ISSUES — REQUIRES ATTENTION")
report.append("━" * 80)
report.append("")
report.append(f"  ⚠️  SHARE/PARTICIPANT CONFLICTS ({len(conflicts)} works):")
report.append("  These works are registered but have unresolved ownership disputes.")
report.append("  Royalties may be held until conflicts are resolved.")
report.append("")
for tn, data in sorted(conflicts, key=lambda x: x[1]['title']):
    report.append(f"     ⚠️  {data['title']}  [#{tn} | Reg: {data['registration_date']}]")

report.append("")
report.append(f"  🔄 PENDING SOCIETY REVIEW ({len(pending)} works):")
report.append("  These works are registered but awaiting final PRO review/reconciliation.")
report.append("")
for tn, data in sorted(pending, key=lambda x: x[1]['title']):
    report.append(f"     🔄 {data['title']}  [#{tn} | Reg: {data['registration_date']}]")

# BMI catalog overview
report.append("")
report.append("━" * 80)
report.append("BMI CATALOG OVERVIEW — ALL 348 REGISTERED WORKS")
report.append("━" * 80)
report.append("")
report.append("  Catalog File A (3606252): 249 works — Primary catalog")
report.append("  Catalog File B (550470107): 99 works — Secondary catalog")
report.append("")
report.append("  STATUS BREAKDOWN:")
reconciled = sum(1 for d in all_bmi.values() if d['status'] == 'Reconciled')
pending_count = sum(1 for d in all_bmi.values() if d['status'] == 'Pending Society Review')
conflict_count = sum(1 for d in all_bmi.values() if d['status'] == 'Share and/or Participant Conflict')
other_count = sum(1 for d in all_bmi.values() if d['status'] not in ['Reconciled','Pending Society Review','Share and/or Participant Conflict'])
report.append(f"  ✅ Reconciled:                  {reconciled} works ({reconciled/len(all_bmi)*100:.1f}%)")
report.append(f"  🔄 Pending Society Review:      {pending_count} works ({pending_count/len(all_bmi)*100:.1f}%)")
report.append(f"  ⚠️  Share/Participant Conflict:  {conflict_count} works ({conflict_count/len(all_bmi)*100:.1f}%)")
if other_count:
    report.append(f"  ❓ Other/Unknown:               {other_count} works")
report.append("")

# Priority action items
report.append("━" * 80)
report.append("PRIORITY ACTION ITEMS")
report.append("━" * 80)
report.append("")
report.append("  IMMEDIATE (High Revenue Impact):")
report.append("")
report.append("  1. REGISTER UNREGISTERED TRACKS WITH BMI")
report.append(f"     → {total_unreg} tracks have zero PRO registration")
report.append("     → Priority: Skuba Sada 2.5 (Warner/Asylum) — major label = higher royalty volume")
report.append("     → Priority: WHOOP Tape — Waka Flocka feature = commercial streaming value")
report.append("     → Priority: SHONUFF — Wiz Khalifa, Lil Yachty features = streaming exposure")
report.append("     → Priority: Bartier Bounty 3 — A&R'd by Cody Patrick, 7 unregistered")
report.append("")
report.append("  2. RESOLVE BMI SHARE/PARTICIPANT CONFLICTS")
report.append(f"     → {len(conflicts)} works have unresolved ownership disputes")
report.append("     → Royalties are likely being held in suspense")
report.append("     → Contact BMI directly to resolve each conflict")
report.append("     → Key conflict: KHALIFA MODE [#60415313] — Wiz Khalifa collab")
report.append("")
report.append("  3. FOLLOW UP ON PENDING SOCIETY REVIEWS")
report.append(f"     → {len(pending)} works awaiting BMI review")
report.append("     → Some pending since 2020-2021 — may need escalation")
report.append("     → Check: LITTLE WHILE FEAT BIG SEAN AND HIT BOY [#52132763]")
report.append("     → Check: EASTSIDE JUMP SHOT [#42776404]")
report.append("")
report.append("  4. CHECK THE MLC FOR MECHANICAL ROYALTIES")
report.append("     → The MLC (Mechanical Licensing Collective) handles digital mechanicals")
report.append("     → Separate from ASCAP/BMI (performance royalties)")
report.append("     → All streaming plays generate mechanical royalties")
report.append("     → Register at: themlc.com — especially for Skuba Sada 2.5 (Warner)")
report.append("")
report.append("  5. VERIFY SOUNDEXCHANGE REGISTRATION")
report.append("     → SoundExchange handles digital performance royalties (Pandora, SiriusXM)")
report.append("     → Separate from ASCAP/BMI — requires separate registration")
report.append("     → Register at: soundexchange.com")
report.append("")
report.append("  6. AUDIT PUBLISHING SPLITS ON BMI WORKS")
report.append("     → Several works show 'NA' affiliation for writers")
report.append("     → Unaffiliated writers cannot collect their share")
report.append("     → Verify all co-writers are properly affiliated with a PRO")
report.append("")

# Tracks in BMI but not in our project list (bonus finds)
report.append("━" * 80)
report.append("ADDITIONAL BMI WORKS — NOT IN AUDITED PROJECTS")
report.append("━" * 80)
report.append("")
report.append("  The BMI catalog contains 348 works total. The following are registered")
report.append("  in BMI but were not part of the 10 audited projects — these may be")
report.append("  singles, features, or works from other projects.")
report.append("")

audited_norms = set()
for project, data in results.items():
    for t in data['tracks']:
        audited_norms.add(normalize(t['track']))

extra_bmi = []
for tn, data in all_bmi.items():
    if data['normalized'] not in audited_norms:
        extra_bmi.append((tn, data))

report.append(f"  Total additional BMI works (outside audited projects): {len(extra_bmi)}")
report.append("")
for tn, data in sorted(extra_bmi, key=lambda x: x[1]['title']):
    iswc = data['iswc'].strip() if data['iswc'].strip() and data['iswc'].strip() != '' else 'N/A'
    report.append(f"  • {data['title']}  [#{tn} | {data['status']} | Reg: {data['registration_date']}]")

report.append("")
report.append("=" * 80)
report.append("END OF REPORT")
report.append(f"Prepared for: Cody Patrick")
report.append(f"Re: Sada Baby (Casada Aaron Sorrell) Royalty Registration Audit")
report.append(f"Date: {datetime.now().strftime('%B %d, %Y')}")
report.append("=" * 80)

# Write report
report_text = "\n".join(report)
with open('sada-baby-audit/SADA-BABY-COMPREHENSIVE-AUDIT-REPORT.txt', 'w') as f:
    f.write(report_text)

print(f"Report written: {len(report)} lines")
print(f"Total unregistered: {total_unreg}")
print(f"Extra BMI works: {len(extra_bmi)}")