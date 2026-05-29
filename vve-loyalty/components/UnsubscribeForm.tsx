'use client'

import { useState, useTransition, useRef } from 'react'
import { savePreferenceAction, deleteAccountAction } from '@/app/unsubscribe/actions'
import type { SubscriptionPreference } from '@/lib/supabase'

type Props = {
  uniqueId: string
  signature: string
  currentPreference: SubscriptionPreference
  customerName: string
  customerEmail: string
  stampCount: number
  totalStamps: number
  venueName: string
  brandColor: string
  logoUrl: string | null
}

const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif'

export default function UnsubscribeForm({
  uniqueId,
  signature,
  currentPreference,
  customerName,
  customerEmail,
  stampCount,
  totalStamps,
  venueName,
  brandColor,
  logoUrl,
}: Props) {
  const [preference, setPreference] = useState<SubscriptionPreference>(currentPreference)
  const [confirmedPreference, setConfirmedPreference] = useState<SubscriptionPreference | null>(null)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [isSaving, startSaving] = useTransition()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)
  const [isDeleted, setIsDeleted] = useState(false)
  const [isDeleting, startDeleting] = useTransition()
  const cancelBtnRef = useRef<HTMLButtonElement>(null)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveErr(null)
    const formData = new FormData()
    formData.set('preference', preference)
    startSaving(async () => {
      const res = await savePreferenceAction(uniqueId, signature, null, formData)
      if (res && 'success' in res && res.success) {
        setConfirmedPreference(res.preference)
      } else if (res && 'error' in res) {
        setSaveErr(res.error ?? 'Something went wrong.')
      }
    })
  }

  function handleDelete() {
    setDeleteErr(null)
    startDeleting(async () => {
      const res = await deleteAccountAction(uniqueId, signature, null, new FormData())
      if (res && 'success' in res && res.success) {
        setIsDeleted(true)
        setShowDeleteModal(false)
      } else if (res && 'error' in res) {
        setDeleteErr(res.error ?? 'Something went wrong.')
      }
    })
  }

  if (isDeleted) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={checkmarkStyle(brandColor)}>✓</div>
            <h1 style={titleStyle}>Your data has been deleted</h1>
            <p style={{ ...bodyText, marginTop: 12 }}>
              Your loyalty card and all associated data have been permanently removed from {venueName}.
            </p>
            <p style={{ ...bodyText, marginTop: 8, color: '#888' }}>
              You will not receive any further emails.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (confirmedPreference) {
    const successCopy =
      confirmedPreference === 'all'
        ? `You'll keep getting stamp updates and special offers from ${venueName}.`
        : confirmedPreference === 'transactional_only'
          ? `You'll still hear from us when you earn a stamp. We'll miss sending you the offers.`
          : `We won't email you again. Your loyalty card with ${stampCount} stamp${stampCount === 1 ? '' : 's'} still works at ${venueName} — just show it at the till as usual.`

    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={checkmarkStyle(brandColor)}>✓</div>
            <h1 style={titleStyle}>Changes saved</h1>
            <p style={{ ...bodyText, marginTop: 12, color: '#444' }}>{successCopy}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {logoUrl && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <img src={logoUrl} alt={venueName} style={{ maxWidth: 80, maxHeight: 80, display: 'inline-block' }} />
          </div>
        )}

        <h1 style={titleStyle}>Email preferences</h1>
        <p style={{ ...bodyText, textAlign: 'center', margin: '8px 0 0' }}>
          for {customerName}
        </p>
        <p style={{ ...bodyText, textAlign: 'center', margin: '4px 0 24px', color: '#999', fontSize: 13 }}>
          {customerEmail} · {venueName}
        </p>

        <form onSubmit={handleSave}>
          <Choice
            value="all"
            current={preference}
            onChange={setPreference}
            brandColor={brandColor}
            label="Everything"
            description="Stamp updates when you earn a stamp, plus exclusive offers and surprise rewards."
          />
          <Choice
            value="transactional_only"
            current={preference}
            onChange={setPreference}
            brandColor={brandColor}
            label="Stamp updates only"
            description="You'll still get emails when you earn a stamp, but you'll lose out on exclusive offers and surprise gifts."
          />
          <Choice
            value="none"
            current={preference}
            onChange={setPreference}
            brandColor={brandColor}
            label="No emails (silent card)"
            description="Your loyalty card still works at the till. But you'll lose every stamp update, exclusive offers, and surprise gifts."
          />

          {saveErr && (
            <p style={{ ...bodyText, color: '#dc2626', textAlign: 'center', margin: '16px 0 0' }}>{saveErr}</p>
          )}

          <button
            type="submit"
            disabled={isSaving || preference === currentPreference}
            style={{
              width: '100%',
              marginTop: 20,
              padding: '14px 20px',
              background: preference === currentPreference ? '#cccccc' : brandColor,
              color: '#ffffff',
              border: 'none',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 600,
              cursor: preference === currentPreference || isSaving ? 'not-allowed' : 'pointer',
              fontFamily: fontStack,
            }}
          >
            {isSaving ? 'Saving...' : 'Save preferences'}
          </button>
        </form>

        <div style={{ borderTop: '1px solid #eeeeee', marginTop: 32, paddingTop: 24, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => {
              setDeleteErr(null)
              setShowDeleteModal(true)
              setTimeout(() => cancelBtnRef.current?.focus(), 0)
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#999999',
              fontSize: 13,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontFamily: fontStack,
            }}
          >
            Delete my loyalty card and all data
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div
          onClick={() => !isDeleting && setShowDeleteModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, zIndex: 100,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff', borderRadius: 16, padding: 28,
              maxWidth: 420, width: '100%', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                Delete your loyalty card?
              </h2>
            </div>
            <p style={{ ...bodyText, margin: '0 0 12px' }}>This will permanently delete:</p>
            <ul style={{ ...bodyText, margin: '0 0 16px', paddingLeft: 20 }}>
              <li>Your loyalty card</li>
              <li>All stamps ({stampCount} / {totalStamps})</li>
              <li>Your email from our system</li>
            </ul>
            <p style={{ ...bodyText, margin: '0 0 20px', color: '#666' }}>
              You will lose your progress toward the next reward. This cannot be undone.
            </p>

            {deleteErr && (
              <p style={{ ...bodyText, color: '#dc2626', textAlign: 'center', margin: '0 0 12px' }}>{deleteErr}</p>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                ref={cancelBtnRef}
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '12px 16px', background: '#f0f0f0',
                  color: '#1a1a1a', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: fontStack,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  flex: 1, padding: '12px 16px', background: '#dc2626',
                  color: '#ffffff', border: 'none', borderRadius: 10,
                  fontSize: 14, fontWeight: 600, cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontFamily: fontStack,
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Choice({
  value,
  current,
  onChange,
  brandColor,
  label,
  description,
}: {
  value: SubscriptionPreference
  current: SubscriptionPreference
  onChange: (v: SubscriptionPreference) => void
  brandColor: string
  label: string
  description: string
}) {
  const selected = current === value
  return (
    <label
      style={{
        display: 'block',
        padding: 16,
        marginBottom: 10,
        background: selected ? `${brandColor}10` : '#fafafa',
        border: `2px solid ${selected ? brandColor : '#eeeeee'}`,
        borderRadius: 12,
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <input
          type="radio"
          name="preference"
          value={value}
          checked={selected}
          onChange={() => onChange(value)}
          style={{ marginTop: 4, accentColor: brandColor, cursor: 'pointer' }}
        />
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>{label}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2, lineHeight: 1.4 }}>{description}</div>
        </div>
      </div>
    </label>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#f5f5f5',
  padding: '40px 16px',
  fontFamily: fontStack,
}

const cardStyle: React.CSSProperties = {
  maxWidth: 480,
  margin: '0 auto',
  background: '#ffffff',
  borderRadius: 16,
  padding: 32,
  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
}

const titleStyle: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: '#1a1a1a',
  margin: 0,
  textAlign: 'center',
}

const bodyText: React.CSSProperties = {
  fontSize: 14,
  color: '#1a1a1a',
  margin: 0,
  lineHeight: 1.5,
}

function checkmarkStyle(brandColor: string): React.CSSProperties {
  return {
    width: 56,
    height: 56,
    lineHeight: '56px',
    fontSize: 28,
    fontWeight: 700,
    color: '#ffffff',
    background: brandColor,
    borderRadius: '50%',
    margin: '0 auto 16px',
    textAlign: 'center',
  }
}
