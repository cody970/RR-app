export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  readTime: number;
  category: "Recovery Story" | "Industry Insight" | "Technical Guide" | "Case Study";
  author: {
    name: string;
    role: string;
    initials: string;
  };
  tags: string[];
  content: string;
  featured?: boolean;
  /** Short contextual hook for the mid-article inline CTA widget */
  inlineCta?: string;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "two-million-ghost-catalog",
    title: "The $2 Million Ghost Catalog: How a Legacy Publisher Recovered Two Years of Missing Streaming Royalties",
    excerpt:
      "When a mid-sized music publisher audited their back catalog for the first time in three years, they discovered that nearly 40% of their works were generating zero streaming income — not because they weren't being played, but because the data connecting those plays to payments had quietly broken.",
    publishedAt: "2025-02-12",
    readTime: 9,
    category: "Recovery Story",
    featured: true,
    author: { name: "Marcus Webb", role: "Head of Rights Research", initials: "MW" },
    tags: ["ISWC", "Streaming", "Metadata", "Recovery"],
    inlineCta: "Is your catalog silently leaking revenue? Run a free ISWC audit in minutes.",
    content: `
<p>In early 2024, a mid-sized independent music publisher — one with a catalog of over 12,000 works spanning four decades — sat down with a spreadsheet they hadn't looked at closely in years. They knew something was off. Streaming revenue had plateaued while their catalog kept growing. The math didn't add up.</p>

<p>What they found over the following three months of auditing was nothing short of staggering: <strong>roughly $2.1 million in streaming royalties had gone uncollected over a 26-month period</strong>. The works were being streamed. The plays were being logged by Spotify, Apple Music, Amazon, and Deezer. The money was being paid out by the collecting societies. It just wasn't making its way back to the rightful publisher.</p>

<h2>The Root Cause: A Silent ISWC Mapping Failure</h2>

<p>The culprit wasn't fraud. It wasn't even negligence in the traditional sense. It was a metadata migration gone wrong — one that nobody noticed until a full audit was run.</p>

<p>Three years prior, the publisher had switched administration systems. During the data migration, a batch processing error corrupted the ISWC (International Standard Musical Work Code) associations for approximately 1,800 works. The ISWCs were present in the new system, but they'd been assigned to the wrong work records — a systematic one-row offset error that was invisible to anyone who wasn't cross-referencing individual work metadata against society registration data.</p>

<p>The consequences cascaded predictably:</p>

<ul>
<li>Streaming platforms couldn't match incoming usage reports to the correct publisher</li>
<li>ASCAP, BMI, and SOCAN forwarded royalties to the publisher database — but to works that had no corresponding recordings registered under the publisher's name</li>
<li>The royalties accumulated in "suspense" accounts at the societies — unmatched, unclaimed, and aging toward the permanent black box</li>
</ul>

<h2>The Recovery Process</h2>

<p>Once the error was identified, the recovery process required navigating five different collecting societies across three countries. Each had different timelines for honoring backdated claims. ASCAP and BMI allowed claims going back 36 months; SOCAN had a 24-month window; PRS for Music in the UK required written documentation of the migration error before opening a historical claim review.</p>

<p>The total recovery took 11 months of active correspondence. Not all of the $2.1 million was recoverable — approximately $340,000 had passed the claim window at two societies. But $1.76 million was successfully redirected to the correct publisher account.</p>

<h2>What This Means for Your Catalog</h2>

<p>This story isn't unusual. ISWC mapping errors are among the most common and most invisible causes of royalty leakage for publishers who have ever migrated data between systems, changed administrators, or acquired catalog from another entity.</p>

<p>The warning signs are subtle: revenue plateaus that don't correlate with catalog growth, individual works that generate streaming data on DSPs but no corresponding society distributions, or royalty statements that feel slightly too round in their numbers.</p>

<p>A systematic metadata audit — cross-referencing your internal work database against live society registration data — is the only way to catch these silent failures before they cost you years of revenue. Modern catalog audit platforms can automate this cross-reference, flagging ISWC mismatches in hours rather than months.</p>

<p><strong>The lesson:</strong> Your catalog data doesn't just describe your revenue — it is your revenue. Treat metadata integrity as a financial imperative, not an administrative formality.</p>
`,
  },

  {
    slug: "isrc-chaos-invisible-recordings",
    title: "ISRC Chaos: Why Your Recordings Are Invisible to Streaming Platforms",
    excerpt:
      "The International Standard Recording Code is a 12-character identifier that acts as a recording's fingerprint in the global digital music ecosystem. When it's missing, duplicated, or wrong, your recordings effectively don't exist — and neither does your income.",
    publishedAt: "2025-01-28",
    readTime: 7,
    category: "Technical Guide",
    author: { name: "Priya Nair", role: "Catalog Technology Lead", initials: "PN" },
    tags: ["ISRC", "Metadata", "Streaming", "DSP"],
    inlineCta: "Check every ISRC in your catalog for mismatches — free, no credit card.",
    content: `
<p>Ask most independent artists about their ISRC codes and you'll get one of three responses: a confident recitation of codes they got from their distributor, a vague acknowledgment that they exist somewhere in their account settings, or a blank stare. The third group is the most at risk.</p>

<p>The <strong>International Standard Recording Code (ISRC)</strong> is the universal identifier for sound recordings and music videos. It's how Spotify tells ASCAP "we played this specific recording 4.2 million times this month." Without a valid, properly registered ISRC, that reporting chain breaks — and the money attached to it simply disappears into the ether.</p>

<h2>The Six Ways ISRCs Fail</h2>

<p>After auditing thousands of catalogs, we've identified six recurring patterns of ISRC-related revenue leakage:</p>

<h3>1. Missing ISRCs</h3>
<p>Recordings uploaded to distributors without ISRCs get assigned temporary internal identifiers that are not recognized by collecting societies. Performance royalties from streaming platforms are generated, but never matched to a rights holder. A 2023 industry study estimated that approximately 18% of tracks on major streaming platforms have no registered ISRC — representing hundreds of millions of unmatched royalty dollars annually.</p>

<h3>2. Duplicate ISRCs</h3>
<p>The same ISRC applied to multiple recordings (a common mistake when artists re-use codes between original and remastered versions) creates identity conflicts in collecting society databases. One recording gets the royalties; the other gets nothing.</p>

<h3>3. Wrongly Formatted Codes</h3>
<p>An ISRC has a precise 12-character format: 2-letter country code, 3-character registrant, 2-digit year, 5-digit designation. A single character error — often introduced during manual data entry — renders the code unrecognizable to automated matching systems.</p>

<h3>4. ISRC Re-use Across Territories</h3>
<p>Some artists register the same recording with different ISRCs in different territories, then license both versions globally. This creates split reporting where each society sees half the plays and pays out accordingly — resulting in systematic underpayment everywhere.</p>

<h3>5. Distributor vs. Label Conflicts</h3>
<p>When a recording has been distributed by multiple services over its lifetime (a common scenario for catalog re-releases), conflicting ISRCs can exist simultaneously in different systems. Streaming platforms use the ISRC their uploader provided — which may differ from what your collecting society has registered.</p>

<h3>6. Label Copy Omission</h3>
<p>Streaming platforms use multiple data points for matching: ISRC, artist name, track title, album title, and label. When the label field is missing or inconsistent, even a correct ISRC can fail to trigger payment if the society's matching algorithm requires confirmation from a secondary identifier.</p>

<h2>How to Audit Your ISRC Health</h2>

<p>A proper ISRC audit involves four steps:</p>

<ol>
<li><strong>Extract your complete recording inventory</strong> from your distributor(s), administration platform, and any direct DSP accounts</li>
<li><strong>Cross-reference against society databases</strong> — specifically SoundExchange (US digital), PPL (UK), ABRAMUS (Brazil), and GVL (Germany) depending on your territory exposure</li>
<li><strong>Validate format integrity</strong> — each ISRC should match the standard pattern and appear in exactly one place per unique recording</li>
<li><strong>Check for orphaned play data</strong> — request usage reports from your distributor and cross-match against your verified ISRC list to identify plays that generated no royalty flow</li>
</ol>

<p>For a catalog of 500+ recordings, manual ISRC auditing takes weeks. Automated tools can run this cross-reference in minutes, flagging every mismatch and orphaned code with actionable remediation steps.</p>

<p>An ISRC isn't just an identifier. It's the key that unlocks your revenue. Treat it accordingly.</p>
`,
  },

  {
    slug: "black-box-billions-unclaimed-royalties",
    title: "Black Box Billions: The Unclaimed Royalties Crisis Sitting in Society Vaults",
    excerpt:
      "An estimated $2.65 billion in music royalties sits in collecting society accounts right now, attributed to no one. This is the black box problem — and it affects every rights holder on earth.",
    publishedAt: "2025-01-14",
    readTime: 11,
    category: "Industry Insight",
    featured: true,
    author: { name: "Layla Hassan", role: "Policy & Research Director", initials: "LH" },
    tags: ["PRO", "Collecting Societies", "Black Box", "Revenue Recovery"],
    inlineCta: "Find out how much of your catalog is sitting in society suspense accounts.",
    content: `
<p>Every year, a significant portion of all music royalties generated globally never reaches the people who earned them. Not because it wasn't collected — it was. Not because the societies kept it — they didn't. It sits in a category that the industry calls <em>the black box</em>: money that was paid out by streaming platforms, collected by performing rights organizations, and then matched to no one.</p>

<p>According to a 2024 analysis of public society disclosures, the global black box total currently sits at approximately <strong>$2.65 billion</strong>. Some estimates are higher. The exact number is impossible to verify precisely because each society tracks — and discloses — this differently.</p>

<h2>How the Black Box Forms</h2>

<p>Understanding the black box requires understanding how royalties flow. When a song streams on Spotify, Spotify generates a detailed usage report: song title, artist, album, ISRC, number of streams, country of play. This report goes to the relevant performing rights organizations and mechanical licensing agencies in each territory.</p>

<p>The society's job is to match each reported play to a registered work, look up the ownership split for that work, and distribute the corresponding royalty to the right account. When the match succeeds — which it does most of the time — money flows correctly.</p>

<p>When the match fails, the money goes into a "suspense" or "unmatched" account. The society holds it for a statutory period (typically 2-5 years depending on jurisdiction), attempts additional matching, and if still unresolved, redistributes it according to market share formulas — meaning it gets allocated to the most commercially successful artists and publishers of that period, regardless of whether they were the original source of those plays.</p>

<p>The causes of failed matching include:</p>

<ul>
<li>Missing or incorrect ISRCs in streaming platform metadata</li>
<li>Unregistered works (the work was never registered with the society)</li>
<li>Title and artist name discrepancies between the usage report and society database</li>
<li>Expired registrations (some societies require periodic renewal)</li>
<li>Cross-border ownership conflicts where two territories claim the same work</li>
<li>Sub-publishing gaps (a work is registered in one territory but not others)</li>
</ul>

<h2>The Market Share Redistribution Problem</h2>

<p>The market share redistribution mechanism — where unmatched royalties eventually flow to whoever was commercially dominant in that period — is perhaps the most troubling aspect of the black box. It means that if Spotify can't match a play of your indie folk track to your ASCAP registration, that money will eventually be distributed to Universal, Sony, and Warner Music publishing in proportion to their market share.</p>

<p>This isn't a conspiracy — it's an accounting necessity for societies that must distribute funds rather than hold them indefinitely. But it does mean the black box functions as a systematic transfer of wealth from artists with metadata problems to major label publishers with robust registration infrastructure.</p>

<h2>What Can Be Recovered</h2>

<p>The good news: a significant portion of suspended royalties are still within their claim window and can be recovered with proper documentation. In our experience auditing mid-sized catalogs, publishers who had never run a formal audit routinely find 8-22% of their historical royalty potential sitting in suspense accounts — claimable, waiting, and invisible to them simply because they didn't know to look.</p>

<p>Recovery requires:</p>

<ol>
<li><strong>Complete work registration</strong> across all relevant societies in all territories where your music is commercially distributed</li>
<li><strong>ISRC and ISWC integrity</strong> — every recording linked to its work, every work linked to its identifiers</li>
<li><strong>Sub-publishing coverage</strong> — ensuring your works are registered in-territory through a local affiliate or sub-publisher in key markets (Germany, Japan, UK, Brazil, Australia)</li>
<li><strong>Active monitoring</strong> — periodic cross-reference of your registered works against usage data from your distributors to catch new gaps before they age into irrecoverable black box funds</li>
</ol>

<p>The black box will always exist as a byproduct of scale — the global music ecosystem generates hundreds of billions of metadata-tagged usage events every day, and perfect matching is an impossible standard. But rights holders who maintain clean, complete, actively monitored catalog data capture a dramatically higher percentage of what they're owed. The gap between the most and least diligent rights holders in terms of recovery rate is not small. It is life-changing.</p>
`,
  },

  {
    slug: "split-agreement-disaster-800k",
    title: "The Split Agreement Disaster: How Poor Ownership Records Cost a Producer $800K",
    excerpt:
      "A hip-hop producer discovered that three of his biggest placements had been paying the wrong people for four years — because the split agreements from the recording sessions existed only in a text message thread.",
    publishedAt: "2024-12-20",
    readTime: 8,
    category: "Case Study",
    author: { name: "Devon Clarke", role: "Rights & Licensing Specialist", initials: "DC" },
    tags: ["Split Agreements", "Ownership", "Publishing", "Dispute"],
    inlineCta: "Secure your ownership splits before the next session — start for free.",
    content: `
<p>In the music industry, a "split sheet" is a simple document: a record of who contributed to a song and what percentage of the publishing and master they own. It takes about ten minutes to fill out. It should be signed at every recording session, before the song leaves the room. In practice, it often isn't.</p>

<p>The story of producer "DJ Vega" (a pseudonym used at his attorney's request) illustrates exactly what happens when it isn't.</p>

<h2>The Setup</h2>

<p>Between 2019 and 2021, DJ Vega produced three tracks that ended up as album cuts for a well-known rapper on a major label. Each track was a collaborative session: the rapper contributed a hook, a co-writer added some bridge lyrics, and DJ Vega made the beat. The splits were agreed verbally: 50% production (Vega), 25% rapper (performance writing), 25% co-writer.</p>

<p>Nobody filled out a split sheet. The only record of the agreement was a text message thread between Vega and the rapper's manager that read, loosely: <em>"yeah you're getting half the publishing bro that's the deal."</em></p>

<p>The tracks were registered. But the registration was filed by the label's publishing arm — without consulting Vega. His share was entered as 0%. The full 100% was split between the label's house writer account and the rapper's publishing deal.</p>

<h2>The Revenue Impact</h2>

<p>Over four years, those three tracks accumulated substantial streaming, radio play, and sync licensing income. When Vega finally hired a music attorney to audit his catalog in late 2023, the attorney identified the registration discrepancy immediately: three works generating significant revenue with Vega's name attached as producer but no ownership stake in the publishing registry.</p>

<p>Reconstructed estimates of the misallocated royalties totaled approximately $800,000 across ASCAP distributions and sync license payments. Because the registrations were filed by the label — who had a legitimate (if incomplete) claim as the recording entity — the dispute required litigation rather than a simple administrative correction.</p>

<h2>The Legal Process</h2>

<p>The case was complicated by the informality of the original agreements and the four-year gap before the dispute was raised. Vega's attorney built the case around three categories of evidence:</p>

<ul>
<li>The text message thread (authenticated through phone forensics)</li>
<li>Session log files from the recording studio showing Vega's presence and contribution hours</li>
<li>Secondary witness statements from two engineers present at the sessions</li>
</ul>

<p>The label settled before trial. Vega recovered approximately 62% of the disputed amount — roughly $495,000 — plus a corrected prospective ownership registration for future royalties. The missing 38% was attributed to the years outside the actionable claim window and to the evidentiary weakness of text-message evidence versus formal contracts.</p>

<h2>The Three-Line Prevention</h2>

<p>The entire situation — four years of misdirected royalties, legal fees, litigation stress — could have been prevented by filling out a split sheet at the session. Here's the minimum viable protection:</p>

<ol>
<li><strong>Document ownership before the session ends.</strong> Every contributor signs a split sheet listing their name, publishing affiliation, and percentage. Keep digital copies.</li>
<li><strong>Register immediately and personally.</strong> Don't rely on a label, co-writer, or manager to handle registration. Register the work yourself (or through your administrator) to ensure your share appears in the official record.</li>
<li><strong>Audit annually.</strong> Pull your work registrations from ASCAP, BMI, or SESAC once a year and verify that your name and percentage appear correctly. Catches errors while they're still in the claim window.</li>
</ol>

<p>The music industry runs on informal trust between collaborators. That trust is a feature, not a bug — it's what makes creative collaboration possible. But informal trust and informal documentation are two different things. You can be warmly collaborative and still have proper paperwork. The two are not in conflict.</p>
`,
  },

  {
    slug: "content-id-fight-back-win",
    title: "Content ID vs. Fair Use: How Independent Artists Fight Back — and Win",
    excerpt:
      "YouTube's Content ID system has generated over $9 billion in royalties — but it has also wrongly claimed the income from millions of legitimate videos. Here's how rights holders can use the claims system to their advantage rather than fighting it.",
    publishedAt: "2024-12-05",
    readTime: 10,
    category: "Technical Guide",
    author: { name: "Priya Nair", role: "Catalog Technology Lead", initials: "PN" },
    tags: ["Content ID", "YouTube", "Digital Rights", "Monetization"],
    inlineCta: "Monitor your entire catalog across Content ID — free plan available.",
    content: `
<p>YouTube's Content ID is one of the most powerful — and most misunderstood — systems in the digital music economy. Since its launch in 2007, it has processed over 800 million videos and generated more than $9 billion in royalties for rights holders who have registered their content. It is also, by YouTube's own admission, the single largest source of legitimate video removal and monetization disputes on the platform.</p>

<p>Understanding how Content ID actually works — and how to use it strategically — is one of the most valuable competencies a modern rights holder can develop.</p>

<h2>How Content ID Works</h2>

<p>When a rights holder (a record label, publishing admin, or artist through an aggregator) uploads a "reference file" to Content ID, YouTube's system creates an audio fingerprint of that file. The system then scans every video uploaded to YouTube against this fingerprint database — a process running continuously in real time across 500+ hours of video uploaded every minute.</p>

<p>When a match is detected, the rights holder has three options for what happens to that video:</p>

<ul>
<li><strong>Monetize:</strong> Ads run on the video; revenue goes to the rights holder</li>
<li><strong>Track:</strong> The video stays up, no ads, but the rights holder gets viewership analytics</li>
<li><strong>Block:</strong> The video is made unavailable, either globally or in specific territories</li>
</ul>

<p>Most rights holders set "Monetize" as default — which is generally correct. This turns every fan cover, reaction video, and sample-based user creation into a royalty stream rather than a legal threat.</p>

<h2>The False Match Problem</h2>

<p>Content ID's fingerprinting is impressively accurate, but not perfect. False matches occur most commonly in three scenarios:</p>

<h3>Royalty-Free and Creative Commons Music</h3>
<p>If a rights holder registers music that closely resembles a widely-used royalty-free track, their Content ID reference file will trigger claims on thousands of videos that legitimately licensed the similar-sounding track. This is particularly common with certain chord progressions, drum patterns, and production styles.</p>

<h3>Ambient/Background Audio</h3>
<p>A video filmed at a live music venue where a song was playing in the background can be claimed by the rights holder for that song — even if the filmer had no intention of featuring the music. This regularly affects travel vloggers, wedding video creators, and documentary filmmakers.</p>

<h3>Sample Clearance Gaps</h3>
<p>A track that contains an uncleared sample may be Content ID matched by both the original rights holder (who owns the sample) and the producer who created the derivative work. Both parties' registrations claim the same video simultaneously, creating a conflicting claims standoff.</p>

<h2>Disputing Claims Successfully</h2>

<p>For rights holders on the receiving end of a wrongful claim (a common scenario if you create music in a similar style to registered catalog), the dispute process works as follows:</p>

<ol>
<li><strong>Identify the claimant</strong> in YouTube Studio. Look at the "Matched content" section to see exactly which asset is claiming your video and who owns it.</li>
<li><strong>Assess the legitimacy.</strong> Is the match an actual sample of their work? A clearly distinct composition that happens to share some sonic characteristics? Or a common pattern like a four-on-the-floor kick drum?</li>
<li><strong>File the dispute with evidence.</strong> Don't just click "dispute" — write a clear explanation of why your content is original, attach any relevant documentation (original project files, timestamps, license agreements), and cite any applicable creative commons or fair use basis.</li>
<li><strong>Escalate to manual review if needed.</strong> If the claimant upholds their claim after your dispute, you can escalate to YouTube's manual review team, which reviews the dispute with human judgment rather than algorithmic matching.</li>
</ol>

<h2>Using Content ID Proactively</h2>

<p>For rights holders who want to use Content ID as a revenue generation tool rather than just a defensive measure:</p>

<ul>
<li>Register your full catalog, not just your most popular tracks. Fan covers of deep cuts can generate surprising revenue</li>
<li>Set your policy to "Monetize" globally, then carve out specific exceptions (e.g., allow educational channels to track without ads)</li>
<li>Review your Content ID analytics monthly. High match counts on specific tracks may indicate sampling or viral use that justifies a licensing outreach</li>
<li>If you administer publishing, register both the master recording AND the underlying musical work separately — they generate different revenue streams through Content ID</li>
</ul>

<p>Content ID is not the enemy of independent artists. Used correctly, it is one of the most reliable passive income streams available in the modern music industry. The artists and rights holders who treat it as infrastructure rather than nuisance are the ones who consistently capture the most from their digital catalog.</p>
`,
  },

  {
    slug: "sync-gap-tv-placements-uncollected",
    title: "The Sync Gap: Why Your TV Placements Go Partially Uncollected",
    excerpt:
      "Landing a sync placement in a major TV series is a milestone — but most artists and publishers collect only a fraction of the royalties that placement actually generates. Here's the full collection chain, and where it typically breaks.",
    publishedAt: "2024-11-18",
    readTime: 12,
    category: "Industry Insight",
    author: { name: "Layla Hassan", role: "Policy & Research Director", initials: "LH" },
    tags: ["Sync", "TV", "Licensing", "Performance Royalties"],
    inlineCta: "Track every sync placement and ensure you collect all downstream royalties.",
    content: `
<p>You get the email: your song has been placed in a major Netflix series. The licensing fee arrives — typically $10,000 to $75,000 for a meaningful show at a major streamer — and you feel, reasonably, that you've been paid for your placement. You've been paid for part of it. What most artists and independent publishers don't realize is that the sync licensing fee is only the first of several revenue streams generated by a TV placement, and often not the largest.</p>

<h2>The Full Revenue Chain of a TV Sync</h2>

<p>A song placed in a scripted television series generates revenue through at least four distinct channels:</p>

<h3>1. The Synchronization License Fee (One-Time)</h3>
<p>This is the upfront fee negotiated between the music supervisor and the rights holder(s) — typically split 50/50 between the master (recording) rights holder and the publishing (composition) rights holder. This is the payment most artists focus on. It's also the most visible and the most straightforward.</p>

<h3>2. Performance Royalties from Broadcast</h3>
<p>Every time the episode airs on television — whether on the primary network, cable, satellite, or international broadcasts — a performance royalty is generated. In the US, these are collected by ASCAP, BMI, or SESAC for the publisher/songwriter. They are not paid to the recording artist or label (SoundExchange handles digital performance royalties, not broadcast). The amounts vary significantly based on the prominence of the placement (background vs. featured), the show's viewership, and the territory of broadcast.</p>

<h3>3. Performance Royalties from Streaming</h3>
<p>When the show is available on a streaming platform like Netflix, Hulu, or Amazon Prime, each view generates what's known as a "streaming royalty" — separate from and in addition to the original sync fee. These are collected by performing rights organizations internationally and by SoundExchange in the US for master recording rights.</p>

<h3>4. International Sub-Publishing Royalties</h3>
<p>If the show airs internationally — which most major productions now do — performance royalties are generated in each territory of broadcast. These must be collected by local collecting societies (PRS in the UK, SOCAN in Canada, GEMA in Germany, JASRAC in Japan, etc.) and remitted back to the US rights holder through sub-publishing agreements or direct society reciprocal agreements.</p>

<h2>Where the Money Gets Lost</h2>

<p>In our experience auditing sync catalogs, the most common failure points are:</p>

<h3>Incomplete International Registration</h3>
<p>A work registered only with ASCAP in the US will generate US performance royalties correctly. But if the show airs in Germany, UK, Australia, and Japan — as most major Netflix productions do — and the work is not registered with GEMA, PRS, APRA, and JASRAC respectively, those performance royalties accumulate in those societies' black boxes and may never be claimed.</p>

<p>The fix: register all commercially distributed works with local society affiliates in every territory where your sync licensees operate. At minimum: US (ASCAP/BMI/SESAC), UK (PRS/PPL), Germany (GEMA), France (SACEM), Canada (SOCAN), Australia (APRA), Japan (JASRAC), Brazil (ABRAMUS).</p>

<h3>Cue Sheet Omissions</h3>
<p>The cue sheet is the document the production company files with performing rights organizations listing every piece of music used in a production, its writers, publishers, duration, and type of use. Errors and omissions on cue sheets are remarkably common — and they directly determine whether your performance royalties are triggered.</p>

<p>Rights holders should request copies of the cue sheets for every production that licenses their music and verify that their works are correctly listed with proper metadata. This proactive step alone can recover substantial royalties from placements where the cue sheet was filed incorrectly.</p>

<h3>Master vs. Publishing Disconnect</h3>
<p>In many independent artist scenarios, the same person owns both the master recording and the underlying composition. But they may have registered only one, or registered them under different administrative entities. Streaming performance royalties for the master go to SoundExchange; for the composition they go to the PRO. If either registration is missing, one stream disappears entirely.</p>

<h2>Building a Sync-Optimized Catalog</h2>

<p>The rights holders who consistently capture the full value of their sync placements share a common set of practices:</p>

<ol>
<li>They maintain a complete, current registration with at least eight major collecting societies worldwide before seeking sync placements</li>
<li>They request and review cue sheets within 60 days of each placement, not years later</li>
<li>They track expected performance royalty distributions against their internal placement log and investigate gaps proactively</li>
<li>They separate master and publishing registrations and ensure both are administered by entities with the appropriate society memberships</li>
</ol>

<p>A single major sync placement on a popular series can generate $50,000 to $200,000 in total royalties over its broadcast lifetime — but only for rights holders who have the infrastructure to collect it all. For those who haven't, the sync fee is just the beginning of a long list of what they didn't get paid.</p>
`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return blogPosts.filter((p) => p.featured);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
