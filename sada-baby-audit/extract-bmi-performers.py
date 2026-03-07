# Extract all performer groupings and titles from BMI Songview search results
# Data extracted from browser interactive elements

performer_data = [
    ("SADA BABY", ["1955", "2055", "+ additional titles"]),
    ("BABY SADA", ["1992", "2K 17", "+ additional titles"]),
    ("FMB DZ FEAT SADA BABY", ["DOUBLE HEADED DRAGON", "FIELD", "+ additional titles"]),
    ("SORRELL SADA BABY CASADA", ["4 SEASONS", "REAL PAIN", "+ additional titles"]),
    ("FMB DZ AND SADA BABY", ["DRIPPLE DRAGONS", "TALK MY SHIT"]),
    ("AZCHIKE SADA BABY", ["HEAVEN"]),
    ("BANDGANG JIZZLE P JAISWAN SADA BABY", ["LICENSE PART 2"]),
    ("BIGKAYBEEZY FEAT SADA BABY", ["RED BOTTOMS"]),
    ("BLUEFACE FEATURING ASIAN DOLL GLOKK 9 NLE CHOPPA SADA BABY AND KIDDO CURRY", ["TOUR"]),
    ("CRASH RARRI FT SADA BABY", ["MELANIN"]),
    ("DAME D O L L A G EAZY SADA BABY", ["CHECK REMIX"]),
    ("DAME D O L L A G-EAZY SADA BABY", ["CHECK REMIX"]),
    ("E 40 FEAT SADA BABY AND FMB DZ", ["PACK ATTACK"]),
    ("E-40 FEAT PAYROLL GIOVANNI FEAT PEEZY FEAT SADA BABY", ["I COME FROM THE GAME"]),
    ("EASTSIDE REUP FEAT SADA BABY AND FMB DZ", ["762 S FEATURING SADA BABY"]),
    ("FMB DZ AND EASTSIDE REUP FEAT SADA BABY", ["FMBROTHAS"]),
    ("FMB DZ FEAT PAPERBOY RELL AND SADA BABY", ["WE LOCKED IN", "WHEN THEM APES COMIN"]),
    ("FMB DZ FEAT SADA BABY AND ANTT BEATZ", ["ONE TIME"]),
    ("HARDWORK JIG AND DAMEDOT FEAT SADA BABY", ["100 ROUND"]),
    ("HARDWORK JIGG FEAT SADA BABY", ["WAVE"]),
    ("ICEWEAR VEZZO FEAT SADA BABY", ["PERFECT"]),
    ("K LOZZ BUX LEE SADA BABY", ["IT IS WHAT IT IS"]),
    ("KASH DOLL SADA BABY", ["ON THE FLO"]),
    ("KRISPYLIFE KIDD ITSMANMAN SADA BABY BENO", ["CRAZY LIFE"]),
    ("LARUSSELL EKZAKT AND DTB FEAT SADA BABY", ["TEST YA NUTS"]),
    ("MARK WHITE AND SADA BABY", ["BREADED"]),
    ("NASAAN FEAT SADA BABY", ["DOES IT AGAIN"]),
    ("NEF THE PHARAOH SADA BABY", ["LEFT ME IN THE MUD", "LEFT ME IN THE MUD"]),
    ("NOOK TEE GRIZZLEY AND SADA BABY", ["DREADZ N BREAD REMIX"]),
    ("NUK SADA BABY", ["KRUNXHRAP SUPREME"]),
    ("OBA ROWLAND AND SADA BABY", ["RIGHT"]),
    ("OG CEEKAY FT SADA BABY", ["ACTING", "MURDER"]),
    ("OMB PEEZY SADA BABY", ["ONE ME"]),
    ("SADA BABY AND BFB DA PACKMAN", ["FREE JOE EXOTIC"]),
    ("SADA BABY AND DAMEDOT", ["BOKIENA"]),
    ("SADA BABY AND JMSN", ["SOFT SPOT 955 REMIX"]),
    ("SADA BABY BIG SEAN HIT BOY", ["LITTLE WHILE FEAT BIG SEAN AND HIT BOY"]),
    ("SADA BABY CASADA", ["YESTERDAY"]),
    ("SADA BABY CASSADA", ["NO GET BACKS"]),
    ("SADA BABY DAMEDOT TID SWEEZE AND VON JOSE", ["DAWG IN THE CAR"]),
    ("SADA BABY DREGO AND CHUCHO DABBIN", ["WHYTES"]),
    ("SADA BABY FEAT BIG SEAN FEAT HIT BOY", ["LITTLE WHILE FEAT BIG SEAN AND HIT BOY"]),
    ("SADA BABY FEAT FMB DZ", ["OH BOY"]),
    ("SADA BABY FEAT KAMAIYAH", ["CHUCK MONEY"]),
    ("SADA BABY FEAT LAKEYAH", ["TO THE MONEY"]),
    ("SADA BABY FEAT SKILLA BABY", ["FOOD STAMP FELONS", "JUDY"]),
    ("SADA BABY FT WIZ", ["KHALIFA MODE"]),
    ("SADA BABY HOLLOW", ["FOE MINUTES OF HELL"]),
    ("SADA BABY SUKIHANA", ["SUKISADA"]),
    ("SADA BABY TEE GRIZZLEY", ["NEXT UP"]),
    ("SHOOTERGANG KONY SADA BABY", ["SHOOT FRONT THE REVEREND"]),
    ("SKILLA BABY SADA BABY", ["TIM DUNKIN"]),
    ("TEE GRIZZLEY AND SADA BABY", ["GAME", "GRIZZLEY GANG"]),
    ("THECOALCASHCOLLECTION AND SADA BABY", ["THEO RATLIFF"]),
    ("TRIPPE REDD SADA BABY AND ICEWEAR", ["CAPTAIN CRUNCH"]),
    ("TRIPPIE REDD SADA BABY ICEWEAR VEZZO BABYFACE", ["CAPTAIN CRUNCH"]),
    ("YUNGMANNY FEAT FLO MILLI AND SADA BABY", ["CLAP FOR EM"]),
]

# Collect all unique titles visible from the search results page
all_visible_titles = set()
for performer, titles in performer_data:
    for t in titles:
        if t != "+ additional titles":
            all_visible_titles.add(t)

print(f"Total performer groupings: {len(performer_data)}")
print(f"Unique visible titles from search page: {len(all_visible_titles)}")
print()

# The main entries with "+ additional titles" need to be clicked into
# These are: SADA BABY, BABY SADA, FMB DZ FEAT SADA BABY, SORRELL SADA BABY CASADA
print("Performer groupings with additional titles (need full catalog):")
for performer, titles in performer_data:
    if "+ additional titles" in titles:
        visible = [t for t in titles if t != "+ additional titles"]
        print(f"  {performer}: {visible} + more")

print()
print("All visible titles (sorted):")
for t in sorted(all_visible_titles):
    print(f"  {t}")