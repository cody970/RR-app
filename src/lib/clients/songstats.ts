// Songstats API integration setup for RoyaltyRadar
// This module will provide a wrapper for Songstats API calls once credentials are available.
// See: https://docs.songstats.com and https://github.com/Songstats/songstats-node-sdk

import Songstats from 'songstats-node-sdk';

// TODO: Move API key to environment variable when available
const SONGSTATS_API_KEY = process.env.SONGSTATS_API_KEY || '';

// Initialize the Songstats SDK client (will error if no key)
export const songstatsClient = SONGSTATS_API_KEY
  ? new Songstats({ apiKey: SONGSTATS_API_KEY })
  : null;

// Example: Fetch track data by ISRC
export async function fetchTrackByISRC(isrc: string) {
  if (!songstatsClient) throw new Error('Songstats API key not set');
  // See SDK docs for available methods
  return songstatsClient.tracks.getByISRC(isrc);
}

// Example: Fetch artist data by Spotify ID
export async function fetchArtistBySpotifyId(spotifyId: string) {
  if (!songstatsClient) throw new Error('Songstats API key not set');
  return songstatsClient.artists.getBySpotifyId(spotifyId);
}

// Add more wrappers as needed for your use cases
