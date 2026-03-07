/**
 * Music Industry Constants & Royalty Estimates
 */

export const ESTIMATES = {
    /**
     * Estimated publishing share of total revenue (approx. 25%)
     */
    PUBLISHING_SHARE: 0.25,

    /**
     * Estimated mechanical share of publishing revenue (approx. 15%)
     */
    MECHANICAL_SHARE: 0.15,

    /**
     * Estimated SoundExchange (neighboring rights) share of total revenue (approx. 10%)
     */
    SOUNDEXCHANGE_SHARE: 0.10,

    /**
     * Default estimated impact for a missing ISWC finding
     */
    MISSING_ISWC_IMPACT_USD: 15.50,

    /**
     * Default estimated impact for a split overlap finding
     */
    SPLIT_OVERLAP_IMPACT_USD: 250.00,

    /**
     * Multiplier for unclaimed split percentage to estimate impact
     */
    UNCLAIMED_SPLIT_MULTIPLIER: 5.0,

    /**
     * Default estimated impact for a possible duplicate work
     */
    DUPLICATE_WORK_IMPACT_USD: 10.00,

    /**
     * Default estimated impact for a missing ISRC finding
     */
    MISSING_ISRC_IMPACT_USD: 45.00,

    /**
     * Default estimated impact for an unlinked recording finding
     */
    UNLINKED_RECORDING_IMPACT_USD: 25.00,

    /**
     * Default estimated impact for an unregistered recording finding
     */
    UNREGISTERED_RECORDING_IMPACT_USD: 50.00,

    /**
     * Share of revenue estimated for split overlaps/conflicts
     */
    SPLIT_OVERLAP_SHARE: 0.10,

    /**
     * Default estimated impact for missing artist info on PRO
     */
    MISSING_ARTIST_IMPACT_USD: 5.00,

    /**
     * Default estimated impact for low confidence matches
     */
    LOW_CONFIDENCE_MATCH_IMPACT_USD: 2.00,
};

export const CONFIDENCE = {
    HIGH: 90,
    MEDIUM: 75,
    LOW: 60,
};
