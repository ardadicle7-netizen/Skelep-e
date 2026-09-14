const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Ana Sayfa Yönlendirmesi
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB Atlas Bağlantısı (Vercel Environment Variables'tan çeker)
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Veritabanına başarıyla bağlandı!"))
    .catch(err => console.error("Veritabanı bağlantı hatası:", err));

// Kullanıcı Veritabanı Şeması
const UserSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    isPlus: { type: Boolean, default: false }
});

const User = mongoose.model('User', UserSchema);

// Kayıt Ol Endpoint'i
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "Bu e-posta adresi zaten kayıtlı." });
        }
        const newUser = new User({ name, email, password, isPlus: false });
        await newUser.save();
        res.json({ success: true, user: { name: newUser.name, email: newUser.email, isPlus: newUser.isPlus } });
    } catch (err) {
        console.error("Kayıt Hatası:", err);
        res.status(500).json({ success: false, message: "Kayıt olurken sunucu hatası oluştu." });
    }
});

// OpenAI (ChatGPT) İstemcisi
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Yapay Zeka Chat Endpoint'i
app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ success: false, message: "Prompt (soru) boş olamaz." });
        }

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });

        res.json({ success: true, reply: completion.choices[0].message.content });
    } catch (err) {
        console.error("AI Hatası:", err);
        res.status(500).json({ success: false, message: "Yapay zeka yanıt oluştururken hata oluştu." });
    }
});

// Yerel test için
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Sunucu ${PORT} portunda çalışıyor.`);
    });
}

module.exports = app;
