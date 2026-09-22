'use client';

import {
  ArrowRight,
  CheckCircle2,
  Headphones,
  Mail,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

import { useBuyerPreferences } from '@/components/buyer-preferences';

const initialForm = { fullName: '', email: '', subject: '', message: '' };

export function SupportSection() {
  const { locale } = useBuyerPreferences();
  const [form, setForm] = useState(initialForm);
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'success' | 'error'
  >('idle');
  const [feedback, setFeedback] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('sending');
    setFeedback('');
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, locale }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(payload.message || 'Ошибка отправки');
      setStatus('success');
      setFeedback(payload.message || 'Вопрос отправлен в службу поддержки.');
      setForm(initialForm);
    } catch (error) {
      setStatus('error');
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить вопрос. Попробуйте ещё раз.',
      );
    }
  };

  return (
    <section className="support-section" id="how-it-works">
      <div className="shell">
        <div className="support-heading">
          <span>Как это работает</span>
          <h2>От поиска квартиры до связи с поддержкой</h2>
          <p>
            EstateHub помогает сравнить проверенные предложения, связаться с
            продавцом и получить помощь на каждом этапе.
          </p>
        </div>

        <div className="support-steps">
          <article>
            <span>01</span>
            <Search />
            <h3>Найдите подходящий объект</h3>
            <p>Используйте каталог, карту, фильтры и поиск обычным языком.</p>
          </article>
          <article>
            <span>02</span>
            <ShieldCheck />
            <h3>Проверьте и сравните</h3>
            <p>Смотрите цены, документы, продавца и доступные квартиры.</p>
          </article>
          <article>
            <span>03</span>
            <CheckCircle2 />
            <h3>Свяжитесь с продавцом</h3>
            <p>Запишитесь на просмотр или задайте вопрос продавцу.</p>
          </article>
        </div>

        <div className="support-contact-grid">
          <aside className="support-contact-card">
            <span className="support-contact-icon">
              <Headphones />
            </span>
            <small>Поддержка EstateHub</small>
            <h2>Мы поможем разобраться</h2>
            <p>
              Опишите вопрос — обращение сохранится в системе и автоматически
              поступит на почту службы поддержки.
            </p>
            <a href="mailto:support@estatehub.uz">
              <Mail />
              <span>
                <small>Электронная почта</small>
                <strong>support@estatehub.uz</strong>
              </span>
            </a>
            <div className="support-response-time">
              <CheckCircle2 /> Обычно отвечаем в течение рабочего дня
            </div>
          </aside>

          <form className="support-form" onSubmit={submit}>
            <div>
              <span>Задать вопрос</span>
              <h2>Напишите нам напрямую</h2>
            </div>
            <div className="support-form-row">
              <label>
                Ваше имя
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.fullName}
                  onChange={(event) =>
                    setForm({ ...form, fullName: event.target.value })
                  }
                  placeholder="Как к вам обращаться"
                />
              </label>
              <label>
                Email для ответа
                <input
                  required
                  type="email"
                  maxLength={200}
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  placeholder="name@example.com"
                />
              </label>
            </div>
            <label>
              Тема
              <input
                maxLength={140}
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
                placeholder="Например: вопрос по бронированию"
              />
            </label>
            <label>
              Ваш вопрос
              <textarea
                required
                minLength={10}
                maxLength={3000}
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                placeholder="Расскажите, с чем вам нужна помощь"
              />
            </label>
            {feedback && (
              <p className={`support-feedback ${status}`}>{feedback}</p>
            )}
            <button type="submit" disabled={status === 'sending'}>
              {status === 'sending' ? 'Отправляем…' : 'Отправить вопрос'}
              {status === 'sending' ? <Send /> : <ArrowRight />}
            </button>
            <small className="support-privacy">
              Нажимая кнопку, вы соглашаетесь на обработку данных для ответа на
              обращение.
            </small>
          </form>
        </div>
      </div>
    </section>
  );
}
