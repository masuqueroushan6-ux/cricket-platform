const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const tournamentController = require('../controllers/tournamentController');
const teamController = require('../controllers/teamController');
const matchController = require('../controllers/matchController');
const adminController = require('../controllers/adminController');

const { authenticate, requireSuperAdmin, requireAdmin, requireTournamentAccess } = require('../middleware/auth');
const { loginLimiter, otpLimiter } = require('../middleware/security');

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
const authRouter = express.Router();

authRouter.post('/login', loginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  authController.login
);
authRouter.post('/verify-otp', otpLimiter,
  [body('userId').isUUID(), body('otp').isLength({ min: 6, max: 6 }).isNumeric()],
  authController.verifyOTP
);
authRouter.post('/setup-totp', authController.setupTOTP);
authRouter.post('/verify-totp',
  [body('totpCode').isLength({ min: 6, max: 6 }), body('pendingToken').notEmpty()],
  authController.verifyTOTP
);
authRouter.post('/refresh', authController.refreshToken);
authRouter.post('/logout', authenticate, authController.logout);
authRouter.post('/resend-otp', otpLimiter, authController.resendOTP);
authRouter.get('/me', authenticate, authController.getMe);

// ─── PUBLIC ROUTES ─────────────────────────────────────────────────────────────
const publicRouter = express.Router();
publicRouter.get('/tournaments', tournamentController.getPublicTournaments);
publicRouter.get('/tournaments/:id', tournamentController.getTournamentById);
publicRouter.get('/matches/live', matchController.getLiveMatches);
publicRouter.get('/tournaments/:tournamentId/matches', matchController.getMatches);
publicRouter.get('/matches/:id', matchController.getMatchById);
publicRouter.get('/tournaments/:tournamentId/teams', teamController.getTeams);
publicRouter.get('/teams/:id', teamController.getTeamById);
publicRouter.get('/teams/:teamId/players', teamController.getPlayers);
publicRouter.get('/tournaments/:tournamentId/leaderboard', teamController.getLeaderboard);

// ─── TOURNAMENT ADMIN ROUTES ───────────────────────────────────────────────────
const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);

// Tournaments (read + update for assigned)
adminRouter.get('/tournaments', tournamentController.getTournaments);
adminRouter.put('/tournaments/:id', requireTournamentAccess, tournamentController.updateTournament);

// Teams
adminRouter.get('/tournaments/:tournamentId/teams', requireTournamentAccess, teamController.getTeams);
adminRouter.post('/teams',
  [body('tournament_id').isUUID(), body('name').trim().isLength({ min: 2, max: 100 })],
  teamController.createTeam
);
adminRouter.put('/teams/:id', teamController.updateTeam);
adminRouter.delete('/teams/:id', teamController.deleteTeam);

// Players
adminRouter.get('/teams/:teamId/players', teamController.getPlayers);
adminRouter.post('/players',
  [body('team_id').isUUID(), body('tournament_id').isUUID(), body('name').trim().isLength({ min: 2 })],
  teamController.createPlayer
);
adminRouter.put('/players/:id', teamController.updatePlayer);
adminRouter.delete('/players/:id', teamController.deletePlayer);

// Matches
adminRouter.get('/tournaments/:tournamentId/matches', requireTournamentAccess, matchController.getMatches);
adminRouter.post('/matches',
  [
    body('tournament_id').isUUID(),
    body('team_a_id').isUUID(),
    body('team_b_id').isUUID(),
    body('total_overs').isInt({ min: 1, max: 50 }),
  ],
  matchController.createMatch
);
adminRouter.post('/matches/:id/toss',
  [body('toss_winner_id').isUUID(), body('toss_decision').isIn(['bat', 'bowl'])],
  matchController.recordToss
);
adminRouter.post('/matches/:id/ball', matchController.addBall);
adminRouter.post('/matches/:id/innings2/start', matchController.startInnings2);
adminRouter.put('/matches/:id/players', matchController.setPlayers);

// ─── SUPER ADMIN ROUTES ────────────────────────────────────────────────────────
const superAdminRouter = express.Router();
superAdminRouter.use(authenticate, requireSuperAdmin);

// Tournament management
superAdminRouter.post('/tournaments',
  [body('name').trim().isLength({ min: 3, max: 200 })],
  tournamentController.createTournament
);
superAdminRouter.delete('/tournaments/:id', tournamentController.deleteTournament);
superAdminRouter.post('/tournaments/:tournamentId/assign-admin',
  [body('userId').isUUID()],
  tournamentController.assignAdmin
);

// Admin management
superAdminRouter.get('/admins', adminController.getAdmins);
superAdminRouter.post('/admins',
  [
    body('name').trim().isLength({ min: 2 }),
    body('email').isEmail().normalizeEmail(),
    body('phone').optional().isMobilePhone(),
  ],
  adminController.createAdmin
);
superAdminRouter.patch('/admins/:id/toggle', adminController.toggleAdminStatus);
superAdminRouter.delete('/admins/:id', adminController.deleteAdmin);

// System stats
superAdminRouter.get('/stats', adminController.getSystemStats);
superAdminRouter.get('/audit-logs', adminController.getAuditLogs);

// Mount routers
router.use('/auth', authRouter);
router.use('/public', publicRouter);
router.use('/admin', adminRouter);
router.use('/super-admin', superAdminRouter);

module.exports = router;
