/**
 * Performance Benchmarking Utility
 * 
 * Provides tools for measuring and tracking performance of
 * various operations including validation, CWR generation, etc.
 */

export interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
  timestamp: Date;
}

export interface BenchmarkOptions {
  iterations?: number;
  warmup?: number;
  gcBetweenIterations?: boolean;
}

// Benchmark results storage
const benchmarkResults: BenchmarkResult[] = [];

/**
 * Run a benchmark on a function
 */
export async function benchmark(
  name: string,
  fn: () => Promise&lt;void&gt; | void,
  options: BenchmarkOptions = {}
): Promise&lt;BenchmarkResult&gt; {
  const {
    iterations = 100,
    warmup = 10,
    gcBetweenIterations = false,
  } = options;

  console.log(`[Benchmark] Starting: ${name} (${iterations} iterations, ${warmup} warmup)`);

  // Warmup runs
  for (let i = 0; i < warmup; i++) {
    await fn();
  }

  // Force garbage collection if available
  if (typeof global.gc === 'function') {
    global.gc();
  }

  const durations: number[] = [];
  const startMemory = process.memoryUsage();

  // Actual benchmark runs
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    await fn();
    const end = process.hrtime.bigint();
    
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    durations.push(duration);

    // Force garbage collection between iterations if requested
    if (gcBetweenIterations && typeof global.gc === 'function') {
      global.gc();
    }
  }

  const endMemory = process.memoryUsage();

  // Calculate statistics
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  const result: BenchmarkResult = {
    name,
    duration: durations.reduce((sum, d) => sum + d, 0),
    iterations,
    avgDuration,
    minDuration,
    maxDuration,
    memoryUsage: {
      rss: endMemory.rss - startMemory.rss,
      heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      heapUsed: endMemory.heapUsed - startMemory.heapUsed,
      external: endMemory.external - startMemory.external,
      arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
    },
    timestamp: new Date(),
  };

  benchmarkResults.push(result);

  console.log(`[Benchmark] Completed: ${name}`);
  console.log(`  Average: ${avgDuration.toFixed(3)}ms`);
  console.log(`  Min: ${minDuration.toFixed(3)}ms`);
  console.log(`  Max: ${maxDuration.toFixed(3)}ms`);
  console.log(`  Memory: ${result.memoryUsage.heapUsed} bytes`);

  return result;
}

/**
 * Compare multiple benchmarks
 */
export function compareBenchmarks(...results: BenchmarkResult[]): void {
  console.log('\n=== Benchmark Comparison ===');
  
  const headers = ['Name', 'Avg (ms)', 'Min (ms)', 'Max (ms)', 'Memory (bytes)'];
  console.log(headers.join('\t'));

  for (const result of results) {
    const row = [
      result.name,
      result.avgDuration.toFixed(3),
      result.minDuration.toFixed(3),
      result.maxDuration.toFixed(3),
      result.memoryUsage.heapUsed.toString(),
    ];
    console.log(row.join('\t'));
  }
  
  // Find fastest
  const fastest = results.reduce((min, r) => r.avgDuration < min.avgDuration ? r : min);
  console.log(`\nFastest: ${fastest.name} (${fastest.avgDuration.toFixed(3)}ms)`);

  // Find slowest
  const slowest = results.reduce((max, r) => r.avgDuration > max.avgDuration ? r : max);
  console.log(`Slowest: ${slowest.name} (${slowest.avgDuration.toFixed(3)}ms)`);

  // Calculate speedup
  const speedup = slowest.avgDuration / fastest.avgDuration;
  console.log(`Speedup: ${speedup.toFixed(2)}x`);
}

/**
 * Get all benchmark results
 */
export function getBenchmarkResults(): BenchmarkResult[] {
  return [...benchmarkResults];
}

/**
 * Clear benchmark results
 */
export function clearBenchmarkResults(): void {
  benchmarkResults.length = 0;
}

/**
 * Measure execution time of a function (single run)
 */
export async function measureTime&lt;T&gt;(
  fn: () => Promise&lt;T&gt; | T,
  label?: string
): Promise&lt;{ result: T; duration: number }&gt; {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  
  const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
  
  if (label) {
    console.log(`[Timing] ${label}: ${duration.toFixed(3)}ms`);
  }
  
  return { result, duration };
}

/**
 * Measure execution time of a function (average over multiple runs)
 */
export async function measureTimeAverage&lt;T&gt;(
  fn: () => Promise&lt;T&gt; | T,
  iterations = 10,
  label?: string
): Promise&lt;{ avgDuration: number; results: T[] }&gt; {
  const results: T[] = [];
  const durations: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const { result, duration } = await measureTime(fn);
    results.push(result);
    durations.push(duration);
  }
  
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  
  if (label) {
    console.log(`[Timing] ${label} (avg over ${iterations} runs): ${avgDuration.toFixed(3)}ms`);
  }
  
  return { avgDuration, results };
}