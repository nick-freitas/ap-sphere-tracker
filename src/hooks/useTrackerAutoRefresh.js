import { useState, useEffect, useRef, useCallback } from 'react'
import { parseTrackerLog } from '../parsers/trackerParser'

const REFRESH_INTERVAL = 60000
const CORS_PROXY = 'https://corsproxy.io/?'

export function useTrackerAutoRefresh(url) {
  const [checkedLocations, setCheckedLocations] = useState(new Map())
  const [status, setStatus] = useState(null)
  const [usingProxy, setUsingProxy] = useState(false)
  const intervalRef = useRef(null)
  const countdownRef = useRef(null)
  const [countdown, setCountdown] = useState(null)

  const fetchTracker = useCallback(async () => {
    if (!url) return

    try {
      let response
      const fetchUrl = usingProxy ? `${CORS_PROXY}${encodeURIComponent(url)}` : url

      try {
        response = await fetch(fetchUrl)
      } catch (err) {
        if (!usingProxy) {
          setUsingProxy(true)
          response = await fetch(`${CORS_PROXY}${encodeURIComponent(url)}`)
        } else {
          throw err
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const text = await response.text()
      const parsed = parseTrackerLog(text)
      setCheckedLocations(parsed)
      setStatus({
        lastFetch: new Date().toLocaleTimeString(),
        usingProxy,
        error: null,
      })
      setCountdown(60)
    } catch (err) {
      setStatus((prev) => ({
        ...prev,
        error: err.message,
      }))
    }
  }, [url, usingProxy])

  useEffect(() => {
    if (!url) {
      setStatus(null)
      setCountdown(null)
      return
    }

    fetchTracker()

    intervalRef.current = setInterval(fetchTracker, REFRESH_INTERVAL)

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => (prev !== null && prev > 0 ? prev - 1 : 60))
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countdownRef.current)
    }
  }, [url, fetchTracker])

  const statusWithCountdown = status
    ? { ...status, nextRefresh: countdown }
    : null

  return { checkedLocations, status: statusWithCountdown }
}
