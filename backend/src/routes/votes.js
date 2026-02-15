const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/', (req, res) => {
  res.status(501).json({ success: false, message: 'Votes API is not implemented yet' });
});

module.exports = router;
