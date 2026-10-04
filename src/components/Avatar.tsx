import { COLORS, clientPhotos, initials } from '../lib/utils'

export interface AvatarClient {
  id?: string
  name?: string
  tone?: number
}

export function Avatar({
  client,
  cls = '',
}: {
  client?: AvatarClient
  cls?: string
}) {
  const color = COLORS[(client?.tone ?? 0) % 4]
  const photo = client?.id ? clientPhotos[client.id] : undefined
  return (
    <span className={`avatar ${color} ${cls}`}>
      {photo ? (
        <img src={photo} alt={client?.name} loading="lazy" />
      ) : (
        initials(client?.name || 'PT')
      )}
    </span>
  )
}
