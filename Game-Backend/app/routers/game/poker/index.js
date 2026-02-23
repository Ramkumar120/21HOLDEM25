const router = require('express').Router();
const controllers = require('./lib/controllers');
const middleware = require('./lib/middlewares');
const commonMiddleware = require('../../middleware');

router.use(commonMiddleware.isAuthenticated);

router.get('/board/list', controllers.listBoard);
router.post('/board/join', middleware.getPrototype, middleware.joiningProcess, controllers.joinBoard);
router.post('/private/create', middleware.getPrototype, middleware.createPrivateBoard, controllers.joinBoard);
router.post('/private/join', middleware.joinPrivateBoard, controllers.joinBoard);
router.get('/board/leave', controllers.leaveBoard);

module.exports = router;
