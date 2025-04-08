import { Router } from "express";
import {
    addItemToCart,
    incrementItemQuantity,
    decrementItemQuantity,
    removeItemFromCart,
    getUserCart,
    emptyCart
} from '../controllers/cart.controller.js';
import { auth } from '../middlewares/auth.middleware.js';

const router = Router();

router.post("/addItem/:productId", auth.verifyJWT, addItemToCart);
router.get("/getUserCart", auth.verifyJWT, getUserCart);
router.put("/increment/:itemId", auth.verifyJWT, incrementItemQuantity);
router.put("/decrement/:itemId", auth.verifyJWT, decrementItemQuantity);
router.delete("/removeItem/:itemId", auth.verifyJWT, removeItemFromCart);
router.delete("/empty", auth.verifyJWT, emptyCart);

export default router;