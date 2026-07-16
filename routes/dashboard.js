const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.get('/', requireAuth, async (req, res) => {
  const user_id = req.session.user_id;
  try {
    const [[user]] = await db.query(
      'SELECT u.*, s.solde FROM utilisateurs u LEFT JOIN soldes s ON u.id = s.user_id WHERE u.id = ?',
      [user_id]
    );
    if (!user) return req.session.destroy(() => res.redirect('/connexion'));

    // Total revenues
    const [[rev]] = await db.query(
      'SELECT COALESCE(SUM(montant), 0) as total FROM historique_revenus WHERE user_id = ?',
      [user_id]
    );

    // Today's revenues
    let revenus_jour = 0;
    try {
      const [[revJour]] = await db.query(
        "SELECT COALESCE(SUM(montant), 0) as total FROM historique_revenus WHERE user_id = ? AND date_creation >= CURRENT_DATE",
        [user_id]
      );
      revenus_jour = parseFloat(revJour.total) || 0;
    } catch(e) {}

    // Filleuls count
    let filleuls_count = 0;
    try {
      const [[fil]] = await db.query(
        'SELECT COUNT(*) as count FROM utilisateurs WHERE parrain_id = ?',
        [user_id]
      );
      filleuls_count = parseInt(fil.count) || 0;
    } catch(e) {
      try {
        const [[fil2]] = await db.query(
          'SELECT COUNT(*) as count FROM filleuls WHERE parrain_id = ?',
          [user_id]
        );
        filleuls_count = parseInt(fil2.count) || 0;
      } catch(e2) {}
    }

    // User level from vip_paliers
    let niveau_label = 'Starter';
    let niveau_num = 0;
    try {
      const [paliers] = await db.query(
        'SELECT * FROM vip_paliers ORDER BY filleuls_requis ASC'
      );
      for (const p of paliers) {
        if (filleuls_count >= p.filleuls_requis) {
          niveau_label = p.label || ('Niveau ' + p.niveau);
          niveau_num = p.niveau;
        }
      }
    } catch(e) {}

    // Recent activities (last 5)
    let activites = [];
    try {
      const [acts] = await db.query(
        "SELECT type, montant, description, date_creation FROM historique_revenus WHERE user_id = ? ORDER BY date_creation DESC LIMIT 5",
        [user_id]
      );
      activites = acts;
    } catch(e) {}

    // Posts
    const [posts] = await db.query(
      "SELECT p.*, u.nom FROM posts p LEFT JOIN utilisateurs u ON p.user_id = u.id WHERE p.statut = 'valide' ORDER BY p.date_creation DESC LIMIT 10"
    );

    // 2 plans VIP
    const [plans] = await db.query(
      "SELECT * FROM planinvestissement WHERE COALESCE(bloque, false) = false ORDER BY id ASC LIMIT 2"
    );

    const devise = 'FCFA';
    const success_message = req.session.success_message || null;
    const error_message = req.session.error_message || null;
    delete req.session.success_message;
    delete req.session.error_message;

    res.render('index', {
      user,
      solde: user.solde || 0,
      revenus: rev,
      revenus_jour,
      filleuls_count,
      niveau_label,
      niveau_num,
      activites,
      posts,
      plans,
      devise,
      success_message,
      error_message,
      notifications: []
    });
  } catch (e) {
    console.error('Dashboard error:', e.message);
    // Destroy session before redirect to avoid infinite redirect loop
    req.session.destroy(() => res.redirect('/connexion'));
  }
});

router.post('/', requireAuth, upload.single('image'), async (req, res) => {
  const user_id = req.session.user_id;
  try {
    const message = (req.body.message || '').trim();
    if (message && req.file) {
      await db.query(
        "INSERT INTO posts (user_id, message, image, statut) VALUES (?, ?, ?, 'en_attente')",
        [user_id, message, req.file.filename]
      );
      req.session.success_message = 'Votre post a été soumis et sera vérifié avant publication!';
    } else {
      req.session.error_message = 'Veuillez remplir tous les champs.';
    }
  } catch (e) {
    req.session.error_message = "Erreur lors de l'enregistrement du post.";
  }
  res.redirect('/');
});

module.exports = router;
