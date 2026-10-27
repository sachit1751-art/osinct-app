import { useEffect, useRef, useCallback } from 'react'
import gsap from 'gsap'

export function useWorkspaceAnimations() {
  const topbarRef = useRef<HTMLElement | null>(null)
  const introRef = useRef<HTMLElement | null>(null)
  const searchCardRef = useRef<HTMLElement | null>(null)
  const resultsRef = useRef<HTMLElement | null>(null)
  const adminPanelRef = useRef<HTMLElement | null>(null)

  // 1. Cinematic Workspace Entrance Sequence on Mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      if (topbarRef.current) {
        tl.fromTo(
          topbarRef.current,
          { y: -16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6 },
        )
      }

      if (introRef.current) {
        tl.fromTo(
          introRef.current,
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.65 },
          '-=0.35',
        )
      }

      if (searchCardRef.current) {
        tl.fromTo(
          searchCardRef.current,
          { y: 22, opacity: 0, scale: 0.985 },
          { y: 0, opacity: 1, scale: 1, duration: 0.75, ease: 'expo.out' },
          '-=0.4',
        )
      }
    })

    return () => ctx.revert()
  }, [])

  // 2. Cursor Depth Parallax & Radial Spotlight for the Search Card
  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const card = searchCardRef.current
    if (!card) return

    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // Update CSS variables for radial spotlight border
    card.style.setProperty('--mouse-x', `${x}px`)
    card.style.setProperty('--mouse-y', `${y}px`)

    // Subtle 3D tilt with smooth easing
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -1.8
    const rotateY = ((x - centerX) / centerX) * 1.8

    gsap.to(card, {
      rotateX,
      rotateY,
      transformPerspective: 1000,
      duration: 0.35,
      ease: 'power2.out',
    })
  }, [])

  const handleCardMouseLeave = useCallback(() => {
    const card = searchCardRef.current
    if (!card) return

    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.6,
      ease: 'power3.out',
    })
  }, [])

  // 3. Staggered Results Entrance Animation when Response changes
  const animateResultsChange = useCallback(() => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (!resultsRef.current) return

    gsap.fromTo(
      resultsRef.current,
      { opacity: 0, y: 16, filter: 'blur(5px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, ease: 'power3.out' },
    )
  }, [])

  // 4. Admin Panel Accordion Fold Transition
  const animateAdminToggle = useCallback((isOpen: boolean) => {
    if (typeof window === 'undefined') return
    if (!adminPanelRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    if (isOpen) {
      gsap.fromTo(
        adminPanelRef.current,
        { height: 0, opacity: 0, y: -10 },
        { height: 'auto', opacity: 1, y: 0, duration: 0.5, ease: 'expo.out' },
      )
    }
  }, [])

  return {
    topbarRef,
    introRef,
    searchCardRef,
    resultsRef,
    adminPanelRef,
    handleCardMouseMove,
    handleCardMouseLeave,
    animateResultsChange,
    animateAdminToggle,
  }
}
