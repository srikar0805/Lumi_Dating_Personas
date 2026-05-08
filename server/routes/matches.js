const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/matchesController');

router.use(auth);

router.get('/', ctrl.list);
router.post('/score', ctrl.rescoreAll);
router.get('/connect', ctrl.connectStack);
router.delete('/swipe', ctrl.deleteSwipe);
router.post('/swipe', ctrl.swipe);
router.get('/:id/report', ctrl.report);

module.exports = router;
