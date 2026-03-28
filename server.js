const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ TELEGRAM НАСТРОЙКА ============
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function sendToTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log('⚠️ Telegram не настроен. Пропускаем отправку.');
        return Promise.resolve(false);
    }
    
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'HTML'
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.ok) {
            console.log('✅ Сообщение отправлено в Telegram');
            return true;
        } else {
            console.error('❌ Ошибка Telegram:', data);
            return false;
        }
    })
    .catch(err => {
        console.error('❌ Ошибка отправки в Telegram:', err);
        return false;
    });
}

// ============ EMAIL НАСТРОЙКА ============
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

function sendToEmail(orderData) {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('⚠️ Email не настроен. Пропускаем отправку.');
        return Promise.resolve(false);
    }
    
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_USER,
        subject: `🆕 Новая заявка с сайта Двери`,
        html: `
            <h2>Новая заявка с сайта</h2>
            <p><strong>Имя:</strong> ${orderData.name}</p>
            <p><strong>Телефон:</strong> ${orderData.phone}</p>
            <p><strong>Товар:</strong> ${orderData.product || 'Не указан'}</p>
            <p><strong>Комментарий:</strong> ${orderData.comment || 'Нет'}</p>
            <p><strong>Источник:</strong> ${orderData.page || 'Главная'}</p>
            <hr>
            <p><small>Отправлено ${new Date().toLocaleString('ru-RU')}</small></p>
        `
    };
    
    return transporter.sendMail(mailOptions)
        .then(info => {
            console.log('✅ Email отправлен:', info.messageId);
            return true;
        })
        .catch(err => {
            console.error('❌ Ошибка отправки email:', err);
            return false;
        });
}

// ============ API ЭНДПОИНТЫ ============

// 1. Получить каталог товаров
app.get('/api/products', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8');
        const products = JSON.parse(data);
        res.json(products);
    } catch (err) {
        console.error('Ошибка чтения каталога:', err);
        res.status(500).json({ error: 'Ошибка загрузки каталога' });
    }
});

// 2. Отправить заявку
app.post('/api/submit-order', async (req, res) => {
    const { name, phone, product, comment, page } = req.body;
    
    // Валидация
    if (!name || !phone) {
        return res.status(400).json({ 
            success: false, 
            error: 'Заполните имя и телефон' 
        });
    }
    
    // Формируем сообщение
    const message = `
🏷 <b>НОВАЯ ЗАЯВКА!</b>
        
👤 <b>Имя:</b> ${name}
📞 <b>Телефон:</b> ${phone}
🚪 <b>Товар:</b> ${product || 'Не указан'}
💬 <b>Комментарий:</b> ${comment || 'Нет'}
📍 <b>Страница:</b> ${page || 'Главная'}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
    `;
    
    // Отправляем параллельно в Telegram и Email
    const results = await Promise.allSettled([
        sendToTelegram(message),
        sendToEmail({ name, phone, product, comment, page })
    ]);
    
    const telegramSuccess = results[0].value === true;
    const emailSuccess = results[1].value === true;
    
    if (telegramSuccess || emailSuccess) {
        res.json({ 
            success: true, 
            message: 'Заявка отправлена! Мы свяжемся с вами.' 
        });
    } else {
        res.status(500).json({ 
            success: false, 
            error: 'Не удалось отправить заявку. Попробуйте позже.' 
        });
    }
});

// 3. Создать WhatsApp ссылку для быстрой связи
app.get('/api/whatsapp-link', (req, res) => {
    const phone = process.env.ADMIN_PHONE || '79503101560';
    const text = req.query.text || 'Здравствуйте! Интересуюсь вашими дверями.';
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    res.json({ link });
});

// Все остальные запросы отправляем на index.html (SPA-поддержка)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════╗
    ║   🚪 Сайт дверей запущен!            ║
    ║   📍 http://localhost:${PORT}         ║
    ║   📡 API: /api/products              ║
    ║   📧 Заявки уходят в Telegram/Email  ║
    ╚══════════════════════════════════════╝
    `);
});