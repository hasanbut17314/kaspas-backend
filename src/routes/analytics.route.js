import { Router } from "express";
import { totalAnalytics, salesByCategory, topProducts, getMonthlySalesOverview } from "../controllers/analytics.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/totalAnalytics", auth.verifyJWT, auth.isAdmin, totalAnalytics);
router.get("/topProducts", auth.verifyJWT, auth.isAdmin, topProducts);
router.get("/salesByCategory", auth.verifyJWT, auth.isAdmin, salesByCategory);
router.get("/monthlySalesOverview", auth.verifyJWT, auth.isAdmin, getMonthlySalesOverview);

export default router;