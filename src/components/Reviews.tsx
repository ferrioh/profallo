import { useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { findClient, TODAY, uid } from '../lib/utils'
import { cloudSaveReviews } from '../lib/cloud'
import { useAutoScroll } from '../hooks/useAutoScroll'
import type { Profile } from '../types'

type Review = NonNullable<Profile['reviews']>[number]

export function ReviewsSection() {
  const { data, commit, toast, cloudEnabled, cloudUser } = useApp()
  const reviews = data.profile.reviews ?? []
  const scrollRef = useAutoScroll(0.03)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [rating, setRating] = useState(9)
  const [text, setText] = useState('')

  function persist(next: Review[]) {
    commit((d) => { d.profile.reviews = next })
    if (cloudEnabled && cloudUser) {
      void cloudSaveReviews(cloudUser, next).then((ok) => {
        if (!ok) toast('No se pudieron guardar las reseñas en la nube.')
      })
    }
  }

  function reset() {
    setFormOpen(false)
    setEditingId(null)
    setClientId('')
    setRating(9)
    setText('')
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!clientId) { toast('Selecciona un cliente.'); return }
    const entry: Review = { id: uid(), client: clientId, rating, text: text.trim(), date: TODAY }
    const next = editingId
      ? reviews.map((r) => (r.id === editingId ? { ...r, client: clientId, rating, text: text.trim() } : r))
      : [entry, ...reviews]
    persist(next)
    toast(editingId ? 'Reseña actualizada.' : 'Reseña agregada.')
    reset()
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }))
  }

  function edit(id: string) {
    const r = reviews.find((x) => x.id === id)
    if (!r) return
    setEditingId(id)
    setClientId(r.client)
    setRating(r.rating)
    setText(r.text)
    setFormOpen(true)
  }

  function remove(id: string) {
    persist(reviews.filter((r) => r.id !== id))
    toast('Reseña eliminada.')
  }

  return (
    <section className="reviews-home">
      <div className="section-heading">
        <h2>Reseñas</h2>
        <button onClick={() => { if (formOpen) reset(); else { reset(); setFormOpen(true) } }}>
          {formOpen ? 'Cerrar' : 'Agregar ↗'}
        </button>
      </div>

      {reviews.length === 0 ? (
        <p className="reviews-home-empty">Agrega reseñas de tus clientes: aparecerán en tu ficha pública.</p>
      ) : (
          <div className="rev-scroll" ref={scrollRef}>
            {[...reviews, ...reviews].map((r, i) => {
              const client = findClient(data, r.client)
              const rid = `${r.id}-${i}`
              const isOpen = expanded === rid
              return (
                <div key={rid} className={`rev-card ${isOpen ? 'open' : ''}`}>
                  <button className="rev-card-head" type="button" onClick={() => setExpanded(isOpen ? null : rid)}>
                  <Avatar client={client} />
                  <span className="rev-card-name">{client.name}</span>
                  <span className="rev-card-note">{r.rating}</span>
                </button>
                {isOpen ? (
                  <div className="rev-card-body">
                    {r.text ? <p>{r.text}</p> : null}
                    <div className="rev-card-actions">
                      <button type="button" onClick={() => edit(r.id)}><Icon name="edit" /> Editar</button>
                      <button type="button" className="danger" onClick={() => remove(r.id)}><Icon name="trash" /> Eliminar</button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      {formOpen ? (
        <form className="rev-form" onSubmit={save}>
          <label className="rev-form-client">
            Cliente
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Selecciona…</option>
              {data.clients.filter((c) => !c.archived).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div className="rev-form-stars">
            <span>Nota ({rating}/10)</span>
            <div className="rev-stars-input">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" className={n <= rating ? 'on' : ''} onClick={() => setRating(n)} aria-label={`${n}`}>★</button>
              ))}
            </div>
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={160} placeholder="Comentario (opcional)" />
          <div className="form-foot">
            <button className="button light" type="button" onClick={reset}>Cancelar</button>
            <button className="button primary" type="submit"><Icon name="check" /> {editingId ? 'Guardar' : 'Agregar'}</button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
