import { Router } from "express";
import {
    createOrder,
    getOrderById,
    getUserOrders,
    getAllOrders,
    updateOrderStatus,
    cancelOrder
} from "../controllers/order.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/create", createOrder);
router.get("/getUserOrders", auth.verifyJWT, getUserOrders);
router.get("/get/:orderId", getOrderById);
router.put("/:orderId/cancel", cancelOrder);
router.get("/getAllorders", auth.verifyJWT, auth.isAdmin, getAllOrders);
router.put("/:orderId/updateStatus", auth.verifyJWT, auth.isAdmin, updateOrderStatus);

export default router;