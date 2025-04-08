import { Router } from "express";
import {
    addCategory,
    updateCategory,
    deleteCategory,
    getAllCategories
} from '../controllers/category.controller.js';
import { auth } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.post("/add", auth.verifyJWT, auth.isAdmin, upload.single("image"), addCategory);
router.put("/update/:id", auth.verifyJWT, auth.isAdmin, upload.single("image"), updateCategory);
router.delete("/delete/:id", auth.verifyJWT, auth.isAdmin, deleteCategory);
router.get("/getAllCategories", getAllCategories);

export default router;