'use client';

import { ReactElement, SyntheticEvent, useState } from 'react';
import { Check, ShieldCheck, Star } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PublicReview, ReviewRatings, reviewCategories } from '@/lib/reviews';

const defaultRatings = () => Object.fromEntries(reviewCategories.map(([key]) => [key, 5])) as ReviewRatings;

export function ReviewDialog({ trigger, complexName, current, onSubmit }: { trigger: ReactElement; complexName: string; current: (PublicReview & { moderationReason: string | null }) | null; onSubmit: (text: string, ratings: ReviewRatings) => Promise<string> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(current?.body ?? '');
  const [ratings, setRatings] = useState<ReviewRatings>(current?.ratings ?? defaultRatings());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  function changeOpen(nextOpen: boolean) { if (nextOpen) { setText(current?.body ?? ''); setRatings(current?.ratings ?? defaultRatings()); setError(''); setSuccess(''); } setOpen(nextOpen); }
  async function submit(event: SyntheticEvent) { event.preventDefault(); setSubmitting(true); setError(''); try { setSuccess(await onSubmit(text, ratings)); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Не удалось сохранить отзыв.'); } finally { setSubmitting(false); } }
  return <Dialog open={open} onOpenChange={changeOpen}><DialogTrigger render={trigger}/><DialogContent className="review-dialog">{success ? <div className="review-dialog-success"><span><Check/></span><DialogTitle>Отзыв отправлен</DialogTitle><DialogDescription>{success}</DialogDescription><DialogFooter><DialogClose render={<Button/>}>Готово</DialogClose></DialogFooter></div> : <><DialogHeader><span><ShieldCheck/> Модерация защищает рейтинг</span><DialogTitle>{current ? 'Изменить свой отзыв' : `Оценить ${complexName}`}</DialogTitle><DialogDescription>Один активный отзыв на аккаунт. Изменения заменят текущую версию после повторной модерации.</DialogDescription></DialogHeader><form id="review-form" className="review-form" onSubmit={submit}><div className="review-rating-fields">{reviewCategories.map(([key,label])=><div key={key}><span>{label}</span><div>{[1,2,3,4,5].map((value)=><button type="button" className={value <= ratings[key] ? 'active' : ''} onClick={()=>setRatings({...ratings,[key]:value})} aria-label={`${label}: ${value}`} key={value}><Star/></button>)}</div></div>)}</div><label>Ваш опыт<Textarea minLength={20} maxLength={1500} required value={text} onChange={(event)=>setText(event.target.value)} placeholder="Расскажите о качестве дома, дворе, сервисе и расположении…"/><small>{text.length}/1500 · минимум 20 символов</small></label>{error && <p className="review-form-error">{error}</p>}</form><DialogFooter><DialogClose render={<Button variant="outline" disabled={submitting}/>}>Отмена</DialogClose><Button type="submit" form="review-form" disabled={submitting || text.trim().length < 20}>{submitting ? 'Отправляем…' : 'Отправить на модерацию'}</Button></DialogFooter></>}</DialogContent></Dialog>;
}
