# Инструкция по развёртыванию FireMessage на Render

Для деплоя **FireMessage** на [Render.com](https://render.com) подготовлены все необходимые конфигурации: `render.yaml`, production-сервер `server.ts` / `server.js` со SPA-роутингом и эндпоинтом `/healthz`, а также скрипты сборки `npm run build` и запуска `npm start`.

---

## Способ 1: Автоматический деплой через Render Blueprint (Рекомендуется)

1. Загрузите проект в ваш репозиторий на **GitHub** или **GitLab**:
   ```bash
   git add .
   git commit -m "feat: ready for render deployment"
   git push origin main
   ```

2. Войдите в панель управления [dashboard.render.com](https://dashboard.render.com/).
3. Нажмите кнопку **New +** в верхнем правом углу и выберите **Blueprint**.
4. Подключите ваш репозиторий с проектом FireMessage.
5. Render автоматически обнаружит файл `render.yaml`:
   - **Service Name**: `firemessage`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/healthz`
6. В разделе переменных окружения (Environment Variables) укажите ваши ключи Supabase:
   - `VITE_SUPABASE_URL`: URL вашего проекта Supabase (например: `https://xyzproject.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Публичный anon ключ Supabase
7. Нажмите **Apply** — Render выполнит сборку PWA и запустит приложение.

---

## Способ 2: Ручное создание Web Service на Render

Если вы предпочитаете настроить сервис вручную:

1. В дашборде Render нажмите **New +** -> **Web Service**.
2. Выберите ваш Git-репозиторий.
3. Заполните параметры конфигурации:
   - **Name**: `firemessage`
   - **Region**: Frankfurt (или ближайший к вашей аудитории)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
4. В разделе **Advanced** -> **Health Check Path** укажите:
   ```
   /healthz
   ```
5. Добавьте переменные окружения (**Environment Variables**):
   | Key | Value |
   |---|---|
   | `NODE_VERSION` | `22.14.0` |
   | `VITE_SUPABASE_URL` | *Ваш Supabase Project URL* |
   | `VITE_SUPABASE_ANON_KEY` | *Ваш Supabase Anon/Public Key* |
6. Нажмите **Create Web Service**.

---

## Способ 3: Развёртывание как Static Site (Альтернативный бесплатный вариант)

Поскольку FireMessage — это производительный клиентский SPA с PWA:

1. Нажмите **New +** -> **Static Site**.
2. Укажите:
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. В разделе **Redirects / Rewrites** настройте SPA-роутинг:
   - **Source**: `/*`
   - **Destination**: `/index.html`
   - **Action**: `Rewrite`
4. Добавьте переменные `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.

---

## Проверка после развёртывания

1. Перейдите по выданному URL (например: `https://firemessage.onrender.com`).
2. Проверьте статус подключения в разделе **Настройки** -> **Подключение к Supabase** (индикатор должен показывать «Подключено»).
3. Проверьте установку PWA (кнопка «Установить FireMessage» в шапке / настройках).
4. Зарегистрируйте тестового пользователя или войдите в существующий аккаунт.
