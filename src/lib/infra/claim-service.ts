import { db as prisma } from "@/lib/infra/db";

export async function generateRetroactiveClaim(gapId: string, orgId: string, targetSociety: string) {
    // Fetch the gap and related data
    const gap = await prisma.registrationGap.findUnique({
        where: { id: gapId },
        include: {
            scan: {
                include: {
                    organization: true,
                }
            },
            work: {
                include: {
                    writers: {
                        include: { writer: true }
                    }
                }
            }
        }
    });

    if (!gap) {
        throw new Error("Registration Gap not found");
    }

    if (gap.scan.organizationId !== orgId) {
        throw new Error("Unauthorized access to this gap");
    }

    const orgName = gap.scan.organization.name;
    const title = gap.title;
    const isrc = gap.isrc || "N/A";
    const iswc = gap.iswc || "N/A";

    // Attempt to aggregate writers if available
    const writersList = gap.work?.writers.map((w: any) => `${w.writer.name} (${w.splitPercent}%)`).join(", ") || "Unknown Writers";

    const currentDate = new Date().toLocaleDateString('en-US');

    let societyContext = "";
    if (targetSociety === "ASCAP") {
        societyContext = "under the ASCAP Member Access agreement for historical performance adjustment.";
    } else if (targetSociety === "BMI") {
        societyContext = "pursuant to the BMI royalty distribution schedule and adjustment policy.";
    } else if (targetSociety === "MLC") {
        societyContext = "under the Mechanical Licensing Collective (MLC) retroactive distribution rules (Black Box royalties).";
    } else {
        societyContext = `permissible by ${targetSociety}.`;
    }

    // Generate a basic LOD (Letter of Direction) template
    const lodContent = `LETTER OF DIRECTION - RETROACTIVE ROYALTY CLAIM
Date: ${currentDate}
To: ${targetSociety} Registration & Claims Department
From: ${orgName}

Subject: Retroactive Royalty Allocation Request for Unregistered Work

We are writing to officially claim retroactive royalties for the musical work detailed below, for all available historical periods ${societyContext}

WORK DETAILS:
Title: ${title}
ISWC: ${iswc}
ISRC: ${isrc}
Primary Artist: ${gap.artistName || "N/A"}
Writers/Shares: ${writersList}

We understand this work was previously unregistered or contained gaps in its registration data which prevented proper payout. This letter serves as formal direction to release any accrued "black box" or pending royalties associated with these identifiers to ${orgName}.

Please confirm receipt of this claim and notify us upon the release of funds.

Sincerely,

${orgName}
Authorized Representative
    `;

    // Calculate a rough estimated value if none is provided, default to 2 years
    const yearsClaimed = 2;
    const estimatedValue = gap.estimatedImpact ? gap.estimatedImpact * yearsClaimed : 0;

    // Create the RetroactiveClaim record
    const claim = await prisma.retroactiveClaim.create({
        data: {
            gapId,
            organizationId: orgId,
            targetSociety,
            yearsClaimed,
            estimatedValue,
            status: "GENERATED",
            lodContent
        }
    });

    return claim;
}
