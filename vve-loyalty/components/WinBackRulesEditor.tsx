'use client'

import { useState } from 'react'
import { WinBackRule } from '@/lib/supabase'
import { updateVenue } from '@/app/admin/actions'

const TEMPLATES: Omit<WinBackRule, 'id'>[] = [
  {
    inactiveDays: 14,
    subject: 'We miss you!',
    offer: 'A free extra shot of espresso or cookie on us!',
    level: 1,
  },
  {
    inactiveDays: 30,
    subject: 'Free coffee inside!',
    offer: 'Your next flat white is on us.',
    level: 2,
  },
]

export default function WinBackRulesEditor({
  venueId,
  initialRules,
  brandColor,
}: {
  venueId: string
  initialRules: WinBackRule[]
  brandColor: string
}) {
  const [rules, setRules] = useState<WinBackRule[]>(initialRules)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<WinBackRule>>({})
  const [saving, setSaving] = useState(false)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ inactiveDays: 7, subject: '', offer: '' })

  const handleUseTemplate = (template: Omit<WinBackRule, 'id'>) => {
    const newRule: WinBackRule = {
      id: `rule-${Date.now()}`,
      ...template,
    }
    setRules([...rules, newRule])
    setShowCustomForm(false)
  }

  const handleCreateCustom = () => {
    if (!customForm.subject.trim() || !customForm.offer.trim() || customForm.inactiveDays < 1) {
      alert('Please fill in all fields with valid values.')
      return
    }
    const newRule: WinBackRule = {
      id: `rule-${Date.now()}`,
      inactiveDays: customForm.inactiveDays,
      subject: customForm.subject,
      offer: customForm.offer,
      level: Math.max(...rules.map(r => r.level), 0) + 1,
    }
    setRules([...rules, newRule])
    setCustomForm({ inactiveDays: 7, subject: '', offer: '' })
    setShowCustomForm(false)
  }

  const handleEditRule = (rule: WinBackRule) => {
    setEditingRuleId(rule.id)
    setEditForm(rule)
  }

  const handleUpdateRule = () => {
    if (!editingRuleId || !editForm.subject?.trim() || !editForm.offer?.trim()) {
      alert('Please fill in all fields.')
      return
    }
    setRules(rules.map(r => (r.id === editingRuleId ? (editForm as WinBackRule) : r)))
    setEditingRuleId(null)
    setEditForm({})
  }

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId))
  }

  const handleSaveRules = async () => {
    setSaving(true)
    try {
      const success = await updateVenue(venueId, { win_back_rules: rules })
      if (success) {
        alert('Win-back rules saved successfully!')
      } else {
        alert('Failed to save rules.')
      }
    } catch (error) {
      console.error('Error saving rules:', error)
      alert('Error saving rules.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-6">Win-Back Rules</h2>

      {rules.length === 0 ? (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Proposed Strategies</h3>
            <div className="grid gap-4">
              {TEMPLATES.map((template, idx) => (
                <div
                  key={idx}
                  className="border border-gray-300 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">After {template.inactiveDays} days inactive</p>
                      <p className="text-sm text-gray-600 mt-1">
                        <strong>Subject:</strong> {template.subject}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Offer:</strong> {template.offer}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      style={{ backgroundColor: brandColor }}
                      className="px-4 py-2 text-white rounded text-sm whitespace-nowrap ml-4 hover:opacity-90"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            + Create Custom Rule
          </button>

          {showCustomForm && (
            <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              <h4 className="font-semibold mb-3">Custom Rule</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Days Inactive</label>
                  <input
                    type="number"
                    min="1"
                    value={customForm.inactiveDays}
                    onChange={e => setCustomForm({ ...customForm, inactiveDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={customForm.subject}
                    onChange={e => setCustomForm({ ...customForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., Come back soon!"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Offer Text</label>
                  <textarea
                    value={customForm.offer}
                    onChange={e => setCustomForm({ ...customForm, offer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., Your next coffee is 50% off!"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCustom}
                    style={{ backgroundColor: brandColor }}
                    className="px-4 py-2 text-white rounded text-sm hover:opacity-90"
                  >
                    Add Rule
                  </button>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map(rule => (
            <div key={rule.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
              {editingRuleId === rule.id ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Days Inactive</label>
                    <input
                      type="number"
                      min="1"
                      value={editForm.inactiveDays || 0}
                      onChange={e => setEditForm({ ...editForm, inactiveDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email Subject</label>
                    <input
                      type="text"
                      value={editForm.subject || ''}
                      onChange={e => setEditForm({ ...editForm, subject: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Offer Text</label>
                    <textarea
                      value={editForm.offer || ''}
                      onChange={e => setEditForm({ ...editForm, offer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdateRule}
                      style={{ backgroundColor: brandColor }}
                      className="px-3 py-1 text-white rounded text-sm hover:opacity-90"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingRuleId(null)}
                      className="px-3 py-1 text-gray-700 border border-gray-300 rounded text-sm hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">After {rule.inactiveDays} days inactive</p>
                    <p className="text-sm text-gray-600 mt-1">
                      <strong>Subject:</strong> {rule.subject}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Offer:</strong> {rule.offer}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="px-3 py-1 text-blue-600 border border-blue-300 rounded text-sm hover:bg-blue-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="px-3 py-1 text-red-600 border border-red-300 rounded text-sm hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="text-blue-600 hover:text-blue-700 font-semibold text-sm mt-4"
          >
            + Add Another Rule
          </button>

          {showCustomForm && (
            <div className="border border-gray-300 rounded-lg p-4 bg-white">
              <h4 className="font-semibold mb-3">Custom Rule</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Days Inactive</label>
                  <input
                    type="number"
                    min="1"
                    value={customForm.inactiveDays}
                    onChange={e => setCustomForm({ ...customForm, inactiveDays: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={customForm.subject}
                    onChange={e => setCustomForm({ ...customForm, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., Come back soon!"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Offer Text</label>
                  <textarea
                    value={customForm.offer}
                    onChange={e => setCustomForm({ ...customForm, offer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    placeholder="e.g., Your next coffee is 50% off!"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreateCustom}
                    style={{ backgroundColor: brandColor }}
                    className="px-4 py-2 text-white rounded text-sm hover:opacity-90"
                  >
                    Add Rule
                  </button>
                  <button
                    onClick={() => setShowCustomForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded text-sm hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSaveRules}
            disabled={saving}
            style={{ backgroundColor: saving ? '#ccc' : brandColor }}
            className="w-full px-4 py-2 text-white rounded font-semibold hover:opacity-90 mt-6"
          >
            {saving ? 'Saving...' : 'Save Rules'}
          </button>
        </div>
      )}
    </div>
  )
}
