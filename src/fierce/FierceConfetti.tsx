import { useEffect, useRef } from 'react'

interface ConfettiPiece {
  cl: number      // left percent
  cx: number      // x drift in px
  cr: number      // rotation deg
  cd: number      // duration s
  cdelay: number  // delay s
  cw: number      // width
  ch: number      // height
  radius: string
  color: string
}

const colors = ['#ff3030', '#ff7a18', '#facc15', '#06d6f4', '#84cc16', '#ec4899']

function makeBatch(count: number, stageWidth: number): ConfettiPiece[] {
  const out: ConfettiPiece[] = []
  for (let i = 0; i < count; i++) {
    out.push({
      cl: Math.random() * 100,
      cx: (Math.random() - 0.5) * stageWidth * 0.8,
      cr: Math.random() * 720 - 360,
      cd: 2.2 + Math.random() * 2.4,
      cdelay: Math.random() * 0.6,
      cw: 6 + Math.random() * 8,
      ch: 8 + Math.random() * 14,
      radius: Math.random() > 0.5 ? '2px' : '50%',
      color: colors[i % colors.length],
    })
  }
  return out
}

interface Props {
  show: boolean
  count?: number
}

export default function FierceConfetti({ show, count = 80 }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!show || !stageRef.current) return
    const stage = stageRef.current
    const fire = () => {
      stage.innerHTML = ''
      const w = stage.clientWidth || window.innerWidth
      const pieces = makeBatch(count, w)
      pieces.forEach((p) => {
        const el = document.createElement('span')
        el.className = 'fierce-confetti-piece'
        el.style.cssText = [
          `--cl:${p.cl}%`,
          `--cx:${p.cx}px`,
          `--cr:${p.cr}deg`,
          `--cd:${p.cd}s`,
          `--cdelay:${p.cdelay}s`,
          `--cw:${p.cw}px`,
          `--ch:${p.ch}px`,
          `--cradius:${p.radius}`,
          `--cb:${p.color}`,
        ].join(';')
        stage.appendChild(el)
      })
    }
    fire()
    return () => {
      if (stage) stage.innerHTML = ''
    }
  }, [show, count])

  if (!show) return null
  return <div className="fierce-confetti-stage" ref={stageRef} aria-hidden="true" />
}
