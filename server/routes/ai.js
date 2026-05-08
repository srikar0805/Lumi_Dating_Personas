const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/aiController');

router.use(auth);

router.post('/report', ctrl.report);

module.exports = router;
