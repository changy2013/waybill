import { MAPPING_DICTIONARY, SYSTEM_FIELDS } from './constants';

/**
 * Auto-map Excel headers to system fields using fuzzy keyword matching
 * Returns: { excelHeader: systemFieldKey, ... }
 */
export function autoMapFields(excelHeaders) {
  const mapping = {};
  const usedSystemFields = new Set();

  // Normalize header for comparison
  const normalize = (str) => String(str).toLowerCase().replace(/[\s\(\)（）\/\\,，\.。_\-]/g, '');

  excelHeaders.forEach(header => {
    const normalizedHeader = normalize(header);
    let bestMatch = null;
    let bestScore = 0;

    Object.entries(MAPPING_DICTIONARY).forEach(([fieldKey, keywords]) => {
      if (usedSystemFields.has(fieldKey)) return;

      keywords.forEach(keyword => {
        const normalizedKeyword = normalize(keyword);
        let score = 0;

        // Exact match
        if (normalizedHeader === normalizedKeyword) {
          score = 100;
        }
        // Header contains keyword
        else if (normalizedHeader.includes(normalizedKeyword)) {
          score = 80 + (normalizedKeyword.length / normalizedHeader.length) * 15;
        }
        // Keyword contains header
        else if (normalizedKeyword.includes(normalizedHeader) && normalizedHeader.length >= 2) {
          score = 60 + (normalizedHeader.length / normalizedKeyword.length) * 15;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = fieldKey;
        }
      });
    });

    if (bestMatch && bestScore >= 50) {
      mapping[header] = bestMatch;
      usedSystemFields.add(bestMatch);
    }
  });

  return mapping;
}

/**
 * Apply field mapping to transform raw rows into system-field rows
 */
export function applyMapping(rows, mapping) {
  return rows.map((row, index) => {
    const mapped = { _rowIndex: index + 1 };
    SYSTEM_FIELDS.forEach(field => {
      mapped[field.key] = '';
    });

    Object.entries(mapping).forEach(([excelHeader, systemKey]) => {
      if (systemKey && row[excelHeader] !== undefined) {
        mapped[systemKey] = String(row[excelHeader]).trim();
      }
    });

    return mapped;
  });
}

/**
 * Calculate mapping completeness score
 */
export function getMappingScore(mapping) {
  const requiredFields = SYSTEM_FIELDS.filter(f => f.required);
  const mappedSystemKeys = new Set(Object.values(mapping).filter(Boolean));
  const mappedRequired = requiredFields.filter(f => mappedSystemKeys.has(f.key));
  return {
    total: SYSTEM_FIELDS.length,
    mapped: mappedSystemKeys.size,
    requiredTotal: requiredFields.length,
    requiredMapped: mappedRequired.length,
    isComplete: mappedRequired.length === requiredFields.length,
    percentage: Math.round((mappedSystemKeys.size / SYSTEM_FIELDS.length) * 100),
  };
}

/**
 * Serialize mapping for storage (only excelHeader -> systemFieldKey pairs)
 */
export function serializeMapping(mapping, excelHeaders) {
  return { headers: excelHeaders, mapping: { ...mapping } };
}

/**
 * Try to find a saved mapping that matches the current Excel headers
 */
export function findMatchingTemplate(excelHeaders, savedTemplates) {
  const normalize = (h) => String(h).toLowerCase().trim();
  const currentSet = new Set(excelHeaders.map(normalize));

  let bestMatch = null;
  let bestScore = 0;

  savedTemplates.forEach(template => {
    const savedSet = new Set((template.headers || []).map(normalize));
    const intersection = [...currentSet].filter(h => savedSet.has(h));
    const score = intersection.length / Math.max(currentSet.size, savedSet.size);

    if (score > bestScore && score >= 0.7) {
      bestScore = score;
      bestMatch = template;
    }
  });

  return bestMatch;
}
