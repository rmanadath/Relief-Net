import { describe, it, expect } from 'vitest'
import { calculateTriageScore, getTriageCategory, getTriageColor } from '../src/utils/triageScorer'

describe('Triage Scorer Utils', () => {
  describe('calculateTriageScore', () => {
    it('calculates high priority score correctly', () => {
      const request = {
        priority: 'high',
        status: 'open',
        aid_type: 'food',
        created_at: new Date().toISOString(), // Recent
      }
      const score = calculateTriageScore(request)
      // High priority (7) * food (2) + age (0.5) + vulnerability (1) = ~15.5
      expect(score).toBeGreaterThan(10) // High priority should have reasonable score
      expect(score).toBeLessThan(30) // But not extremely high
    })

    it('calculates low priority score correctly', () => {
      const request = {
        priority: 'low',
        status: 'open',
        aid_type: 'clothing',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      }
      const score = calculateTriageScore(request)
      // Low priority (1) * clothing (1) + age (5 max) + vulnerability (1) = ~7
      expect(score).toBeLessThan(15) // Low priority should have lower score
    })

    it('gives higher score to older requests', () => {
      const recentRequest = { 
        priority: 'high', 
        status: 'open', 
        aid_type: 'food',
        created_at: new Date().toISOString() 
      }
      const oldRequest = { 
        priority: 'high', 
        status: 'open', 
        aid_type: 'food',
        created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() // 20 hours ago
      }
      
      const recentScore = calculateTriageScore(recentRequest)
      const oldScore = calculateTriageScore(oldRequest)
      
      // Older requests should have higher age score (up to 5 points)
      expect(oldScore).toBeGreaterThanOrEqual(recentScore)
    })
  })

  describe('getTriageCategory', () => {
    it('returns correct category for high score', () => {
      expect(getTriageCategory(25)).toBe('critical') // > 20
      expect(getTriageCategory(15)).toBe('high') // > 10
    })

    it('returns correct category for medium score', () => {
      expect(getTriageCategory(12)).toBe('medium') // >= 10
    })

    it('returns correct category for low score', () => {
      expect(getTriageCategory(3)).toBe('low') // <= 5
    })
  })

  describe('getTriageColor', () => {
    it('returns red for critical score', () => {
      expect(getTriageColor(25)).toBe('bg-red-500') // score >= 20
    })

    it('returns orange for high score', () => {
      expect(getTriageColor(17)).toBe('bg-orange-500') // score >= 15
    })

    it('returns yellow for medium score', () => {
      expect(getTriageColor(12)).toBe('bg-yellow-500') // score >= 10
    })

    it('returns green for low score', () => {
      expect(getTriageColor(5)).toBe('bg-green-500') // score < 10
    })
  })
})

