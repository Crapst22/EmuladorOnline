'use client'

import { useState, useEffect } from 'react'

export function useGamepad() {
  const [gamepadConnected, setGamepadConnected] = useState(false)

  useEffect(() => {
    const onConnect = () => setGamepadConnected(true)
    const onDisconnect = () => {
      const gamepads = navigator.getGamepads()
      const anyConnected = Array.from(gamepads).some(g => g !== null)
      setGamepadConnected(anyConnected)
    }

    window.addEventListener('gamepadconnected', onConnect)
    window.addEventListener('gamepaddisconnected', onDisconnect)

    const gamepads = navigator.getGamepads()
    if (gamepads && Array.from(gamepads).some(g => g !== null)) {
      setGamepadConnected(true)
    }

    return () => {
      window.removeEventListener('gamepadconnected', onConnect)
      window.removeEventListener('gamepaddisconnected', onDisconnect)
    }
  }, [])

  return { gamepadConnected }
}
