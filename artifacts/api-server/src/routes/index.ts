import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import systemRouter from "./system.js";
import diagnosticsRouter from "./diagnostics.js";
import historyRouter from "./history.js";
import profilesRouter from "./profiles.js";
import exportRouter from "./export.js";
import alertsRouter from "./alerts.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(systemRouter);
router.use(diagnosticsRouter);
router.use(historyRouter);
router.use(profilesRouter);
router.use(exportRouter);
router.use(alertsRouter);

export default router;
