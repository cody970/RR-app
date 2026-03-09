# Songstats API Integration

This module provides a wrapper for the Songstats API using the official Node.js SDK.

## Setup

1. **Install the SDK:**
   ```bash
   npm install songstats-node-sdk
   ```
2. **Add your API key:**
   - Copy your Songstats API key to your `.env` file as `SONGSTATS_API_KEY`.

3. **Usage Example:**
   ```typescript
   import { fetchTrackByISRC } from 'src/lib/clients/songstats';
   const track = await fetchTrackByISRC('USUM71705354');
   ```

## References
- [Songstats API Docs](https://docs.songstats.com)
- [Node.js SDK](https://github.com/Songstats/songstats-node-sdk)
