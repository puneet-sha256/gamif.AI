interface FierceLogoProps {
  size?: 'sm' | 'lg'
}

export default function FierceLogo({ size = 'sm' }: FierceLogoProps) {
  const className = size === 'lg' ? 'fierce-brand fierce-brand--lg' : 'fierce-brand'
  return (
    <div className={className}>
      <div className="fierce-brand__mark">G</div>
      <span className="fierce-brand__name">Gamif.AI</span>
    </div>
  )
}
