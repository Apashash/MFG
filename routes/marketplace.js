const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/marketplace', requireAuth, async (req, res) => {
    res.render('marketplace', { page: 'marketplace' });
});

module.exports = router;
