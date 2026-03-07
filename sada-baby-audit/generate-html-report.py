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

ascap_matches_norm = set([normalize(t) for t in [
    "2K 17","2K20","Aktivated","Alright","B4","Balifornia","Digimon",
    "Ghetto Champagne","I Know","In My Hood","Outside","Pressin","Probably",
    "Return Wit My Strap","Skupac","Slide","Stacy","Sticks And Stones","Whole Lotta Choppas Remix"
]])

all_projects = {
    "Skuba Baby (2017)": {"label":"TF Entertainment","year":2017,"tracks":["Acting Bad","Alright","B4","Dat One Shit","Demons","Digimon","I Know","In My Hood","Maquel","Peacock","Percosex","Probably","Return Wit My Strap","Right Now","SMO","Skupac","Stacy","Sticks & Stones"]},
    "D.O.N / Dat One Nigga (2017)": {"label":"Big Squad LLC","year":2017,"tracks":["21 Skuba","Big Squad","Death Row","Detroit Red","Eastside Jump Shot","First Sunday","Ghetto Champagne","Guatemalan","Heart Auction","In Jig's Voice","Percosex","Permanent Gang Kings","Shabooya","Skuba Sauce","Smoking Aces","Sorrell Inc.","Timeline Tough Guys"]},
    "WHOOP Tape (2019)": {"label":"Independent","year":2019,"tracks":["007","Balifornia","Bersatile","Bloxk Day","Bolumbus Day","Helluva","Katch If You Kan","Kold Lil Choppa","Lil Blood Nem","Mega Tron","Offensive Threat","Paper Skuba","Pony Down","Shang Tsung","Skanilla Ice","Skub N Skilla Show","Skuba Bang","Tien N Yamcha","Waka Sada","Whoop Me Down","Whoop N Wham"]},
    "Brolik (2019)": {"label":"DatPiff Exclusive","year":2019,"tracks":["7 Mile Shuffle","8 Legged Ape","Baklava","Bison Dele","Brolik","Bully Ball","Fuck Slime","Kut n Kordial","Mood","Press Up","Red Whoop","SkubaHoodBlocKlub","The Big Red Whoop","Toxic","Triple Threat Match","WWF"]},
    "Bartier Bounty 2 (2020)": {"label":"Independent","year":2020,"tracks":["150/55","50 Shades of Red","5nem","Aunty Stella","Baptism","Billie Holiday","Free 8 Ball","Free Jig","Funky Kong","Half Man Half Ape","Horse Play 2","Kam and Kauri","Kooler Final Form","Kourtside","Silver Back","Skub","Trap Withdrawals","Whoop Juice"]},
    "Lost Tapes of Skuba Sada (2020)": {"label":"Compilation","year":2020,"tracks":["500","Back End","Barry Lil Kuzin","Bobby Bouscher","Deuce Skubalo","Gory Lanez","In Real Life","Press Option","Re Rock","ShoNuff","Sticks & Stones Part 2","Weezo","Whoop Kamp","Whoop N Wham"]},
    "The Lost Tapes (2021)": {"label":"Compilation","year":2021,"tracks":["1955","2055","Big Hot Cheeto","Black Harlow","Bloxk Vibes","Brazy Taxi","Chief Keef","Friends","Good Wealthy","Heavy Press Hotel","In Real Life","Streets Of Rage","The Bool"]},
    "Bartier Bounty 3 (2022)": {"label":"Independent (A&R: Cody Patrick)","year":2022,"tracks":["1992","Angel And Dren","Bad Boyz","Bade Bunningham","Bloody Love","CJ","HardKore Holly","Internet Disease","Ja Morant","Karmelo Skanthony","Magana","Miles DeRozan","Perfect Form Skub","Rehab","Sada Wada","Saynomo","Skubop","The Workout","Unkle Emanuel","Unkle Hell Yea"]},
    "Skuba Sada 2.5 (2022)": {"label":"Asylum Records / Warner Music Group (A&R: Cody Patrick)","year":2022,"tracks":["2 Freaks","2K20","Aktivated","Black Harlow","Blickelodeon","Bop Stick","Bully Ball","Lame","Leave Em There","Little While","No Talkin","Off White Whoop","Outside","Perfect Form Skub","Pressin","Sada Wada","Say Whoop","Shred Buddy","Skuba Skooly","SkubaRu","Slide","Whole Lotta Choppas Remix"]},
    "SHONUFF (2023)": {"label":"Independent","year":2023,"tracks":["9Fingers","Bible Study","Big Eastside","Casada Jr","Freeze Tag","Game 5","Halftime","Heat Khekk","Khalifa Mode","Khoppa Khoppa","Multiverse","Old Skool Whoop","Playeration","Quit Krying","Rojo","SukiSada","The Intervention","Titans","Top Side","Unkle TJ"]}
}

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
            status['bmi'] = True; status['bmi_data'] = data; status['bmi_tn'] = tn; status['match_type'] = 'EXACT'
        else:
            for bmi_norm, (tn, data) in bmi_norm_lookup.items():
                if (norm in bmi_norm or bmi_norm in norm) and len(norm) > 3:
                    status['bmi'] = True; status['bmi_data'] = data; status['bmi_tn'] = tn; status['match_type'] = 'PARTIAL'
                    break
        results[project]['tracks'].append(status)

total = sum(len(v['tracks']) for v in results.values())
ascap_only = sum(1 for v in results.values() for t in v['tracks'] if t['ascap'] and not t['bmi'])
bmi_only = sum(1 for v in results.values() for t in v['tracks'] if t['bmi'] and not t['ascap'])
both = sum(1 for v in results.values() for t in v['tracks'] if t['ascap'] and t['bmi'])
neither = sum(1 for v in results.values() for t in v['tracks'] if not t['ascap'] and not t['bmi'])
any_reg = ascap_only + bmi_only + both

conflicts = [(tn, d) for tn, d in all_bmi.items() if d['status'] == 'Share and/or Participant Conflict']
pending = [(tn, d) for tn, d in all_bmi.items() if d['status'] == 'Pending Society Review']
reconciled_count = sum(1 for d in all_bmi.values() if d['status'] == 'Reconciled')

audited_norms = set()
for project, data in results.items():
    for t in data['tracks']:
        audited_norms.add(normalize(t['track']))
extra_bmi = [(tn, data) for tn, data in all_bmi.items() if data['normalized'] not in audited_norms]

# Build HTML
html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sada Baby — Comprehensive Royalty Audit Report</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f0f; color: #e0e0e0; line-height: 1.6; }}
  .header {{ background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); padding: 40px; text-align: center; border-bottom: 3px solid #e94560; }}
  .header h1 {{ font-size: 2.2em; color: #fff; letter-spacing: 2px; text-transform: uppercase; }}
  .header h2 {{ font-size: 1.1em; color: #e94560; margin-top: 8px; letter-spacing: 1px; }}
  .header .meta {{ color: #aaa; margin-top: 12px; font-size: 0.9em; }}
  .container {{ max-width: 1200px; margin: 0 auto; padding: 30px 20px; }}
  
  /* Summary Cards */
  .summary-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 30px 0; }}
  .card {{ background: #1a1a2e; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #2a2a4e; }}
  .card.green {{ border-color: #00c853; }}
  .card.red {{ border-color: #e94560; }}
  .card.yellow {{ border-color: #ffd600; }}
  .card.blue {{ border-color: #2979ff; }}
  .card .number {{ font-size: 2.8em; font-weight: bold; }}
  .card.green .number {{ color: #00c853; }}
  .card.red .number {{ color: #e94560; }}
  .card.yellow .number {{ color: #ffd600; }}
  .card.blue .number {{ color: #2979ff; }}
  .card .label {{ font-size: 0.85em; color: #aaa; margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }}
  
  /* Section headers */
  .section-title {{ font-size: 1.3em; font-weight: bold; color: #e94560; text-transform: uppercase; letter-spacing: 2px; border-bottom: 2px solid #e94560; padding-bottom: 8px; margin: 40px 0 20px 0; }}
  
  /* Alert boxes */
  .alert {{ border-radius: 8px; padding: 16px 20px; margin: 16px 0; border-left: 4px solid; }}
  .alert.warning {{ background: #1a1500; border-color: #ffd600; color: #ffd600; }}
  .alert.danger {{ background: #1a0000; border-color: #e94560; color: #ff6b6b; }}
  .alert.info {{ background: #001a2e; border-color: #2979ff; color: #82b1ff; }}
  .alert.success {{ background: #001a00; border-color: #00c853; color: #69f0ae; }}
  
  /* Project cards */
  .project-card {{ background: #1a1a2e; border-radius: 12px; margin: 20px 0; overflow: hidden; border: 1px solid #2a2a4e; }}
  .project-header {{ padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }}
  .project-header:hover {{ background: #1f1f3e; }}
  .project-name {{ font-size: 1.1em; font-weight: bold; color: #fff; }}
  .project-label {{ font-size: 0.8em; color: #aaa; margin-top: 3px; }}
  .project-stats {{ display: flex; gap: 12px; align-items: center; }}
  .stat-badge {{ padding: 4px 10px; border-radius: 20px; font-size: 0.8em; font-weight: bold; }}
  .badge-green {{ background: #00c85322; color: #00c853; border: 1px solid #00c853; }}
  .badge-red {{ background: #e9456022; color: #e94560; border: 1px solid #e94560; }}
  .badge-yellow {{ background: #ffd60022; color: #ffd600; border: 1px solid #ffd600; }}
  .progress-bar {{ height: 6px; background: #2a2a4e; }}
  .progress-fill {{ height: 100%; transition: width 0.3s; }}
  .track-list {{ padding: 0 20px 16px; }}
  .track-row {{ display: flex; align-items: center; padding: 8px 0; border-bottom: 1px solid #1f1f3f; gap: 12px; }}
  .track-row:last-child {{ border-bottom: none; }}
  .track-icon {{ font-size: 1.1em; width: 24px; flex-shrink: 0; }}
  .track-name {{ flex: 1; font-size: 0.95em; }}
  .track-badges {{ display: flex; gap: 6px; flex-wrap: wrap; }}
  .tbadge {{ padding: 2px 8px; border-radius: 4px; font-size: 0.72em; font-weight: bold; }}
  .tbadge-ascap {{ background: #0d47a122; color: #82b1ff; border: 1px solid #2979ff; }}
  .tbadge-bmi {{ background: #1b5e2022; color: #69f0ae; border: 1px solid #00c853; }}
  .tbadge-conflict {{ background: #b71c1c22; color: #ff8a80; border: 1px solid #e94560; }}
  .tbadge-pending {{ background: #f57f1722; color: #ffcc02; border: 1px solid #ffd600; }}
  .tbadge-partial {{ background: #4a148c22; color: #ce93d8; border: 1px solid #9c27b0; }}
  .track-row.unregistered .track-name {{ color: #ff6b6b; }}
  .track-row.registered .track-name {{ color: #e0e0e0; }}
  
  /* Unregistered list */
  .unreg-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin: 20px 0; }}
  .unreg-project {{ background: #1a0a0a; border: 1px solid #e9456044; border-radius: 8px; padding: 16px; }}
  .unreg-project h4 {{ color: #e94560; margin-bottom: 10px; font-size: 0.95em; }}
  .unreg-track {{ padding: 4px 0; font-size: 0.88em; color: #ff8a80; border-bottom: 1px solid #2a1a1a; }}
  .unreg-track:last-child {{ border-bottom: none; }}
  .unreg-track::before {{ content: "❌ "; }}
  
  /* Conflict table */
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 0.88em; }}
  th {{ background: #1f1f3e; color: #e94560; padding: 10px 12px; text-align: left; text-transform: uppercase; font-size: 0.8em; letter-spacing: 1px; }}
  td {{ padding: 9px 12px; border-bottom: 1px solid #1f1f3f; }}
  tr:hover td {{ background: #1a1a2e; }}
  .status-reconciled {{ color: #00c853; }}
  .status-pending {{ color: #ffd600; }}
  .status-conflict {{ color: #e94560; }}
  
  /* Action items */
  .action-list {{ list-style: none; }}
  .action-item {{ background: #1a1a2e; border-radius: 8px; padding: 16px 20px; margin: 12px 0; border-left: 4px solid #e94560; }}
  .action-item.priority-1 {{ border-color: #e94560; }}
  .action-item.priority-2 {{ border-color: #ffd600; }}
  .action-item.priority-3 {{ border-color: #2979ff; }}
  .action-num {{ font-size: 1.4em; font-weight: bold; color: #e94560; float: left; margin-right: 12px; }}
  .action-title {{ font-weight: bold; color: #fff; font-size: 1em; }}
  .action-desc {{ color: #aaa; font-size: 0.88em; margin-top: 6px; }}
  .action-desc li {{ margin: 4px 0 4px 16px; list-style: disc; }}
  
  /* Footer */
  .footer {{ background: #1a1a2e; padding: 30px; text-align: center; color: #666; font-size: 0.85em; margin-top: 60px; border-top: 1px solid #2a2a4e; }}
  
  /* Toggle */
  details summary {{ list-style: none; }}
  details summary::-webkit-details-marker {{ display: none; }}
  
  .toggle-btn {{ background: none; border: none; color: #aaa; cursor: pointer; font-size: 0.85em; padding: 4px 8px; }}
  
  @media print {{
    body {{ background: white; color: black; }}
    .header {{ background: #1a1a2e !important; }}
  }}
</style>
</head>
<body>

<div class="header">
  <h1>🎵 Sada Baby — Royalty Audit Report</h1>
  <h2>ASCAP + BMI Comprehensive Cross-Reference Analysis</h2>
  <div class="meta">Casada Aaron Sorrell &nbsp;|&nbsp; 10 Projects (2017–2023) &nbsp;|&nbsp; Generated: {datetime.now().strftime('%B %d, %Y')} &nbsp;|&nbsp; Prepared for: Cody Patrick</div>
</div>

<div class="container">

  <!-- Summary Cards -->
  <div class="summary-grid">
    <div class="card blue">
      <div class="number">{total}</div>
      <div class="label">Total Tracks Audited</div>
    </div>
    <div class="card green">
      <div class="number">{any_reg}</div>
      <div class="label">Registered (Any PRO)</div>
    </div>
    <div class="card red">
      <div class="number">{neither}</div>
      <div class="label">Completely Unregistered</div>
    </div>
    <div class="card yellow">
      <div class="number">{len(conflicts)}</div>
      <div class="label">BMI Conflicts</div>
    </div>
    <div class="card yellow">
      <div class="number">{len(pending)}</div>
      <div class="label">Pending Review</div>
    </div>
    <div class="card blue">
      <div class="number">348</div>
      <div class="label">Total BMI Works</div>
    </div>
  </div>

  <!-- Registration Breakdown -->
  <div class="section-title">Registration Status Overview</div>
  
  <div class="summary-grid">
    <div class="card green">
      <div class="number">{both}</div>
      <div class="label">Registered in Both ASCAP + BMI</div>
    </div>
    <div class="card green">
      <div class="number">{bmi_only}</div>
      <div class="label">BMI Only</div>
    </div>
    <div class="card green">
      <div class="number">{ascap_only}</div>
      <div class="label">ASCAP Only</div>
    </div>
    <div class="card red">
      <div class="number">{neither}</div>
      <div class="label">Neither PRO</div>
    </div>
  </div>

  <div class="alert warning">
    <strong>⚠️ Registration Rate: {any_reg/total*100:.1f}%</strong> — {any_reg} of {total} tracks have at least one PRO registration.
    <strong>{neither} tracks ({neither/total*100:.1f}%)</strong> have NO registration with ASCAP or BMI and are generating zero collectible performance royalties.
  </div>

  <div class="alert danger">
    <strong>🚨 Key Gaps:</strong>
    WHOOP Tape (15 unregistered, ft. Waka Flocka) &nbsp;·&nbsp;
    Brolik (9 unregistered) &nbsp;·&nbsp;
    Bartier Bounty 2 (12 unregistered) &nbsp;·&nbsp;
    SHONUFF (8 unregistered, ft. Wiz Khalifa) &nbsp;·&nbsp;
    Skuba Sada 2.5 / Warner (3 unregistered)
  </div>

  <!-- Project Breakdown -->
  <div class="section-title">Project-by-Project Breakdown</div>
"""

for project, data in results.items():
    tracks = data['tracks']
    proj_total = len(tracks)
    proj_any = sum(1 for t in tracks if t['ascap'] or t['bmi'])
    proj_neither = sum(1 for t in tracks if not t['ascap'] and not t['bmi'])
    proj_bmi = sum(1 for t in tracks if t['bmi'])
    proj_ascap = sum(1 for t in tracks if t['ascap'])
    pct = proj_any / proj_total * 100
    bar_color = '#00c853' if pct >= 80 else '#ffd600' if pct >= 50 else '#e94560'
    
    html += f"""
  <details class="project-card" open>
    <summary>
      <div class="project-header">
        <div>
          <div class="project-name">📁 {project}</div>
          <div class="project-label">{data['label']}</div>
        </div>
        <div class="project-stats">
          <span class="stat-badge badge-green">✅ {proj_any} registered</span>
          {'<span class="stat-badge badge-red">❌ ' + str(proj_neither) + ' unregistered</span>' if proj_neither > 0 else ''}
          <span class="stat-badge badge-yellow">{proj_total} total</span>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:{pct:.0f}%;background:{bar_color}"></div></div>
    </summary>
    <div class="track-list">
"""
    for t in tracks:
        is_reg = t['ascap'] or t['bmi']
        row_class = 'registered' if is_reg else 'unregistered'
        icon = '✅' if is_reg else '❌'
        badges = ''
        if t['ascap'] and t['bmi']:
            badges += '<span class="tbadge tbadge-ascap">ASCAP</span>'
            bmi_status = t['bmi_data']['status'] if t['bmi_data'] else ''
            status_class = 'tbadge-conflict' if 'Conflict' in bmi_status else 'tbadge-pending' if 'Pending' in bmi_status else 'tbadge-bmi'
            badges += f'<span class="tbadge {status_class}">BMI #{t.get("bmi_tn","")}</span>'
        elif t['bmi']:
            bmi_status = t['bmi_data']['status'] if t['bmi_data'] else ''
            status_class = 'tbadge-conflict' if 'Conflict' in bmi_status else 'tbadge-pending' if 'Pending' in bmi_status else 'tbadge-bmi'
            match_badge = '<span class="tbadge tbadge-partial">~PARTIAL</span>' if t.get('match_type') == 'PARTIAL' else ''
            badges += f'<span class="tbadge {status_class}">BMI #{t.get("bmi_tn","")}</span>{match_badge}'
        elif t['ascap']:
            badges += '<span class="tbadge tbadge-ascap">ASCAP</span>'
        
        html += f'      <div class="track-row {row_class}"><span class="track-icon">{icon}</span><span class="track-name">{t["track"]}</span><div class="track-badges">{badges}</div></div>\n'
    
    html += "    </div>\n  </details>\n"

# Unregistered tracks section
html += f"""
  <div class="section-title">❌ Unregistered Tracks — Action Required ({neither} tracks)</div>
  <div class="alert danger">
    These {neither} tracks have NO registration with ASCAP or BMI. Performance royalties from radio, streaming, TV sync, and live performance cannot be collected without PRO registration.
  </div>
  <div class="unreg-grid">
"""

for project, data in results.items():
    unreg = [t['track'] for t in data['tracks'] if not t['ascap'] and not t['bmi']]
    if unreg:
        html += f'    <div class="unreg-project"><h4>📁 {project} ({len(unreg)})</h4>'
        for t in unreg:
            html += f'      <div class="unreg-track">{t}</div>\n'
        html += '    </div>\n'

html += "  </div>\n"

# BMI Conflicts
html += f"""
  <div class="section-title">⚠️ BMI Works With Issues ({len(conflicts)} Conflicts, {len(pending)} Pending)</div>
  
  <div class="alert warning">
    <strong>Share/Participant Conflicts ({len(conflicts)} works):</strong> These works are registered but have unresolved ownership disputes. Royalties are likely being held in suspense until resolved.
  </div>
  
  <table>
    <tr><th>Title</th><th>BMI #</th><th>Reg Date</th><th>Status</th></tr>
"""
for tn, data in sorted(conflicts, key=lambda x: x[1]['title']):
    html += f'    <tr><td>{data["title"]}</td><td>{tn}</td><td>{data["registration_date"]}</td><td class="status-conflict">⚠️ Conflict</td></tr>\n'

html += f"""  </table>
  
  <div class="alert info">
    <strong>Pending Society Review ({len(pending)} works):</strong> Registered but awaiting final PRO reconciliation. Some have been pending since 2020–2021.
  </div>
  <table>
    <tr><th>Title</th><th>BMI #</th><th>Reg Date</th><th>Status</th></tr>
"""
for tn, data in sorted(pending, key=lambda x: x[1]['title'])[:30]:
    html += f'    <tr><td>{data["title"]}</td><td>{tn}</td><td>{data["registration_date"]}</td><td class="status-pending">🔄 Pending</td></tr>\n'
if len(pending) > 30:
    html += f'    <tr><td colspan="4" style="color:#aaa;text-align:center">... and {len(pending)-30} more pending works</td></tr>\n'
html += "  </table>\n"

# Action Items
html += f"""
  <div class="section-title">🎯 Priority Action Items</div>
  
  <div class="action-item priority-1">
    <div class="action-num">1</div>
    <div class="action-title">Register {neither} Unregistered Tracks with BMI</div>
    <div class="action-desc">
      <ul>
        <li>WHOOP Tape (15 tracks) — ft. Waka Flocka Flame; significant commercial value</li>
        <li>Bartier Bounty 2 (12 tracks) — independent release with streaming presence</li>
        <li>Brolik (9 tracks) — DatPiff exclusive; still generates streams</li>
        <li>SHONUFF (8 tracks) — ft. Wiz Khalifa, Lil Yachty; recent release</li>
        <li>Skuba Sada 2.5 (3 tracks) — Warner/Asylum major label release = highest royalty volume</li>
        <li>Register at: <strong>bmi.com/songwriter</strong></li>
      </ul>
    </div>
  </div>
  
  <div class="action-item priority-1">
    <div class="action-num">2</div>
    <div class="action-title">Resolve {len(conflicts)} BMI Share/Participant Conflicts</div>
    <div class="action-desc">
      <ul>
        <li>Royalties on conflicted works are being held in suspense — money is sitting uncollected</li>
        <li>Key conflict: <strong>KHALIFA MODE</strong> [#60415313] — Wiz Khalifa collaboration</li>
        <li>Contact BMI Licensing at 1-800-925-8451 or bmi.com to resolve each conflict</li>
        <li>Provide documentation of ownership splits for each disputed work</li>
      </ul>
    </div>
  </div>
  
  <div class="action-item priority-2">
    <div class="action-num">3</div>
    <div class="action-title">Follow Up on {len(pending)} Pending Society Reviews</div>
    <div class="action-desc">
      <ul>
        <li>Several works have been pending since 2020–2021 — escalation may be needed</li>
        <li>Priority: <strong>LITTLE WHILE FEAT BIG SEAN AND HIT BOY</strong> [#52132763] — major collab</li>
        <li>Priority: <strong>EASTSIDE JUMP SHOT</strong> [#42776404] — pending since April 2020</li>
        <li>Contact BMI to check status and expedite review</li>
      </ul>
    </div>
  </div>
  
  <div class="action-item priority-2">
    <div class="action-num">4</div>
    <div class="action-title">Register with The MLC (Mechanical Royalties)</div>
    <div class="action-desc">
      <ul>
        <li>The MLC handles digital mechanical royalties — separate from ASCAP/BMI performance royalties</li>
        <li>Every stream on Spotify, Apple Music, etc. generates mechanical royalties</li>
        <li>Skuba Sada 2.5 (Warner/Asylum) is highest priority — major label distribution = high stream counts</li>
        <li>Register at: <strong>themlc.com</strong></li>
      </ul>
    </div>
  </div>
  
  <div class="action-item priority-3">
    <div class="action-num">5</div>
    <div class="action-title">Verify SoundExchange Registration</div>
    <div class="action-desc">
      <ul>
        <li>SoundExchange collects digital performance royalties (Pandora, SiriusXM, internet radio)</li>
        <li>Completely separate from ASCAP/BMI — requires independent registration</li>
        <li>"Whole Lotta Choppas" (Platinum) and other hits likely generating significant SoundExchange royalties</li>
        <li>Register at: <strong>soundexchange.com</strong></li>
      </ul>
    </div>
  </div>
  
  <div class="action-item priority-3">
    <div class="action-num">6</div>
    <div class="action-title">Audit Publishing Splits on All BMI Works</div>
    <div class="action-desc">
      <ul>
        <li>Multiple BMI works show "NA" affiliation for co-writers — those writers cannot collect their share</li>
        <li>Verify all collaborators (producers, featured artists, co-writers) are properly PRO-affiliated</li>
        <li>Ensure publishing entity (CASADA AARON SORRELL PUB DESIG) is properly set up</li>
        <li>Consider establishing a formal publishing company for better catalog management</li>
      </ul>
    </div>
  </div>

  <!-- Additional BMI Works -->
  <div class="section-title">📋 Additional BMI Works Outside Audited Projects ({len(extra_bmi)} works)</div>
  <div class="alert info">
    These {len(extra_bmi)} works are registered in BMI but were not part of the 10 audited projects. They may be singles, features on other artists' projects, or works from unaudited releases.
  </div>
  <table>
    <tr><th>Title</th><th>BMI #</th><th>Reg Date</th><th>Status</th></tr>
"""
for tn, data in sorted(extra_bmi, key=lambda x: x[1]['title'])[:100]:
    status_class = 'status-conflict' if 'Conflict' in data['status'] else 'status-pending' if 'Pending' in data['status'] else 'status-reconciled'
    html += f'    <tr><td>{data["title"]}</td><td>{tn}</td><td>{data["registration_date"]}</td><td class="{status_class}">{data["status"]}</td></tr>\n'
if len(extra_bmi) > 100:
    html += f'    <tr><td colspan="4" style="color:#aaa;text-align:center">... and {len(extra_bmi)-100} more works</td></tr>\n'
html += "  </table>\n"

html += f"""
</div>

<div class="footer">
  <strong>Sada Baby (Casada Aaron Sorrell) — Comprehensive Royalty Audit Report</strong><br>
  Prepared for: Cody Patrick &nbsp;|&nbsp; Generated: {datetime.now().strftime('%B %d, %Y')}<br>
  Data Sources: ASCAP ACE Repertory, BMI Songview Catalog Export (348 works), Genius.com tracklists<br>
  <em>This report is for internal use only. All registration data sourced from official PRO databases.</em>
</div>

</body>
</html>"""

with open('sada-baby-audit/SADA-BABY-AUDIT-REPORT.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"HTML report written successfully")
print(f"Summary: {total} tracks | {any_reg} registered ({any_reg/total*100:.1f}%) | {neither} unregistered ({neither/total*100:.1f}%)")
print(f"BMI: {len(all_bmi)} works | {reconciled_count} reconciled | {len(conflicts)} conflicts | {len(pending)} pending")
print(f"Extra BMI works (outside audited projects): {len(extra_bmi)}")