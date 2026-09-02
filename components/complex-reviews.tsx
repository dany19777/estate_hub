'use client';

import { Flag, MessageCircle, ShieldCheck, Star } from 'lucide-react';

import { ReviewDialog } from '@/components/review-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useReviews } from '@/hooks/use-reviews';
import { reviewCategories } from '@/lib/reviews';

function date(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value.replace(' ', 'T')}Z`)); }

export function ComplexReviews({ complexId, complexName }: { complexId: string; complexName: string }) {
  const data = useReviews(complexId);
  const report = async (reviewId: string) => { const reason = window.prompt('Что нарушает правила в этом отзыве?')?.trim(); if (!reason) return; try { await data.report(reviewId, reason); } catch { /* feedback remains local to prompt flow */ } };
  return <section className="complex-reviews" id="reviews"><div className="reviews-heading"><div><span>Отзывы и рейтинг</span><h2>Что говорят о {complexName}</h2><p>Оценки проходят модерацию. Отзывы подтверждённых владельцев имеют больший вес.</p></div><ReviewDialog complexName={complexName} current={data.myReview} onSubmit={data.submit} trigger={<Button><MessageCircle/> {data.myReview ? 'Изменить отзыв' : 'Оставить отзыв'}</Button>}/></div>
    {data.myReview && data.myReview.status !== 'published' && <div className={`my-review-status ${data.myReview.status}`}><ShieldCheck/><p><strong>{data.myReview.status === 'submitted' ? 'Ваш отзыв на модерации' : 'Отзыв требует изменений'}</strong><small>{data.myReview.moderationReason ?? 'После решения он появится в общем списке.'}</small></p></div>}
    {data.feedback && <div className="reviews-feedback">{data.feedback}</div>}{data.error && <div className="reviews-error">{data.error}</div>}
    <div className="review-summary"><div><strong>{data.aggregate.total ? data.aggregate.overall.toFixed(1) : '—'}</strong><span>{[1,2,3,4,5].map((value)=><Star className={value <= Math.round(data.aggregate.overall) ? 'active' : ''} key={value}/>)}</span><small>{data.loading ? 'Загружаем…' : `${data.aggregate.total} ${data.aggregate.total === 1 ? 'отзыв' : 'отзыва'}`}</small></div><div>{reviewCategories.map(([key,label])=><p key={key}><span>{label}</span><i><b style={{width:`${data.aggregate.categories[key]/5*100}%`}}/></i><strong>{data.aggregate.categories[key] ? data.aggregate.categories[key].toFixed(1) : '—'}</strong></p>)}</div></div>
    <div className="review-list">{data.loading ? <div className="review-empty">Загружаем проверенные отзывы…</div> : data.reviews.length ? data.reviews.map((review)=><article className="review-card" key={review.id}><header><span>{review.author.split(/\s+/).map((part)=>part[0]).join('').slice(0,2).toUpperCase()}</span><div><strong>{review.author}</strong><small>{date(review.updatedAt)}</small></div><div><b>{review.overall.toFixed(1)}</b><Star/></div></header>{review.trustLevel === 'verified_resident' && <Badge><ShieldCheck/> Проверенный владелец / житель</Badge>}<p>{review.body}</p><footer><button type="button" onClick={()=>void report(review.id)}><Flag/> Пожаловаться</button></footer>{review.response && <div className="developer-review-response"><span><MessageCircle/></span><p><strong>Ответ {review.response.organization}</strong><small>{date(review.response.updatedAt)}</small><em>{review.response.body}</em></p></div>}</article>) : <div className="review-empty"><Star/><strong>Пока нет опубликованных отзывов</strong><span>Станьте первым — после модерации ваш опыт поможет другим покупателям.</span></div>}</div>
  </section>;
}
