'use client'

import { useState, useEffect, useCallback } from 'react'

type GamepadButton = 'up' | 'down' | 'left' | 'right' | 'a' | 'b' | 'x' | 'y' | 'start' | 'select' | 'l' | 'r'

const SNES_GAMEPAD_MAP: Record<number, GamepadButton> = {
  12: 'up',
  13: 'down',
  14: 'left',
  15: 'right',
  0: 'b',
  1: 'a',
  3: 'y',
  2: 'x',
  9: 'start',
  8: 'select',
  4: 'l',
  5: 'r',
}

export function useGamepad() {
  const [gamepadIndex, setGamepadIndex] = useState<number | null>(null)
  const [pressedButtons, setPressedButtons] = useState<Set<GamepadButton>>(new Set())

  const handleGamepadConnected = useCallback((e: GamepadEvent) => {
    setGamepadIndex(e.gamepad.index)
  }, [])

  const handleGamepadDisconnected = useCallback(() => {
    setGamepadIndex(null)
    setPressedButtons(new Set())
  }, [])

  useEffect(() => {
    window.addEventListener('gamepadconnected', handleGamepadConnected as EventListener)
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected as EventListener)

    const interval = setInterval(() => {
      if (gamepadIndex === null) return

      const gamepads = navigator.getGamepads()
      const gamepad = gamepads[gamepadIndex]

      if (!gamepad) return

      const pressed = new Set<GamepadButton>()

      gamepad.buttons.forEach((button, index) => {
        if (button.pressed) {
          const mapped = SNES_GAMEPAD_MAP[index]
          if (mapped) pressed.add(mapped)
        }
      })

      setPressedButtons(pressed)
    }, 16)

    return () => {
      window.removeEventListener('gamepadconnected', handleGamepadConnected as EventListener)
      window.removeEventListener('gamepaddisconnected', handleGamepadDisconnected as EventListener)
      clearInterval(interval)
    }
  }, [gamepadIndex, handleGamepadConnected, handleGamepadDisconnected])

  return { gamepadConnected: gamepadIndex !== null, pressedButtons }
}
