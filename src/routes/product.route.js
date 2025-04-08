import { Router } from "express";
import {
    addProduct,
    updateProduct,
    deleteProduct,
    getProductById,
    getAllProducts,
    getProductsForUser
} from '../controllers/product.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.post("/add", auth.verifyJWT, auth.isAdmin, upload.single("image"), addProduct);
router.put("/update/:id", auth.verifyJWT, auth.isAdmin, upload.single("image"), updateProduct);
router.delete("/delete/:id", auth.verifyJWT, auth.isAdmin, deleteProduct);
router.get("/getProductById/:id", getProductById);
router.get("/getAllProducts", auth.verifyJWT, auth.isAdmin, getAllProducts);
router.get("/getProductsForUser", getProductsForUser);

export default router;