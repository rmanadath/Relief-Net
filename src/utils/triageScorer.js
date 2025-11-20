/**
 * Triage Score Calculator
 * Calculates priority score based on urgency, vulnerability, and request age
 * Higher score = more urgent = should be handled first
 */

/**
 * Calculate triage score for a request
 * @param {Object} request - Request object with priority, created_at, etc.
 * @returns {number} Triage score (higher = more urgent)
 */
export function calculateTriageScore(request) {
  // Priority weights (higher priority = higher weight)
  const priorityWeights = {
    'urgent': 10,
    'high': 7,
    'medium': 4,
    'low': 1
  };

  // Get priority score
  const priorityScore = priorityWeights[request.priority] || priorityWeights['medium'];

  // Calculate age in hours
  const requestDate = new Date(request.created_at || request.timestamp);
  const now = new Date();
  const ageInHours = (now - requestDate) / (1000 * 60 * 60);
  
  // Age score: older requests get higher score (max 5 points)
  // Requests older than 10 hours get max age score
  const ageScore = Math.min(ageInHours * 0.5, 5);

  // Aid type urgency (some types are more critical)
  const aidTypeWeights = {
    'medicine': 3,
    'shelter': 2.5,
    'food': 2,
    'clothing': 1,
    'transportation': 1.5,
    'other': 1
  };
  const typeScore = aidTypeWeights[request.aid_type] || 1;

  // Vulnerability factor (if available in future)
  // For now, assume all requests have same vulnerability
  const vulnerabilityScore = 1;

  // Calculate total triage score
  // Formula: (priority * type) + age + vulnerability
  const triageScore = (priorityScore * typeScore) + ageScore + vulnerabilityScore;

  return Math.round(triageScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Sort requests by triage score (highest first)
 * @param {Array} requests - Array of request objects
 * @returns {Array} Sorted requests with triage scores
 */
export function sortByTriageScore(requests) {
  return requests
    .map(request => ({
      ...request,
      triageScore: calculateTriageScore(request)
    }))
    .sort((a, b) => b.triageScore - a.triageScore); // Descending order
}

/**
 * Get triage score category
 * @param {number} score - Triage score
 * @returns {string} Category: 'critical', 'high', 'medium', 'low'
 */
export function getTriageCategory(score) {
  if (score >= 20) return 'critical';
  if (score >= 15) return 'high';
  if (score >= 10) return 'medium';
  return 'low';
}

/**
 * Get color for triage score
 * @param {number} score - Triage score
 * @returns {string} Tailwind color class
 */
export function getTriageColor(score) {
  if (score >= 20) return 'bg-red-500';
  if (score >= 15) return 'bg-orange-500';
  if (score >= 10) return 'bg-yellow-500';
  return 'bg-green-500';
}
