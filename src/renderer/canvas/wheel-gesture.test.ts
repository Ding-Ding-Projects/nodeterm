import { describe, expect, it } from 'vitest'
import { TrackpadWheelGestureRouter, trackpadRoutingEnabled } from './wheel-gesture'

const gesture = (
  deltaY: number,
  o: Partial<{
    deltaX: number
    deltaMode: number
    ctrlKey: boolean
    metaKey: boolean
    wheelDeltaY: number
  }> = {}
) => ({
  deltaY,
  deltaX: o.deltaX ?? 0,
  deltaMode: o.deltaMode ?? 0,
  ctrlKey: o.ctrlKey ?? false,
  metaKey: o.metaKey ?? false,
  wheelDeltaY: o.wheelDeltaY
})

const yes = () => true
const no = () => false

describe('TrackpadWheelGestureRouter', () => {
  it('keeps a notched mouse wheel on the user-configured zoom path', () => {
    const router = new TrackpadWheelGestureRouter()
    expect(router.shouldPan(gesture(100, { wheelDeltaY: -120 }), 1000)).toBe(false)
    expect(router.shouldPan(gesture(-100, { wheelDeltaY: 120 }), 1100)).toBe(false)
  })

  it('routes smooth two-finger trackpad scroll and its momentum to panning', () => {
    const router = new TrackpadWheelGestureRouter()
    expect(router.shouldPan(gesture(6.25), 1000)).toBe(true)
    expect(router.shouldPan(gesture(75), 1080)).toBe(true)
    expect(router.shouldPan(gesture(75), 1700)).toBe(false)
  })

  it('does not reclassify a quantized packet in an active trackpad gesture as mouse zoom', () => {
    const router = new TrackpadWheelGestureRouter()
    expect(router.shouldPan(gesture(4.5), 1000)).toBe(true)
    expect(router.shouldPan(gesture(100, { wheelDeltaY: -120 }), 1150)).toBe(true)
    expect(router.shouldPan(gesture(70), 1500)).toBe(true)
  })

  it('keeps trackpad scrolling native over terminal and other native scroll surfaces', () => {
    const router = new TrackpadWheelGestureRouter()
    expect(router.destination(gesture(6.25), yes, 1000)).toBe('native')
    expect(router.destination(gesture(6.25), no, 1400)).toBe('flow-pan')
    expect(router.destination(gesture(100, { wheelDeltaY: -120 }), yes, 1800)).toBe('native')
  })

  it('does not pan over a non-terminal native scroller, and still knows the gesture is a trackpad', () => {
    const router = new TrackpadWheelGestureRouter()
    // A trackpad gesture that begins over Monaco / a markdown pane scrolls THAT surface...
    expect(router.destination(gesture(6.25), yes, 1000)).toBe('native')
    // ...but the packet still classified the device, so continuing the same gesture off the
    // scroller pans the canvas instead of falling back to the mouse-notch (zoom) path.
    expect(router.destination(gesture(75), no, 1100)).toBe('flow-pan')
  })

  it('disables trackpad routing when the escape hatch is engaged', () => {
    // trackpadPan is the explicit escape hatch: disabling it leaves the router inactive while
    // preserving the setting's ordinary wheel-zoom path.
    expect(trackpadRoutingEnabled(true)).toBe(true)
    expect(trackpadRoutingEnabled(false)).toBe(false)

    // A precise-pixel mouse can emit the same events as a trackpad. The router remains ready to
    // classify those events, while this setting decides whether Canvas invokes it.
    expect(trackpadRoutingEnabled(false)).toBe(false)
  })

  it('keeps pinch, modifier-wheel, line-mode wheel, and other non-pixel input off the override', () => {
    const router = new TrackpadWheelGestureRouter()
    expect(router.shouldPan(gesture(5, { ctrlKey: true }), 1000)).toBe(false)
    expect(router.shouldPan(gesture(5, { metaKey: true }), 1000)).toBe(false)
    expect(router.shouldPan(gesture(3, { deltaMode: 1 }), 1000)).toBe(false)
    expect(router.shouldPan(gesture(5), 1000)).toBe(true)
  })
})
