/**
 * Sequence Generation Module
 * Generates valid layer sequences for multi-color printing
 */

import { simColour, rgb_to_key } from '../core/utils.js';

/**
 * Generate all possible layer sequences for N colours and M layers
 * CRITICAL: Only generates VALID sequences (no gaps)
 *
 * A sequence is valid if:
 * 1. Not all zeros (empty sequence)
 * 2. No gaps (no non-zero values after zeros)
 *
 * Examples:
 * - Valid: [1, 2, 0, 0], [1, 1, 1, 1], [2, 3, 0, 0]
 * - Invalid: [0, 0, 0, 0], [1, 0, 2, 0], [0, 1, 2, 3]
 *
 * @param {number} N - Number of colours/filaments
 * @param {number} M - Number of layers per tile
 * @returns {Array} Array of valid sequences
 */
export function generateSequences(N, M) {
    const seqs = [];

    /**
     * Check if a sequence is valid
     * @param {Array} s - Sequence to validate
     * @returns {boolean} True if valid
     */
    function isValid(s) {
        // Reject all-empty sequences
        if (s.every(v => v === 0)) return false;

        // Reject sequences with gaps (non-zero after zero)
        let seenZero = false;
        for (let v of s) {
            if (v === 0) {
                seenZero = true;
            } else if (seenZero) {
                return false; // Gap detected!
            }
        }
        return true;
    }

    /**
     * Recursive sequence generator
     * @param {Array} cur - Current sequence being built
     * @param {number} d - Current depth (layer index)
     */
    function gen(cur, d) {
        if (d === M) {
            if (isValid(cur)) {
                seqs.push([...cur]);
            }
            return;
        }

        // CRITICAL: Once we hit zero, only allow zeros
        if (cur.length > 0 && cur[cur.length - 1] === 0) {
            gen([...cur, 0], d + 1);
        } else {
            // Can use any filament (1 to N) or empty (0)
            for (let v = 0; v <= N; v++) {
                gen([...cur, v], d + 1);
            }
        }
    }

    gen([], 0);
    return seqs;
}

/**
 * Build sequence map (RGB color -> sequence data)
 * This map is CRITICAL for the entire workflow - it allows
 * us to look up the layer sequence for any color in the final image
 *
 * @param {Array} sequences - Array of sequences
 * @param {Array} colours - Array of color objects {h, n}
 * @param {number} cols - Grid columns (for position calculation)
 * @returns {Map} Map from RGB key to sequence data
 */
export function buildSequenceMap(sequences, colours, cols) {
    const map = new Map();

    sequences.forEach((seq, idx) => {
        // Calculate what color this sequence produces
        const colour = simColour(seq, colours);
        const key = rgb_to_key(colour);

        // Store sequence with metadata
        map.set(key, {
            sequence: seq,
            colours: colours,
            grid_position: {
                row: Math.floor(idx / cols),
                col: idx % cols,
                index: idx
            }
        });
    });

    return map;
}

/**
 * Calculate theoretical number of sequences
 * Formula: N × (N^M - 1) / (N - 1)
 *
 * @param {number} N - Number of colours
 * @param {number} M - Number of layers
 * @returns {number} Expected sequence count
 */
export function calculateSequenceCount(N, M) {
    if (N === 1) return M; // Special case
    return N * (Math.pow(N, M) - 1) / (N - 1);
}
