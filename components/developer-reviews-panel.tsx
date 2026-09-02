'use client';

import { MessageCircle, ShieldCheck, Star } from 'lucide-react';

import { DeveloperReview } from '@/hooks/use-developer-reviews';

export function DeveloperReviewsPanel({ reviews, loading, error, feedback, processing, onRespond }: { reviews: DeveloperReview[]; loading: boolean; error: string; feedback: string; processing: string; onRespond: (reviewId: string, text: string) => Promise<void> }) {
  const respond = async (review: DeveloperReview) => { const text = window.prompt('Официальный публичный ответ', review.response_body ?? '')?.trim(); if (!text) return; await onRespond(review.id, text); };
  return <section className="dashboard-panel developer-reviews-panel" id="developer-reviews"><div className="panel-heading"><div><h2>Отзывы о ваших ЖК</h2><p>Отрицательные отзывы нельзя удалить, но можно дать официальный публичный ответ.</p></div><span>{reviews.length} опубликовано</span></div>{error && <div className="developer-inline-error">{error}</div>}{feedback && <div className="developer-inline-success">{feedback}</div>}<div>{loading ? <div className="table-empty-state">Загружаем отзывы…</div> : reviews.length ? reviews.map((review)=><article key={review.id}><header><span>{review.author.split(/\s+/).map((part)=>part[0]).join('').slice(0,2).toUpperCase()}</span><div><strong>{review.author}</strong><small>{review.complex_name}{review.trust_level === 'verified_resident' ? ' · подтверждённый житель' : ''}</small></div><b>{Number(review.overall).toFixed(1)} <Star/></b></header><p>{review.body}</p>{review.response_body && <div className="developer-existing-response"><ShieldCheck/><span><strong>Ваш официальный ответ</strong><small>{review.response_body}</small></span></div>}<button type="button" disabled={processing===review.id} onClick={()=>void respond(review)}><MessageCircle/> {review.response_body ? 'Изменить ответ' : 'Ответить публично'}</button></article>) : <div className="table-empty-state">Опубликованных отзывов пока нет.</div>}</div></section>;
}
