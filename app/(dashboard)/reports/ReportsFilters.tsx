'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  period: string
  dateFrom: string
  dateTo: string
  eventId: string
  status: string
  minRate: string
  allEvents: { id: string; name: string }[]
}

export default function ReportsFilters({
  period: initPeriod,
  dateFrom: initFrom,
  dateTo: initTo,
  eventId: initEventId,
  status: initStatus,
  minRate: initMinRate,
  allEvents,
}: Props) {
  const router = useRouter()
  const [period, setPeriod] = useState(initPeriod)
  const [dateFrom, setDateFrom] = useState(initFrom)
  const [dateTo, setDateTo] = useState(initTo)
  const [eventId, setEventId] = useState(initEventId)
  const [status, setStatus] = useState(initStatus)
  const [minRate, setMinRate] = useState(initMinRate)

  // When a date is entered, auto-switch period to custom
  useEffect(() => {
    if ((dateFrom || dateTo) && period !== 'custom') {
      setPeriod('custom')
    }
  }, [dateFrom, dateTo]) // eslint-disable-line react-hooks/exhaustive-deps

  // When period changes away from custom, clear dates
  function handlePeriodChange(val: string) {
    setPeriod(val)
    if (val !== 'custom') {
      setDateFrom('')
      setDateTo('')
    }
  }

  function handleApply(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    params.set('period', period)
    if (period === 'custom') {
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
    }
    if (eventId && eventId !== 'all') params.set('eventId', eventId)
    if (status && status !== 'all') params.set('status', status)
    if (minRate && minRate !== '0') params.set('minRate', minRate)
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <form onSubmit={handleApply} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[6px] p-5 mb-8 space-y-4">
      {/* Row 1: Period + date range */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Period</label>
          <select
            value={period}
            onChange={e => handlePeriodChange(e.target.value)}
            className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
          >
            <option value="all_time">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] disabled:opacity-40"
            disabled={period !== 'custom' && !dateFrom}
          />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] disabled:opacity-40"
            disabled={period !== 'custom' && !dateTo}
          />
        </div>
      </div>

      {/* Row 2: Event, Status, Min Rate, Apply */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Event</label>
          <select
            value={eventId}
            onChange={e => setEventId(e.target.value)}
            className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000] max-w-[200px]"
          >
            <option value="all">All Events</option>
            {allEvents.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1">Min Attendance %</label>
          <input
            type="number"
            min="0"
            max="100"
            value={minRate}
            onChange={e => setMinRate(e.target.value)}
            className="w-24 bg-[#0D0D0D] border border-[#2A2A2A] rounded-[6px] px-3 py-2 text-white text-sm focus:outline-none focus:border-[#800000]"
          />
        </div>
        <button
          type="submit"
          className="bg-[#800000] hover:bg-[#6B0000] text-white text-sm font-medium px-5 py-2 rounded-[6px] transition-colors"
        >
          Apply
        </button>
      </div>
    </form>
  )
}
