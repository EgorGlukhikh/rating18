const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      participants: 0,
      totalVotes: 0,
      activeUsers: 0,
      categories: 0
    }
  });
});

module.exports = router;
