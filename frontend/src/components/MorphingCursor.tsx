import React, { useEffect, useRef } from 'react'

export function MorphingCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (
      !window.matchMedia('(pointer: fine)').matches ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return

    const cursor = cursorRef.current
    const dot = dotRef.current
    if (!cursor || !dot) return

    let mouseX = -100
    let mouseY = -100
    let isHovering = false
    let isMouseDown = false
    let currentTarget: HTMLElement | null = null
    let transitionTimeout: ReturnType<typeof setTimeout> | null = null
    let hasMoved = false

    const setFreeStyle = () => {
      cursor.style.transition =
        'width 0.1s cubic-bezier(0.16, 1, 0.3, 1), height 0.1s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.1s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
      cursor.style.width = '14px'
      cursor.style.height = '14px'
      cursor.style.borderRadius = '50%'
      cursor.style.background = 'rgba(var(--accent-rgb), 0.25)'
      cursor.style.border = '1.5px solid var(--accent)'
      cursor.style.boxShadow = '0 0 12px rgba(var(--accent-rgb), 0.6)'
      cursor.style.backdropFilter = 'none'
      cursor.style.setProperty('-webkit-backdrop-filter', 'none')
      dot.style.opacity = '1'
    }

    const setMorphedStyle = (target: HTMLElement) => {
      const rect = target.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) return

      const computed = window.getComputedStyle(target)
      const isSmall = rect.width < 34 || rect.height < 34
      const pad = isSmall ? 3 : 4
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const w = rect.width + pad * 2
      const h = rect.height + pad * 2

      let radius = computed.borderRadius
      if (!radius || radius === '0px') {
        radius = '8px'
      } else if (radius.includes('%') || radius.includes('999')) {
        radius = '999px'
      } else {
        const val = parseFloat(radius)
        if (!isNaN(val)) radius = `${val + pad}px`
      }

      cursor.style.transition =
        'transform 0.16s cubic-bezier(0.16, 1, 0.3, 1), width 0.18s cubic-bezier(0.16, 1, 0.3, 1), height 0.18s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.18s ease, background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease'
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)${isMouseDown ? ' scale(0.96)' : ''}`
      cursor.style.width = `${w}px`
      cursor.style.height = `${h}px`
      cursor.style.borderRadius = radius
      cursor.style.background = 'rgba(var(--accent-rgb), 0.12)'
      cursor.style.border = '1.5px solid rgba(var(--accent-rgb), 0.85)'
      cursor.style.boxShadow = '0 0 18px rgba(var(--accent-rgb), 0.45)'
      cursor.style.backdropFilter = 'none'
      cursor.style.setProperty('-webkit-backdrop-filter', 'none')
      dot.style.opacity = '0'
    }

    const findInteractive = (el: HTMLElement | null): HTMLElement | null => {
      if (!el || el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
        return null

      const target = el.closest<HTMLElement>(
        'button, a, select, [role="button"], [role="combobox"], [data-href], .screenshot-thumb, .character-card, .timeline-card, .interactive-target, [style*="cursor: pointer"], [style*="cursor:pointer"], [style*="cursor: zoom-in"], [style*="cursor:zoom-in"]'
      )

      if (target) {
        if (
          target.classList.contains('modal-shell') ||
          target.classList.contains('modal-unified-scroll')
        ) {
          return null
        }
        const rect = target.getBoundingClientRect()
        if (rect.width > 560 && rect.height > 220) {
          return null
        }
        return target
      }

      return null
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY

      const targetEl = e.target as HTMLElement | null

      if (
        targetEl &&
        (targetEl.tagName === 'TEXTAREA' || targetEl.tagName === 'INPUT')
      ) {
        cursor.style.opacity = '0'
        return
      }

      if (!hasMoved) {
        hasMoved = true
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
        cursor.style.opacity = '1'
        setFreeStyle()
        return
      }

      cursor.style.opacity = '1'

      const interactive = findInteractive(targetEl)

      if (interactive) {
        if (!isHovering || currentTarget !== interactive) {
          isHovering = true
          currentTarget = interactive
          if (transitionTimeout) clearTimeout(transitionTimeout)
          setMorphedStyle(interactive)
        }
      } else {
        if (isHovering) {
          isHovering = false
          currentTarget = null
          cursor.style.transition =
            'width 0.1s cubic-bezier(0.16, 1, 0.3, 1), height 0.1s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.1s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease'
          cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)${isMouseDown ? ' scale(0.7)' : ''}`
          setFreeStyle()
        } else {
          cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)${isMouseDown ? ' scale(0.7)' : ''}`
        }
      }
    }

    const onMouseDown = () => {
      isMouseDown = true
      if (isHovering && currentTarget) {
        setMorphedStyle(currentTarget)
      } else {
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) scale(0.7)`
      }
    }

    const onMouseUp = () => {
      isMouseDown = false
      if (isHovering && currentTarget) {
        setMorphedStyle(currentTarget)
      } else {
        cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
      }
    }

    const onMouseLeave = () => {
      cursor.style.opacity = '0'
    }

    const onMouseEnter = () => {
      cursor.style.opacity = '1'
    }

    const onScroll = () => {
      if (isHovering && currentTarget) {
        const rect = currentTarget.getBoundingClientRect()
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          isHovering = false
          currentTarget = null
          setFreeStyle()
          cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`
        } else {
          setMorphedStyle(currentTarget)
        }
      }
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mousedown', onMouseDown, { passive: true })
    window.addEventListener('mouseup', onMouseUp, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)
    document.addEventListener('mouseenter', onMouseEnter)
    window.addEventListener('scroll', onScroll, {
      passive: true,
      capture: true,
    })

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mouseleave', onMouseLeave)
      document.removeEventListener('mouseenter', onMouseEnter)
      window.removeEventListener('scroll', onScroll, { capture: true })
    }
  }, [])

  return (
    <>
      {/* Outer Magnet Ring / Box */}
      <div
        ref={cursorRef}
        className="custom-cursor-magnet"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99998,
          opacity: 0,
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
          willChange: 'transform, width, height, border-radius',
        }}
      />

      {/* Central Exact Click Point Dot */}
      <div
        ref={dotRef}
        className="custom-cursor-dot"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          zIndex: 99999,
          opacity: 0,
          width: 4,
          height: 4,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 0 6px #ffffff',
          transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
          transition: 'opacity 0.15s ease',
          willChange: 'transform, opacity',
        }}
      />
    </>
  )
}
